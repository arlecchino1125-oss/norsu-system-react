import { useEffect, useState } from 'react';
import AccountSecuritySettings from '../../components/AccountSecuritySettings';

type StaffAccountSecurityPageProps = {
    portalLabel: string;
    authEmail: string;
    staffName?: string;
    staffRole?: string;
    staffDepartment?: string;
    requestStaffSecurityOtp: (purpose: 'password_change' | 'email_change', email?: string) => Promise<any>;
    confirmStaffSecurityEmailChange: (email: string, otp: string) => Promise<void>;
    confirmStaffPasswordChange: (password: string, otp: string) => Promise<void>;
    updateStaffProfileName?: (name: string) => Promise<void>;
    showToast?: (message: string, type?: string) => void;
};

export default function StaffAccountSecurityPage({
    portalLabel,
    authEmail,
    staffName,
    staffRole,
    staffDepartment,
    requestStaffSecurityOtp,
    confirmStaffSecurityEmailChange,
    confirmStaffPasswordChange,
    updateStaffProfileName,
    showToast
}: StaffAccountSecurityPageProps) {
    const [profileName, setProfileName] = useState(staffName || portalLabel);
    const [isSavingProfileName, setIsSavingProfileName] = useState(false);

    useEffect(() => {
        setProfileName(staffName || portalLabel);
    }, [staffName, portalLabel]);

    const handleSaveProfileName = async () => {
        if (!updateStaffProfileName) return;

        setIsSavingProfileName(true);
        try {
            await updateStaffProfileName(profileName);
            showToast?.('Profile name updated successfully.');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to update your profile name.', 'error');
        } finally {
            setIsSavingProfileName(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-6 text-white shadow-lg shadow-purple-900/20">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-200/70">Profile & Settings</p>
                <div className="mt-4 flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-lg font-black shadow-lg">
                        {(staffName || portalLabel).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-2xl font-bold tracking-tight">{staffName || portalLabel}</h2>
                        <p className="mt-1 text-sm text-purple-100/75">
                            {[staffRole, staffDepartment].filter(Boolean).join(' • ') || portalLabel}
                        </p>
                        <p className="mt-3 text-xs text-purple-100/75 break-all">
                            Email: <span className="font-semibold text-white">{authEmail || 'Not set'}</span>
                        </p>
                    </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm text-purple-50/80">
                    Manage your {portalLabel} profile, account security, and account-level preferences from one place.
                </p>
                <div className="mt-5 max-w-xl rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                    <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.18em] text-purple-100/70">Profile Name</label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                            type="text"
                            value={profileName}
                            onChange={(event) => setProfileName(event.target.value)}
                            className="flex-1 rounded-xl border border-white/15 bg-white/95 px-4 py-3 text-sm font-semibold text-slate-800 outline-none ring-0 transition-all focus:border-purple-300"
                            placeholder="Enter your display name"
                        />
                        <button
                            type="button"
                            onClick={handleSaveProfileName}
                            disabled={isSavingProfileName}
                            className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-purple-700 transition-all hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isSavingProfileName ? 'Saving...' : 'Save Name'}
                        </button>
                    </div>
                </div>
            </div>
            <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
                <h2 className="text-xl font-bold text-slate-900">Account Security</h2>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Keep your {portalLabel} account secure. Any change to your email or password now requires a one-time password sent through email.
                </p>
                <AccountSecuritySettings
                    currentEmail={authEmail}
                    loginLabel="your current email"
                    emailHelperText={`Update your ${portalLabel} email here. The OTP will be sent to the new email address before the change is applied.`}
                    passwordHelperText={`Choose a new password for your ${portalLabel} account. An OTP will be sent to your current email before the password change is accepted.`}
                    requestOtp={requestStaffSecurityOtp}
                    confirmEmailChange={confirmStaffSecurityEmailChange}
                    confirmPasswordChange={confirmStaffPasswordChange}
                    showToast={showToast}
                />
            </div>
        </div>
    );
}
