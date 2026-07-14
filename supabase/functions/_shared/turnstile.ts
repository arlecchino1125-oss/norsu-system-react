type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const TURNSTILE_REQUIRED_MESSAGE = 'Please complete the security check to continue.';

export const requireValidTurnstile = async (
    tokenValue: unknown,
    secretValue: unknown,
    fetcher: Fetcher = fetch
) => {
    const secret = String(secretValue || '').trim();
    if (!secret) return;

    const token = String(tokenValue || '').trim();
    if (!token) throw withStatus(TURNSTILE_REQUIRED_MESSAGE, 403);

    try {
        const response = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret, response: token })
        });
        const payload = response.ok ? await response.json().catch(() => null) : null;
        if (payload?.success === true) return;
    } catch {
        // Normalize provider/network failures to the same public response.
    }

    throw withStatus(TURNSTILE_REQUIRED_MESSAGE, 403);
};
