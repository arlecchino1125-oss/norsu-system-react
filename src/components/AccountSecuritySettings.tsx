import React from 'react';

const INPUT_CLASS = 'w-full appearance-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] leading-5 text-slate-700 shadow-sm outline-none transition-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 sm:rounded-lg sm:px-3 sm:py-2 sm:text-sm';
const PRIMARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-sky-400 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-2.5';
const SECONDARY_BUTTON_CLASS = 'inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-5 sm:py-2.5';

type OtpRequestResult = {
    maskedEmail?: string;
    expiresInMinutes?: number;
};

type AccountSecuritySettingsProps = {
    currentEmail: string;
    loginLabel: string;
    emailHelperText: string;
    passwordHelperText: string;
    requestOtp: (purpose: 'password_change' | 'email_change', email?: string) => Promise<OtpRequestResult | void>;
    confirmEmailChange: (email: string, otp: string) => Promise<void>;
    confirmPasswordChange: (password: string, otp: string) => Promise<void>;
    showToast?: (message: string, type?: string) => void;
};

export default function AccountSecuritySettings({
    currentEmail,
    loginLabel,
    emailHelperText,
    passwordHelperText,
    requestOtp,
    confirmEmailChange,
    confirmPasswordChange,
    showToast
}: AccountSecuritySettingsProps) {
    const [securityEmail, setSecurityEmail] = React.useState(currentEmail || '');
    const [emailOtp, setEmailOtp] = React.useState('');
    const [passwordOtp, setPasswordOtp] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [emailOtpInfo, setEmailOtpInfo] = React.useState<OtpRequestResult | null>(null);
    const [passwordOtpInfo, setPasswordOtpInfo] = React.useState<OtpRequestResult | null>(null);
    const [isSendingEmailOtp, setIsSendingEmailOtp] = React.useState(false);
    const [isConfirmingEmail, setIsConfirmingEmail] = React.useState(false);
    const [isSendingPasswordOtp, setIsSendingPasswordOtp] = React.useState(false);
    const [isConfirmingPassword, setIsConfirmingPassword] = React.useState(false);

    React.useEffect(() => {
        setSecurityEmail(currentEmail || '');
    }, [currentEmail]);

    const emailOtpHint = emailOtpInfo?.maskedEmail
        ? `OTP sent to ${emailOtpInfo.maskedEmail}${emailOtpInfo.expiresInMinutes ? ` and expires in ${emailOtpInfo.expiresInMinutes} minutes.` : '.'}`
        : '';
    const passwordOtpHint = passwordOtpInfo?.maskedEmail
        ? `OTP sent to ${passwordOtpInfo.maskedEmail}${passwordOtpInfo.expiresInMinutes ? ` and expires in ${passwordOtpInfo.expiresInMinutes} minutes.` : '.'}`
        : '';

    const handleRequestEmailOtp = async () => {
        const normalizedEmail = String(securityEmail || '').trim().toLowerCase();
        if (!normalizedEmail) {
            showToast?.('Email is required.', 'error');
            return;
        }

        setIsSendingEmailOtp(true);
        try {
            const result = await requestOtp('email_change', normalizedEmail);
            setEmailOtpInfo(result || {});
            setEmailOtp('');
            showToast?.('Verification code sent to your new email address.');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to send the email verification code.', 'error');
        } finally {
            setIsSendingEmailOtp(false);
        }
    };

    const handleConfirmEmailChange = async () => {
        const normalizedEmail = String(securityEmail || '').trim().toLowerCase();
        const normalizedOtp = String(emailOtp || '').trim();

        if (!normalizedEmail) {
            showToast?.('Email is required.', 'error');
            return;
        }

        if (!normalizedOtp) {
            showToast?.('Enter the OTP sent to your email.', 'error');
            return;
        }

        setIsConfirmingEmail(true);
        try {
            await confirmEmailChange(normalizedEmail, normalizedOtp);
            setEmailOtp('');
            setEmailOtpInfo(null);
            showToast?.('Email updated successfully!');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to update your email.', 'error');
        } finally {
            setIsConfirmingEmail(false);
        }
    };

    const handleRequestPasswordOtp = async () => {
        setIsSendingPasswordOtp(true);
        try {
            const result = await requestOtp('password_change');
            setPasswordOtpInfo(result || {});
            setPasswordOtp('');
            showToast?.('Verification code sent to your current email.');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to send the password OTP.', 'error');
        } finally {
            setIsSendingPasswordOtp(false);
        }
    };

    const handleConfirmPasswordChange = async () => {
        if (newPassword.length < 8) {
            showToast?.('Password must be at least 8 characters.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast?.('Passwords do not match.', 'error');
            return;
        }

        const normalizedOtp = String(passwordOtp || '').trim();
        if (!normalizedOtp) {
            showToast?.('Enter the OTP sent to your email.', 'error');
            return;
        }

        setIsConfirmingPassword(true);
        try {
            await confirmPasswordChange(newPassword, normalizedOtp);
            setPasswordOtp('');
            setPasswordOtpInfo(null);
            setNewPassword('');
            setConfirmPassword('');
            showToast?.('Password updated successfully!');
        } catch (error: any) {
            showToast?.(error?.message || 'Failed to update your password.', 'error');
        } finally {
            setIsConfirmingPassword(false);
        }
    };

    return (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-100/60 bg-blue-50/40 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">Email</p>
                <p className="mt-2 text-sm font-semibold text-slate-800 break-all">{currentEmail || 'No email yet'}</p>
                <p className="mt-2 text-xs text-slate-500">{emailHelperText}</p>
                <div className="mt-4 space-y-3">
                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">New Email</label>
                        <input
                            type="email"
                            value={securityEmail}
                            onChange={(event) => setSecurityEmail(event.target.value)}
                            className={INPUT_CLASS}
                            placeholder="name@example.com"
                        />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                            type="button"
                            onClick={handleRequestEmailOtp}
                            disabled={isSendingEmailOtp || isConfirmingEmail}
                            className={PRIMARY_BUTTON_CLASS}
                        >
                                        {isSendingEmailOtp ? 'Sending OTP...' : 'Send OTP'}
                        </button>
                    </div>
                    {emailOtpInfo && (
                        <div className="rounded-xl border border-blue-100 bg-white/80 p-4">
                            <p className="text-xs font-medium text-slate-500">{emailOtpHint}</p>
                            <div className="mt-3">
                                <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">OTP Code</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={emailOtp}
                                    onChange={(event) => setEmailOtp(event.target.value)}
                                    className={INPUT_CLASS}
                                    placeholder="Enter 6-digit OTP"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleConfirmEmailChange}
                                disabled={isConfirmingEmail || isSendingEmailOtp}
                                className={`${PRIMARY_BUTTON_CLASS} mt-3`}
                            >
                                {isConfirmingEmail ? 'Confirming Email...' : 'Confirm Email Update'}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Password</p>
                <p className="mt-2 text-xs text-slate-500">{passwordHelperText}</p>
                <div className="mt-4 space-y-3">
                    <button
                        type="button"
                        onClick={handleRequestPasswordOtp}
                        disabled={isSendingPasswordOtp || isConfirmingPassword}
                        className={SECONDARY_BUTTON_CLASS}
                    >
                        {isSendingPasswordOtp ? 'Sending OTP...' : `Send OTP to ${loginLabel}`}
                    </button>
                    {passwordOtpInfo && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-medium text-slate-500">{passwordOtpHint}</p>
                            <div className="mt-3 space-y-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">OTP Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={passwordOtp}
                                        onChange={(event) => setPasswordOtp(event.target.value)}
                                        className={INPUT_CLASS}
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(event) => setNewPassword(event.target.value)}
                                        className={INPUT_CLASS}
                                        placeholder="At least 8 characters"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase text-slate-400">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        className={INPUT_CLASS}
                                        placeholder="Re-enter new password"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleConfirmPasswordChange}
                                disabled={isConfirmingPassword || isSendingPasswordOtp}
                                className={`${SECONDARY_BUTTON_CLASS} mt-3`}
                            >
                                {isConfirmingPassword ? 'Confirming Password...' : 'Confirm Password Change'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
