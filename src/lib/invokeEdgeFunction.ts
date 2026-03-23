import { buildEdgeFunctionHeaders } from './functionHeaders';
import { supabase as defaultSupabase } from './supabase';

type EdgeFunctionClient = typeof defaultSupabase;

type InvokeEdgeFunctionOptions = {
    client?: EdgeFunctionClient;
    body?: unknown;
    requireAuth?: boolean;
    accessToken?: string | null;
    sessionErrorMessage?: string;
    fallbackMessage?: string;
    non2xxMessage?: string;
};

export const readEdgeFunctionErrorMessage = async (responseLike: any) => {
    if (!responseLike) return '';

    try {
        const payload = await responseLike.clone().json();
        if (payload?.error) return String(payload.error);
        if (payload?.message) return String(payload.message);
    } catch {
        try {
            const text = await responseLike.clone().text();
            return String(text || '').trim();
        } catch {
            return '';
        }
    }

    return '';
};

export const invokeEdgeFunction = async <T = any>(
    functionName: string,
    options: InvokeEdgeFunctionOptions = {}
): Promise<T> => {
    const {
        client = defaultSupabase,
        body,
        requireAuth = false,
        accessToken: providedAccessToken = null,
        sessionErrorMessage = 'Your login session has expired. Please sign in again and try once more.',
        fallbackMessage = 'Failed to run edge function.',
        non2xxMessage
    } = options;

    let accessToken = providedAccessToken;
    if (requireAuth && !accessToken) {
        const { data: authSessionData } = await client.auth.getSession();
        accessToken = authSessionData.session?.access_token || null;
        if (!accessToken) {
            throw new Error(sessionErrorMessage);
        }
    }

    const { data, error, response } = await client.functions.invoke(functionName, {
        body,
        headers: buildEdgeFunctionHeaders(accessToken)
    });

    if (error) {
        const detailedMessage = await readEdgeFunctionErrorMessage(response || error?.context);
        const nextError: Error & { status?: number | null; errorName?: string | null } = new Error(
            String(error.message || '').includes('non-2xx')
                ? (detailedMessage || non2xxMessage || fallbackMessage)
                : (detailedMessage || error.message || fallbackMessage)
        );
        nextError.status = response?.status || error?.context?.status || null;
        nextError.errorName = error?.name || null;
        throw nextError;
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        const nextError: Error & { status?: number | null } = new Error(
            String((data as any)?.error || fallbackMessage)
        );
        nextError.status = response?.status || null;
        throw nextError;
    }

    return data as T;
};
