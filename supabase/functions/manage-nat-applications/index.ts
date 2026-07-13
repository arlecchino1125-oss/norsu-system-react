import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { hashNatPassword, verifyNatPassword } from '../_shared/natPassword.ts';
import {
    hashNatIdentifier,
    loginNatApplicantSecurity,
    requireNatSessionSecurity,
    revokeNatSessionSecurity,
    type NatSecurityDependencies
} from './natSecurity.ts';

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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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

const verifyTurnstileToken = async (token: string) => {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret(), response: token })
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    return payload?.success === true;
};

const reportBookkeepingError = async (error: unknown, step: string) => {
    await captureEdgeException(error, { endpoint: 'manage-nat-applications', step });
};

const getNatApplicationByUsername = async (adminClient: any, username: string) => {
    const { data, error } = await adminClient
        .from('applications')
        .select('*')
        .ilike('username', username)
        .maybeSingle();
    if (error) throw error;
    return data;
};

const createNatSecurityDependencies = (adminClient: any): NatSecurityDependencies => ({
    now: () => new Date(),
    captchaEnabled: Boolean(turnstileSecret()),
    getApplication: (username) => getNatApplicationByUsername(adminClient, username),
    verifyPassword: verifyNatPassword,
    verifyCaptcha: verifyTurnstileToken,
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

const isMissingNatAttendanceColumnsError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('applications.time_in')
        || message.includes('applications.time_out')
        || message.includes('column time_in')
        || message.includes('column time_out');
};

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

    const courseCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};
    const dateTimeCounts: Record<string, number> = {};
    const { data: natRequirements, error: requirementsError } = await adminClient
        .from('nat_requirements')
        .select('name')
        .order('created_at', { ascending: true });
    if (requirementsError) throw requirementsError;

    for (const application of applications) {
        const courseName = String(application.priority_course || '').trim();
        const testDate = String(application.test_date || '').trim();
        const testTime = String(application.test_time || '').trim();
        if (courseName) courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        if (testDate) {
            dateCounts[testDate] = (dateCounts[testDate] || 0) + 1;
            if (supportsTestTime && testTime) {
                const key = `${testDate}|${testTime}`;
                dateTimeCounts[key] = (dateTimeCounts[key] || 0) + 1;
            }
        }
    }

    return json({
        success: true,
        supportsTestTime,
        courseCounts,
        dateCounts,
        dateTimeCounts,
        requirements: (natRequirements || []).map((row: any) => String(row?.name || '').trim()).filter(Boolean)
    });
};

const updateNatAttendance = async (adminClient: any, application: any, action: 'time-in' | 'time-out') => {
    const timestamp = new Date().toISOString();
    const updates = action === 'time-in'
        ? { time_in: timestamp, status: 'Ongoing' }
        : { time_out: timestamp, status: 'Test Taken' };
    const fallbackUpdates = action === 'time-in' ? { status: 'Ongoing' } : { status: 'Test Taken' };

    let { data: updatedApplication, error } = await adminClient
        .from('applications')
        .update(updates)
        .eq('id', application.id)
        .select('*')
        .single();
    if (error && isMissingNatAttendanceColumnsError(error)) {
        ({ data: updatedApplication, error } = await adminClient
            .from('applications')
            .update(fallbackUpdates)
            .eq('id', application.id)
            .select('*')
            .single());
    }
    if (error) throw error;
    return updatedApplication;
};

serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);

    try {
        const body = await request.json();
        const mode = String(body.mode || '').trim();
        if (mode === 'ping') return json({ success: true });

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
