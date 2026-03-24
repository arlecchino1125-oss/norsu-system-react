import { invokeEdgeFunction } from './invokeEdgeFunction';

export type StudentActivationPolicy = {
    requireEnrollmentKey: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
};

const normalizePolicyResponse = (payload: any): StudentActivationPolicy => ({
    requireEnrollmentKey: payload?.requireEnrollmentKey !== false,
    updatedAt: payload?.updatedAt ? String(payload.updatedAt) : null,
    updatedBy: payload?.updatedBy ? String(payload.updatedBy) : null
});

export const getStudentActivationPolicy = async (): Promise<StudentActivationPolicy> => {
    const payload = await invokeEdgeFunction('manage-staff-accounts', {
        body: {
            mode: 'get-student-activation-policy'
        },
        fallbackMessage: 'Failed to load the student activation policy.'
    });

    return normalizePolicyResponse(payload);
};

export const updateStudentActivationPolicy = async (
    requireEnrollmentKey: boolean
): Promise<StudentActivationPolicy> => {
    const payload = await invokeEdgeFunction('manage-staff-accounts', {
        body: {
            mode: 'update-student-activation-policy',
            requireEnrollmentKey
        },
        requireAuth: true,
        non2xxMessage: 'Your CARE Staff session could not be verified. Please sign in again.',
        fallbackMessage: 'Failed to update the student activation policy.'
    });

    return normalizePolicyResponse(payload);
};
