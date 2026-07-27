import { useEffect, useState } from 'react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { isValidEmailDomain } from '../../../../../utils/inputSecurity';
import type { StudentLoginMethod } from '../../../types';

type ForgotPasswordOtpInfo = {
    message?: string;
    expiresInMinutes?: number;
};

// 'link' is the default: a one-click link with a 60 minute window survives the Gmail deferrals
// that were killing 10-minute typed codes before students could use them.
export type StudentForgotPasswordDelivery = 'link' | 'code';

type UseStudentForgotPasswordOptions = {
    showToast: (message: string, type?: string) => void;
    onPasswordResetConfirmed: (method: StudentLoginMethod, identifier: string) => void;
};

const FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const FORGOT_PASSWORD_COOLDOWN_STORAGE_PREFIX = 'norsu.forgotPasswordOtpCooldown.';

// The cooldown is keyed by identifier and persisted because it used to live only in component
// state: a page refresh or reopening the modal cleared it, letting one student spend all three
// server-side OTP allowances inside a minute. That burst is what trips Gmail's per-recipient
// throttling, which defers the codes past their expiry so they arrive already dead.
const cooldownStorageKey = (identifier: string) =>
    `${FORGOT_PASSWORD_COOLDOWN_STORAGE_PREFIX}${identifier.trim().toLowerCase()}`;

// Deadlines in the past read back as null, so expired entries need no cleanup pass.
const readCooldownDeadline = (identifier: string): number | null => {
    if (!identifier.trim()) return null;
    try {
        const stored = Number(window.localStorage.getItem(cooldownStorageKey(identifier)));
        return Number.isFinite(stored) && stored > Date.now() ? stored : null;
    } catch {
        return null;
    }
};

const writeCooldownDeadline = (identifier: string, deadline: number) => {
    if (!identifier.trim()) return;
    try {
        window.localStorage.setItem(cooldownStorageKey(identifier), String(deadline));
    } catch {
        // ponytail: private-mode / quota failures fall back to the in-memory cooldown
    }
};

export function useStudentForgotPassword({
    showToast,
    onPasswordResetConfirmed
}: UseStudentForgotPasswordOptions) {
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
    const [forgotPasswordMethod, setForgotPasswordMethod] = useState<StudentLoginMethod>('studentId');
    const [forgotPasswordDelivery, setForgotPasswordDelivery] = useState<StudentForgotPasswordDelivery>('link');
    const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState<string>('');
    const [forgotPasswordOtp, setForgotPasswordOtp] = useState<string>('');
    const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState<string>('');
    const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState<string>('');
    const [showForgotPasswordNewPassword, setShowForgotPasswordNewPassword] = useState<boolean>(false);
    const [showForgotPasswordConfirmPassword, setShowForgotPasswordConfirmPassword] = useState<boolean>(false);
    const [forgotPasswordOtpInfo, setForgotPasswordOtpInfo] = useState<ForgotPasswordOtpInfo | null>(null);
    const [currentTimeMs, setCurrentTimeMs] = useState(() => Date.now());
    const [isRequestingForgotPasswordOtp, setIsRequestingForgotPasswordOtp] = useState<boolean>(false);
    const [isResettingForgotPassword, setIsResettingForgotPassword] = useState<boolean>(false);

    const forgotPasswordFieldLabel = forgotPasswordMethod === 'email' ? 'Email' : 'Student ID';
    const isForgotPasswordLinkDelivery = forgotPasswordDelivery === 'link';
    const forgotPasswordSentNoun = isForgotPasswordLinkDelivery ? 'link' : 'code';
    const forgotPasswordOtpHint = forgotPasswordOtpInfo
        ? `${forgotPasswordOtpInfo.message || `If the account exists, a password reset ${forgotPasswordSentNoun} has been sent to the registered email.`}${forgotPasswordOtpInfo.expiresInMinutes ? ` The ${forgotPasswordSentNoun} expires in ${forgotPasswordOtpInfo.expiresInMinutes} minutes.` : ''}`
        : '';
    // Derived from storage rather than mirrored into state: the deadline has to outlive both this
    // component and the page, and deriving it keeps "which account is in the field" and "is that
    // account cooling down" from ever drifting apart. Expired deadlines read back as null.
    const forgotPasswordResendAvailableAt = readCooldownDeadline(forgotPasswordIdentifier);
    const forgotPasswordResendSecondsRemaining = forgotPasswordResendAvailableAt
        ? Math.max(0, Math.ceil((forgotPasswordResendAvailableAt - currentTimeMs) / 1000))
        : 0;
    const isForgotPasswordResendCoolingDown = forgotPasswordResendSecondsRemaining > 0;
    const forgotPasswordResendCountdown = `${Math.floor(forgotPasswordResendSecondsRemaining / 60)}:${String(forgotPasswordResendSecondsRemaining % 60).padStart(2, '0')}`;

    // Ticking the clock re-derives the deadline, so the countdown stops on its own once it lapses.
    useEffect(() => {
        if (!forgotPasswordResendAvailableAt) return;

        const intervalId = window.setInterval(() => setCurrentTimeMs(Date.now()), 1000);

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
    };

    const openForgotPasswordModal = (method: StudentLoginMethod, identifier: string) => {
        setForgotPasswordMethod(method);
        setForgotPasswordDelivery('link');
        setForgotPasswordIdentifier(String(identifier || '').trim());
        setForgotPasswordOtp('');
        setForgotPasswordNewPassword('');
        setForgotPasswordConfirmPassword('');
        setForgotPasswordOtpInfo(null);
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
    };

    // Deliberately leaves the cooldown alone. It is derived from the identifier, so toggling
    // delivery cannot buy an extra send — which matters because the server shares one
    // rate-limit bucket across both modes.
    const selectForgotPasswordDelivery = (delivery: StudentForgotPasswordDelivery) => {
        setForgotPasswordDelivery(delivery);
        setForgotPasswordOtpInfo(null);
        setForgotPasswordOtp('');
    };

    const applyResendCooldown = (identifier: string) => {
        writeCooldownDeadline(identifier, Date.now() + FORGOT_PASSWORD_OTP_RESEND_COOLDOWN_MS);
        // Strictly increasing so the clock never lands on its previous value, which would let
        // React skip the re-render that reads the deadline back out of storage.
        setCurrentTimeMs((previous) => Math.max(previous + 1, Date.now()));
    };

    const handleRequestForgotPasswordSend = async () => {
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
                    mode: isForgotPasswordLinkDelivery
                        ? 'request-forgot-password-link'
                        : 'request-forgot-password-otp',
                    identifier: trimmedIdentifier,
                    loginMode: forgotPasswordMethod
                },
                fallbackMessage: isForgotPasswordLinkDelivery
                    ? 'Failed to send the password reset link.'
                    : 'Failed to send the password reset code.'
            });

            setForgotPasswordOtpInfo({
                message: result?.message,
                expiresInMinutes: result?.expiresInMinutes
            });
            setForgotPasswordOtp('');
            applyResendCooldown(trimmedIdentifier);
        } catch (error: any) {
            // A 429 carries the limiter's own "wait 15 minutes" text. Swallowing it behind a
            // generic failure is what kept students clicking, so surface it and start a cooldown
            // instead of leaving the button live to collect more 429s.
            if (error?.status === 429) {
                applyResendCooldown(trimmedIdentifier);
                showToast(
                    error?.message || 'Too many reset requests. Please wait a few minutes and try again.',
                    'error'
                );
                return;
            }
            showToast(
                isForgotPasswordLinkDelivery
                    ? 'We could not send the reset link at this time. Please try again later.'
                    : 'We could not send the reset code at this time. Please try again later.',
                'error'
            );
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
        forgotPasswordDelivery,
        isForgotPasswordLinkDelivery,
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
        selectForgotPasswordDelivery,
        setForgotPasswordIdentifier,
        setForgotPasswordOtp,
        setForgotPasswordNewPassword,
        setForgotPasswordConfirmPassword,
        toggleForgotPasswordNewPassword: () => setShowForgotPasswordNewPassword((current) => !current),
        toggleForgotPasswordConfirmPassword: () => setShowForgotPasswordConfirmPassword((current) => !current),
        handleRequestForgotPasswordSend,
        handleConfirmForgotPasswordReset
    };
}
