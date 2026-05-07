import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';

type ManagedDeleteResponse = {
    success: true;
    [key: string]: unknown;
};

const invokeManagedDelete = <T extends ManagedDeleteResponse = ManagedDeleteResponse>(
    mode: string,
    payload: Record<string, unknown>,
    fallbackMessage: string
) => invokeEdgeFunction<T>('manage-record-deletions', {
    requireAuth: true,
    body: {
        mode,
        ...payload
    },
    fallbackMessage,
    non2xxMessage: fallbackMessage
});

export const managedDeleteService = {
    deleteNatApplication(applicationId: string) {
        return invokeManagedDelete('delete-nat-application', { applicationId }, 'Failed to delete NAT application.');
    },
    deleteNatCourse(courseId: number, courseName?: string | null) {
        return invokeManagedDelete('delete-nat-course', { courseId, courseName }, 'Failed to delete course.');
    },
    deleteNatRequirement(requirementId: number) {
        return invokeManagedDelete('delete-nat-requirement', { requirementId }, 'Failed to delete NAT requirement.');
    },
    deleteNatSchedule(scheduleId: number) {
        return invokeManagedDelete('delete-nat-schedule', { scheduleId }, 'Failed to delete NAT schedule.');
    },
    deleteStudent(studentRowId: number, studentId?: string | null) {
        return invokeManagedDelete('delete-student', { studentRowId, studentId }, 'Failed to delete student.');
    },
    deleteEnrollmentKey(studentId: string) {
        return invokeManagedDelete('delete-enrollment-key', { studentId }, 'Failed to delete enrollment key.');
    },
    deleteForm(formId: number) {
        return invokeManagedDelete('delete-form', { formId }, 'Failed to delete form.');
    },
    deleteFormQuestion(questionId: number) {
        return invokeManagedDelete('delete-form-question', { questionId }, 'Failed to delete question.');
    },
    deleteScholarship(scholarshipId: number | string) {
        return invokeManagedDelete('delete-scholarship', { scholarshipId }, 'Failed to delete scholarship.');
    },
    deleteEvent(eventId: number | string) {
        return invokeManagedDelete('delete-event', { eventId }, 'Failed to delete event.');
    },
    deleteOfficeVisitReason(reasonId: number | string) {
        return invokeManagedDelete('delete-office-visit-reason', { reasonId }, 'Failed to delete office visit reason.');
    }
};
