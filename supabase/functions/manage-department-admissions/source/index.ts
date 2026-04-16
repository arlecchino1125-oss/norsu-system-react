import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { requirePermission } from '../../_shared/permissionCheck.ts';
import { writeStaffAuditLog } from '../../_shared/staffAuditLog.ts';

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

const SCHEDULABLE_APPLICATION_STATUSES = [
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview'
];

const INTERVIEW_QUEUE_STATUSES = [
    'Absent'
];

const DECISION_READY_APPLICATION_STATUSES = [
    'Interview Scheduled'
];

const getServiceRoleKey = () => {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
        throw new Error('Missing Supabase service role configuration.');
    }

    return serviceRoleKey;
};

type DepartmentApplicationRow = {
    id: string;
    reference_id?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
    priority_course?: string | null;
    alt_course_1?: string | null;
    alt_course_2?: string | null;
    current_choice?: number | string | null;
    status?: string | null;
    interview_date?: string | null;
    interview_venue?: string | null;
    interview_panel?: string | null;
    interview_queue_status?: string | null;
};

type DepartmentCourseNames = Set<string>;

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
    await requirePermission(getServiceRoleKey(), role, 'function', 'manage-department-admissions');

    const department = String(staffAccount?.department || '').trim();
    if (!department) {
        throw withStatus('A department assignment is required for this action.', 403);
    }

    return {
        authUser,
        staffAccountId: String(staffAccount?.id || '').trim() || null,
        role,
        displayName: String(
            staffAccount?.full_name
            || staffAccount?.username
            || role
            || department
        ).trim() || department || role,
        department
    };
};

const getDepartmentCourseNames = async (
    adminClient: any,
    departmentName: string
): Promise<DepartmentCourseNames> => {
    const { data: departmentRow, error: departmentError } = await adminClient
        .from('departments')
        .select('id')
        .eq('name', departmentName)
        .maybeSingle();

    if (departmentError) throw departmentError;
    if (!departmentRow?.id) {
        throw withStatus(`Department "${departmentName}" was not found.`, 404);
    }

    const { data: courses, error: coursesError } = await adminClient
        .from('courses')
        .select('name')
        .eq('department_id', departmentRow.id);

    if (coursesError) throw coursesError;

    return new Set(
        (courses || [])
            .map((course: { name?: string | null }) => String(course.name || '').trim())
            .filter(Boolean)
    );
};

const getApplicationById = async (adminClient: any, applicationId: string): Promise<DepartmentApplicationRow> => {
    const { data: application, error } = await adminClient
        .from('applications')
        .select('id, reference_id, first_name, last_name, email, priority_course, alt_course_1, alt_course_2, current_choice, status, interview_date, interview_venue, interview_panel, interview_queue_status')
        .eq('id', applicationId)
        .maybeSingle();

    if (error) throw error;
    if (!application?.id) {
        throw withStatus('Application not found.', 404);
    }

    return application as DepartmentApplicationRow;
};

const getApplicationsByIds = async (
    adminClient: any,
    applicationIds: string[]
): Promise<DepartmentApplicationRow[]> => {
    if (applicationIds.length === 0) {
        return [];
    }

    const { data, error } = await adminClient
        .from('applications')
        .select('id, reference_id, first_name, last_name, email, priority_course, alt_course_1, alt_course_2, current_choice, status, interview_date, interview_venue, interview_panel, interview_queue_status')
        .in('id', applicationIds);

    if (error) throw error;
    return (data || []) as DepartmentApplicationRow[];
};

const getRoutedCourseName = (application: DepartmentApplicationRow) => {
    const currentChoice = Number(application?.current_choice || 1);
    if (currentChoice === 2) return String(application?.alt_course_1 || '').trim() || null;
    if (currentChoice === 3) return String(application?.alt_course_2 || '').trim() || null;
    return String(application?.priority_course || '').trim() || null;
};

const isApplicationInDepartmentQueue = (
    courseNames: DepartmentCourseNames,
    application: DepartmentApplicationRow
): boolean => {
    const routedCourse = getRoutedCourseName(application);
    return Boolean(routedCourse && courseNames.has(routedCourse));
};

const assertApplicationIsInDepartmentQueue = async (
    adminClient: any,
    departmentName: string,
    application: DepartmentApplicationRow
): Promise<void> => {
    const courseNames: DepartmentCourseNames = await getDepartmentCourseNames(adminClient, departmentName);
    if (!isApplicationInDepartmentQueue(courseNames, application)) {
        throw withStatus('This application is not currently routed to your department.', 403);
    }
};

const assertApplicationHasAllowedStatus = (
    application: DepartmentApplicationRow,
    allowedStatuses: string[],
    actionLabel: string
) => {
    const currentStatus = String(application?.status || '').trim();
    if (!allowedStatuses.includes(currentStatus)) {
        throw withStatus(
            `This applicant can no longer be used for ${actionLabel}. Current status: ${currentStatus || 'Unknown'}.`,
            409
        );
    }
};

const normalizeApplicationIds = (applicationIds: unknown) => {
    if (!Array.isArray(applicationIds)) {
        return [] as string[];
    }

    return Array.from(new Set(
        applicationIds
            .map((value) => String(value || '').trim())
            .filter(Boolean)
    ));
};

const normalizeOptionalText = (value: unknown) => {
    const text = String(value || '').trim();
    return text || null;
};

const normalizeInterviewQueueStatus = (queueStatus: unknown) => {
    const nextQueueStatus = String(queueStatus || '').trim();
    if (!INTERVIEW_QUEUE_STATUSES.includes(nextQueueStatus)) {
        throw new Error('A valid interview queue status is required.');
    }

    return nextQueueStatus;
};

const getBulkDecisionReadyApplications = async (
    adminClient: any,
    department: string,
    applicationIds: string[],
    actionLabel: string
) => {
    const courseNames: DepartmentCourseNames = await getDepartmentCourseNames(adminClient, department);
    const applications: DepartmentApplicationRow[] = await getApplicationsByIds(adminClient, applicationIds);
    const applicationsById = new Map<string, DepartmentApplicationRow>(
        applications.map((application) => [String(application.id), application])
    );
    const eligibleApplications: DepartmentApplicationRow[] = [];
    const skipped: Array<Record<string, unknown>> = [];

    applicationIds.forEach((applicationId) => {
        const application = applicationsById.get(applicationId);

        if (!application) {
            skipped.push({
                applicationId,
                reason: 'Application not found.'
            });
            return;
        }

        if (!isApplicationInDepartmentQueue(courseNames, application)) {
            skipped.push({
                applicationId,
                referenceId: application.reference_id || null,
                reason: 'Application is not routed to your department.'
            });
            return;
        }

        const currentStatus = String(application.status || '').trim();
        if (!DECISION_READY_APPLICATION_STATUSES.includes(currentStatus)) {
            skipped.push({
                applicationId,
                referenceId: application.reference_id || null,
                currentStatus,
                reason: `This applicant can no longer be used for ${actionLabel}. Current status: ${currentStatus || 'Unknown'}.`
            });
            return;
        }

        eligibleApplications.push(application);
    });

    return {
        eligibleApplications,
        skipped
    };
};

const scheduleDepartmentApplications = async (
    adminClient: any,
    department: string,
    applicationIds: string[],
    date: string,
    time: string,
    venue: string | null,
    panel: string | null
) => {
    const interviewDate = `${date} ${time}`;
    const courseNames: DepartmentCourseNames = await getDepartmentCourseNames(adminClient, department);
    const applications: DepartmentApplicationRow[] = await getApplicationsByIds(adminClient, applicationIds);
    const applicationsById = new Map<string, DepartmentApplicationRow>(
        applications.map((application) => [String(application.id), application])
    );
    const scheduledIds: string[] = [];
    const skipped: Array<Record<string, unknown>> = [];

    applicationIds.forEach((applicationId) => {
        const application = applicationsById.get(applicationId);

        if (!application) {
            skipped.push({
                applicationId,
                reason: 'Application not found.'
            });
            return;
        }

        if (!isApplicationInDepartmentQueue(courseNames, application)) {
            skipped.push({
                applicationId,
                referenceId: application.reference_id || null,
                reason: 'Application is not routed to your department.'
            });
            return;
        }

        const currentStatus = String(application.status || '').trim();
        if (!SCHEDULABLE_APPLICATION_STATUSES.includes(currentStatus)) {
            skipped.push({
                applicationId,
                referenceId: application.reference_id || null,
                currentStatus,
                reason: `Current status is ${currentStatus || 'Unknown'}.`
            });
            return;
        }

        scheduledIds.push(applicationId);
    });

    if (scheduledIds.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .update({
                status: 'Interview Scheduled',
                interview_date: interviewDate,
                interview_venue: venue,
                interview_panel: panel,
                interview_queue_status: null
            })
            .in('id', scheduledIds);

        if (error) throw error;
    }

    return {
        interviewDate,
        scheduledIds,
        scheduledApplications: applications.filter((application: any) => scheduledIds.includes(String(application.id))),
        skipped
    };
};

const scheduleInterview = async (
    adminClient: any,
    request: Request,
    applicationId: unknown,
    date: unknown,
    time: unknown,
    venue: unknown,
    panel: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationId = String(applicationId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextVenue = normalizeOptionalText(venue);
    const nextPanel = normalizeOptionalText(panel);

    if (!nextApplicationId) {
        throw new Error('Application ID is required.');
    }

    if (!nextDate || !nextTime) {
        throw new Error('Interview date and time are required.');
    }

    const result = await scheduleDepartmentApplications(
        adminClient,
        department,
        [nextApplicationId],
        nextDate,
        nextTime,
        nextVenue,
        nextPanel
    );

    if (result.scheduledIds.length === 0) {
        throw withStatus(String(result.skipped[0]?.reason || 'This applicant can no longer be scheduled.'), 409);
    }

    const response = {
        success: true,
        applicationId: nextApplicationId,
        status: 'Interview Scheduled',
        interviewDate: result.interviewDate,
        interviewVenue: nextVenue,
        interviewPanel: nextPanel
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Scheduled applicant interview',
        entityTable: 'applications',
        entityId: nextApplicationId,
        details: {
            summary: `${actor.displayName} scheduled an interview for an applicant in ${department}.`,
            status: 'Interview Scheduled',
            interview_date: result.interviewDate,
            interview_venue: nextVenue,
            interview_panel: nextPanel
        }
    });

    return response;
};

const bulkScheduleInterviews = async (
    adminClient: any,
    request: Request,
    applicationIds: unknown,
    date: unknown,
    time: unknown,
    venue: unknown,
    panel: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationIds = normalizeApplicationIds(applicationIds);
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextVenue = normalizeOptionalText(venue);
    const nextPanel = normalizeOptionalText(panel);

    if (nextApplicationIds.length === 0) {
        throw new Error('At least one application ID is required.');
    }

    if (!nextDate || !nextTime) {
        throw new Error('Interview date and time are required.');
    }

    const result = await scheduleDepartmentApplications(
        adminClient,
        department,
        nextApplicationIds,
        nextDate,
        nextTime,
        nextVenue,
        nextPanel
    );

    const response = {
        success: true,
        scheduledCount: result.scheduledIds.length,
        scheduledIds: result.scheduledIds,
        skipped: result.skipped,
        status: 'Interview Scheduled',
        interviewDate: result.interviewDate,
        interviewVenue: nextVenue,
        interviewPanel: nextPanel
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Bulk scheduled applicant interviews',
        entityTable: 'applications',
        details: {
            summary: `${actor.displayName} scheduled ${result.scheduledIds.length} applicant interview${result.scheduledIds.length === 1 ? '' : 's'} for ${department}.`,
            scheduled_count: result.scheduledIds.length,
            scheduled_ids: result.scheduledIds,
            interview_date: result.interviewDate,
            interview_venue: nextVenue,
            interview_panel: nextPanel
        }
    });

    return response;
};

const rescheduleInterview = async (
    adminClient: any,
    request: Request,
    applicationId: unknown,
    date: unknown,
    time: unknown,
    venue: unknown,
    panel: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationId = String(applicationId || '').trim();
    const nextDate = String(date || '').trim();
    const nextTime = String(time || '').trim();
    const nextVenue = normalizeOptionalText(venue);
    const nextPanel = normalizeOptionalText(panel);

    if (!nextApplicationId) {
        throw new Error('Application ID is required.');
    }

    if (!nextDate || !nextTime) {
        throw new Error('Interview date and time are required.');
    }

    const application = await getApplicationById(adminClient, nextApplicationId);
    await assertApplicationIsInDepartmentQueue(adminClient, department, application);
    assertApplicationHasAllowedStatus(application, DECISION_READY_APPLICATION_STATUSES, 'rescheduling');
    if (String(application?.interview_queue_status || '').trim() !== 'Absent') {
        throw withStatus('Only applicants marked absent can be rescheduled.', 409);
    }

    const interviewDate = `${nextDate} ${nextTime}`;
    const { error } = await adminClient
        .from('applications')
        .update({
            status: 'Interview Scheduled',
            interview_date: interviewDate,
            interview_venue: nextVenue,
            interview_panel: nextPanel,
            interview_queue_status: null
        })
        .eq('id', application.id);

    if (error) throw error;

    const response = {
        success: true,
        applicationId: application.id,
        status: 'Interview Scheduled',
        interviewDate,
        interviewVenue: nextVenue,
        interviewPanel: nextPanel
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Rescheduled applicant interview',
        entityTable: 'applications',
        entityId: application.id,
        details: {
            summary: `${actor.displayName} rescheduled an applicant interview for ${department}.`,
            reference_id: application.reference_id,
            status: 'Interview Scheduled',
            interview_date: interviewDate,
            interview_venue: nextVenue,
            interview_panel: nextPanel
        }
    });

    return response;
};

const setInterviewQueueStatus = async (
    adminClient: any,
    request: Request,
    applicationId: unknown,
    queueStatus: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationId = String(applicationId || '').trim();
    const nextQueueStatus = normalizeInterviewQueueStatus(queueStatus);

    if (!nextApplicationId) {
        throw new Error('Application ID is required.');
    }

    const application = await getApplicationById(adminClient, nextApplicationId);
    await assertApplicationIsInDepartmentQueue(adminClient, department, application);
    assertApplicationHasAllowedStatus(application, DECISION_READY_APPLICATION_STATUSES, 'interview queue updates');

    const { error } = await adminClient
        .from('applications')
        .update({
            interview_date: null,
            interview_queue_status: nextQueueStatus
        })
        .eq('id', application.id);

    if (error) throw error;

    const response = {
        success: true,
        applicationId: application.id,
        status: application.status,
        interviewDate: null,
        interviewQueueStatus: nextQueueStatus
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Updated interview queue status',
        entityTable: 'applications',
        entityId: application.id,
        details: {
            summary: `${actor.displayName} marked an applicant as ${nextQueueStatus} in the interview queue for ${department}.`,
            reference_id: application.reference_id,
            interview_queue_status: nextQueueStatus
        }
    });

    return response;
};

const approveApplication = async (adminClient: any, request: Request, applicationId: unknown) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationId = String(applicationId || '').trim();
    if (!nextApplicationId) {
        throw new Error('Application ID is required.');
    }

    const application = await getApplicationById(adminClient, nextApplicationId);
    await assertApplicationIsInDepartmentQueue(adminClient, department, application);
    assertApplicationHasAllowedStatus(application, DECISION_READY_APPLICATION_STATUSES, 'approval');

    const { error } = await adminClient
        .from('applications')
        .update({
            status: 'Approved for Enrollment',
            interview_queue_status: null
        })
        .eq('id', application.id);

    if (error) throw error;

    const response = {
        success: true,
        applicationId: application.id,
        status: 'Approved for Enrollment'
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Approved applicant for enrollment',
        entityTable: 'applications',
        entityId: application.id,
        details: {
            summary: `${actor.displayName} approved an applicant for enrollment in ${department}.`,
            reference_id: application.reference_id,
            status: 'Approved for Enrollment'
        }
    });

    return response;
};

const bulkApproveApplications = async (
    adminClient: any,
    request: Request,
    applicationIds: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationIds = normalizeApplicationIds(applicationIds);
    if (nextApplicationIds.length === 0) {
        throw new Error('At least one application ID is required.');
    }

    const { eligibleApplications, skipped } = await getBulkDecisionReadyApplications(
        adminClient,
        department,
        nextApplicationIds,
        'bulk approval'
    );
    const updatedIds = eligibleApplications.map((application: any) => String(application.id));

    if (updatedIds.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .update({
                status: 'Approved for Enrollment',
                interview_queue_status: null
            })
            .in('id', updatedIds);

        if (error) throw error;

    }

    const response = {
        success: true,
        updatedCount: updatedIds.length,
        updatedIds,
        skipped,
        status: 'Approved for Enrollment'
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Bulk approved applicants for enrollment',
        entityTable: 'applications',
        details: {
            summary: `${actor.displayName} approved ${updatedIds.length} applicant${updatedIds.length === 1 ? '' : 's'} for enrollment in ${department}.`,
            updated_count: updatedIds.length,
            updated_ids: updatedIds
        }
    });

    return response;
};

const rejectOrForwardApplication = async (adminClient: any, request: Request, applicationId: unknown) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationId = String(applicationId || '').trim();
    if (!nextApplicationId) {
        throw new Error('Application ID is required.');
    }

    const application = await getApplicationById(adminClient, nextApplicationId);
    await assertApplicationIsInDepartmentQueue(adminClient, department, application);
    assertApplicationHasAllowedStatus(application, DECISION_READY_APPLICATION_STATUSES, 'rejection');

    const currentChoice = Number(application.current_choice || 1);
    const nextChoice = currentChoice + 1;
    let nextStatus = 'Application Unsuccessful';

    if (nextChoice === 2 && String(application.alt_course_1 || '').trim()) {
        nextStatus = 'Forwarded to 2nd Choice for Interview';
    } else if (nextChoice === 3 && String(application.alt_course_2 || '').trim()) {
        nextStatus = 'Forwarded to 3rd Choice for Interview';
    }

    const { error } = await adminClient
        .from('applications')
        .update({
            status: nextStatus,
            current_choice: nextChoice,
            interview_queue_status: null
        })
        .eq('id', application.id);

    if (error) throw error;

    const response = {
        success: true,
        applicationId: application.id,
        status: nextStatus,
        currentChoice: nextChoice
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: nextStatus === 'Application Unsuccessful'
            ? 'Marked applicant unsuccessful'
            : 'Forwarded applicant to next choice',
        entityTable: 'applications',
        entityId: application.id,
        details: {
            summary: `${actor.displayName} ${nextStatus === 'Application Unsuccessful' ? 'marked an applicant as unsuccessful' : 'forwarded an applicant to the next course choice'} in ${department}.`,
            reference_id: application.reference_id,
            status: nextStatus,
            current_choice: nextChoice
        }
    });

    return response;
};

const bulkForwardApplications = async (
    adminClient: any,
    request: Request,
    applicationIds: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationIds = normalizeApplicationIds(applicationIds);
    if (nextApplicationIds.length === 0) {
        throw new Error('At least one application ID is required.');
    }

    const { eligibleApplications, skipped } = await getBulkDecisionReadyApplications(
        adminClient,
        department,
        nextApplicationIds,
        'bulk forwarding'
    );

    const forwardToSecondChoice = eligibleApplications.filter((application: any) => {
        const nextChoice = Number(application.current_choice || 1) + 1;
        return nextChoice === 2 && String(application.alt_course_1 || '').trim();
    });
    const forwardToThirdChoice = eligibleApplications.filter((application: any) => {
        const nextChoice = Number(application.current_choice || 1) + 1;
        return nextChoice === 3 && String(application.alt_course_2 || '').trim();
    });

    eligibleApplications.forEach((application: any) => {
        const nextChoice = Number(application.current_choice || 1) + 1;
        const hasNextChoice = (
            (nextChoice === 2 && String(application.alt_course_1 || '').trim())
            || (nextChoice === 3 && String(application.alt_course_2 || '').trim())
        );

        if (!hasNextChoice) {
            skipped.push({
                applicationId: application.id,
                referenceId: application.reference_id || null,
                reason: 'This applicant has no next course choice to forward to.'
            });
        }
    });

    if (forwardToSecondChoice.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .update({
                status: 'Forwarded to 2nd Choice for Interview',
                current_choice: 2,
                interview_queue_status: null
            })
            .in('id', forwardToSecondChoice.map((application: any) => application.id));

        if (error) throw error;
    }

    if (forwardToThirdChoice.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .update({
                status: 'Forwarded to 3rd Choice for Interview',
                current_choice: 3,
                interview_queue_status: null
            })
            .in('id', forwardToThirdChoice.map((application: any) => application.id));

        if (error) throw error;
    }

    const updatedIds = [
        ...forwardToSecondChoice.map((application: any) => String(application.id)),
        ...forwardToThirdChoice.map((application: any) => String(application.id))
    ];

    const response = {
        success: true,
        updatedCount: updatedIds.length,
        updatedIds,
        skipped
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Bulk forwarded applicants to next choice',
        entityTable: 'applications',
        details: {
            summary: `${actor.displayName} forwarded ${updatedIds.length} applicant${updatedIds.length === 1 ? '' : 's'} to the next course choice in ${department}.`,
            updated_count: updatedIds.length,
            updated_ids: updatedIds
        }
    });

    return response;
};

const bulkMarkApplicationsUnsuccessful = async (
    adminClient: any,
    request: Request,
    applicationIds: unknown
) => {
    const actor = await assertDepartmentHeadRequest(adminClient, request);
    const { department } = actor;
    const nextApplicationIds = normalizeApplicationIds(applicationIds);
    if (nextApplicationIds.length === 0) {
        throw new Error('At least one application ID is required.');
    }

    const { eligibleApplications, skipped } = await getBulkDecisionReadyApplications(
        adminClient,
        department,
        nextApplicationIds,
        'bulk unsuccessful marking'
    );
    const updatedIds = eligibleApplications.map((application: any) => String(application.id));

    if (updatedIds.length > 0) {
        const { error } = await adminClient
            .from('applications')
            .update({
                status: 'Application Unsuccessful',
                interview_queue_status: null
            })
            .in('id', updatedIds);

        if (error) throw error;

    }

    const response = {
        success: true,
        updatedCount: updatedIds.length,
        updatedIds,
        skipped,
        status: 'Application Unsuccessful'
    };

    await writeStaffAuditLog(adminClient, actor, {
        action: 'Bulk marked applicants unsuccessful',
        entityTable: 'applications',
        details: {
            summary: `${actor.displayName} marked ${updatedIds.length} applicant${updatedIds.length === 1 ? '' : 's'} as unsuccessful in ${department}.`,
            updated_count: updatedIds.length,
            updated_ids: updatedIds
        }
    });

    return response;
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

        if (mode === 'schedule-interview') {
            return json(await scheduleInterview(adminClient, request, body.applicationId, body.date, body.time, body.venue, body.panel));
        }

        if (mode === 'bulk-schedule-interviews') {
            return json(await bulkScheduleInterviews(adminClient, request, body.applicationIds, body.date, body.time, body.venue, body.panel));
        }

        if (mode === 'reschedule-interview') {
            return json(await rescheduleInterview(adminClient, request, body.applicationId, body.date, body.time, body.venue, body.panel));
        }

        if (mode === 'approve-application') {
            return json(await approveApplication(adminClient, request, body.applicationId));
        }

        if (mode === 'bulk-approve-applications') {
            return json(await bulkApproveApplications(adminClient, request, body.applicationIds));
        }

        if (mode === 'reject-application') {
            return json(await rejectOrForwardApplication(adminClient, request, body.applicationId));
        }

        if (mode === 'bulk-forward-applications') {
            return json(await bulkForwardApplications(adminClient, request, body.applicationIds));
        }

        if (mode === 'bulk-mark-unsuccessful-applications') {
            return json(await bulkMarkApplicationsUnsuccessful(adminClient, request, body.applicationIds));
        }

        if (mode === 'set-interview-queue-status') {
            return json(await setInterviewQueueStatus(adminClient, request, body.applicationId, body.queueStatus));
        }

        return json({ success: false, error: 'Unsupported department admissions mode.' }, 400);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected department admissions error.';
        const status = typeof (error as { status?: unknown })?.status === 'number'
            ? Number((error as { status?: unknown }).status)
            : 400;
        return json({ success: false, error: message }, status);
    }
});
