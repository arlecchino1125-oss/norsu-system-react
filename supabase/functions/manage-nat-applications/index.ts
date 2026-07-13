import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { hashNatPassword, verifyNatPassword } from '../_shared/natPassword.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const INVALID_LOGIN_MESSAGE = 'Invalid credentials.';
const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check to continue.';
const LOGIN_FAILURE_DELAY_MS = 700;
const CAPTCHA_FAIL_THRESHOLD = 3;
const CAPTCHA_WINDOW_MS = 15 * 60 * 1000;

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const getAdminClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};

const sanitizeNatApplication = (application: Record<string, unknown>) => {
    const { password: _password, nat_password_hash: _natPasswordHash, ...safeApplication } = application;
    return safeApplication;
};

// CAPTCHA is enabled only when the Turnstile secret is configured; without it
// the login flow behaves exactly as before (attempts are still counted).
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

const captchaGateActive = (application: Record<string, unknown>) => {
    if (!turnstileSecret()) return false;
    const until = Date.parse(String(application?.captcha_required_until || ''));
    return Number.isFinite(until) && until > Date.now();
};

// Best-effort throttle bookkeeping: a failure here (e.g. migration not applied
// yet) must never block a legitimate login, so errors are reported, not thrown.
const recordFailedNatLogin = async (adminClient: any, application: any) => {
    const attempts = (Number(application?.failed_login_attempts) || 0) + 1;
    const updates: Record<string, unknown> = { failed_login_attempts: attempts };
    if (attempts >= CAPTCHA_FAIL_THRESHOLD) {
        updates.captcha_required_until = new Date(Date.now() + CAPTCHA_WINDOW_MS).toISOString();
    }
    const { error } = await adminClient.from('applications').update(updates).eq('id', application.id);
    if (error) {
        await captureEdgeException(error, { endpoint: 'manage-nat-applications', step: 'record-failed-login' });
        return Number(application?.failed_login_attempts) || 0;
    }
    return attempts;
};

const clearNatLoginThrottle = async (adminClient: any, application: any) => {
    if (!(Number(application?.failed_login_attempts) > 0) && !application?.captcha_required_until) return;
    const { error } = await adminClient
        .from('applications')
        .update({ failed_login_attempts: 0, captcha_required_until: null })
        .eq('id', application.id);
    if (error) {
        await captureEdgeException(error, { endpoint: 'manage-nat-applications', step: 'clear-login-throttle' });
    }
};

const isMissingNatAttendanceColumnsError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('applications.time_in')
        || message.includes('applications.time_out')
        || message.includes('column time_in')
        || message.includes('column time_out');
};

const isMissingTestTimeColumnError = (error: any) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('applications.test_time')
        || message.includes('column test_time');
};

const getNatApplicationByUsername = async (adminClient: any, username: string) => {
    const { data: application, error } = await adminClient
        .from('applications')
        .select('*')
        .ilike('username', username)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return application;
};

const requireNatApplication = async (
    adminClient: any,
    username: unknown,
    password: unknown,
    captchaToken: unknown
) => {
    const nextUsername = String(username || '').trim();
    const nextPassword = String(password || '').trim();

    if (!nextUsername || !nextPassword) {
        await delay(LOGIN_FAILURE_DELAY_MS);
        throw withStatus(INVALID_LOGIN_MESSAGE, 401);
    }

    const application = await getNatApplicationByUsername(adminClient, nextUsername);

    if (application && captchaGateActive(application)) {
        const token = String(captchaToken || '').trim();
        if (!token || !(await verifyTurnstileToken(token))) {
            throw withStatus(CAPTCHA_REQUIRED_MESSAGE, 403);
        }
    }

    const passwordCheck = application
        ? await verifyNatPassword(nextPassword, application.nat_password_hash)
        : { valid: false, needsUpgrade: false };

    if (!application || !passwordCheck.valid) {
        let captchaNowRequired = false;
        if (application) {
            const attempts = await recordFailedNatLogin(adminClient, application);
            captchaNowRequired = Boolean(turnstileSecret()) && attempts >= CAPTCHA_FAIL_THRESHOLD;
        }
        await delay(LOGIN_FAILURE_DELAY_MS);
        // 403 tells the client to render the CAPTCHA on its next attempt.
        throw withStatus(INVALID_LOGIN_MESSAGE, captchaNowRequired ? 403 : 401);
    }

    await clearNatLoginThrottle(adminClient, application);

    if (passwordCheck.needsUpgrade) {
        const { error } = await adminClient
            .from('applications')
            .update({ nat_password_hash: await hashNatPassword(nextPassword) })
            .eq('id', application.id);
        if (error) {
            await captureEdgeException(error, { endpoint: 'manage-nat-applications', step: 'password-hash-upgrade' });
        }
    }

    return application;
};

const loginNatApplicant = async (adminClient: any, username: unknown, password: unknown, captchaToken: unknown) => {
    const application = await requireNatApplication(adminClient, username, password, captchaToken);

    return json({
        success: true,
        application: sanitizeNatApplication(application)
    });
};

const getNatPublicStats = async (adminClient: any) => {
    let supportsTestTime = true;
    let applications: Array<Record<string, unknown>> = [];

    const withTime = await adminClient
        .from('applications')
        .select('priority_course, test_date, test_time');

    if (withTime.error) {
        if (isMissingTestTimeColumnError(withTime.error)) {
            supportsTestTime = false;
            const fallback = await adminClient
                .from('applications')
                .select('priority_course, test_date');

            if (fallback.error) {
                throw fallback.error;
            }

            applications = fallback.data || [];
        } else {
            throw withTime.error;
        }
    } else {
        applications = withTime.data || [];
    }

    const courseCounts: Record<string, number> = {};
    const dateCounts: Record<string, number> = {};
    const dateTimeCounts: Record<string, number> = {};
    const { data: natRequirements, error: natRequirementsError } = await adminClient
        .from('nat_requirements')
        .select('name')
        .order('created_at', { ascending: true });

    if (natRequirementsError) {
        throw natRequirementsError;
    }

    for (const application of applications) {
        const courseName = String(application.priority_course || '').trim();
        const testDate = String(application.test_date || '').trim();
        const testTime = String(application.test_time || '').trim();

        if (courseName) {
            courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        }

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
        requirements: (natRequirements || [])
            .map((row: any) => String(row?.name || '').trim())
            .filter(Boolean)
    });
};

const refreshNatSession = async (adminClient: any, username: unknown, password: unknown, captchaToken: unknown) => {
    const application = await requireNatApplication(adminClient, username, password, captchaToken);

    return json({
        success: true,
        application: sanitizeNatApplication(application)
    });
};

const updateNatAttendance = async (
    adminClient: any,
    username: unknown,
    password: unknown,
    captchaToken: unknown,
    action: 'time-in' | 'time-out'
) => {
    const application = await requireNatApplication(adminClient, username, password, captchaToken);
    const timestamp = new Date().toISOString();

    const updates = action === 'time-in'
        ? { time_in: timestamp, status: 'Ongoing' }
        : { time_out: timestamp, status: 'Test Taken' };
    const fallbackUpdates = action === 'time-in'
        ? { status: 'Ongoing' }
        : { status: 'Test Taken' };

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

    if (error) {
        throw error;
    }

    return json({
        success: true,
        application: sanitizeNatApplication(updatedApplication)
    });
};

serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        const body = await request.json();
        const adminClient = getAdminClient();
        const mode = String(body.mode || '').trim();

        if (mode === 'ping') {
            return json({ success: true });
        }

        if (mode === 'login') {
            return await loginNatApplicant(adminClient, body.username, body.password, body.captchaToken);
        }

        if (mode === 'public-stats') {
            return await getNatPublicStats(adminClient);
        }

        if (mode === 'session') {
            return await refreshNatSession(adminClient, body.username, body.password, body.captchaToken);
        }

        if (mode === 'time-in') {
            return await updateNatAttendance(adminClient, body.username, body.password, body.captchaToken, 'time-in');
        }

        if (mode === 'time-out') {
            return await updateNatAttendance(adminClient, body.username, body.password, body.captchaToken, 'time-out');
        }

        return json({ success: false, error: 'Unsupported NAT management mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-nat-applications' });
        const message = error instanceof Error ? error.message : 'Unexpected NAT management error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
