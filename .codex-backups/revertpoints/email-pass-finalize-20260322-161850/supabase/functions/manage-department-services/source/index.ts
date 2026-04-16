import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getStudentEmailTarget, safelySendTransactionalEmail } from '../../_shared/email.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const COUNSELING_QUEUE_STATUSES = ['Submitted', 'Pending'];
const COUNSELING_COMPLETABLE_STATUSES = ['Scheduled'];
const SUPPORT_QUEUE_STATUSES = ['Forwarded to Dept'];
const SUPPORT_VISIT_STATUSES = ['Visit Scheduled'];

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

const assertDepartmentHeadRequest = async (adminClient: any, request: Request) => {
    const authUser = await getRequestAuthUser(adminClient, request);
    const { data: staffAccount, error } = await adminClient
        .from('staff_accounts')
        .select('role, department, full_name, username')
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (error) throw error;
    if (String(staffAccount?.role || '').trim() !== 'Department Head') {
        throw withStatus('Department Head privileges are required for this action.', 403);
    }

    const department = String(staffAccount?.department || '').trim();
    if (!department) {
        throw withStatus('Your department assignment is missing.', 403);
    }

    const displayName = String(
        staffAccount?.full_name
        || staffAccount?.username
        || department
    ).trim();

    return {
        authUser,
        department,
        displayName
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

const assertDepartmentScopedRow = (row: any, department: string, label: string) => {
    if (String(row?.department || '').trim() !== department) {
        throw withStatus(`This ${label} is not assigned to your department.`, 403);
    }
};

const getCounselingRequestById = async (adminClient: any, requestId: string) => {
    const { data, error } = await adminClient
        .from('counseling_requests')
        .select('id, student_id, student_name, department, status, reason_for_referral, description')
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
        .select('id, student_id, student_name, department, status')
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

const scheduleCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    date: unknown,
    time: unknown,
    notes: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextNotes = String(notes || '').trim();

    if (!nextRequestId) throw new Error('Counseling request ID is required.');
    if (!nextDate || !nextTime) throw new Error('Session date and time are required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(counselingRequest, department, 'counseling request');
    assertAllowedStatus(counselingRequest, COUNSELING_QUEUE_STATUSES, 'department counseling scheduling');

    const scheduledDate = `${nextDate} ${nextTime}`;
    const { error } = await adminClient
        .from('counseling_requests')
        .update({
            status: 'Scheduled',
            scheduled_date: scheduledDate,
            resolution_notes: nextNotes || null
        })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        `Your counseling request has been approved and scheduled for ${nextDate} at ${nextTime} by ${department}.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, counselingRequest.student_id, counselingRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Scheduled',
        requestType: counselingRequest.request_type || 'Counseling',
        scheduleDate: scheduledDate,
        actor: department,
        notes: nextNotes || null
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Scheduled',
        scheduledDate,
        ...emailResult
    };
};

const rejectCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = String(notes || '').trim();

    if (!nextRequestId) throw new Error('Counseling request ID is required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(counselingRequest, department, 'counseling request');
    assertAllowedStatus(counselingRequest, COUNSELING_QUEUE_STATUSES, 'department counseling rejection');

    const { error } = await adminClient
        .from('counseling_requests')
        .update({
            status: 'Rejected',
            resolution_notes: nextNotes || null
        })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        `Your counseling request has been reviewed and was not approved by ${department}.${nextNotes ? ` Reason: ${nextNotes}` : ''}`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, counselingRequest.student_id, counselingRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Rejected',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department,
        notes: nextNotes || null
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Rejected',
        ...emailResult
    };
};

const completeCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();

    if (!nextRequestId) throw new Error('Counseling request ID is required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(counselingRequest, department, 'counseling request');
    assertAllowedStatus(counselingRequest, COUNSELING_COMPLETABLE_STATUSES, 'department counseling completion');

    const { error } = await adminClient
        .from('counseling_requests')
        .update({ status: 'Completed' })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        `Your counseling session has been resolved and marked as Completed by ${department}.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, counselingRequest.student_id, counselingRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Completed',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Completed',
        ...emailResult
    };
};

const forwardCounselingToCare = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const { department, displayName } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(body.requestId || '').trim();
    const referrerContactNumber = String(body.referrerContactNumber || '').trim();
    const relationshipWithStudent = String(body.relationshipWithStudent || '').trim();
    const reasonForReferral = String(body.reasonForReferral || '').trim();
    const actionsMade = String(body.actionsMade || '').trim();
    const dateDurationOfObservations = String(body.dateDurationOfObservations || '').trim();
    const referrerSignature = String(body.referrerSignature || '').trim();

    if (!nextRequestId) throw new Error('Counseling request ID is required.');
    if (!reasonForReferral) throw new Error('Reason for referral is required.');
    if (!actionsMade) throw new Error('Actions made are required.');

    const counselingRequest = await getCounselingRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(counselingRequest, department, 'counseling request');
    assertAllowedStatus(counselingRequest, COUNSELING_COMPLETABLE_STATUSES, 'forwarding to CARE Staff');

    const { error } = await adminClient
        .from('counseling_requests')
        .update({
            status: 'Referred',
            referred_by: displayName,
            referrer_contact_number: referrerContactNumber || null,
            relationship_with_student: relationshipWithStudent || null,
            reason_for_referral: reasonForReferral,
            actions_made: actionsMade,
            date_duration_of_observations: dateDurationOfObservations || null,
            referrer_signature: referrerSignature || null
        })
        .eq('id', counselingRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        counselingRequest.student_id,
        `Your counseling request has been forwarded to CARE Staff by ${department} for further assistance.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, counselingRequest.student_id, counselingRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Referred',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department,
        notes: reasonForReferral
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Referred',
        ...emailResult
    };
};

const createCounselingReferral = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const { department, displayName } = await assertDepartmentHeadRequest(adminClient, request);
    const studentId = String(body.studentId || '').trim();
    const studentName = String(body.studentName || '').trim();
    const courseYear = String(body.courseYear || '').trim();
    const contactNumber = String(body.contactNumber || '').trim();
    const reasonForReferral = String(body.reasonForReferral || '').trim();
    const referrerContactNumber = String(body.referrerContactNumber || '').trim();
    const relationshipWithStudent = String(body.relationshipWithStudent || '').trim();
    const actionsMade = String(body.actionsMade || '').trim();
    const dateDurationOfObservations = String(body.dateDurationOfObservations || '').trim();
    const referrerSignature = String(body.referrerSignature || '').trim();

    if (!studentId || !studentName) {
        throw new Error('A valid student must be selected for referral.');
    }

    if (!reasonForReferral) {
        throw new Error('Reason for referral is required.');
    }

    if (!actionsMade) {
        throw new Error('Actions made are required.');
    }

    const { data: student, error: studentError } = await adminClient
        .from('students')
        .select('student_id, department')
        .eq('student_id', studentId)
        .maybeSingle();

    if (studentError) throw studentError;
    if (!student?.student_id) {
        throw withStatus('The selected student could not be found.', 404);
    }

    if (String(student.department || '').trim() !== department) {
        throw withStatus('You can only create referrals for students in your department.', 403);
    }

    const { data: insertedReferral, error } = await adminClient
        .from('counseling_requests')
        .insert([{
            student_id: studentId,
            student_name: studentName,
            course_year: courseYear || null,
            contact_number: contactNumber || null,
            request_type: 'Dean Referral',
            description: reasonForReferral,
            referred_by: displayName,
            referrer_contact_number: referrerContactNumber || null,
            relationship_with_student: relationshipWithStudent || null,
            reason_for_referral: reasonForReferral,
            actions_made: actionsMade,
            date_duration_of_observations: dateDurationOfObservations || null,
            referrer_signature: referrerSignature || null,
            department,
            status: 'Referred'
        }])
        .select('id')
        .maybeSingle();

    if (error) throw error;

    await notifyStudent(
        adminClient,
        studentId,
        `You have been referred for counseling by ${department}.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, studentId, studentName);
    const emailResult = await safelySendTransactionalEmail({
        type: 'COUNSELING_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Referred',
        requestType: 'Dean Referral',
        actor: department,
        notes: reasonForReferral
    });

    return {
        success: true,
        requestId: insertedReferral?.id || null,
        status: 'Referred',
        ...emailResult
    };
};

const approveSupportAndSchedule = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    date: unknown,
    time: unknown,
    notes: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextNotes = String(notes || '').trim();

    if (!nextRequestId) throw new Error('Support request ID is required.');
    if (!nextDate || !nextTime) throw new Error('Visit date and time are required.');

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(supportRequest, department, 'support request');
    assertAllowedStatus(supportRequest, SUPPORT_QUEUE_STATUSES, 'support approval');

    const scheduledDate = `${nextDate} ${nextTime}`;
    const deptNotes = JSON.stringify({
        scheduled_date: scheduledDate,
        approval_notes: nextNotes
    });

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Visit Scheduled',
            dept_notes: deptNotes
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        `Your support request has been approved and scheduled for ${nextDate} at ${nextTime} by ${department}.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, supportRequest.student_id, supportRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'SUPPORT_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Visit Scheduled',
        supportType: supportRequest.support_type,
        scheduleDate: scheduledDate,
        actor: department,
        notes: nextNotes || null
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Visit Scheduled',
        ...emailResult
    };
};

const rejectSupport = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = String(notes || '').trim();

    if (!nextRequestId) throw new Error('Support request ID is required.');

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(supportRequest, department, 'support request');
    assertAllowedStatus(supportRequest, SUPPORT_QUEUE_STATUSES, 'support rejection');

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Rejected',
            dept_notes: nextNotes || null
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        `Your support request has been reviewed and was not approved by ${department}.${nextNotes ? ` Reason: ${nextNotes}` : ''}`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, supportRequest.student_id, supportRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'SUPPORT_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Rejected',
        supportType: supportRequest.support_type,
        actor: department,
        notes: nextNotes || null
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Rejected',
        ...emailResult
    };
};

const resolveSupport = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const { department } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = String(notes || '').trim();

    if (!nextRequestId) throw new Error('Support request ID is required.');
    if (!nextNotes) throw new Error('Resolution notes are required.');

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(supportRequest, department, 'support request');
    assertAllowedStatus(supportRequest, SUPPORT_VISIT_STATUSES, 'support resolution');

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Resolved by Dept',
            dept_notes: nextNotes
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        `Your support request has been marked as resolved by ${department}.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, supportRequest.student_id, supportRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'SUPPORT_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Resolved by Dept',
        supportType: supportRequest.support_type,
        actor: department,
        notes: nextNotes
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Resolved by Dept',
        ...emailResult
    };
};

const referSupportToCare = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const { department, displayName } = await assertDepartmentHeadRequest(adminClient, request);
    const nextRequestId = String(body.requestId || '').trim();
    const dateActed = String(body.dateActed || '').trim();
    const actionsTaken = String(body.actionsTaken || '').trim();
    const comments = String(body.comments || '').trim();
    const signature = String(body.signature || '').trim();

    if (!nextRequestId) throw new Error('Support request ID is required.');
    if (!actionsTaken) throw new Error('Actions taken are required.');

    const supportRequest = await getSupportRequestById(adminClient, nextRequestId);
    assertDepartmentScopedRow(supportRequest, department, 'support request');
    assertAllowedStatus(supportRequest, SUPPORT_VISIT_STATUSES, 'referring a support request to CARE');

    const deptNotes = JSON.stringify({
        referred_by: displayName,
        date_acted: dateActed || null,
        actions_taken: actionsTaken,
        comments: comments || null,
        signature: signature || null
    });

    const { error } = await adminClient
        .from('support_requests')
        .update({
            status: 'Referred to CARE',
            dept_notes: deptNotes
        })
        .eq('id', supportRequest.id);

    if (error) throw error;

    await notifyStudent(
        adminClient,
        supportRequest.student_id,
        `Your support request case has been referred back to CARE Staff by ${department} for further intervention.`
    );

    const studentEmailTarget = await getStudentEmailTarget(adminClient, supportRequest.student_id, supportRequest.student_name);
    const emailResult = await safelySendTransactionalEmail({
        type: 'SUPPORT_STATUS_UPDATE',
        email: studentEmailTarget.email,
        name: studentEmailTarget.name,
        status: 'Referred to CARE',
        supportType: supportRequest.support_type,
        actor: department,
        notes: comments || null
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Referred to CARE',
        ...emailResult
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

        if (mode === 'schedule-counseling') {
            return json(await scheduleCounseling(adminClient, request, body.requestId, body.date, body.time, body.notes));
        }

        if (mode === 'reject-counseling') {
            return json(await rejectCounseling(adminClient, request, body.requestId, body.notes));
        }

        if (mode === 'complete-counseling') {
            return json(await completeCounseling(adminClient, request, body.requestId));
        }

        if (mode === 'forward-counseling-to-care') {
            return json(await forwardCounselingToCare(adminClient, request, body));
        }

        if (mode === 'create-counseling-referral') {
            return json(await createCounselingReferral(adminClient, request, body));
        }

        if (mode === 'approve-support-and-schedule') {
            return json(await approveSupportAndSchedule(adminClient, request, body.requestId, body.date, body.time, body.notes));
        }

        if (mode === 'reject-support') {
            return json(await rejectSupport(adminClient, request, body.requestId, body.notes));
        }

        if (mode === 'resolve-support') {
            return json(await resolveSupport(adminClient, request, body.requestId, body.notes));
        }

        if (mode === 'refer-support-to-care') {
            return json(await referSupportToCare(adminClient, request, body));
        }

        return json({ success: false, error: 'Unsupported department services mode.' }, 400);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected department services error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
