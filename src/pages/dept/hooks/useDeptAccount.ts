import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { recordStaffAuditAction } from '../../../lib/staffAudit';

const syncStaffSession = (patch: Record<string, unknown>) => {
    // Simple session sync to mimic `updateSession` if it's missing in AuthContext
    // though `updateSession` is now standard in `useAuth()` hook for all portals.
};

const requestStaffSecurityOtp = async (purpose: 'password_change' | 'email_change', nextEmailValue?: string) => {
    return invokeEdgeFunction('manage-staff-accounts', {
        body: {
            mode: 'request-security-otp',
            purpose,
            email: purpose === 'email_change' ? String(nextEmailValue || '').trim().toLowerCase() : undefined
        },
        requireAuth: true,
        non2xxMessage: 'Your Department session could not be verified. Sign in again.',
        fallbackMessage: 'Failed to send the security OTP.'
    });
};

export function useDeptAccount({ session, data, setData, showToastMessage }: any) {
    const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
    const [profileForm, setProfileForm] = useState<any>({ name: '' });
    const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    const handleProfileSubmit = async (e: any) => {
        e.preventDefault();
        if (isUpdatingProfile) return;
        setIsUpdatingProfile(true);
        try {
            const { error } = await supabase
                .from('staff_accounts')
                .update({
                    full_name: profileForm.name
                })
                .eq('id', session.id);

            if (error) throw error;

            setData((prev: any) => ({
                ...prev,
                profile: { ...prev.profile, name: profileForm.name }
            }));

            void recordStaffAuditAction(session, {
                action: 'Updated department profile name',
                entityTable: 'staff_accounts',
                entityId: session?.id,
                details: {
                    summary: `${session?.full_name || 'Department Head'} updated the department profile name to ${profileForm.name}.`,
                    full_name: profileForm.name
                }
            }).catch((error) => {
                console.error('Failed to record department profile audit log:', error);
            });
            setShowProfileModal(false);
            showToastMessage('Profile updated.');
        } catch (err: any) {
            showToastMessage(`Error updating profile: ${err?.message || 'Unknown error.'}`, 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const confirmStaffSecurityEmailChange = async (nextEmailValue: string, otp: string) => {
        const normalizedEmail = String(nextEmailValue || '').trim().toLowerCase();
        if (!normalizedEmail) throw new Error('Email is required.');

        await invokeEdgeFunction('manage-staff-accounts', {
            body: { mode: 'confirm-email-change', email: normalizedEmail, otp: String(otp || '').trim() },
            requireAuth: true,
            non2xxMessage: 'Your session could not be verified.',
            fallbackMessage: 'Failed to update login email.'
        });

        void recordStaffAuditAction(session, {
            action: 'Updated staff login email',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: { summary: `${session?.full_name || 'Staff'} updated their login email.`, email: normalizedEmail }
        }).catch(err => console.error(err));
    };

    const confirmStaffPasswordChange = async (nextPasswordValue: string, otp: string) => {
        await invokeEdgeFunction('manage-staff-accounts', {
            body: { mode: 'confirm-password-change', password: String(nextPasswordValue || ''), otp: String(otp || '').trim() },
            requireAuth: true,
            non2xxMessage: 'Your session could not be verified.',
            fallbackMessage: 'Failed to update password.'
        });

        void recordStaffAuditAction(session, {
            action: 'Updated staff password',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: { summary: `${session?.full_name || 'Staff'} updated their password.` }
        }).catch(err => console.error(err));
    };

    const updateStaffProfileName = async (nextNameValue: string) => {
        const normalizedName = String(nextNameValue || '').trim().replace(/\s+/g, ' ');
        if (normalizedName.length < 2) throw new Error('A valid profile name is required.');

        await invokeEdgeFunction('manage-staff-accounts', {
            body: { mode: 'update-self-profile', payload: { full_name: normalizedName } },
            requireAuth: true,
            non2xxMessage: 'Your session could not be verified.',
            fallbackMessage: 'Failed to update profile.'
        });

        setData((prev: any) => ({ ...prev, profile: { ...prev.profile, name: normalizedName } }));
        void recordStaffAuditAction(session, {
            action: 'Updated staff profile name',
            entityTable: 'staff_accounts',
            entityId: session?.id,
            details: { summary: `${session?.full_name || 'Staff'} updated profile name to ${normalizedName}.`, full_name: normalizedName }
        }).catch(err => console.error(err));
    };

    return {
        showProfileModal, setShowProfileModal,
        profileForm, setProfileForm,
        isUpdatingProfile,
        isRefreshingData, setIsRefreshingData,
        handleProfileSubmit,
        requestStaffSecurityOtp,
        confirmStaffSecurityEmailChange,
        confirmStaffPasswordChange,
        updateStaffProfileName
    };
}
