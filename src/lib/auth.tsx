import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { buildEdgeFunctionHeaders } from './functionHeaders';
import { sanitizeStudentSession } from './studentAuth';
import { sanitizeStaffSession } from './staffAuth';

const AuthContext = createContext(null);
type StaffProfileRecord = {
    id?: string | number | null;
    username?: string | null;
    full_name?: string | null;
    role?: string | null;
    department?: string | null;
    email?: string | null;
    created_at?: string | null;
    auth_user_id?: string | null;
    [key: string]: unknown;
};
const isStaffProfileRecord = (value: unknown): value is StaffProfileRecord =>
    Boolean(value) && typeof value === 'object' && 'role' in value;
const STAFF_PROFILE_SELECT = [
    'id',
    'username',
    'full_name',
    'role',
    'department',
    'email',
    'created_at',
    'auth_user_id'
].join(', ');
const STUDENT_PROFILE_SELECT = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'student_id',
    'course',
    'year_level',
    'status',
    'department',
    'middle_name',
    'dob',
    'civil_status',
    'nationality',
    'email',
    'mobile',
    'address',
    'emergency_contact',
    'street',
    'city',
    'province',
    'zip_code',
    'suffix',
    'place_of_birth',
    'age',
    'sex',
    'gender_identity',
    'facebook_url',
    'school_last_attended',
    'is_working_student',
    'working_student_type',
    'supporter',
    'supporter_contact',
    'is_pwd',
    'pwd_type',
    'is_indigenous',
    'indigenous_group',
    'witnessed_conflict',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'section',
    'profile_picture_url',
    'religion',
    'is_safe_in_community',
    'mother_name',
    'mother_occupation',
    'mother_contact',
    'father_name',
    'father_occupation',
    'father_contact',
    'parent_address',
    'num_brothers',
    'num_sisters',
    'birth_order',
    'spouse_name',
    'spouse_occupation',
    'num_children',
    'guardian_name',
    'guardian_address',
    'guardian_contact',
    'guardian_relation',
    'emergency_name',
    'emergency_address',
    'emergency_relationship',
    'emergency_number',
    'elem_school',
    'elem_year_graduated',
    'junior_high_school',
    'junior_high_year_graduated',
    'senior_high_school',
    'senior_high_year_graduated',
    'college_school',
    'college_year_graduated',
    'honors_awards',
    'extracurricular_activities',
    'scholarships_availed',
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'course_year_archive',
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'auth_user_id'
].join(', ');

const normalizeLoginEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

const isInvalidAuthCredentialsError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('invalid login credentials')
        || message.includes('email not confirmed')
        || message.includes('invalid credentials');
};

const signInWithResolvedEmail = async (email: string, password: string) =>
    supabase.auth.signInWithPassword({
        email,
        password
    });

const resolveAuthLoginAccount = async (
    mode: 'resolve-staff-login' | 'resolve-student-login',
    payload: Record<string, unknown>
) => {
    const { data, error } = await supabase.functions.invoke('resolve-auth-login', {
        body: {
            mode,
            ...payload
        },
        headers: buildEdgeFunctionHeaders()
    });

    if (error || !data?.success) {
        throw error || new Error(data?.error || 'Unable to resolve the login account.');
    }

    return data.account || null;
};

const syncLinkedAuthEmailAfterLogin = async (
    functionName: string,
    nextEmailValue: unknown,
    accessToken?: string | null
) => {
    const nextEmail = normalizeLoginEmail(nextEmailValue);
    if (!nextEmail || !accessToken) {
        return null;
    }

    try {
        const { data, error } = await supabase.functions.invoke(functionName, {
            body: {
                mode: 'sync-auth-email',
                email: nextEmail
            },
            headers: buildEdgeFunctionHeaders(accessToken)
        });

        if (error || !data?.success) {
            throw error || new Error(data?.error || 'Unable to sync the auth email.');
        }

        return normalizeLoginEmail(data.email) || nextEmail;
    } catch (error) {
        console.warn(`Failed to sync auth email through ${functionName}.`, error);
        return null;
    }
};

export function AuthProvider({ children }: any) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const sessionRef = React.useRef<any>(null);

    const persistSession = useCallback((nextSession: any) => {
        setSession(nextSession);
        if (nextSession) {
            localStorage.setItem('norsu_session', JSON.stringify(nextSession));
            return;
        }
        localStorage.removeItem('norsu_session');
    }, []);

    React.useEffect(() => {
        sessionRef.current = session;
    }, [session]);

    const getStudentProfileByAuthUser = useCallback(async (authUser: any) => {
        if (!authUser) return null;

        if (authUser.id) {
            const { data: linkedStudent, error: linkedError } = await supabase
                .from('students')
                .select(STUDENT_PROFILE_SELECT)
                .eq('auth_user_id', authUser.id)
                .maybeSingle();

            if (linkedError) throw linkedError;
            if (linkedStudent) return linkedStudent;
        }

        return null;
    }, []);

    const getStaffProfileByAuthUser = useCallback(async (authUser: any): Promise<StaffProfileRecord | null> => {
        if (!authUser) return null;

        if (authUser.id) {
            const { data: linkedStaff, error: linkedError } = await supabase
                .from('staff_accounts')
                .select(STAFF_PROFILE_SELECT)
                .eq('auth_user_id', authUser.id)
                .maybeSingle();

            if (linkedError) throw linkedError;
            if (isStaffProfileRecord(linkedStaff)) return linkedStaff;
        }

        return null;
    }, []);

    const restoreStaffSessionFromAuth = useCallback(async (authUser: any) => {
        const staff = await getStaffProfileByAuthUser(authUser);
        if (!staff) {
            return null;
        }

        const sessionData = sanitizeStaffSession(staff, authUser);
        persistSession(sessionData);
        return sessionData;
    }, [getStaffProfileByAuthUser, persistSession]);

    const restoreStudentSessionFromAuth = useCallback(async (authUser: any) => {
        const student = await getStudentProfileByAuthUser(authUser);
        if (!student) {
            persistSession(null);
            return null;
        }

        const sessionData = sanitizeStudentSession(student, authUser);
        persistSession(sessionData);
        return sessionData;
    }, [getStudentProfileByAuthUser, persistSession]);

    const updateSession = useCallback((updates: any) => {
        setSession((prev: any) => {
            const nextSession = typeof updates === 'function'
                ? updates(prev)
                : { ...(prev || {}), ...(updates || {}) };

            if (prev && nextSession) {
                const prevKeys = Object.keys(prev);
                const nextKeys = Object.keys(nextSession);
                const unchanged = prevKeys.length === nextKeys.length
                    && nextKeys.every((key) => Object.is(prev[key], nextSession[key]));

                if (unchanged) {
                    return prev;
                }
            }

            if (nextSession) {
                localStorage.setItem('norsu_session', JSON.stringify(nextSession));
            } else {
                localStorage.removeItem('norsu_session');
            }

            return nextSession;
        });
    }, []);

    /**
     * Login for Staff (Admin, Department Head, Care Staff)
     */
    const loginStaff = useCallback(async (username: any, password: any, requiredRole: any) => {
        setLoading(true);
        try {
            const trimmedUsername = String(username || '').trim();
            const userCheck = await resolveAuthLoginAccount('resolve-staff-login', {
                username: trimmedUsername
            });

            if (!userCheck) {
                setLoading(false);
                return { success: false, error: 'Username not found.' };
            }

            if (userCheck.role !== requiredRole) {
                setLoading(false);
                return { success: false, error: `Access denied: This account is not a ${requiredRole}.` };
            }

            if (!userCheck.auth_user_id) {
                setLoading(false);
                return {
                    success: false,
                    error: 'This staff account has not been linked to Supabase Auth yet. Ask an admin to link it before signing in.'
                };
            }

            const resolvedEmail = normalizeLoginEmail(userCheck.email);
            if (!resolvedEmail) {
                setLoading(false);
                return {
                    success: false,
                    error: 'This staff account has no migrated auth email yet. Run the auth email sync first.'
                };
            }

            const { data: authData, error: authError } = await signInWithResolvedEmail(resolvedEmail, password);

            if (authError || !authData?.user) {
                setLoading(false);
                if (isInvalidAuthCredentialsError(authError)) {
                    return { success: false, error: 'Incorrect password.' };
                }
                return { success: false, error: authError?.message || 'Unable to sign in with the migrated auth email.' };
            }

            const staffProfile = await getStaffProfileByAuthUser(authData.user);
            if (!staffProfile) {
                await supabase.auth.signOut().catch(() => null);
                setLoading(false);
                return { success: false, error: 'Staff profile not found.' };
            }

            if (staffProfile.role !== requiredRole) {
                await supabase.auth.signOut().catch(() => null);
                setLoading(false);
                return { success: false, error: `Access denied: This account is not a ${requiredRole}.` };
            }

            const syncedAuthEmail = await syncLinkedAuthEmailAfterLogin(
                'manage-staff-accounts',
                userCheck.email,
                authData.session?.access_token
            );
            const authUserForSession = syncedAuthEmail
                ? { ...authData.user, email: syncedAuthEmail }
                : authData.user;
            const sessionData = sanitizeStaffSession(staffProfile, authUserForSession);
            persistSession(sessionData);
            setLoading(false);

            return { success: true, data: sessionData };

        } catch (err) {
            setLoading(false);
            return { success: false, error: 'Connection error: ' + err.message };
        }
    }, [getStaffProfileByAuthUser, persistSession]);

    /**
     * Login for Students
     */
    const loginStudent = useCallback(async (studentId: any, password: any) => {
        setLoading(true);
        try {
            const trimmedStudentId = String(studentId || '').trim();
            const studentLookup = await resolveAuthLoginAccount('resolve-student-login', {
                studentId: trimmedStudentId
            });

            if (!studentLookup) {
                setLoading(false);
                return { success: false, error: 'Student ID not found.' };
            }

            if (!studentLookup.auth_user_id) {
                setLoading(false);
                return {
                    success: false,
                    error: 'This student account has not been activated in Supabase Auth yet. Complete student activation first before signing in.'
                };
            }

            const resolvedEmail = normalizeLoginEmail(studentLookup.email);
            if (!resolvedEmail) {
                setLoading(false);
                return {
                    success: false,
                    error: 'This student account has no migrated auth email yet. Run the student auth email sync first.'
                };
            }

            const { data: authData, error: authError } = await signInWithResolvedEmail(resolvedEmail, password);

            if (authError || !authData?.user) {
                setLoading(false);
                if (isInvalidAuthCredentialsError(authError)) {
                    return { success: false, error: 'Incorrect password.' };
                }
                return { success: false, error: authError?.message || 'Unable to sign in with the migrated auth email.' };
            }

            const studentProfile = await getStudentProfileByAuthUser(authData.user);
            if (!studentProfile) {
                await supabase.auth.signOut().catch(() => null);
                setLoading(false);
                return { success: false, error: 'Student profile not found.' };
            }

            const syncedAuthEmail = await syncLinkedAuthEmailAfterLogin(
                'manage-student-accounts',
                studentLookup.email,
                authData.session?.access_token
            );
            const authUserForSession = syncedAuthEmail
                ? { ...authData.user, email: syncedAuthEmail }
                : authData.user;
            const sessionData = sanitizeStudentSession(studentProfile, authUserForSession);
            persistSession(sessionData);
            setLoading(false);

            return { success: true, data: sessionData };
        } catch (err) {
            setLoading(false);
            return { success: false, error: 'Login error: ' + err.message };
        }
    }, [getStudentProfileByAuthUser, persistSession]);

    // Alias for backward compatibility with existing staff login pages
    const login = loginStaff;

    React.useEffect(() => {
        let isActive = true;

        const initializeSession = async () => {
            const stored = localStorage.getItem('norsu_session');
            let parsedSession = null;

            if (stored) {
                try {
                    parsedSession = JSON.parse(stored);
                } catch (e) {
                    localStorage.removeItem('norsu_session');
                }
            }

            try {
                const { data } = await supabase.auth.getSession();
                if (!isActive) return;

                if (data.session?.user) {
                    const restoredStaff = await restoreStaffSessionFromAuth(data.session.user);
                    if (restoredStaff) {
                        return;
                    }

                    const restoredStudent = await restoreStudentSessionFromAuth(data.session.user);
                    if (restoredStudent) {
                        return;
                    }

                    persistSession(null);
                } else if (parsedSession?.userType === 'staff' || parsedSession?.auth_user_id || parsedSession?.userType === 'student') {
                    persistSession(null);
                } else if (parsedSession) {
                    setSession(parsedSession);
                }
            } catch (error) {
                if (isActive && parsedSession) {
                    setSession(parsedSession);
                }
            } finally {
                if (isActive) {
                    setLoading(false);
                }
            }
        };

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange((_event, nextAuthSession) => {
            const currentSession = sessionRef.current;

            if (nextAuthSession?.user) {
                restoreStaffSessionFromAuth(nextAuthSession.user)
                    .then((restoredStaff) => {
                        if (restoredStaff) return restoredStaff;
                        return restoreStudentSessionFromAuth(nextAuthSession.user);
                    })
                    .catch((error) => {
                        console.error('Failed to restore session from Supabase Auth.', error);
                    });
                return;
            }

            if (!currentSession
                || currentSession.userType === 'staff'
                || currentSession.auth_user_id
                || currentSession.userType === 'student') {
                persistSession(null);
            }
        });

        initializeSession();

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, [persistSession, restoreStaffSessionFromAuth, restoreStudentSessionFromAuth]);

    const logout = useCallback(() => {
        supabase.auth.signOut().catch((error) => {
            console.error('Failed to sign out Supabase-auth session.', error);
        });
        persistSession(null);
    }, [persistSession]);

    const value = React.useMemo(() => ({
        session,
        loading,
        login,      // Alias for loginStaff
        loginStaff,
        loginStudent, // New student login
        updateSession,
        logout,
        isAuthenticated: !!session,
    }), [session, loading, login, loginStaff, loginStudent, updateSession, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
