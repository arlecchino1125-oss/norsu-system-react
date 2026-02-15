
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';

const supabaseClient = supabase;

const Icons = {
    Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" /></svg>,
    Profile: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
    Assessment: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="m9 14 2 2 4-4" /></svg>,
    Counseling: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
    Support: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="m7 11 2-2-2-2M11 9h4" /><rect x="3" y="5" width="18" height="14" rx="2" /></svg>,
    Scholarship: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" /></svg>,
    Events: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
    Feedback: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-4.7 8.38 8.38 0 0 1 3.8.9L21 9z" /></svg>,
    Logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>,
    Star: ({ filled }) => <svg className={`w-8 h-8 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
    GraduationCap: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    ArrowRight: (props) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
    Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    XCircle: ({ size = 24, className }) => <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
};

// Isolated Hero Component to prevent full page re-renders
const StudentHero = ({ firstName }) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatFullDate = (date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    return (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 rounded-3xl p-8 text-white flex justify-between items-center shadow-2xl shadow-blue-500/20 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400/20 rounded-full -mr-20 -mt-20 blur-3xl animate-float"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/15 rounded-full -ml-10 -mb-10 blur-3xl animate-blob"></div>
            <div className="relative z-10"><h2 className="text-3xl font-extrabold mb-1">Welcome back, <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">{firstName}</span>!</h2><p className="text-blue-200/60 font-medium">{formatFullDate(time)}</p></div>
            <div className="text-right relative z-10"><div className="text-5xl font-black tracking-tighter bg-gradient-to-b from-white to-sky-200 bg-clip-text text-transparent">{formatTime(time)}</div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-200/50 mt-1">Current System Time</p></div>
        </div>
    );
};

export default function StudentPortal() {
    const { session, loading } = useAuth();
    const [activeView, setActiveView] = useState('dashboard');
    const [profileTab, setProfileTab] = useState('personal');
    // Timer removed from main component
    const [feedbackType, setFeedbackType] = useState('service');
    const [rating, setRating] = useState(0);
    const [counselingRequests, setCounselingRequests] = useState([]);
    const [supportRequests, setSupportRequests] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [sessionFeedback, setSessionFeedback] = useState({ rating: 0, comment: '' });
    const [activeVisit, setActiveVisit] = useState(null);
    const [toast, setToast] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCommandHub, setShowCommandHub] = useState(false);

    // Assessment State
    const [assessmentForm, setAssessmentForm] = useState({
        responses: {},
        other: ''
    });
    const [activeForm, setActiveForm] = useState(null);
    const [formsList, setFormsList] = useState([]);
    const [formQuestions, setFormQuestions] = useState([]);
    const [loadingForm, setLoadingForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedForms, setCompletedForms] = useState(new Set());

    // Events State (Merged)
    const [eventFilter, setEventFilter] = useState('All');
    const [attendanceMap, setAttendanceMap] = useState({}); // Stores { eventId: { time_in, time_out } }
    const [ratedEvents, setRatedEvents] = useState([]);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingForm, setRatingForm] = useState({ eventId: null, title: '', rating: 0, comment: '' });

    // Modals & Dynamic States
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [counselingForm, setCounselingForm] = useState({ type: 'Academic', description: '' });
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [supportForm, setSupportForm] = useState({
        categories: [], otherCategory: '',
        q1: '', q2: '', q3: '', q4: '',
        file: null
    });
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState(null);

    // Office Logbook Modal State
    const [showTimeInModal, setShowTimeInModal] = useState(false);
    const [visitReasons, setVisitReasons] = useState([]);
    const [selectedReason, setSelectedReason] = useState('');

    const [proofFile, setProofFile] = useState(null);
    const [isTimingIn, setIsTimingIn] = useState(false);

    // Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [personalInfo, setPersonalInfo] = useState({
        firstName: "", lastName: "", middleName: "", suffix: "",
        studentId: "", department: "", course: "", year: "", status: "",
        address: "", street: "", city: "", province: "", zipCode: "",
        mobile: "", email: "", facebookUrl: "", emergencyContact: "",
        dob: "", age: "", placeOfBirth: "",
        sex: "", gender: "", genderIdentity: "",
        civilStatus: "", nationality: "",
        priorityCourse: "", altCourse1: "", altCourse2: "",
        schoolLastAttended: "",
        isWorkingStudent: false, workingStudentType: "",
        supporter: "", supporterContact: "",
        isPwd: false, pwdType: "",
        isIndigenous: false, indigenousGroup: "",
        witnessedConflict: "",
        isSoloParent: false, isChildOfSoloParent: false
    });
    const [showMoreProfile, setShowMoreProfile] = useState(false);

    const [eventsList, setEventsList] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Scholarship State
    const [scholarshipsList, setScholarshipsList] = useState([]);
    const [myApplications, setMyApplications] = useState([]);

    useEffect(() => {
        if (!session) return;
        const fetchScholarships = async () => {
            const { data } = await supabaseClient.from('scholarships').select('*').order('deadline', { ascending: true });
            setScholarshipsList(data || []);
        };
        const fetchApplications = async () => {
            const { data } = await supabaseClient.from('scholarship_applications').select('scholarship_id, status').eq('student_id', personalInfo.studentId);
            setMyApplications(data || []);
        };
        fetchScholarships();
        fetchApplications();

        const sub = supabaseClient.channel('scholarships_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarships' }, fetchScholarships)
            .subscribe();
        return () => supabaseClient.removeChannel(sub);
    }, [session, personalInfo.studentId]);

    const handleApplyScholarship = async (scholarship) => {
        if (!scholarship) return;
        // Verify profile completeness
        if (!personalInfo.mobile || !personalInfo.email) {
            showToast("Please update your contact info (Mobile & Email) in Profile first.", "error"); return;
        }

        try {
            const { error } = await supabaseClient.from('scholarship_applications').insert([{
                scholarship_id: scholarship.id,
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                course: personalInfo.course,
                year_level: personalInfo.year,
                contact_number: personalInfo.mobile,
                email: personalInfo.email,
                status: 'Pending'
            }]);

            if (error) throw error;
            showToast("Application submitted successfully!");
            setMyApplications([...myApplications, { scholarship_id: scholarship.id, status: 'Pending' }]);
            setShowScholarshipModal(false);
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Timer removed (handled by Clock component)

    // Helper to determine department from course
    // Helper to determine department from course
    const getDepartment = React.useCallback((course) => {
        if (!course) return 'College of Arts and Sciences'; // Default or handle error
        if (course.includes('Nursing')) return 'College of Nursing';
        if (course.includes('Engineering')) return 'College of Engineering';
        if (course.includes('Agriculture')) return 'College of Agriculture and Forestry';
        if (course.includes('Criminology')) return 'College of Criminal Justice Education';
        if (course.includes('Information Technology') || course.includes('Computer Science')) return 'College of Information Technology'; // Fixed Logic
        if (course.includes('Business') || course.includes('Accountancy')) return 'College of Business';
        if (course.includes('Education')) return 'College of Education';
        return 'College of Arts and Sciences';
    }, []);

    // Sync session to personalInfo
    useEffect(() => {
        if (session && session.userType === 'student') {
            const studentData = session;
            const course = studentData.course || '';
            const department = studentData?.department || getDepartment(course);

            setPersonalInfo(prev => ({
                ...prev,
                firstName: studentData.first_name || '',
                lastName: studentData.last_name || '',
                middleName: studentData.middle_name || '',
                suffix: studentData.suffix || '',
                studentId: studentData.student_id,
                course: course,
                year: studentData.year_level || '1st Year',
                status: studentData.status || 'Active',
                department: department,
                email: studentData.email || '',
                mobile: studentData.mobile || '',
                facebookUrl: studentData.facebook_url || '',
                address: studentData.address || '',
                street: studentData.street || '',
                city: studentData.city || '',
                province: studentData.province || '',
                zipCode: studentData.zip_code || '',
                emergencyContact: studentData.emergency_contact || '',
                dob: studentData.dob || '',
                age: studentData.age || '',
                placeOfBirth: studentData.place_of_birth || '',
                sex: studentData.sex || '',
                gender: studentData.gender || '',
                genderIdentity: studentData.gender_identity || '',
                civilStatus: studentData.civil_status || '',
                nationality: studentData.nationality || '',
                priorityCourse: studentData.priority_course || '',
                altCourse1: studentData.alt_course_1 || '',
                altCourse2: studentData.alt_course_2 || '',
                schoolLastAttended: studentData.school_last_attended || '',
                isWorkingStudent: studentData.is_working_student || false,
                workingStudentType: studentData.working_student_type || '',
                supporter: studentData.supporter || '',
                supporterContact: studentData.supporter_contact || '',
                isPwd: studentData.is_pwd || false,
                pwdType: studentData.pwd_type || '',
                isIndigenous: studentData.is_indigenous || false,
                indigenousGroup: studentData.indigenous_group || '',
                witnessedConflict: studentData.witnessed_conflict || '',
                isSoloParent: studentData.is_solo_parent || false,
                isChildOfSoloParent: studentData.is_child_of_solo_parent || false
            }));
        }
    }, [session, getDepartment]);

    // Save Profile Changes to Supabase
    const saveProfileChanges = async () => {
        setIsEditing(false);
        try {
            const updatePayload = {
                first_name: personalInfo.firstName || null,
                last_name: personalInfo.lastName || null,
                middle_name: personalInfo.middleName || null,
                suffix: personalInfo.suffix || null,
                place_of_birth: personalInfo.placeOfBirth || null,
                department: personalInfo.department || null,
                address: personalInfo.address || null,
                street: personalInfo.street || null,
                city: personalInfo.city || null,
                province: personalInfo.province || null,
                zip_code: personalInfo.zipCode || null,
                mobile: personalInfo.mobile || null,
                email: personalInfo.email || null,
                civil_status: personalInfo.civilStatus || null,
                emergency_contact: personalInfo.emergencyContact || null,
                facebook_url: personalInfo.facebookUrl || null,
                dob: personalInfo.dob || null,
                sex: personalInfo.sex || null,
                gender: personalInfo.gender || null,
                gender_identity: personalInfo.genderIdentity || null,
                nationality: personalInfo.nationality || null,
                school_last_attended: personalInfo.schoolLastAttended || null,
                is_working_student: Boolean(personalInfo.isWorkingStudent),
                working_student_type: personalInfo.workingStudentType || null,
                supporter: personalInfo.supporter || null,
                supporter_contact: personalInfo.supporterContact || null,
                is_pwd: Boolean(personalInfo.isPwd),
                pwd_type: personalInfo.pwdType || null,
                is_indigenous: Boolean(personalInfo.isIndigenous),
                indigenous_group: personalInfo.indigenousGroup || null,
                witnessed_conflict: Boolean(personalInfo.witnessedConflict),
                is_solo_parent: Boolean(personalInfo.isSoloParent),
                is_child_of_solo_parent: Boolean(personalInfo.isChildOfSoloParent)
            };

            const { error } = await supabaseClient
                .from('students')
                .update(updatePayload)
                .eq('student_id', personalInfo.studentId);

            if (error) throw error;
            showToast("Profile updated successfully!");
        } catch (err) {
            showToast("Error saving profile: " + err.message, 'error');
        }
    };

    // Fetch Events from Supabase
    useEffect(() => {
        const fetchEvents = async () => {
            const { data } = await supabaseClient.from('events').select('*').order('created_at', { ascending: false });
            if (data) setEventsList(data);
        };
        fetchEvents();
    }, [activeView]);

    // Fetch All Active Forms
    useEffect(() => {
        if (activeView === 'assessment') {
            const fetchForms = async () => {
                setLoadingForm(true);
                const { data: forms } = await supabaseClient
                    .from('forms')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false });

                if (forms) {
                    setFormsList(forms);
                }

                // Fetch already-completed submissions for this student
                if (personalInfo.studentId) {
                    const { data: subs } = await supabaseClient
                        .from('submissions')
                        .select('form_id')
                        .eq('student_id', personalInfo.studentId);
                    if (subs) {
                        setCompletedForms(new Set(subs.map(s => s.form_id)));
                    }
                }

                setLoadingForm(false);
            };
            fetchForms();
        }
    }, [activeView]);

    // Fetch Counseling Requests
    useEffect(() => {
        if (activeView === 'counseling') {
            const fetchRequests = async () => {
                const { data, error } = await supabaseClient
                    .from('counseling_requests')
                    .select('*')
                    .eq('student_id', personalInfo.studentId)
                    .order('created_at', { ascending: false });
                if (data) setCounselingRequests(data);
            };
            fetchRequests();
        }
        // Fetch Notifications
        if (activeView === 'dashboard' || activeView === 'counseling') {
            const fetchNotifications = async () => {
                const { data } = await supabaseClient.from('notifications')
                    .select('*').eq('student_id', personalInfo.studentId).order('created_at', { ascending: false }).limit(5);
                if (data) setNotifications(data);
            };
            fetchNotifications();
        }

        // Fetch Support Requests
        if (activeView === 'support') {
            const fetchSupport = async () => {
                const { data } = await supabaseClient.from('support_requests').select('*').eq('student_id', personalInfo.studentId).order('created_at', { ascending: false });
                if (data) setSupportRequests(data);
            };
            fetchSupport();
        }



        // Real-time Subscriptions
        const channel = supabaseClient
            .channel('student_counseling')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `student_id=eq.${personalInfo.studentId}` }, () => {
                if (activeView === 'counseling') {
                    const fetchRequests = async () => {
                        const { data } = await supabaseClient.from('counseling_requests').select('*').eq('student_id', personalInfo.studentId).order('created_at', { ascending: false });
                        if (data) setCounselingRequests(data);
                    };
                    fetchRequests();
                }
            })
            .subscribe();

        const supportChannel = supabaseClient
            .channel('student_support')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests', filter: `student_id=eq.${personalInfo?.studentId}` }, () => {
                if (activeView === 'support') {
                    const fetchSupport = async () => {
                        try {
                            const { data, error } = await supabaseClient.from('support_requests').select('*').eq('student_id', personalInfo?.studentId).order('created_at', { ascending: false });
                            if (error) console.error("Error fetching support:", error);
                            if (data) setSupportRequests(data);
                        } catch (err) {
                            console.error("Unexpected error fetching support:", err);
                        }
                    };
                    fetchSupport();
                }
            })
            .subscribe();

        const notifChannel = supabaseClient
            .channel('student_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `student_id=eq.${personalInfo.studentId}` }, (payload) => {
                setNotifications(prev => [payload.new, ...prev]);
            })
            .subscribe();

        const eventsChannel = supabaseClient
            .channel('student_events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
                const refetchEvents = async () => {
                    const { data } = await supabaseClient.from('events').select('*').order('created_at', { ascending: false });
                    if (data) setEventsList(data);
                };
                refetchEvents();
            })
            .subscribe();

        const attendanceChannel = supabaseClient
            .channel('student_attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance', filter: `student_id=eq.${personalInfo?.studentId}` }, () => {
                fetchHistory();
            })
            .subscribe();

        const formsChannel = supabaseClient
            .channel('student_forms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forms', filter: 'is_active=eq.true' }, () => {
                const fetchForms = async () => {
                    const { data } = await supabaseClient.from('forms').select('*').eq('is_active', true).order('created_at', { ascending: false });
                    if (data) setFormsList(data);
                };
                fetchForms();
            })
            .subscribe();

        const applicationsChannel = supabaseClient
            .channel('student_applications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `student_id=eq.${personalInfo?.studentId}` }, (payload) => {
                showToast(`Application Status Updated: ${payload.new.status}`, 'info');
            })
            .subscribe();

        const profileChannel = supabaseClient
            .channel('student_profile_update')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `student_id=eq.${personalInfo?.studentId}` }, (payload) => {
                // Update personal info state locally
                setPersonalInfo(prev => ({ ...prev, ...payload.new })); // This might need mapping if column names differ from state names
                showToast("Your profile has been updated by an administrator.", 'info');
                // Ideally we should re-map the snake_case payload to camelCase state, but for now this alerts the user. 
                // To be safe, let's trigger a re-fetch of the profile or just let the user know.
            })
            .subscribe();

        return () => {
            const channels = [channel, supportChannel, notifChannel, eventsChannel, attendanceChannel, formsChannel, applicationsChannel, profileChannel];
            channels.forEach(ch => {
                if (ch) supabaseClient.removeChannel(ch).catch(() => { });
            });
        };
    }, [activeView, personalInfo.studentId]);

    // Real-time subscription for counseling requests with toast (Moved from nested effect)
    useEffect(() => {
        if (!personalInfo.studentId) return;

        const fetchCounseling_Realtime = async () => {
            const { data } = await supabaseClient.from('counseling_requests').select('*').eq('student_id', personalInfo.studentId).order('created_at', { ascending: false });
            if (data) setCounselingRequests(data);
        };

        fetchCounseling_Realtime();

        const channel = supabaseClient.channel('student_counseling_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests', filter: `student_id=eq.${personalInfo.studentId}` }, (payload) => {
                fetchCounseling_Realtime();
                if (payload.new.status !== payload.old.status) {
                    showToast(`Counseling Request Status Updated: ${payload.new.status}`, 'info');
                }
            })
            .subscribe();

        return () => { supabaseClient.removeChannel(channel); };
    }, [personalInfo.studentId]);

    // Fetch Active Office Visit
    useEffect(() => {
        const fetchVisit = async () => {
            const { data } = await supabaseClient.from('office_visits').select('*').eq('student_id', personalInfo.studentId).eq('status', 'Ongoing').maybeSingle();
            if (data) setActiveVisit(data);
        };
        if (personalInfo.studentId) fetchVisit();
    }, [personalInfo.studentId]);

    // Fetch Visit Reasons
    useEffect(() => {
        const fetchReasons = async () => {
            const { data } = await supabaseClient.from('office_visit_reasons').select('*').eq('is_active', true).order('reason');
            if (data) setVisitReasons(data);
        };
        fetchReasons();
    }, []);

    const formatFullDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Fetch Attendance and Rating History
    const fetchHistory = async () => {
        if (!personalInfo.studentId) return;

        // Attendance
        const { data: attendanceData } = await supabaseClient
            .from('event_attendance')
            .select('*')
            .eq('student_id', personalInfo.studentId);

        if (attendanceData) {
            const map = {};
            attendanceData.forEach(r => map[r.event_id] = r);
            setAttendanceMap(map);
        }

        // Ratings
        const { data: ratingData } = await supabaseClient
            .from('event_feedback')
            .select('event_id')
            .eq('student_id', personalInfo.studentId);

        if (ratingData) {
            setRatedEvents(ratingData.map(row => row.event_id));
        }
    };

    // Fetch on load AND when switching views (to keep sync)
    useEffect(() => {
        fetchHistory();
    }, [personalInfo.studentId, activeView]);

    const handleTimeIn = async (event) => {
        if (isTimingIn) return;
        if (!proofFile) { showToast("Please upload a proof photo to Time In.", 'error'); return; }

        if (!navigator.geolocation) { showToast("Geolocation is not supported by your browser.", 'error'); return; }
        setIsTimingIn(true);

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES (Update these with real values) ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 100000; // Increased to 100km for testing

            // Haversine Formula to calculate distance
            const R = 6371e3; // Earth radius in meters
            const φ1 = userLat * Math.PI / 180;
            const φ2 = targetLat * Math.PI / 180;
            const Δφ = (targetLat - userLat) * Math.PI / 180;
            const Δλ = (targetLng - userLng) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > MAX_DISTANCE_METERS) {
                showToast(`You are too far from campus (${Math.round(distance)}m).`, 'error');
                setIsTimingIn(false);
                return;
            }

            try {
                // Upload Proof
                const fileName = `${personalInfo.studentId}_${event.id}_${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('attendance_proofs').upload(fileName, proofFile, {
                    contentType: proofFile.type,
                    upsert: false
                });
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabaseClient.storage.from('attendance_proofs').getPublicUrl(fileName);
                const proofUrl = publicUrlData.publicUrl;

                // Record Time In
                const now = new Date().toISOString();
                const { error } = await supabaseClient.from('event_attendance').insert([{
                    event_id: event.id,
                    student_id: personalInfo.studentId,
                    student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                    time_in: now,
                    proof_url: proofUrl,
                    latitude: userLat,
                    longitude: userLng,
                    department: personalInfo.department
                }]);
                if (error) throw error;

                // Increment Count
                const { data: countData } = await supabaseClient.from('events').select('attendees').eq('id', event.id).single();
                const newCount = (countData?.attendees || 0) + 1;
                await supabaseClient.from('events').update({ attendees: newCount }).eq('id', event.id);

                setAttendanceMap(prev => ({ ...prev, [event.id]: { event_id: event.id, time_in: now, time_out: null } }));
                setEventsList(prev => prev.map(e => e.id === event.id ? { ...e, attendees: newCount } : e));
                setProofFile(null);
                showToast("Time In Successful! Location Verified.");
            } catch (err) {
                console.error("Time In Error:", err);
                if (err.code === '23505') {
                    showToast("You have already timed in for this event.", 'error');
                    // Refresh attendance to sync state
                    const { data } = await supabaseClient.from('event_attendance').select('*').eq('event_id', event.id).eq('student_id', personalInfo.studentId).single();
                    if (data) setAttendanceMap(prev => ({ ...prev, [event.id]: data }));
                } else {
                    showToast("Error: " + (err.message || "Unknown error"), 'error');
                }
            } finally {
                setIsTimingIn(false);
            }
        }, (error) => {
            setIsTimingIn(false);
            let msg = "Location check failed.";
            if (error.code === 1) msg = "Permission denied. Please allow location access.";
            else if (error.code === 2) msg = "Position unavailable. Ensure GPS/WiFi is on.";
            else if (error.code === 3) msg = "Location request timed out.";
            showToast(msg, 'error');
        }, options);
    };

    const handleTimeOut = async (event) => {
        if (!navigator.geolocation) { showToast("Geolocation is not supported.", 'error'); return; }

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 100000; // 100km radius

            // Haversine Formula
            const R = 6371e3;
            const φ1 = userLat * Math.PI / 180;
            const φ2 = targetLat * Math.PI / 180;
            const Δφ = (targetLat - userLat) * Math.PI / 180;
            const Δλ = (targetLng - userLng) * Math.PI / 180;
            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > MAX_DISTANCE_METERS) {
                showToast(`You are too far from the venue (${Math.round(distance)}m).`, 'error');
                return;
            }

            try {
                const now = new Date().toISOString();
                const { data, error } = await supabaseClient.from('event_attendance')
                    .update({ time_out: now })
                    .eq('event_id', event.id)
                    .eq('student_id', personalInfo.studentId)
                    .select();

                if (error) throw error;
                if (!data || data.length === 0) {
                    showToast("No attendance record found. Please time in first.", 'error');
                    return;
                }
                setAttendanceMap(prev => ({ ...prev, [event.id]: data[0] }));
                showToast("Time Out Successful!");
                fetchHistory();
            } catch (err) {
                console.error("Time Out Error:", err);
                showToast("Error: " + err.message, 'error');
            }
        }, (error) => {
            showToast("Location check failed. Please enable location services.", 'error');
        }, options);
    };

    const handleRateEvent = (event) => {
        setRatingForm({ eventId: event.id, title: event.title, rating: 0, comment: '' });
        setShowRatingModal(true);
    };

    const submitRating = async () => {
        if (ratingForm.rating === 0) { showToast("Please select a rating", 'error'); return; }
        if (ratedEvents.includes(ratingForm.eventId)) { showToast("You have already rated this event.", 'error'); setShowRatingModal(false); return; }

        try {
            const { error } = await supabaseClient.from('event_feedback').insert([{
                event_id: ratingForm.eventId, student_id: personalInfo.studentId, student_name: `${personalInfo.firstName} ${personalInfo.lastName}`, rating: ratingForm.rating, feedback: ratingForm.comment, submitted_at: new Date().toISOString()
            }]);
            if (error) throw error;
            setRatedEvents([...ratedEvents, ratingForm.eventId]);
            showToast("Feedback submitted successfully!"); setShowRatingModal(false);
        } catch (err) { showToast("Error: " + err.message, 'error'); }
    };

    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', hoverBg: 'group-hover:bg-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600', hoverBg: 'group-hover:bg-green-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', hoverBg: 'group-hover:bg-purple-600' }
    };

    const handleInventoryChange = (questionId, value) => {
        setAssessmentForm(prev => {
            const parsed = typeof value === 'number' ? value : (isNaN(Number(value)) ? value : parseInt(value));
            return { ...prev, responses: { ...prev.responses, [questionId]: parsed } };
        });
    };

    const openAssessmentForm = async (form) => {
        if (completedForms.has(form.id)) {
            showToast('You have already completed this assessment.', 'error');
            return;
        }
        setActiveForm(form);
        setAssessmentForm({ responses: {}, other: '' });
        setFormQuestions([]);
        setShowAssessmentModal(true);
        const { data: qs } = await supabaseClient.from('questions').select('*').eq('form_id', form.id).order('order_index');
        setFormQuestions(qs || []);
    };

    const submitAssessment = async () => {
        if (!activeForm) return;
        setIsSubmitting(true);
        try {
            const { data: subData, error: subError } = await supabaseClient
                .from('submissions')
                .insert([{ form_id: activeForm.id, student_id: personalInfo.studentId, submitted_at: new Date().toISOString() }])
                .select().single();
            if (subError) throw subError;
            const answersPayload = Object.entries(assessmentForm.responses).map(([qId, val]) => ({ submission_id: subData.id, question_id: parseInt(qId), answer_value: val }));
            if (answersPayload.length > 0) {
                const { error: ansError } = await supabaseClient.from('answers').insert(answersPayload);
                if (ansError) throw ansError;
            }
            setShowAssessmentModal(false);
            setShowSuccessModal(true);
            setAssessmentForm({ responses: {}, other: '' });
            setCompletedForms(prev => new Set([...prev, activeForm.id]));
        } catch (error) {
            showToast("Error submitting assessment: " + error.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const submitCounselingRequest = async () => {
        setIsSubmitting(true);
        try {
            const { error } = await supabaseClient.from('counseling_requests').insert([{ student_id: personalInfo.studentId, student_name: `${personalInfo.firstName} ${personalInfo.lastName}`, request_type: counselingForm.type, description: counselingForm.description, department: personalInfo.department, status: 'Submitted' }]);
            if (error) throw error;
            showToast("Counseling Request Submitted!");
            setShowCounselingForm(false);
            setCounselingForm({ type: 'Academic', description: '' });
        } catch (error) {
            showToast("Error: " + error.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const submitSupportRequest = async () => {
        if (supportForm.categories.length === 0 && !supportForm.otherCategory) { showToast("Please select at least one category.", 'error'); return; }
        setIsSubmitting(true);
        try {
            let docUrl = null;
            if (supportForm.file) {
                const fileExt = supportForm.file.name.split('.').pop();
                const fileName = `${personalInfo.studentId}_support_${Date.now()}.${fileExt}`;
                const { data: uploadData, error: uploadError } = await supabaseClient.storage.from('support_documents').upload(fileName, supportForm.file);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabaseClient.storage.from('support_documents').getPublicUrl(fileName);
                docUrl = publicUrlData.publicUrl;
            }
            const description = `[Q1 Description]: ${supportForm.q1}\n[Q2 Previous Support]: ${supportForm.q2}\n[Q3 Required Support]: ${supportForm.q3}\n[Q4 Other Needs]: ${supportForm.q4}`.trim();
            const finalCategories = [...supportForm.categories];
            if (supportForm.otherCategory) finalCategories.push(`Other: ${supportForm.otherCategory}`);
            const { error } = await supabaseClient.from('support_requests').insert([{ student_id: personalInfo.studentId, student_name: `${personalInfo.firstName} ${personalInfo.lastName}`, department: personalInfo.department, support_type: finalCategories.join(', '), description: description, documents_url: docUrl, status: 'Submitted' }]);
            if (error) throw error;
            showToast("Support Request Submitted!");
            setShowSupportModal(false);
            setSupportForm({ categories: [], otherCategory: '', q1: '', q2: '', q3: '', q4: '', file: null });
        } catch (error) {
            showToast("Error: " + error.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const openRequestModal = (req) => {
        setSelectedRequest(req);
        setSessionFeedback({ rating: req.rating || 0, comment: req.feedback || '' });
    };

    const submitSessionFeedback = async () => {
        if (sessionFeedback.rating === 0) { showToast("Please select a rating.", 'error'); return; }
        try {
            const { error } = await supabaseClient.from('counseling_requests').update({ rating: sessionFeedback.rating, feedback: sessionFeedback.comment }).eq('id', selectedRequest.id);
            if (error) throw error;
            showToast("Feedback submitted!");
            const updatedReq = { ...selectedRequest, rating: sessionFeedback.rating, feedback: sessionFeedback.comment };
            setCounselingRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedReq : r));
            setSelectedRequest(updatedReq);
        } catch (err) { showToast("Error: " + err.message, 'error'); }
    };

    const handleOfficeTimeIn = async () => { setShowTimeInModal(true); };

    const submitTimeIn = async () => {
        if (!selectedReason) { showToast("Please select a reason.", 'error'); return; }
        try {
            const { data, error } = await supabaseClient.from('office_visits').insert([{ student_id: personalInfo.studentId, student_name: `${personalInfo.firstName} ${personalInfo.lastName}`, reason: selectedReason, status: 'Ongoing' }]).select().single();
            if (error) throw error;
            setActiveVisit(data);
            showToast("You have Timed In at the office.");
            setShowTimeInModal(false);
        } catch (err) { showToast(err.message, 'error'); }
    };

    const handleOfficeTimeOut = async () => {
        if (!activeVisit) return;
        await supabaseClient.from('office_visits').update({ time_out: new Date().toISOString(), status: 'Completed' }).eq('id', activeVisit.id);
        setActiveVisit(null);
        showToast("You have Timed Out. Thank you for visiting!");
    };

    const sidebarLinks = [
        { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, group: 'Core' },
        { id: 'profile', label: 'My Profile', icon: Icons.Profile, group: 'Core' },
        { id: 'assessment', label: 'Needs Assessment', icon: Icons.Assessment, group: 'Academic' },
        { id: 'counseling', label: 'Counseling', icon: Icons.Counseling, group: 'Services' },
        { id: 'support', label: 'Additional Support', icon: Icons.Support, group: 'Services' },
        { id: 'scholarship', label: 'Scholarship', icon: Icons.Scholarship, group: 'Services' },
        { id: 'events', label: 'Events', icon: Icons.Events, group: 'Activities' },
        { id: 'feedback', label: 'Feedback', icon: Icons.Feedback, group: 'Activities' }
    ];

    // --- LOADING STATE ---
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading Student Portal...</div>;
    }

    // --- AUTHENTICATED MAIN RENDER ---
    const viewLabels = { dashboard: 'Dashboard', profile: 'My Profile', assessment: 'Needs Assessment', counseling: 'Counseling', support: 'Additional Support', scholarship: 'Scholarship', events: 'Events', feedback: 'Feedback' };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-student-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-blue-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-sky-400 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 text-sm">SP</div>
                        <div>
                            <h1 className="font-bold text-white text-lg tracking-tight">Student</h1>
                            <p className="text-sky-300/70 text-xs font-medium">NORSU Portal</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-sky-300/60 hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg></button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {['Core', 'Academic', 'Services', 'Activities'].map((group, gi) => (
                        <div key={group} className={gi > 0 ? 'pt-5 mt-4 border-t border-white/5' : ''}>
                            <p className="px-4 text-[10px] font-bold text-blue-400/50 uppercase tracking-[0.15em] mb-3">{group}</p>
                            {sidebarLinks.filter(link => link.group === group).map(link => (
                                <button key={link.id} onClick={() => { setActiveView(link.id); setIsEditing(false); setIsSidebarOpen(false); }} className={`nav-item nav-item-student w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeView === link.id ? 'nav-item-active text-sky-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                    <link.icon /> {link.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={() => window.location.href = '/student/login'} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"><Icons.Logout /> Logout</button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}
                <header className="h-16 glass gradient-border-blue relative flex items-center justify-between px-6 lg:px-10 z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button>
                        <h2 className="text-xl font-bold gradient-text-blue">{viewLabels[activeView] || activeView}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 hover:text-blue-600 hover:shadow-md transition-all relative border border-gray-100">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse-glow" />}
                        </button>
                    </div>
                </header>

                <div key={activeView} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">


                    {/* DASHBOARD */}
                    {activeView === 'dashboard' && (
                        <div className="space-y-8 page-transition">
                            {/* Hero Banner (Optimized) */}
                            <StudentHero firstName={personalInfo.firstName} />
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                        <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-xl shadow-lg shadow-blue-500/20">🔔</span> Latest Announcements</h3>
                                        <div className="border border-purple-100 bg-purple-50/50 p-4 rounded-xl flex justify-between items-start"><div><h4 className="font-bold text-purple-900 text-sm">Scholarship Application Deadline</h4><p className="text-xs text-purple-700/70 mt-1">Reminder: All scholarship applications must be submitted by March 31.</p></div><span className="text-[10px] font-bold text-purple-400/60">3/31/2026</span></div>
                                    </div>
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                        <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl shadow-lg shadow-violet-500/20">🏢</span> Office Logbook</h3>
                                        {activeVisit ? (<div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center"><p className="text-sm font-bold text-emerald-800 mb-1">You are currently at the office</p><p className="text-xs text-emerald-600 mb-3">Reason: {activeVisit.reason}</p><button onClick={handleOfficeTimeOut} className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20 transition-all">Time Out</button></div>) : <button onClick={handleOfficeTimeIn} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20 btn-press transition-all">Time In for Office Visit</button>}
                                    </div>
                                    {notifications.length > 0 && (<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}><h3 className="font-bold flex items-center gap-2 mb-4 text-orange-600"><span className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/20">📢</span> Notifications</h3><div className="space-y-2">{notifications.map(n => <div key={n.id} className="text-xs p-3 bg-orange-50 border border-orange-100 rounded-xl text-gray-700">{n.message}</div>)}</div></div>)}
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}><h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">⚡</span> Quick Access</h3><div className="space-y-3">{[{ id: 'assessment', label: 'Needs Assessment', color: 'blue', desc: 'Submit your yearly assessment' }, { id: 'scholarship', label: 'Scholarship', color: 'green', desc: 'Check eligibility & apply' }, { id: 'counseling', label: 'Counseling', color: 'purple', desc: 'Request support or advice' }].map(item => { const colors = colorMap[item.color]; return (<button key={item.label} onClick={() => setActiveView(item.id)} className="w-full text-left p-3 rounded-xl border border-purple-100/30 hover:border-blue-200 transition-all group flex items-center gap-3 hover:bg-purple-50/50"><div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${colors.bg} ${colors.text} ${colors.hoverBg} group-hover:text-white transition-colors shadow-sm`}>&gt;</div><div><div className="text-xs font-bold">{item.label}</div><div className="text-[10px] text-gray-400">{item.desc}</div></div></button>); })}</div></div>
                                    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '350ms' }}><div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div><h4 className="font-bold text-sm mb-2 relative z-10">💡 Campus Tip</h4><p className="text-xs text-purple-200/60 leading-relaxed font-light relative z-10">"Always remember to time-in and time-out of events to ensure your attendance is credited."</p></div>
                                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                                        <h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">📅</span> Events for You</h3>
                                        {eventsList.length > 0 && eventsList[0].type === 'Event' ? (<div className="border border-purple-100/50 rounded-2xl p-5 bg-gradient-to-br from-white to-purple-50/50"><span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">{eventsList[0].location || 'Campus Event'}</span><h4 className="font-bold mt-3">{eventsList[0].title}</h4><p className="text-[11px] text-gray-500 mt-1">{eventsList[0].event_time}</p><p className="text-xs text-gray-600 mt-3 leading-relaxed line-clamp-2">{eventsList[0].description}</p><button onClick={() => setActiveView('events')} className={`w-full mt-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all btn-press ${attendanceMap[eventsList[0].id]?.time_in ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-500/20'}`}>{attendanceMap[eventsList[0].id]?.time_in ? 'Checked In' : 'View Event'}</button></div>) : <p className="text-sm text-gray-400">No upcoming events.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EVENTS */}
                    {activeView === 'events' && (
                        <div className="page-transition">
                            <div className="flex justify-between items-start mb-8 animate-fade-in-up">
                                <div><h2 className="text-2xl font-extrabold mb-1 text-gray-800">Events & Announcements</h2><p className="text-sm text-gray-400">Stay updated with campus activities and important news.</p></div>
                                <button onClick={fetchHistory} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold transition-colors"><Icons.Clock /> Refresh</button>
                                <div className="flex bg-white/80 backdrop-blur-sm p-1 rounded-xl gap-1 border border-purple-100/50 shadow-sm">{['All', 'Events', 'Announcements'].map(f => (<button key={f} onClick={() => setEventFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${eventFilter === f ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-900 hover:bg-purple-50'}`}>{f}</button>))}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {eventsList.map((item, idx) => {
                                    if (eventFilter === 'Events' && item.type !== 'Event') return null;
                                    if (eventFilter === 'Announcements' && item.type !== 'Announcement') return null;
                                    const record = attendanceMap[item.id]; const isTimedIn = !!record?.time_in; const isTimedOut = !!record?.time_out;
                                    const now = new Date(); const start = new Date(`${item.event_date}T${item.event_time}`); const end = item.end_time ? new Date(`${item.event_date}T${item.end_time}`) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                                    const canTimeIn = now >= start && !isTimedIn; const canTimeOut = isTimedIn && !isTimedOut && now >= end;
                                    return (
                                        <div key={item.id} onClick={() => setSelectedEvent(item)} className={`bg-white/80 backdrop-blur-sm rounded-2xl border-l-4 p-8 shadow-sm relative cursor-pointer card-hover animate-fade-in-up ${item.type === 'Event' ? 'border-l-purple-500' : 'border-l-indigo-400'}`} style={{ animationDelay: `${idx * 100}ms` }}>
                                            <div className="flex justify-between items-start mb-6"><span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest">{item.type}</span>{item.type === 'Event' && isTimedIn && (<span className="bg-emerald-100 text-emerald-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1"><Icons.CheckCircle /> Attended</span>)}</div>
                                            <h3 className="text-xl font-bold mb-4 text-gray-800">{item.title}</h3><p className="text-sm text-gray-400 mb-8 leading-relaxed line-clamp-3">{item.description}</p>
                                            <div className="space-y-3 mb-8"><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Events /> {item.event_date}</p>{item.type === 'Event' && (<><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Clock /> {item.event_time}</p><p className="text-xs text-gray-400 flex items-center gap-3 font-medium"><Icons.Support /> {item.location}</p></>)}</div>
                                            {item.type === 'Event' && (<div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>{!isTimedIn && (<div className="space-y-2">{canTimeIn && <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />}</div>)}
                                                <div className="flex gap-2"><button disabled={!canTimeIn || isTimingIn || isTimedIn} onClick={() => handleTimeIn(item)} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isTimedIn ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-default' : (!canTimeIn || isTimingIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-sky-400 text-white hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20')}`}>{isTimedIn ? <span><Icons.CheckCircle /> Checked In</span> : (isTimingIn ? 'Processing...' : (now < start ? `Starts ${item.event_time}` : '→] Time In'))}</button>
                                                    <button disabled={!canTimeOut} onClick={() => handleTimeOut(item)} className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${isTimedOut ? 'bg-gray-100 text-gray-400 cursor-default' : (!canTimeOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20')}`}>{isTimedOut ? 'Completed' : (now < end ? `Ends ${item.end_time || 'Later'}` : '←[ Time Out')}</button></div>
                                                {isTimedOut && !ratedEvents.includes(item.id) && (<button onClick={() => !ratedEvents.includes(item.id) && handleRateEvent(item)} disabled={ratedEvents.includes(item.id)} className={`w-full py-3 border rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 btn-press ${ratedEvents.includes(item.id) ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-default' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100 shadow-sm'}`}><Icons.Star filled={true} /> {ratedEvents.includes(item.id) ? 'Rated' : 'Rate'}</button>)}</div>)}
                                            <p className="text-[10px] text-purple-500 font-bold mt-4 text-right">Click for full details →</p>
                                        </div>);
                                })}
                            </div>
                            {/* Event/Announcement Detail Modal */}
                            {selectedEvent && (() => {
                                const record = attendanceMap[selectedEvent.id]; const isTimedIn = !!record?.time_in; const isTimedOut = !!record?.time_out;
                                const now = new Date(); const start = new Date(`${selectedEvent.event_date}T${selectedEvent.event_time}`); const end = selectedEvent.end_time ? new Date(`${selectedEvent.event_date}T${selectedEvent.end_time}`) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
                                const canTimeIn = now >= start && !isTimedIn; const canTimeOut = isTimedIn && !isTimedOut && now >= end;
                                return (
                                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
                                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-2xl shadow-2xl shadow-blue-500/20 max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
                                            <div className="relative">
                                                <div className={`h-3 w-full rounded-t-2xl ${selectedEvent.type === 'Event' ? 'bg-black' : 'bg-blue-500'}`}></div>
                                                <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                            <div className="p-8">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="bg-gray-100 text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">{selectedEvent.type}</span>
                                                    {selectedEvent.type === 'Event' && isTimedIn && <span className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1"><Icons.CheckCircle /> Attended</span>}
                                                </div>
                                                <h2 className="text-2xl font-bold mb-4">{selectedEvent.title}</h2>
                                                <p className="text-sm text-gray-600 leading-relaxed mb-8">{selectedEvent.description}</p>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Date</p>
                                                        <p className="text-sm font-bold flex items-center gap-2"><Icons.Events /> {selectedEvent.event_date}</p>
                                                    </div>
                                                    {selectedEvent.type === 'Event' && (<>
                                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Time</p>
                                                            <p className="text-sm font-bold flex items-center gap-2"><Icons.Clock /> {selectedEvent.event_time}{selectedEvent.end_time && ` - ${selectedEvent.end_time}`}</p>
                                                        </div>
                                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Location</p>
                                                            <p className="text-sm font-bold flex items-center gap-2"><Icons.Support /> {selectedEvent.location}</p>
                                                        </div>
                                                    </>)}
                                                </div>
                                                {selectedEvent.type === 'Event' && (
                                                    <div className="border-t pt-6">
                                                        <h4 className="font-bold text-sm mb-4">Attendance</h4>
                                                        {isTimedIn && isTimedOut ? (
                                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                                                                <Icons.CheckCircle />
                                                                <p className="text-sm font-bold text-green-800 mt-1">Attendance completed!</p>
                                                                <p className="text-xs text-green-600">You have successfully checked in and out of this event.</p>
                                                            </div>
                                                        ) : isTimedIn ? (
                                                            <div className="space-y-3">
                                                                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-sm text-green-700 font-bold flex items-center gap-2"><Icons.CheckCircle /> Checked In</div>
                                                                <button disabled={!canTimeOut} onClick={() => handleTimeOut(selectedEvent)} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${!canTimeOut ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}>{now < end ? `Time Out available after ${selectedEvent.end_time || 'event ends'}` : '←[ Time Out'}</button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {canTimeIn && <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />}
                                                                <button disabled={!canTimeIn || isTimingIn} onClick={() => handleTimeIn(selectedEvent)} className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${!canTimeIn || isTimingIn ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-100'}`}>{isTimingIn ? 'Processing...' : (now < start ? `Check-in opens at ${selectedEvent.event_time}` : '→] Time In')}</button>
                                                            </div>
                                                        )}
                                                        {isTimedOut && !ratedEvents.includes(selectedEvent.id) && (
                                                            <button onClick={() => { setSelectedEvent(null); handleRateEvent(selectedEvent); }} className="w-full mt-4 py-3 border border-yellow-100 bg-yellow-50 text-yellow-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-yellow-100"><Icons.Star filled={true} /> Rate this event</button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* ASSESSMENT - COUNSELING - SUPPORT - SCHOLARSHIP - FEEDBACK - PROFILE: see StudentPortalViews */}
                    {renderRemainingViews({ activeView, activeForm, loadingForm, formQuestions, formsList, assessmentForm, handleInventoryChange, submitAssessment, openAssessmentForm, showAssessmentModal, setShowAssessmentModal, showSuccessModal, setShowSuccessModal, isSubmitting, showCounselingForm, setShowCounselingForm, counselingForm, setCounselingForm, submitCounselingRequest, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, supportForm, setSupportForm, personalInfo, submitSupportRequest, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship })}

                    {/* RATING MODAL */}
                    {showRatingModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg">Rate Event</h3><button onClick={() => setShowRatingModal(false)} className="text-gray-400 text-xl">✕</button></div><p className="text-sm font-bold text-gray-900 mb-4">{ratingForm.title}</p><div className="flex justify-center gap-2 mb-6">{[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => setRatingForm({ ...ratingForm, rating: num })} className="hover:scale-110 transition-transform"><Icons.Star filled={num <= ratingForm.rating} /></button>))}</div><textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs mb-6 outline-none" rows="3" placeholder="Share your experience (optional)..." value={ratingForm.comment} onChange={e => setRatingForm({ ...ratingForm, comment: e.target.value })}></textarea><button onClick={submitRating} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm">Submit Feedback</button></div></div>)}
                    {/* TIME IN MODAL */}
                    {showTimeInModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg">Office Visit</h3><button onClick={() => setShowTimeInModal(false)} className="text-gray-400 text-xl">✕</button></div><p className="text-sm text-gray-500 mb-4">Please select the reason for your visit:</p><div className="space-y-2 mb-6 max-h-60 overflow-y-auto">{visitReasons.map(r => (<label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedReason === r.reason ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}><input type="radio" name="reason" value={r.reason} onChange={e => setSelectedReason(e.target.value)} className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-gray-700">{r.reason}</span></label>))}</div><button onClick={submitTimeIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700">Confirm Time In</button></div></div>)}
                    {/* TOAST */}
                    {toast && (<div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-right z-50 backdrop-blur-sm ${toast.type === 'error' ? 'bg-red-600/90' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}><div className="text-xl">{toast.type === 'error' ? '⚠️' : '✅'}</div><div><p className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</p><p className="text-xs opacity-90">{toast.message}</p></div></div>)}
                </div>
            </main>
            {/* FLOATING CHAT BUTTON */}
            <button onClick={() => setShowCommandHub(true)} className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-sky-400 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center text-white text-xl hover:scale-110 hover:shadow-blue-500/40 transition-all animate-float z-40 group">
                <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-4.7 8.38 8.38 0 0 1 3.8.9L21 9z"></path></svg>
            </button>

            {/* STUDENT COMMAND HUB */}
            {showCommandHub && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-backdrop" onClick={() => setShowCommandHub(false)}>
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl animate-float"></div>
                            <h3 className="text-xl font-extrabold relative z-10">Student Hub</h3>
                            <p className="text-blue-200 text-xs relative z-10">Quick access to student services</p>
                            <button onClick={() => setShowCommandHub(false)} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors bg-white/10 p-1 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                        <div className="p-4 grid grid-cols-2 gap-3">
                            <button onClick={() => { setShowCommandHub(false); setActiveView('counseling'); setShowCounselingForm(true); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform"><Icons.Counseling /></div>
                                <span className="text-xs font-bold text-gray-700">Counseling</span>
                            </button>
                            <button onClick={() => { setShowCommandHub(false); setActiveView('support'); setShowSupportModal(true); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform"><Icons.Support /></div>
                                <span className="text-xs font-bold text-gray-700">Support</span>
                            </button>
                            <button onClick={() => { setShowCommandHub(false); setActiveView('feedback'); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-pink-50 hover:bg-pink-100 border border-pink-100 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform"><Icons.Feedback /></div>
                                <span className="text-xs font-bold text-gray-700">Feedback</span>
                            </button>
                            <button onClick={() => { setShowCommandHub(false); setActiveView('scholarship'); }} className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group">
                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"><Icons.Scholarship /></div>
                                <span className="text-xs font-bold text-gray-700">Scholarships</span>
                            </button>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                            <button onClick={() => { setShowCommandHub(false); setActiveView('profile'); }} className="w-full py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                                <Icons.Profile /> View My Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper: renders assessment, counseling, support, scholarship, feedback, profile views
function renderRemainingViews(p) {
    const { activeView, activeForm, loadingForm, formQuestions, formsList, assessmentForm, handleInventoryChange, submitAssessment, openAssessmentForm, showAssessmentModal, setShowAssessmentModal, showSuccessModal, setShowSuccessModal, isSubmitting, showCounselingForm, setShowCounselingForm, counselingForm, setCounselingForm, submitCounselingRequest, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, supportForm, setSupportForm, personalInfo, submitSupportRequest, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship } = p;
    return (
        <>
            {/* ASSESSMENT VIEW */}
            {activeView === 'assessment' && (
                <div className="max-w-5xl mx-auto page-transition">
                    <h2 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Needs Assessment Tool</h2>
                    <p className="text-sm text-gray-400 mb-8 animate-fade-in-up">Complete the inventory to help us understand your needs and provide better support.</p>
                    {loadingForm ? <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div><p className="ml-3 text-gray-400 text-sm">Loading forms...</p></div> : formsList.length === 0 ? (
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-12 shadow-sm text-center card-hover animate-fade-in-up">
                            <div className="text-5xl mb-4">📋</div>
                            <p className="text-gray-500 font-medium">No assessment forms are currently available.</p>
                            <p className="text-xs text-gray-400 mt-1">Check back later for new assessments from the care staff.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {formsList.map((form, idx) => {
                                const isDone = completedForms.has(form.id);
                                return (
                                    <button key={form.id} onClick={() => openAssessmentForm(form)} disabled={isDone} className={`bg-white/90 backdrop-blur-sm rounded-2xl border p-6 shadow-sm transition-all text-left group animate-fade-in-up ${isDone ? 'border-gray-200 opacity-60 cursor-not-allowed' : 'border-blue-100/50 hover:shadow-lg hover:border-blue-200 cursor-pointer card-hover'}`} style={{ animationDelay: `${idx * 80}ms` }}>
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${isDone ? 'bg-gray-400 shadow-gray-400/20' : 'bg-gradient-to-br from-blue-500 to-sky-400 shadow-blue-500/20'}`}><Icons.Assessment /></div>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isDone ? 'text-gray-500 bg-gray-100' : 'text-emerald-600 bg-emerald-50'}`}>{isDone ? '✓ Completed' : 'Active'}</span>
                                        </div>
                                        <h3 className={`font-bold text-sm mb-1 transition-colors ${isDone ? 'text-gray-500' : 'text-gray-900 group-hover:text-blue-600'}`}>{form.title}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{form.description || 'Click to view and complete this assessment.'}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                            <span>📅 {new Date(form.created_at).toLocaleDateString()}</span>
                                        </div>
                                        {!isDone && <div className="mt-4 text-xs font-bold text-blue-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">Start Assessment →</div>}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ASSESSMENT FORM MODAL */}
                    {showAssessmentModal && activeForm && createPortal(
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            {/* Backdrop */}
                            <div className="animate-backdrop" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAssessmentModal(false)} />

                            {/* Modal */}
                            <div className="animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{activeForm.title}</h3>
                                            <p style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px', lineHeight: 1.4 }}>{activeForm.description || 'Please answer all questions honestly.'}</p>
                                            {formQuestions.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                                    <div style={{ flex: 1, maxWidth: '180px', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${Math.round((Object.keys(assessmentForm.responses).length / formQuestions.length) * 100)}%`, background: 'linear-gradient(90deg, #7dd3fc, #6ee7b7)', borderRadius: '99px', transition: 'width 0.4s ease' }} />
                                                    </div>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.7 }}>{Object.keys(assessmentForm.responses).length}/{formQuestions.length}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setShowAssessmentModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>✕</button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
                                    {formQuestions.length === 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', textAlign: 'center' }}>
                                            <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #dbeafe', borderTopColor: '#3b82f6', marginBottom: '16px' }} />
                                            <p style={{ color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>Loading questions...</p>
                                            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Please wait while we prepare your assessment.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {formQuestions.map((q, idx) => (
                                                <div key={q.id} style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: `1.5px solid ${assessmentForm.responses[q.id] !== undefined ? '#93c5fd' : '#e5e7eb'}`, boxShadow: assessmentForm.responses[q.id] !== undefined ? '0 2px 8px rgba(59,130,246,0.08)' : '0 1px 3px rgba(0,0,0,0.04)', transition: 'all 0.25s ease' }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                                        <span style={{ width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0, background: assessmentForm.responses[q.id] !== undefined ? '#3b82f6' : '#e5e7eb', color: assessmentForm.responses[q.id] !== undefined ? '#fff' : '#9ca3af', transition: 'all 0.25s ease' }}>{idx + 1}</span>
                                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', lineHeight: 1.6, margin: 0, paddingTop: '2px' }}>{q.question_text}</p>
                                                    </div>
                                                    {q.question_type === 'text' || q.question_type === 'open_ended' ? (
                                                        <div style={{ marginLeft: '38px' }}>
                                                            <textarea style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} rows="2" placeholder="Type your answer here..." value={assessmentForm.responses[q.id] || ''} onChange={e => handleInventoryChange(q.id, e.target.value)} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ marginLeft: '38px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                                                {[1, 2, 3, 4, 5].map(v => (
                                                                    <button key={v} onClick={() => handleInventoryChange(q.id, v)} style={{ flex: 1, height: '44px', borderRadius: '10px', border: `2px solid ${assessmentForm.responses[q.id] === v ? '#3b82f6' : '#e5e7eb'}`, background: assessmentForm.responses[q.id] === v ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#fff', color: assessmentForm.responses[q.id] === v ? '#fff' : '#6b7280', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease', transform: assessmentForm.responses[q.id] === v ? 'scale(1.05)' : 'scale(1)', boxShadow: assessmentForm.responses[q.id] === v ? '0 4px 12px rgba(59,130,246,0.3)' : 'none' }}>{v}</button>
                                                                ))}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Disagree</span>
                                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Agree</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                                    <button onClick={submitAssessment} disabled={isSubmitting || formQuestions.length === 0} className="btn-press" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isSubmitting || formQuestions.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isSubmitting || formQuestions.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isSubmitting || formQuestions.length === 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}>
                                        {isSubmitting ? (
                                            <><div className="animate-spin" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Submitting...</>
                                        ) : (
                                            <><svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg> Submit Assessment</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        , document.body)}

                    {/* SUCCESS MODAL */}
                    {showSuccessModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-sm p-8 shadow-2xl text-center border border-purple-100/50 animate-fade-in-up">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Assessment Submitted!</h3>
                                <p className="text-sm text-gray-500 mb-6">Thank you for completing the assessment. Your responses have been recorded and will be used to provide you with better support.</p>
                                <button onClick={() => setShowSuccessModal(false)} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Done</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* COUNSELING VIEW */}
            {activeView === 'counseling' && (
                <div className="max-w-6xl mx-auto space-y-6 page-transition">
                    <div className="mb-6 animate-fade-in-up"><h2 className="text-2xl font-extrabold mb-1 text-gray-800">Counseling Services</h2><p className="text-sm text-gray-400">Request counseling support and view your requests</p></div>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-3 gap-6">
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '80ms' }}><div className="p-3 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-xl shadow-lg shadow-blue-500/20"><Icons.Counseling /></div><div><p className="text-2xl font-black">{counselingRequests.length}</p><p className="text-xs text-gray-400 font-bold uppercase">Total Requests</p></div></div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '160ms' }}><div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-xl shadow-lg shadow-amber-500/20"><Icons.Clock /></div><div><p className="text-2xl font-black">{counselingRequests.filter(r => ['Referred', 'Scheduled'].includes(r.status)).length}</p><p className="text-xs text-gray-400 font-bold uppercase">Pending</p></div></div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-xl border border-purple-100/50 flex items-center gap-4 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '240ms' }}><div className="p-3 bg-gradient-to-br from-emerald-400 to-green-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"><Icons.CheckCircle /></div><div><p className="text-2xl font-black">{counselingRequests.filter(r => r.status === 'Completed').length}</p><p className="text-xs text-gray-400 font-bold uppercase">Completed</p></div></div>
                    </div>
                    {/* CTA Card / Request Form */}
                    {!showCounselingForm ? (
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-12 text-center shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💬</div>
                            <h3 className="font-bold text-lg mb-2">Need Counseling Support?</h3>
                            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6">Our counseling services are here to help you with academic stress, personal concerns, and general wellbeing.</p>
                            <button onClick={() => setShowCounselingForm(true)} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Request Counseling</button>
                        </div>
                    ) : (
                        <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up">
                            <h3 className="font-bold mb-2">New Counseling Request</h3>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Type of Concern</label>
                                <select value={counselingForm.type} onChange={e => setCounselingForm({ ...counselingForm, type: e.target.value })} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-3 text-sm outline-none focus:border-purple-300 transition-colors">
                                    <option>Academic</option><option>Personal</option><option>Career</option><option>Mental Health</option>
                                </select>
                            </div>
                            <textarea rows="4" value={counselingForm.description} onChange={e => setCounselingForm({ ...counselingForm, description: e.target.value })} className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm mb-4 outline-none focus:border-purple-300 transition-colors" placeholder="I would like to discuss..."></textarea>
                            <div className="flex gap-3">
                                <button onClick={submitCounselingRequest} disabled={isSubmitting} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
                                <button onClick={() => setShowCounselingForm(false)} className="bg-white/80 border border-purple-100/50 px-6 py-2 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                            </div>
                        </div>
                    )}
                    {/* Your Requests List */}
                    <div className="pt-8">
                        <h3 className="font-bold mb-4">Your Requests</h3>
                        {counselingRequests.length === 0 ? <p className="text-sm text-gray-400">No requests found.</p> : counselingRequests.map((req, idx) => (
                            <div key={req.id} className="bg-white/90 backdrop-blur-sm border border-blue-100/50 rounded-xl p-6 shadow-sm flex items-center justify-between mb-3 card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3"><span className="text-xl">📝</span><div><span className="text-xs font-bold">{req.request_type}</span><p className="text-[10px] text-gray-400 mt-1">{req.description}</p></div></div>
                                    {req.status === 'Completed' && req.resolution_notes && (
                                        <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                                            <p className="text-[10px] font-bold text-green-800 uppercase mb-1">Counselor's Advice</p>
                                            <p className="text-xs text-green-900">{req.resolution_notes}</p>
                                        </div>
                                    )}
                                    <button onClick={() => openRequestModal(req)} className="mt-2 text-xs font-bold text-blue-600 hover:underline">View Details & Feedback</button>
                                </div>
                                <div className="ml-4"><span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${req.status === 'Submitted' ? 'bg-gray-100 text-gray-600' : req.status === 'Referred' ? 'bg-yellow-100 text-yellow-700' : req.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{req.status === 'Submitted' ? 'Pending Approval' : req.status}</span></div>
                            </div>
                        ))}
                    </div>
                    {/* Request Details Modal */}
                    {selectedRequest && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50 animate-fade-in-up">
                                <div className="flex justify-between items-start mb-4">
                                    <div><h3 className="font-bold text-xl">{selectedRequest.request_type}</h3><p className="text-xs text-gray-500">{formatFullDate(new Date(selectedRequest.created_at))}</p></div>
                                    <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                </div>
                                <div className="space-y-6">
                                    <div><span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedRequest.status === 'Submitted' ? 'bg-gray-100 text-gray-600' : selectedRequest.status === 'Referred' ? 'bg-yellow-100 text-yellow-700' : selectedRequest.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{selectedRequest.status === 'Submitted' ? 'Pending Approval' : selectedRequest.status}</span></div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><p className="text-xs font-bold text-gray-500 uppercase mb-2">Your Concern</p><p className="text-sm text-gray-800">{selectedRequest.description}</p></div>
                                    {selectedRequest.scheduled_date && (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-center"><Icons.Clock className="text-blue-600" /><div><p className="text-xs font-bold text-blue-800 uppercase">Scheduled Session</p><p className="text-sm text-blue-900">{new Date(selectedRequest.scheduled_date).toLocaleString()}</p></div></div>
                                    )}
                                    {selectedRequest.status === 'Completed' && selectedRequest.resolution_notes && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100"><p className="text-xs font-bold text-green-800 uppercase mb-2">Counselor's Advice</p><p className="text-sm text-green-900 leading-relaxed">{selectedRequest.resolution_notes}</p></div>
                                    )}
                                    {selectedRequest.status === 'Completed' && (
                                        <div className="border-t pt-6">
                                            <h4 className="font-bold text-sm mb-4">Rate your Session</h4>
                                            {selectedRequest.rating ? (
                                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center">
                                                    <div className="flex justify-center gap-1 text-yellow-500 mb-2">{[1, 2, 3, 4, 5].map(n => <div key={n} className="scale-75"><Icons.Star filled={n <= selectedRequest.rating} /></div>)}</div>
                                                    <p className="text-sm text-yellow-800 italic">"{selectedRequest.feedback || 'No comment provided.'}"</p>
                                                    <p className="text-[10px] text-yellow-600 mt-2 font-bold uppercase">Thank you for your feedback!</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div className="flex justify-center gap-2">{[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => setSessionFeedback({ ...sessionFeedback, rating: num })} className="hover:scale-110 transition-transform"><Icons.Star filled={num <= sessionFeedback.rating} /></button>))}</div>
                                                    <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500" rows="3" placeholder="How was your session? (Optional)" value={sessionFeedback.comment} onChange={e => setSessionFeedback({ ...sessionFeedback, comment: e.target.value })}></textarea>
                                                    <button onClick={submitSessionFeedback} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Submit Feedback</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SUPPORT VIEW */}
            {activeView === 'support' && (
                <div className="max-w-6xl mx-auto space-y-6 page-transition">
                    {/* Introduction Text */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up">
                        <div className="text-center mb-8 border-b border-purple-100/50 pb-6">
                            <h2 className="font-bold text-xl text-gray-900">NEGROS ORIENTAL STATE UNIVERSITY</h2>
                            <p className="text-sm text-gray-500">Office of the Campus Student Affairs and Services</p>
                            <p className="text-sm text-gray-500">Guihulngan Campus</p>
                            <h3 className="font-extrabold text-lg mt-4 bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                        </div>
                        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
                            <section><h4 className="font-bold text-gray-900 mb-2">1. We welcome your application</h4><p>We welcome applications from students with disabilities or special learning needs. By completing this form, you help us to form a clearer picture of your needs, which will enable us to see how we could support you, should you be admitted.</p><p className="mt-2">As in the case of all other applicants, first of all we consider your academic merits and whether you comply with the admission criteria for the program that you want to apply for. Then we will consider what is reasonable and practical for the specific program to which you have applied.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">2. We protect your information</h4><p>We will respect your privacy and keep your information confidential. However, we have to share relevant information with key academic, administrative and support staff members. They need such information to determine how we might best support you, should you be admitted for studies at NORSU–Guihulngan Campus.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">3. Submit this form, along with the supporting documents, to your application profile</h4><p>Please submit the completed form and all supporting documents (e.g. any copies of medical or psychological proof of your condition and/or disability) when you apply. We must receive all your documents by the closing date for applications. We cannot process your application unless we have all the necessary information.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">4. Should you need assistance or information</h4><p>Contact the Student Affairs and Services Office to learn about the kind of support the University offers.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">5. When you arrive on campus</h4><p>We present an orientation session for students with disabilities and special needs every year. It takes place at the first month of the academic year, as part of the orientation program for newcomer students.</p></section>
                            <section><h4 className="font-bold text-gray-900 mb-2">6. How can we reach you?</h4><p>When we receive your form, we send it to the faculty to which you are applying so that they can determine whether they can support you. The personal information you provide here also allows us to locate your application swiftly.</p></section>
                        </div>
                        <div className="mt-8 pt-6 border-t border-purple-100/50 flex justify-center">
                            <button onClick={() => setShowSupportModal(true)} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-400 hover:to-sky-300 transition shadow-lg shadow-blue-500/20 flex items-center gap-2 btn-press">
                                Proceed to Application Form <Icons.ArrowRight />
                            </button>
                        </div>
                    </div>

                    {/* Support History */}
                    <div className="mt-8">
                        <h3 className="font-bold mb-4">Your Support Requests</h3>
                        {supportRequests.length === 0 ? <p className="text-sm text-gray-400">No requests found.</p> : supportRequests.map((req, idx) => (
                            <div key={req.id} className="bg-white/90 backdrop-blur-sm border border-blue-100/50 rounded-xl p-6 shadow-sm mb-3 card-hover animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                                <div className="flex justify-between items-start mb-2">
                                    <div><span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded">{req.support_type}</span><p className="text-xs text-gray-500 mt-1">{formatFullDate(new Date(req.created_at))}</p></div>
                                    <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${req.status === 'Completed' ? 'bg-green-100 text-green-700' : req.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                </div>
                                <p className="text-sm text-gray-800 mb-2">{req.description}</p>
                                {req.resolution_notes && <div className="bg-green-50 p-3 rounded-lg border border-green-100"><p className="text-[10px] font-bold text-green-800 uppercase">Resolution</p><p className="text-xs text-green-900">{req.resolution_notes}</p></div>}
                            </div>
                        ))}
                    </div>

                    {showSupportModal && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-purple-100/50 animate-fade-in-up">
                                <div className="flex justify-between items-center p-6 border-b shrink-0">
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                                        <p className="text-xs text-gray-500">Guihulngan Campus</p>
                                    </div>
                                    <button onClick={() => setShowSupportModal(false)} className="text-gray-400 text-xl hover:text-gray-600">✕</button>
                                </div>

                                <div className="p-6 overflow-y-auto space-y-8">
                                    {/* Student Info */}
                                    <section className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Student Information</h4>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold">{new Date().toLocaleDateString()}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold">{personalInfo.dob}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Program – Year Level</label><div className="font-semibold">{personalInfo.course} - {personalInfo.year}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Cell Phone Number</label><div className="font-semibold">{personalInfo.mobile}</div></div>
                                            <div><label className="block text-xs font-bold text-gray-500">Email Address</label><div className="font-semibold">{personalInfo.email}</div></div>
                                            <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold">{personalInfo.address}</div></div>
                                        </div>
                                    </section>

                                    {/* Category */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Category (Check all that apply)</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {['Persons with Disabilities (PWDs)', 'Indigenous Peoples (IPs) & Cultural Communities', 'Working Students', 'Economically Challenged Students', 'Students with Special Learning Needs', 'Rebel Returnees', 'Orphans', 'Senior Citizens', 'Homeless Students', 'Solo Parenting', 'Pregnant Women', 'Women in Especially Difficult Circumstances'].map(cat => (
                                                <label key={cat} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-1 rounded"><input type="checkbox" checked={supportForm.categories.includes(cat)} onChange={(e) => { const newCats = e.target.checked ? [...supportForm.categories, cat] : supportForm.categories.filter(c => c !== cat); setSupportForm({ ...supportForm, categories: newCats }); }} className="w-4 h-4 text-blue-600 rounded" /> {cat}</label>
                                            ))}
                                            <div className="col-span-2 flex items-center gap-2 mt-2">
                                                <input type="checkbox" checked={!!supportForm.otherCategory} readOnly className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="text-sm">Others, specify:</span>
                                                <input value={supportForm.otherCategory} onChange={e => setSupportForm({ ...supportForm, otherCategory: e.target.value })} className="border-b border-gray-300 focus:border-blue-600 outline-none px-2 py-1 text-sm flex-1 bg-transparent" />
                                            </div>
                                        </div>
                                    </section>

                                    {/* Section A */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">A. Your Studies</h4>
                                        <p className="text-xs text-gray-500 mb-3">Which program(s) did you apply for? (Auto-filled)</p>
                                        <div className="space-y-3">
                                            <div><label className="block text-xs font-bold text-gray-500">1st Priority</label><input disabled value={personalInfo.priorityCourse} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500">2nd Priority</label><input disabled value={personalInfo.altCourse1} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500">3rd Priority</label><input disabled value={personalInfo.altCourse2} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                        </div>
                                    </section>

                                    {/* Section B */}
                                    <section>
                                        <h4 className="font-bold text-sm text-blue-800 mb-2 uppercase tracking-wider">B. Particulars of your disability or special learning need</h4>
                                        <p className="text-xs text-gray-500 mb-4 italic">We would like to gain a better understanding of the kind of support that you may need. However, we might not be able to assist in all the ways that you require, but it might help us with our planning in future.</p>
                                        <div className="space-y-4">
                                            <div><label className="block text-xs font-bold text-gray-700 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</label><textarea rows="2" value={supportForm.q1} onChange={e => setSupportForm({ ...supportForm, q1: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label className="block text-xs font-bold text-gray-700 mb-1">2. What kind of support did you receive at your previous school?</label><textarea rows="2" value={supportForm.q2} onChange={e => setSupportForm({ ...supportForm, q2: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label className="block text-xs font-bold text-gray-700 mb-1">3. What support or assistance do you require from NORSU–Guihulngan Campus to enable you to fully participate in campus activities...?</label><textarea rows="3" value={supportForm.q3} onChange={e => setSupportForm({ ...supportForm, q3: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                            <div><label className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea rows="2" value={supportForm.q4} onChange={e => setSupportForm({ ...supportForm, q4: e.target.value })} className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none"></textarea></div>
                                        </div>
                                    </section>

                                    <div className="mb-6"><label className="block text-xs font-bold text-gray-700 mb-1">Upload Supporting Documents (Medical/Psychological Proof)</label><input type="file" onChange={e => setSupportForm({ ...supportForm, file: e.target.files[0] })} className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                                </div>

                                <div className="flex gap-3 p-6 border-t border-purple-100/50 shrink-0">
                                    <button onClick={submitSupportRequest} disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">{isSubmitting ? 'Submitting...' : 'Submit Application'}</button>
                                    <button onClick={() => setShowSupportModal(false)} className="px-8 py-3 bg-white/80 border border-purple-100/50 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Cancel</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SCHOLARSHIP VIEW */}
            {activeView === 'scholarship' && (
                <div className="page-transition">
                    <h2 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Scholarship Services</h2>
                    <p className="text-sm text-gray-400 mb-8 animate-fade-in-up">View available scholarships and check your eligibility.</p>
                    {scholarshipsList.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 animate-fade-in-up">
                            <p className="text-gray-400 italic">No scholarships available at the moment.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {scholarshipsList.map((s, idx) => {
                                const isApplied = myApplications.some(app => app.scholarship_id === s.id);
                                const isExpired = new Date(s.deadline) < new Date();
                                return (
                                    <div
                                        key={s.id}
                                        onClick={() => { setSelectedScholarship(s); setShowScholarshipModal(true); }}
                                        className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm hover:shadow-lg transition-all card-hover animate-fade-in-up cursor-pointer group"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors" title={s.title}>{s.title}</h3>
                                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isExpired ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {isExpired ? 'Closed' : 'Open'}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center text-xs text-gray-400">
                                            <span>Deadline: {new Date(s.deadline).toLocaleDateString()}</span>
                                            {isApplied && <span className="font-bold text-blue-600 flex items-center gap-1"><Icons.CheckCircle /> Applied</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Scholarship Details Modal (Redesigned) */}
                    {showScholarshipModal && selectedScholarship && createPortal(
                        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                            {/* Backdrop */}
                            <div className="animate-backdrop" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }} onClick={() => setShowScholarshipModal(false)} />

                            {/* Modal */}
                            <div className="animate-scale-in" style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{selectedScholarship.title}</h3>
                                            <div className="flex gap-2 mt-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm`}>
                                                    {new Date(selectedScholarship.deadline) < new Date() ? 'Closed' : 'Open'}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowScholarshipModal(false)} style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}>✕</button>
                                    </div>
                                </div>

                                {/* Body */}
                                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: '#f8fafc' }}>
                                    <div className="space-y-6">
                                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</h4>
                                            <p className="text-sm text-gray-700 leading-relaxed">{selectedScholarship.description || 'No description provided.'}</p>
                                        </div>

                                        <div style={{ background: '#fff', borderRadius: '14px', padding: '20px', border: '1.5px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Requirements</h4>
                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                {selectedScholarship.requirements || 'No specific requirements listed.'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #e5e7eb' }}>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Deadline</h4>
                                                <p className="text-sm font-bold text-gray-900">{new Date(selectedScholarship.deadline).toLocaleDateString()}</p>
                                            </div>
                                            <div style={{ background: '#fff', borderRadius: '14px', padding: '16px', border: '1.5px solid #e5e7eb' }}>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</h4>
                                                <p className={`text-sm font-bold ${new Date(selectedScholarship.deadline) < new Date() ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {new Date(selectedScholarship.deadline) < new Date() ? 'Applications Closed' : 'Accepting Applications'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                                    {myApplications.some(app => app.scholarship_id === selectedScholarship.id) ? (
                                        <button disabled style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '14px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                            <Icons.CheckCircle /> Application Submitted
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { handleApplyScholarship(selectedScholarship); setShowScholarshipModal(false); }}
                                            disabled={new Date(selectedScholarship.deadline) < new Date()}
                                            className="btn-press"
                                            style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: new Date(selectedScholarship.deadline) < new Date() ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: new Date(selectedScholarship.deadline) < new Date() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: new Date(selectedScholarship.deadline) < new Date() ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}
                                        >
                                            {new Date(selectedScholarship.deadline) < new Date() ? 'Deadline Passed' : 'Apply Now'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        , document.body)}
                </div>
            )}

            {/* FEEDBACK VIEW - PLACEHOLDER Part 2 */}
            {activeView === 'feedback' && renderFeedbackView(p)}

            {/* PROFILE VIEW - PLACEHOLDER Part 2 */}
            {activeView === 'profile' && renderProfileView(p)}
        </>
    );
}

function renderFeedbackView(p) {
    const { feedbackType, setFeedbackType, rating, setRating, Icons } = p;
    return (
        <div className="page-transition">
            <h2 className="text-2xl font-extrabold mb-1 text-gray-800 animate-fade-in-up">Feedback Center</h2>
            <p className="text-sm text-gray-400 mb-8 animate-fade-in-up">Share your thoughts and help us improve our services.</p>
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Feedback Type</label>
                    <div className="flex gap-2 flex-wrap">
                        {['General', 'Academic', 'Facilities', 'Services', 'Events'].map(type => (
                            <button key={type} onClick={() => setFeedbackType(type)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all btn-press ${feedbackType === type ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'bg-purple-50 text-gray-600 hover:bg-purple-100'}`}>{type}</button>
                        ))}
                    </div>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Rating</label>
                    <div className="flex gap-1">{[1, 2, 3, 4, 5].map(num => (<button key={num} onClick={() => setRating(num)} className="hover:scale-110 transition-transform"><Icons.Star filled={num <= rating} /></button>))}</div>
                </div>
                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-700 mb-2">Your Feedback</label>
                    <textarea className="w-full bg-purple-50/50 border border-purple-100/50 rounded-xl p-4 text-sm outline-none focus:border-purple-300 transition-colors" rows="5" placeholder="Share your thoughts, suggestions, or concerns..."></textarea>
                </div>
                <button className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3.5 rounded-xl font-bold text-sm hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20 btn-press transition-all">Submit Feedback</button>
            </div>
        </div>
    );
}

function renderProfileView(p) {
    const { profileTab, setProfileTab, personalInfo, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, Icons, attendanceMap, formatFullDate, showMoreProfile, setShowMoreProfile } = p;
    return (
        <div className="flex gap-8 page-transition">
            <div className="w-80 shrink-0 space-y-6 animate-fade-in-up">
                <div className="bg-gradient-to-b from-blue-600 via-blue-700 to-blue-800 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 text-white text-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-400/20 rounded-full -mr-10 -mt-10 blur-2xl animate-float"></div>
                    <div className="h-24 bg-white/5 relative"></div>
                    <div className="px-8 pb-8 -mt-12 relative z-10">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-sky-400 rounded-2xl mx-auto shadow-xl shadow-blue-500/30 flex items-center justify-center text-4xl font-black text-white border-4 border-white/20 mb-4">{personalInfo.firstName?.[0] || 'S'}</div>
                        <h3 className="text-xl font-extrabold">{personalInfo.firstName} {personalInfo.lastName} {personalInfo.suffix}</h3>
                        <p className="text-xs text-blue-200/50 font-medium">{personalInfo.studentId}</p>
                        <div className="flex justify-center gap-2 mt-4">
                            <span className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold">{personalInfo.year}</span>
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-bold">{personalInfo.status}</span>
                        </div>
                        <button onClick={() => { setProfileTab('personal'); setIsEditing(true); }} className="w-full mt-8 bg-white/15 backdrop-blur-sm text-white py-2.5 rounded-xl text-xs font-bold hover:bg-white/25 transition-all border border-white/20 btn-press">Edit Profile</button>
                    </div>
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover" style={{ animationDelay: '100ms' }}>
                    <h4 className="text-[10px] font-bold text-purple-400/60 uppercase tracking-widest mb-4">Academic Summary</h4>
                    <p className="text-[10px] text-gray-400">Department</p>
                    <p className="text-sm font-bold mb-4">{personalInfo.department}</p>
                    <p className="text-[10px] text-gray-400">Course</p>
                    <p className="text-sm font-bold">{personalInfo.course}</p>
                </div>
            </div>
            <div className="flex-1 space-y-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 flex shadow-sm p-1 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {[{ id: 'personal', label: 'Personal Info', icon: <Icons.Profile /> }, { id: 'engagement', label: 'Engagement History', icon: <Icons.Clock /> }, { id: 'security', label: 'Security', icon: <Icons.Support /> }].map(tab => (
                        <button key={tab.id} onClick={() => { setProfileTab(tab.id); setIsEditing(false); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${profileTab === tab.id ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-gray-900 hover:bg-purple-50'}`}>{tab.icon} {tab.label}</button>
                    ))}
                </div>
                {profileTab === 'personal' && (
                    <div className="space-y-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm col-span-2 card-hover">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-lg"><Icons.Profile /></span> Basic Information</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">First Name</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.firstName || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, firstName: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.firstName || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Last Name</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.lastName || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, lastName: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.lastName || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Middle Name</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.middleName || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, middleName: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.middleName || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Suffix</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.suffix || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, suffix: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.suffix || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Email Address</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.email || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, email: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.email || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Mobile Number</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.mobile || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, mobile: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.mobile || '-'}</p>}
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Facebook Link</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.facebookUrl || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, facebookUrl: e.target.value })} /> : <p className="text-sm font-semibold truncate">{personalInfo.facebookUrl || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Date of Birth</p>
                                        {isEditing ? <input type="date" className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.dob || ''} onChange={(e) => {
                                            const dob = e.target.value;
                                            let age = personalInfo.age;
                                            if (dob) {
                                                const birthDate = new Date(dob);
                                                const today = new Date();
                                                let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                                                const m = today.getMonth() - birthDate.getMonth();
                                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                                    calculatedAge--;
                                                }
                                                age = calculatedAge >= 0 ? calculatedAge : '';
                                            }
                                            setPersonalInfo({ ...personalInfo, dob: dob, age: age })
                                        }} /> : <p className="text-sm font-semibold">{personalInfo.dob || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Place of Birth</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.placeOfBirth || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, placeOfBirth: e.target.value })} /> : <p className="text-sm font-semibold truncate" title={personalInfo.placeOfBirth || ''}>{personalInfo.placeOfBirth || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Sex (Birth)</p>
                                        {isEditing ? <select className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.sex || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, sex: e.target.value })}><option value="">Select</option><option>Male</option><option>Female</option></select> : <p className="text-sm font-semibold">{personalInfo.sex || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Gender Identity</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.genderIdentity || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, genderIdentity: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.genderIdentity || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Civil Status</p>
                                        {isEditing ? <select className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.civilStatus || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, civilStatus: e.target.value })}><option value="">Select</option><option>Single</option><option>Married</option><option>Separated (Legally)</option><option>Separated (Physically)</option><option>With Live-In Partner</option><option>Divorced</option><option>Widow/er</option></select> : <p className="text-sm font-semibold">{personalInfo.civilStatus || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Nationality</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.nationality || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, nationality: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.nationality || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Gender</p>
                                        {isEditing ? <input className="w-full bg-gray-50 border p-1 rounded text-sm" value={personalInfo.gender || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.gender || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Age</p>
                                        <p className="text-sm font-semibold">{personalInfo.age || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-lg"><Icons.Events /></span> Address Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Current Residence</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.address || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, address: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.address || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Street</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.street || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, street: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.street || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">City</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.city || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.city || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Province</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.province || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, province: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.province || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Zip Code</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.zipCode || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, zipCode: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.zipCode || '-'}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-rose-400 to-red-500 text-white rounded-lg">⚠️</span> Emergency Contact</h4>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Primary Contact</p>
                                {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.emergencyContact || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, emergencyContact: e.target.value })} placeholder="Name - Relationship - Number" /> : <p className="text-sm font-semibold">{personalInfo.emergencyContact || <span className="text-gray-400 italic">Not set</span>}</p>}
                            </div>
                        </div>
                        <button onClick={() => setShowMoreProfile(!showMoreProfile)} className="w-full py-3 bg-white/90 backdrop-blur-sm border border-blue-100/50 rounded-xl text-sm font-bold text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 btn-press">
                            {showMoreProfile ? (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> View Less</>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> View More Details</>)}
                        </button>
                        {showMoreProfile && (<>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-lg"><Icons.Assessment /></span> Education Background</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">School Last Attended</p>
                                            {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.schoolLastAttended || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, schoolLastAttended: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.schoolLastAttended || '-'}</p>}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Priority Course</p>
                                            <p className="text-sm font-semibold">{personalInfo.priorityCourse || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Alternative Course 1</p>
                                            <p className="text-sm font-semibold">{personalInfo.altCourse1 || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Alternative Course 2</p>
                                            <p className="text-sm font-semibold">{personalInfo.altCourse2 || '-'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                    <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-lg"><Icons.Support /></span> Working Student & Support</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Working Student</p>
                                            {isEditing ? <select className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.isWorkingStudent ? 'Yes' : 'No'} onChange={(e) => setPersonalInfo({ ...personalInfo, isWorkingStudent: e.target.value === 'Yes' })}><option>No</option><option>Yes</option></select> : <p className="text-sm font-semibold">{personalInfo.isWorkingStudent ? 'Yes' : 'No'}</p>}
                                        </div>
                                        {personalInfo.isWorkingStudent && <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Type of Work</p>
                                            {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.workingStudentType || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, workingStudentType: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.workingStudentType || '-'}</p>}
                                        </div>}
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Supporter / Guardian</p>
                                            {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.supporter || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, supporter: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.supporter || '-'}</p>}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Supporter Contact</p>
                                            {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.supporterContact || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, supporterContact: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.supporterContact || '-'}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* SPECIAL STATUS */}
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                <h4 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-violet-400 to-purple-500 text-white rounded-lg"><Icons.Counseling /></span> Special Status & Background</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Person with Disability</p>
                                        {isEditing ? <select className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.isPwd ? 'Yes' : 'No'} onChange={(e) => setPersonalInfo({ ...personalInfo, isPwd: e.target.value === 'Yes' })}><option>No</option><option>Yes</option></select> : <p className="text-sm font-semibold">{personalInfo.isPwd ? 'Yes' : 'No'}</p>}
                                    </div>
                                    {personalInfo.isPwd && <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">PWD Type</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.pwdType || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, pwdType: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.pwdType || '-'}</p>}
                                    </div>}
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Indigenous People</p>
                                        {isEditing ? <select className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.isIndigenous ? 'Yes' : 'No'} onChange={(e) => setPersonalInfo({ ...personalInfo, isIndigenous: e.target.value === 'Yes' })}><option>No</option><option>Yes</option></select> : <p className="text-sm font-semibold">{personalInfo.isIndigenous ? 'Yes' : 'No'}</p>}
                                    </div>
                                    {personalInfo.isIndigenous && <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Indigenous Group</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.indigenousGroup || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, indigenousGroup: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.indigenousGroup || '-'}</p>}
                                    </div>}
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Witnessed Conflict</p>
                                        {isEditing ? <input className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.witnessedConflict || ''} onChange={(e) => setPersonalInfo({ ...personalInfo, witnessedConflict: e.target.value })} /> : <p className="text-sm font-semibold">{personalInfo.witnessedConflict || '-'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Solo Parent</p>
                                        {isEditing ? <select className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.isSoloParent ? 'Yes' : 'No'} onChange={(e) => setPersonalInfo({ ...personalInfo, isSoloParent: e.target.value === 'Yes' })}><option>No</option><option>Yes</option></select> : <p className="text-sm font-semibold">{personalInfo.isSoloParent ? 'Yes' : 'No'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Child of Solo Parent</p>
                                        {isEditing ? <select className="w-full mt-1 bg-gray-50 border p-2 rounded text-sm" value={personalInfo.isChildOfSoloParent ? 'Yes' : 'No'} onChange={(e) => setPersonalInfo({ ...personalInfo, isChildOfSoloParent: e.target.value === 'Yes' })}><option>No</option><option>Yes</option></select> : <p className="text-sm font-semibold">{personalInfo.isChildOfSoloParent ? 'Yes' : 'No'}</p>}
                                    </div>
                                </div>
                            </div>
                            {/* ACHIEVEMENTS */}
                            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-6 shadow-sm card-hover">
                                <h4 className="font-bold text-sm mb-6 uppercase tracking-wider text-purple-400/60">Achievements</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center gap-4">
                                        <span className="text-2xl">🏆</span><div><p className="text-xs font-bold text-yellow-900">Dean's List</p><p className="text-[10px] text-yellow-700">Academic Year 2024-2025</p></div>
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                                        <span className="text-2xl">🎖️</span><div><p className="text-xs font-bold text-blue-900">Perfect Attendance</p><p className="text-[10px] text-blue-700">College Foundation Week</p></div>
                                    </div>
                                </div>
                            </div>
                        </>)}
                        {isEditing && (<div className="flex justify-end gap-3"><button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-white/80 border border-purple-100/50 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all">Cancel</button><button onClick={saveProfileChanges} className="px-6 py-2 bg-gradient-to-r from-blue-500 to-sky-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl btn-press transition-all">Save Changes</button></div>)}
                    </div>
                )}
                {profileTab === 'engagement' && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <h3 className="font-bold text-lg mb-6">Engagement History</h3>
                        <p className="text-sm text-gray-400">Your recent event attendance and platform activity.</p>
                        <div className="mt-4 space-y-3">
                            {Object.entries(attendanceMap).map(([eventId, record]) => (
                                <div key={eventId} className="flex items-center justify-between p-3 bg-purple-50/50 rounded-xl border border-purple-100/30">
                                    <div><p className="text-xs font-bold text-gray-700">Event #{eventId}</p><p className="text-[10px] text-gray-400">Time In: {record.time_in ? formatFullDate(new Date(record.time_in)) : '—'}</p></div>
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${record.time_out ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700 animate-pulse'}`}>{record.time_out ? 'Completed' : 'Ongoing'}</span>
                                </div>
                            ))}
                            {Object.keys(attendanceMap).length === 0 && <p className="text-center text-gray-400 text-sm py-6">No activity records found.</p>}
                        </div>
                    </div>
                )}
                {profileTab === 'security' && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><span className="p-1.5 bg-gradient-to-br from-slate-600 to-slate-800 text-white rounded-lg"><Icons.Support /></span> Security Settings</h3>
                        <p className="text-sm text-gray-400">Manage your account security and password.</p>
                        <div className="mt-6 p-4 bg-purple-50/50 rounded-xl border border-purple-100/30">
                            <p className="text-xs text-gray-500">Password management is handled through your NAT account. Contact the admin office for password resets.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

