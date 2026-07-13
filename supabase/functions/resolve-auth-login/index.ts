import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { enforceRateLimit } from '../_shared/rateLimit.ts';
import { handleAuthLogin } from './handler.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

const normalizeEmail = (value: unknown) => String(value || '').trim().toLowerCase();

serve(async (request) => {
    if (request.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    if (request.method !== 'POST') {
        return json({ success: false, error: 'Method not allowed.' }, 405);
    }

    try {
        const body = await request.clone().json();
        const mode = String(body.mode || '').trim();
        if (mode === 'ping') return json({ success: true });

        const rateLimited = await enforceRateLimit(request, {
            endpoint: 'resolve-auth-login',
            action: mode,
            identifier: 'per-ip',
            maxRequests: 100,
            windowSeconds: 300,
            message: 'Too many login attempts. Please wait a few minutes and try again.',
            corsHeaders
        });
        if (rateLimited) return rateLimited;

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            throw new Error('Missing Supabase authentication configuration.');
        }

        const authOptions = { auth: { autoRefreshToken: false, persistSession: false } };
        const adminClient = createClient(supabaseUrl, serviceRoleKey, authOptions);
        const authClient = createClient(supabaseUrl, anonKey, authOptions);

        return await handleAuthLogin(request, {
            responseHeaders: corsHeaders,
            dummyEmail: 'invalid-login@invalid.example',
            findStaff: async (username) => {
                const { data, error } = await adminClient
                    .from('staff_accounts')
                    .select('email, auth_user_id, role, is_archived')
                    .eq('username', username)
                    .maybeSingle();
                if (error) throw error;
                return data ? {
                    email: normalizeEmail(data.email) || null,
                    authUserId: data.auth_user_id,
                    role: data.role,
                    isArchived: Boolean(data.is_archived)
                } : null;
            },
            findStudent: async ({ studentId, email }) => {
                let query = adminClient
                    .from('students')
                    .select('email, auth_user_id, status, is_archived');
                query = email ? query.ilike('email', email) : query.eq('student_id', studentId);
                const { data, error } = await query.maybeSingle();
                if (error) throw error;
                return data ? {
                    email: normalizeEmail(data.email) || null,
                    authUserId: data.auth_user_id,
                    status: data.status,
                    isArchived: Boolean(data.is_archived)
                } : null;
            },
            authenticate: async (email, password) => {
                const { data, error } = await authClient.auth.signInWithPassword({ email, password });
                if (error || !data.session || !data.user) return null;
                return { session: data.session, user: data.user };
            },
            revokeSession: async () => {
                await authClient.auth.signOut({ scope: 'local' });
            }
        });
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'resolve-auth-login' });
        return json({ success: false, error: 'Unable to sign in right now. Please try again.' }, 500);
    }
});
