export const CARE_SCHEDULABLE_COUNSELING_STATUSES = ['Referred', 'Returned_To_Care'] as const;
export const CARE_COMPLETABLE_COUNSELING_STATUSES = ['Scheduled', 'Staff_Scheduled', 'Rescheduled'] as const;
export const CARE_APPROVABLE_COUNSELING_STATUSES = ['Submitted', 'Pending'] as const;
export const CARE_REJECTABLE_COUNSELING_STATUSES = ['Submitted', 'Pending', 'Returned_To_Care'] as const;
export const CARE_OUTCOME_ELIGIBLE_STATUSES = ['Completed'] as const;
export const CARE_ALLOWED_OUTCOMES = ['Counseled', 'Monitoring', 'Subject_For_2nd_Counseling'] as const;
export const CARE_RESCHEDULABLE_STATUSES = ['Completed', 'Rescheduled'] as const;
export const CARE_FOLLOW_UP_ELIGIBLE_STATUSES = [
    'Completed',
    'Counseled',
    'Monitoring',
    'Subject_For_2nd_Counseling'
] as const;

export const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

export function assertCareStatusAllowed(
    currentStatus: unknown,
    allowedStatuses: readonly string[],
    actionLabel: string
): void {
    const status = String(currentStatus || '').trim();
    if (!allowedStatuses.includes(status)) {
        throw withStatus(
            `This record can no longer be used for ${actionLabel}. Current status: ${status || 'Unknown'}.`,
            409
        );
    }
}

export function validateOutcomeStatus(outcomeStatus: unknown): (typeof CARE_ALLOWED_OUTCOMES)[number] {
    const normalized = String(outcomeStatus || '').trim();
    if (!CARE_ALLOWED_OUTCOMES.includes(normalized as any)) {
        throw withStatus(
            `Invalid outcome status: ${normalized}. Must be one of: ${CARE_ALLOWED_OUTCOMES.join(', ')}.`,
            400
        );
    }
    return normalized as (typeof CARE_ALLOWED_OUTCOMES)[number];
}

export function assertNoExistingFollowUp(
    existingChildren: Array<{ id: number | string; status?: string | null }> | null | undefined
): void {
    const active = (existingChildren || []).filter((child) => child && child.status !== 'Rejected');
    if (active.length > 0) {
        throw withStatus(
            'A follow-up counseling session has already been created for this request.',
            409
        );
    }
}

export interface FollowUpOptions {
    date?: string | null;
    time?: string | null;
    notes?: string | null;
    actorName?: string | null;
}

export function buildFollowUpInsertPayload(
    parent: {
        id: number | string;
        student_id?: string | null;
        student_name?: string | null;
        department?: string | null;
        course_year?: string | null;
        contact_number?: string | null;
        description?: string | null;
        reason_for_referral?: string | null;
    },
    options: FollowUpOptions
) {
    const hasSchedule = Boolean(options.date?.trim() && options.time?.trim());
    const scheduledDate = hasSchedule ? `${options.date!.trim()} ${options.time!.trim()}` : null;
    const status = hasSchedule ? 'Staff_Scheduled' : 'Referred';

    return {
        follow_up_of: Number(parent.id),
        request_type: 'Follow-up Counseling',
        student_id: parent.student_id || null,
        student_name: parent.student_name || null,
        department: parent.department || null,
        course_year: parent.course_year || null,
        contact_number: parent.contact_number || null,
        description: options.notes?.trim() || parent.description || parent.reason_for_referral || 'Follow-up counseling session',
        status,
        scheduled_date: scheduledDate,
        referred_by: options.actorName || 'CARE Staff'
    };
}
