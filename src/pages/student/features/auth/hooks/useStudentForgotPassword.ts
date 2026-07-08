import { useEffect, useState } from 'react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { isValidEmailDomain } from '../../../../../utils/inputSecurity';

type StudentLoginMethod = 'studentId' | 'email';

type ForgotPasswordOtpInfo = {
    message?: string;
    expiresInMinutes?: number;
};

type UseStudentForgotPasswordOptions = {
    showToast: (message: string, type?: string) => void;
    onPasswordResetConfirmed: (method: StudentLoginMethod, identifier: string) => void;
};

const FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_MS = 3 * 60 * 1000;

export function useStudentForgotPassword({
    showToast,
    onPasswordResetConfirmed
}: UseStudentForgotPasswordOptions) {
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
    const [forgotPasswordMethod, setForgotPasswordMethod] = useState<StudentLoginMethod>('studentId');
    const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState<string>('');
    const [forgotPasswordOtp, setForgotPasswordOtp] = useState<string>('');
    const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState<string>('');
    const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState<string>('');
    const [showForgotPasswordNewPassword, setShowForgotPasswordNewPassword] = useState<boolean>(false);
    const [showForgotPasswordConfirmPassword, setShowForgotPasswordConfirmPassword] = useState<boolean>(false);
    const [forgotPasswordOtpInfo, setForgotPasswordOtpInfo] = useState<ForgotPasswordOtpInfo | null>(null);
    const [forgotPasswordResendAvailableAt, setForgotPasswordResendAvailableAt] = useState<number | null>(null);
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
    const [isRequestingForgotPasswordOtp, setIsRequestingForgotPasswordOtp] = useState<boolean>(false);
    const [isResettingForgotPassword, setIsResettingForgotPassword] = useState<boolean>(false);

    const forgotPasswordFieldLabel = forgotPasswordMethod === 'email' ? 'Email' : 'Student ID';
    const forgotPasswordOtpHint = forgotPasswordOtpInfo
        ? `${forgotPasswordOtpInfo.message || 'If the account exists, a verification code has been sent to the registered email.'}${forgotPasswordOtpInfo.expiresInMinutes ? ` The code expires in ${forgotPasswordOtpInfo.expiresInMinutes} minutes.` : ''}`
        : '';
    const forgotPasswordResendSecondsRemaining = forgotPasswordResendAvailableAt
        ? Math.max(0, Math.ceil((forgotPasswordResendAvailableAt - currentTimeMs) / 1000))
        : 0;
    const isForgotPasswordResendCoolingDown = forgotPasswordResendSecondsRemaining > 0;
    const forgotPasswordResendCountdown = `${Math.floor(forgotPasswordResendSecondsRemaining / 60)}:${String(forgotPasswordResendSecondsRemaining % 60).padStart(2, '0')}`;

    useEffect(() => {
        if (!forgotPasswordResendAvailableAt) return;

        const updateCountdown = () => {
            const now = Date.now();
            setCurrentTimeMs(now);
            if (now >= forgotPasswordResendAvailableAt) {
                setForgotPasswordResendAvailableAt(null);
            }
        };

        updateCountdown();
        const intervalId = window.setInterval(updateCountdown, 1000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [forgotPasswordResendAvailableAt]);

    const resetForgotPasswordForm = (preserveIdentifier = false) => {
        if (!preserveIdentifier) {
            setForgotPasswordIdentifier('');
        }
        setForgotPasswordOtp('');
        setForgotPasswordNewPassword('');
        setForgotPasswordConfirmPassword('');
        setForgotPasswordOtpInfo(null);
        setForgotPasswordResendAvailableAt(null);
    };

    const openForgotPasswordModal = (method: StudentLoginMethod, identifier: string) => {
        setForgotPasswordMethod(method);
        setForgotPasswordIdentifier(String(identifier || '').trim());
        setForgotPasswordOtp('');
        setForgotPasswordNewPassword('');
        setForgotPasswordConfirmPassword('');
        setForgotPasswordOtpInfo(null);
        setForgotPasswordResendAvailableAt(null);
        setShowForgotPasswordModal(true);
    };

    const closeForgotPasswordModal = () => {
        setShowForgotPasswordModal(false);
        resetForgotPasswordForm();
    };

    const selectForgotPasswordMethod = (method: StudentLoginMethod) => {
        setForgotPasswordMethod(method);
        setForgotPasswordOtpInfo(null);
        setForgotPasswordOtp('');
        setForgotPasswordResendAvailableAt(null);
    };

    const handleRequestForgotPasswordOtp = async () => {
        if (isForgotPasswordResendCoolingDown) {
            return;
        }

        const trimmedIdentifier = String(forgotPasswordIdentifier || '').trim();
        if (!trimmedIdentifier) {
            showToast(`Please enter your ${forgotPasswordFieldLabel.toLowerCase()} first so we can find your account.`, 'error');
            return;
        }

        if (forgotPasswordMethod === 'email') {
            if (!isValidEmailDomain(trimmedIdentifier)) {
                showToast(`Please enter a valid email address (e.g., name@example.com).`, 'error');
                return;
            }
        }

        setIsRequestingForgotPasswordOtp(true);
        try {
            const result = await invokeEdgeFunction('manage-student-accounts', {
                body: {
                    mode: 'request-forgot-password-otp',
                    identifier: trimmedIdentifier,
                    loginMode: forgotPasswordMethod
                },
                fallbackMessage: 'Failed to send the password reset code.'
            });

            setForgotPasswordOtpInfo({
                message: result?.message,
                expiresInMinutes: result?.expiresInMinutes
            });
            setForgotPasswordOtp('');
            const now = Date.now();
            setCurrentTimeMs(now);
            setForgotPasswordResendAvailableAt(now + FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_MS);
        } catch (error: any) {
            showToast('We could not send the reset code at this time. Please try again later.', 'error');
        } finally {
            setIsRequestingForgotPasswordOtp(false);
        }
    };

    const handleConfirmForgotPasswordReset = async () => {
        const trimmedIdentifier = String(forgotPasswordIdentifier || '').trim();
        const trimmedOtp = String(forgotPasswordOtp || '').trim();

        if (!trimmedIdentifier) {
            showToast(`Please enter your ${forgotPasswordFieldLabel.toLowerCase()} so we can verify your account.`, 'error');
            return;
        }

        if (!trimmedOtp) {
            showToast('Please enter the verification code that we sent to your email.', 'error');
            return;
        }

        if (forgotPasswordNewPassword.length < 8) {
            showToast('For your security, please choose a password that is at least 8 characters long.', 'error');
            return;
        }

        if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
            showToast('The passwords you entered do not match. Please check and try again.', 'error');
            return;
        }

        setIsResettingForgotPassword(true);
        try {
            await invokeEdgeFunction('manage-student-accounts', {
                body: {
                    mode: 'confirm-forgot-password-reset',
                    identifier: trimmedIdentifier,
                    loginMode: forgotPasswordMethod,
                    otp: trimmedOtp,
                    password: forgotPasswordNewPassword
                },
                fallbackMessage: 'Failed to reset your password.'
            });

            onPasswordResetConfirmed(forgotPasswordMethod, trimmedIdentifier);
            setShowForgotPasswordModal(false);
            resetForgotPasswordForm();
            showToast('Password updated. Sign in with your new password.', 'success');
        } catch (error: any) {
            showToast(error?.message || 'We were unable to reset your password. Please try again.', 'error');
        } finally {
            setIsResettingForgotPassword(false);
        }
    };

    return {
        showForgotPasswordModal,
        forgotPasswordMethod,
        forgotPasswordFieldLabel,
        forgotPasswordIdentifier,
        forgotPasswordOtp,
        forgotPasswordNewPassword,
        forgotPasswordConfirmPassword,
        showForgotPasswordNewPassword,
        showForgotPasswordConfirmPassword,
        forgotPasswordOtpInfo,
        forgotPasswordOtpHint,
        isForgotPasswordResendCoolingDown,
        isRequestingForgotPasswordOtp,
        isResettingForgotPassword,
        forgotPasswordResendCountdown,
        openForgotPasswordModal,
        closeForgotPasswordModal,
        selectForgotPasswordMethod,
        setForgotPasswordIdentifier,
        setForgotPasswordOtp,
        setForgotPasswordNewPassword,
        setForgotPasswordConfirmPassword,
        toggleForgotPasswordNewPassword: () => setShowForgotPasswordNewPassword((current) => !current),
        toggleForgotPasswordConfirmPassword: () => setShowForgotPasswordConfirmPassword((current) => !current),
        handleRequestForgotPasswordOtp,
        handleConfirmForgotPasswordReset
    };
}
