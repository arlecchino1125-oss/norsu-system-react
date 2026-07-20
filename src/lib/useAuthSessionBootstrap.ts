import React from 'react';
import { supabase } from './supabase';
import { sanitizeStudentSession } from './studentAuth';
import { sanitizeStaffSession } from './staffAuth';
import {
    getStaffProfileByAuthUser,
    getStudentBootstrapByAuthUser,
    getStudentProfileByAuthUser
} from './authProfiles';
import { APP_SESSION_STORAGE_KEY, migrateLegacyStorageKey } from './storageKeys';

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

type PersistSession = (nextSession: any) => void;

const restoreStaffSessionFromAuth = async (persistSession: PersistSession, authUser: any) => {
    const staff = await getStaffProfileByAuthUser(authUser);
    if (!staff) {
        return null;
    }

    const sessionData = sanitizeStaffSession(staff, authUser);
    persistSession(sessionData);
    return sessionData;
};

const restoreStudentBootstrapSessionFromAuth = async (persistSession: PersistSession, authUser: any) => {
    const student = await getStudentBootstrapByAuthUser(authUser);
    if (!student) {
        return null;
    }

    const sessionData = sanitizeStudentSession(student, authUser);
    persistSession(sessionData);
    return sessionData;
};

const restoreStudentSessionFromAuth = async (persistSession: PersistSession, authUser: any) => {
    const student = await getStudentProfileByAuthUser(authUser);
    if (!student) {
        persistSession(null);
        return null;
    }

    const sessionData = sanitizeStudentSession(student, authUser);
    persistSession(sessionData);
    return sessionData;
};

type BootstrapArgs = {
    sessionRef: React.MutableRefObject<any>;
    persistSession: PersistSession;
    setSession: (session: any) => void;
    setLoading: (loading: boolean) => void;
    handleRecoverableSessionError: (error: unknown) => Promise<boolean>;
};

/**
 * Restores the app session on boot (Supabase auth first, cached localStorage
 * copy as fallback) and keeps it in sync with Supabase auth state changes.
 */
export const useAuthSessionBootstrap = ({
    sessionRef,
    persistSession,
    setSession,
    setLoading,
    handleRecoverableSessionError
}: BootstrapArgs) => {
    React.useEffect(() => {
        let isActive = true;

        const initializeSession = async () => {
            migrateLegacyStorageKey('norsu_session', APP_SESSION_STORAGE_KEY);
            const stored = localStorage.getItem(APP_SESSION_STORAGE_KEY);
            let parsedSession = null;

            if (stored) {
                try {
                    parsedSession = JSON.parse(stored);
                } catch {
                    localStorage.removeItem(APP_SESSION_STORAGE_KEY);
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

                    // Try the cached user type's restore path first to save a query;
                    // fall back to the other path before giving up.
                    if (cachedUserType === 'student') {
                        if (await restoreStudentBootstrapSessionFromAuth(persistSession, authUser)) return;
                        if (await restoreStaffSessionFromAuth(persistSession, authUser)) return;
                    } else {
                        if (await restoreStaffSessionFromAuth(persistSession, authUser)) return;
                        if (await restoreStudentBootstrapSessionFromAuth(persistSession, authUser)) return;
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

                restoreStaffSessionFromAuth(persistSession, nextAuthSession.user)
                    .then((restoredStaff) => {
                        if (restoredStaff) return restoredStaff;
                        return restoreStudentSessionFromAuth(persistSession, nextAuthSession.user);
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

        // Supabase owns this external session; this effect intentionally synchronizes it with AuthProvider state.
        // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent
        initializeSession();

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, [handleRecoverableSessionError, persistSession, sessionRef, setLoading, setSession]);
};
