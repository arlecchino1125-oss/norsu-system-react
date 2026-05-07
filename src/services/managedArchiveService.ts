import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';

type ManagedArchiveResponse = {
    success: true;
    [key: string]: unknown;
};

const invokeManagedArchive = <T extends ManagedArchiveResponse = ManagedArchiveResponse>(
    mode: string,
    payload: Record<string, unknown>,
    fallbackMessage: string
) => invokeEdgeFunction<T>('manage-record-archives', {
    requireAuth: true,
    body: {
        mode,
        ...payload
    },
    fallbackMessage,
    non2xxMessage: fallbackMessage
});

export const managedArchiveService = {
    archiveNatApplication(applicationId: string) {
        return invokeManagedArchive('archive-nat-application', { applicationId }, 'Failed to archive NAT application.');
    },
    setNatCourseStatus(courseId: number, status: 'Open' | 'Closed') {
        return invokeManagedArchive('set-nat-course-status', { courseId, status }, 'Failed to update course status.');
    },
    deactivateNatRequirement(requirementId: number) {
        return invokeManagedArchive('deactivate-nat-requirement', { requirementId }, 'Failed to deactivate NAT requirement.');
    },
    setNatScheduleActive(scheduleId: number, isActive: boolean) {
        return invokeManagedArchive('set-nat-schedule-active', { scheduleId, isActive }, 'Failed to update NAT schedule.');
    },
    archiveStudent(studentRowId: number, studentId?: string | null, reason?: string | null, note?: string | null) {
        return invokeManagedArchive(
            'archive-student',
            { studentRowId, studentId, reason, note },
            'Failed to archive student.'
        );
    },
    restoreStudent(studentRowId: number, studentId?: string | null) {
        return invokeManagedArchive(
            'restore-student',
            { studentRowId, studentId },
            'Failed to restore student.'
        );
    },
    revokeEnrollmentKey(studentId: string) {
        return invokeManagedArchive('revoke-enrollment-key', { studentId }, 'Failed to revoke enrollment key.');
    },
    deactivateForm(formId: number) {
        return invokeManagedArchive('deactivate-form', { formId }, 'Failed to deactivate form.');
    },
    closeScholarship(scholarshipId: number | string) {
        return invokeManagedArchive('close-scholarship', { scholarshipId }, 'Failed to close scholarship.');
    },
    archiveEvent(eventId: number | string) {
        return invokeManagedArchive('archive-event', { eventId }, 'Failed to archive event.');
    },
    deactivateOfficeVisitReason(reasonId: number | string) {
        return invokeManagedArchive('deactivate-office-visit-reason', { reasonId }, 'Failed to deactivate office visit reason.');
    }
};
