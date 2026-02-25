import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    GraduationCap, ArrowLeft, FileText, Info, Check, User, Key,
    Calendar, MapPin, Loader2, X, Clock, HelpCircle, LogOut, Mail, Phone, ArrowRight, ChevronDown
} from 'lucide-react';
import { motion, Variants, AnimatePresence } from 'framer-motion';

// --- ASSETS & CONSTANTS ---

// --- REUSABLE LAYOUT COMPONENT ---
const NATLayout = ({ children, title = "NORSU Admission Test", showBack = false, onBack, rightAction }: any) => (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-inter selection:bg-blue-200">
        {/* Animated Background Blobs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-[35rem] h-[35rem] bg-cyan-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-10%] left-[20%] w-[45rem] h-[45rem] bg-indigo-400/30 rounded-full mix-blend-multiply filter blur-[80px] opacity-50 animate-blob animation-delay-4000"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
            {/* Glass Header */}
            <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-white/50 shadow-sm supports-[backdrop-filter]:bg-white/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/20 ring-1 ring-white/50">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg md:text-xl font-bold text-gray-900 tracking-tight leading-tight">{title}</h1>
                            <p className="text-xs text-blue-600 font-medium tracking-wide uppercase">Gateway to Excellence</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {rightAction}
                        {showBack && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-white/50 border border-transparent hover:border-gray-200 transition-all duration-200 group"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                <span className="hidden md:inline">Back</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-grow p-4 md:p-8 flex flex-col justify-center">
                {children}
            </main>
        </div>
    </div>
);

const NATPortal = () => {
    const navigate = useNavigate();
    // Start at 'welcome' screen
    const [currentScreen, setCurrentScreen] = useState<string>('welcome');
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
    const [showActivationModal, setShowActivationModal] = useState<boolean>(false);

    // Auth & User State
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [credentials, setCredentials] = useState<any>(null);

    // Options
    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [availableDates, setAvailableDates] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState<any>({
        agreedToPrivacy: false,
        firstName: '', lastName: '', middleName: '', suffix: '',
        studentId: '', // Optional/If applicable
        dob: '', age: '', placeOfBirth: '',
        nationality: 'Filipino',
        sex: '',
        genderIdentity: '',
        civilStatus: '',
        street: '', city: '', province: '', zipCode: '',
        mobile: '', email: '', facebookUrl: '',
        schoolLastAttended: '', yearLevelApplying: '', reason: '',
        priorityCourse: '', altCourse1: '', altCourse2: '', altCourse3: '',
        testDate: '',
        isWorkingStudent: 'No', workingStudentType: '',
        supporter: [], supporterContact: '',
        isPwd: 'No', pwdType: '',
        isIndigenous: 'No', indigenousGroup: '',
        witnessedConflict: 'No', isSoloParent: 'No', isChildOfSoloParent: 'No'
    });

    // Time State for Test Day
    const [timeState, setTimeState] = useState<any>({ isTestDate: false, isOpen: false });
    const [showTimeInConfirm, setShowTimeInConfirm] = useState(false);
    const [showTimeOutConfirm, setShowTimeOutConfirm] = useState(false);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // Timer Effect
    useEffect(() => {
        let interval: any;
        if (currentUser?.time_in && !currentUser?.time_out) {
            interval = setInterval(() => {
                const start = new Date(currentUser.time_in).getTime();
                const now = new Date().getTime();
                const diff = now - start;

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [currentUser]);

    // Realtime: auto-update applicant status when dept head changes it
    useEffect(() => {
        if (!currentUser?.id) return;
        const channel = supabase
            .channel(`nat_user_${currentUser.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'applications',
                filter: `id=eq.${currentUser.id}`
            }, (payload: any) => {
                console.log('[NATPortal] Realtime update received:', payload.new?.status);
                setCurrentUser((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [currentUser?.id]);
    const [toast, setToast] = useState<any>(null);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load Options
    useEffect(() => {
        const fetchOptions = async () => {
            // Fetch Courses
            const { data: coursesData } = await supabase.from('courses').select('*').order('name');

            // Fetch Test Dates
            const { data: datesData } = await supabase
                .from('admission_schedules')
                .select('*')
                .eq('is_active', true)
                .order('date');

            // Fetch Application Counts
            const { data: appsData } = await supabase.from('applications').select('priority_course, test_date');

            if (coursesData && appsData) {
                const courseCounts: Record<string, any> = {};
                appsData.forEach((a: any) => courseCounts[a.priority_course] = (courseCounts[a.priority_course] || 0) + 1);

                const coursesWithStats = coursesData.map((c: any) => ({
                    ...c,
                    applicantCount: courseCounts[c.name] || 0
                }));
                setAvailableCourses(coursesWithStats);
            }

            if (datesData) {
                const dateCounts: Record<string, any> = {};
                if (appsData) appsData.forEach((a: any) => { if (a.test_date) dateCounts[a.test_date] = (dateCounts[a.test_date] || 0) + 1; });

                const datesWithStats = datesData.map((d: any) => ({ ...d, applicantCount: dateCounts[d.date] || 0 }));
                setAvailableDates(datesWithStats);
            }
        };
        fetchOptions();
    }, []);

    // Check Time Logic (Secure Server Time)
    useEffect(() => {
        if (currentScreen !== 'dashboard' || !currentUser) return;
        const checkTime = async () => {
            try {
                // Fetch secure time to prevent local clock manipulation
                const response = await fetch('https://worldtimeapi.org/api/timezone/Asia/Manila');
                if (!response.ok) throw new Error("Time API failed");
                const timeData = await response.json();
                const now = new Date(timeData.datetime);

                const todayDate = timeData.datetime.split('T')[0];
                const currentHour = now.getHours();

                const isTestDate = currentUser.test_date === todayDate;
                const isMorningSlot = currentHour >= 8 && currentHour < 12;
                const isAfternoonSlot = currentHour >= 13 && currentHour < 17;
                const isOpen = isMorningSlot || isAfternoonSlot;
                setTimeState({ isTestDate, isOpen });
            } catch (err) {
                // Fallback to local time if API is down
                const now = new Date();
                const todayDate = now.toISOString().split('T')[0];
                const currentHour = now.getHours();

                const isTestDate = currentUser.test_date === todayDate;
                const isMorningSlot = currentHour >= 8 && currentHour < 12;
                const isAfternoonSlot = currentHour >= 13 && currentHour < 17;
                const isOpen = isMorningSlot || isAfternoonSlot;
                setTimeState({ isTestDate, isOpen });
            }
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, [currentScreen, currentUser]);

    // Real-time Status Update
    useEffect(() => {
        let channel: any;
        if (currentUser) {
            channel = supabase.channel('nat_app_status')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${currentUser.id}` }, (payload: any) => {
                    setCurrentUser((prev: any) => ({ ...prev, ...payload.new }));
                    showToast(`Application Status Updated: ${payload.new.status}`, 'info');
                })
                .subscribe();
        } else if (credentials?.referenceId) {
            channel = supabase.channel('nat_app_ref_status')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `reference_id=eq.${credentials.referenceId}` }, (payload: any) => {
                    showToast(`Application Status Updated: ${payload.new.status}`, 'info');
                })
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); }
    }, [currentUser, credentials]);

    // Handlers
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
            setFormData({ ...formData, [name]: value, age: age >= 0 ? age : '' });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleCheckboxGroup = (e: any, field: string) => {
        const { value, checked } = e.target;
        setFormData((prev: any) => {
            const list = prev[field] || [];
            if (checked) return { ...prev, [field]: [...list, value] };
            return { ...prev, [field]: list.filter((item: any) => item !== value) };
        });
    };

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (currentStep === 1 && !formData.agreedToPrivacy) {
            showToast("You must agree to the Data Privacy Act Disclaimer.", 'error');
            return;
        }

        if (currentStep === 2) {
            if (availableDates.length === 0) {
                showToast("No test schedules are currently available.", 'error');
                return;
            }
            if (!formData.testDate) {
                showToast("Please select a test date.", 'error');
                return;
            }
        }

        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setLoading(true);
        const username = formData.email;
        const password = Math.random().toString(36).slice(-8);
        const referenceId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

        try {
            const payload = {
                reference_id: referenceId,
                first_name: formData.firstName,
                last_name: formData.lastName,
                middle_name: formData.middleName,
                suffix: formData.suffix,
                student_id: formData.studentId ? formData.studentId.trim() : null,
                place_of_birth: formData.placeOfBirth,
                age: formData.age,
                sex: formData.sex,
                gender_identity: formData.genderIdentity,
                civil_status: formData.civilStatus,
                nationality: formData.nationality,
                reason: formData.reason,
                street: formData.street,
                city: formData.city,
                province: formData.province,
                zip_code: formData.zipCode,
                mobile: formData.mobile,
                email: formData.email.trim(),
                facebook_url: formData.facebookUrl,
                priority_course: formData.priorityCourse,
                alt_course_1: formData.altCourse1,
                alt_course_2: formData.altCourse2,
                test_date: formData.testDate,
                username: username,
                password: password,
                dob: formData.dob
            };

            const { error } = await supabase.from('applications').insert([payload]);
            if (error) throw error;

            setCredentials({ ...formData, username, password, referenceId });

            // Send Email Notification
            try {
                const { error: emailError } = await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'NAT_SUBMISSION',
                        email: formData.email,
                        name: `${formData.firstName} ${formData.lastName}`,
                        testDate: formData.testDate,
                        username: username,
                        password: password
                    }
                    // supabase-js automatically attaches apikey and Authorization headers
                });

                if (emailError) throw emailError;
            } catch (emailErr: any) {
                console.error("Email notification failed:", emailErr);
                showToast("Application saved, but email notification failed. Please save your credentials manually.", 'error'); // changed type to match HTML slightly or keep as warning
            }

            setShowSuccessModal(true);
        } catch (error: any) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                showToast('Submission Failed: This email address is already registered.', 'error');
            } else {
                showToast('Error: ' + error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const user = e.target.username.value;
        const pass = e.target.password.value;
        try {
            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .eq('username', user)
                .eq('password', pass)
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                showToast("Invalid credentials.", 'error');
            } else {
                setCurrentUser(data);
                setCurrentScreen('dashboard');
            }
        } catch (err: any) {
            showToast("Login error: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeIn = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('applications')
                .update({ time_in: 'now', status: 'Ongoing' })
                .eq('id', currentUser.id)
                .select()
                .single();

            if (error) throw error;
            showToast("Time In recorded successfully. Good luck!");
            setCurrentUser({ ...currentUser, time_in: data.time_in, status: 'Ongoing' });
            setShowTimeInConfirm(false);
        } catch (error: any) {
            showToast("Error recording Time In: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeOut = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('applications')
                .update({ time_out: 'now', status: 'Test Taken' })
                .eq('id', currentUser.id)
                .select()
                .single();

            if (error) throw error;
            showToast("Time Out recorded. You have completed the NAT.");
            setCurrentUser({ ...currentUser, time_out: data.time_out, status: 'Test Taken' });
            setShowTimeOutConfirm(false);
        } catch (error: any) {
            showToast("Error: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActivation = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const studentId = e.target.studentId.value.trim();
        const course = e.target.course.value.trim();

        try {
            // 1. Check if ID exists and is unused
            let { data: keyData, error: keyError } = await supabase
                .from('enrolled_students')
                .select('*')
                .eq('student_id', studentId)
                .maybeSingle();

            // FALLBACK: If key not found, check if student exists in main table (Manual Entry case)
            if (!keyData) {
                const { data: studentData } = await supabase
                    .from('students')
                    .select('student_id, course')
                    .eq('student_id', studentId)
                    .maybeSingle();

                if (studentData) {
                    // Check if already claimed
                    const { data: existingApp } = await supabase.from('applications').select('id').eq('student_id', studentId).maybeSingle();
                    if (existingApp) throw new Error("This Student ID is already linked to another account.");

                    if (studentData.course && studentData.course.toLowerCase() !== course.toLowerCase()) {
                        throw new Error(`Course mismatch. The ID ${studentId} is enrolled in ${studentData.course}.`);
                    }

                    // Generate key
                    const { data: newKey } = await supabase.from('enrolled_students').insert([{ student_id: studentId, course: course, is_used: false }]).select().single();
                    keyData = newKey;
                } else if (currentUser.status === 'Approved for Enrollment') {
                    // No enrollment key found — ask user to confirm their details before auto-creating
                    const confirmed = window.confirm(
                        `⚠️ No enrollment record found for Student ID "${studentId}".\n\n` +
                        `This may happen if the enrollment key has not been uploaded yet by the staff.\n\n` +
                        `Please confirm your details are correct:\n` +
                        `• Student ID: ${studentId}\n` +
                        `• Course: ${course}\n\n` +
                        `Since your application is approved for enrollment, we can proceed with activation using these details.\n\n` +
                        `Are you sure these are correct?`
                    );
                    if (!confirmed) {
                        setLoading(false);
                        return;
                    }
                    const { data: newKey, error: createError } = await supabase.from('enrolled_students').insert([{ student_id: studentId, course: course, is_used: false }]).select().single();
                    if (createError) throw new Error("Failed to create enrollment record: " + createError.message);
                    keyData = newKey;
                }
            }

            if (keyError) throw new Error("Verification Error: " + keyError.message);
            if (!keyData) throw new Error("Invalid Student ID. Please ensure the ID is correct.");

            // Verify Course Match for keys
            if (keyData.course && keyData.course.toLowerCase() !== course.toLowerCase()) {
                throw new Error(`Invalid Course. This ID is registered for ${keyData.course}.`);
            }

            if (keyData.is_used) {
                if (keyData.assigned_to_email === currentUser.email) {
                    console.log("ID ownership verified. Syncing profile...");
                } else {
                    throw new Error("This Student ID has already been activated by another user.");
                }
            } else {
                // 2. Mark key as used
                const { error: updateKeyError } = await supabase
                    .from('enrolled_students')
                    .update({ is_used: true, status: 'Activated', assigned_to_email: currentUser.email })
                    .eq('student_id', studentId);
                if (updateKeyError) throw updateKeyError;
            }

            // 3. Prepare Student Profile Data
            let matchedDepartment = 'Unassigned';
            if (course) {
                const { data: courseData } = await supabase
                    .from('courses')
                    .select('name, departments(name)')
                    .eq('name', course)
                    .maybeSingle();

                if (courseData && courseData.departments && (courseData.departments as any).name) {
                    matchedDepartment = (courseData.departments as any).name;
                }
            }

            const profileData = {
                password: currentUser.password,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name,
                middle_name: currentUser.middle_name,
                suffix: currentUser.suffix,
                dob: currentUser.dob,
                age: currentUser.age,
                place_of_birth: currentUser.place_of_birth,
                sex: currentUser.sex,
                gender_identity: currentUser.gender_identity,
                civil_status: currentUser.civil_status,
                nationality: currentUser.nationality,
                email: currentUser.email,
                mobile: currentUser.mobile,
                facebook_url: currentUser.facebook_url,
                street: currentUser.street,
                city: currentUser.city,
                province: currentUser.province,
                zip_code: currentUser.zip_code,
                emergency_contact: currentUser.supporter_contact || '',
                address: `${currentUser.street}, ${currentUser.city}, ${currentUser.province}`,
                gender: currentUser.sex,
                course: course,
                year_level: '1st Year',
                status: 'Active',
                department: matchedDepartment,
                school_last_attended: currentUser.school_last_attended,
                is_working_student: currentUser.is_working_student,
                working_student_type: currentUser.working_student_type,
                supporter: currentUser.supporter,
                supporter_contact: currentUser.supporter_contact,
                is_pwd: currentUser.is_pwd,
                pwd_type: currentUser.pwd_type,
                is_indigenous: currentUser.is_indigenous,
                indigenous_group: currentUser.indigenous_group,
                witnessed_conflict: currentUser.witnessed_conflict,
                is_solo_parent: currentUser.is_solo_parent,
                is_child_of_solo_parent: currentUser.is_child_of_solo_parent,
                priority_course: currentUser.priority_course,
                alt_course_1: currentUser.alt_course_1,
                alt_course_2: currentUser.alt_course_2
            };

            // 4. Upsert student
            const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('student_id', studentId)
                .maybeSingle();

            if (existingStudent) {
                const { error: updateError } = await supabase.from('students').update(profileData).eq('student_id', studentId);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase.from('students').insert([{ ...profileData, student_id: studentId }]);
                if (insertError) throw insertError;
            }

            // 5. Delete application
            await supabase.from('applications').delete().eq('id', currentUser.id);

            // Send Activation Email
            try {
                await supabase.functions.invoke('send-email', {
                    body: {
                        type: 'STUDENT_ACTIVATION',
                        email: currentUser.email,
                        name: `${currentUser.first_name} ${currentUser.last_name}`,
                        studentId: studentId,
                        password: currentUser.password
                    }
                });
            } catch (emailErr: any) {
                console.error("Activation email failed:", emailErr);
            }

            showToast("Account Activated Successfully! A confirmation email has been sent. Your application details have been transferred to your Student Profile.");
            setShowActivationModal(false);
            setCurrentUser(null);
            navigate('/student/login');
        } catch (error: any) {
            showToast("Activation Failed: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };



    // Render Views
    // Page transition variants
    // Added error state to ensure form submission doesn't silently fail if connection drops
    const [submitError, setSubmitError] = useState<string | null>(null);

    // --- ANIMATION VARIANTS ---
    const containerVariants: Variants = {
        initial: { opacity: 0 },
        in: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        initial: { opacity: 0, y: 20 },
        in: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
        }
    };


    // --- DATA FETCHING ---
    // --- RENDER SCREEN: WELCOME ---
    if (currentScreen === 'welcome') return (
        <NATLayout
            rightAction={
                <button onClick={() => navigate('/')} className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                    Back to Main
                </button>
            }
        >
            <div className="max-w-5xl mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white p-6 md:p-14 text-center relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none"></div>

                    <motion.div
                        variants={containerVariants}
                        initial="initial"
                        animate="in"
                        className="relative z-10"
                    >
                        <motion.div variants={itemVariants} className="inline-flex p-4 md:p-5 bg-gradient-to-br from-white to-blue-50 border border-white rounded-[2rem] shadow-xl shadow-blue-200/50 mb-6 md:mb-8 transform hover:scale-110 transition-transform duration-500 relative">
                            <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full"></div>
                            <FileText className="w-10 h-10 md:w-14 md:h-14 text-blue-600 relative z-10 drop-shadow-sm" />
                        </motion.div>
                        <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-900 via-blue-700 to-indigo-900 mb-4 tracking-tight">
                            Welcome to NORSU
                        </motion.h2>
                        <motion.p variants={itemVariants} className="text-lg md:text-2xl text-slate-600/90 font-medium mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed">
                            Begin your academic journey with the Negros Oriental State University Admission Test.
                        </motion.p>

                        <motion.div variants={containerVariants} className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12 text-left">
                            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform group/card hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300"></div>
                                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-3 text-base md:text-lg relative z-10">
                                    <div className="p-2 bg-blue-100/50 rounded-xl"><Info className="w-5 h-5 text-blue-600" /></div> About the Test
                                </h3>
                                <p className="text-sm md:text-base text-slate-600/90 leading-relaxed font-medium relative z-10">
                                    The NAT assesses your readiness for university-level education. It ensures you are prepared for the academic challenges ahead with a comprehensive evaluation.
                                </p>
                            </motion.div>
                            <motion.div variants={itemVariants} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 md:p-8 border border-white shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 transform group/steps hover:-translate-y-1 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent opacity-0 group-hover/steps:opacity-100 transition-opacity duration-300"></div>
                                <h3 className="font-bold text-slate-800 mb-5 text-base md:text-lg relative z-10">Application Steps</h3>
                                <div className="space-y-3 md:space-y-4 relative z-10">
                                    {["Complete application form", "Choose test schedule", "Receive credentials", "Take the test"].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 md:gap-4 text-xs md:text-sm text-slate-700 font-bold group/step">
                                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center text-[10px] md:text-xs font-black border border-blue-200/50 shadow-sm group-hover/step:scale-110 transition-transform">{i + 1}</div>
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center max-w-lg mx-auto">
                            <button
                                onClick={() => setCurrentScreen('form')}
                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 md:py-4 px-6 md:px-8 rounded-2xl font-bold text-base md:text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <span className="relative z-10 flex items-center gap-2">Apply Now <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover/btn:translate-x-1 transition-transform" /></span>
                            </button>
                            <button
                                onClick={() => setCurrentScreen('login')}
                                className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 text-slate-700 py-3 md:py-4 px-6 md:px-8 rounded-2xl font-bold text-base md:text-lg hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-95"
                            >
                                Login to Portal
                            </button>
                        </motion.div>
                    </motion.div>
                </motion.div>

                <p className="text-center text-slate-400/80 text-sm mt-8 font-semibold tracking-wide">© {new Date().getFullYear()} NORSU Admission Office. All rights reserved.</p>
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: STATUS ---
    if (currentScreen === 'status') return (
        <NATLayout title="Applicant Status" showBack={false}>
            <div className="max-w-4xl mx-auto w-full">
                <motion.div
                    initial="initial" animate="in" variants={containerVariants}
                    className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 border border-white p-6 md:p-12 overflow-hidden relative"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500"></div>

                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-10 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-800 tracking-tight">Application Status</h1>
                            <p className="text-slate-500 text-sm font-semibold mt-2 flex items-center gap-2">Ref ID: <span className="font-mono text-xs md:text-sm text-slate-700 bg-white/60 border border-slate-200 px-2 md:px-3 py-1 rounded-lg shadow-sm">{credentials?.referenceId}</span></p>
                        </div>
                        <span className="px-5 md:px-6 py-2.5 bg-gradient-to-r from-green-50 to-emerald-50 text-emerald-700 rounded-2xl text-xs md:text-sm font-bold flex items-center gap-3 shadow-md shadow-emerald-500/10 border border-emerald-200/50 w-full md:w-auto justify-center md:justify-start">
                            <span className="relative flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                            </span>
                            Submitted Successfully
                        </span>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
                        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-md rounded-[1.5rem] p-5 md:p-6 border border-white shadow-sm">
                            <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest mb-1 md:mb-2">Applicant Name</p>
                            <p className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{credentials?.firstName} {credentials?.lastName}</p>
                        </motion.div>
                        <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-md rounded-[1.5rem] p-5 md:p-6 border border-blue-100/50 shadow-sm">
                            <p className="text-[10px] md:text-xs font-black text-blue-400 uppercase tracking-widest mb-1 md:mb-2">Priority Course</p>
                            <p className="text-xl md:text-2xl font-black text-blue-700 tracking-tight">{credentials?.priorityCourse}</p>
                        </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 border border-blue-200/50 rounded-[1.5rem] p-8 mb-8 flex gap-5 shadow-inner">
                        <div className="bg-white p-3 rounded-2xl h-fit text-blue-600 shadow-md shadow-blue-500/10"><Clock className="w-7 h-7" /></div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 mb-2 text-lg">Next Steps</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Your application is being processed. Please prepare for your admission test on <span className="font-black text-blue-700 bg-white/50 px-2 py-0.5 rounded-md border border-blue-100">{credentials?.testDate}</span>.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="bg-gradient-to-br from-amber-50/90 to-orange-50/90 border border-amber-200/50 rounded-[2rem] p-8 mb-10 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-black text-amber-900 mb-6 flex items-center gap-3">
                                <div className="bg-white p-2 rounded-xl text-amber-600 shadow-sm"><Key className="w-5 h-5" /></div> Your Portal Credentials
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white/80 backdrop-blur-sm border border-amber-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-black">Username</p>
                                    <p className="font-mono font-black text-2xl text-slate-800 tracking-tight">{credentials?.username}</p>
                                </div>
                                <div className="bg-white/80 backdrop-blur-sm border border-amber-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                    <p className="text-xs text-slate-400 mb-2 uppercase tracking-widest font-black">Password</p>
                                    <p className="font-mono font-black text-2xl text-slate-800 tracking-tight">{credentials?.password}</p>
                                </div>
                            </div>
                            <p className="text-sm text-amber-800 mt-6 font-bold flex items-center gap-2 opacity-90 block">
                                <Info className="w-4 h-4" /> Please save these credentials. You will need them to take the test.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
                        <button
                            onClick={() => setCurrentScreen('login')}
                            className="flex-1 bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 px-6 rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            <LogOut className="w-5 h-5 relative z-10" /> <span className="relative z-10">Go to Login Portal</span>
                            <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform relative z-10" />
                        </button>
                        <button
                            onClick={() => setCurrentScreen('welcome')}
                            className="flex-1 bg-white/80 backdrop-blur-sm border-2 border-slate-200/50 text-slate-700 py-4 px-6 rounded-2xl font-black text-lg hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Back to Welcome
                        </button>
                    </motion.div>
                </motion.div>
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: LOGIN ---
    if (currentScreen === 'login') return (
        <NATLayout
            title="Applicant Login"
            showBack={true}
            onBack={() => setCurrentScreen('welcome')}
        >
            <div className="max-w-md mx-auto w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="bg-white/40 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white p-8 md:p-10 relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

                    <div className="text-center mb-8">
                        <div className="bg-gradient-to-br from-white to-blue-50 rounded-[1.5rem] w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-200/50 relative border border-white">
                            <div className="absolute inset-0 bg-blue-400/20 blur-xl rounded-full"></div>
                            <Key className="w-10 h-10 text-blue-600 relative z-10 drop-shadow-sm" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Access Your Portal</h1>
                        <p className="text-slate-600 font-medium">Enter the credentials sent to your email.</p>
                    </div>

                    <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-100/50 rounded-2xl p-5 mb-8 flex gap-3 shadow-inner">
                        <Info className="text-blue-500 shrink-0 w-5 h-5 mt-0.5 drop-shadow-sm" />
                        <p className="text-xs text-blue-800/90 leading-relaxed font-bold">
                            First time here? Your username and password are temporarily assigned after you submit your application form.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-slate-400 group-focus-within/input:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    name="username"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white/60 border-2 border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-bold text-slate-800 z-10 relative shadow-sm"
                                    placeholder="e.g. user_123456"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-slate-400 group-focus-within/input:text-indigo-500 transition-colors" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-white/60 border-2 border-slate-200/50 rounded-2xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 font-bold font-mono text-slate-800 shadow-sm tracking-wide"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 rounded-2xl font-black mt-4 hover:shadow-xl hover:shadow-slate-900/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-70 group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin relative z-10" /> : <LogOut className="w-5 h-5 relative z-10" />}
                            <span className="relative z-10">{loading ? "Verifying..." : "Secure Login"}</span>
                        </button>
                    </form>
                </motion.div>

                {toast && (
                    <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[100] backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-green-500/90'}`}>
                        <div className="bg-white/20 p-2 rounded-full">{toast.type === 'error' ? '⚠️' : '✅'}</div>
                        <div>
                            <h4 className="font-bold text-sm">{toast.type === 'error' ? 'Login Failed' : 'Success'}</h4>
                            <p className="text-xs opacity-90 font-medium">{toast.msg}</p>
                        </div>
                    </div>
                )}
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: DASHBOARD ---
    if (currentScreen === 'dashboard') {
        if (!currentUser) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
        return (
            <NATLayout
                title="Applicant Dashboard"
                rightAction={
                    <button
                        onClick={() => { setCurrentUser(null); setCurrentScreen('welcome'); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/50 hover:bg-white/80 border border-white/50 rounded-lg text-sm font-bold text-red-600 transition-all shadow-sm hover:shadow active:scale-95"
                    >
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                }
            >
                <div className="max-w-6xl mx-auto w-full animate-slide-in-up pb-24">

                    {/* Smart Action Bar (Time In/Out) */}
                    <div className="fixed bottom-0 left-0 w-full z-50 p-4 flex justify-center pointer-events-none">
                        <div className={`pointer-events-auto bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-2 flex items-center gap-4 transition-all duration-500 max-w-lg w-full ${!currentUser.time_in ? 'translate-y-0 opacity-100' : ''}`}>

                            {/* Status Display */}
                            <div className="flex-1 pl-4">
                                {!currentUser.time_in ? (
                                    <div>
                                        <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Ready</p>
                                        <p className="text-white font-bold">Good luck, {currentUser.first_name}!</p>
                                    </div>
                                ) : !currentUser.time_out ? (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                            </span>
                                            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Ongoing</p>
                                        </div>
                                        <p className="text-white font-mono font-bold text-lg">{elapsedTime}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-400" />
                                            <p className="text-xs text-white/80 font-bold uppercase tracking-wider">Done</p>
                                        </div>
                                        <p className="text-white font-bold">Great job!</p>
                                    </div>
                                )}
                            </div>

                            {/* Action Button */}
                            <div>
                                {!currentUser.time_in ? (
                                    <button
                                        onClick={() => setShowTimeInConfirm(true)}
                                        disabled={!(timeState.isTestDate && timeState.isOpen)}
                                        className={`px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 ${(timeState.isTestDate && timeState.isOpen) ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 hover:shadow-green-500/30' : 'bg-gray-500/50 cursor-not-allowed grayscale'}`}
                                    >
                                        <Clock className="w-5 h-5" /> TIME IN
                                    </button>
                                ) : !currentUser.time_out ? (
                                    <button
                                        onClick={() => setShowTimeOutConfirm(true)}
                                        className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-600 hover:scale-105 hover:shadow-red-500/30"
                                    >
                                        <LogOut className="w-5 h-5" /> TIME OUT
                                    </button>
                                ) : (
                                    <button disabled className="px-6 py-3 rounded-xl font-bold text-white/50 bg-white/10 cursor-not-allowed flex items-center gap-2">
                                        <Check className="w-5 h-5" /> DONE
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Time In Confirmation Modal */}
                    {showTimeInConfirm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                    <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-md shadow-inner">
                                        <Clock className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">Time In?</h3>
                                    <p className="text-green-50 text-sm relative z-10">Your time will begin immediately.</p>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                                            <Info className="w-5 h-5 text-gray-400 shrink-0" />
                                            <span>Ensure you are in the examination room.</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                                            <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                                            <span>The timer will run until you clock out.</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setShowTimeInConfirm(false)} className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button onClick={executeTimeIn} className="py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 hover:-translate-y-1 transition-all">Confirm Time In</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Time Out Confirmation Modal */}
                    {showTimeOutConfirm && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200">
                            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-br from-red-500 to-rose-600 p-8 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                    <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center backdrop-blur-md shadow-inner">
                                        <LogOut className="w-10 h-10 text-white" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1 relative z-10">Time Out?</h3>
                                    <p className="text-red-50 text-sm relative z-10">This will stop your timer.</p>
                                </div>
                                <div className="p-6">
                                    <p className="text-center text-gray-600 text-sm mb-6">
                                        Are you sure you want to clock out? This action cannot be undone.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => setShowTimeOutConfirm(false)} className="py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
                                        <button onClick={executeTimeOut} className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 hover:-translate-y-1 transition-all">Confirm Time Out</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Activation Modal */}
                    {showActivationModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-200">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-white/20 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">Activate Student Account</h3>
                                        <p className="text-sm text-gray-500 mt-1">Enter your details to sync with Student Portal</p>
                                    </div>
                                    <button onClick={() => setShowActivationModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                                </div>

                                <form onSubmit={handleActivation} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Student ID</label>
                                        <input required name="studentId" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono" placeholder="2026-XXXX" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Enrolled Course</label>
                                        <select required name="course" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                                            <option value="">Select Course</option>
                                            {availableCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <button disabled={loading} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-1">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Activate Account'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
                        {/* Left Column: Status Card + Actions */}
                        <div className="lg:col-span-2 space-y-4 md:space-y-6">
                            {/* Header Info */}
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-blue-900/5">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 md:gap-4 mb-5 md:mb-6">
                                    <div>
                                        <h2 className="text-xl md:text-2xl font-bold text-gray-900">Hello, {currentUser.first_name}!</h2>
                                        <p className="text-gray-500 text-xs md:text-sm">App ID: <span className="font-mono text-gray-700">{currentUser.reference_id}</span></p>
                                    </div>
                                    <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-[10px] md:text-xs font-bold border border-green-200 w-fit">
                                        Status: {currentUser.status || 'Applied'}
                                    </span>
                                </div>

                                {/* Activation Status */}
                                {currentUser.student_id ? (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4 md:p-5 mb-5 md:mb-6 flex items-center gap-3 md:gap-4 shadow-sm">
                                        <div className="bg-white p-2.5 md:p-3 rounded-full text-green-600 shadow-sm"><Check className="w-5 h-5 md:w-6 md:h-6" /></div>
                                        <div>
                                            <p className="text-xs md:text-sm font-bold text-green-900">Student Account Active</p>
                                            <p className="text-[10px] md:text-xs text-green-700 font-medium">Student ID: <span className="font-mono text-base md:text-lg ml-1">{currentUser.student_id}</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-5 md:mb-6">
                                        <button
                                            onClick={() => setShowActivationModal(true)}
                                            disabled={currentUser?.status !== 'Approved for Enrollment'}
                                            className={`w-full py-3 md:py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm md:text-base ${currentUser?.status === 'Approved for Enrollment' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            <GraduationCap className="w-4 h-4 md:w-5 md:h-5" /> Activate Student Account
                                        </button>
                                        {currentUser?.status !== 'Approved for Enrollment' && (
                                            <p className="text-center text-[10px] md:text-xs text-gray-500 mt-2 font-medium flex justify-center items-center gap-1 px-2">
                                                <Info className="w-3 h-3 shrink-0" /> Activation unlocks after your department interview is completed and approved.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Attendance Widget */}
                                {(currentUser.time_in || currentUser.time_out) && (
                                    <div className={`border rounded-2xl p-4 md:p-6 transition-all duration-300 ${!currentUser.time_out ? 'bg-blue-50/50 border-blue-100 shadow-blue-500/5' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex justify-between items-center mb-4 md:mb-6">
                                            <h3 className={`font-bold flex items-center gap-2 text-xs md:text-sm uppercase tracking-wider ${!currentUser.time_out ? 'text-blue-900' : 'text-gray-500'}`}>
                                                <Clock className="w-4 h-4 md:w-5 md:h-5" /> Attendance Log
                                            </h3>
                                            {!currentUser.time_out && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] md:text-xs font-bold animate-pulse">Live</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><Clock className="w-8 h-8 md:w-12 md:h-12 text-blue-100 transform rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Started At</p>
                                                <p className="font-mono text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                    {currentUser.time_in ? new Date(currentUser.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 md:p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-1 md:p-2 opacity-50"><LogOut className="w-8 h-8 md:w-12 md:h-12 text-gray-100 transform -rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                <p className="text-[10px] md:text-xs text-blue-400 uppercase font-bold mb-1">Finished At</p>
                                                <p className="font-mono text-lg md:text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                    {currentUser.time_out ? new Date(currentUser.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>

                                        {!currentUser.time_out && (
                                            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                                                <span className="text-xs md:text-sm font-medium text-gray-500">Duration</span>
                                                <span className="font-mono text-xl md:text-2xl font-bold text-blue-600 tabular-nums">{elapsedTime}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Test Details */}
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-indigo-900/5">
                                <h3 className="font-bold text-gray-900 mb-5 md:mb-6 flex items-center gap-2 text-sm md:text-base">
                                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" /> Test Details
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><Calendar className="w-4 h-4 md:w-5 md:h-5" /></div>
                                        <div>
                                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Test Date</p>
                                            <p className="font-semibold text-gray-900 text-sm md:text-base">{currentUser.test_date}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><MapPin className="w-4 h-4 md:w-5 md:h-5" /></div>
                                        <div>
                                            <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Venue</p>
                                            <p className="font-semibold text-gray-900 text-sm md:text-base">NORSU Main Campus</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Profile Summary */}
                        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-5 md:p-8 border border-white/50 shadow-xl shadow-blue-900/5 h-fit">
                            <h3 className="font-bold text-gray-900 mb-5 md:mb-6 flex items-center gap-2 border-b border-gray-100 pb-4 text-sm md:text-base">
                                <User className="w-4 h-4 md:w-5 md:h-5 text-gray-500" /> Profile Summary
                            </h3>

                            <div className="space-y-5 md:space-y-6">
                                <div>
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-1">Full Name</p>
                                    <p className="font-semibold text-gray-900 truncate text-sm md:text-base">{currentUser.first_name} {currentUser.middle_name} {currentUser.last_name} {currentUser.suffix}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-1">Contact</p>
                                    <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
                                        <p className="flex items-center gap-2 text-gray-700 truncate"><Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.email}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.mobile}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {currentUser.city}, {currentUser.province}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold mb-2 md:mb-3">Course Preferences</p>
                                    <div className="space-y-2 md:space-y-3">
                                        <div className="bg-blue-50 p-2.5 md:p-3 rounded-xl border border-blue-100">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-blue-400 block mb-0.5 md:mb-1">1st Choice</span>
                                            <p className="text-xs md:text-sm font-bold text-blue-900 leading-tight">{currentUser.priority_course}</p>
                                        </div>
                                        <div className="px-2 md:px-3">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 block mb-0.5 md:mb-1">2nd Choice</span>
                                            <p className="text-[11px] md:text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_1}</p>
                                        </div>
                                        <div className="px-2 md:px-3">
                                            <span className="text-[9px] md:text-[10px] uppercase font-bold text-gray-400 block mb-0.5 md:mb-1">3rd Choice</span>
                                            <p className="text-[11px] md:text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_2}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {toast && (
                    <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[200] ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <div className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</div>
                        <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                    </div>
                )}
            </NATLayout>
        );
    }


    // --- RENDER SCREEN: FORM (Default) ---
    return (
        <NATLayout
            title="Application Form"
            showBack={true}
            onBack={() => setCurrentScreen('welcome')}
        >
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 max-w-6xl mx-auto w-full animate-slide-in-up pb-24">

                {/* ===== MOBILE: Compact Horizontal Stepper + Collapsible Disclaimer ===== */}
                <div className="block lg:hidden">
                    {/* Horizontal Step Indicator */}
                    <div className="bg-white/40 backdrop-blur-2xl rounded-2xl p-4 border border-white shadow-lg shadow-blue-900/5">
                        <div className="flex items-center justify-between gap-2">
                            {[
                                { id: 1, title: 'Personal' },
                                { id: 2, title: 'Course' },
                                { id: 3, title: 'Contact' }
                            ].map((step, idx) => {
                                const isActive = currentStep === step.id;
                                const isPast = currentStep > step.id;
                                return (
                                    <React.Fragment key={step.id}>
                                        <div className="flex flex-col items-center gap-1.5 flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110'
                                                : isPast ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-slate-200 bg-white text-slate-400'
                                                }`}>
                                                {isPast ? <Check className="w-4 h-4" /> : <span className="text-xs font-black">{step.id}</span>}
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-blue-700' : isPast ? 'text-green-600' : 'text-slate-400'}`}>{step.title}</span>
                                        </div>
                                        {idx < 2 && (
                                            <div className={`flex-1 h-0.5 rounded-full -mt-4 mx-1 transition-colors duration-300 ${currentStep > step.id ? 'bg-green-400' : 'bg-slate-200'}`}></div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Collapsible Data Privacy Disclaimer */}
                    <div className="mt-3 bg-white/40 backdrop-blur-2xl rounded-2xl border border-white shadow-lg shadow-blue-900/5 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setFormData((prev: any) => ({ ...prev, _disclaimerOpen: !prev._disclaimerOpen }))}
                            className="w-full flex items-center justify-between p-4 text-left"
                        >
                            <div className="flex items-center gap-2">
                                <Info className="w-4 h-4 text-blue-500" />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Data Privacy Disclaimer</span>
                                {formData.agreedToPrivacy && <span className="ml-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"><Check className="w-3 h-3 text-white" /></span>}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${formData._disclaimerOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${formData._disclaimerOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="px-4 pb-4">
                                <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                    <p className="text-xs text-slate-600 mb-3 text-justify leading-relaxed font-medium">By submitting this application, I hereby authorize the NORSU CARE Center and concerned university offices to collect, process, and utilize the information provided herein for admission evaluation, guidance services, research, and other school-related programs and activities, in accordance with the Data Privacy Act of 2012.</p>
                                    <label className="flex items-center gap-2.5 cursor-pointer bg-white p-3 rounded-xl border border-white/60 hover:bg-blue-50 transition-all w-fit">
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shadow-sm ${formData.agreedToPrivacy ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                            {formData.agreedToPrivacy && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.agreedToPrivacy} onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                        <span className="text-sm font-bold text-slate-800">I agree to the terms and conditions</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ===== DESKTOP: Original Sidebar Navigation (hidden on mobile) ===== */}
                <div className="hidden lg:block lg:w-1/4 shrink-0">
                    <div className="sticky top-24 space-y-4">
                        {/* Application Sections */}
                        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-6 border border-white shadow-xl shadow-blue-900/5">
                            <h3 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-xs">Application Sections</h3>
                            <div className="space-y-2">
                                {[
                                    { id: 1, title: 'Personal Info' },
                                    { id: 2, title: 'Course Selection' },
                                    { id: 3, title: 'Contact Details' }
                                ].map((step) => {
                                    const isActive = currentStep === step.id;
                                    const isPast = currentStep > step.id;
                                    return (
                                        <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-blue-50/50' : ''}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${isActive ? 'border-blue-600 bg-blue-50 text-blue-600' : isPast ? 'border-green-500 bg-green-50 text-green-500' : 'border-slate-200 text-slate-400'}`}>
                                                {isPast ? <Check className="w-4 h-4" /> : <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}></div>}
                                            </div>
                                            <span className={`text-sm font-bold ${isActive ? 'text-blue-700' : isPast ? 'text-slate-700' : 'text-slate-500'}`}>{step.title}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Data Privacy Act Disclaimer — separate card */}
                        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-5 border border-white shadow-xl shadow-blue-900/5 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <h4 className="text-[10px] font-black text-slate-800 mb-2 flex items-center gap-1.5 uppercase tracking-widest"><Info className="w-3 h-3 text-blue-500" /> Data Privacy Disclaimer</h4>
                            <p className="text-[11px] text-slate-600 mb-3 text-justify leading-relaxed font-medium">By submitting this application, I hereby authorize the NORSU CARE Center and concerned university offices to collect, process, and utilize the information provided herein for admission evaluation, guidance services, research, and other school-related programs and activities, in accordance with the Data Privacy Act of 2012.</p>
                            <label className="flex items-center gap-2 cursor-pointer group/check bg-white/50 p-2.5 rounded-lg border border-white/60 hover:bg-white transition-all w-fit">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shadow-sm ${formData.agreedToPrivacy ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover/check:border-blue-400'}`}>
                                    {formData.agreedToPrivacy && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <input type="checkbox" checked={formData.agreedToPrivacy} onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                <span className="text-xs font-bold text-slate-800">I agree to the terms and conditions</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Form Area */}
                <div className="lg:w-3/4">
                    <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-xl border border-blue-200/50 rounded-2xl p-6 mb-8 flex gap-4 shadow-lg shadow-blue-500/5">
                        <Info className="text-blue-600 shrink-0 w-6 h-6 drop-shadow-sm" />
                        <div>
                            <h3 className="font-extrabold text-blue-900 mb-1 tracking-tight">Before you begin</h3>
                            <p className="text-sm text-blue-800/90 leading-relaxed font-medium">
                                Please fill out all fields accurately. Your application will be used for your official university records. Fields marked with <span className="text-red-500 font-black">*</span> are required.
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8 relative z-10 min-h-[50vh]">
                        <AnimatePresence mode="wait">
                            {currentStep === 1 && (
                                <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">

                                    {/* Personal Information */}
                                    <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 border border-white shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
                                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-2.5 rounded-xl shadow-inner border border-blue-200/50"><User className="w-5 h-5 text-blue-700 drop-shadow-sm" /></div>
                                            Personal Information
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                            {[
                                                { label: 'First Name', name: 'firstName', width: 'md:col-span-1' },
                                                { label: 'Last Name', name: 'lastName', width: 'md:col-span-1' },
                                                { label: 'Middle Name', name: 'middleName', width: 'md:col-span-1', required: false },
                                                { label: 'Suffix', name: 'suffix', width: 'md:col-span-1', placeholder: 'e.g. Jr.', required: false },
                                            ].map((field) => (
                                                <div key={field.name} className={`space-y-1.5 ${field.width || ''}`}>
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">{field.label} {field.required !== false && <span className="text-red-500">*</span>}</label>
                                                    <input
                                                        type="text"
                                                        name={field.name}
                                                        value={formData[field.name]}
                                                        onChange={handleChange}
                                                        required={field.required !== false}
                                                        placeholder={field.placeholder || ''}
                                                        className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400 hover:bg-white"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date of Birth <span className="text-red-500">*</span></label>
                                                <input type="date" name="dob" value={formData.dob} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Age <span className="text-red-500">*</span></label>
                                                <input type="number" name="age" value={formData.age} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Place of Birth <span className="text-red-500">*</span></label>
                                                <input type="text" name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nationality <span className="text-red-500">*</span></label>
                                                <input name="nationality" value={formData.nationality} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sex Assigned at Birth <span className="text-red-500">*</span></label>
                                                <select name="sex" value={formData.sex} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white">
                                                    <option value="">Select</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">Gender Identity</label>
                                            <div className="flex flex-wrap gap-4">
                                                {['Cis-gender', 'Transgender', 'Non-binary', 'Prefer not to say'].map(opt => (
                                                    <label key={opt} className="flex items-center gap-2 cursor-pointer bg-white/40 border border-gray-200 px-3 py-2 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all">
                                                        <input type="radio" name="genderIdentity" value={opt} checked={formData.genderIdentity === opt} onChange={handleChange} className="text-blue-600" />
                                                        <span className="text-sm text-gray-700 font-medium">{opt}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Civil Status <span className="text-red-500">*</span></label>
                                            <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all hover:bg-white">
                                                <option value="">Select status</option>
                                                <option value="Single">Single</option>
                                                <option value="Married">Married</option>
                                                <option value="Separated (Legally)">Separated (Legally)</option>
                                                <option value="Separated (Physically)">Separated (Physically)</option>
                                                <option value="With Live-In Partner">With Live-In Partner</option>
                                                <option value="Divorced">Divorced</option>
                                                <option value="Widow/er">Widow/er</option>
                                            </select>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    {/* Course & Schedule Selection */}
                                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                            <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Calendar className="w-5 h-5" /></div>
                                            Course & Schedule
                                        </h3>

                                        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-6 flex gap-3 text-sm text-orange-800">
                                            <Info className="w-5 h-5 shrink-0" />
                                            Please select three different courses in order of preference.
                                        </div>

                                        <div className="space-y-1.5 mb-6">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Reason for Choosing NORSU <span className="text-red-500">*</span></label>
                                            <textarea
                                                name="reason"
                                                value={formData.reason}
                                                onChange={handleChange}
                                                required
                                                rows={3}
                                                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white resize-none"
                                                placeholder="Briefly explain why you want to study at NORSU..."
                                            ></textarea>
                                        </div>

                                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Priority Course (1st Choice) <span className="text-red-500">*</span></label>
                                                <select required name="priorityCourse" value={formData.priorityCourse} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white">
                                                    <option value="">Select priority course</option>
                                                    {availableCourses.map((c: any) => {
                                                        const limit = c.application_limit || 200;
                                                        const isFull = c.applicantCount >= limit;
                                                        const isClosed = c.status === 'Closed';
                                                        return (
                                                            <option key={c.name} value={c.name} disabled={isFull || isClosed}>
                                                                {c.name} {isClosed ? '(CLOSED)' : isFull ? '(FULL)' : `(${c.applicantCount}/${limit})`}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Alternative Course (2nd Choice) <span className="text-red-500">*</span></label>
                                                <select required name="altCourse1" value={formData.altCourse1} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white">
                                                    <option value="">Select alternative course</option>
                                                    {availableCourses
                                                        .filter(c => c.name !== formData.priorityCourse)
                                                        .map((c: any) => {
                                                            const limit = c.application_limit || 200;
                                                            const isFull = c.applicantCount >= limit;
                                                            const isClosed = c.status === 'Closed';
                                                            return (
                                                                <option key={c.name} value={c.name} disabled={isFull || isClosed}>
                                                                    {c.name} {isClosed ? '(CLOSED)' : isFull ? '(FULL)' : `(${c.applicantCount}/${limit})`}
                                                                </option>
                                                            );
                                                        })}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Alternative Course (3rd Choice) <span className="text-red-500">*</span></label>
                                                <select required name="altCourse2" value={formData.altCourse2} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white">
                                                    <option value="">Select alternative course</option>
                                                    {availableCourses
                                                        .filter(c => c.name !== formData.priorityCourse && c.name !== formData.altCourse1)
                                                        .map((c: any) => {
                                                            const limit = c.application_limit || 200;
                                                            const isFull = c.applicantCount >= limit;
                                                            const isClosed = c.status === 'Closed';
                                                            return (
                                                                <option key={c.name} value={c.name} disabled={isFull || isClosed}>
                                                                    {c.name} {isClosed ? '(CLOSED)' : isFull ? '(FULL)' : `(${c.applicantCount}/${limit})`}
                                                                </option>
                                                            );
                                                        })}
                                                </select>
                                            </div>


                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Preferred Test Date <span className="text-red-500">*</span></label>
                                            {availableDates.length > 0 ? (
                                                <select required name="testDate" value={formData.testDate} onChange={handleChange} className="w-full px-4 py-3 bg-orange-50/50 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white font-medium text-gray-900">
                                                    <option value="">Select a date for examination</option>
                                                    {availableDates.map((d: any) => {
                                                        const remaining = (d.slots || 0) - (d.applicantCount || 0);
                                                        return (
                                                            <option key={d.id} value={d.date} disabled={remaining <= 0}>
                                                                {new Date(d.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                                {d.venue ? ` - ${d.venue}` : ''}
                                                                {d.slots ? ` (${remaining > 0 ? remaining : 0} slots left)` : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            ) : (
                                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800 flex items-center gap-2">
                                                    <Info className="w-5 h-5" /> No test schedules are currently available. Please check back later.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 3 && (
                                <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                                    {/* Contact Information */}
                                    <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] p-8 border border-white shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-teal-400 to-teal-600"></div>
                                        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-3">
                                            <div className="bg-gradient-to-br from-teal-100 to-teal-200 p-2.5 rounded-xl shadow-inner border border-teal-200/50"><MapPin className="w-5 h-5 text-teal-700 drop-shadow-sm" /></div>
                                            Contact Information
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Complete Address <span className="text-red-500">*</span></label>
                                                <input name="street" value={formData.street} onChange={handleChange} required placeholder="Street, Purok, House No." className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" />
                                            </div>

                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">City/Municipality <span className="text-red-500">*</span></label>
                                                    <input name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Province <span className="text-red-500">*</span></label>
                                                    <input name="province" value={formData.province} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Zip Code <span className="text-red-500">*</span></label>
                                                    <input name="zipCode" value={formData.zipCode} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" />
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Mobile Number <span className="text-red-500">*</span></label>
                                                    <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" placeholder="09123456789" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email Address <span className="text-red-500">*</span></label>
                                                    <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" placeholder="email@example.com" />
                                                </div>
                                                <div className="md:col-span-2 space-y-1.5">
                                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Facebook Account Link (Optional)</label>
                                                    <input name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all hover:bg-white" placeholder="https://facebook.com/username" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Navigation / Submit Bar */}
                        <div className="sticky bottom-6 z-50 bg-white/40 backdrop-blur-2xl p-6 rounded-[2rem] border border-white shadow-2xl shadow-blue-900/10 flex flex-col md:flex-row gap-6 items-center justify-between group mt-8">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-[2rem] -z-10"></div>

                            {currentStep > 1 ? (
                                <button type="button" onClick={() => { setCurrentStep(prev => prev - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-6 py-3 bg-white text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2">
                                    <ArrowLeft className="w-4 h-4" /> Back
                                </button>
                            ) : (
                                <div></div>
                            )}

                            {currentStep < 3 ? (
                                <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95">
                                    Next Step <ArrowRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button type="submit" disabled={loading} className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg hover:shadow-xl hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 relative overflow-hidden group/btn">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out"></div>
                                    <span className="relative z-10 flex items-center gap-2">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                        {loading ? 'Submitting...' : 'Submit Application'}
                                    </span>
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }}></div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-0 max-w-lg w-full relative z-10 shadow-2xl border border-white overflow-hidden"
                    >
                        <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-10 text-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 blur-2xl rounded-full"></div>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                                className="w-24 h-24 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10"
                            >
                                <Check className="w-12 h-12" />
                            </motion.div>
                            <h2 className="text-3xl font-black text-white tracking-tight relative z-10">Application Received!</h2>
                        </div>
                        <div className="p-8 md:p-10 text-center">
                            <p className="text-slate-600 font-medium mb-8 text-lg leading-relaxed">
                                Your application for the NORSU Admission Test has been successfully submitted. We've sent a confirmation to <span className="font-bold text-slate-900">{formData.email}</span>.
                            </p>
                            <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-6 mb-8 text-left shadow-inner">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Your Reference ID</p>
                                <p className="text-2xl font-mono font-black text-slate-800 tracking-tight">{credentials?.referenceId}</p>
                                <div className="grid md:grid-cols-2 gap-4 mt-6">
                                    <div className="border border-purple-200/50 bg-purple-50 p-4 rounded-xl relative overflow-hidden group/card"><div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div><h3 className="font-bold text-purple-900 flex gap-2 items-center text-sm mb-1 relative z-10"><Calendar className="w-4 h-4" /> Test Date</h3><p className="text-lg font-black text-purple-700 relative z-10">{credentials?.testDate}</p></div>
                                    <div className="border border-indigo-200/50 bg-indigo-50 p-4 rounded-xl relative overflow-hidden group/card"><div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent"></div><h3 className="font-bold text-indigo-900 flex gap-2 items-center text-sm mb-1 relative z-10"><MapPin className="w-4 h-4" /> Venue</h3><p className="text-sm font-bold text-indigo-700 leading-tight relative z-10">NORSU Main Campus, Dumaguete City</p></div>
                                </div>
                            </div>
                            <button onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }} className="w-full bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-900/20 hover:-translate-y-1 active:scale-95 group relative overflow-hidden">
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                                <span className="relative z-10 flex items-center justify-center gap-2">Continue to Status <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[200] ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}
        </NATLayout>
    );
};

export default NATPortal;
