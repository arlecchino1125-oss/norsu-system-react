import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts'; // claude

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

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

const normalizeEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

const resolveStaffLogin = async (adminClient: any, username: unknown) => {
    const nextUsername = String(username || '').trim();
    if (!nextUsername) {
        return json({ success: false, error: 'Username is required.' }, 400);
    }

    // claude — ponytail: return only the email — the sole field the client needs to
    // authenticate. role/auth_user_id are resolved post-auth from the session, so
    // handing them to unauthenticated callers is pure enumeration/leak surface.
    const { data, error } = await adminClient
        .from('staff_accounts')
        .select('email')
        .eq('username', nextUsername)
        .maybeSingle();

    if (error) {
        throw error;
    }

    const email = data ? normalizeEmail(data.email) : null;
    return json({
        success: true,
        account: email ? { email } : null
    });
};

const resolveStudentLogin = async (adminClient: any, studentId: unknown, email: unknown) => {
    const nextStudentId = String(studentId || '').trim();
    const nextEmail = normalizeEmail(email);

    if (!nextStudentId && !nextEmail) {
        return json({ success: false, error: 'Student ID or email is required.' }, 400);
    }

    // claude — ponytail: email-only, same as staff — status/auth_user_id are post-auth concerns.
    let query = adminClient
        .from('students')
        .select('email');

    if (nextEmail) {
        query = query.ilike('email', nextEmail);
    } else {
        query = query.eq('student_id', nextStudentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        throw error;
    }

    const resolvedEmail = data ? normalizeEmail(data.email) : null;
    return json({
        success: true,
        account: resolvedEmail ? { email: resolvedEmail } : null
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
        const mode = String(body.mode || '').trim();

        if (mode === 'ping') {
            return json({ success: true });
        }

        // claude — ponytail: per-IP throttle (100 / 5 min) via the shared limiter — blocks bulk
        // username enumeration against this public resolver while staying generous
        // enough for a shared campus-wifi/CGNAT login rush. The constant identifier
        // seed keys the bucket on client IP only (the anon-key bearer token is
        // identical for every unauthenticated caller, so the default token-based key
        // would collapse the whole app into one bucket). Password brute-force is
        // handled separately by Supabase's own /auth/v1/token limits. Raise the cap if
        // legit users hit 429s; add Turnstile if an attacker rotates IPs past this.
        const rateLimited = await enforceRateLimit(request, {
            endpoint: 'resolve-auth-login',
            action: mode,
            identifier: 'per-ip',
            maxRequests: 100,
            windowSeconds: 300,
            message: 'Too many login attempts. Please wait a few minutes and try again.',
            corsHeaders
        });
        if (rateLimited) {
            return rateLimited;
        }

        const adminClient = getAdminClient();

        if (mode === 'resolve-staff-login') {
            return await resolveStaffLogin(adminClient, body.username);
        }

        if (mode === 'resolve-student-login') {
            return await resolveStudentLogin(adminClient, body.studentId, body.email);
        }

        return json({ success: false, error: 'Unsupported auth login resolver mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'resolve-auth-login' });
        const message = error instanceof Error ? error.message : 'Unexpected auth login resolver error.';
        return json({ success: false, error: message }, 400);
    }
});
