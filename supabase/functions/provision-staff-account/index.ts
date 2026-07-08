import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { captureEdgeException } from '../_shared/sentry.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const ALLOWED_ROLES = new Set(['Admin', 'Department Head', 'Care Staff', 'Registrar']);

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

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const getBearerTokenFromHeader = (value: string | null) => {
    const headerValue = String(value || '').trim();
    if (!headerValue.toLowerCase().startsWith('bearer ')) {
        return null;
    }

    const token = headerValue.slice('Bearer '.length).trim();
    return token || null;
};

const getRequestAuthUser = async (adminClient: any, request: Request) => {
    const accessToken = getBearerTokenFromHeader(
        request.headers.get('x-supabase-auth')
        || request.headers.get('x-client-authorization')
        || request.headers.get('Authorization')
    );
    if (!accessToken) {
        throw withStatus('Missing authenticated session.', 401);
    }

    const { data, error } = await adminClient.auth.getUser(accessToken);
    if (error || !data?.user) {
        throw withStatus('Unable to verify the current user.', 401);
    }

    return data.user;
};

const assertAdminRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);

    const { data: staffAccount, error } = await adminClient
        .from('staff_accounts')
        .select('role')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (String(staffAccount?.role || '').trim() !== 'Admin') {
        throw withStatus('Admin privileges are required for this action.', 403);
    }

    return authUser;
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

        await assertAdminRequest(adminClient, request);

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

        const emailPayload = {
            type: 'STAFF_ACCOUNT_CREATED',
            email,
            name: fullName || username,
            username,
            password,
            role,
            department
        };

        return json({
            success: true,
            account: insertedStaff,
            authEmail,
            emailPayload
        });
    } catch (error) {
        if (createdAuthUserId) {
            const adminClient = getAdminClient();
            await adminClient.auth.admin.deleteUser(createdAuthUserId).catch(() => null);
        }

        await captureEdgeException(error, { endpoint: 'provision-staff-account' });
        const message = error instanceof Error ? error.message : 'Unexpected staff provisioning error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});