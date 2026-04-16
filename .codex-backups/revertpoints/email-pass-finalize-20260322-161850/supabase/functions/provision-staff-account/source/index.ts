import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { safelySendTransactionalEmail } from '../../_shared/email.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const ALLOWED_ROLES = new Set(['Admin', 'Department Head', 'Care Staff']);

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const normalizeText = (value: unknown) => {
    const text = String(value || '').trim();
    return text || null;
};

const normalizeEmail = (value: unknown) => {
    const email = String(value || '').trim().toLowerCase();
    return email || null;
};

const isValidEmail = (value: string | null) =>
    Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

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

const createStaffAuthUser = async (
    adminClient: any,
    username: string,
    password: string,
    fullName: string | null,
    role: string,
    department: string | null,
    email: string | null
) => {
    const authEmail = email;
    const { data, error } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        app_metadata: {
            role,
            department
        },
        user_metadata: {
            username,
            full_name: fullName,
            contact_email: email
        }
    });

    if (error || !data?.user) {
        throw error || new Error('Failed to create staff auth account.');
    }

    return {
        user: data.user,
        authEmail
    };
};

const normalizeCreateAuthError = (error: any, email: string) => {
    const message = String(error?.message || error || '').toLowerCase();

    if (message.includes('already been registered')
        || message.includes('already exists')
        || message.includes('duplicate')) {
        return new Error(`A Supabase Auth account already exists for "${email}". Use a different email address.`);
    }

    return error instanceof Error
        ? error
        : new Error('Failed to create staff auth account.');
};

const isPasswordColumnRequiredError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('password')
        && (message.includes('null value')
            || message.includes('not-null')
            || message.includes('violates not-null constraint'));
};

const insertStaffAccount = async (
    adminClient: any,
    payload: Record<string, unknown>,
    password: string
) => {
    const publicColumns = 'id, username, role, department, email, auth_user_id';
    const nextPayload = { ...payload };

    let { data, error } = await adminClient
        .from('staff_accounts')
        .insert([nextPayload])
        .select(publicColumns)
        .single();

    if (error && isPasswordColumnRequiredError(error)) {
        ({ data, error } = await adminClient
            .from('staff_accounts')
            .insert([{
                ...nextPayload,
                password
            }])
            .select(publicColumns)
            .single());
    }

    if (error) throw error;
    return data;
};

serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    let createdAuthUserId: string | null = null;

    try {
        const body = await request.json();
        const adminClient = getAdminClient();

        const username = String(body.username || '').trim();
        const password = String(body.password || '');
        const fullName = normalizeText(body.full_name);
        const role = String(body.role || '').trim();
        const department = role === 'Department Head'
            ? normalizeText(body.department)
            : null;
        const email = normalizeEmail(body.email);

        if (!username || !password || !role || !email) {
            throw new Error('Username, password, role, and email are required.');
        }

        if (!ALLOWED_ROLES.has(role)) {
            throw new Error('Invalid staff role.');
        }

        if (!isValidEmail(email)) {
            throw new Error('A valid staff email address is required.');
        }

        if (role === 'Department Head' && !department) {
            throw new Error('Department is required for Department Head accounts.');
        }

        const { data: existingStaff, error: existingStaffError } = await adminClient
            .from('staff_accounts')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (existingStaffError) throw existingStaffError;
        if (existingStaff) {
            throw new Error('An account with this username already exists.');
        }

        const { user, authEmail } = await createStaffAuthUser(
            adminClient,
            username,
            password,
            fullName,
            role,
            department,
            email
        ).catch((error) => {
            throw normalizeCreateAuthError(error, email);
        });
        createdAuthUserId = user.id;

        const insertedStaff = await insertStaffAccount(
            adminClient,
            {
                username,
                full_name: fullName,
                role,
                department,
                email,
                auth_user_id: user.id
            },
            password
        );

        const emailResult = await safelySendTransactionalEmail({
            type: 'STAFF_ACCOUNT_CREATED',
            email,
            name: fullName || username,
            username,
            password,
            role,
            department
        });

        return json({
            success: true,
            account: insertedStaff,
            authEmail,
            ...emailResult
        });
    } catch (error) {
        if (createdAuthUserId) {
            const adminClient = getAdminClient();
            await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
        }

        const message = error instanceof Error ? error.message : 'Unexpected staff provisioning error.';
        return json({ success: false, error: message }, 400);
    }
});
