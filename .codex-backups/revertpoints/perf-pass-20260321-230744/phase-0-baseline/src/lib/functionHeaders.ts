const functionJwt = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const buildEdgeFunctionHeaders = (userAccessToken?: string | null) => {
    const headers: Record<string, string> = {};

    if (functionJwt) {
        headers.Authorization = `Bearer ${functionJwt}`;
        headers.apikey = functionJwt;
    }

    if (userAccessToken) {
        headers['x-supabase-auth'] = `Bearer ${userAccessToken}`;
    }

    return Object.keys(headers).length ? headers : undefined;
};
