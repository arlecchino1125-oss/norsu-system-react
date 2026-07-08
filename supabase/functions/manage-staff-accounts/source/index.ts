import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../../_shared/sentry.ts';
import {
    buildOtpExpiryTimestamp,
    generateOtpCode,
    getOtpExpiryMinutes,
    hashOtpCode,
    isValidEmail,
    maskEmailAddress,
    normalizeEmail,
    sendSecurityOtpEmail
} from '../../_shared/securityOtp.ts';
import { sanitizePlainText } from '../../_shared/plainText.ts';
import {
    getStudentActivationPolicy,
    updateStudentActivationPolicy
} from '../../_shared/studentActivationPolicy.ts';
import { enforceRateLimit } from '../../_shared/rateLimit.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
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

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

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

const normalizeAuthUpdateError = (error: any, email: string) => {
    const message = String(error?.message || error || '').toLowerCase();

    if (message.includes('already been registered')
        || message.includes('already exists')
        || message.includes('duplicate')) {
        return new Error(`The email "${email}" is already being used by another auth account.`);
    }

    return error instanceof Error
        ? error
        : new Error('Failed to sync the staff auth email.');
};

const buildStaffAuthUpdatePayload = (staffAccount: any, email: string) => ({
    email,
    email_confirm: true,
    app_metadata: {
        role: staffAccount.role,
        department: staffAccount.department || null
    },
    user_metadata: {
        username: staffAccount.username,
        full_name: staffAccount.full_name || null,
        contact_email: email
    }
});

const parseSecurityOtpPurpose = (value: unknown): 'password_change' | 'email_change' => {
    const purpose = String(value || '').trim();
    if (purpose === 'password_change' || purpose === 'email_change') {
        return purpose;
    }

    throw withStatus('Unsupported security OTP purpose.', 400);
};

const normalizeStaffFullName = (value: unknown) => sanitizePlainText(value, { maxLength: 120 });

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

const getLinkedStaffForRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);

    const { data: staffAccount, error } = await adminClient
        .from('staff_accounts')
        .select('id, username, full_name, role, department, email, auth_user_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (!staffAccount?.username) {
        throw new Error('Only linked staff accounts can perform this action.');
    }

    return {
        authUser,
        staffAccount
    };
};

const assertStudentActivationPolicyManager = async (adminClient: any, request: Request) => {
    const { authUser, staffAccount } = await getLinkedStaffForRequest(adminClient, request);
    const role = String(staffAccount.role || '').trim();

    if (role !== 'Admin' && role !== 'Care Staff') {
        throw withStatus('CARE Staff or Admin privileges are required for this action.', 403);
    }

    return {
        authUser,
        staffAccount
    };
};

const createStaffSecurityOtp = async (
    adminClient: any,
    authUserId: string,
    purpose: 'password_change' | 'email_change',
    targetEmail: string
) => {
    const otp = generateOtpCode();
    const otpHash = await hashOtpCode(otp);

    await adminClient
        .from('security_change_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('auth_user_id', authUserId)
        .eq('account_type', 'staff')
        .eq('purpose', purpose)
        .is('consumed_at', null);

    const { error } = await adminClient
        .from('security_change_otps')
        .insert({
            auth_user_id: authUserId,
            account_type: 'staff',
            purpose,
            target_email: targetEmail,
            otp_hash: otpHash,
            expires_at: buildOtpExpiryTimestamp(),
        });

    if (error) throw error;
    return otp;
};

const consumeStaffSecurityOtp = async (
    adminClient: any,
    authUserId: string,
    purpose: 'password_change' | 'email_change',
    otp: string,
    targetEmail?: string | null
) => {
    const normalizedOtp = String(otp || '').trim();
    if (!normalizedOtp) {
        throw withStatus('OTP is required.', 400);
    }

    const { data: otpRows, error } = await adminClient
        .from('security_change_otps')
        .select('id, otp_hash, target_email, expires_at, consumed_at, attempt_count')
        .eq('auth_user_id', authUserId)
        .eq('account_type', 'staff')
        .eq('purpose', purpose)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) throw error;

    const record = otpRows?.[0];
    if (!record) {
        throw withStatus('No active OTP request found. Request a new code first.', 404);
    }

    if (targetEmail && normalizeEmail(record.target_email) !== normalizeEmail(targetEmail)) {
        throw withStatus('This OTP was issued for a different email address.', 409);
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
        throw withStatus('This OTP has expired. Request a new code first.', 410);
    }

    const otpHash = await hashOtpCode(normalizedOtp);
    if (otpHash !== String(record.otp_hash || '')) {
        await adminClient
            .from('security_change_otps')
            .update({
                attempt_count: Number(record.attempt_count || 0) + 1,
                last_attempt_at: new Date().toISOString()
            })
            .eq('id', record.id);
        throw withStatus('Invalid OTP.', 401);
    }

    const consumedAt = new Date().toISOString();
    const { error: consumeError } = await adminClient
        .from('security_change_otps')
        .update({
            consumed_at: consumedAt,
            last_attempt_at: consumedAt
        })
        .eq('id', record.id);

    if (consumeError) throw consumeError;
    return record;
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

const syncStaffAuthEmail = async (adminClient: any, request: Request, nextEmail: string | null) => {
    const normalizedEmail = normalizeEmail(nextEmail);
    if (!isValidEmail(normalizedEmail)) {
        throw new Error('A valid email address is required.');
    }

    const authUser = await getRequestAuthUser(adminClient, request);

    const { data: staffAccount, error: staffError } = await adminClient
        .from('staff_accounts')
        .select('username, full_name, role, department, email, auth_user_id')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (staffError) throw staffError;
    if (!staffAccount?.username) {
        throw new Error('Only linked staff accounts can sync their auth email.');
    }

    const currentEmail = normalizeEmail(staffAccount.email);
    if (currentEmail === normalizedEmail
        && String(authUser.email || '').trim().toLowerCase() === normalizedEmail) {
        return {
            success: true,
            username: staffAccount.username,
            email: normalizedEmail,
            updated: false
        };
    }

    const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        buildStaffAuthUpdatePayload(staffAccount, normalizedEmail)
    );

    if (authError || !updatedUser?.user) {
        throw normalizeAuthUpdateError(authError || new Error('Failed to update the linked auth email.'), normalizedEmail);
    }

    const { error: updateStaffError } = await adminClient
        .from('staff_accounts')
        .update({ email: normalizedEmail })
        .eq('auth_user_id', authUser.id);

    if (updateStaffError) throw updateStaffError;

    return {
        success: true,
        username: staffAccount.username,
        email: normalizedEmail,
        updated: true
    };
};

const requestStaffSecurityOtp = async (
    adminClient: any,
    request: Request,
    purpose: 'password_change' | 'email_change',
    nextEmailValue?: unknown
) => {
    const { authUser, staffAccount } = await getLinkedStaffForRequest(adminClient, request);
    const currentEmail = normalizeEmail(authUser.email) || normalizeEmail(staffAccount.email);
    const targetEmail = purpose === 'email_change'
        ? normalizeEmail(nextEmailValue)
        : currentEmail;

    if (!isValidEmail(targetEmail)) {
        throw new Error('A valid email address is required.');
    }

    if (purpose === 'email_change' && targetEmail === currentEmail) {
        throw new Error('Enter a different email address to continue.');
    }

    const otp = await createStaffSecurityOtp(adminClient, authUser.id, purpose, targetEmail!);
    await sendSecurityOtpEmail({
        recipientEmail: targetEmail!,
        recipientName: staffAccount.full_name || staffAccount.username,
        otp,
        purpose
    });

    return {
        success: true,
        purpose,
        maskedEmail: maskEmailAddress(targetEmail!),
        expiresInMinutes: getOtpExpiryMinutes()
    };
};

const confirmStaffPasswordChange = async (
    adminClient: any,
    request: Request,
    otp: unknown,
    nextPasswordValue: unknown
) => {
    const { authUser } = await getLinkedStaffForRequest(adminClient, request);
    const nextPassword = String(nextPasswordValue || '');
    if (nextPassword.length < 8) {
        throw new Error('Password must be at least 8 characters.');
    }

    await consumeStaffSecurityOtp(adminClient, authUser.id, 'password_change', String(otp || ''));

    const { data, error } = await adminClient.auth.admin.updateUserById(authUser.id, {
        password: nextPassword
    });

    if (error || !data?.user) {
        throw error || new Error('Failed to update the staff password.');
    }

    return {
        success: true,
        passwordUpdated: true
    };
};

const confirmStaffEmailChange = async (
    adminClient: any,
    request: Request,
    otp: unknown,
    nextEmailValue: unknown
) => {
    const normalizedEmail = normalizeEmail(nextEmailValue);
    if (!isValidEmail(normalizedEmail)) {
        throw new Error('A valid email address is required.');
    }

    const { authUser, staffAccount } = await getLinkedStaffForRequest(adminClient, request);
    await consumeStaffSecurityOtp(adminClient, authUser.id, 'email_change', String(otp || ''), normalizedEmail);

    const currentEmail = normalizeEmail(staffAccount.email);
    if (currentEmail === normalizedEmail
        && normalizeEmail(authUser.email) === normalizedEmail) {
        return {
            success: true,
            username: staffAccount.username,
            email: normalizedEmail,
            updated: false
        };
    }

    const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
        authUser.id,
        buildStaffAuthUpdatePayload(staffAccount, normalizedEmail!)
    );

    if (authError || !updatedUser?.user) {
        throw normalizeAuthUpdateError(authError || new Error('Failed to update the linked auth email.'), normalizedEmail!);
    }

    const { error: updateStaffError } = await adminClient
        .from('staff_accounts')
        .update({ email: normalizedEmail })
        .eq('auth_user_id', authUser.id);

    if (updateStaffError) throw updateStaffError;

    return {
        success: true,
        username: staffAccount.username,
        email: normalizedEmail,
        updated: true
    };
};

const updateCurrentStaffProfile = async (
    adminClient: any,
    request: Request,
    payload: Record<string, unknown>
) => {
    const { authUser, staffAccount } = await getLinkedStaffForRequest(adminClient, request);
    const nextFullName = normalizeStaffFullName(payload.full_name);

    if (!nextFullName || nextFullName.length < 2) {
        throw new Error('A valid profile name is required.');
    }

    const { error: updateStaffError } = await adminClient
        .from('staff_accounts')
        .update({ full_name: nextFullName })
        .eq('auth_user_id', authUser.id);

    if (updateStaffError) throw updateStaffError;

    const currentEmail = normalizeEmail(authUser.email) || normalizeEmail(staffAccount.email);
    const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
            username: staffAccount.username,
            full_name: nextFullName,
            contact_email: currentEmail
        }
    });

    if (authError || !updatedUser?.user) {
        throw authError || new Error('Failed to update the linked auth profile.');
    }

    return {
        success: true,
        username: staffAccount.username,
        full_name: nextFullName,
        updated: true
    };
};

const readStudentActivationPolicy = async (adminClient: any) => {
    const policy = await getStudentActivationPolicy(adminClient);
    return {
        success: true,
        requireEnrollmentKey: policy.requireEnrollmentKey,
        updatedAt: policy.updatedAt,
        updatedBy: policy.updatedBy
    };
};

const writeStudentActivationPolicy = async (
    adminClient: any,
    request: Request,
    requireEnrollmentKeyValue: unknown
) => {
    if (typeof requireEnrollmentKeyValue !== 'boolean') {
        throw withStatus('The student activation policy flag must be true or false.', 400);
    }

    const { authUser } = await assertStudentActivationPolicyManager(adminClient, request);
    const policy = await updateStudentActivationPolicy(adminClient, requireEnrollmentKeyValue, authUser.id);

    return {
        success: true,
        requireEnrollmentKey: policy.requireEnrollmentKey,
        updatedAt: policy.updatedAt,
        updatedBy: policy.updatedBy
    };
};

const adminUpdateStaffAccountEmail = async (
    adminClient: any,
    request: Request,
    staffAccountId: string,
    nextEmail: string | null
) => {
    await assertAdminRequest(adminClient, request);

    const normalizedEmail = normalizeEmail(nextEmail);
    if (!isValidEmail(normalizedEmail)) {
        throw new Error('A valid email address is required.');
    }

    const staffAccount = await getStaffAccountById(adminClient, staffAccountId);
    const currentEmail = normalizeEmail(staffAccount.email);
    let authUpdated = false;
    let warning: string | null = null;

    if (staffAccount.auth_user_id) {
        const { data: authLookup, error: authLookupError } = await adminClient.auth.admin.getUserById(staffAccount.auth_user_id);

        if (authLookupError || !authLookup?.user) {
            if (isMissingAuthUserError(authLookupError)) {
                warning = 'The linked Supabase Auth user was not found. The staff row email was still updated.';
            } else {
                throw authLookupError || new Error('Unable to load the linked auth user.');
            }
        } else if (normalizeEmail(authLookup.user.email) !== normalizedEmail) {
            const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
                staffAccount.auth_user_id,
                buildStaffAuthUpdatePayload(staffAccount, normalizedEmail)
            );

            if (authError || !updatedUser?.user) {
                throw normalizeAuthUpdateError(authError || new Error('Failed to update the linked auth email.'), normalizedEmail);
            }

            authUpdated = true;
        }
    }

    if (currentEmail !== normalizedEmail) {
        const { error: updateStaffError } = await adminClient
            .from('staff_accounts')
            .update({ email: normalizedEmail })
            .eq('id', staffAccount.id);

        if (updateStaffError) throw updateStaffError;
    }

    return {
        success: true,
        staffAccountId: staffAccount.id,
        username: staffAccount.username,
        email: normalizedEmail,
        updated: currentEmail !== normalizedEmail || authUpdated,
        authUpdated,
        warning
    };
};

// The college is only set at account-creation time today; this lets Admin fix a
// Department Head's college afterward without archiving and recreating the account.
const adminUpdateStaffAccountDepartment = async (
    adminClient: any,
    request: Request,
    staffAccountId: string,
    nextDepartment: unknown
) => {
    await assertAdminRequest(adminClient, request);

    const staffAccount = await getStaffAccountById(adminClient, staffAccountId);
    if (staffAccount.role !== 'Department Head') {
        throw withStatus('Only Department Head accounts have a college assignment.', 400);
    }

    const normalizedDepartment = String(nextDepartment || '').trim();
    if (!normalizedDepartment) {
        throw new Error('A college is required for Department Head accounts.');
    }

    if (staffAccount.auth_user_id) {
        const { data: authLookup, error: authLookupError } = await adminClient.auth.admin.getUserById(staffAccount.auth_user_id);

        if (authLookupError || !authLookup?.user) {
            if (!isMissingAuthUserError(authLookupError)) {
                throw authLookupError || new Error('Unable to load the linked auth user.');
            }
        } else {
            const { error: authError } = await adminClient.auth.admin.updateUserById(staffAccount.auth_user_id, {
                app_metadata: {
                    role: staffAccount.role,
                    department: normalizedDepartment
                }
            });

            if (authError) throw authError;
        }
    }

    const { error: updateStaffError } = await adminClient
        .from('staff_accounts')
        .update({ department: normalizedDepartment })
        .eq('id', staffAccount.id);

    if (updateStaffError) throw updateStaffError;

    return {
        success: true,
        staffAccountId: staffAccount.id,
        department: normalizedDepartment
    };
};

const syncAllStaffAuthEmails = async (adminClient: any, request: Request) => {
    await assertAdminRequest(adminClient, request);

    const { data: staffAccounts, error } = await adminClient
        .from('staff_accounts')
        .select('id, username, full_name, role, department, email, auth_user_id')
        .not('auth_user_id', 'is', null);

    if (error) throw error;

    let updatedCount = 0;
    let alreadySyncedCount = 0;
    let missingLinkedAuthCount = 0;
    let invalidEmailCount = 0;
    const warnings: string[] = [];

    for (const staffAccount of staffAccounts || []) {
        const normalizedEmail = normalizeEmail(staffAccount.email);
        if (!staffAccount.auth_user_id) {
            continue;
        }

        if (!isValidEmail(normalizedEmail)) {
            invalidEmailCount += 1;
            warnings.push(`${staffAccount.username}: missing or invalid email on staff_accounts row.`);
            continue;
        }

        const { data: authLookup, error: authLookupError } = await adminClient.auth.admin.getUserById(staffAccount.auth_user_id);
        if (authLookupError || !authLookup?.user) {
            if (isMissingAuthUserError(authLookupError)) {
                missingLinkedAuthCount += 1;
                warnings.push(`${staffAccount.username}: linked auth user was not found.`);
                continue;
            }

            throw authLookupError || new Error(`Unable to load linked auth user for ${staffAccount.username}.`);
        }

        const authEmail = normalizeEmail(authLookup.user.email);
        if (authEmail === normalizedEmail) {
            alreadySyncedCount += 1;
            continue;
        }

        const { data: updatedUser, error: authError } = await adminClient.auth.admin.updateUserById(
            staffAccount.auth_user_id,
            buildStaffAuthUpdatePayload(staffAccount, normalizedEmail)
        );

        if (authError || !updatedUser?.user) {
            warnings.push(`${staffAccount.username}: ${normalizeAuthUpdateError(authError || new Error('Failed to update linked auth email.'), normalizedEmail).message}`);
            continue;
        }

        const { error: updateStaffError } = await adminClient
            .from('staff_accounts')
            .update({ email: normalizedEmail })
            .eq('id', staffAccount.id);

        if (updateStaffError) {
            throw updateStaffError;
        }

        updatedCount += 1;
    }

    return {
        success: true,
        updatedCount,
        alreadySyncedCount,
        missingLinkedAuthCount,
        invalidEmailCount,
        warnings
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

        if (mode === 'get-student-activation-policy') {
            return json(await readStudentActivationPolicy(adminClient));
        }

        if (mode === 'delete-account') {
            await assertAdminRequest(adminClient, request);
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

        if (mode === 'sync-auth-email') {
            return json(await syncStaffAuthEmail(adminClient, request, body.email));
        }

        if (mode === 'request-security-otp') {
            const purpose = parseSecurityOtpPurpose(body.purpose);
            const rateLimitResponse = await enforceRateLimit(request, {
                endpoint: 'manage-staff-accounts',
                action: `request-otp-${purpose}`,
                maxRequests: 3,
                windowSeconds: 15 * 60,
                message: 'You have requested too many OTPs. Please wait 15 minutes before trying again.',
                corsHeaders
            });
            if (rateLimitResponse) return rateLimitResponse;

            return json(await requestStaffSecurityOtp(adminClient, request, purpose, body.email));
        }

        if (mode === 'confirm-password-change') {
            return json(await confirmStaffPasswordChange(adminClient, request, body.otp, body.password));
        }

        if (mode === 'confirm-email-change') {
            return json(await confirmStaffEmailChange(adminClient, request, body.otp, body.email));
        }

        if (mode === 'sync-all-auth-emails') {
            return json(await syncAllStaffAuthEmails(adminClient, request));
        }

        if (mode === 'update-account-email') {
            const staffAccountId = String(body.staffAccountId || '').trim();
            if (!staffAccountId) {
                throw new Error('Staff account ID is required.');
            }

            return json(await adminUpdateStaffAccountEmail(adminClient, request, staffAccountId, body.email));
        }

        if (mode === 'update-account-department') {
            const staffAccountId = String(body.staffAccountId || '').trim();
            if (!staffAccountId) {
                throw new Error('Staff account ID is required.');
            }

            return json(await adminUpdateStaffAccountDepartment(adminClient, request, staffAccountId, body.department));
        }

        if (mode === 'update-self-profile') {
            return json(await updateCurrentStaffProfile(adminClient, request, body.payload || {}));
        }

        if (mode === 'update-student-activation-policy') {
            return json(await writeStudentActivationPolicy(adminClient, request, body.requireEnrollmentKey));
        }

        return json({ success: false, error: 'Unsupported staff management mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-staff-accounts' });
        const message = error instanceof Error ? error.message : 'Unexpected staff cleanup error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
