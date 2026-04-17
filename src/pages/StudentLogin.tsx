import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GraduationCap, Lock, CheckCircle, AlertCircle, BookOpen, UserPlus, User, Mail, MapPin, Loader2, X, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from '../components/ui/DatePicker';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { getStudentActivationPolicy } from '../lib/studentActivationPolicy';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { rememberPendingProfileCompletion } from '../lib/studentProfileCompletionPrompt';
import { getSafeStudentActivationErrorMessage } from '../lib/studentActivationErrors';

type StudentLoginMethod = 'studentId' | 'email';
type ForgotPasswordOtpInfo = {
    message?: string;
    expiresInMinutes?: number;
};

export default function StudentLogin() {
    const navigate = useNavigate();
    const { loginStudent, loading: authLoading } = useAuth() as any;

    // Modal State
    const [showActivateModal, setShowActivateModal] = useState<boolean>(false);
    const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);

    // Login State
    const [loginMethod, setLoginMethod] = useState<StudentLoginMethod>('studentId');
    const [loginId, setLoginId] = useState<string>('');
    const [loginPassword, setLoginPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [forgotPasswordMethod, setForgotPasswordMethod] = useState<StudentLoginMethod>('studentId');
    const [forgotPasswordIdentifier, setForgotPasswordIdentifier] = useState<string>('');
    const [forgotPasswordOtp, setForgotPasswordOtp] = useState<string>('');
    const [forgotPasswordNewPassword, setForgotPasswordNewPassword] = useState<string>('');
    const [forgotPasswordConfirmPassword, setForgotPasswordConfirmPassword] = useState<string>('');
    const [forgotPasswordOtpInfo, setForgotPasswordOtpInfo] = useState<ForgotPasswordOtpInfo | null>(null);
    const [isRequestingForgotPasswordOtp, setIsRequestingForgotPasswordOtp] = useState<boolean>(false);
    const [isResettingForgotPassword, setIsResettingForgotPassword] = useState<boolean>(false);

    // Activation Form State
    const [loading, setLoading] = useState<boolean>(false);
    const [toast, setToast] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);
    const [studentActivationPolicy, setStudentActivationPolicy] = useState({
        requireEnrollmentKey: true,
        updatedAt: null as string | null,
        updatedBy: null as string | null
    });
    const [isMobileViewport, setIsMobileViewport] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    ));
    // Wizard State
    const [activationStep, setActivationStep] = useState<number>(1);

    // MINIMAL FORM DATA — only fields needed during activation
    // All remaining profile fields are collected post-login via the completion modal
    const [formData, setFormData] = useState<any>({
        // Step 1: Enrollment Keys
        studentId: '', course: '',

        // Step 2: Personal Information (minimum only)
        firstName: '', lastName: '', middleName: '', suffix: '',
        street: '', city: '', province: '', zipCode: '',
        mobile: '', email: '',
        dob: '', age: '',
        sex: ''
    });

    const TOTAL_STEPS = 3;
    const STEP_LABELS = ['Verify', 'Personal', 'Finish'];
    const loginFieldLabel = loginMethod === 'email' ? 'Email' : 'Student ID';
    const loginFieldHelpText = loginMethod === 'email'
        ? 'Use the email linked to your activated student account.'
        : 'Use the student ID connected to your student portal account.';
    const forgotPasswordFieldLabel = forgotPasswordMethod === 'email' ? 'Email' : 'Student ID';
    const forgotPasswordOtpHint = forgotPasswordOtpInfo
        ? `${forgotPasswordOtpInfo.message || 'If the account exists, a verification code has been sent to the registered email.'}${forgotPasswordOtpInfo.expiresInMinutes ? ` The code expires in ${forgotPasswordOtpInfo.expiresInMinutes} minutes.` : ''}`
        : '';

    useEffect(() => {
        if (!showActivateModal) return;

        let isActive = true;

        const loadActivationResources = async () => {
            if (courses.length === 0) {
                const { data } = await supabase.from('courses').select('name').order('name');
                if (isActive && data) {
                    setCourses(data);
                }
            }

            try {
                const policy = await getStudentActivationPolicy();
                if (isActive) {
                    setStudentActivationPolicy(policy);
                }
            } catch (error) {
                console.error('Failed to load student activation policy.', error);
            }
        };

        void loadActivationResources();

        return () => {
            isActive = false;
        };
    }, [showActivateModal, courses.length]);

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
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
    };

    const resetForgotPasswordForm = (preserveIdentifier = false) => {
        if (!preserveIdentifier) {
            setForgotPasswordIdentifier('');
        }
        setForgotPasswordOtp('');
        setForgotPasswordNewPassword('');
        setForgotPasswordConfirmPassword('');
        setForgotPasswordOtpInfo(null);
    };

    const openForgotPasswordModal = () => {
        setForgotPasswordMethod(loginMethod);
        setForgotPasswordIdentifier(String(loginId || '').trim());
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

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'dob') {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            setFormData((prev: any) => ({ ...prev, [name]: value, age: age >= 0 ? age : '' }));
        } else {
            setFormData((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleCheckboxGroup = (e: any, field: string) => {
        const { value, checked } = e.target;
        setFormData((prev: any) => {
            const current = prev[field] || [];
            if (checked) return { ...prev, [field]: [...current, value] };
            return { ...prev, [field]: current.filter((item: any) => item !== value) };
        });
    };

    const attemptAutoLoginAfterActivation = async (studentId: string, password: string) => {
        const result = await loginStudent(studentId, password);
        if (result?.success) {
            return { success: true };
        }

        return {
            success: false,
            error: result?.error || 'Automatic sign-in failed.'
        };
    };

    const handleGeneratedCredentialsLogin = async () => {
        if (!generatedCredentials?.username || !generatedCredentials?.password) {
            return;
        }

        setLoading(true);

        try {
            const autoLoginResult = await attemptAutoLoginAfterActivation(
                generatedCredentials.username,
                generatedCredentials.password
            );

            if (autoLoginResult.success) {
                setGeneratedCredentials(null);
                setShowActivateModal(false);
                showToast('Login Successful', 'success');
                setTimeout(() => navigate('/student'), 700);
                return;
            }

            setShowActivateModal(false);
            setLoginMethod('studentId');
            setLoginId(generatedCredentials.username);
            setLoginPassword(generatedCredentials.password);
            showToast(
                autoLoginResult.error
                    ? `Automatic sign-in failed. ${autoLoginResult.error}`
                    : 'Automatic sign-in failed. Use the account details you saved to sign in below.',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // Handle Login
    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const result = await loginStudent(loginId, loginPassword, loginMethod);

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/student'), 1000);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    const handleRequestForgotPasswordOtp = async () => {
        const trimmedIdentifier = String(forgotPasswordIdentifier || '').trim();
        if (!trimmedIdentifier) {
            showToast(`Enter your ${forgotPasswordFieldLabel.toLowerCase()} first.`, 'error');
            return;
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
            showToast(
                result?.message || 'If the account exists, a verification code has been sent to the registered email.',
                'success'
            );
        } catch (error: any) {
            showToast(error?.message || 'Failed to send the password reset code.', 'error');
        } finally {
            setIsRequestingForgotPasswordOtp(false);
        }
    };

    const handleConfirmForgotPasswordReset = async () => {
        const trimmedIdentifier = String(forgotPasswordIdentifier || '').trim();
        const trimmedOtp = String(forgotPasswordOtp || '').trim();

        if (!trimmedIdentifier) {
            showToast(`Enter your ${forgotPasswordFieldLabel.toLowerCase()} first.`, 'error');
            return;
        }

        if (!trimmedOtp) {
            showToast('Enter the OTP sent to your email.', 'error');
            return;
        }

        if (forgotPasswordNewPassword.length < 8) {
            showToast('Password must be at least 8 characters.', 'error');
            return;
        }

        if (forgotPasswordNewPassword !== forgotPasswordConfirmPassword) {
            showToast('Passwords do not match.', 'error');
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

            setLoginMethod(forgotPasswordMethod);
            setLoginId(trimmedIdentifier);
            setLoginPassword('');
            setShowForgotPasswordModal(false);
            resetForgotPasswordForm();
            showToast('Password updated. Sign in with your new password.', 'success');
        } catch (error: any) {
            showToast(error?.message || 'Failed to reset your password.', 'error');
        } finally {
            setIsResettingForgotPassword(false);
        }
    };

    // Wizard Next Step Validation
    const handleNextStep = () => {
        if (activationStep === 1) {
            if (!formData.studentId || !formData.course) {
                showToast('Please fill in required enrollment fields.', 'error');
                return;
            }
            if (!/^\d{9}$/.test(formData.studentId.trim())) {
                showToast('Student ID must be exactly 9 digits (e.g. 202312345).', 'error');
                return;
            }
        } else if (activationStep === 2) {
            if (!formData.firstName || !formData.lastName || !formData.dob || !formData.sex || !formData.mobile || !formData.email) {
                showToast('Please complete required personal information.', 'error');
                return;
            }
        }
        setActivationStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle Activation
    const handleActivation = async () => {
        setLoading(true);
        try {
            // Minimal activation profile — remaining fields are collected post-login
            const activationProfile = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                middleName: formData.middleName,
                suffix: formData.suffix,
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zipCode: formData.zipCode,
                mobile: formData.mobile,
                email: formData.email,
                dob: formData.dob,
                age: formData.age,
                sex: formData.sex,
            };

            const runStudentActivation = (allowEnrollmentCreate = false) => invokeEdgeFunction('activate-student-account', {
                body: {
                    mode: 'student-profile-activation',
                    studentId: formData.studentId,
                    course: formData.course,
                    allowEnrollmentCreate,
                    profile: activationProfile
                },
                fallbackMessage: 'Account activation failed.'
            });

            const data = await runStudentActivation(!studentActivationPolicy.requireEnrollmentKey);

            const username = data.studentId || formData.studentId;
            const password = data.password;

            rememberPendingProfileCompletion(username, activationProfile);
            setLoginId(username);
            setLoginPassword(password);

            void sendTransactionalEmailNotification({
                    type: 'STUDENT_ACTIVATION',
                    email: formData.email,
                    name: `${formData.firstName} ${formData.lastName}`,
                    studentId: username,
                    password: password,
                    loginUrl: `${window.location.origin}/student/login`
                }, 'Failed to send activation email.');
            setGeneratedCredentials({ username, password, viewed: false });
            showToast('Account activated. Review and save your account details before signing in.', 'success');

        } catch (error: any) {
            showToast(getSafeStudentActivationErrorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    // Animation Variants
    const pageVariants = {
        initial: { opacity: 0, y: 20 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -20 }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#0a0f1c] relative overflow-hidden font-inter selection:bg-indigo-500/30">
            {/* Animated SVG Background (Academic / Network / Connected Node theme) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                {isMobileViewport ? (
                    <div
                        className="absolute inset-0 opacity-[0.15]"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                        }}
                    />
                ) : (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                        }}
                    />
                )}
            </div>

            {/* Glowing Orbs */}
            {isMobileViewport ? (
                <>
                    <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
                </>
            ) : (
                <>
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/4 left-1/4 w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full blur-[120px] pointer-events-none"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                        className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-sky-500/20 rounded-full blur-[100px] pointer-events-none"
                    />
                </>
            )}

            <div className="flex w-full z-10 container mx-auto px-4 max-w-7xl">
                {/* Left: Branding & Message */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center pr-16 relative">
                    <motion.div
                        initial="initial" animate="in" variants={pageVariants} transition={{ duration: 0.8 }}
                    >
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: 5 }}
                            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-sky-400 rounded-2xl flex items-center justify-center text-white mb-8 shadow-2xl shadow-indigo-500/30 border border-indigo-400/30 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 blur-xl rounded-full"></div>
                            <GraduationCap size={40} className="relative z-10" />
                        </motion.div>

                        <h2 className="text-7xl font-extrabold mb-6 leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-sky-200 drop-shadow-sm">
                            Student<br />Portal
                        </h2>
                        <p className="text-indigo-200/80 text-xl leading-relaxed font-light max-w-md border-l-4 border-indigo-500/50 pl-4 py-1">
                            Access your profile, student services, events, and support tools in one portal.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Login Card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-[420px]"
                    >
                        <div className="relative group">
                            {/* Card Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-sky-500 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                            {/* Card Body */}
                            <div className="relative bg-[#0d1527]/80 backdrop-blur-2xl border border-indigo-500/20 rounded-[2rem] shadow-2xl p-10 overflow-hidden">

                                {/* Inner Top Highlight */}
                                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                                <div className="flex justify-between items-end mb-10">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
                                            Welcome <Sparkles className="w-6 h-6 text-sky-400" />
                                        </h1>
                                        <p className="text-indigo-200/60 text-sm font-medium">Log in to enter your dashboard</p>
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {/* Login Identifier Input Group */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 rounded-xl border border-indigo-800/50 bg-indigo-950/30 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setLoginMethod('studentId')}
                                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                                    loginMethod === 'studentId'
                                                        ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                                        : 'text-indigo-200/70 hover:text-white'
                                                }`}
                                            >
                                                Student ID
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setLoginMethod('email')}
                                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                                    loginMethod === 'email'
                                                        ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                                        : 'text-indigo-200/70 hover:text-white'
                                                }`}
                                            >
                                                Email
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input
                                                required
                                                id="studentLoginIdentifier"
                                                type={loginMethod === 'email' ? 'email' : 'text'}
                                                inputMode={loginMethod === 'email' ? 'email' : 'text'}
                                                autoCapitalize="none"
                                                autoCorrect="off"
                                                autoComplete={loginMethod === 'email' ? 'email' : 'username'}
                                                className="peer w-full bg-indigo-950/30 border border-indigo-800/50 rounded-xl px-5 py-4 pt-6 text-white text-base outline-none transition-all placeholder-transparent focus:bg-indigo-900/40 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                                                placeholder={loginFieldLabel}
                                                value={loginId}
                                                onChange={e => setLoginId(e.target.value)}
                                            />
                                            <label
                                                htmlFor="studentLoginIdentifier"
                                                className="absolute left-5 top-2 text-xs font-bold text-indigo-300/60 uppercase tracking-widest transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:text-sky-400 pointer-events-none"
                                            >
                                                {loginFieldLabel}
                                            </label>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/50 peer-focus:text-sky-400 transition-colors pointer-events-none">
                                                {loginMethod === 'email' ? <Mail size={20} /> : <User size={20} />}
                                            </div>
                                        </div>

                                        <p className="px-1 text-xs text-indigo-200/55">
                                            {loginFieldHelpText}
                                        </p>
                                    </div>

                                    {/* Password Input Group */}
                                    <div className="relative">
                                        <input
                                            required
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            className="peer w-full bg-indigo-950/30 border border-indigo-800/50 rounded-xl px-5 py-4 pt-6 text-white text-base outline-none transition-all placeholder-transparent focus:bg-indigo-900/40 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 pr-12"
                                            placeholder="Password"
                                            value={loginPassword}
                                            onChange={e => setLoginPassword(e.target.value)}
                                        />
                                        <label
                                            htmlFor="password"
                                            className="absolute left-5 top-2 text-xs font-bold text-indigo-300/60 uppercase tracking-widest transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:text-sky-400 pointer-events-none"
                                        >
                                            Password
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/50 hover:text-sky-400 transition-colors focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>

                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={openForgotPasswordModal}
                                            className="text-sm font-semibold text-sky-400 transition-colors hover:text-sky-300"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="pt-2 flex flex-col gap-4">
                                        <motion.button
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading || authLoading}
                                            type="submit"
                                            className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 border border-t-white/20 border-b-black/20"
                                        >
                                            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</> : 'Sign In'}
                                        </motion.button>

                                        <div className="relative flex items-center justify-center py-2">
                                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-indigo-800/50"></div></div>
                                            <div className="relative px-4 bg-[#0d1527] text-xs text-indigo-300/50 font-medium uppercase tracking-wider">New Student?</div>
                                        </div>

                                        <motion.button
                                            type="button"
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => { setShowActivateModal(true); setGeneratedCredentials(null); setActivationStep(1); }}
                                            className="w-full bg-indigo-900/30 hover:bg-indigo-800/40 text-sky-400 py-3.5 rounded-xl font-semibold border border-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <UserPlus size={18} /> Activate Account
                                        </motion.button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {showForgotPasswordModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0f1c]/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl shadow-indigo-900/50 flex flex-col overflow-hidden relative"
                        >
                            <div className="border-b border-slate-100 bg-slate-50/70 p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
                                            <span className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                                                <Lock size={20} />
                                            </span>
                                            Forgot Password
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Request a one-time password and reset your student portal password here.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeForgotPasswordModal}
                                        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                                    >
                                        <X size={22} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5 p-6 md:p-8">
                                <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordMethod('studentId');
                                            setForgotPasswordOtpInfo(null);
                                            setForgotPasswordOtp('');
                                        }}
                                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                            forgotPasswordMethod === 'studentId'
                                                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        Student ID
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotPasswordMethod('email');
                                            setForgotPasswordOtpInfo(null);
                                            setForgotPasswordOtp('');
                                        }}
                                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                                            forgotPasswordMethod === 'email'
                                                ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        Email
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                                        {forgotPasswordFieldLabel}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={forgotPasswordMethod === 'email' ? 'email' : 'text'}
                                            inputMode={forgotPasswordMethod === 'email' ? 'email' : 'text'}
                                            autoCapitalize="none"
                                            autoCorrect="off"
                                            value={forgotPasswordIdentifier}
                                            onChange={(event) => setForgotPasswordIdentifier(event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20"
                                            placeholder={forgotPasswordMethod === 'email' ? 'name@example.com' : 'Enter your student ID'}
                                        />
                                        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            {forgotPasswordMethod === 'email' ? <Mail size={18} /> : <User size={18} />}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        We will send the OTP to the registered email linked to this student account.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleRequestForgotPasswordOtp}
                                    disabled={isRequestingForgotPasswordOtp || isResettingForgotPassword}
                                    className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isRequestingForgotPasswordOtp ? 'Sending OTP...' : 'Send OTP'}
                                </button>

                                {forgotPasswordOtpInfo && (
                                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                                        <p className="text-sm leading-relaxed text-slate-600">{forgotPasswordOtpHint}</p>
                                        <div className="mt-4 space-y-4">
                                            <div>
                                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">OTP Code</label>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={6}
                                                    value={forgotPasswordOtp}
                                                    onChange={(event) => setForgotPasswordOtp(event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                                    placeholder="Enter 6-digit OTP"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">New Password</label>
                                                <input
                                                    type="password"
                                                    value={forgotPasswordNewPassword}
                                                    onChange={(event) => setForgotPasswordNewPassword(event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                                    placeholder="At least 8 characters"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Confirm Password</label>
                                                <input
                                                    type="password"
                                                    value={forgotPasswordConfirmPassword}
                                                    onChange={(event) => setForgotPasswordConfirmPassword(event.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-all focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                                                    placeholder="Re-enter your new password"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-5">
                                <button
                                    type="button"
                                    onClick={closeForgotPasswordModal}
                                    className="rounded-xl px-5 py-2.5 font-bold text-slate-500 transition-colors hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmForgotPasswordReset}
                                    disabled={!forgotPasswordOtpInfo || isRequestingForgotPasswordOtp || isResettingForgotPassword}
                                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-2.5 font-bold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isResettingForgotPassword ? 'Resetting...' : 'Reset Password'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MULTI-STEP ACTIVATION MODAL WIZARD --- */}
            <AnimatePresence>
                {showActivateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a0f1c]/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl shadow-indigo-900/50 flex flex-col overflow-hidden relative"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex flex-col bg-slate-50/50">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                                            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><UserPlus size={20} /></div>
                                            Account Activation
                                        </h2>
                                    </div>
                                    <button onClick={() => setShowActivateModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Progress Bar for Wizard */}
                                {!generatedCredentials && (
                                    <div className="w-full">
                                        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1">
                                            {STEP_LABELS.map((label, i) => (
                                                <span key={label} className={activationStep >= i + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                            ))}
                                        </div>
                                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-gradient-to-r from-indigo-500 to-sky-400"
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(activationStep / TOTAL_STEPS) * 100}%` }}
                                                transition={{ duration: 0.3 }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Modal Body */}
                            <div className="flex-grow overflow-y-auto p-6 md:p-10 custom-scrollbar bg-white">
                                {generatedCredentials ? (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <CheckCircle className="w-12 h-12 text-emerald-600" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-800 mb-2">Activation Successful!</h3>
                                        <p className="text-slate-500 mb-6 max-w-sm mx-auto font-medium">Your student portal account is ready. Review the account details first, save a backup screenshot, and keep the password private before signing in.</p>

                                        <div className="max-w-sm mx-auto rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 mb-6 text-left shadow-sm">
                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Reminder</p>
                                            <p className="text-sm text-amber-900 leading-relaxed">Take a screenshot or save these account details in a secure place. Do not share your password with anyone.</p>
                                        </div>

                                        {generatedCredentials.viewed ? (
                                            <div className="max-w-sm mx-auto bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mb-6 shadow-inner">
                                                <div className="space-y-4">
                                                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm text-left relative overflow-hidden">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                                                        <p className="text-xs text-indigo-400 font-bold uppercase tracking-wider mb-1">Student ID</p>
                                                        <p className="font-mono font-bold text-xl text-slate-800 tracking-wider pl-1">{generatedCredentials.username}</p>
                                                    </div>
                                                    <div className="bg-white p-4 rounded-xl border border-sky-100 shadow-sm text-left relative overflow-hidden">
                                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500"></div>
                                                        <p className="text-xs text-sky-500 font-bold uppercase tracking-wider mb-1">Temporary Password</p>
                                                        <p className="font-mono font-bold text-xl text-slate-800 tracking-wider pl-1">{generatedCredentials.password}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="max-w-sm mx-auto rounded-2xl border border-slate-200 bg-slate-50 px-5 py-6 mb-6 text-center">
                                                <p className="text-sm text-slate-600 leading-relaxed">Tap <span className="font-bold text-slate-800">View Account</span> to reveal your student ID and temporary password.</p>
                                            </div>
                                        )}

                                        <div className="max-w-sm mx-auto flex flex-col gap-3">
                                            {!generatedCredentials.viewed ? (
                                                <button
                                                    onClick={() => setGeneratedCredentials((prev: any) => prev ? { ...prev, viewed: true } : prev)}
                                                    className="bg-indigo-600 text-white px-10 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1 w-full"
                                                >
                                                    View Account
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={loading || authLoading}
                                                        onClick={handleGeneratedCredentialsLogin}
                                                        className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 w-full disabled:opacity-70"
                                                    >
                                                        {loading || authLoading ? 'Logging In...' : 'Log In to Student Portal'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowActivateModal(false);
                                                            setLoginMethod('studentId');
                                                            setLoginId(generatedCredentials.username);
                                                            setLoginPassword(generatedCredentials.password);
                                                        }}
                                                        className="bg-white text-slate-700 px-10 py-3 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-all w-full"
                                                    >
                                                        Return to Login Form
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <form id="activationForm" onSubmit={(e) => e.preventDefault()} className="relative min-h-[300px]">
                                        <AnimatePresence mode="wait">

                                            {/* STEP 1: VERIFICATION */}
                                            {activationStep === 1 && (
                                                <motion.div key="step1" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
                                                    <div className="mb-4">
                                                        <h3 className="text-xl font-bold text-slate-800">Enrollment Details</h3>
                                                    </div>
                                                    <div className="space-y-5">
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Student ID <span className="text-rose-500">*</span></label>
                                                            <input required name="studentId" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium" placeholder="Ex: 202312345" value={formData.studentId} onChange={handleChange} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Course <span className="text-rose-500">*</span></label>
                                                            <select required name="course" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium appearance-none" value={formData.course} onChange={handleChange}>
                                                                <option value="">Select your enrolled course</option>
                                                                {courses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* STEP 2: PERSONAL INFORMATION */}
                                            {activationStep === 2 && (
                                                <motion.div key="step2" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2">
                                                        <h3 className="text-xl font-bold text-slate-800">Personal Information</h3>
                                                        <p className="text-slate-500 text-sm mt-1">Any remaining profile details will be completed after your first login.</p>
                                                    </div>
                                                    {/* Name */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Last Name *</label><input required name="lastName" value={formData.lastName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">First Name *</label><input required name="firstName" value={formData.firstName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Suffix</label><input name="suffix" value={formData.suffix} onChange={handleChange} placeholder="Jr., II, etc." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm placeholder:text-slate-300" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Middle Name</label><input name="middleName" value={formData.middleName} onChange={handleChange} placeholder='N/A if none' className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm placeholder:text-slate-300" /></div>
                                                    </div>
                                                    {/* Address */}
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="street" placeholder="Street / Block / Subd." value={formData.street} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">City</label><input name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Province</label><input name="province" value={formData.province} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Zip</label><input name="zipCode" value={formData.zipCode} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                    </div>
                                                    {/* Contact, Age, DOB */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact Number *</label><input required name="mobile" value={formData.mobile} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Email *</label><input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Birthday *</label><DatePicker required name="dob" value={formData.dob} onChange={(val) => { setFormData((prev: any) => { const age = val ? Math.floor((Date.now() - new Date(val + 'T00:00:00').getTime()) / 31557600000) : ''; return { ...prev, dob: val, age }; }); }} placeholder="Select birth date" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Age</label><input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm" readOnly /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Sex *</label><select required name="sex" value={formData.sex} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                                    </div>
                                                </motion.div>
                                            )}



                                            {/* STEP 9: FINISH */}
                                            {activationStep === 3 && (
                                                <motion.div key="step3" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
                                                    <div className="mb-4 text-center">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                                                            <Lock className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <h3 className="text-2xl font-bold text-slate-800">Final Step</h3>
                                                    </div>
                                                    <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-6 py-8 text-center shadow-sm">
                                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600/80">Important Note</p>
                                                        <p className="mt-4 text-lg font-bold leading-relaxed text-emerald-900 sm:text-2xl">
                                                            After activation, sign in with your student portal account to complete the remaining profile information.
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}

                                        </AnimatePresence>
                                    </form>
                                )}
                            </div>

                            {/* Modal Footer (Wizard Controls) */}
                            {!generatedCredentials && (
                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-[2rem]">
                                    {activationStep > 1 ? (
                                        <button
                                            type="button"
                                            onClick={() => setActivationStep(prev => prev - 1)}
                                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                                        >
                                            Back
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowActivateModal(false)}
                                            className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}

                                    {activationStep < TOTAL_STEPS ? (
                                        <button
                                            type="button"
                                            onClick={handleNextStep}
                                            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                        >
                                            Next Step
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleActivation}
                                            disabled={loading}
                                            className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-xl disabled:opacity-50 flex items-center gap-2 hover:-translate-y-0.5 transition-all"
                                        >
                                            {loading ? <><Loader2 className="animate-spin" size={18} /> Activating...</> : 'Complete Activation'}
                                        </button>
                                    )}
                                </div>
                            )}

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
            </AnimatePresence>

            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border text-white flex items-center gap-4 z-[60] ${toast.type === 'error' ? 'bg-rose-500/90 border-rose-400/50' : 'bg-emerald-500/90 border-emerald-400/50'}`}
                    >
                        <div className="text-2xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div>
                            <h4 className="font-extrabold text-sm">{toast.type === 'error' ? 'Action Failed' : 'Success'}</h4>
                            <p className="text-xs font-medium opacity-90">{toast.msg}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
