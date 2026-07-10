const APP_SESSION_STORAGE_KEY = 'norsu_session';

const RECOVERABLE_SESSION_ERROR_MARKERS = [
    'invalid refresh token',
    'refresh token not found',
    'auth session missing',
    'session not found',
    'session from session_id claim in jwt does not exist'
];

type SupabaseLikeClient = {
    auth: {
        signOut: (options?: { scope?: 'global' | 'local' | 'others' }) => Promise<{ error: unknown } | void>;
    };
};

const hasLocalStorage = () =>
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const clearStoredAppSession = () => {
    if (!hasLocalStorage()) {
        return;
    }

    window.localStorage.removeItem(APP_SESSION_STORAGE_KEY);
};

const isRecoverableSupabaseSessionError = (error: unknown) => {
    const message = String((error as any)?.message || error || '').toLowerCase();
    return RECOVERABLE_SESSION_ERROR_MARKERS.some((marker) => message.includes(marker));
};

export const clearLocalSupabaseSession = async (client: SupabaseLikeClient) => {
    clearStoredAppSession();

    try {
        await client.auth.signOut({ scope: 'local' });
    } catch {
        // Swallow recovery cleanup failures so the caller can surface the original auth issue.
    }
};

export const recoverLocalSupabaseSession = async (
    client: SupabaseLikeClient,
    error: unknown
) => {
    if (!isRecoverableSupabaseSessionError(error)) {
        return false;
    }

    await clearLocalSupabaseSession(client);
    return true;
};
