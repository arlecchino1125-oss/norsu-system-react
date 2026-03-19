import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

const isMissingAuthUserError = (error: any) => {
    const message = String(error?.message || error || '').toLowerCase();
    return message.includes('user not found') || message.includes('not found');
};

const deleteAllStudents = async (adminClient: any) => {
    const { data: students, error: studentsError } = await adminClient
        .from('students')
        .select('id, student_id, auth_user_id');

    if (studentsError) throw studentsError;

    let deletedLinkedAuthCount = 0;
    let missingLinkedAuthCount = 0;

    for (const student of students || []) {
        if (!student.auth_user_id) continue;

        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(student.auth_user_id);
        if (deleteAuthError) {
            if (isMissingAuthUserError(deleteAuthError)) {
                missingLinkedAuthCount += 1;
                continue;
            }

            throw deleteAuthError;
        }

        deletedLinkedAuthCount += 1;
    }

    const { error: deleteStudentsError } = await adminClient
        .from('students')
        .delete()
        .not('id', 'is', null);

    if (deleteStudentsError) throw deleteStudentsError;

    return {
        success: true,
        deletedStudentCount: (students || []).length,
        deletedLinkedAuthCount,
        missingLinkedAuthCount
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

        if (mode === 'delete-all-students') {
            return json(await deleteAllStudents(adminClient));
        }

        return json({ success: false, error: 'Unsupported student management mode.' }, 400);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected student cleanup error.';
        return json({ success: false, error: message }, 400);
    }
});
