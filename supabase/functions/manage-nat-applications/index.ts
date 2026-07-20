import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { hashNatPassword, verifyNatPassword } from '../_shared/natPassword.ts';
import { enforceRateLimit, LOGIN_RATE_LIMIT } from '../_shared/rateLimit.ts';
import { requireValidTurnstile } from '../_shared/turnstile.ts';
import {
    hashNatIdentifier,
    loginNatApplicantSecurity,
    requireNatSessionSecurity,
    revokeNatSessionSecurity,
    normalizeNatUsername,
    type NatSecurityDependencies
} from './natSecurity.ts';
import { buildNatAttendanceUpdate } from './natAttendance.ts';
import { buildNatPublicStats } from './natPublicStats.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const LOGIN_FAILURE_DELAY_MS = 700;
const FAILURE_SCOPE = 'nat-login-failure';
const FAILURE_WINDOW_SECONDS = 15 * 60;

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });

const getAdminClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
};

const sanitizeNatApplication = (application: Record<string, unknown>) => {
    const {
        password: _password,
        nat_password_hash: _natPasswordHash,
        failed_login_attempts: _failedLoginAttempts,
        captcha_required_until: _captchaRequiredUntil,
        ...safeApplication
    } = application;
    return safeApplication;
};

const turnstileSecret = () => String(Deno.env.get('TURNSTILE_SECRET_KEY') || '').trim();

const reportBookkeepingError = async (error: unknown, step: string) => {
    await captureEdgeException(error, { endpoint: 'manage-nat-applications', step });
};

const getNatApplicationByUsername = async (adminClient: any, username: string) => {
    const { data, error } = await adminClient
        .from('applications')
        .select('*')
        .eq('username', normalizeNatUsername(username))
        .maybeSingle();
    if (error) throw error;
    return data;
};

const createNatSecurityDependencies = (adminClient: any): NatSecurityDependencies => ({
    now: () => new Date(),
    captchaEnabled: Boolean(turnstileSecret()),
    getApplication: (username) => getNatApplicationByUsername(adminClient, username),
    verifyPassword: verifyNatPassword,
    verifyCaptcha: async (token) => {
        try {
            await requireValidTurnstile(token, turnstileSecret());
            return true;
        } catch {
            return false;
        }
    },
    getFailureCount: async (identifier) => {
        try {
            const { data, error } = await adminClient
                .from('edge_rate_limits')
                .select('request_count, expires_at')
                .eq('scope', FAILURE_SCOPE)
                .eq('identifier_hash', await hashNatIdentifier(identifier))
                .maybeSingle();
            if (error) throw error;
            if (!data || Date.parse(String(data.expires_at)) <= Date.now()) return 0;
            return Number(data.request_count) || 0;
        } catch (error) {
            await reportBookkeepingError(error, 'read-login-failures');
            return 0;
        }
    },
    recordFailure: async (identifier) => {
        try {
            const { data, error } = await adminClient.rpc('consume_edge_rate_limit', {
                p_scope: FAILURE_SCOPE,
                p_identifier: identifier,
                p_max_requests: 3,
                p_window_seconds: FAILURE_WINDOW_SECONDS
            });
            if (error) throw error;
            return Number(data?.[0]?.request_count) || 1;
        } catch (error) {
            await reportBookkeepingError(error, 'record-login-failure');
            return 1;
        }
    },
    clearFailures: async (identifier) => {
        const { error } = await adminClient
            .from('edge_rate_limits')
            .delete()
            .eq('scope', FAILURE_SCOPE)
            .eq('identifier_hash', await hashNatIdentifier(identifier));
        if (error) await reportBookkeepingError(error, 'clear-login-failures');
    },
    upgradePassword: async (application, password) => {
        const { error } = await adminClient
            .from('applications')
            .update({ nat_password_hash: await hashNatPassword(password) })
            .eq('id', application.id);
        if (error) await reportBookkeepingError(error, 'password-hash-upgrade');
    },
    storeSession: async ({ applicationId, tokenHash, browserIdHash, expiresAt }) => {
        await adminClient.from('nat_applicant_sessions').delete().lt('expires_at', new Date().toISOString());
        const { error } = await adminClient.from('nat_applicant_sessions').insert({
            application_id: applicationId,
            token_hash: tokenHash,
            browser_id_hash: browserIdHash,
            expires_at: expiresAt
        });
        if (error) throw error;
    },
    findSession: async ({ tokenHash, browserIdHash, now }) => {
        const { data: session, error: sessionError } = await adminClient
            .from('nat_applicant_sessions')
            .select('application_id, expires_at')
            .eq('token_hash', tokenHash)
            .eq('browser_id_hash', browserIdHash)
            .gt('expires_at', now)
            .maybeSingle();
        if (sessionError) throw sessionError;
        if (!session) return null;

        const { data: application, error: applicationError } = await adminClient
            .from('applications')
            .select('*')
            .eq('id', session.application_id)
            .maybeSingle();
        if (applicationError) throw applicationError;
        return application ? { application, expiresAt: session.expires_at } : null;
    },
    deleteSession: async ({ tokenHash, browserIdHash }) => {
        const { error } = await adminClient
            .from('nat_applicant_sessions')
            .delete()
            .eq('token_hash', tokenHash)
            .eq('browser_id_hash', browserIdHash);
        if (error) throw error;
    },
    delay: () => new Promise((resolve) => setTimeout(resolve, LOGIN_FAILURE_DELAY_MS)),
    randomBytes: () => crypto.getRandomValues(new Uint8Array(32))
});

const isMissingTestTimeColumnError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('applications.test_time') || message.includes('column test_time');
};

const getNatPublicStats = async (adminClient: any) => {
    let supportsTestTime = true;
    let applications: Array<Record<string, unknown>> = [];
    const withTime = await adminClient.from('applications').select('priority_course, test_date, test_time');

    if (withTime.error) {
        if (!isMissingTestTimeColumnError(withTime.error)) throw withTime.error;
        supportsTestTime = false;
        const fallback = await adminClient.from('applications').select('priority_course, test_date');
        if (fallback.error) throw fallback.error;
        applications = fallback.data || [];
    } else {
        applications = withTime.data || [];
    }

    const [coursesResult, schedulesResult, requirementsResult] = await Promise.all([
        adminClient.from('courses').select('name, status').eq('status', 'Open'),
        adminClient.from('admission_schedules').select('date, is_active, time_windows').eq('is_active', true),
        adminClient.from('nat_requirements').select('name').order('created_at', { ascending: true })
    ]);
    if (coursesResult.error) throw coursesResult.error;
    if (schedulesResult.error) throw schedulesResult.error;
    if (requirementsResult.error) throw requirementsResult.error;

    const { courseCounts, dateCounts, dateTimeCounts } = buildNatPublicStats({
        applications,
        courses: coursesResult.data || [],
        schedules: schedulesResult.data || []
    });

    return json({
        success: true,
        supportsTestTime,
        courseCounts,
        dateCounts,
        dateTimeCounts,
        requirements: (requirementsResult.data || []).flatMap((row: any) => {
            const name = String(row?.name || '').trim();
            return name ? [name] : [];
        })
    });
};

const updateNatAttendance = async (adminClient: any, application: any, action: 'time-in' | 'time-out') => {
    const updates = buildNatAttendanceUpdate(application, action, new Date());
    let updateQuery = adminClient
        .from('applications')
        .update(updates)
        .eq('id', application.id);

    if (action === 'time-in') {
        updateQuery = updateQuery
            .eq('status', 'Submitted')
            .is('time_in', null)
            .is('time_out', null);
    } else {
        updateQuery = updateQuery
            .eq('status', 'Ongoing')
            .not('time_in', 'is', null)
            .is('time_out', null);
    }

    const { data: updatedApplication, error } = await updateQuery
        .select('*')
        .maybeSingle();
    if (error) throw error;
    if (!updatedApplication) {
        const conflict = new Error('Attendance was already updated. Refresh and try again.') as Error & { status?: number };
        conflict.status = 409;
        throw conflict;
    }
    return updatedApplication;
};

serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);

    try {
        const body = await request.json();
        const mode = String(body.mode || '').trim();
        if (mode === 'ping') return json({ success: true });

        if (mode === 'login') {
            const rateLimitResponse = await enforceRateLimit(request, {
                endpoint: 'manage-nat-applications',
                action: 'login',
                identifier: String(body.username || ''),
                ...LOGIN_RATE_LIMIT,
                corsHeaders
            });
            if (rateLimitResponse) return rateLimitResponse;
        }

        if (mode === 'public-stats') {
            const rateLimitResponse = await enforceRateLimit(request, {
                endpoint: 'manage-nat-applications',
                action: 'public-stats',
                identifierMode: 'ip',
                maxRequests: 60,
                windowSeconds: 60,
                corsHeaders
            });
            if (rateLimitResponse) return rateLimitResponse;
        }

        const adminClient = getAdminClient();
        if (mode === 'public-stats') return await getNatPublicStats(adminClient);

        const security = createNatSecurityDependencies(adminClient);
        if (mode === 'login') {
            const result = await loginNatApplicantSecurity(body, security);
            return json({
                success: true,
                application: sanitizeNatApplication(result.application),
                sessionToken: result.token,
                sessionExpiresAt: result.expiresAt
            });
        }

        if (mode === 'logout') {
            await revokeNatSessionSecurity(body, security);
            return json({ success: true });
        }

        if (mode === 'session' || mode === 'time-in' || mode === 'time-out') {
            const session = await requireNatSessionSecurity(body, security);
            const application = mode === 'session'
                ? session.application
                : await updateNatAttendance(adminClient, session.application, mode);
            return json({
                success: true,
                application: sanitizeNatApplication(application),
                sessionExpiresAt: session.expiresAt
            });
        }

        return json({ success: false, error: 'Unsupported NAT management mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-nat-applications' });
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 500;
        const message = status < 500 && error instanceof Error
            ? error.message
            : 'Unable to process the NAT request right now.';
        return json({ success: false, error: message }, status);
    }
});
