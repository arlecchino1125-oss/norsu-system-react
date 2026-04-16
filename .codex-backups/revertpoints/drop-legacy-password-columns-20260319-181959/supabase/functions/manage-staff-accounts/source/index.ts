import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const STAFF_ACCOUNT_SELECT = 'id, username, full_name, role, department, email, auth_user_id';

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
        }
    });

const isMissingAuthUserError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('user not found') || message.includes('not found');
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

const getStaffAccountById = async (adminClient: any, staffAccountId: string) => {
    const { data, error } = await adminClient
        .from('staff_accounts')
        .select(STAFF_ACCOUNT_SELECT)
        .eq('id', staffAccountId)
        .maybeSingle();

    if (error) throw error;
    if (!data) {
        throw new Error('Staff account not found.');
    }

    return data;
};

const cleanupLinkedAuthUser = async (adminClient: any, authUserId: string | null) => {
    if (!authUserId) {
        return {
            deletedLinkedAuth: false,
            missingLinkedAuth: false,
            authCleanupWarning: null
        };
    }

    const { error } = await adminClient.auth.admin.deleteUser(authUserId);
    if (!error) {
        return {
            deletedLinkedAuth: true,
            missingLinkedAuth: false,
            authCleanupWarning: null
        };
    }

    if (isMissingAuthUserError(error)) {
        return {
            deletedLinkedAuth: false,
            missingLinkedAuth: true,
            authCleanupWarning: null
        };
    }

    return {
        deletedLinkedAuth: false,
        missingLinkedAuth: false,
        authCleanupWarning: error instanceof Error ? error.message : String(error || 'Unknown auth cleanup error.')
    };
};

const deleteStaffAccount = async (adminClient: any, staffAccount: any) => {
    const { error: deleteRowError } = await adminClient
        .from('staff_accounts')
        .delete()
        .eq('id', staffAccount.id);

    if (deleteRowError) throw deleteRowError;

    const authCleanup = await cleanupLinkedAuthUser(
        adminClient,
        staffAccount.auth_user_id ? String(staffAccount.auth_user_id) : null
    );

    return {
        deletedStaffAccountId: staffAccount.id,
        ...authCleanup
    };
};

const deleteAllStaffAccountsExcept = async (adminClient: any, preserveStaffAccountId: string) => {
    const { data: accounts, error } = await adminClient
        .from('staff_accounts')
        .select(STAFF_ACCOUNT_SELECT)
        .neq('id', preserveStaffAccountId);

    if (error) throw error;

    let deletedCount = 0;
    let deletedLinkedCount = 0;
    let missingLinkedAuthCount = 0;
    const authCleanupWarnings: string[] = [];

    for (const account of accounts || []) {
        const result = await deleteStaffAccount(adminClient, account);
        deletedCount += 1;
        if (result.deletedLinkedAuth) {
            deletedLinkedCount += 1;
        }
        if (result.missingLinkedAuth) {
            missingLinkedAuthCount += 1;
        }
        if (result.authCleanupWarning) {
            authCleanupWarnings.push(
                `${account.username || account.id}: ${result.authCleanupWarning}`
            );
        }
    }

    return {
        success: true,
        deletedCount,
        deletedLinkedCount,
        missingLinkedAuthCount,
        authCleanupWarnings,
        preservedStaffAccountId
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
