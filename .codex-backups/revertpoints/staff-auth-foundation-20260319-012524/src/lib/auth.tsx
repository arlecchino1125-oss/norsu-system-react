import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { buildStudentAuthEmail, sanitizeStudentSession } from './studentAuth';
import { buildStaffAuthEmail, sanitizeStaffSession } from './staffAuth';

const AuthContext = createContext(null);

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
                .select('*')
                .eq('auth_user_id', authUser.id)
                .maybeSingle();

            if (linkedError) throw linkedError;
            if (linkedStudent) return linkedStudent;
        }

        const authEmail = String(authUser.email || '').trim().toLowerCase();
        if (authEmail.endsWith('@students.norsu.local')) {
            const derivedStudentId = authEmail.slice(0, authEmail.indexOf('@'));
            const { data: derivedStudent, error: derivedError } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', derivedStudentId)
                .maybeSingle();

            if (derivedError) throw derivedError;
            return derivedStudent;
        }

        return null;
    }, []);

    const getStaffProfileByAuthUser = useCallback(async (authUser: any) => {
        if (!authUser) return null;

        if (authUser.id) {
            const { data: linkedStaff, error: linkedError } = await supabase
                .from('staff_accounts')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .maybeSingle();

            if (linkedError) throw linkedError;
            if (linkedStaff) return linkedStaff;
        }

        const authEmail = String(authUser.email || '').trim().toLowerCase();
        if (authEmail.endsWith('@staff.norsu.local')) {
            const derivedUsername = authEmail.slice(0, authEmail.indexOf('@'));
            const { data: derivedStaff, error: derivedError } = await supabase
                .from('staff_accounts')
                .select('*')
                .eq('username', derivedUsername)
                .maybeSingle();

            if (derivedError) throw derivedError;
            return derivedStaff;
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
     * Login against staff_accounts table.
     * @param {string} username
     * @param {string} password
     * @param {string} requiredRole - e.g. 'Admin', 'Department Head', 'Care Staff'
     * @returns {{ success: boolean, error?: string, data?: object }}
     */
    /**
     * Login for Staff (Admin, Department Head, Care Staff)
     */
    const loginStaff = useCallback(async (username: any, password: any, requiredRole: any) => {
        setLoading(true);
        try {
            const trimmedUsername = String(username || '').trim();
            const { data: userCheck, error: userError } = await supabase
                .from('staff_accounts')
                .select('role, password, auth_user_id')
                .eq('username', trimmedUsername)
                .maybeSingle();

            if (userError) throw userError;

            if (!userCheck) {
                setLoading(false);
                return { success: false, error: 'Username not found.' };
            }

            if (userCheck.role !== requiredRole) {
                setLoading(false);
                return { success: false, error: `Access denied: This account is not a ${requiredRole}.` };
            }

            if (userCheck.auth_user_id) {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: buildStaffAuthEmail(trimmedUsername),
                    password
                });

                if (authError || !authData?.user) {
                    setLoading(false);
                    return { success: false, error: 'Incorrect password.' };
                }

                const staffProfile = await getStaffProfileByAuthUser(authData.user);
                if (!staffProfile) {
                    setLoading(false);
                    return { success: false, error: 'Staff profile not found.' };
                }

                if (staffProfile.role !== requiredRole) {
                    setLoading(false);
                    return { success: false, error: `Access denied: This account is not a ${requiredRole}.` };
                }

                const sessionData = sanitizeStaffSession(staffProfile, authData.user);
                persistSession(sessionData);
                setLoading(false);

                return { success: true, data: sessionData };
            }

            if (userCheck.password !== password) {
                setLoading(false);
                return { success: false, error: 'Incorrect password.' };
            }

            const { data: staff, error: staffError } = await supabase
                .from('staff_accounts')
                .select('*')
                .eq('username', trimmedUsername)
                .single();

            if (staffError) throw staffError;

            const sessionData = sanitizeStaffSession(staff);
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
            const { data: studentLookup, error: lookupError } = await supabase
                .from('students')
                .select('student_id, auth_user_id, password, status')
                .eq('student_id', trimmedStudentId)
                .maybeSingle();

            if (lookupError) throw lookupError;

            if (!studentLookup) {
                setLoading(false);
                return { success: false, error: 'Student ID not found.' };
            }

            if (studentLookup.auth_user_id) {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: buildStudentAuthEmail(trimmedStudentId),
                    password
                });

                if (authError || !authData?.user) {
                    setLoading(false);
                    return { success: false, error: 'Incorrect password.' };
                }

                const studentProfile = await getStudentProfileByAuthUser(authData.user);
                if (!studentProfile) {
                    setLoading(false);
                    return { success: false, error: 'Student profile not found.' };
                }

                const sessionData = sanitizeStudentSession(studentProfile, authData.user);
                persistSession(sessionData);
                setLoading(false);

                return { success: true, data: sessionData };
            }

            const { data: legacyStudent, error: legacyError } = await supabase
                .from('students')
                .select('*')
                .eq('student_id', trimmedStudentId)
                .maybeSingle();

            if (legacyError) throw legacyError;

            if (!legacyStudent) {
                setLoading(false);
                return { success: false, error: 'Student ID not found.' };
            }

            // Legacy fallback for students not yet migrated to Supabase Auth.
            if (legacyStudent.password !== password) {
                setLoading(false);
                return { success: false, error: 'Incorrect password.' };
            }

            if (legacyStudent.status !== 'Active' && legacyStudent.status !== 'Probation') { // Allow Active/Probation
                // Optional: Check status if needed
                // return { success: false, error: 'Account is not active.' };
            }

            const sessionData = sanitizeStudentSession(legacyStudent, null);
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
                } else if (parsedSession?.auth_user_id || parsedSession?.userType === 'student') {
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

            if (!currentSession || currentSession.auth_user_id || currentSession.userType === 'student') {
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
        if (sessionRef.current?.auth_user_id || sessionRef.current?.userType === 'student') {
            supabase.auth.signOut().catch((error) => {
                console.error('Failed to sign out Supabase-auth session.', error);
            });
        }
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
