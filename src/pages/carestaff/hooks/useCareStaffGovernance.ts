import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { recordStaffAuditAction } from '../../../lib/staffAudit';
import {
    getStudentActivationPolicy as fetchStudentActivationPolicy,
    updateStudentActivationPolicy as saveStudentActivationPolicy
} from '../../../lib/studentActivationPolicy';
import type { AuthSession, ToastHandler } from '../types';

export function useCareStaffGovernance({
    session,
    showToastMessage
}: {
    session?: AuthSession | null;
    showToastMessage: ToastHandler;
}) {
    const queryClient = useQueryClient();
    const [isSavingStudentActivationPolicy, setIsSavingStudentActivationPolicy] = useState(false);

    // ponytail: cache activation policy to ensure no component amnesia on tab switches
    const { data: studentActivationPolicy = {
        requireEnrollmentKey: true,
        updatedAt: null as string | null,
        updatedBy: null as string | null
    }, isLoading: isLoadingStudentActivationPolicy, refetch: loadStudentActivationPolicy } = useQuery({
        queryKey: ['student-activation-policy'],
        queryFn: async () => {
            return fetchStudentActivationPolicy();
        },
        staleTime: 60000
    });

    const toggleStudentActivationPolicy = useCallback(async () => {
        const nextRequireEnrollmentKey = !studentActivationPolicy.requireEnrollmentKey;

        setIsSavingStudentActivationPolicy(true);
        try {
            const updatedPolicy = await saveStudentActivationPolicy(nextRequireEnrollmentKey);
            queryClient.setQueryData(['student-activation-policy'], updatedPolicy);
            showToastMessage(
                nextRequireEnrollmentKey
                    ? 'Student Portal activation now requires an uploaded enrollment key.'
                    : 'Student Portal activation can now continue after a warning even without an uploaded enrollment key.'
            );
            void recordStaffAuditAction(session, {
                action: 'Updated student activation policy',
                entityTable: 'student_activation_settings',
                details: {
                    summary: `${session?.full_name || 'CARE Staff'} ${nextRequireEnrollmentKey ? 'enabled' : 'disabled'} required enrollment keys before student activation.`,
                    require_enrollment_key: nextRequireEnrollmentKey
                }
            }).catch((error) => {
                console.error('Failed to record activation policy audit log:', error);
            });
        } catch {
            showToastMessage('Failed to update the student activation policy.', 'error');
        } finally {
            setIsSavingStudentActivationPolicy(false);
        }
    }, [session, showToastMessage, studentActivationPolicy.requireEnrollmentKey, queryClient]);

    return {
        studentActivationPolicy,
        isLoadingStudentActivationPolicy,
        isSavingStudentActivationPolicy,
        loadStudentActivationPolicy,
        toggleStudentActivationPolicy
    };
}
