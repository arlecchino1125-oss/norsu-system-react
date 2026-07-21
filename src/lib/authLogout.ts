import { APP_SESSION_STORAGE_KEY, CARE_STAFF_NOTES_STORAGE_KEY } from './storageKeys';

const LOCAL_SENSITIVE_KEYS = [
    APP_SESSION_STORAGE_KEY,
    CARE_STAFF_NOTES_STORAGE_KEY,
    // Legacy unversioned keys from builds before 2026-07; keep clearing them
    // for users who last signed in on an old build.
    'norsu_session',
    'care_staff_notes',
    'norsu_force_profile_completion_student_id',
    'norsu-nat-application-draft-v1'
];

const SESSION_SENSITIVE_KEYS = [
    'norsu_force_profile_completion_student_id',
    'norsu-nat-application-draft-v1',
    'norsu-nat-applicant-session-v1'
];

const LOCAL_SENSITIVE_PREFIXES = [
    'profile_completion_draft_',
    'profile_completion_step_'
];

type LogoutClient = {
    auth: {
        signOut: () => Promise<{ error?: unknown } | void>;
    };
};

const removeKeys = (storage: Storage, keys: string[]) => {
    keys.forEach((key) => storage.removeItem(key));
};

const removeKeysWithPrefixes = (storage: Storage, prefixes: string[]) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
            storage.removeItem(key);
        }
    }
};

export const getSupabaseAuthStorageKey = (supabaseUrl: string) =>
    `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

export const clearLogoutStorage = (authStorageKey: string) => {
    if (typeof window === 'undefined') return;

    const authKeys = [
        authStorageKey,
        `${authStorageKey}-code-verifier`,
        `${authStorageKey}-user`
    ];

    removeKeys(window.localStorage, [...authKeys, ...LOCAL_SENSITIVE_KEYS]);
    removeKeysWithPrefixes(window.localStorage, LOCAL_SENSITIVE_PREFIXES);
    removeKeys(window.sessionStorage, [...authKeys, ...SESSION_SENSITIVE_KEYS]);
};

export const signOutAndClearBrowserState = async (
    client: LogoutClient,
    authStorageKey: string
) => {
    let error: unknown = null;

    try {
        const result = await client.auth.signOut();
        error = result && 'error' in result ? result.error ?? null : null;
    } catch (caughtError) {
        error = caughtError;
    } finally {
        clearLogoutStorage(authStorageKey);
    }

    return error;
};
