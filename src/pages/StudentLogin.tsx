import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GraduationCap, Lock, CheckCircle, AlertCircle, BookOpen, UserPlus, User, MapPin, Info, Loader2, X, Check, Eye, EyeOff, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from '../components/ui/DatePicker';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { getStudentActivationPolicy } from '../lib/studentActivationPolicy';

export default function StudentLogin() {
    const navigate = useNavigate();
    const { loginStudent, loading: authLoading } = useAuth() as any;

    // Modal State
    const [showActivateModal, setShowActivateModal] = useState<boolean>(false);

    // Login State
    const [loginId, setLoginId] = useState<string>('');
    const [loginPassword, setLoginPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);

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
    const [isLoadingActivationPolicy, setIsLoadingActivationPolicy] = useState<boolean>(false);
    const [enrollmentWarning, setEnrollmentWarning] = useState<{
        visible: boolean;
        studentId: string;
        course: string;
        resolve: ((decision: boolean) => void) | null;
    }>({
        visible: false,
        studentId: '',
        course: '',
        resolve: null
    });

    // Wizard State
    const [activationStep, setActivationStep] = useState<number>(1);

    // COMPREHENSIVE FORM DATA (matching all categories from student profile form)
    const [formData, setFormData] = useState<any>({
        // Step 1: Enrollment Keys
        studentId: '', course: '',

        // Step 2: Personal Information
        firstName: '', lastName: '', middleName: '', suffix: '',
        street: '', city: '', province: '', zipCode: '',
        mobile: '', email: '',
        dob: '', age: '', placeOfBirth: '',
        sex: '', genderIdentity: '',
        yearLevelApplying: '1st Year', section: '',
        civilStatus: '',
        facebookUrl: '',
        religion: '',
        nationality: 'Filipino',
        schoolLastAttended: '',
        supporter: [], supporterContact: '',
        isWorkingStudent: 'No', workingStudentType: '',
        isPwd: 'No', pwdType: '',
        isIndigenous: 'No', indigenousGroup: '',
        witnessedConflict: 'No',
        isSafeInCommunity: 'Yes',
        isSoloParent: 'No', isChildOfSoloParent: 'No',

        // Step 3: Family Background
        motherLastName: '', motherGivenName: '', motherMiddleName: '', motherOccupation: '', motherContact: '',
        fatherLastName: '', fatherGivenName: '', fatherMiddleName: '', fatherOccupation: '', fatherContact: '',
        parentAddress: '',
        numBrothers: '', numSisters: '',
        birthOrder: '',
        spouseName: '', spouseOccupation: '', numChildren: '',

        // Step 4: Guardian
        guardianName: '', guardianAddress: '', guardianContact: '', guardianRelation: '',

        // Step 5: Emergency Contact
        emergencyName: '', emergencyAddress: '', emergencyRelationship: '', emergencyNumber: '',

        // Step 6: Educational Background
        elemSchool: '', elemYearGraduated: '',
        juniorHighSchool: '', juniorHighYearGraduated: '',
        seniorHighSchool: '', seniorHighYearGraduated: '',
        collegeSchool: '', collegeYearGraduated: '',
        honorsAwards: '',

        // Step 7: Extra-Curricular
        extracurricularActivities: '',

        // Step 8: Scholarships
        scholarshipsAvailed: '',

        // Step 9: Privacy
        agreedToPrivacy: false
    });

    const TOTAL_STEPS = 9;
    const STEP_LABELS = ['Verify', 'Personal', 'Family', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];

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

            setIsLoadingActivationPolicy(true);
            try {
                const policy = await getStudentActivationPolicy();
                if (isActive) {
                    setStudentActivationPolicy(policy);
                }
            } catch (error) {
                console.error('Failed to load student activation policy.', error);
            } finally {
                if (isActive) {
                    setIsLoadingActivationPolicy(false);
                }
            }
        };

        void loadActivationResources();

        return () => {
            isActive = false;
        };
    }, [showActivateModal, courses.length]);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 5000);
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

    // Handle Login
    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const result = await loginStudent(loginId, loginPassword);

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/student'), 1000);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
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
    const handleActivation = async (e: any) => {
        e.preventDefault();

        if (activationStep < TOTAL_STEPS) {
            handleNextStep();
            return;
        }

        if (!formData.agreedToPrivacy) {
            showToast("You must agree to the Data Privacy Disclaimer.", 'error');
            return;
        }

        setLoading(true);
        try {
            const runStudentActivation = (allowEnrollmentCreate = false) => invokeEdgeFunction('activate-student-account', {
                body: {
                    mode: 'student-profile-activation',
                    studentId: formData.studentId,
                    course: formData.course,
                    allowEnrollmentCreate,
                    profile: {
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
                        placeOfBirth: formData.placeOfBirth,
                        sex: formData.sex,
                        genderIdentity: formData.genderIdentity,
                        yearLevelApplying: formData.yearLevelApplying,
                        section: formData.section,
                        civilStatus: formData.civilStatus,
                        facebookUrl: formData.facebookUrl,
                        religion: formData.religion,
                        nationality: formData.nationality,
                        schoolLastAttended: formData.schoolLastAttended,
                        supporter: formData.supporter,
                        supporterContact: formData.supporterContact,
                        isWorkingStudent: formData.isWorkingStudent,
                        workingStudentType: formData.workingStudentType,
                        isPwd: formData.isPwd,
                        pwdType: formData.pwdType,
                        isIndigenous: formData.isIndigenous,
                        indigenousGroup: formData.indigenousGroup,
                        witnessedConflict: formData.witnessedConflict,
                        isSafeInCommunity: formData.isSafeInCommunity,
                        isSoloParent: formData.isSoloParent,
                        isChildOfSoloParent: formData.isChildOfSoloParent,
                        motherLastName: formData.motherLastName,
                        motherGivenName: formData.motherGivenName,
                        motherMiddleName: formData.motherMiddleName,
                        motherOccupation: formData.motherOccupation,
                        motherContact: formData.motherContact,
                        fatherLastName: formData.fatherLastName,
                        fatherGivenName: formData.fatherGivenName,
                        fatherMiddleName: formData.fatherMiddleName,
                        fatherOccupation: formData.fatherOccupation,
                        fatherContact: formData.fatherContact,
                        parentAddress: formData.parentAddress,
                        numBrothers: formData.numBrothers,
                        numSisters: formData.numSisters,
                        birthOrder: formData.birthOrder,
                        spouseName: formData.spouseName,
                        spouseOccupation: formData.spouseOccupation,
                        numChildren: formData.numChildren,
                        guardianName: formData.guardianName,
                        guardianAddress: formData.guardianAddress,
                        guardianContact: formData.guardianContact,
                        guardianRelation: formData.guardianRelation,
                        emergencyName: formData.emergencyName,
                        emergencyAddress: formData.emergencyAddress,
                        emergencyRelationship: formData.emergencyRelationship,
                        emergencyNumber: formData.emergencyNumber,
                        elemSchool: formData.elemSchool,
                        elemYearGraduated: formData.elemYearGraduated,
                        juniorHighSchool: formData.juniorHighSchool,
                        juniorHighYearGraduated: formData.juniorHighYearGraduated,
                        seniorHighSchool: formData.seniorHighSchool,
                        seniorHighYearGraduated: formData.seniorHighYearGraduated,
                        collegeSchool: formData.collegeSchool,
                        collegeYearGraduated: formData.collegeYearGraduated,
                        honorsAwards: formData.honorsAwards,
                        extracurricularActivities: formData.extracurricularActivities,
                        scholarshipsAvailed: formData.scholarshipsAvailed
                    }
                },
                fallbackMessage: 'Account activation failed.'
            });

            let data;

            try {
                data = await runStudentActivation(false);
            } catch (error: any) {
                const missingEnrollment = String(error?.message || '').includes('Student ID not found in the enrollment list.');
                const canContinueWithoutKey = missingEnrollment && !studentActivationPolicy.requireEnrollmentKey;

                if (!canContinueWithoutKey) {
                    throw error;
                }

                const confirmed = await new Promise<boolean>((resolve) => {
                    setEnrollmentWarning({
                        visible: true,
                        studentId: formData.studentId,
                        course: formData.course,
                        resolve
                    });
                });

                if (!confirmed) {
                    return;
                }

                data = await runStudentActivation(true);
            }

            const username = data.studentId || formData.studentId;
            const password = data.password;

            // Mock Email
            try {
                await invokeEdgeFunction('send-email', {
                    body: {
                        type: 'STUDENT_ACTIVATION',
                        email: formData.email,
                        name: `${formData.firstName} ${formData.lastName}`,
                        studentId: username,
                        password: password,
                        loginUrl: `${window.location.origin}/student/login`
                    },
                    fallbackMessage: 'Failed to send activation email.'
                });
            } catch (err) { console.error("Email failed", err); }

            setGeneratedCredentials({ username, password });
            showToast("Account Activated Successfully!", 'success');

        } catch (error: any) {
            showToast(error.message, 'error');
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
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%236366f1' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`
                    }}
                />
            </div>

            {/* Glowing Orbs */}
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
                                    {/* Student ID Input Group */}
                                    <div className="relative">
                                        <input
                                            required
                                            id="studentId"
                                            className="peer w-full bg-indigo-950/30 border border-indigo-800/50 rounded-xl px-5 py-4 pt-6 text-white text-base outline-none transition-all placeholder-transparent focus:bg-indigo-900/40 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
                                            placeholder="Student ID"
                                            value={loginId}
                                            onChange={e => setLoginId(e.target.value)}
                                        />
                                        <label
                                            htmlFor="studentId"
                                            className="absolute left-5 top-2 text-xs font-bold text-indigo-300/60 uppercase tracking-widest transition-all peer-placeholder-shown:text-base peer-placeholder-shown:top-4 peer-placeholder-shown:normal-case peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-xs peer-focus:font-bold peer-focus:uppercase peer-focus:text-sky-400 pointer-events-none"
                                        >
                                            Student ID
                                        </label>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/50 peer-focus:text-sky-400 transition-colors pointer-events-none">
                                            <User size={20} />
                                        </div>
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
                                        <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">Your credentials have been securely generated. Please save them.</p>

                                        <div className="max-w-sm mx-auto bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 mb-8 shadow-inner">
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
                                        <button
                                            onClick={() => { setShowActivateModal(false); setLoginId(generatedCredentials.username); }}
                                            className="bg-slate-900 text-white px-10 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 w-full max-w-sm"
                                        >
                                            Return to Login
                                        </button>
                                    </motion.div>
                                ) : (
                                    <form id="activationForm" onSubmit={handleActivation} className="relative min-h-[300px]">
                                        <AnimatePresence mode="wait">

                                            {/* STEP 1: VERIFICATION */}
                                            {activationStep === 1 && (
                                                <motion.div key="step1" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
                                                    <div className="mb-4">
                                                        <h3 className="text-xl font-bold text-slate-800">Enrollment Details</h3>
                                                        <p className="text-slate-500 text-sm">
                                                            {studentActivationPolicy.requireEnrollmentKey
                                                                ? 'We need to verify your uploaded enrollment key before you can continue.'
                                                                : 'We will check your uploaded enrollment key first. If none is found, you can review a warning before continuing activation.'}
                                                        </p>
                                                    </div>
                                                    {isLoadingActivationPolicy ? (
                                                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-xs font-semibold text-indigo-700">
                                                            Checking the current student activation policy...
                                                        </div>
                                                    ) : (
                                                        <div className={`rounded-2xl border px-4 py-3 text-xs leading-relaxed ${
                                                            studentActivationPolicy.requireEnrollmentKey
                                                                ? 'border-emerald-100 bg-emerald-50/70 text-emerald-700'
                                                                : 'border-amber-100 bg-amber-50/80 text-amber-800'
                                                        }`}>
                                                            {studentActivationPolicy.requireEnrollmentKey
                                                                ? 'Strict mode is on. CARE Staff must upload or sync your enrollment key before Student Portal activation can finish.'
                                                                : 'Warning mode is on. If your key is still missing, the portal can warn you and continue activation after your confirmation.'}
                                                        </div>
                                                    )}
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
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Personal Information</h3></div>
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
                                                    {/* Gender, Year, Civil, etc */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Gender</label><select name="genderIdentity" value={formData.genderIdentity} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm"><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Level</label><select name="yearLevelApplying" value={formData.yearLevelApplying} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm"><option value="1st Year">I</option><option value="2nd Year">II</option><option value="3rd Year">III</option><option value="4th Year">IV</option></select></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Civil Status</label><select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm"><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated Legally">Separated Legally</option><option value="Separated Physically">Separated Physically</option><option value="With Live-In Partner">With Live-In Partner</option><option value="Divorced">Divorced</option><option value="Widow/er">Widow/er</option></select></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nationality</label><input name="nationality" value={formData.nationality} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">FB Account Link</label><input name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Place of Birth</label><input name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Religion</label><input name="religion" value={formData.religion} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">School Last Attended</label><input name="schoolLastAttended" value={formData.schoolLastAttended} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm" /></div>
                                                    </div>
                                                    {/* Supporter */}
                                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase block">Person who supported your studies aside from parents</label>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants'].map(opt => (
                                                                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" value={opt} checked={(formData.supporter || []).includes(opt)} onChange={e => handleCheckboxGroup(e, 'supporter')} className="w-4 h-4 text-indigo-600" />{opt}</label>
                                                            ))}
                                                        </div>
                                                        <input name="supporterContact" placeholder="Supporter Contact Info" value={formData.supporterContact} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all text-sm mt-2" />
                                                    </div>
                                                    {/* Working Student */}
                                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase block">Are you a Working Student?</label>
                                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value={o} checked={formData.isWorkingStudent === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                                        {formData.isWorkingStudent === 'Yes' && <select name="workingStudentType" value={formData.workingStudentType} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select Type</option><option value="House help">House help</option><option value="Call Center Agent/BPO employee">Call Center Agent/BPO employee</option><option value="Fast food/Restaurant">Fast food/Restaurant</option><option value="Online employee/Freelancer">Online employee/Freelancer</option><option value="Self-employed">Self-employed</option></select>}
                                                    </div>
                                                    {/* PWD */}
                                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase block">Are you a Person with a Disability (PWD)?</label>
                                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value={o} checked={formData.isPwd === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                                        {formData.isPwd === 'Yes' && <select name="pwdType" value={formData.pwdType} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select Type</option><option value="Visual impairment">Visual impairment</option><option value="Hearing impairment">Hearing impairment</option><option value="Physical/Orthopedic disability">Physical/Orthopedic disability</option><option value="Chronic illness">Chronic illness</option><option value="Psychosocial disability">Psychosocial disability</option><option value="Communication disability">Communication disability</option></select>}
                                                    </div>
                                                    {/* Indigenous */}
                                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                                        <label className="text-xs font-bold text-slate-500 uppercase block">Are you a member of any Indigenous Group?</label>
                                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value={o} checked={formData.isIndigenous === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                                        {formData.isIndigenous === 'Yes' && <select name="indigenousGroup" value={formData.indigenousGroup} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select Group</option><option value="Bukidnon">Bukidnon</option><option value="Tabihanon Group">Tabihanon Group</option><option value="ATA">ATA</option><option value="IFUGAO">IFUGAO</option><option value="Kalahing Kulot">Kalahing Kulot</option><option value="Lumad">Lumad</option></select>}
                                                    </div>
                                                    {/* Conflict & Solo Parent */}
                                                    <div className="pt-3 border-t border-slate-100 space-y-3">
                                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Have you witnessed armed conflict or insurgency in your community?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="witnessedConflict" value={o} checked={formData.witnessedConflict === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Do you feel safe in your community?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSafeInCommunity" value={o} checked={formData.isSafeInCommunity === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Are you a Solo Parent?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSoloParent" value={o} checked={formData.isSoloParent === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Are you a son/daughter of a solo parent?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isChildOfSoloParent" value={o} checked={formData.isChildOfSoloParent === o} onChange={handleChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* STEP 3: FAMILY BACKGROUND */}
                                            {activationStep === 3 && (
                                                <motion.div key="step3" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Family Background</h3></div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Last Name</label><input name="motherLastName" placeholder="N/A if not applicable" value={formData.motherLastName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Given Name</label><input name="motherGivenName" placeholder="N/A if not applicable" value={formData.motherGivenName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Middle Name</label><input name="motherMiddleName" placeholder="N/A if not applicable" value={formData.motherMiddleName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Occupation</label><input name="motherOccupation" placeholder="N/A if not applicable" value={formData.motherOccupation} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Contact</label><input name="motherContact" placeholder="N/A if not applicable" value={formData.motherContact} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Last Name</label><input name="fatherLastName" placeholder="N/A if not applicable" value={formData.fatherLastName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Given Name</label><input name="fatherGivenName" placeholder="N/A if not applicable" value={formData.fatherGivenName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Middle Name</label><input name="fatherMiddleName" placeholder="N/A if not applicable" value={formData.fatherMiddleName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Occupation</label><input name="fatherOccupation" placeholder="N/A if not applicable" value={formData.fatherOccupation} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Contact</label><input name="fatherContact" placeholder="N/A if not applicable" value={formData.fatherContact} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Parent's Address</label><input name="parentAddress" placeholder="N/A if not applicable" value={formData.parentAddress} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Brothers</label><input name="numBrothers" placeholder="N/A" value={formData.numBrothers} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Sisters</label><input name="numSisters" placeholder="N/A" value={formData.numSisters} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Birth Order</label><select name="birthOrder" value={formData.birthOrder} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                                                    </div>
                                                    <div className="pt-3 border-t border-slate-100">
                                                        <p className="text-xs text-slate-400 mb-2 italic">If married, fill the fields below. Type N/A if not applicable.</p>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Spouse Name</label><input name="spouseName" placeholder="N/A" value={formData.spouseName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Spouse Occupation</label><input name="spouseOccupation" placeholder="N/A" value={formData.spouseOccupation} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Children</label><input name="numChildren" placeholder="N/A" value={formData.numChildren} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* STEP 4: GUARDIAN */}
                                            {activationStep === 4 && (
                                                <motion.div key="step4" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Guardian</h3></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input name="guardianName" value={formData.guardianName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="guardianAddress" value={formData.guardianAddress} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label><input name="guardianContact" value={formData.guardianContact} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Relation to Guardian</label><select name="guardianRelation" value={formData.guardianRelation} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Relative">Relative</option><option value="Not relative">Not relative</option><option value="Landlord">Landlord</option><option value="Landlady">Landlady</option></select></div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* STEP 5: EMERGENCY CONTACT */}
                                            {activationStep === 5 && (
                                                <motion.div key="step5" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Person to Contact (In Case of Emergency)</h3></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input name="emergencyName" value={formData.emergencyName} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="emergencyAddress" value={formData.emergencyAddress} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Relationship</label><input name="emergencyRelationship" value={formData.emergencyRelationship} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label><input name="emergencyNumber" value={formData.emergencyNumber} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* STEP 6: EDUCATIONAL BACKGROUND */}
                                            {activationStep === 6 && (
                                                <motion.div key="step6" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Educational Background</h3></div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Elementary</label><input name="elemSchool" value={formData.elemSchool} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="elemYearGraduated" value={formData.elemYearGraduated} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Junior High School</label><input name="juniorHighSchool" value={formData.juniorHighSchool} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="juniorHighYearGraduated" value={formData.juniorHighYearGraduated} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Senior High School</label><input name="seniorHighSchool" value={formData.seniorHighSchool} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="seniorHighYearGraduated" value={formData.seniorHighYearGraduated} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">College</label><input name="collegeSchool" value={formData.collegeSchool} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated / Continuing</label><input name="collegeYearGraduated" value={formData.collegeYearGraduated} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                    </div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Honor/Award Received</label><input name="honorsAwards" placeholder="N/A if not applicable" value={formData.honorsAwards} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                                </motion.div>
                                            )}

                                            {/* STEP 7: EXTRA-CURRICULAR INVOLVEMENT */}
                                            {activationStep === 7 && (
                                                <motion.div key="step7" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Name of Activities</label><textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={formData.extracurricularActivities} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none" /></div>
                                                </motion.div>
                                            )}

                                            {/* STEP 8: SCHOLARSHIPS */}
                                            {activationStep === 8 && (
                                                <motion.div key="step8" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-4">
                                                    <div className="mb-2"><h3 className="text-xl font-bold text-slate-800">Scholarships</h3></div>
                                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Name of Scholarship Availed</label><textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={formData.scholarshipsAvailed} onChange={handleChange} rows={4} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none" /></div>
                                                </motion.div>
                                            )}

                                            {/* STEP 9: FINISH */}
                                            {activationStep === 9 && (
                                                <motion.div key="step9" initial="initial" animate="in" exit="out" variants={pageVariants} className="space-y-6">
                                                    <div className="mb-4 text-center">
                                                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-200">
                                                            <Lock className="w-8 h-8 text-slate-400" />
                                                        </div>
                                                        <h3 className="text-2xl font-bold text-slate-800">Final Step</h3>
                                                        <p className="text-slate-500 text-sm mt-1">Please agree to the data privacy terms to finalize your account creation.</p>
                                                    </div>
                                                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-left">
                                                        <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> DATA PRIVACY ACT DISCLAIMER</h4>
                                                        <p className="text-xs text-indigo-800/80 mb-5 leading-relaxed">
                                                            By submitting this form, I hereby authorize Negros Oriental State University (NORSU) to collect, process, and retain my personal and sensitive information for purposes of academic administration, student services, and university records in strict accordance with the Data Privacy Act of 2012 (RA 10173).
                                                        </p>
                                                        <label className="flex items-center gap-3 cursor-pointer group">
                                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${formData.agreedToPrivacy ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>
                                                                {formData.agreedToPrivacy && <Check className="w-3.5 h-3.5 text-white" />}
                                                            </div>
                                                            <input type="checkbox" checked={formData.agreedToPrivacy} onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                                            <span className="text-sm font-bold text-slate-800">I have read and agree to the terms</span>
                                                        </label>
                                                    </div>
                                                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
                                                        <p className="text-xs text-emerald-700 italic leading-relaxed">"Thank you for taking the time to complete this form. Your responses will help us serve you better. If you have any questions or need further assistance, please feel free to reach out. We appreciate your time and cooperation!"</p>
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
                                            type="submit"
                                            form="activationForm"
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
                {enrollmentWarning.visible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-amber-200/60 bg-white shadow-2xl"
                        >
                            <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 px-6 py-5">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
                                        <AlertCircle className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600/80">Enrollment Warning</p>
                                        <h3 className="mt-1 text-xl font-bold text-slate-900">Enrollment key not found yet</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            We could not find an uploaded enrollment key for the details below. Since warning mode is currently enabled,
                                            you may continue activation and let the system create the enrollment record during activation.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 px-6 py-5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Review these details</p>
                                    <div className="mt-3 space-y-2 text-sm text-slate-700">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">Student ID:</span>
                                            <span className="rounded border border-slate-200 bg-white px-2 py-0.5 font-mono">{enrollmentWarning.studentId}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">Course:</span>
                                            <span className="rounded border border-slate-200 bg-white px-2 py-0.5">{enrollmentWarning.course}</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-500">
                                    Continue only if these details are correct. If not, cancel and wait for CARE Staff to upload or sync your enrollment key.
                                </p>
                            </div>
                            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        enrollmentWarning.resolve?.(false);
                                        setEnrollmentWarning({ visible: false, studentId: '', course: '', resolve: null });
                                    }}
                                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        enrollmentWarning.resolve?.(true);
                                        setEnrollmentWarning({ visible: false, studentId: '', course: '', resolve: null });
                                    }}
                                    className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-200 transition-colors hover:bg-amber-600"
                                >
                                    Continue Activation
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
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
