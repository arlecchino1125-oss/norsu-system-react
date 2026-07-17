import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/useAuth';
import { GraduationCap, CheckCircle, AlertCircle } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { getSafeErrorMessage } from '../../../utils/errorMasking';
import { useStudentActivation } from '../features/auth/hooks/useStudentActivation';
import { useStudentForgotPassword } from '../features/auth/hooks/useStudentForgotPassword';
import { ActivationConfirmModal } from '../features/auth/components/ActivationConfirmModal';
import { ActivationWizard } from '../features/auth/components/ActivationWizard';
import { ForgotPasswordModal } from '../features/auth/components/ForgotPasswordModal';
import { LoginPanel } from '../features/auth/components/LoginPanel';
import type { StudentLoginMethod } from '../types';

const PROGRAM_OPTIONS = [
    'Bachelor of Science in Agriculture - Major in Agronomy (BSA - Agronomy)',
    'Bachelor of Science in Computer Science (BSCS)',
    'Bachelor of Science in Business Administration - Major in Human Resource Management (BSBA - HRM)',
    'Bachelor of Science in Hospitality Management (BSHM)',
    'Bachelor of Science in Office Administration (BSOA)',
    'Bachelor of Science in Criminology (BSCrim)',
    'Bachelor of Industrial Technology - Major in Automotive Technology (BSIT - Automotive Technology)',
    'Bachelor of Industrial Technology - Major in Computer Technology (BSIT - Computer Technology)',
    'Bachelor of Industrial Technology - Major in Electrical Technology (BSIT - Electrical Tehnology)',
    'Bachelor of Industrial Technology - Major in Electronics Technology (BSIT – Electronics Technology)',
    'Bachelor of Science in Midwifery',
    'Bachelor of Elementary Education',
    'Bachelor of Secondary Education - Major in Mathematics (BSED - Math)',
    'Bachelor of Secondary Education - Major in English (BSED - English)'
];

const PAGE_VARIANTS = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
};

export default function StudentLogin() {
    const navigate = useNavigate();
    const { loginStudent, loading: authLoading } = useAuth() as any;

    // Login State
    const [loginMethod, setLoginMethod] = useState<StudentLoginMethod>('studentId');
    const [loginId, setLoginId] = useState<string>('');
    const [loginPassword, setLoginPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loginLoading, setLoginLoading] = useState(false);

    const [toast, setToast] = useState<{ msg: string, type: string } | null>(null);
    const [isMobileViewport, setIsMobileViewport] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    ));

    const loginFieldLabel = loginMethod === 'email' ? 'Email' : 'Student ID';
    const loginFieldHelpText = loginMethod === 'email'
        ? 'Use the email linked to your activated student account.'
        : 'Use the student ID connected to your student portal account.';

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const updateViewportState = () => {
            setIsMobileViewport(window.innerWidth < 768);
        };

        updateViewportState();
        window.addEventListener('resize', updateViewportState);

        return () => {
            window.removeEventListener('resize', updateViewportState);
        };
    }, []);

    const showToast = (msg: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(msg) : msg;
        setToast({ msg: safeMessage, type });
        setTimeout(() => setToast(null), 5000);
    };

    const {
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
        toggleForgotPasswordNewPassword,
        toggleForgotPasswordConfirmPassword,
        handleRequestForgotPasswordOtp,
        handleConfirmForgotPasswordReset
    } = useStudentForgotPassword({
        showToast,
        onPasswordResetConfirmed: (method, identifier) => {
            setLoginMethod(method);
            setLoginId(identifier);
            setLoginPassword('');
        }
    });

    const {
        activationLoading,
        showActivateModal,
        showConfirmModal,
        setShowConfirmModal,
        confirmModalStatus,
        confirmModalError,
        showSuccessModal,
        setShowSuccessModal,
        isMainModalHidden,
        showActivationPassword,
        activationErrorFields,
        setActivationErrorFields,
        courses,
        activatedCredentials,
        activationStep,
        setActivationStep,
        formData,
        setFormData,
        handleChange,
        handleActivatedCredentialsLogin,
        handleNextStep,
        handleActivationTrigger,
        handleCloseConfirmError,
        handleActivation,
        openActivationModal,
        closeActivationModal,
        closeActivationModalAndClearErrors,
        returnActivatedCredentialsToLoginForm,
        toggleActivationPassword
    } = useStudentActivation({
        loginStudent,
        showToast,
        onActivationCredentialsCreated: (username, password) => {
            setLoginId(username);
            setLoginPassword(password);
        },
        onUseActivatedCredentialsForLogin: (username, password) => {
            setLoginMethod('studentId');
            setLoginId(username);
            setLoginPassword(password);
        },
        onNavigateToStudent: () => navigate('/student')
    });
    const loading = loginLoading || activationLoading;

    // Handle Login
    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoginLoading(true);
        const result = await loginStudent(loginId, loginPassword, loginMethod);

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/student'), 1000);
        } else {
            showToast(result.error, 'error');
        }
        setLoginLoading(false);
    };

    return (
        <div className="flex min-h-screen w-full bg-[#0a0f1c] relative overflow-hidden font-inter selection:bg-indigo-500/30">
            {/* Animated SVG Background (Academic / Network / Connected Node theme) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {isMobileViewport ? (
                    <div
                        className="absolute inset-0 opacity-[0.1]"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                        }}
                    />
                ) : (
                    <m.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-[0.15]"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                        }}
                    />
                )}
            </div>

            {/* Glowing Orbs */}
            {isMobileViewport ? (
                <>
                    <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
                </>
            ) : (
                <>
                    <m.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"
                    />
                    <m.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none"
                    />
                </>
            )}

            <div className="flex w-full z-10 container mx-auto px-4 max-w-7xl">
                {/* Left: Branding & Message */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center pr-16 relative">
                    <m.div
                        initial="initial" animate="in" variants={PAGE_VARIANTS} transition={{ duration: 0.8 }}
                    >
                        <m.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-2xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
                            <GraduationCap size={40} className="relative z-10" />
                        </m.div>

                        <div className="mb-6 flex items-center gap-4">
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 shadow-lg shadow-indigo-900/20 backdrop-blur-sm">
                                <img src="/norsu.png" alt="NORSU" className="w-6 h-6 rounded-full border border-indigo-900/50 shadow-md object-cover bg-white" />
                                <span className="text-xs font-black tracking-widest text-indigo-300 uppercase pr-1">
                                    NORSU-G
                                </span>
                            </div>
                            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/20 shadow-lg shadow-sky-900/20 backdrop-blur-sm">
                                <img src="/carecenter.png" alt="CARE Center" className="w-6 h-6 rounded-full border border-sky-900/50 shadow-md object-cover bg-white" />
                                <span className="text-xs font-black tracking-widest text-sky-400 uppercase pr-1">
                                    CARE CENTER
                                </span>
                            </div>
                        </div>

                        <h2 className="text-7xl font-extrabold mb-6 leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-sky-200 drop-shadow-sm">
                            Student<br />Portal
                        </h2>
                        <div className="text-[10px] font-bold tracking-[0.2em] text-indigo-400/30 uppercase">
                            © {new Date().getFullYear()} NORSU-G CARE Center System
                        </div>
                    </m.div>
                </div>

                <LoginPanel
                    loginMethod={loginMethod}
                    loginFieldLabel={loginFieldLabel}
                    loginFieldHelpText={loginFieldHelpText}
                    loginId={loginId}
                    loginPassword={loginPassword}
                    showPassword={showPassword}
                    loading={loading}
                    authLoading={authLoading}
                    onSubmit={handleLogin}
                    onLoginMethodChange={setLoginMethod}
                    onLoginIdChange={setLoginId}
                    onLoginPasswordChange={setLoginPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    onForgotPassword={() => openForgotPasswordModal(loginMethod, loginId)}
                    onCreateAccount={openActivationModal}
                />
            </div>

            <AnimatePresence>
                {showForgotPasswordModal && (
                    <ForgotPasswordModal
                        method={forgotPasswordMethod}
                        fieldLabel={forgotPasswordFieldLabel}
                        identifier={forgotPasswordIdentifier}
                        otp={forgotPasswordOtp}
                        newPassword={forgotPasswordNewPassword}
                        confirmPassword={forgotPasswordConfirmPassword}
                        showNewPassword={showForgotPasswordNewPassword}
                        showConfirmPassword={showForgotPasswordConfirmPassword}
                        otpInfo={forgotPasswordOtpInfo}
                        otpHint={forgotPasswordOtpHint}
                        isResendCoolingDown={isForgotPasswordResendCoolingDown}
                        isRequestingOtp={isRequestingForgotPasswordOtp}
                        isResettingPassword={isResettingForgotPassword}
                        resendCountdown={forgotPasswordResendCountdown}
                        onClose={closeForgotPasswordModal}
                        onSelectMethod={selectForgotPasswordMethod}
                        onIdentifierChange={setForgotPasswordIdentifier}
                        onOtpChange={setForgotPasswordOtp}
                        onNewPasswordChange={setForgotPasswordNewPassword}
                        onConfirmPasswordChange={setForgotPasswordConfirmPassword}
                        onToggleNewPassword={toggleForgotPasswordNewPassword}
                        onToggleConfirmPassword={toggleForgotPasswordConfirmPassword}
                        onRequestOtp={handleRequestForgotPasswordOtp}
                        onConfirmReset={handleConfirmForgotPasswordReset}
                    />
                )}
            </AnimatePresence>

            {/* --- MULTI-STEP ACTIVATION MODAL WIZARD --- */}
            <AnimatePresence>
                {showActivateModal && (
                    <ActivationWizard
                        isMainModalHidden={isMainModalHidden}
                        activationStep={activationStep}
                        activatedCredentials={activatedCredentials}
                        courses={courses}
                        programOptions={PROGRAM_OPTIONS}
                        formData={formData}
                        activationErrorFields={activationErrorFields}
                        showActivationPassword={showActivationPassword}
                        isLoginPending={loading || authLoading}
                        setActivationStep={setActivationStep}
                        setFormData={setFormData}
                        setActivationErrorFields={setActivationErrorFields}
                        onClose={closeActivationModalAndClearErrors}
                        onCancel={closeActivationModal}
                        onChange={handleChange}
                        onNextStep={handleNextStep}
                        onActivationTrigger={handleActivationTrigger}
                        onActivatedCredentialsLogin={handleActivatedCredentialsLogin}
                        onReturnToLogin={returnActivatedCredentialsToLoginForm}
                        onToggleActivationPassword={toggleActivationPassword}
                    />
                )}
            </AnimatePresence>
            {/* --- FLOATING CONFIRMATION / IMPORTANT NOTE MODAL --- */}
            <AnimatePresence>
                {showConfirmModal && (
                    <ActivationConfirmModal
                        status={confirmModalStatus}
                        error={confirmModalError}
                        onCancel={() => setShowConfirmModal(false)}
                        onConfirm={handleActivation}
                        onCloseError={handleCloseConfirmError}
                    />
                )}
            </AnimatePresence>

            {/* --- CONGRATULATIONS SUCCESS MODAL --- */}
            <AnimatePresence>
                {showSuccessModal && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
                    >
                        <m.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 md:p-8 flex flex-col relative text-center"
                        >
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 mb-2">Congrats!</h3>
                            <p className="text-sm text-slate-500 font-semibold mb-6 max-w-xs mx-auto">
                                Your account is created. You may now log in.
                            </p>

                            <div className="max-w-sm mx-auto bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mb-6 shadow-inner w-full text-left">
                                <div className="space-y-4">
                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Student ID</p>
                                        <p className="font-mono font-bold text-xl text-slate-800 tracking-wider">{activatedCredentials?.username}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500"></div>
                                        <p className="text-xs text-sky-500 font-bold uppercase tracking-wider mb-1">Password</p>
                                        <p className="text-sm font-semibold leading-relaxed text-slate-600">Use the password you typed during account creation.</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => { setShowSuccessModal(false); handleActivatedCredentialsLogin(); }}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-xl hover:-translate-y-0.5"
                            >
                                Log In
                            </button>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>


            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, y: -20, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`fixed left-4 right-4 top-4 z-[70] flex items-start gap-3 rounded-2xl border px-4 py-3 text-white shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-auto sm:right-6 sm:top-auto sm:max-w-sm ${toast.type === 'error' ? 'bg-rose-500/90 border-rose-400/50' : 'bg-emerald-500/90 border-emerald-400/50'}`}
                    >
                        <div className="pt-0.5 text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div className="min-w-0">
                            <h4 className="font-extrabold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4>
                            <p className="text-xs font-medium opacity-90">{toast.msg}</p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
