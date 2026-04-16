import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const STAFF_AUTH_DOMAIN = 'staff.norsu.local';

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

const buildStaffAuthEmail = (username: string) =>
    `${String(username || '').trim().toLowerCase()}@${STAFF_AUTH_DOMAIN}`;

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
    const authEmail = buildStaffAuthEmail(username);
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
        throw error || new Error('Failed to restore linked staff auth account.');
    }

    return data.user;
};

const isMissingAuthUserError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('user not found') || message.includes('not found');
};

const getStaffAccountById = async (adminClient: any, staffAccountId: string) => {
    const { data, error } = await adminClient
        .from('staff_accounts')
        .select('id, username, password, full_name, role, department, email, auth_user_id')
        .eq('id', staffAccountId)
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        throw new Error('Staff account not found.');
    }

    return data;
};

const restoreLinkedStaffAuthUser = async (adminClient: any, staffAccount: any) => {
    const password = String(staffAccount?.password || '');
    if (!password) {
        throw new Error('Failed to restore linked auth account because the staff password is unavailable.');
    }

    const restoredUser = await createStaffAuthUser(
        adminClient,
        String(staffAccount.username || '').trim(),
        password,
        normalizeText(staffAccount.full_name),
        String(staffAccount.role || '').trim(),
        normalizeText(staffAccount.department),
        normalizeText(staffAccount.email)
    );

    const { error: updateError } = await adminClient
        .from('staff_accounts')
        .update({ auth_user_id: restoredUser.id })
        .eq('id', staffAccount.id);

    if (updateError) {
        await adminClient.auth.admin.deleteUser(restoredUser.id).catch(() => null);
        throw updateError;
    }
};

const deleteStaffAccount = async (adminClient: any, staffAccount: any) => {
    let deletedLinkedAuth = false;

    if (staffAccount.auth_user_id) {
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(staffAccount.auth_user_id);
        if (deleteAuthError && !isMissingAuthUserError(deleteAuthError)) {
            throw deleteAuthError;
        }

        deletedLinkedAuth = !deleteAuthError;
    }

    const { error: deleteRowError } = await adminClient
        .from('staff_accounts')
        .delete()
        .eq('id', staffAccount.id);

    if (deleteRowError) {
        if (deletedLinkedAuth) {
            try {
                await restoreLinkedStaffAuthUser(adminClient, staffAccount);
            } catch (restoreError) {
                const restoreMessage = restoreError instanceof Error
                    ? restoreError.message
                    : 'Unknown auth restore error.';
                throw new Error(`Failed to delete the staff row, and the linked auth account could not be restored automatically. ${restoreMessage}`);
            }
        }

        throw deleteRowError;
    }

    return {
        deletedStaffAccountId: staffAccount.id,
        deletedLinkedAuth: Boolean(staffAccount.auth_user_id)
    };
};

const deleteAllStaffAccountsExcept = async (adminClient: any, preserveStaffAccountId: string) => {
    const { data: accounts, error } = await adminClient
        .from('staff_accounts')
        .select('id, username, password, full_name, role, department, email, auth_user_id')
        .neq('id', preserveStaffAccountId);

    if (error) throw error;

    let deletedCount = 0;
    let deletedLinkedCount = 0;

    for (const account of accounts || []) {
        const result = await deleteStaffAccount(adminClient, account);
        deletedCount += 1;
        if (result.deletedLinkedAuth) {
            deletedLinkedCount += 1;
        }
    }

    return {
        success: true,
        deletedCount,
        deletedLinkedCount,
        preservedStaffAccountId: preserveStaffAccountId
    };
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

        if (mode === 'delete-account') {
            const staffAccountId = String(body.staffAccountId || '').trim();
            if (!staffAccountId) {
                throw new Error('Staff account ID is required.');
            }

            const staffAccount = await getStaffAccountById(adminClient, staffAccountId);
            const result = await deleteStaffAccount(adminClient, staffAccount);

            return json({
                success: true,
                ...result
            });
        }

        if (mode === 'delete-all-except') {
            const preserveStaffAccountId = String(body.preserveStaffAccountId || '').trim();
            if (!preserveStaffAccountId) {
                throw new Error('Preserved staff account ID is required.');
            }

            return json(await deleteAllStaffAccountsExcept(adminClient, preserveStaffAccountId));
        }

        return json({ success: false, error: 'Unsupported staff management mode.' }, 400);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected staff cleanup error.';
        return json({ success: false, error: message }, 400);
    }
});
