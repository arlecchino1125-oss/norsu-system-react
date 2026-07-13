type LoginInvocationResult = {
    data?: { success?: boolean; session?: { access_token?: string; refresh_token?: string }; error?: string } | null;
    error?: { message?: string; context?: { status?: number } } | null;
    response?: { status?: number } | null;
};

type AuthLoginClient = {
    invoke: (payload: Record<string, unknown>) => Promise<LoginInvocationResult>;
    setSession: (session: { access_token: string; refresh_token: string }) => Promise<{
        data?: {
            session?: { access_token?: string };
            user?: { id?: string; email?: string };
        } | null;
        error?: { message?: string } | null;
    }>;
    readError?: (result: LoginInvocationResult) => Promise<string | null>;
};

export const authenticateLogin = async (
    client: AuthLoginClient,
    payload: Record<string, unknown>
) => {
    const result = await client.invoke(payload);
    const status = result.response?.status || result.error?.context?.status || null;

    if (result.error || !result.data?.success || !result.data.session) {
        const detailed = client.readError ? await client.readError(result) : null;
        const error: Error & { status?: number | null } = new Error(
            detailed || result.data?.error || result.error?.message || 'Unable to sign in.'
        );
        error.status = status;
        throw error;
    }

    const accessToken = String(result.data.session.access_token || '');
    const refreshToken = String(result.data.session.refresh_token || '');
    if (!accessToken || !refreshToken) {
        throw new Error('The login server returned an incomplete session.');
    }

    const installed = await client.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
    });
    if (installed.error || !installed.data?.session || !installed.data?.user) {
        throw new Error(installed.error?.message || 'Unable to install the secure session.');
    }

    return installed.data;
};
