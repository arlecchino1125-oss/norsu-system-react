export const COUNSELING_STATUS = {
    PENDING: 'Pending',
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    RETURNED_TO_CARE: 'Returned_To_Care',
    REFERRED: 'Referred',
    STAFF_SCHEDULED: 'Staff_Scheduled',
    SCHEDULED: 'Scheduled',
    RESCHEDULED: 'Rescheduled',
    COMPLETED: 'Completed',
    COUNSELED: 'Counseled',
    MONITORING: 'Monitoring',
    SUBJECT_FOR_2ND_COUNSELING: 'Subject_For_2nd_Counseling',
    REJECTED: 'Rejected'
} as const;

export const SUPPORT_STATUS = {
    PENDING: 'Pending',
    SUBMITTED: 'Submitted',
    FORWARDED_TO_DEPT: 'Forwarded to Dept',
    VISIT_SCHEDULED: 'Visit Scheduled',
    RESOLVED_BY_DEPT: 'Resolved by Dept',
    REFERRED_TO_CARE: 'Referred to CARE',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    APPROVED: 'Approved'
} as const;

export const COUNSELING_AWAITING_CARE_STATUSES = [
    COUNSELING_STATUS.SUBMITTED,
    COUNSELING_STATUS.PENDING
] as const;

// Semantics changed in v2: previously [Submitted, Pending]; now [Approved] as CARE approves first before department review
export const COUNSELING_AWAITING_DEPT_STATUSES = [
    COUNSELING_STATUS.APPROVED
] as const;

export const COUNSELING_RETURNED_STATUSES = [
    COUNSELING_STATUS.RETURNED_TO_CARE
] as const;

export const COUNSELING_WITH_CARE_STAFF_STATUSES = [
    COUNSELING_STATUS.REFERRED,
    COUNSELING_STATUS.STAFF_SCHEDULED,
    COUNSELING_STATUS.RETURNED_TO_CARE
] as const;

export const COUNSELING_OUTCOME_STATUSES = [
    COUNSELING_STATUS.COUNSELED,
    COUNSELING_STATUS.MONITORING,
    COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING
] as const;

export const COUNSELING_SESSION_DONE_STATUSES = [
    COUNSELING_STATUS.COMPLETED,
    ...COUNSELING_OUTCOME_STATUSES
] as const;

export const COUNSELING_CALENDAR_STATUSES = [
    COUNSELING_STATUS.SCHEDULED,
    COUNSELING_STATUS.STAFF_SCHEDULED,
    COUNSELING_STATUS.RESCHEDULED
] as const;

export const CARE_STAFF_ACTIVE_COUNSELING_STATUSES = [
    ...COUNSELING_AWAITING_CARE_STATUSES,
    ...COUNSELING_AWAITING_DEPT_STATUSES,
    ...COUNSELING_RETURNED_STATUSES,
    COUNSELING_STATUS.REFERRED,
    COUNSELING_STATUS.STAFF_SCHEDULED,
    COUNSELING_STATUS.SCHEDULED,
    COUNSELING_STATUS.RESCHEDULED
] as const;

export const CARE_STAFF_COUNSELING_ACTIVITY_STATUSES = [
    ...CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    ...COUNSELING_OUTCOME_STATUSES,
    COUNSELING_STATUS.COMPLETED,
    COUNSELING_STATUS.REJECTED
] as const;

const CARE_STAFF_SUPPORT_QUEUE_STATUSES = [
    SUPPORT_STATUS.SUBMITTED,
    SUPPORT_STATUS.FORWARDED_TO_DEPT
] as const;

export const CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES = [
    SUPPORT_STATUS.VISIT_SCHEDULED,
    SUPPORT_STATUS.RESOLVED_BY_DEPT,
    SUPPORT_STATUS.REFERRED_TO_CARE,
    SUPPORT_STATUS.REJECTED,
    SUPPORT_STATUS.APPROVED
] as const;

export const CARE_STAFF_SUPPORT_MONITORING_STATUSES = [
    ...CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES,
    SUPPORT_STATUS.COMPLETED
] as const;

export const CARE_STAFF_ACTIVE_SUPPORT_STATUSES = [
    ...CARE_STAFF_SUPPORT_QUEUE_STATUSES,
    SUPPORT_STATUS.VISIT_SCHEDULED,
    SUPPORT_STATUS.RESOLVED_BY_DEPT,
    SUPPORT_STATUS.REFERRED_TO_CARE
] as const;

export const DEPT_SUPPORT_VISIBLE_STATUSES = [
    SUPPORT_STATUS.FORWARDED_TO_DEPT,
    SUPPORT_STATUS.VISIT_SCHEDULED,
    SUPPORT_STATUS.RESOLVED_BY_DEPT,
    SUPPORT_STATUS.REFERRED_TO_CARE,
    SUPPORT_STATUS.REJECTED,
    SUPPORT_STATUS.APPROVED,
    SUPPORT_STATUS.COMPLETED
] as const;

const matchesStatus = (statuses: readonly string[], status?: string | null) =>
    Boolean(status) && statuses.includes(status);

export const isCounselingAwaitingCare = (status?: string | null) =>
    matchesStatus(COUNSELING_AWAITING_CARE_STATUSES, status);

export const isCounselingAwaitingDept = (status?: string | null) =>
    matchesStatus(COUNSELING_AWAITING_DEPT_STATUSES, status);

export const isCounselingReturnedToCare = (status?: string | null) =>
    matchesStatus(COUNSELING_RETURNED_STATUSES, status);

export const isCareStaffCounselingApprovable = (status?: string | null) =>
    matchesStatus(COUNSELING_AWAITING_CARE_STATUSES, status);

export const isCareStaffCounselingRejectable = (status?: string | null) =>
    matchesStatus([...COUNSELING_AWAITING_CARE_STATUSES, ...COUNSELING_RETURNED_STATUSES], status);

export const isCareStaffCounselingSchedulable = (status?: string | null) =>
    status === COUNSELING_STATUS.REFERRED || status === COUNSELING_STATUS.RETURNED_TO_CARE;

export const isCounselingSessionDone = (status?: string | null) =>
    matchesStatus(COUNSELING_SESSION_DONE_STATUSES, status);

export const isCounselingOutcomeStatus = (status?: string | null) =>
    matchesStatus(COUNSELING_OUTCOME_STATUSES, status);

export const isCounselingReschedulable = (status?: string | null) =>
    status === COUNSELING_STATUS.COMPLETED || status === COUNSELING_STATUS.RESCHEDULED;

export const isCounselingFollowUpEligible = (status?: string | null) =>
    matchesStatus(COUNSELING_SESSION_DONE_STATUSES, status);

export const isWithCareStaffCounseling = (status?: string | null) =>
    matchesStatus(COUNSELING_WITH_CARE_STAFF_STATUSES, status);

export const isCounselingCalendarVisible = (status?: string | null) =>
    matchesStatus(COUNSELING_CALENDAR_STATUSES, status);

export const getCounselingScheduledDate = (
    request?: { scheduled_date?: string | null; schedule_date?: string | null } | null
) => request?.scheduled_date ?? request?.schedule_date ?? null;

export const isCareStaffSupportQueue = (status?: string | null) =>
    matchesStatus(CARE_STAFF_SUPPORT_QUEUE_STATUSES, status);

export const isCareStaffSupportDeptUpdate = (status?: string | null) =>
    matchesStatus(CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES, status);

export const isDeptSupportCompleted = (status?: string | null) =>
    matchesStatus(
        [
            SUPPORT_STATUS.RESOLVED_BY_DEPT,
            SUPPORT_STATUS.REFERRED_TO_CARE,
            SUPPORT_STATUS.REJECTED,
            SUPPORT_STATUS.APPROVED,
            SUPPORT_STATUS.COMPLETED
        ],
        status
    );
