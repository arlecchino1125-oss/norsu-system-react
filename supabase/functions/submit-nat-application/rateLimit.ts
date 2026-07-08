import { createClient } from 'npm:@supabase/supabase-js@2';

export const LOGIN_RATE_LIMIT = {
  maxRequests: 5,
  windowSeconds: 15 * 60,
  message: 'Too many login attempts. Please wait 15 minutes before trying again.'
} as const;

const DEFAULT_RATE_LIMIT = {
  maxRequests: 120,
  windowSeconds: 60,
  message: 'Too many requests. Please wait a moment before trying again.'
} as const;

type RateLimitOptions = {
  endpoint: string;
  action?: string | null;
  identifier?: string | null;
  identifierMode?: 'client' | 'ip';
  maxRequests?: number;
  windowSeconds?: number;
  message?: string;
  corsHeaders?: HeadersInit;
};

type RateLimitResult = {
  allowed?: boolean;
  request_count?: number;
  remaining?: number;
  retry_after_seconds?: number;
  reset_at?: string;
};

const clientCache = new Map<string, any>();

const getRateLimitClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase service role configuration.');
  }

  const cacheKey = `${supabaseUrl}:${serviceRoleKey.slice(0, 18)}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }));
  }

  return clientCache.get(cacheKey);
};

const normalizeScopePart = (value: unknown, fallback: string) => {
  const text = String(value || '').trim().toLowerCase();
  return (text || fallback).replace(/[^a-z0-9._:-]+/g, '-');
};

const getBearerTokenFromHeader = (value: string | null) => {
  const headerValue = String(value || '').trim();
  if (!headerValue.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return headerValue.slice('Bearer '.length).trim() || null;
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown';
  }

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

const buildIdentifier = async (
  request: Request,
  seed?: string | null,
  mode: RateLimitOptions['identifierMode'] = 'client'
) => {
  const clientIp = getClientIp(request);
  if (mode === 'ip') {
    return `ip:${clientIp}`;
  }

  const normalizedSeed = String(seed || '').trim().toLowerCase();

  if (normalizedSeed) {
    return `ip:${clientIp}|seed:${await sha256Hex(normalizedSeed)}`;
  }

  const accessToken = getBearerTokenFromHeader(
    request.headers.get('x-supabase-auth')
    || request.headers.get('x-client-authorization')
    || request.headers.get('Authorization')
  );

  if (accessToken) {
    return `auth:${await sha256Hex(accessToken)}`;
  }

  const userAgent = String(request.headers.get('user-agent') || 'unknown').slice(0, 160);
  return `ip:${clientIp}|ua:${await sha256Hex(userAgent)}`;
};

const getRateLimitNumber = (value: number | undefined, fallback: number) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.floor(Number(value)));
};

const json = (body: Record<string, unknown>, status: number, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    }
  });

const buildRateLimitResponse = (
  result: RateLimitResult,
  options: Required<Pick<RateLimitOptions, 'maxRequests' | 'windowSeconds' | 'message'>> & Pick<RateLimitOptions, 'corsHeaders'>
) => {
  const retryAfterSeconds = Math.max(1, Number(result.retry_after_seconds || options.windowSeconds));

  return json({
    success: false,
    error: options.message,
    retryAfterSeconds,
    resetAt: result.reset_at || null
  }, 429, {
    ...options.corsHeaders,
    'Retry-After': String(retryAfterSeconds),
    'X-RateLimit-Limit': String(options.maxRequests),
    'X-RateLimit-Remaining': String(Math.max(0, Number(result.remaining || 0))),
    'X-RateLimit-Reset': result.reset_at || ''
  });
};

export const enforceRateLimit = async (
  request: Request,
  options: RateLimitOptions
): Promise<Response | null> => {
  const maxRequests = getRateLimitNumber(options.maxRequests, DEFAULT_RATE_LIMIT.maxRequests);
  const windowSeconds = getRateLimitNumber(options.windowSeconds, DEFAULT_RATE_LIMIT.windowSeconds);
  const message = String(options.message || DEFAULT_RATE_LIMIT.message);
  const endpoint = normalizeScopePart(options.endpoint, 'edge-function');
  const action = normalizeScopePart(options.action, 'default');
  const scope = `${endpoint}:${action}`;
  const identifier = await buildIdentifier(request, options.identifier, options.identifierMode);

  let data: unknown = null;
  let error: any = null;

  try {
    ({ data, error } = await getRateLimitClient().rpc('consume_edge_rate_limit', {
      p_scope: scope,
      p_identifier: identifier,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds
    }));
  } catch (rpcError) {
    error = rpcError;
  }

  if (error) {
    console.error('Rate limit check failed:', {
      scope,
      message: error instanceof Error ? error.message : String(error || 'Unknown rate limit error.')
    });

    return json({
      success: false,
      error: 'Unable to verify request rate limit. Please try again shortly.'
    }, 503, options.corsHeaders);
  }

  const result = (Array.isArray(data) ? data[0] : data) as RateLimitResult | null;
  if (result?.allowed === false) {
    return buildRateLimitResponse(result, {
      maxRequests,
      windowSeconds,
      message,
      corsHeaders: options.corsHeaders
    });
  }

  return null;
};
