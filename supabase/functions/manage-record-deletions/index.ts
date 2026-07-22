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

const assertDeleteRequest = async (adminClient: any, request: Request) => {
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
    await requirePermission(getServiceRoleKey(), role, 'action', 'delete_records');

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

const countRowsByEquality = async (
    adminClient: any,
    table: string,
    column: string,
    value: unknown
) => {
    const { count, error } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(column, value);

    if (error) throw error;
    return Number(count || 0);
};

const collectIdsByEqualityColumns = async (
    adminClient: any,
    table: string,
    idColumn: string,
    columns: string[],
    value: unknown
) => {
    const rowsByColumn = await Promise.all(columns.map(async (column) => {
        const { data, error } = await adminClient
            .from(table)
            .select(idColumn)
            .eq(column, value);

        if (error) throw error;
        return data || [];
    }));

    const ids = new Set<string | number>();
    for (const rows of rowsByColumn) {
        for (const row of rows) {
            const nextId = row?.[idColumn];
            if (nextId !== undefined && nextId !== null && String(nextId).trim()) {
                ids.add(typeof nextId === 'number' ? nextId : String(nextId).trim());
            }
        }
    }

    return Array.from(ids);
};

const isMissingAuthUserError = (error: unknown) => {
    const normalized = String((error as { message?: unknown } | null)?.message || error || '').toLowerCase();
    return normalized.includes('user not found') || normalized.includes('not found');
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

const deleteNatApplication = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const applicationId = parseTextIdentifier(body.applicationId, 'Application ID');
    const application = await maybeSingleOrThrow(
        adminClient
            .from('applications')
            .select('id, reference_id, first_name, last_name, status')
            .eq('id', applicationId)
            .maybeSingle(),
        'Application not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('applications')
        .delete()
        .eq('id', applicationId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted NAT application',
        entityTable: 'applications',
        entityId: applicationId,
        details: {
            referenceId: application.reference_id,
            applicantName: `${application.first_name || ''} ${application.last_name || ''}`.trim() || 'Applicant',
            previousStatus: application.status || null
        }
    });

    return {
        success: true,
        deletedApplicationId: applicationId
    };
};

const deleteNatCourse = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const courseId = parsePositiveInt(body.courseId, 'Course ID');
    const course = await maybeSingleOrThrow(
        adminClient
            .from('courses')
            .select('id, name')
            .eq('id', courseId)
            .maybeSingle(),
        'Course not found.'
    );

    const courseName = String(course?.name || body.courseName || '').trim();
    if (!courseName) {
        throw withStatus('Course name is required.', 400);
    }

    const applicationIds = await collectIdsByEqualityColumns(
        adminClient,
        'applications',
        'id',
        ['priority_course', 'alt_course_1', 'alt_course_2'],
        courseName
    );

    if (applicationIds.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .delete()
            .in('id', applicationIds);
        if (error) throw error;
    }

    const enrollmentKeyCount = await countRowsByEquality(adminClient, 'enrolled_students', 'course', courseName);
    if (enrollmentKeyCount > 0) {
        const { error } = await adminClient
            .from('enrolled_students')
            .delete()
            .eq('course', courseName);
        if (error) throw error;
    }

    const studentRowIds = await collectIdsByEqualityColumns(
        adminClient,
        'students',
        'id',
        ['course', 'priority_course', 'alt_course_1', 'alt_course_2'],
        courseName
    );

    if (studentRowIds.length > 0) {
        const { error } = await adminClient
            .from('students')
            .update({
                course: null,
                priority_course: null,
                alt_course_1: null,
                alt_course_2: null
            })
            .in('id', studentRowIds);
        if (error) throw error;
    }

    const { error: deleteCourseError } = await adminClient
        .from('courses')
        .delete()
        .eq('id', courseId);

    if (deleteCourseError) throw deleteCourseError;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted course and NAT dependencies',
        entityTable: 'courses',
        entityId: courseId,
        details: {
            courseName,
            deletedApplicationCount: applicationIds.length,
            deletedEnrollmentKeyCount: enrollmentKeyCount,
            updatedStudentCount: studentRowIds.length
        }
    });

    return {
        success: true,
        deletedCourseId: courseId,
        deletedApplicationCount: applicationIds.length,
        deletedEnrollmentKeyCount: enrollmentKeyCount,
        updatedStudentCount: studentRowIds.length
    };
};

const deleteNatRequirement = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const requirementId = parsePositiveInt(body.requirementId, 'Requirement ID');
    const requirement = await maybeSingleOrThrow(
        adminClient
            .from('nat_requirements')
            .select('id, name')
            .eq('id', requirementId)
            .maybeSingle(),
        'NAT requirement not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('nat_requirements')
        .delete()
        .eq('id', requirementId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted NAT requirement',
        entityTable: 'nat_requirements',
        entityId: requirementId,
        details: {
            requirementName: requirement.name || null
        }
    });

    return {
        success: true,
        deletedRequirementId: requirementId
    };
};

const deleteNatSchedule = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const scheduleId = parsePositiveInt(body.scheduleId, 'Schedule ID');
    const schedule = await maybeSingleOrThrow(
        adminClient
            .from('admission_schedules')
            .select('id, date, venue')
            .eq('id', scheduleId)
            .maybeSingle(),
        'Schedule not found.'
    );

    const assignedApplicantCount = await countRowsByEquality(adminClient, 'applications', 'test_date', schedule.date);
    if (assignedApplicantCount > 0) {
        throw withStatus(
            `Cannot delete ${schedule.date} because ${assignedApplicantCount} applicant${assignedApplicantCount !== 1 ? 's are' : ' is'} already assigned to it.`,
            409
        );
    }

    const { error } = await adminClient
        .from('admission_schedules')
        .delete()
        .eq('id', scheduleId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted NAT schedule',
        entityTable: 'admission_schedules',
        entityId: scheduleId,
        details: {
            scheduleDate: schedule.date || null,
            venue: schedule.venue || null
        }
    });

    return {
        success: true,
        deletedScheduleId: scheduleId
    };
};

const STUDENT_DELETE_DEPENDENCIES = [
    { table: 'counseling_requests', column: 'student_id', label: 'counseling requests' },
    { table: 'support_requests', column: 'student_id', label: 'support requests' },
    { table: 'office_visits', column: 'student_id', label: 'office visit records' },
    { table: 'needs_assessment_submissions', column: 'student_id', label: 'needs assessment submissions' },
    { table: 'scholarship_applications', column: 'student_id', label: 'scholarship applications' },
    { table: 'event_attendance', column: 'student_id', label: 'event attendance records' },
    { table: 'event_feedback', column: 'student_id', label: 'event feedback records' },
    { table: 'general_feedback', column: 'student_id', label: 'general feedback records' },
    { table: 'notifications', column: 'student_id', label: 'notifications' }
] as const;

const deleteStudent = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const studentRowId = parsePositiveInt(body.studentRowId, 'Student row ID');
    const student = await maybeSingleOrThrow(
        adminClient
            .from('students')
            .select('id, student_id, first_name, last_name, auth_user_id')
            .eq('id', studentRowId)
            .maybeSingle(),
        'Student not found.'
    );

    const studentId = String(student.student_id || body.studentId || '').trim();
    if (!studentId) {
        throw withStatus('Student ID is required.', 400);
    }

    const dependencyCounts = await Promise.all(STUDENT_DELETE_DEPENDENCIES.map(async (dependency) => ({
        dependency,
        count: await countRowsByEquality(adminClient, dependency.table, dependency.column, studentId)
    })));
    const dependencyHits = dependencyCounts.flatMap(({ dependency, count }) => (
        count > 0 ? [`${dependency.label} (${count})`] : []
    ));

    if (dependencyHits.length > 0) {
        throw withStatus(
            `Cannot hard-delete this student because linked history exists in ${dependencyHits.join(', ')}. Archive this student instead.`,
            409
        );
    }

    const { error: deleteStudentError } = await adminClient
        .from('students')
        .delete()
        .eq('id', studentRowId);

    if (deleteStudentError) throw deleteStudentError;

    let keyDeletionWarning: string | null = null;
    const { error: deleteKeyError } = await adminClient
        .from('enrolled_students')
        .delete()
        .eq('student_id', studentId);

    if (deleteKeyError) {
        keyDeletionWarning = deleteKeyError.message || 'Enrollment key cleanup failed.';
    }

    const authCleanup = await cleanupLinkedAuthUser(
        adminClient,
        student.auth_user_id ? String(student.auth_user_id).trim() : null
    );

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted student record',
        entityTable: 'students',
        entityId: studentRowId,
        details: {
            studentId,
            studentName: `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student',
            deletedLinkedAuth: authCleanup.deletedLinkedAuth,
            missingLinkedAuth: authCleanup.missingLinkedAuth,
            authCleanupWarning: authCleanup.authCleanupWarning,
            keyDeletionWarning
        }
    });

    return {
        success: true,
        deletedStudentRowId: studentRowId,
        deletedLinkedAuth: authCleanup.deletedLinkedAuth,
        missingLinkedAuth: authCleanup.missingLinkedAuth,
        authCleanupWarning: authCleanup.authCleanupWarning,
        keyDeletionWarning
    };
};

const deleteEnrollmentKey = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const studentId = parseTextIdentifier(body.studentId, 'Student ID');
    const key = await maybeSingleOrThrow(
        adminClient
            .from('enrolled_students')
            .select('student_id, course, status, is_used')
            .eq('student_id', studentId)
            .maybeSingle(),
        'Enrollment key not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { error } = await adminClient
        .from('enrolled_students')
        .delete()
        .eq('student_id', studentId);

    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted enrollment key',
        entityTable: 'enrolled_students',
        entityId: studentId,
        details: {
            course: key.course || null,
            status: key.status || null,
            isUsed: Boolean(key.is_used)
        }
    });

    return {
        success: true,
        deletedStudentId: studentId
    };
};

const deleteForm = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const formId = parsePositiveInt(body.formId, 'Form ID');
    const form = await maybeSingleOrThrow(
        adminClient
            .from('needs_assessment_forms')
            .select('id, title')
            .eq('id', formId)
            .maybeSingle(),
        'Form not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const { data: submissions, error: submissionsError } = await adminClient
        .from('needs_assessment_submissions')
        .select('id')
        .eq('form_id', formId);

    if (submissionsError) throw submissionsError;

    const submissionIds = (submissions || []).flatMap((entry: { id?: number | null }) => {
        const id = Number(entry?.id || 0);
        return Number.isInteger(id) && id > 0 ? [id] : [];
    });

    if (submissionIds.length > 0) {
        const { error: deleteAnswersError } = await adminClient
            .from('needs_assessment_answers')
            .delete()
            .in('submission_id', submissionIds);
        if (deleteAnswersError) throw deleteAnswersError;
    }

    const { error: deleteSubmissionsError } = await adminClient
        .from('needs_assessment_submissions')
        .delete()
        .eq('form_id', formId);
    if (deleteSubmissionsError) throw deleteSubmissionsError;

    const { error: deleteQuestionsError } = await adminClient
        .from('needs_assessment_questions')
        .delete()
        .eq('form_id', formId);
    if (deleteQuestionsError) throw deleteQuestionsError;

    const { error: deleteFormError } = await adminClient
        .from('needs_assessment_forms')
        .delete()
        .eq('id', formId);
    if (deleteFormError) throw deleteFormError;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted form and related submissions',
        entityTable: 'needs_assessment_forms',
        entityId: formId,
        details: {
            formTitle: form.title || null,
            deletedSubmissionCount: submissionIds.length
        }
    });

    return {
        success: true,
        deletedFormId: formId,
        deletedSubmissionCount: submissionIds.length
    };
};

const deleteFormQuestion = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const questionId = parsePositiveInt(body.questionId, 'Question ID');
    const question = await maybeSingleOrThrow(
        adminClient
            .from('needs_assessment_questions')
            .select('id, form_id, question_text')
            .eq('id', questionId)
            .maybeSingle(),
        'Question not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const answerCount = await countRowsByEquality(adminClient, 'needs_assessment_answers', 'question_id', questionId);
    if (answerCount > 0) {
        throw withStatus(
            'Cannot delete a question that already has recorded answers. Delete the whole form instead if a hard delete is truly required.',
            409
        );
    }

    const { error } = await adminClient
        .from('needs_assessment_questions')
        .delete()
        .eq('id', questionId);
    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted form question',
        entityTable: 'needs_assessment_questions',
        entityId: questionId,
        details: {
            formId: question.form_id || null,
            questionText: question.question_text || null
        }
    });

    return {
        success: true,
        deletedQuestionId: questionId
    };
};

const deleteScholarship = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const scholarshipId = parsePositiveInt(body.scholarshipId, 'Scholarship ID');
    const scholarship = await maybeSingleOrThrow(
        adminClient
            .from('scholarships')
            .select('id, title')
            .eq('id', scholarshipId)
            .maybeSingle(),
        'Scholarship not found.'
    );

    // Ordered on purpose: the read above must run before the delete — it captures the
    // row's details for the audit log (the row no longer exists afterwards) and guards existence.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const applicationCount = await countRowsByEquality(adminClient, 'scholarship_applications', 'scholarship_id', scholarshipId);
    if (applicationCount > 0) {
        throw withStatus(
            'Cannot delete a scholarship that already has student applications. Archive or close it instead.',
            409
        );
    }

    const { error } = await adminClient
        .from('scholarships')
        .delete()
        .eq('id', scholarshipId);
    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted scholarship',
        entityTable: 'scholarships',
        entityId: scholarshipId,
        details: {
            scholarshipTitle: scholarship.title || null
        }
    });

    return {
        success: true,
        deletedScholarshipId: scholarshipId
    };
};

const deleteEvent = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const eventId = parsePositiveInt(body.eventId, 'Event ID');
    const [event, attendanceCount, feedbackCount] = await Promise.all([
        maybeSingleOrThrow(
            adminClient
                .from('events')
                .select('id, title, type')
                .eq('id', eventId)
                .maybeSingle(),
            'Event not found.'
        ),
        countRowsByEquality(adminClient, 'event_attendance', 'event_id', eventId),
        countRowsByEquality(adminClient, 'event_feedback', 'event_id', eventId)
    ]);
    if (attendanceCount > 0 || feedbackCount > 0) {
        throw withStatus(
            'Cannot delete an event or announcement that already has attendance or feedback history. Archive it instead.',
            409
        );
    }

    const { error } = await adminClient
        .from('events')
        .delete()
        .eq('id', eventId);
    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted event or announcement',
        entityTable: 'events',
        entityId: eventId,
        details: {
            eventTitle: event.title || null,
            eventType: event.type || null
        }
    });

    return {
        success: true,
        deletedEventId: eventId
    };
};

const deleteOfficeVisitReason = async (adminClient: any, actor: any, body: Record<string, unknown>) => {
    const reasonId = parsePositiveInt(body.reasonId, 'Reason ID');
    const reason = await maybeSingleOrThrow(
        adminClient
            .from('office_visit_reasons')
            .select('id, reason')
            .eq('id', reasonId)
            .maybeSingle(),
        'Office visit reason not found.'
    );

    const usageCount = await countRowsByEquality(adminClient, 'office_visits', 'reason', reason.reason);
    if (usageCount > 0) {
        throw withStatus(
            'Cannot delete a visit reason that already exists in office visit history. Deactivate it instead.',
            409
        );
    }

    const { error } = await adminClient
        .from('office_visit_reasons')
        .delete()
        .eq('id', reasonId);
    if (error) throw error;

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Deleted office visit reason',
        entityTable: 'office_visit_reasons',
        entityId: reasonId,
        details: {
            reason: reason.reason || null
        }
    });

    return {
        success: true,
        deletedReasonId: reasonId
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
            endpoint: 'manage-record-deletions',
            action: mode,
            corsHeaders
        });
        if (rateLimitResponse) return rateLimitResponse;

        const adminClient = getAdminClient();

        if (mode === 'ping') {
            return json({ success: true });
        }

        const actor = await assertDeleteRequest(adminClient, request);

        if (mode === 'delete-nat-application') {
            return json(await deleteNatApplication(adminClient, actor, body));
        }

        if (mode === 'delete-nat-course') {
            return json(await deleteNatCourse(adminClient, actor, body));
        }

        if (mode === 'delete-nat-requirement') {
            return json(await deleteNatRequirement(adminClient, actor, body));
        }

        if (mode === 'delete-nat-schedule') {
            return json(await deleteNatSchedule(adminClient, actor, body));
        }

        if (mode === 'delete-student') {
            return json(await deleteStudent(adminClient, actor, body));
        }

        if (mode === 'delete-enrollment-key') {
            return json(await deleteEnrollmentKey(adminClient, actor, body));
        }

        if (mode === 'delete-form') {
            return json(await deleteForm(adminClient, actor, body));
        }

        if (mode === 'delete-form-question') {
            return json(await deleteFormQuestion(adminClient, actor, body));
        }

        if (mode === 'delete-scholarship') {
            return json(await deleteScholarship(adminClient, actor, body));
        }

        if (mode === 'delete-event') {
            return json(await deleteEvent(adminClient, actor, body));
        }

        if (mode === 'delete-office-visit-reason') {
            return json(await deleteOfficeVisitReason(adminClient, actor, body));
        }

        return json({ success: false, error: 'Unsupported delete mode.' }, 400);
    } catch (error) {
        await captureEdgeException(error, { endpoint: 'manage-record-deletions' });
        const message = error instanceof Error ? error.message : 'Unexpected delete management error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
