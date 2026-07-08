import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { recordStaffAuditAction } from '../../../lib/staffAudit';
import {
    getStudentActivationPolicy as fetchStudentActivationPolicy,
    updateStudentActivationPolicy as saveStudentActivationPolicy
} from '../../../lib/studentActivationPolicy';
import type { StudentResetImpact } from '../../shared/StudentDataDangerZoneCard';
import type { AuthSession, ToastHandler } from '../types';

export function useCareStaffGovernance({
    session,
    showToastMessage,
    bumpViewRefreshSignal
}: {
    session?: AuthSession | null;
    showToastMessage: ToastHandler;
    bumpViewRefreshSignal: () => void;
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
        } catch (error: any) {
            showToastMessage('Failed to update the student activation policy.', 'error');
        } finally {
            setIsSavingStudentActivationPolicy(false);
        }
    }, [session, showToastMessage, studentActivationPolicy.requireEnrollmentKey, queryClient]);

    const loadStudentResetImpact = useCallback(async (): Promise<{ impact?: StudentResetImpact; confirmationText?: string }> => {
        return invokeEdgeFunction('manage-student-accounts', {
            body: {
                mode: 'preview-care-student-reset'
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to load the student reset impact.'
        });
    }, []);

    const requestStudentResetOtp = useCallback(async () => {
        return invokeEdgeFunction('manage-student-accounts', {
            body: {
                mode: 'request-care-reset-otp'
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to send the student reset OTP.'
        });
    }, []);

    const confirmStudentReset = useCallback(async (payload: {
        otp: string;
        reason: string;
        confirmationText: string;
    }) => {
        const result = await invokeEdgeFunction('manage-student-accounts', {
            body: {
                mode: 'care-reset-student-data',
                otp: String(payload.otp || '').trim(),
                reason: String(payload.reason || '').trim(),
                confirmationText: String(payload.confirmationText || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to reset student data.'
        });

        bumpViewRefreshSignal();
        return result;
    }, [bumpViewRefreshSignal]);

    return {
        studentActivationPolicy,
        isLoadingStudentActivationPolicy,
        isSavingStudentActivationPolicy,
        loadStudentActivationPolicy,
        toggleStudentActivationPolicy,
        loadStudentResetImpact,
        requestStudentResetOtp,
        confirmStudentReset
    };
}
