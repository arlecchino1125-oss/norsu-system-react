import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { captureEdgeException } from '../_shared/sentry.ts';
import { requirePermission } from './permissionCheck.ts';
import { enforceRateLimit } from './rateLimit.ts';
import { writeStaffAuditLog } from './staffAuditLog.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, x-client-authorization',
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

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const asObject = (value: unknown) =>
    typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};

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

const assertRecordActionRequest = async (
    adminClient: any,
    request: Request,
    permissionKey: 'archive_records' | 'restore_records'
) => {
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
    await requirePermission(getServiceRoleKey(), role, 'action', permissionKey);

    return {
        authUserId: String(authUser.id || '').trim() || null,
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

const parsePositiveInt = (value: unknown, label: string) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw withStatus(`${label} is required.`, 400);
    }

    return parsed;
};

const parseTextIdentifier = (value: unknown, label: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw withStatus(`${label} is required.`, 400);
    }

    return normalized;
};

const parseBoolean = (value: unknown, label: string) => {
    if (typeof value !== 'boolean') {
        throw withStatus(`${label} is required.`, 400);
    }

    return value;
};

const maybeSingleOrThrow = async (
    queryPromise: PromiseLike<{ data: any; error: any }>,
    missingMessage: string
) => {
    const { data, error } = await queryPromise;
    if (error) throw error;
    if (!data) {
        throw withStatus(missingMessage, 404);
    }

    return data;
};

const normalizeOptionalText = (value: unknown) => {
    const normalized = String(value || '').trim();
    return normalized || null;
};

const getActorStaffAccountId = (actor: { staffAccountId?: string | null }) => {
    const parsed = Number(actor?.staffAccountId || 0);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const resolveApplicationArchiveOutcome = (status: unknown) => {
    const normalizedStatus = String(status || '').trim();
    return normalizedStatus === 'Failed' ? 'failed_nat' : 'application_unsuccessful';
};

const archiveNatApplication = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const applicationId = parseTextIdentifier(body.applicationId, 'Application ID');
    const application = await maybeSingleOrThrow(
        adminClient
            .from('applications')
            .select('id, reference_id, first_name, last_name, status')
            .eq('id', applicationId)
            .maybeSingle(),
        'Application not found.'
    );

    const archiveOutcome = resolveApplicationArchiveOutcome(application.status);
    const { error } = await adminClient.rpc('finalize_application', {
        p_application_id: applicationId,
        p_outcome: archiveOutcome,
        p_archived_by: getActorStaffAccountId(actor),
        p_activated_student_id: null,
        p_activated_course: null
    });

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Archived NAT application',
        entityTable: 'applications',
        entityId: applicationId,
        details: {
            referenceId: application.reference_id || null,
            applicantName: `${application.first_name || ''} ${application.last_name || ''}`.trim() || 'Applicant',
            previousStatus: application.status || null,
            archiveOutcome
        }
    });

    return {
        success: true,
        archivedApplicationId: applicationId,
        archiveOutcome
    };
};

const setNatCourseStatus = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const courseId = parsePositiveInt(body.courseId, 'Course ID');
    const status = parseTextIdentifier(body.status, 'Course status');

    if (status !== 'Open' && status !== 'Closed') {
        throw withStatus('Unsupported course status.', 400);
    }

    const course = await maybeSingleOrThrow(
        adminClient
            .from('courses')
            .select('id, name, status')
            .eq('id', courseId)
            .maybeSingle(),
        'Course not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('courses')
        .update({ status })
        .eq('id', courseId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: status === 'Closed' ? 'Closed NAT course' : 'Reopened NAT course',
        entityTable: 'courses',
        entityId: courseId,
        details: {
            courseName: course.name || null,
            previousStatus: course.status || null,
            nextStatus: status
        }
    });

    return {
        success: true,
        courseId,
        status
    };
};

const deactivateNatRequirement = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const requirementId = parsePositiveInt(body.requirementId, 'Requirement ID');
    const requirement = await maybeSingleOrThrow(
        adminClient
            .from('nat_requirements')
            .select('id, name, is_active')
            .eq('id', requirementId)
            .maybeSingle(),
        'NAT requirement not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('nat_requirements')
        .update({ is_active: false })
        .eq('id', requirementId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deactivated NAT requirement',
        entityTable: 'nat_requirements',
        entityId: requirementId,
        details: {
            requirementName: requirement.name || null,
            previousIsActive: Boolean(requirement.is_active)
        }
    });

    return {
        success: true,
        deactivatedRequirementId: requirementId
    };
};

const setNatScheduleActive = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const scheduleId = parsePositiveInt(body.scheduleId, 'Schedule ID');
    const isActive = parseBoolean(body.isActive, 'Schedule state');
    const schedule = await maybeSingleOrThrow(
        adminClient
            .from('admission_schedules')
            .select('id, date, venue, is_active')
            .eq('id', scheduleId)
            .maybeSingle(),
        'Schedule not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('admission_schedules')
        .update({ is_active: isActive })
        .eq('id', scheduleId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: isActive ? 'Reopened NAT schedule' : 'Closed NAT schedule',
        entityTable: 'admission_schedules',
        entityId: scheduleId,
        details: {
            scheduleDate: schedule.date || null,
            venue: schedule.venue || null,
            previousIsActive: Boolean(schedule.is_active),
            nextIsActive: isActive
        }
    });

    return {
        success: true,
        scheduleId,
        isActive
    };
};

const archiveStudent = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const studentRowId = parsePositiveInt(body.studentRowId, 'Student row ID');
    const student = await maybeSingleOrThrow(
        adminClient
            .from('students')
            .select('id, student_id, first_name, last_name, is_archived')
            .eq('id', studentRowId)
            .maybeSingle(),
        'Student not found.'
    );

    const studentId = parseTextIdentifier(student.student_id || body.studentId, 'Student ID');
    const archiveReason = normalizeOptionalText(body.reason) || 'Archived from the CARE Staff dashboard.';
    const archiveNote = normalizeOptionalText(body.note);

    const { error: archiveError } = await adminClient.rpc('archive_student', {
        p_student_id: studentId,
        p_reason: archiveReason,
        p_note: archiveNote,
        p_archived_by: getActorStaffAccountId(actor)
    });

    if (archiveError) throw archiveError;

    const { error: keyError } = await adminClient
        .from('enrolled_students')
        .update({ status: 'Archived' })
        .eq('student_id', studentId);

    if (keyError) throw keyError;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Archived student record',
        entityTable: 'students',
        entityId: studentRowId,
        details: {
            studentId,
            studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student',
            previousIsArchived: Boolean(student.is_archived),
            archiveReason,
            archiveNote
        }
    });

    return {
        success: true,
        archivedStudentRowId: studentRowId,
        studentId
    };
};

const restoreStudent = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const studentRowId = parsePositiveInt(body.studentRowId, 'Student row ID');
    const student = await maybeSingleOrThrow(
        adminClient
            .from('students')
            .select('id, student_id, first_name, last_name, is_archived')
            .eq('id', studentRowId)
            .maybeSingle(),
        'Student not found.'
    );

    const studentId = parseTextIdentifier(student.student_id || body.studentId, 'Student ID');
    const { error: restoreError } = await adminClient.rpc('restore_student', {
        p_student_id: studentId
    });

    if (restoreError) throw restoreError;

    const { data: enrollmentKey, error: enrollmentKeyError } = await adminClient
        .from('enrolled_students')
        .select('student_id, status, is_used, assigned_to_email')
        .eq('student_id', studentId)
        .maybeSingle();

    if (enrollmentKeyError) throw enrollmentKeyError;

    let nextKeyStatus = enrollmentKey?.status || null;
    if (String(enrollmentKey?.status || '') === 'Archived') {
        nextKeyStatus = enrollmentKey.is_used ? 'Activated' : 'Pending';
        const { error: keyError } = await adminClient
            .from('enrolled_students')
            .update({ status: nextKeyStatus })
            .eq('student_id', studentId);

        if (keyError) throw keyError;
    }

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Restored student record',
        entityTable: 'students',
        entityId: studentRowId,
        details: {
            studentId,
            studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student',
            previousIsArchived: Boolean(student.is_archived),
            previousKeyStatus: enrollmentKey?.status || null,
            nextKeyStatus
        }
    });

    return {
        success: true,
        restoredStudentRowId: studentRowId,
        studentId,
        enrollmentKeyStatus: nextKeyStatus
    };
};

const revokeEnrollmentKey = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const studentId = parseTextIdentifier(body.studentId, 'Student ID');
    const key = await maybeSingleOrThrow(
        adminClient
            .from('enrolled_students')
            .select('student_id, course, year_level, status, is_used, assigned_to_email')
            .eq('student_id', studentId)
            .maybeSingle(),
        'Enrollment key not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('enrolled_students')
        .update({ status: 'Revoked' })
        .eq('student_id', studentId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Revoked enrollment key',
        entityTable: 'enrolled_students',
        entityId: studentId,
        details: {
            course: key.course || null,
            yearLevel: key.year_level || null,
            previousStatus: key.status || null,
            isUsed: Boolean(key.is_used),
            assignedToEmail: key.assigned_to_email || null
        }
    });

    return {
        success: true,
        revokedStudentId: studentId
    };
};

const deactivateForm = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const formId = parsePositiveInt(body.formId, 'Form ID');
    const form = await maybeSingleOrThrow(
        adminClient
            .from('needs_assessment_forms')
            .select('id, title, is_active')
            .eq('id', formId)
            .maybeSingle(),
        'Form not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('needs_assessment_forms')
        .update({ is_active: false })
        .eq('id', formId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deactivated form',
        entityTable: 'needs_assessment_forms',
        entityId: formId,
        details: {
            formTitle: form.title || null,
            previousIsActive: Boolean(form.is_active)
        }
    });

    return {
        success: true,
        deactivatedFormId: formId
    };
};

const closeScholarship = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const scholarshipId = parsePositiveInt(body.scholarshipId, 'Scholarship ID');
    const scholarship = await maybeSingleOrThrow(
        adminClient
            .from('scholarships')
            .select('id, title, is_active')
            .eq('id', scholarshipId)
            .maybeSingle(),
        'Scholarship not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('scholarships')
        .update({ is_active: false })
        .eq('id', scholarshipId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Closed scholarship',
        entityTable: 'scholarships',
        entityId: scholarshipId,
        details: {
            scholarshipTitle: scholarship.title || null,
            previousIsActive: Boolean(scholarship.is_active)
        }
    });

    return {
        success: true,
        closedScholarshipId: scholarshipId
    };
};

const archiveEvent = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const eventId = parsePositiveInt(body.eventId, 'Event ID');
    const event = await maybeSingleOrThrow(
        adminClient
            .from('events')
            .select('id, title, type, is_archived')
            .eq('id', eventId)
            .maybeSingle(),
        'Event not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('events')
        .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
            archived_by: getActorStaffAccountId(actor)
        })
        .eq('id', eventId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Archived event or announcement',
        entityTable: 'events',
        entityId: eventId,
        details: {
            eventTitle: event.title || null,
            eventType: event.type || null,
            previousIsArchived: Boolean(event.is_archived)
        }
    });

    return {
        success: true,
        archivedEventId: eventId
    };
};

const deactivateOfficeVisitReason = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const reasonId = parsePositiveInt(body.reasonId, 'Reason ID');
    const reason = await maybeSingleOrThrow(
        adminClient
            .from('office_visit_reasons')
            .select('id, reason, is_active')
            .eq('id', reasonId)
            .maybeSingle(),
        'Office visit reason not found.'
    );

    // Ordered on purpose: the read above must observe pre-update state — its values
    // are recorded as previous* in the audit log, and it guards existence before the write.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('office_visit_reasons')
        .update({ is_active: false })
        .eq('id', reasonId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deactivated office visit reason',
        entityTable: 'office_visit_reasons',
        entityId: reasonId,
        details: {
            reason: reason.reason || null,
            previousIsActive: Boolean(reason.is_active)
        }
    });

    return {
        success: true,
        deactivatedReasonId: reasonId
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
        const body = asObject(await request.json());
        const mode = String(body.mode || '').trim();
        const rateLimitResponse = await enforceRateLimit(request, {
            endpoint: 'manage-record-archives',
            action: mode,
            corsHeaders
        });
        if (rateLimitResponse) return rateLimitResponse;

        const adminClient = getAdminClient();

        if (mode === 'ping') {
            return json({ success: true });
        }

        const requiredPermission = mode === 'restore-student'
            ? 'restore_records'
            : 'archive_records';
        const actor = await assertRecordActionRequest(adminClient, request, requiredPermission);

        if (mode === 'archive-nat-application') {
            return json(await archiveNatApplication(adminClient, actor, body));
        }

        if (mode === 'set-nat-course-status') {
            return json(await setNatCourseStatus(adminClient, actor, body));
        }

        if (mode === 'deactivate-nat-requirement') {
            return json(await deactivateNatRequirement(adminClient, actor, body));
        }

        if (mode === 'set-nat-schedule-active') {
            return json(await setNatScheduleActive(adminClient, actor, body));
        }

        if (mode === 'archive-student') {
            return json(await archiveStudent(adminClient, actor, body));
        }

        if (mode === 'restore-student') {
            return json(await restoreStudent(adminClient, actor, body));
        }

        if (mode === 'revoke-enrollment-key') {
            return json(await revokeEnrollmentKey(adminClient, actor, body));
        }

        if (mode === 'deactivate-form') {
            return json(await deactivateForm(adminClient, actor, body));
        }

        if (mode === 'close-scholarship') {
            return json(await closeScholarship(adminClient, actor, body));
        }

        if (mode === 'archive-event') {
            return json(await archiveEvent(adminClient, actor, body));
        }

        if (mode === 'deactivate-office-visit-reason') {
            return json(await deactivateOfficeVisitReason(adminClient, actor, body));
        }

        return json({ success: false, error: 'Unsupported archive mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-record-archives' });
        const message = error instanceof Error ? error.message : 'Unexpected archive management error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
