import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { getStudentEmailTarget } from './studentEmailTarget.ts';
import { requirePermission } from './permissionCheck.ts';
import { sanitizePlainText } from './plainText.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { writeStaffAuditLog } from './staffAuditLog.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const CARE_SCHEDULABLE_COUNSELING_STATUSES = ['Referred', 'Pending'];
const CARE_COMPLETABLE_COUNSELING_STATUSES = ['Scheduled', 'Staff_Scheduled'];
const CARE_FORWARDABLE_SUPPORT_STATUSES = ['Submitted'];
const CARE_COMPLETABLE_SUPPORT_STATUSES = ['Approved', 'Rejected', 'Resolved by Dept', 'Referred to CARE'];

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

const getServiceRoleKey = () => {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return serviceRoleKey;
};

const getAdminClient = () => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = getServiceRoleKey();

    if (!supabaseUrl) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
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

const assertCareStaffRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);
    const { data: staffAccount, error } = await adminClient
        .from('staff_accounts')
        .select('id, role, department, full_name, username')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (!staffAccount?.id) {
        throw withStatus('Only linked staff accounts can perform this action.', 403);
    }

    const role = String(staffAccount?.role || '').trim();
    await requirePermission(getServiceRoleKey(), role, 'function', 'manage-care-services');

    return {
        authUser,
        staffAccountId: String(staffAccount?.id || '').trim() || null,
        role,
        department: String(staffAccount?.department || '').trim() || null,
        displayName: String(
            staffAccount?.full_name
            || staffAccount?.username
            || role
        ).trim() || role
    };
};

const assertAllowedStatus = (row: any, allowedStatuses: string[], actionLabel: string) => {
    const currentStatus = String(row?.status || '').trim();
    if (!allowedStatuses.includes(currentStatus)) {
        throw withStatus(
            `This record can no longer be used for ${actionLabel}. Current status: ${currentStatus || 'Unknown'}.`,
            409
        );
    }
};

const getCounselingRequestById = async (adminClient: any, requestId: string) => {
    const { data, error } = await adminClient
        .from('counseling_requests')
        .select('id, student_id, student_name, request_type, status')
        .eq('id', requestId)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw withStatus('Counseling request not found.', 404);
    }

    return data;
};

const getSupportRequestById = async (adminClient: any, requestId: string) => {
    const { data, error } = await adminClient
        .from('support_requests')
        .select('id, student_id, student_name, support_type, status')
        .eq('id', requestId)
        .maybeSingle();

    if (error) throw error;
    if (!data?.id) {
        throw withStatus('Support request not found.', 404);
    }

    return data;
};

const notifyStudent = async (adminClient: any, studentId: string | null | undefined, message: string) => {
    const nextStudentId = String(studentId || '').trim();
    if (!nextStudentId || !message.trim()) return;

    const { error } = await adminClient
        .from('notifications')
        .insert([{
            student_id: nextStudentId,
            message
        }]);

    if (error) throw error;
};

const buildCounselingEmailPayload = async (
    adminClient: any,
    studentId: unknown,
    fallbackName: unknown,
    payload: Record<string, unknown>
) => {
    const studentEmailTarget = await getStudentEmailTarget(adminClient, studentId, String(fallbackName || '').trim() || null);
    if (!studentEmailTarget.email) {
        return null;
    }

    return {
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        ...payload
    };
};

const buildSupportEmailPayload = async (
    adminClient: any,
    studentId: unknown,
    fallbackName: unknown,
    payload: Record<string, unknown>
) => {
    const studentEmailTarget = await getStudentEmailTarget(adminClient, studentId, String(fallbackName || '').trim() || null);
    if (!studentEmailTarget.email) {
        return null;
    }

    return {
        type: 'SUPPORT_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        ...payload
    };
};

const sanitizeShortText = (value: unknown, maxLength = 120) =>
    sanitizePlainText(value, { maxLength });

const sanitizeLongText = (value: unknown, maxLength = 1200) =>
    sanitizePlainText(value, { maxLength, multiline: true });

const scheduleCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    date: unknown,
    time: unknown,
    notes: unknown
) => {
    const actor = await assertCareStaffRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextNotes = sanitizeLongText(notes, 1000);

    if (!nextRequestId) throw new Error('Counseling request ID is required.');
    if (!nextDate || !nextTime) throw new Error('Session date and time are required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertAllowedStatus(counselingRequest, CARE_SCHEDULABLE_COUNSELING_STATUSES, 'CARE counseling scheduling');

    const scheduledDate = `${nextDate} ${nextTime}`;
    const nextStatus = counselingRequest.status === 'Referred'
        ? 'Staff_Scheduled'
        : 'Scheduled';

    const { error } = await adminClient
        .from('counseling_requests')
        .update({
            status: nextStatus,
            scheduled_date: scheduledDate,
            resolution_notes: nextNotes || null
        })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        `Your counseling session with CARE Staff is scheduled for ${nextDate} at ${nextTime}.`
    );

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: nextStatus === 'Staff_Scheduled' ? 'Scheduled with CARE Staff' : nextStatus,
        requestType: counselingRequest.request_type,
        scheduleDate: scheduledDate,
        actor: 'CARE Staff',
        notes: nextNotes || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Scheduled counseling session',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${actor.displayName} scheduled a counseling session for ${counselingRequest.student_name || 'a student'}.`,
            student_name: counselingRequest.student_name,
            request_type: counselingRequest.request_type,
            status: nextStatus,
            scheduled_date: scheduledDate
        }
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: nextStatus,
        scheduledDate,
        emailPayload
    };
};

const completeCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    publicNotes: unknown,
    privateNotes: unknown
) => {
    const actor = await assertCareStaffRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextPublicNotes = sanitizeLongText(publicNotes, 1500);
    const nextPrivateNotes = sanitizeLongText(privateNotes, 1500);

    if (!nextRequestId) throw new Error('Counseling request ID is required.');
    if (!nextPublicNotes) throw new Error('Public resolution notes are required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertAllowedStatus(counselingRequest, CARE_COMPLETABLE_COUNSELING_STATUSES, 'CARE counseling completion');

    const { error } = await adminClient
        .from('counseling_requests')
        .update({
            status: 'Completed',
            resolution_notes: nextPublicNotes,
            confidential_notes: nextPrivateNotes || null
        })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        'Your counseling session has been marked as Completed. You can now view the advice.'
    );

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: 'Completed',
        requestType: counselingRequest.request_type,
        actor: 'CARE Staff',
        notes: nextPublicNotes
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Completed counseling session',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${actor.displayName} marked a counseling session as completed for ${counselingRequest.student_name || 'a student'}.`,
            student_name: counselingRequest.student_name,
            request_type: counselingRequest.request_type,
            status: 'Completed'
        }
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Completed',
        emailPayload
    };
};

const forwardSupportToDepartment = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    careNotes: unknown
) => {
    const actor = await assertCareStaffRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();

    if (!nextRequestId) throw new Error('Support request ID is required.');
    const nextCareNotes = sanitizeLongText(careNotes, 1500);

    if (!nextCareNotes) {
        throw new Error('CARE Staff notes are required.');
    }

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertAllowedStatus(supportRequest, CARE_FORWARDABLE_SUPPORT_STATUSES, 'forwarding to the department');

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Forwarded to Dept',
            care_notes: nextCareNotes
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        'Your support request has been forwarded to your department for review by CARE Staff.'
    );

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Forwarded to Dept',
        supportType: supportRequest.support_type,
        actor: 'CARE Staff',
        notes: nextCareNotes
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Forwarded support request to department',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${actor.displayName} forwarded a support request for ${supportRequest.student_name || 'a student'} to the department.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Forwarded to Dept'
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Forwarded to Dept',
        emailPayload
    };
};

const completeSupport = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    resolutionNotes: unknown
) => {
    const actor = await assertCareStaffRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextResolutionNotes = sanitizeLongText(resolutionNotes, 1500);

    if (!nextRequestId) throw new Error('Support request ID is required.');
    if (!nextResolutionNotes) throw new Error('Resolution notes are required.');

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertAllowedStatus(supportRequest, CARE_COMPLETABLE_SUPPORT_STATUSES, 'CARE support completion');

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Completed',
            resolution_notes: nextResolutionNotes
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        'Your support request has been updated.'
    );

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Completed',
        supportType: supportRequest.support_type,
        actor: 'CARE Staff',
        notes: nextResolutionNotes
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Completed support request',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${actor.displayName} completed a support request for ${supportRequest.student_name || 'a student'}.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Completed'
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Completed',
        emailPayload
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
        const mode = String(body.mode || '').trim();
        const rateLimitResponse = await enforceRateLimit(request, {
            endpoint: 'manage-care-services',
            action: mode,
            corsHeaders
        });
        if (rateLimitResponse) return rateLimitResponse;

        const adminClient = getAdminClient();

        if (mode === 'ping') {
            return json({ success: true });
        }

        if (mode === 'schedule-counseling') {
            return json(await scheduleCounseling(adminClient, request, body.requestId, body.date, body.time, body.notes));
        }

        if (mode === 'complete-counseling') {
            return json(await completeCounseling(adminClient, request, body.requestId, body.publicNotes, body.privateNotes));
        }

        if (mode === 'forward-support-to-dept') {
            return json(await forwardSupportToDepartment(adminClient, request, body.requestId, body.careNotes));
        }

        if (mode === 'complete-support') {
            return json(await completeSupport(adminClient, request, body.requestId, body.resolutionNotes));
        }

        return json({ success: false, error: 'Unsupported CARE services mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-care-services' });
        const message = error instanceof Error ? error.message : 'Unexpected CARE services error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
