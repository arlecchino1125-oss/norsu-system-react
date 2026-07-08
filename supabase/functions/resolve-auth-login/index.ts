import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';

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

    const { data, error } = await adminClient
        .from('staff_accounts')
        .select('username, role, auth_user_id, email')
        .eq('username', nextUsername)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return json({
        success: true,
        account: data
            ? {
                username: data.username,
                role: data.role,
                auth_user_id: data.auth_user_id ? String(data.auth_user_id) : null,
                email: normalizeEmail(data.email)
            }
            : null
    });
};

const resolveStudentLogin = async (adminClient: any, studentId: unknown, email: unknown) => {
    const nextStudentId = String(studentId || '').trim();
    const nextEmail = normalizeEmail(email);

    if (!nextStudentId && !nextEmail) {
        return json({ success: false, error: 'Student ID or email is required.' }, 400);
    }

    let query = adminClient
        .from('students')
        .select('student_id, auth_user_id, status, email');
        
    if (nextEmail) {
        query = query.ilike('email', nextEmail);
    } else {
        query = query.eq('student_id', nextStudentId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        throw error;
    }

    return json({
        success: true,
        account: data
            ? {
                student_id: data.student_id,
                status: data.status,
                auth_user_id: data.auth_user_id ? String(data.auth_user_id) : null,
                email: normalizeEmail(data.email)
            }
            : null
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
