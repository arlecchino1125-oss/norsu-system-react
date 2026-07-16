import React, { useState, useCallback } from 'react';
import { supabase, SUPABASE_AUTH_STORAGE_KEY } from './supabase';
import { signOutAndClearBrowserState } from './authLogout';
import { buildEdgeFunctionHeaders } from './functionHeaders';
import { sanitizeStudentSession } from './studentAuth';
import { sanitizeStaffSession } from './staffAuth';
import { readEdgeFunctionErrorMessage, getFriendlyErrorMessage } from './invokeEdgeFunction';
import { authenticateLogin } from './authLogin';
import {
    recoverLocalSupabaseSession
} from './supabaseSessionRecovery';
import { AuthContext } from './useAuth';

type StaffProfileRecord = {
    id?: string | number | null;
    username?: string | null;
    full_name?: string | null;
    role?: string | null;
    department?: string | null;
    email?: string | null;
    created_at?: string | null;
    auth_user_id?: string | null;
    is_archived?: boolean | null;
    archived_at?: string | null;
    archive_note?: string | null;
    [key: string]: unknown;
};
const isStaffProfileRecord = (value: unknown): value is StaffProfileRecord =>
    Boolean(value) && typeof value === 'object' && 'role' in value;
const STAFF_PROFILE_SELECT = '*';
const STUDENT_BOOTSTRAP_SELECT = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'middle_name',
    'student_id',
    'course',
    'year_level',
    'status',
    'department',
    'email',
    'mobile',
    'section',
    'region',
    'profile_picture_url',
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
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
    'street',
    'city',
    'province',
    'zip_code',
    'region',
    'suffix',
    'place_of_birth',
    'age',
    'sex',
    'gender_identity',
    'facebook_url',
    'is_working_student',
    'working_student_type',
    'employer_name',
    'employer_address',
    'supporter',
    'supporter_contact',
    'is_pwd',
    'pwd_number',
    'pwd_type',
    'disability_cause',
    'pwd_document_url',
    'is_indigenous',
    'indigenous_group',
    'ip_document_url',
    'is_four_ps_member',
    'four_ps_document_url',
    'is_rebel_returnee',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'solo_parent_document_url',
    'is_orphan',
    'orphan_cause',
    'is_homeless_citizen',
    'is_senior_citizen',
    'senior_citizen_document_url',
    'work_experiences',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'section',
    'profile_picture_url',
    'religion',
    'mother_name',
    'mother_occupation',
    'mother_status',
    'mother_contact',
    'mother_address',
    'father_name',
    'father_occupation',
    'father_status',
    'father_contact',
    'father_address',
    'parents_num_children',
    'birth_order',
    'birth_order_other',
    'spouse_name',
    'spouse_occupation',
    'spouse_employer_name',
    'spouse_employer_address',
    'spouse_contact',
    'num_children',
    'children_names_birthdates',
    'currently_pregnant',
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
    'tesda_nc2_acquired',
    'eligibility_acquired',
    'special_trainings_attended',
    'extracurricular_activities',
    'holds_public_service_position',
    'public_service_position',
    'organizations_memberships',
    'sports_skills',
    'other_talents',
    'scholarships_availed',
    'has_been_criminally_charged',
    'has_been_convicted_of_crime',
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
const getSessionAuthUserId = (value: any) => String(
    value?.auth_user_id
    || value?.user?.id
    || value?.id
    || ''
).trim();
const getSessionAuthUserType = (value: any) => String(
    value?.userType
    || value?.role
    || ''
).trim().toLowerCase();
const matchesAuthUser = (value: any, authUser: any) => {
    const currentAuthUserId = String(authUser?.id || '').trim();
    return Boolean(currentAuthUserId) && getSessionAuthUserId(value) === currentAuthUserId;
};
const shouldReuseLoadedAuthSession = (event: string, currentSession: any, authUser: any) =>
    event === 'INITIAL_SESSION'
    || (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')
        && Boolean(currentSession)
        && matchesAuthUser(currentSession, authUser)
    );

// claude — Identical for "no such account" and "wrong password" so login never
// reveals whether an ID/username/email exists (anti-enumeration). Every failure
// path in loginStudent/loginStaff returns these exact strings.
const INVALID_STUDENT_LOGIN_MESSAGE = 'Student ID/email or password is incorrect.';
const INVALID_STAFF_LOGIN_MESSAGE = 'Username or password is incorrect.';
const getErrorMessage = (error: any, fallback: string) =>
    error instanceof Error
        ? error.message || fallback
        : String(error || fallback);

const getLoginCatchMessage = (error: any, fallbackPrefix: string) => {
    const message = getErrorMessage(error, 'Unexpected login error.');
    return Number(error?.status || 0) === 429
        ? message
        : `${fallbackPrefix}: ${message}`;
};

const authenticateWithEdge = (payload: Record<string, unknown>) => authenticateLogin({
    invoke: (body) => supabase.functions.invoke('resolve-auth-login', {
        body,
        headers: buildEdgeFunctionHeaders()
    }),
    setSession: (nextSession) => supabase.auth.setSession(nextSession),
    readError: async (result) => {
        const detailed = await readEdgeFunctionErrorMessage(result.response || result.error?.context);
        return detailed ? getFriendlyErrorMessage(detailed) : null;
    }
}, payload);

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
        sessionRef.current = nextSession;
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

    const handleRecoverableSessionError = useCallback(async (error: unknown) => {
        const recovered = await recoverLocalSupabaseSession(supabase, error);
        if (recovered) {
            persistSession(null);
        }
        return recovered;
    }, [persistSession]);

    const prepareAuthSessionForLogin = useCallback(async () => {
        try {
            const { error } = await supabase.auth.getSession();
            if (error) {
                await handleRecoverableSessionError(error);
            }
        } catch (error) {
            await handleRecoverableSessionError(error);
        }
    }, [handleRecoverableSessionError]);

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
    const getStudentBootstrapByAuthUser = useCallback(async (authUser: any) => {
        if (!authUser?.id) return null;

        const { data: linkedStudent, error: linkedError } = await supabase
            .from('students')
            .select(STUDENT_BOOTSTRAP_SELECT)
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

        if (linkedError) throw linkedError;
        return linkedStudent || null;
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
            if (isStaffProfileRecord(linkedStaff) && !linkedStaff.is_archived) return linkedStaff;
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
    const restoreStudentBootstrapSessionFromAuth = useCallback(async (authUser: any) => {
        const student = await getStudentBootstrapByAuthUser(authUser);
        if (!student) {
            return null;
        }

        const sessionData = sanitizeStudentSession(student, authUser);
        persistSession(sessionData);
        return sessionData;
    }, [getStudentBootstrapByAuthUser, persistSession]);

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
        const previousSession = sessionRef.current;
        const nextSession = typeof updates === 'function'
            ? updates(previousSession)
            : { ...(previousSession || {}), ...(updates || {}) };

        if (previousSession && nextSession) {
            const previousKeys = Object.keys(previousSession);
            const nextKeys = Object.keys(nextSession);
            const unchanged = previousKeys.length === nextKeys.length
                && nextKeys.every((key) => Object.is(previousSession[key], nextSession[key]));

            if (unchanged) return;
        }

        persistSession(nextSession);
    }, [persistSession]);

    /**
     * Login for Staff (Admin, Department Head, Care Staff)
     */
    const loginStaff = useCallback(async (username: any, password: any, requiredRole: any) => {
        setLoading(true);
        try {
            const trimmedUsername = String(username || '').trim();
            await prepareAuthSessionForLogin();
            const authData = await authenticateWithEdge({
                mode: 'authenticate-staff-login',
                username: trimmedUsername,
                password: String(password || ''),
                requiredRole
            });
            const staffProfile = await getStaffProfileByAuthUser(authData.user);
            if (!staffProfile || staffProfile.role !== requiredRole) {
                await supabase.auth.signOut().catch(() => null);
                setLoading(false);
                return { success: false, error: INVALID_STAFF_LOGIN_MESSAGE };
            }

            const syncedAuthEmail = await syncLinkedAuthEmailAfterLogin(
                'manage-staff-accounts',
                staffProfile.email,
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
            if (Number((err as any)?.status || 0) === 401) {
                return { success: false, error: INVALID_STAFF_LOGIN_MESSAGE };
            }
            return { success: false, error: getLoginCatchMessage(err, 'Connection error') };
        }
    }, [getStaffProfileByAuthUser, persistSession, prepareAuthSessionForLogin]);

    /**
     * Login for Students
     */
    const loginStudent = useCallback(async (identifier: any, password: any, loginMode: 'studentId' | 'email' = 'studentId') => {
        setLoading(true);
        try {
            const trimmedIdentifier = String(identifier || '').trim();
            const resolvedLoginMode = loginMode === 'email' || trimmedIdentifier.includes('@')
                ? 'email'
                : 'studentId';
            await prepareAuthSessionForLogin();
            const authData = await authenticateWithEdge({
                mode: 'authenticate-student-login',
                ...(resolvedLoginMode === 'email'
                    ? { email: trimmedIdentifier }
                    : { studentId: trimmedIdentifier }),
                password: String(password || '')
            });
            const studentProfile = await getStudentProfileByAuthUser(authData.user);
            if (!studentProfile) {
                const { data: sessionCheck } = await supabase.auth.getSession();
                const sessionPresent = !!sessionCheck?.session;

                await supabase.auth.signOut().catch(() => null);
                setLoading(false);

                if (!sessionPresent) {
                    return {
                        success: false,
                        error: 'Login blocked: Your browser discarded the secure session. Please check if your device DATE & TIME are completely accurate, or try disabling Private/Incognito mode.'
                    };
                }

                return {
                    success: false,
                    error: 'Profile fetch blocked. Please ensure your device DATE & TIME are accurate (synced to the internet). Incorrect device time blocks secure database connections.'
                };
            }

            const syncedAuthEmail = await syncLinkedAuthEmailAfterLogin(
                'manage-student-accounts',
                (studentProfile as any).email,
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
            if (Number((err as any)?.status || 0) === 401) {
                return { success: false, error: INVALID_STUDENT_LOGIN_MESSAGE };
            }
            return { success: false, error: getLoginCatchMessage(err, 'Login error') };
        }
    }, [getStudentProfileByAuthUser, persistSession, prepareAuthSessionForLogin]);

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
                const { data, error } = await supabase.auth.getSession();
                if (!isActive) return;

                if (error) {
                    const recovered = await handleRecoverableSessionError(error);
                    if (!isActive) return;
                    if (recovered) {
                        return;
                    }
                    throw error;
                }

                if (data.session?.user) {
                    const authUser = data.session.user;
                    const cachedUserType = matchesAuthUser(parsedSession, authUser)
                        ? getSessionAuthUserType(parsedSession)
                        : '';

                    if (cachedUserType === 'student') {
                        const restoredStudent = await restoreStudentBootstrapSessionFromAuth(authUser);
                        if (restoredStudent) {
                            return;
                        }

                        const restoredStaff = await restoreStaffSessionFromAuth(authUser);
                        if (restoredStaff) {
                            return;
                        }
                    } else if (cachedUserType === 'staff' || cachedUserType === 'admin' || cachedUserType === 'department head' || cachedUserType === 'care staff' || cachedUserType === 'registrar') {
                        const restoredStaff = await restoreStaffSessionFromAuth(authUser);
                        if (restoredStaff) {
                            return;
                        }

                        const restoredStudent = await restoreStudentBootstrapSessionFromAuth(authUser);
                        if (restoredStudent) {
                            return;
                        }
                    } else {
                        const restoredStaff = await restoreStaffSessionFromAuth(authUser);
                        if (restoredStaff) {
                            return;
                        }

                        const restoredStudent = await restoreStudentBootstrapSessionFromAuth(authUser);
                        if (restoredStudent) {
                            return;
                        }
                    }

                    persistSession(null);
                } else if (parsedSession?.userType === 'staff' || parsedSession?.auth_user_id || parsedSession?.userType === 'student') {
                    persistSession(null);
                } else if (parsedSession) {
                    setSession(parsedSession);
                }
            } catch (error) {
                const recovered = await handleRecoverableSessionError(error);
                if (recovered) {
                    return;
                }
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
        } = supabase.auth.onAuthStateChange((event, nextAuthSession) => {
            const currentSession = sessionRef.current;

            if (nextAuthSession?.user) {
                if (shouldReuseLoadedAuthSession(event, currentSession, nextAuthSession.user)) {
                    return;
                }

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
    }, [handleRecoverableSessionError, persistSession, restoreStaffSessionFromAuth, restoreStudentBootstrapSessionFromAuth, restoreStudentSessionFromAuth]);

    const logout = useCallback(async () => {
        const error = await signOutAndClearBrowserState(supabase, SUPABASE_AUTH_STORAGE_KEY);
        persistSession(null);

        if (error) {
            console.error('Failed to revoke the remote Supabase-auth session. Local credentials were cleared.', error);
        }
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
