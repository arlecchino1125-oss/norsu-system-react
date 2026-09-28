export const COUNSELING_QUEUE_STATUSES = ['Approved'] as const;
export const COUNSELING_COMPLETABLE_STATUSES = ['Scheduled', 'Rescheduled'] as const;

export const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

export function assertDeptStatusAllowed(
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

export function buildDeptRejectUpdate(notes?: string | null) {
    return {
        status: 'Returned_To_Care' as const,
        resolution_notes: notes?.trim() || null
    };
}
