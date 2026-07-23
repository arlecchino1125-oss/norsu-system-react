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
import { getStaffProfileByAuthUser, getStudentProfileByAuthUser } from './authProfiles';
import { useAuthSessionBootstrap } from './useAuthSessionBootstrap';
import { APP_SESSION_STORAGE_KEY } from './storageKeys';
import { AuthContext } from './useAuth';

const normalizeLoginEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

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
            localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(nextSession));
            return;
        }
        localStorage.removeItem(APP_SESSION_STORAGE_KEY);
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
    const loginStaff = useCallback(async (identifier: any, password: any, requiredRole: any) => {
        setLoading(true);
        try {
            const trimmedIdentifier = String(identifier || '').trim();
            const isEmail = trimmedIdentifier.includes('@');
            await prepareAuthSessionForLogin();
            const authData = await authenticateWithEdge({
                mode: 'authenticate-staff-login',
                ...(isEmail
                    ? { email: trimmedIdentifier }
                    : { username: trimmedIdentifier }),
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
    }, [persistSession, prepareAuthSessionForLogin]);

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
    }, [persistSession, prepareAuthSessionForLogin]);

    // Alias for backward compatibility with existing staff login pages
    const login = loginStaff;

    useAuthSessionBootstrap({
        sessionRef,
        persistSession,
        setSession,
        setLoading,
        handleRecoverableSessionError
    });

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
