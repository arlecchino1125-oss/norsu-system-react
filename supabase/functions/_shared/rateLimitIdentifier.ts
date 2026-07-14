export type RateLimitIdentifierMode = 'client' | 'ip';

const getBearerTokenFromHeader = (value: string | null) => {
    const headerValue = String(value || '').trim();
    if (!headerValue.toLowerCase().startsWith('bearer ')) return null;
    return headerValue.slice('Bearer '.length).trim() || null;
};

const getClientIp = (request: Request) => {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || 'unknown';
    return request.headers.get('cf-connecting-ip')
        || request.headers.get('x-real-ip')
        || 'unknown';
};

const sha256Hex = async (value: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

export const buildRateLimitIdentifier = async (
    request: Request,
    seed?: string | null,
    mode: RateLimitIdentifierMode = 'client'
) => {
    const clientIp = getClientIp(request);
    if (mode === 'ip') return `ip:${clientIp}`;

    const normalizedSeed = String(seed || '').trim().toLowerCase();
    if (normalizedSeed) return `ip:${clientIp}|seed:${await sha256Hex(normalizedSeed)}`;

    const accessToken = getBearerTokenFromHeader(
        request.headers.get('x-supabase-auth')
        || request.headers.get('x-client-authorization')
        || request.headers.get('Authorization')
    );
    if (accessToken) return `auth:${await sha256Hex(accessToken)}`;

    const userAgent = String(request.headers.get('user-agent') || 'unknown').slice(0, 160);
    return `ip:${clientIp}|ua:${await sha256Hex(userAgent)}`;
};
