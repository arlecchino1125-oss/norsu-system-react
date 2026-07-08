import { useCallback } from 'react';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { recordStaffAuditAction } from '../../../lib/staffAudit';
import type { AuthSession } from '../types';

export function useCareStaffAccountSecurity({
    session,
    updateSession
}: {
    session?: AuthSession | null;
    updateSession?: (updates: any) => void;
}) {
    const syncStaffSession = useCallback((patch: Record<string, unknown>) => {
        updateSession?.((prev: any) => ({
            ...(prev || {}),
            ...(patch || {}),
            user: {
                ...(prev?.user || {}),
                ...((patch as any)?.user || {})
            }
        }));
    }, [updateSession]);

    const requestStaffSecurityOtp = useCallback(async (
        purpose: 'password_change' | 'email_change',
        nextEmailValue?: string
    ) => {
        return invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'request-security-otp',
                purpose,
                email: purpose === 'email_change'
                    ? String(nextEmailValue || '').trim().toLowerCase()
                    : undefined
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to send the security OTP.'
        });
    }, []);

    const confirmStaffSecurityEmailChange = useCallback(async (nextEmailValue: string, otp: string) => {
        const normalizedEmail = String(nextEmailValue || '').trim().toLowerCase();
        if (!normalizedEmail) {
            throw new Error('Email is required.');
        }

        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'confirm-email-change',
                email: normalizedEmail,
                otp: String(otp || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to update your staff login email.'
        });

        syncStaffSession({
            email: normalizedEmail,
            auth_email: normalizedEmail,
            user: {
                ...(session?.user || {}),
                email: normalizedEmail
            }
        });
        void recordStaffAuditAction(session, {
            action: 'Updated staff login email',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: {
                summary: `${session?.full_name || 'CARE Staff'} updated the staff login email.`,
                email: normalizedEmail
            }
        }).catch((error) => {
            console.error('Failed to record staff email audit log:', error);
        });
    }, [session, syncStaffSession]);

    const confirmStaffPasswordChange = useCallback(async (nextPasswordValue: string, otp: string) => {
        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'confirm-password-change',
                password: String(nextPasswordValue || ''),
                otp: String(otp || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to update your staff password.'
        });
        void recordStaffAuditAction(session, {
            action: 'Updated staff password',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: {
                summary: `${session?.full_name || 'CARE Staff'} updated the staff password.`
            }
        }).catch((error) => {
            console.error('Failed to record staff password audit log:', error);
        });
    }, [session]);

    const updateStaffProfileName = useCallback(async (nextNameValue: string) => {
        const normalizedName = String(nextNameValue || '').trim().replace(/\s+/g, ' ');
        if (normalizedName.length < 2) {
            throw new Error('A valid profile name is required.');
        }

        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'update-self-profile',
                payload: {
                    full_name: normalizedName
                }
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to update your staff profile.'
        });

        syncStaffSession({
            full_name: normalizedName
        });
        void recordStaffAuditAction(session, {
            action: 'Updated staff profile name',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: {
                summary: `${session?.full_name || 'CARE Staff'} updated the staff profile name to ${normalizedName}.`,
                full_name: normalizedName
            }
        }).catch((error) => {
            console.error('Failed to record staff profile audit log:', error);
        });
    }, [session, syncStaffSession]);

    return {
        requestStaffSecurityOtp,
        confirmStaffSecurityEmailChange,
        confirmStaffPasswordChange,
        updateStaffProfileName
    };
}
