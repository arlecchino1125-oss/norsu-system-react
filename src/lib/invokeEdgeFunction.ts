import { buildEdgeFunctionHeaders } from './functionHeaders';
import { supabase as defaultSupabase } from './supabase';
import {
    clearLocalSupabaseSession,
    recoverLocalSupabaseSession
} from './supabaseSessionRecovery';

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

export const getFriendlyErrorMessage = (errorMsg: string): string => {
    const msg = String(errorMsg || '').trim();
    if (!msg) {
        return "We encountered an unexpected issue. Please try again.";
    }

    const lower = msg.toLowerCase();

    // 1. Network / Connection errors
    if (
        lower.includes('failed to send a request to the edge function') ||
        lower.includes('failed to fetch') ||
        lower.includes('typeerror: failed to fetch') ||
        lower.includes('networkerror') ||
        lower.includes('network error')
    ) {
        return "We're having a little trouble connecting to our servers. Please check your internet connection and try again.";
    }

    // 2. Auth / Token / Grant errors
    if (
        lower.includes('invalid_grant') || 
        lower.includes('invalid grant') || 
        lower.includes('refresh token') ||
        lower.includes('invalid_token') ||
        lower.includes('invalid token')
    ) {
        return "We couldn't verify your access. Please try signing out and signing back in to refresh your connection.";
    }

    // 3. Database / Constraint errors
    if (lower.includes('unique constraint') || lower.includes('already exists')) {
        return "This information has already been submitted or registered. Please review your entries.";
    }
    if (lower.includes('foreign key') || lower.includes('violates')) {
        return "Some of the referenced information could not be verified. Please double-check your entries.";
    }

    // 4. Server / HTTP errors (generic non-2xx / 500)
    if (lower.includes('internal server error') || lower.includes('500') || lower.includes('non-2xx')) {
        return "We encountered a temporary server issue. Please give it a moment and try again.";
    }

    return msg;
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
        try {
            const { data: authSessionData, error: authSessionError } = await client.auth.getSession();

            if (authSessionError) {
                const recovered = await recoverLocalSupabaseSession(client, authSessionError);
                if (recovered) {
                    throw new Error(sessionErrorMessage);
                }
                throw authSessionError;
            }

            accessToken = authSessionData.session?.access_token || null;
            if (!accessToken) {
                await clearLocalSupabaseSession(client);
                throw new Error(sessionErrorMessage);
            }
        } catch (error) {
            const recovered = await recoverLocalSupabaseSession(client, error);
            if (recovered) {
                throw new Error(sessionErrorMessage);
            }

            if (error instanceof Error) {
                throw error;
            }

            throw new Error(sessionErrorMessage);
        }
    }

    const { data, error, response } = await client.functions.invoke(functionName, {
        body,
        headers: buildEdgeFunctionHeaders(accessToken)
    });

    if (error) {
        const detailedMessage = await readEdgeFunctionErrorMessage(response || error?.context);
        
        let underlyingError = '';
        if (error.context instanceof Error) {
            underlyingError = error.context.message;
        } else if (error.cause instanceof Error) {
            underlyingError = error.cause.message;
        } else if (
            error.message && 
            error.message !== 'Failed to send a request to the Edge Function' && 
            !error.message.includes('non-2xx')
        ) {
            underlyingError = error.message;
        }

        const baseMessage = String(error.message || '').includes('non-2xx')
            ? (detailedMessage || non2xxMessage || fallbackMessage)
            : (detailedMessage || error.message || fallbackMessage);
            
        const friendlyBaseMessage = getFriendlyErrorMessage(baseMessage);
        const isGenericOrNetwork = friendlyBaseMessage !== baseMessage;
        
        const finalMessage = underlyingError && !friendlyBaseMessage.includes(underlyingError) && !isGenericOrNetwork
            ? `${friendlyBaseMessage} (${underlyingError})` 
            : friendlyBaseMessage;

        const nextError: Error & { status?: number | null; errorName?: string | null } = new Error(finalMessage);
        nextError.status = response?.status || error?.context?.status || null;
        nextError.errorName = error?.name || null;
        throw nextError;
    }

    if (data && typeof data === 'object' && 'success' in data && data.success === false) {
        const rawErrorMsg = String((data as any)?.error || fallbackMessage);
        const finalMessage = getFriendlyErrorMessage(rawErrorMsg);
        
        const nextError: Error & { status?: number | null } = new Error(finalMessage);
        nextError.status = response?.status || null;
        throw nextError;
    }

    return data as T;
};
