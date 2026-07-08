import { Eye, EyeOff, Lock, Mail, User, X } from 'lucide-react';
import { motion } from 'framer-motion';

export type StudentLoginMethod = 'studentId' | 'email';

type ForgotPasswordOtpInfo = {
    message?: string;
    expiresInMinutes?: number;
};

type ForgotPasswordModalProps = {
    method: StudentLoginMethod;
    fieldLabel: string;
    identifier: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
    showNewPassword: boolean;
    showConfirmPassword: boolean;
    otpInfo: ForgotPasswordOtpInfo | null;
    otpHint: string;
    isResendCoolingDown: boolean;
    isRequestingOtp: boolean;
    isResettingPassword: boolean;
    resendCountdown: string;
    onClose: () => void;
    onSelectMethod: (method: StudentLoginMethod) => void;
    onIdentifierChange: (value: string) => void;
    onOtpChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onToggleNewPassword: () => void;
    onToggleConfirmPassword: () => void;
    onRequestOtp: () => void;
    onConfirmReset: () => void;
};

export function ForgotPasswordModal({
    method,
    fieldLabel,
    identifier,
    otp,
    newPassword,
    confirmPassword,
    showNewPassword,
    showConfirmPassword,
    otpInfo,
    otpHint,
    isResendCoolingDown,
    isRequestingOtp,
    isResettingPassword,
    resendCountdown,
    onClose,
    onSelectMethod,
    onIdentifierChange,
    onOtpChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onToggleNewPassword,
    onToggleConfirmPassword,
    onRequestOtp,
    onConfirmReset
}: ForgotPasswordModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-stretch justify-stretch bg-transparent p-0 md:items-center md:justify-center md:p-4"
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20, opacity: 0 }}
                className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl shadow-indigo-900/50 md:h-auto md:max-h-[90vh] md:max-w-lg md:rounded-[2rem]"
            >
                <div className="border-b border-slate-100 bg-slate-50/70 p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
                                <span className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                                    <Lock size={20} />
                                </span>
                                Forgot Password
                            </h2>
                            <p className="mt-2 text-sm text-slate-500">
                                Enter your email or student ID to receive an OTP.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                        >
                            <X size={22} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 [scrollbar-width:none] sm:p-6 md:p-8 [&::-webkit-scrollbar]:hidden">
                    <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => onSelectMethod('studentId')}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                method === 'studentId'
                                    ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Student ID
                        </button>
                        <button
                            type="button"
                            onClick={() => onSelectMethod('email')}
                            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                method === 'email'
                                    ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            Email
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                            {fieldLabel}
                        </label>
                        <div className="relative">
                            <input
                                type={method === 'email' ? 'email' : 'text'}
                                inputMode={method === 'email' ? 'email' : 'text'}
                                autoCapitalize="none"
                                autoCorrect="off"
                                value={identifier}
                                onChange={(event) => onIdentifierChange(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20"
                                placeholder={method === 'email' ? 'name@example.com' : 'Enter your student ID'}
                            />
                            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                {method === 'email' ? <Mail size={18} /> : <User size={18} />}
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">
                            We will send the OTP to the registered email linked to this student account.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onRequestOtp}
                        disabled={isResendCoolingDown || isRequestingOtp || isResettingPassword}
                        className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed ${
                            isResendCoolingDown
                                ? 'bg-slate-200 text-slate-500 shadow-none'
                                : 'bg-gradient-to-r from-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-xl disabled:opacity-60'
                        }`}
                    >
                        {isRequestingOtp
                            ? 'Sending OTP...'
                            : isResendCoolingDown
                                ? `Resend OTP in ${resendCountdown}`
                                : otpInfo ? 'Resend OTP' : 'Send OTP'}
                    </button>

                    {otpInfo && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <p className="text-sm font-semibold leading-relaxed text-emerald-800">{otpHint}</p>
                            <div className="mt-4 space-y-4">
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">OTP Code</label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(event) => onOtpChange(event.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(event) => onNewPasswordChange(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            placeholder="At least 8 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={onToggleNewPassword}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Confirm Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(event) => onConfirmPasswordChange(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                            placeholder="Re-enter your new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={onToggleConfirmPassword}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {otpInfo && (
                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-5 py-2.5 font-bold text-slate-500 transition-colors hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onConfirmReset}
                            disabled={!otp.trim() || !newPassword || !confirmPassword || isRequestingOtp || isResettingPassword}
                            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-6 py-3 font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2.5"
                        >
                            {isResettingPassword ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}
