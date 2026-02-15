import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    GraduationCap, ArrowLeft, FileText, Info, Check, User, Key,
    Calendar, MapPin, Loader2, X, Clock, HelpCircle, LogOut, Mail, Phone, ArrowRight
} from 'lucide-react';

// --- REUSABLE LAYOUT COMPONENT ---
const NATLayout = ({ children, title = "NORSU Admission Test", showBack = false, onBack, rightAction }) => (
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

export default function NATPortal() {
    const navigate = useNavigate();
    // Start at 'welcome' screen
    const [currentScreen, setCurrentScreen] = useState('welcome');
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showActivationModal, setShowActivationModal] = useState(false);

    // Auth & User State
    const [currentUser, setCurrentUser] = useState(null);
    const [credentials, setCredentials] = useState(null);

    // Options
    const [availableCourses, setAvailableCourses] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
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
    const [timeState, setTimeState] = useState({ isTestDate: false, isOpen: false });
    const [showTimeInConfirm, setShowTimeInConfirm] = useState(false);
    const [showTimeOutConfirm, setShowTimeOutConfirm] = useState(false);
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    // Timer Effect
    useEffect(() => {
        let interval;
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
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
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
                const courseCounts = {};
                appsData.forEach(a => courseCounts[a.priority_course] = (courseCounts[a.priority_course] || 0) + 1);

                const coursesWithStats = coursesData.map(c => ({
                    ...c,
                    applicantCount: courseCounts[c.name] || 0
                }));
                setAvailableCourses(coursesWithStats);
            }

            if (datesData) {
                const dateCounts = {};
                if (appsData) appsData.forEach(a => { if (a.test_date) dateCounts[a.test_date] = (dateCounts[a.test_date] || 0) + 1; });

                const datesWithStats = datesData.map(d => ({ ...d, applicantCount: dateCounts[d.date] || 0 }));
                setAvailableDates(datesWithStats);
            }
        };
        fetchOptions();
    }, []);

    // Check Time Logic
    useEffect(() => {
        if (currentScreen !== 'dashboard' || !currentUser) return;
        const checkTime = () => {
            const now = new Date();
            const todayDate = now.toISOString().split('T')[0];
            const currentHour = now.getHours();

            // Allow testing if today matches test date
            const isTestDate = currentUser.test_date === todayDate;
            const isMorningSlot = currentHour >= 8 && currentHour < 12;
            const isAfternoonSlot = currentHour >= 13 && currentHour < 17;
            const isOpen = isMorningSlot || isAfternoonSlot;
            setTimeState({ isTestDate, isOpen });
        };
        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, [currentScreen, currentUser]);

    // Real-time Status Update
    useEffect(() => {
        let channel;
        if (currentUser) {
            channel = supabase.channel('nat_app_status')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `id=eq.${currentUser.id}` }, (payload) => {
                    setCurrentUser(prev => ({ ...prev, ...payload.new }));
                    showToast(`Application Status Updated: ${payload.new.status}`, 'info');
                })
                .subscribe();
        } else if (credentials?.referenceId) {
            channel = supabase.channel('nat_app_ref_status')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `reference_id=eq.${credentials.referenceId}` }, (payload) => {
                    showToast(`Application Status Updated: ${payload.new.status}`, 'info');
                })
                .subscribe();
        }
        return () => { if (channel) supabase.removeChannel(channel); }
    }, [currentUser, credentials]);

    // Handlers
    const handleChange = (e) => {
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

    const handleCheckboxGroup = (e, field) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const list = prev[field] || [];
            if (checked) return { ...prev, [field]: [...list, value] };
            return { ...prev, [field]: list.filter(item => item !== value) };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.agreedToPrivacy) { showToast("You must agree to the Data Privacy Act Disclaimer.", 'error'); return; }

        if (availableDates.length === 0) {
            showToast("No test schedules are currently available.", 'error');
            return;
        }

        // Basic Validation
        if (!formData.testDate) { showToast("Please select a test date.", 'error'); return; }

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
                school_last_attended: formData.schoolLastAttended,
                year_level_applying: formData.yearLevelApplying,
                is_working_student: formData.isWorkingStudent === 'Yes',
                working_student_type: formData.workingStudentType,
                supporter: Array.isArray(formData.supporter) ? formData.supporter.join(', ') : formData.supporter,
                supporter_contact: formData.supporterContact,
                is_pwd: formData.isPwd === 'Yes',
                pwd_type: formData.pwdType,
                is_indigenous: formData.isIndigenous === 'Yes',
                indigenous_group: formData.indigenousGroup,
                witnessed_conflict: formData.witnessedConflict === 'Yes',
                is_solo_parent: formData.isSoloParent === 'Yes',
                is_child_of_solo_parent: formData.isChildOfSoloParent === 'Yes',
                priority_course: formData.priorityCourse,
                alt_course_1: formData.priorityCourse,
                alt_course_2: formData.altCourse1,
                alt_course_3: formData.altCourse2,
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
            } catch (emailErr) {
                console.error("Email notification failed:", emailErr);
                showToast("Application saved, but email notification failed. Please save your credentials manually.", 'error'); // changed type to match HTML slightly or keep as warning
            }

            setShowSuccessModal(true);
        } catch (error) {
            if (error.code === '23505' || error.message?.includes('duplicate')) {
                showToast('Submission Failed: This email address is already registered.', 'error');
            } else {
                showToast('Error: ' + error.message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
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
        } catch (err) {
            showToast("Login error: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeIn = async () => {
        setLoading(true);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('applications')
                .update({ time_in: now, status: 'Ongoing' })
                .eq('id', currentUser.id);

            if (error) throw error;
            showToast("Time In recorded successfully. Good luck!");
            setCurrentUser({ ...currentUser, time_in: now, status: 'Ongoing' });
            setShowTimeInConfirm(false);
        } catch (error) {
            showToast("Error recording Time In: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeTimeOut = async () => {
        setLoading(true);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('applications')
                .update({ time_out: now, status: 'Test Taken' })
                .eq('id', currentUser.id);

            if (error) throw error;
            showToast("Time Out recorded. You have completed the NAT.");
            setCurrentUser({ ...currentUser, time_out: now, status: 'Test Taken' });
            setShowTimeOutConfirm(false);
        } catch (error) {
            showToast("Error: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleActivation = async (e) => {
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
            const getDepartment = (c) => {
                const lower = c.toLowerCase();
                if (lower.includes('agriculture') || lower.includes('forestry')) return 'College of Agriculture and Forestry';
                if (lower.includes('criminology') || lower.includes('criminal justice')) return 'College of Criminal Justice Education';
                if (lower.includes('information technology')) return 'College of Information Technology';
                if (lower.includes('midwifery') || lower.includes('computer science')) return 'College of Arts and Sciences';
                if (lower.includes('engineering')) return 'College of Engineering';
                if (lower.includes('education') || lower.includes('teacher')) return 'College of Education';
                if (lower.includes('nursing')) return 'College of Nursing';
                if (lower.includes('accountancy') || lower.includes('business')) return 'College of Business';
                return 'College of Arts and Sciences';
            };

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
                department: getDepartment(course),
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
            } catch (emailErr) {
                console.error("Activation email failed:", emailErr);
            }

            showToast("Account Activated Successfully! A confirmation email has been sent. Your application details have been transferred to your Student Profile.");
            setShowActivationModal(false);
            setCurrentUser(null);
            navigate('/student');
        } catch (error) {
            showToast("Activation Failed: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fillMockData = () => {
        setFormData({
            ...formData,
            agreedToPrivacy: true,
            firstName: 'Mock', lastName: 'Student', age: '18',
            dob: '2006-01-01', placeOfBirth: 'City', nationality: 'Filipino',
            sex: 'Male', genderIdentity: 'Male', civilStatus: 'Single',
            street: '123 St', city: 'City', province: 'Prov', zipCode: '6200',
            mobile: '09123456789', email: `mock${Date.now()}@test.com`,
            schoolLastAttended: 'High School', yearLevelApplying: '1st Year', reason: 'Test',
            testDate: availableDates[0]?.date || ''
        });
    };

    // Render Views
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
                <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-blue-900/10 border border-white/60 p-8 md:p-14 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="inline-flex p-5 bg-white rounded-2xl shadow-lg shadow-blue-200 mb-8 transform group-hover:scale-110 transition-transform duration-500 ease-spring-bouncy">
                            <FileText className="w-14 h-14 text-blue-600" />
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight drop-shadow-sm">Welcome to NORSU</h2>
                        <p className="text-xl md:text-2xl text-gray-600 font-medium mb-10 max-w-2xl mx-auto">
                            Begin your academic journey with the Negros Oriental State University Admission Test.
                        </p>

                        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
                            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                                    <Info className="w-5 h-5 text-blue-600" /> About the Test
                                </h3>
                                <p className="text-gray-600 leading-relaxed">
                                    The NAT assesses your readiness for university-level education. It ensures you are prepared for the academic challenges ahead with a comprehensive evaluation.
                                </p>
                            </div>
                            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/50 hover:bg-white/80 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg">
                                <h3 className="font-bold text-gray-900 mb-4 text-lg">Application Steps</h3>
                                <div className="space-y-3">
                                    {["Complete application form", "Choose test schedule", "Receive credentials", "Take the test"].map((text, i) => (
                                        <div key={i} className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold border border-blue-200">{i + 1}</div>
                                            {text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
                            <button
                                onClick={() => setCurrentScreen('form')}
                                className="flex-1 bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-300/50 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                Apply Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => setCurrentScreen('login')}
                                className="flex-1 bg-white/80 backdrop-blur-sm border border-white text-gray-700 py-4 px-8 rounded-xl font-bold text-lg hover:bg-white transition-all shadow-lg shadow-gray-200/50 hover:-translate-y-1 active:scale-95"
                            >
                                Login to Portal
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-sm mt-8 font-medium">© {new Date().getFullYear()} NORSU Admission Office. All rights reserved.</p>
            </div>
        </NATLayout>
    );

    // --- RENDER SCREEN: STATUS ---
    if (currentScreen === 'status') return (
        <NATLayout title="Applicant Status" showBack={false}>
            <div className="max-w-4xl mx-auto w-full animate-slide-in-up">
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-900/10 border border-white/60 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>

                    <div className="p-8 md:p-10">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Application Status</h1>
                                <p className="text-gray-500 text-sm font-medium mt-1">Reference ID: <span className="font-mono text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{credentials?.referenceId}</span></p>
                            </div>
                            <span className="px-5 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold flex items-center gap-2 shadow-sm border border-green-200">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                Submitted Successfully
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 mb-8">
                            <div className="bg-white/50 rounded-2xl p-5 border border-white/50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Applicant Name</p>
                                <p className="text-xl font-bold text-gray-900">{credentials?.firstName} {credentials?.lastName}</p>
                            </div>
                            <div className="bg-white/50 rounded-2xl p-5 border border-white/50">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Priority Course</p>
                                <p className="text-xl font-bold text-blue-600">{credentials?.priorityCourse}</p>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-8 flex gap-4">
                            <div className="bg-white p-2 rounded-xl h-fit text-blue-600 shadow-sm"><Clock className="w-6 h-6" /></div>
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">Next Steps</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Your application is being processed. Please prepare for your admission test on <span className="font-semibold text-gray-900">{credentials?.testDate}</span>.
                                </p>
                            </div>
                        </div>

                        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-6 mb-8 relative overflow-hidden">
                            <div className="relative z-10">
                                <h3 className="font-bold text-amber-900 mb-4 flex items-center gap-2">
                                    <Key className="w-5 h-5" /> Your Portal Credentials
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white border border-amber-200 p-4 rounded-xl shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Username</p>
                                        <div className="flex justify-between items-center">
                                            <p className="font-mono font-bold text-xl text-gray-900 tracking-tight">{credentials?.username}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white border border-amber-200 p-4 rounded-xl shadow-sm">
                                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Password</p>
                                        <div className="flex justify-between items-center">
                                            <p className="font-mono font-bold text-xl text-gray-900 tracking-tight">{credentials?.password}</p>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-amber-700 mt-4 font-bold flex items-center gap-2">
                                    <Info className="w-4 h-4" /> Please save these credentials. You will need them to take the test.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <button
                                onClick={() => setCurrentScreen('login')}
                                className="flex-1 bg-gray-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all shadow-xl shadow-gray-900/20 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <LogOut className="w-5 h-5" /> Go to Login Portal
                                <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => setCurrentScreen('welcome')}
                                className="flex-1 bg-white border border-gray-200 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                            >
                                Back to Welcome
                            </button>
                        </div>
                    </div>
                </div>
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
                {/* Floating Back Button for Mobile is handled by Layout, but we can add extra navigation if needed */}

                <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl shadow-indigo-900/10 border border-white/60 p-8 md:p-10 relative overflow-hidden animate-slide-in-up">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>

                    <div className="text-center mb-8">
                        <div className="bg-white rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md shadow-blue-100 ring-4 ring-white/50">
                            <Key className="w-8 h-8 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Access Your Portal</h1>
                        <p className="text-gray-600 text-sm mt-1">Enter the credentials sent to your email.</p>
                    </div>

                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-8 flex gap-3">
                        <Info className="text-blue-500 shrink-0 w-5 h-5 mt-0.5" />
                        <p className="text-xs text-blue-800 leading-relaxed font-medium">
                            First time here? Your username and password are temporarily assigned after you submit your application form.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    name="username"
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium"
                                    placeholder="e.g. user_123456"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Key className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    className="w-full pl-11 pr-4 py-3.5 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-gray-400 font-medium font-mono"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold mt-2 hover:bg-black transition-all shadow-lg shadow-gray-900/20 hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                            {loading ? "Verifying..." : "Secure Login"}
                        </button>
                    </form>
                </div>

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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Status Card + Actions */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Header Info */}
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5">
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Hello, {currentUser.first_name}!</h2>
                                        <p className="text-gray-500 text-sm">Application ID: <span className="font-mono text-gray-700">{currentUser.reference_id}</span></p>
                                    </div>
                                    <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 w-fit">
                                        Status: {currentUser.status || 'Applied'}
                                    </span>
                                </div>

                                {/* Activation Status */}
                                {currentUser.student_id ? (
                                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-sm">
                                        <div className="bg-white p-3 rounded-full text-green-600 shadow-sm"><Check className="w-6 h-6" /></div>
                                        <div>
                                            <p className="text-sm font-bold text-green-900">Student Account Active</p>
                                            <p className="text-xs text-green-700 font-medium">Student ID: <span className="font-mono text-lg ml-1">{currentUser.student_id}</span></p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mb-6">
                                        <button
                                            onClick={() => setShowActivationModal(true)}
                                            disabled={currentUser?.status !== 'Passed'}
                                            className={`w-full py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${currentUser?.status === 'Passed' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30 hover:-translate-y-1' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                        >
                                            <GraduationCap className="w-5 h-5" /> Activate Student Account
                                        </button>
                                        {currentUser?.status !== 'Passed' && (
                                            <p className="text-center text-xs text-gray-500 mt-2 font-medium flex justify-center items-center gap-1">
                                                <Info className="w-3 h-3" /> Activation unlocks after passing the admission test.
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Attendance Widget */}
                                {(currentUser.time_in || currentUser.time_out) && (
                                    <div className={`border rounded-2xl p-6 transition-all duration-300 ${!currentUser.time_out ? 'bg-blue-50/50 border-blue-100 shadow-blue-500/5' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className={`font-bold flex items-center gap-2 text-sm uppercase tracking-wider ${!currentUser.time_out ? 'text-blue-900' : 'text-gray-500'}`}>
                                                <Clock className="w-5 h-5" /> Attendance Log
                                            </h3>
                                            {!currentUser.time_out && (
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold animate-pulse">Live</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-2 opacity-50"><Clock className="w-12 h-12 text-blue-100 transform rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                <p className="text-xs text-blue-400 uppercase font-bold mb-1">Started At</p>
                                                <p className="font-mono text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                    {currentUser.time_in ? new Date(currentUser.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </p>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-blue-50/50 shadow-sm relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-2 opacity-50"><LogOut className="w-12 h-12 text-gray-100 transform -rotate-12 group-hover:scale-110 transition-transform" /></div>
                                                <p className="text-xs text-blue-400 uppercase font-bold mb-1">Finished At</p>
                                                <p className="font-mono text-xl text-gray-900 font-bold tracking-tight relative z-10">
                                                    {currentUser.time_out ? new Date(currentUser.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                </p>
                                            </div>
                                        </div>

                                        {!currentUser.time_out && (
                                            <div className="mt-4 p-4 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-500">Duration</span>
                                                <span className="font-mono text-2xl font-bold text-blue-600 tabular-nums">{elapsedTime}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Test Details */}
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-indigo-900/5">
                                <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-500" /> Test Details
                                </h3>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><Calendar className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase">Test Date</p>
                                            <p className="font-semibold text-gray-900">{currentUser.test_date}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 shrink-0"><MapPin className="w-5 h-5" /></div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase">Venue</p>
                                            <p className="font-semibold text-gray-900">NORSU Main Campus</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Profile Summary */}
                        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 h-fit">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                                <User className="w-5 h-5 text-gray-500" /> Profile Summary
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Full Name</p>
                                    <p className="font-semibold text-gray-900 truncate">{currentUser.first_name} {currentUser.middle_name} {currentUser.last_name} {currentUser.suffix}</p>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-1">Contact</p>
                                    <div className="space-y-2 text-sm">
                                        <p className="flex items-center gap-2 text-gray-700"><Mail className="w-3.5 h-3.5 text-gray-400" /> {currentUser.email}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><Phone className="w-3.5 h-3.5 text-gray-400" /> {currentUser.mobile}</p>
                                        <p className="flex items-center gap-2 text-gray-700"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {currentUser.city}, {currentUser.province}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 uppercase font-bold mb-3">Course Preferences</p>
                                    <div className="space-y-3">
                                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                                            <span className="text-[10px] uppercase font-bold text-blue-400 block mb-1">1st Choice</span>
                                            <p className="text-sm font-bold text-blue-900 leading-tight">{currentUser.priority_course}</p>
                                        </div>
                                        <div className="px-3">
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">2nd Choice</span>
                                            <p className="text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_1}</p>
                                        </div>
                                        <div className="px-3">
                                            <span className="text-[10px] uppercase font-bold text-gray-400 block mb-1">3rd Choice</span>
                                            <p className="text-sm font-medium text-gray-700 leading-tight">{currentUser.alt_course_2}</p>
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
                </div>
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
            <div className="max-w-4xl mx-auto w-full animate-slide-in-up pb-24">
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-6 mb-8 flex gap-4">
                    <Info className="text-blue-600 shrink-0 w-6 h-6" />
                    <div>
                        <h3 className="font-bold text-blue-900 mb-1">Before you begin</h3>
                        <p className="text-sm text-blue-800 leading-relaxed">
                            Please fill out all fields accurately. Your application will be used for your official university records. Fields marked with <span className="text-red-500 font-bold">*</span> are required.
                        </p>
                    </div>
                    {/* Dev Tool: Fill Mock Data */}
                    <button onClick={fillMockData} className="ml-auto px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold hover:bg-yellow-200 transition-colors h-fit self-center">Fill Mock Data</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* DATA PRIVACY */}
                    <section className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100/50 backdrop-blur-sm">
                        <h2 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2"><Info className="w-4 h-4" /> DATA PRIVACY ACT DISCLAIMER</h2>
                        <p className="text-xs text-blue-800 mb-4 text-justify leading-relaxed opacity-80">By submitting this application, I hereby authorize the NORSU CARE Center and concerned university offices to collect, process, and utilize the information provided herein for admission evaluation, guidance services, research, and other school-related programs and activities, in accordance with the Data Privacy Act of 2012.</p>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${formData.agreedToPrivacy ? 'bg-blue-600 border-blue-600' : 'border-gray-400 group-hover:border-blue-500'}`}>
                                {formData.agreedToPrivacy && <Check className="w-3.5 h-3.5 text-white" />}
                            </div>
                            <input type="checkbox" checked={formData.agreedToPrivacy} onChange={e => setFormData({ ...formData, agreedToPrivacy: e.target.checked })} className="hidden" />
                            <span className="text-sm font-bold text-blue-900">I agree to the terms and conditions</span>
                        </label>
                    </section>

                    {/* Personal Information */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><User className="w-5 h-5" /></div>
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

                    {/* Contact Information */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-500"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="bg-teal-100 p-2 rounded-lg text-teal-600"><MapPin className="w-5 h-5" /></div>
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

                    {/* Educational Background */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><GraduationCap className="w-5 h-5" /></div>
                            Educational Background
                        </h3>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">School Last Attended <span className="text-red-500">*</span></label>
                                <input name="schoolLastAttended" value={formData.schoolLastAttended} onChange={handleChange} required placeholder="Name of School" className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all hover:bg-white" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Year Level Applying For <span className="text-red-500">*</span></label>
                                <select name="yearLevelApplying" value={formData.yearLevelApplying} onChange={handleChange} required className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 outline-none transition-all hover:bg-white">
                                    <option value="">Select Year Level</option>
                                    <option value="1st Year">1st Year</option>
                                    <option value="Transferee">Transferee</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Socio-Economic Information */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="bg-violet-100 p-2 rounded-lg text-violet-600"><User className="w-5 h-5" /></div>
                            Socio-Economic Information
                        </h3>

                        <div className="space-y-6">
                            {/* Employment */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">Are you a working student?</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value="Yes" checked={formData.isWorkingStudent === 'Yes'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">Yes</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value="No" checked={formData.isWorkingStudent === 'No'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">No</span></label>
                                </div>

                                {formData.isWorkingStudent === 'Yes' && (
                                    <div className="pl-4 border-l-2 border-violet-200 ml-1 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-bold text-violet-700 mb-2 block">If YES, please specify:</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {['House help', 'Call Center Agent / BPO', 'Fast Food / Restaurant', 'Online Employee / Freelancer', 'Self-employed', 'Other'].map(type => (
                                                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-violet-50 p-1.5 rounded transition-colors"><input type="radio" name="workingStudentType" value={type} checked={formData.workingStudentType === type} onChange={handleChange} className="text-violet-600" /> {type}</label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Support System */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">Person Who Supports Your Studies Aside from Your Parents:</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                                    {['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants', 'Other'].map(p => (
                                        <label key={p} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-violet-50 p-1.5 rounded transition-colors"><input type="checkbox" value={p} checked={formData.supporter.includes(p)} onChange={(e) => handleCheckboxGroup(e, 'supporter')} className="text-violet-600 rounded" /> {p}</label>
                                    ))}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contact Information of Supporter</label>
                                    <input name="supporterContact" value={formData.supporterContact} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all hover:bg-white" placeholder="Phone / Email" />
                                </div>
                            </div>

                            {/* Disability */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">Are you a Person With Disability (PWD)?</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value="Yes" checked={formData.isPwd === 'Yes'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">Yes</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value="No" checked={formData.isPwd === 'No'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">No</span></label>
                                </div>
                                {formData.isPwd === 'Yes' && (
                                    <div className="pl-4 border-l-2 border-violet-200 ml-1 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-bold text-violet-700 mb-2 block">If YES, please specify:</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {['Visual impairment', 'Hearing impairment', 'Physical / Orthopedic', 'Chronic illness', 'Psychosocial disability', 'Communication disability', 'Other'].map(type => (
                                                <label key={type} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-violet-50 p-1.5 rounded transition-colors"><input type="radio" name="pwdType" value={type} checked={formData.pwdType === type} onChange={handleChange} className="text-violet-600" /> {type}</label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Indigenous */}
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 mb-2 block">Are you a member of an Indigenous Group?</label>
                                <div className="flex gap-4 mb-3">
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value="Yes" checked={formData.isIndigenous === 'Yes'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">Yes</span></label>
                                    <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value="No" checked={formData.isIndigenous === 'No'} onChange={handleChange} className="text-violet-600" /> <span className="text-sm font-medium">No</span></label>
                                </div>
                                {formData.isIndigenous === 'Yes' && (
                                    <div className="pl-4 border-l-2 border-violet-200 ml-1 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs font-bold text-violet-700 mb-1 block">If YES, please specify:</label>
                                        <input name="indigenousGroup" value={formData.indigenousGroup} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none transition-all hover:bg-white" placeholder="e.g. Bukidnon, Lumad" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Community & Family Background */}
                    <div className="bg-white/60 backdrop-blur-md rounded-3xl p-8 border border-white/50 shadow-xl shadow-blue-900/5 relative overflow-hidden group hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-pink-500"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="bg-pink-100 p-2 rounded-lg text-pink-600"><User className="w-5 h-5" /></div>
                            Community & Family Background
                        </h3>

                        <div className="space-y-4">
                            {[
                                { label: 'Have you ever witnessed or been aware of armed conflict or insurgency in your community?', name: 'witnessedConflict' },
                                { label: 'Are you a solo parent?', name: 'isSoloParent' },
                                { label: 'Are you a son/daughter of a solo parent?', name: 'isChildOfSoloParent' }
                            ].map((q) => (
                                <div key={q.name} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl hover:bg-white/50 border border-transparent hover:border-pink-100 transition-all">
                                    <label className="text-sm font-medium text-gray-700">{q.label}</label>
                                    <div className="flex gap-4 shrink-0">
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={q.name} value="Yes" checked={formData[q.name] === 'Yes'} onChange={handleChange} className="text-pink-600" /> <span className="text-sm font-bold">Yes</span></label>
                                        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name={q.name} value="No" checked={formData[q.name] === 'No'} onChange={handleChange} className="text-pink-600" /> <span className="text-sm font-bold">No</span></label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

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
                                rows="3"
                                className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white resize-none"
                                placeholder="Briefly explain why you want to study at NORSU..."
                            ></textarea>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Priority Course (1st Choice) <span className="text-red-500">*</span></label>
                                <select required name="priorityCourse" value={formData.priorityCourse} onChange={handleChange} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all hover:bg-white">
                                    <option value="">Select priority course</option>
                                    {availableCourses.map(c => {
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
                                        .map(c => {
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
                                        .map(c => {
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
                                    {availableDates.map(d => {
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

                    <div className="sticky bottom-4 z-40 bg-white/80 backdrop-blur-xl p-4 rounded-2xl border border-white/50 shadow-2xl flex justify-between items-center gap-4">
                        <div className="hidden sm:block">
                            <p className="text-sm font-bold text-gray-900">Ready to submit?</p>
                            <p className="text-xs text-gray-500">Please review your information carefully.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 sm:flex-none sm:w-64 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                            {loading ? "Processing..." : "Submit Application"}
                        </button>
                    </div>
                </form>
            </div>

            {/* Success Modal */}
            {showSuccessModal && credentials && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[200] overflow-y-auto animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl my-8 relative flex flex-col max-h-[90vh] overflow-hidden border border-white/20">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                        <div className="bg-gradient-to-b from-green-50 to-white p-8 flex items-start justify-between shrink-0 border-b border-green-100">
                            <div className="flex items-center gap-4">
                                <div className="bg-green-100 p-3 rounded-full ring-4 ring-green-50"><Check className="text-green-600 w-8 h-8" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Application Submitted!</h2>
                                    <p className="text-green-700 font-medium">Your NAT application has been received</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X className="w-5 h-5 text-gray-500" /></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                                <h3 className="font-bold text-blue-900 flex gap-2 items-center mb-1"><FileText className="w-5 h-5" /> Application Status</h3>
                                <p className="text-sm text-blue-800 leading-relaxed">Your application has been approved and you are scheduled for the NORSU Admission Test (NAT).</p>
                            </div>

                            <div className="border border-gray-200 p-6 rounded-2xl bg-gray-50/50">
                                <h3 className="font-bold text-gray-900 mb-4 flex gap-2 items-center text-sm uppercase tracking-wider"><User className="w-4 h-4" /> Applicant Details</h3>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">Name</p><p className="font-bold text-gray-900">{credentials.firstName} {credentials.lastName}</p></div>
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">Priority Course</p><p className="font-bold text-blue-600">{credentials.priorityCourse}</p></div>
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">Email</p><p className="font-medium text-gray-700 truncate">{credentials.email}</p></div>
                                    <div><p className="text-gray-500 text-xs font-bold uppercase">Mobile</p><p className="font-medium text-gray-700">{credentials.mobile}</p></div>
                                </div>
                            </div>

                            <div className="bg-amber-50/60 border border-amber-200 p-6 rounded-2xl relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex gap-2 mb-3 items-center"><Key className="text-amber-600 w-5 h-5" /><h3 className="font-bold text-amber-900">Your Portal Credentials</h3></div>
                                    <p className="text-xs text-amber-800 mb-4 font-medium">These credentials have been sent to your email. You will need them to take the test:</p>
                                    <div className="bg-white border border-amber-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
                                        <div><p className="text-xs text-gray-500 font-bold uppercase">Username</p><p className="font-mono font-bold text-lg text-gray-900 tracking-tight">{credentials.username}</p></div>
                                        <div><p className="text-xs text-gray-500 font-bold uppercase">Password</p><p className="font-mono font-bold text-lg text-gray-900 tracking-tight">{credentials.password}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="border border-purple-200 bg-purple-50/50 p-4 rounded-2xl"><h3 className="font-bold text-purple-900 flex gap-2 items-center text-sm mb-1"><Calendar className="w-4 h-4" /> Test Date</h3><p className="text-lg font-bold text-purple-700">{credentials.testDate}</p></div>
                                <div className="border border-indigo-200 bg-indigo-50/50 p-4 rounded-2xl"><h3 className="font-bold text-indigo-900 flex gap-2 items-center text-sm mb-1"><MapPin className="w-4 h-4" /> Venue</h3><p className="text-sm font-bold text-indigo-700 leading-tight">NORSU Main Campus, Dumaguete City</p></div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                            <button onClick={() => { setShowSuccessModal(false); setCurrentScreen('status'); }} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-gray-900/10 hover:-translate-y-1">Continue to Status</button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-[100] backdrop-blur-md ${toast.type === 'error' ? 'bg-red-500/90' : 'bg-green-500/90'}`}>
                    <div className="bg-white/20 p-2 rounded-full">{toast.type === 'error' ? '⚠️' : '✅'}</div>
                    <div>
                        <h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4>
                        <p className="text-xs opacity-90 font-medium">{toast.msg}</p>
                    </div>
                </div>
            )}
        </NATLayout>
    );
    return null;

}
