import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { getStudentEmailTarget } from './studentEmailTarget.ts';
import { requirePermission } from './permissionCheck.ts';
import { sanitizeOptionalPlainText, sanitizePlainText } from './plainText.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { writeStaffAuditLog } from './staffAuditLog.ts';

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

const assertDepartmentHeadRequest = async (adminClient: any, request: Request) => {
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
    await requirePermission(getServiceRoleKey(), role, 'function', 'manage-department-services');

    const department = String(staffAccount?.department || '').trim();
    if (!department) {
        throw withStatus('A department assignment is required for this action.', 403);
    }

    const displayName = String(
        staffAccount?.full_name
        || staffAccount?.username
        || role
        || department
    ).trim();

    return {
        authUser,
        staffAccountId: String(staffAccount?.id || '').trim() || null,
        role,
        department,
        displayName: displayName || department || role
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
        .select('id, student_id, student_name, department, status, request_type, reason_for_referral, description')
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
        .select('id, student_id, student_name, department, status, support_type')
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

const sanitizeOptionalShortText = (value: unknown, maxLength = 120) =>
    sanitizeOptionalPlainText(value, { maxLength });

const sanitizeOptionalLongText = (value: unknown, maxLength = 1200) =>
    sanitizeOptionalPlainText(value, { maxLength, multiline: true });

const sanitizeOptionalSignatureDataUrl = (value: unknown, maxLength = 500_000) => {
    const normalized = String(value || '').trim();
    if (!normalized) return null;

    if (!normalized.startsWith('data:image/')) {
        throw new Error('Invalid signature format.');
    }

    if (normalized.length > maxLength) {
        throw new Error('Signature image is too large.');
    }

    return normalized;
};

const scheduleCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    date: unknown,
    time: unknown,
    notes: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextRequestId = String(requestId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextNotes = sanitizeLongText(notes, 1000);

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

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: 'Scheduled',
        requestType: counselingRequest.request_type || 'Counseling',
        scheduleDate: scheduledDate,
        actor: department,
        notes: nextNotes || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Scheduled department counseling',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${actor.displayName} scheduled a department counseling session for ${counselingRequest.student_name || 'a student'}.`,
            student_name: counselingRequest.student_name,
            request_type: counselingRequest.request_type,
            status: 'Scheduled',
            scheduled_date: scheduledDate
        }
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Scheduled',
        scheduledDate,
        emailPayload
    };
};

const rejectCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = sanitizeLongText(notes, 1000);

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

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: 'Rejected',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department,
        notes: nextNotes || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Rejected department counseling request',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${actor.displayName} rejected a counseling request for ${counselingRequest.student_name || 'a student'}.`,
            student_name: counselingRequest.student_name,
            request_type: counselingRequest.request_type,
            status: 'Rejected'
        }
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Rejected',
        emailPayload
    };
};

const completeCounseling = async (
    adminClient: any,
    request: Request,
    requestId: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
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

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: 'Completed',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Completed department counseling session',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${actor.displayName} completed a department counseling session for ${counselingRequest.student_name || 'a student'}.`,
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

const forwardCounselingToCare = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department, displayName } = actor;
    const nextRequestId = String(body.requestId || '').trim();
    const referrerContactNumber = sanitizeShortText(body.referrerContactNumber, 40);
    const relationshipWithStudent = sanitizeShortText(body.relationshipWithStudent, 80);
    const reasonForReferral = sanitizeLongText(body.reasonForReferral, 1500);
    const actionsMade = sanitizeLongText(body.actionsMade, 1500);
    const dateDurationOfObservations = sanitizeOptionalShortText(body.dateDurationOfObservations, 120);
    const referrerSignature = sanitizeOptionalSignatureDataUrl(body.referrerSignature);

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

    const emailPayload = await buildCounselingEmailPayload(adminClient, counselingRequest.student_id, counselingRequest.student_name, {
        status: 'Referred',
        requestType: counselingRequest.request_type || 'Counseling',
        actor: department,
        notes: reasonForReferral
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Forwarded counseling request to CARE',
        entityTable: 'counseling_requests',
        entityId: counselingRequest.id,
        details: {
            summary: `${displayName} forwarded a counseling request for ${counselingRequest.student_name || 'a student'} to CARE.`,
            student_name: counselingRequest.student_name,
            request_type: counselingRequest.request_type,
            status: 'Referred'
        }
    });

    return {
        success: true,
        requestId: counselingRequest.id,
        status: 'Referred',
        emailPayload
    };
};

const createCounselingReferral = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department, displayName } = actor;
    const studentId = sanitizeShortText(body.studentId, 40);
    const studentName = sanitizeShortText(body.studentName, 120);
    const courseYear = sanitizeOptionalShortText(body.courseYear, 80);
    const contactNumber = sanitizeOptionalShortText(body.contactNumber, 40);
    const reasonForReferral = sanitizeLongText(body.reasonForReferral, 1500);
    const referrerContactNumber = sanitizeOptionalShortText(body.referrerContactNumber, 40);
    const relationshipWithStudent = sanitizeOptionalShortText(body.relationshipWithStudent, 80);
    const actionsMade = sanitizeLongText(body.actionsMade, 1500);
    const dateDurationOfObservations = sanitizeOptionalShortText(body.dateDurationOfObservations, 120);
    const referrerSignature = sanitizeOptionalSignatureDataUrl(body.referrerSignature);

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

    const emailPayload = await buildCounselingEmailPayload(adminClient, studentId, studentName, {
        status: 'Referred',
        requestType: 'Dean Referral',
        actor: department,
        notes: reasonForReferral
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Created counseling referral',
        entityTable: 'counseling_requests',
        entityId: insertedReferral?.id || null,
        details: {
            summary: `${displayName} created a counseling referral for ${studentName}.`,
            student_name: studentName,
            request_type: 'Dean Referral',
            status: 'Referred'
        }
    });

    return {
        success: true,
        requestId: insertedReferral?.id || null,
        status: 'Referred',
        emailPayload
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
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextRequestId = String(requestId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextNotes = sanitizeLongText(notes, 1000);

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

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Visit Scheduled',
        supportType: supportRequest.support_type,
        scheduleDate: scheduledDate,
        actor: department,
        notes: nextNotes || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Scheduled department support visit',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${actor.displayName} scheduled a support visit for ${supportRequest.student_name || 'a student'}.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Visit Scheduled',
            scheduled_date: scheduledDate
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Visit Scheduled',
        emailPayload
    };
};

const rejectSupport = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = sanitizeLongText(notes, 1000);

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

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Rejected',
        supportType: supportRequest.support_type,
        actor: department,
        notes: nextNotes || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Rejected support request',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${actor.displayName} rejected a support request for ${supportRequest.student_name || 'a student'}.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Rejected'
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Rejected',
        emailPayload
    };
};

const resolveSupport = async (
    adminClient: any,
    request: Request,
    requestId: unknown,
    notes: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextRequestId = String(requestId || '').trim();
    const nextNotes = sanitizeLongText(notes, 1500);

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

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Resolved by Dept',
        supportType: supportRequest.support_type,
        actor: department,
        notes: nextNotes
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Resolved support request',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${actor.displayName} resolved a support request for ${supportRequest.student_name || 'a student'}.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Resolved by Dept'
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Resolved by Dept',
        emailPayload
    };
};

const referSupportToCare = async (
    adminClient: any,
    request: Request,
    body: Record<string, unknown>
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department, displayName } = actor;
    const nextRequestId = String(body.requestId || '').trim();
    const dateActed = sanitizeOptionalShortText(body.dateActed, 80);
    const actionsTaken = sanitizeLongText(body.actionsTaken, 1500);
    const comments = sanitizeOptionalLongText(body.comments, 1200);
    const signature = sanitizeOptionalSignatureDataUrl(body.signature);

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

    const emailPayload = await buildSupportEmailPayload(adminClient, supportRequest.student_id, supportRequest.student_name, {
        status: 'Referred to CARE',
        supportType: supportRequest.support_type,
        actor: department,
        notes: comments || null
    });

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Referred support request to CARE',
        entityTable: 'support_requests',
        entityId: supportRequest.id,
        details: {
            summary: `${displayName} referred a support request for ${supportRequest.student_name || 'a student'} to CARE.`,
            student_name: supportRequest.student_name,
            support_type: supportRequest.support_type,
            status: 'Referred to CARE'
        }
    });

    return {
        success: true,
        requestId: supportRequest.id,
        status: 'Referred to CARE',
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
            endpoint: 'manage-department-services',
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
        await captureEdgeException(error, { endpoint: 'manage-department-services' });
        const message = error instanceof Error ? error.message : 'Unexpected department services error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
