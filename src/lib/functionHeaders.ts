const functionJwt = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const buildEdgeFunctionHeaders = (userAccessToken?: string | null) => {
    const headers: Record<string, string> = {};

    if (functionJwt) {
        headers.apikey = functionJwt;
    }

    const bearerToken = userAccessToken || functionJwt;
    if (bearerToken) {
        headers.Authorization = `Bearer ${bearerToken}`;
    }

    return Object.keys(headers).length ? headers : undefined;
};
