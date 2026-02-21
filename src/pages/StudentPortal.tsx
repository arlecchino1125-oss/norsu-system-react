
import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import StudentDashboardView from './student/StudentDashboardView';
import StudentEventsView from './student/StudentEventsView';
import { renderRemainingViews, ServiceIntroModal } from './student/StudentPortalViews';

const supabaseClient = supabase;

interface Student {
    firstName: string;
    lastName: string;
    middleName?: string;
    suffix?: string;
    studentId: string;
    department: string;
    course: string;
    year: string;
    section: string;
    status: string;
    address: string;
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    mobile: string;
    email: string;
    facebookUrl?: string;
    emergencyContact?: string;
    dob: string;
    age: string | number;
    placeOfBirth?: string;
    sex: string;
    gender?: string;
    genderIdentity?: string;
    civilStatus?: string;
    nationality?: string;
    priorityCourse?: string;
    altCourse1?: string;
    altCourse2?: string;
    schoolLastAttended?: string;
    isWorkingStudent?: boolean;
    workingStudentType?: string;
    supporter?: string;
    supporterContact?: string;
    isPwd?: boolean;
    pwdType?: string;
    isIndigenous?: boolean;
    indigenousGroup?: string;
    witnessedConflict?: string;
    isSoloParent?: boolean;
    isChildOfSoloParent?: boolean;
    [key: string]: any; // Allow loose typing for now to prevent breakage
}

interface Event {
    id: string;
    title: string;
    description?: string;
    event_date: string;
    event_time: string;
    end_time?: string;
    location: string;
    type: string;
}

interface Scholarship {
    id: string;
    title: string;
    description: string;
    requirements: string;
    deadline: string;
}

interface Request {
    id: string;
    status: string;
    created_at: string;
    student_name?: string;
    course_year?: string;
    contact_number?: string;
    reason_for_referral?: string;
    description?: string;
    personal_actions_taken?: string;
    date_duration_of_concern?: string;
    referred_by?: string;
    scheduled_date?: string;
    resolution_notes?: string;
    rating?: number;
    feedback?: string;
    support_type?: string;
    [key: string]: any;
}


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
    Star: ({ filled }: any) => <svg className={`w-8 h-8 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
    Clock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>,
    CheckCircle: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
    GraduationCap: () => <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    ArrowRight: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>,
    Lock: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    XCircle: ({ size = 24, className }: any) => <svg width={size} height={size} className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
};

// Isolated Hero Component to prevent full page re-renders
const StudentHero = ({ firstName }: any) => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatFullDate = (date: any) => {
        return new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (date: any) => {
        return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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
    const { session, loading } = useAuth() as any;

    const [activeView, setActiveView] = useState('dashboard');
    const [profileTab, setProfileTab] = useState('personal');
    // Timer removed from main component
    const [feedbackType, setFeedbackType] = useState('service');
    const [rating, setRating] = useState(0);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [sessionFeedback, setSessionFeedback] = useState<any>({ rating: 0, comment: '' });
    const [activeVisit, setActiveVisit] = useState<any>(null);
    const [toast, setToast] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCommandHub, setShowCommandHub] = useState(false);

    // Assessment State
    const [assessmentForm, setAssessmentForm] = useState<any>({
        responses: {},
        other: ''
    });
    const [activeForm, setActiveForm] = useState<any>(null);
    const [formsList, setFormsList] = useState<any[]>([]);
    const [formQuestions, setFormQuestions] = useState<any[]>([]);
    const [loadingForm, setLoadingForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedForms, setCompletedForms] = useState<Set<any>>(new Set());

    // Events State (Merged)
    const [eventFilter, setEventFilter] = useState('All');
    const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({}); // Stores { eventId: { time_in, time_out } }
    const [ratedEvents, setRatedEvents] = useState<any[]>([]);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingForm, setRatingForm] = useState<any>({ eventId: null, title: '', rating: 0, comment: '', q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, open_best: '', open_suggestions: '', open_comments: '' });

    // Modals & Dynamic States
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [counselingForm, setCounselingForm] = useState<any>({ reason_for_referral: '', personal_actions_taken: '', date_duration_of_concern: '' });
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showCounselingRequestsModal, setShowCounselingRequestsModal] = useState(false);
    const [showSupportRequestsModal, setShowSupportRequestsModal] = useState(false);
    const [supportForm, setSupportForm] = useState<any>({
        categories: [], otherCategory: '',
        q1: '', q2: '', q3: '', q4: '',
        file: null
    });
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<any>(null);

    // Office Logbook Modal State
    const [showTimeInModal, setShowTimeInModal] = useState(false);
    const [visitReasons, setVisitReasons] = useState<any[]>([]);
    const [selectedReason, setSelectedReason] = useState('');

    const [proofFile, setProofFile] = useState<any>(null);
    const [isTimingIn, setIsTimingIn] = useState(false);

    // Profile State
    const [isEditing, setIsEditing] = useState(false);
    const [personalInfo, setPersonalInfo] = useState<Student>({
        firstName: "", lastName: "", middleName: "", suffix: "",
        studentId: "", department: "", course: "", year: "", section: "", status: "",
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

    // Onboarding Tour State
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [hasSeenTourState, setHasSeenTourState] = useState(true); // Default true

    // Profile Completion Modal State
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [profileStep, setProfileStep] = useState(1);
    const PROFILE_TOTAL_STEPS = 8;
    const PROFILE_STEP_LABELS = ['Personal', 'Family', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];
    const [profileFormData, setProfileFormData] = useState<any>({
        // Auto-filled from NAT
        firstName: '', lastName: '', middleName: '', suffix: '',
        dob: '', age: '', placeOfBirth: '',
        nationality: '', sex: '', genderIdentity: '', civilStatus: '',
        street: '', city: '', province: '', zipCode: '',
        mobile: '', email: '', facebookUrl: '',
        // New fields to collect
        religion: '', schoolLastAttended: '', yearLevelApplying: '1st Year',
        supporter: [] as string[], supporterContact: '',
        isWorkingStudent: '', workingStudentType: '',
        isPwd: '', pwdType: '',
        isIndigenous: '', indigenousGroup: '',
        witnessedConflict: '', isSafeInCommunity: '',
        isSoloParent: '', isChildOfSoloParent: '',
        // Family
        motherName: '', motherOccupation: '', motherContact: '',
        fatherName: '', fatherOccupation: '', fatherContact: '',
        parentAddress: '', numBrothers: '', numSisters: '', birthOrder: '',
        spouseName: '', spouseOccupation: '', numChildren: '',
        // Guardian
        guardianName: '', guardianAddress: '', guardianContact: '', guardianRelation: '',
        // Emergency
        emergencyName: '', emergencyAddress: '', emergencyRelationship: '', emergencyNumber: '',
        // Education
        elemSchool: '', elemYearGraduated: '',
        juniorHighSchool: '', juniorHighYearGraduated: '',
        seniorHighSchool: '', seniorHighYearGraduated: '',
        collegeSchool: '', collegeYearGraduated: '',
        honorsAwards: '',
        // Extra-curricular & Scholarships
        extracurricularActivities: '', scholarshipsAvailed: '',
        agreedToPrivacy: false,
    });
    const [profileSaving, setProfileSaving] = useState(false);

    const handleProfileFormChange = (e: any) => {
        const { name, value } = e.target;
        setProfileFormData((prev: any) => ({ ...prev, [name]: value }));
    };
    const handleProfileCheckboxGroup = (e: any, field: string) => {
        const val = e.target.value;
        const checked = e.target.checked;
        setProfileFormData((prev: any) => {
            const arr = prev[field] || [];
            return { ...prev, [field]: checked ? [...arr, val] : arr.filter((v: string) => v !== val) };
        });
    };

    const handleProfileNextStep = () => {
        setProfileStep(prev => Math.min(prev + 1, PROFILE_TOTAL_STEPS));
    };

    const handleProfileCompletion = async () => {
        if (!profileFormData.agreedToPrivacy) return;
        setProfileSaving(true);
        try {
            const payload: any = {
                // Personal (auto-filled + new)
                first_name: profileFormData.firstName, last_name: profileFormData.lastName,
                middle_name: profileFormData.middleName, suffix: profileFormData.suffix,
                dob: profileFormData.dob || null, age: profileFormData.age || null,
                place_of_birth: profileFormData.placeOfBirth, nationality: profileFormData.nationality,
                sex: profileFormData.sex, gender_identity: profileFormData.genderIdentity,
                civil_status: profileFormData.civilStatus,
                street: profileFormData.street, city: profileFormData.city,
                province: profileFormData.province, zip_code: profileFormData.zipCode,
                mobile: profileFormData.mobile, email: profileFormData.email,
                facebook_url: profileFormData.facebookUrl,
                religion: profileFormData.religion, school_last_attended: profileFormData.schoolLastAttended,
                year_level: profileFormData.yearLevelApplying,
                supporter: (profileFormData.supporter || []).join(', '),
                supporter_contact: profileFormData.supporterContact,
                is_working_student: profileFormData.isWorkingStudent === 'Yes',
                working_student_type: profileFormData.workingStudentType,
                is_pwd: profileFormData.isPwd === 'Yes', pwd_type: profileFormData.pwdType,
                is_indigenous: profileFormData.isIndigenous === 'Yes', indigenous_group: profileFormData.indigenousGroup,
                witnessed_conflict: profileFormData.witnessedConflict, is_safe_in_community: profileFormData.isSafeInCommunity,
                is_solo_parent: profileFormData.isSoloParent === 'Yes',
                is_child_of_solo_parent: profileFormData.isChildOfSoloParent === 'Yes',
                // Family
                mother_name: profileFormData.motherName, mother_occupation: profileFormData.motherOccupation,
                mother_contact: profileFormData.motherContact,
                father_name: profileFormData.fatherName, father_occupation: profileFormData.fatherOccupation,
                father_contact: profileFormData.fatherContact,
                parent_address: profileFormData.parentAddress,
                num_brothers: profileFormData.numBrothers, num_sisters: profileFormData.numSisters,
                birth_order: profileFormData.birthOrder,
                spouse_name: profileFormData.spouseName, spouse_occupation: profileFormData.spouseOccupation,
                num_children: profileFormData.numChildren,
                // Guardian
                guardian_name: profileFormData.guardianName, guardian_address: profileFormData.guardianAddress,
                guardian_contact: profileFormData.guardianContact, guardian_relation: profileFormData.guardianRelation,
                // Emergency
                emergency_name: profileFormData.emergencyName, emergency_address: profileFormData.emergencyAddress,
                emergency_relationship: profileFormData.emergencyRelationship, emergency_number: profileFormData.emergencyNumber,
                // Education
                elem_school: profileFormData.elemSchool, elem_year_graduated: profileFormData.elemYearGraduated,
                junior_high_school: profileFormData.juniorHighSchool, junior_high_year_graduated: profileFormData.juniorHighYearGraduated,
                senior_high_school: profileFormData.seniorHighSchool, senior_high_year_graduated: profileFormData.seniorHighYearGraduated,
                college_school: profileFormData.collegeSchool, college_year_graduated: profileFormData.collegeYearGraduated,
                honors_awards: profileFormData.honorsAwards,
                // Activities & Scholarships
                extracurricular_activities: profileFormData.extracurricularActivities,
                scholarships_availed: profileFormData.scholarshipsAvailed,
                profile_completed: true,
            };
            const { error } = await supabaseClient.from('students').update(payload).eq('student_id', personalInfo.studentId);
            if (error) throw error;
            setShowProfileCompletion(false);
            showToast('Profile completed successfully!');
        } catch (err: any) {
            console.error('Profile completion error:', err);
            showToast(err.message || 'Error saving profile', 'error');
        } finally {
            setProfileSaving(false);
        }
    };

    const [eventsList, setEventsList] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    // Scholarship State
    const [scholarshipsList, setScholarshipsList] = useState<any[]>([]);
    const [myApplications, setMyApplications] = useState<any[]>([]);

    useEffect(() => {
        const checkSession = async () => {
            if (!session?.user?.id) return;
            try {
                // Fetch student data
                const { data: studentData, error: studentError } = await supabaseClient
                    .from('students')
                    .select('*')
                    .eq('student_id', session.user.id) // Assuming auth id maps to student_id or email
                    .single();

                if (studentError) {
                    console.error('Error fetching student data:', studentError);
                } else if (studentData) {
                    setPersonalInfo((prev: any) => ({
                        ...prev,
                        firstName: studentData.first_name,
                        lastName: studentData.last_name,
                        middleName: studentData.middle_name,
                        suffix: studentData.suffix,
                        studentId: studentData.student_id,
                        department: studentData.department,
                        course: studentData.course,
                        year: studentData.year_level,
                        section: studentData.section,
                        status: studentData.status,
                        address: studentData.address,
                        mobile: studentData.mobile,
                        email: studentData.email,
                        facebookUrl: studentData.facebook_url,
                        dob: studentData.dob,
                        age: studentData.age,
                        sex: studentData.sex,
                        ...studentData
                    }));

                    // Profile completion detection moved to fetchAndSyncProfile
                }
            } catch (err: any) {
                console.error('Unexpected error:', err);
            }
        };

        checkSession();

        if (!session) return;

        const fetchScholarships = async () => {
            const { data } = await supabaseClient.from('scholarships').select('*').order('deadline', { ascending: true });
            setScholarshipsList(data || []);
        };
        const fetchApplications = async () => {
            const { data } = await supabaseClient.from('scholarship_applications').select('scholarship_id, status').eq('student_id', personalInfo.studentId);
            setMyApplications(data || []);
        };

        // Call independent fetches
        fetchScholarships();
        if (personalInfo.studentId) {
            fetchApplications();
        }

        const sub = supabaseClient.channel('scholarships_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'scholarships' }, fetchScholarships)
            .subscribe();

        return () => {
            supabaseClient.removeChannel(sub);
        };
    }, [session, personalInfo.studentId]);

    const handleApplyScholarship = async (scholarship: any) => {
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
        } catch (err: any) {
            showToast(err.message, "error");
        }
    };

    const showToast = (message: string, type: string = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    // Timer removed (handled by Clock component)

    // Helper to determine department from course
    // Removed hardcoded getDepartment in favor of dynamic fetch

    // Sync session to personalInfo
    useEffect(() => {
        const fetchAndSyncProfile = async () => {
            if (session && session.userType === 'student') {
                const studentData = session;
                const course = studentData.course || '';

                let matchedDepartment = studentData.department || 'Unassigned';

                // If department is missing or generic, try to fetch it dynamically
                if (!studentData.department && course) {
                    const { data: courseData } = await supabaseClient
                        .from('courses')
                        .select('name, departments(name)')
                        .eq('name', course)
                        .maybeSingle();

                    if (courseData && courseData.departments && (courseData.departments as any).name) {
                        matchedDepartment = (courseData.departments as any).name;
                    }
                }

                setPersonalInfo((prev: any) => ({
                    ...prev,
                    firstName: studentData.first_name || '',
                    lastName: studentData.last_name || '',
                    middleName: studentData.middle_name || '',
                    suffix: studentData.suffix || '',
                    studentId: studentData.student_id,
                    course: course,
                    year: studentData.year_level || '1st Year',
                    status: studentData.status || 'Active',
                    department: matchedDepartment,
                    section: studentData.section || '',
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
                    isChildOfSoloParent: studentData.is_child_of_solo_parent || false,
                    // New fields
                    religion: studentData.religion || '',
                    isSafeInCommunity: studentData.is_safe_in_community || false,
                    motherName: studentData.mother_name || '',
                    motherOccupation: studentData.mother_occupation || '',
                    motherContact: studentData.mother_contact || '',
                    fatherName: studentData.father_name || '',
                    fatherOccupation: studentData.father_occupation || '',
                    fatherContact: studentData.father_contact || '',
                    parentAddress: studentData.parent_address || '',
                    numBrothers: studentData.num_brothers || '',
                    numSisters: studentData.num_sisters || '',
                    birthOrder: studentData.birth_order || '',
                    spouseName: studentData.spouse_name || '',
                    spouseOccupation: studentData.spouse_occupation || '',
                    numChildren: studentData.num_children || '',
                    guardianName: studentData.guardian_name || '',
                    guardianAddress: studentData.guardian_address || '',
                    guardianContact: studentData.guardian_contact || '',
                    guardianRelation: studentData.guardian_relation || '',
                    emergencyName: studentData.emergency_name || '',
                    emergencyAddress: studentData.emergency_address || '',
                    emergencyRelationship: studentData.emergency_relationship || '',
                    emergencyNumber: studentData.emergency_number || '',
                    elemSchool: studentData.elem_school || '',
                    elemYearGraduated: studentData.elem_year_graduated || '',
                    juniorHighSchool: studentData.junior_high_school || '',
                    juniorHighYearGraduated: studentData.junior_high_year_graduated || '',
                    seniorHighSchool: studentData.senior_high_school || '',
                    seniorHighYearGraduated: studentData.senior_high_year_graduated || '',
                    collegeSchool: studentData.college_school || '',
                    collegeYearGraduated: studentData.college_year_graduated || '',
                    honorsAwards: studentData.honors_awards || '',
                    extracurricularActivities: studentData.extracurricular_activities || '',
                    scholarshipsAvailed: studentData.scholarships_availed || '',
                }));

                // Check if profile completion is needed
                console.log('[ProfileCompletion] session.profile_completed =', studentData.profile_completed);
                if (!studentData.profile_completed) {
                    console.log('[ProfileCompletion] Showing profile completion modal');
                    setProfileFormData((prev: any) => ({
                        ...prev,
                        firstName: studentData.first_name || '',
                        lastName: studentData.last_name || '',
                        middleName: studentData.middle_name || '',
                        suffix: studentData.suffix || '',
                        dob: studentData.dob || '',
                        age: studentData.age || '',
                        placeOfBirth: studentData.place_of_birth || '',
                        nationality: studentData.nationality || '',
                        sex: studentData.sex || '',
                        genderIdentity: studentData.gender_identity || '',
                        civilStatus: studentData.civil_status || '',
                        street: studentData.street || '',
                        city: studentData.city || '',
                        province: studentData.province || '',
                        zipCode: studentData.zip_code || '',
                        mobile: studentData.mobile || '',
                        email: studentData.email || '',
                        facebookUrl: studentData.facebook_url || '',
                    }));
                    setShowProfileCompletion(true);
                }

                // Set Onboarding Tour State
                setHasSeenTourState(Boolean(studentData.has_seen_tour));
            }
        };

        fetchAndSyncProfile();
    }, [session]);

    // Sequences the Tour to appear AFTER Profile Completion closes
    useEffect(() => {
        if (!loading && session && !showProfileCompletion && !hasSeenTourState) {
            setShowTour(true);
        }
    }, [loading, session, showProfileCompletion, hasSeenTourState]);

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
                is_child_of_solo_parent: Boolean(personalInfo.isChildOfSoloParent),
                section: personalInfo.section || null,
                year_level: personalInfo.year || null,
                // New fields
                religion: personalInfo.religion || null,
                is_safe_in_community: Boolean(personalInfo.isSafeInCommunity),
                mother_name: personalInfo.motherName || null,
                mother_occupation: personalInfo.motherOccupation || null,
                mother_contact: personalInfo.motherContact || null,
                father_name: personalInfo.fatherName || null,
                father_occupation: personalInfo.fatherOccupation || null,
                father_contact: personalInfo.fatherContact || null,
                parent_address: personalInfo.parentAddress || null,
                num_brothers: personalInfo.numBrothers || null,
                num_sisters: personalInfo.numSisters || null,
                birth_order: personalInfo.birthOrder || null,
                spouse_name: personalInfo.spouseName || null,
                spouse_occupation: personalInfo.spouseOccupation || null,
                num_children: personalInfo.numChildren || null,
                guardian_name: personalInfo.guardianName || null,
                guardian_address: personalInfo.guardianAddress || null,
                guardian_contact: personalInfo.guardianContact || null,
                guardian_relation: personalInfo.guardianRelation || null,
                emergency_name: personalInfo.emergencyName || null,
                emergency_address: personalInfo.emergencyAddress || null,
                emergency_relationship: personalInfo.emergencyRelationship || null,
                emergency_number: personalInfo.emergencyNumber || null,
                elem_school: personalInfo.elemSchool || null,
                elem_year_graduated: personalInfo.elemYearGraduated || null,
                junior_high_school: personalInfo.juniorHighSchool || null,
                junior_high_year_graduated: personalInfo.juniorHighYearGraduated || null,
                senior_high_school: personalInfo.seniorHighSchool || null,
                senior_high_year_graduated: personalInfo.seniorHighYearGraduated || null,
                college_school: personalInfo.collegeSchool || null,
                college_year_graduated: personalInfo.collegeYearGraduated || null,
                honors_awards: personalInfo.honorsAwards || null,
                extracurricular_activities: personalInfo.extracurricularActivities || null,
                scholarships_availed: personalInfo.scholarshipsAvailed || null,
            };

            const { error } = await supabaseClient
                .from('students')
                .update(updatePayload)
                .eq('student_id', personalInfo.studentId);

            if (error) throw error;
            showToast("Profile updated successfully!");
        } catch (err: any) {
            showToast("Error saving profile: " + err.message, 'error');
        }
    };

    // Upload profile picture to Supabase Storage & update DB
    const uploadProfilePicture = async (file: File) => {
        if (!personalInfo.studentId) return;
        try {
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `${personalInfo.studentId}/avatar.${ext}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('profile-pictures')
                .upload(path, file, { upsert: true, contentType: file.type });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabaseClient.storage
                .from('profile-pictures')
                .getPublicUrl(path);
            const publicUrl = urlData.publicUrl;
            const { error: dbError } = await supabaseClient
                .from('students')
                .update({ profile_picture_url: publicUrl })
                .eq('student_id', personalInfo.studentId);
            if (dbError) throw dbError;
            setPersonalInfo((prev: any) => ({ ...prev, profile_picture_url: publicUrl }));
            showToast("Profile picture updated!");
        } catch (err: any) {
            showToast("Failed to upload picture: " + err.message, 'error');
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
                        setCompletedForms(new Set(subs.map((s: any) => s.form_id)));
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
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `student_id=eq.${personalInfo.studentId}` }, (payload: any) => {
                setNotifications((prev: any) => [payload.new, ...prev]);
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
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `student_id=eq.${personalInfo?.studentId}` }, (payload: any) => {
                showToast(`Application Status Updated: ${payload.new.status}`, 'info');
            })
            .subscribe();

        const profileChannel = supabaseClient
            .channel('student_profile_update')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `student_id=eq.${personalInfo?.studentId}` }, (payload: any) => {
                // Update personal info state locally
                setPersonalInfo((prev: any) => ({ ...prev, ...payload.new })); // This might need mapping if column names differ from state names
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
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests', filter: `student_id=eq.${personalInfo.studentId}` }, (payload: any) => {
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

    const formatFullDate = (date: any) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const formatTime = (date: any) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Fetch Attendance and Rating History
    const fetchHistory = async () => {
        if (!personalInfo.studentId) return;

        // Attendance
        const { data: attendanceData } = await supabaseClient
            .from('event_attendance')
            .select('*')
            .eq('student_id', personalInfo.studentId);

        if (attendanceData) {
            const map: Record<string, any> = {};
            attendanceData.forEach((r: any) => map[r.event_id] = r);
            setAttendanceMap(map);
        }

        // Ratings
        const { data: ratingData } = await supabaseClient
            .from('event_feedback')
            .select('event_id')
            .eq('student_id', personalInfo.studentId);

        if (ratingData) {
            setRatedEvents(ratingData.map((row: any) => row.event_id));
        }
    };

    // Fetch on load AND when switching views (to keep sync)
    useEffect(() => {
        fetchHistory();
    }, [personalInfo.studentId, activeView]);

    const handleTimeIn = async (event: any) => {
        if (isTimingIn) return;
        if (!proofFile) { showToast("Please upload a proof photo to Time In.", 'error'); return; }

        if (!navigator.geolocation) { showToast("Geolocation is not supported by your browser.", 'error'); return; }
        setIsTimingIn(true);

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES (Update these with real values) ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 200; // Realistic campus radius

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

                // Increment Count using atomic RPC to prevent concurrency bugs
                const { error: rpcError } = await supabaseClient.rpc('increment_event_attendees', { e_id: event.id });
                if (rpcError) {
                    console.error("RPC Error:", rpcError);
                    // Fallback to manual if RPC doesn't exist yet, but note it's prone to concurrency issues
                    const { data: countData } = await supabaseClient.from('events').select('attendees').eq('id', event.id).single();
                    await supabaseClient.from('events').update({ attendees: (countData?.attendees || 0) + 1 }).eq('id', event.id);
                }

                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: { event_id: event.id, time_in: now, time_out: null } }));
                setEventsList((prev: any) => prev.map((e: any) => e.id === event.id ? { ...e, attendees: (e.attendees || 0) + 1 } : e));
                setProofFile(null);
                showToast("Time In Successful! Location Verified.");
            } catch (err: any) {
                console.error("Time In Error:", err);
                if (err.code === '23505') {
                    showToast("You have already timed in for this event.", 'error');
                    // Refresh attendance to sync state
                    const { data } = await supabaseClient.from('event_attendance').select('*').eq('event_id', event.id).eq('student_id', personalInfo.studentId).single();
                    if (data) setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data }));
                } else {
                    showToast("Error: " + (err.message || "Unknown error"), 'error');
                }
            } finally {
                setIsTimingIn(false);
            }
        }, (error: any) => {
            setIsTimingIn(false);
            let msg = "Location check failed.";
            if (error.code === 1) msg = "Permission denied. Please allow location access.";
            else if (error.code === 2) msg = "Position unavailable. Ensure GPS/WiFi is on.";
            else if (error.code === 3) msg = "Location request timed out.";
            showToast(msg, 'error');
        }, options);
    };

    const handleTimeOut = async (event: any) => {
        if (!navigator.geolocation) { showToast("Geolocation is not supported.", 'error'); return; }

        const options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };
        navigator.geolocation.getCurrentPosition(async (position: any) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // --- CAMPUS COORDINATES ---
            const targetLat = event.latitude || 9.306;
            const targetLng = event.longitude || 123.306;
            const MAX_DISTANCE_METERS = 200; // Realistic campus radius

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
                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data[0] }));
                showToast("Time Out Successful!");
                fetchHistory();
            } catch (err: any) {
                console.error("Time Out Error:", err);
                showToast("Error: " + err.message, 'error');
            }
        }, (error: any) => {
            showToast("Location check failed. Please enable location services.", 'error');
        }, options);
    };

    const handleRateEvent = (event: any) => {
        setRatingForm({
            eventId: event.id, title: event.title, rating: 0, comment: '',
            q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0,
            open_best: '', open_suggestions: '', open_comments: '',
            date_of_activity: event.event_date || event.created_at || new Date().toISOString()
        });
        setShowRatingModal(true);
    };

    const submitRating = async () => {
        const scores = [ratingForm.q1, ratingForm.q2, ratingForm.q3, ratingForm.q4, ratingForm.q5, ratingForm.q6, ratingForm.q7];
        if (scores.some(s => s === 0)) { showToast("Please rate all evaluation criteria", 'error'); return; }
        if (ratedEvents.includes(ratingForm.eventId)) { showToast("You have already rated this event.", 'error'); setShowRatingModal(false); return; }

        const avgRating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        try {
            const { error } = await supabaseClient.from('event_feedback').insert([{
                event_id: ratingForm.eventId,
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                rating: avgRating,
                feedback: ratingForm.comment,
                submitted_at: new Date().toISOString(),
                sex: personalInfo.sex || personalInfo.gender || '',
                college: `${personalInfo.department || ''} - ${personalInfo.course || ''} (${personalInfo.year || ''})`,
                date_of_activity: ratingForm.date_of_activity ? new Date(ratingForm.date_of_activity).toISOString().split('T')[0] : null,
                q1_score: ratingForm.q1,
                q2_score: ratingForm.q2,
                q3_score: ratingForm.q3,
                q4_score: ratingForm.q4,
                q5_score: ratingForm.q5,
                q6_score: ratingForm.q6,
                q7_score: ratingForm.q7,
                open_best: ratingForm.open_best,
                open_suggestions: ratingForm.open_suggestions,
                open_comments: ratingForm.open_comments
            }]);
            if (error) throw error;
            setRatedEvents([...ratedEvents, ratingForm.eventId]);
            showToast("Evaluation submitted successfully!"); setShowRatingModal(false);
        } catch (err: any) { showToast("Error: " + err.message, 'error'); }
    };

    const colorMap = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', hoverBg: 'group-hover:bg-blue-600' },
        green: { bg: 'bg-green-50', text: 'text-green-600', hoverBg: 'group-hover:bg-green-600' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', hoverBg: 'group-hover:bg-purple-600' }
    };

    const handleInventoryChange = (questionId: any, value: any) => {
        setAssessmentForm((prev: any) => {
            const parsed = typeof value === 'number' ? value : (isNaN(Number(value)) ? value : parseInt(value));
            return { ...prev, responses: { ...prev.responses, [questionId]: parsed } };
        });
    };

    const openAssessmentForm = async (form: any) => {
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
            setCompletedForms((prev: any) => new Set([...prev, activeForm.id]));
        } catch (error: any) {
            showToast("Error submitting assessment: " + error.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const submitCounselingRequest = async () => {
        if (!counselingForm.reason_for_referral.trim()) { showToast("Please provide your reason for requesting counseling.", 'error'); return; }
        setIsSubmitting(true);
        try {
            const { error } = await supabaseClient.from('counseling_requests').insert([{
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                course_year: `${personalInfo.course || ''} - ${personalInfo.year || ''}`,
                contact_number: personalInfo.mobile || '',
                request_type: 'Self-Referral',
                description: counselingForm.reason_for_referral,
                reason_for_referral: counselingForm.reason_for_referral,
                personal_actions_taken: counselingForm.personal_actions_taken,
                date_duration_of_concern: counselingForm.date_duration_of_concern,
                department: personalInfo.department,
                status: 'Submitted'
            }]);
            if (error) throw error;
            showToast("Counseling Request Submitted!");
            setShowCounselingForm(false);
            setCounselingForm({ reason_for_referral: '', personal_actions_taken: '', date_duration_of_concern: '' });
        } catch (error: any) {
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
        } catch (error: any) {
            showToast("Error: " + error.message, 'error');
        } finally { setIsSubmitting(false); }
    };

    const openRequestModal = (req: any) => {
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
        } catch (err: any) { showToast("Error: " + err.message, 'error'); }
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
        } catch (err: any) { showToast(err.message, 'error'); }
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

    // --- ONBOARDING TOUR DATA ---
    const TOUR_STEPS = [
        {
            title: "Welcome to your Student Portal! 👋",
            description: "This is your central hub for all student services, assessments, and essential information. Let's take a quick look around.",
            icon: <Icons.Star filled />,
            highlightId: null
        },
        {
            title: "Needs Assessment Test (NAT)",
            description: "The NAT helps us understand your needs better. You can take the test and view your results here.",
            icon: <Icons.Assessment />,
            highlightId: "nav-assessment"
        },
        {
            title: "Counseling Services",
            description: "Need someone to talk to? Request an appointment with our counseling staff easily through this tab.",
            icon: <Icons.Counseling />,
            highlightId: "nav-counseling"
        },
        {
            title: "Events & Announcements",
            description: "Stay updated with the latest workshops, seminars, and important school announcements.",
            icon: <Icons.Events />,
            highlightId: "nav-events"
        },
        {
            title: "Your Profile",
            description: "Keep your personal information up to date so we can serve you better. Click here to edit your details.",
            icon: <Icons.Profile />,
            highlightId: "nav-profile"
        },
        {
            title: "You're All Set! 🚀",
            description: "Feel free to explore the portal at your own pace. If you ever need help, the Support tab is right there.",
            icon: <Icons.CheckCircle />,
            highlightId: null
        }
    ];

    const currentTourStep = TOUR_STEPS[tourStep];
    const highlightedElement = currentTourStep?.highlightId ? document.getElementById(currentTourStep.highlightId) : null;
    const highlightRect = highlightedElement ? highlightedElement.getBoundingClientRect() : null;

    const handleTourNext = async () => {
        if (tourStep < TOUR_STEPS.length - 1) {
            setTourStep(prev => prev + 1);
        } else {
            setShowTour(false);
            setHasSeenTourState(true);
            try {
                await supabaseClient.from('students').update({ has_seen_tour: true }).eq('student_id', personalInfo.studentId);
            } catch (err) {
                console.error("Failed to save tour completion.", err);
            }
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-800 font-sans overflow-hidden relative">

            {/* Onboarding Tour Overlay */}
            {showTour && createPortal(
                <div className="fixed inset-0 z-[10000] overflow-hidden pointer-events-auto">
                    {/* Dark backdrop with cutout */}
                    <div className="absolute inset-0 bg-black/60 transition-all duration-300 pointer-events-none" style={
                        highlightRect ? {
                            clipPath: `polygon(
                                0% 0%, 0% 100%, 
                                ${highlightRect.left - 8}px 100%, 
                                ${highlightRect.left - 8}px ${highlightRect.top - 8}px, 
                                ${highlightRect.right + 8}px ${highlightRect.top - 8}px, 
                                ${highlightRect.right + 8}px ${highlightRect.bottom + 8}px, 
                                ${highlightRect.left - 8}px ${highlightRect.bottom + 8}px, 
                                ${highlightRect.left - 8}px 100%, 
                                100% 100%, 100% 0%
                            )`
                        } : { clipPath: 'none' }
                    } />

                    {/* Highlights Ring */}
                    {highlightRect && (
                        <div className="absolute border-2 border-indigo-400 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all duration-300 animate-pulse pointer-events-none"
                            style={{
                                top: highlightRect.top - 8,
                                left: highlightRect.left - 8,
                                width: highlightRect.width + 16,
                                height: highlightRect.height + 16
                            }}
                        />
                    )}

                    {/* Dialog Box */}
                    <div className="absolute transition-all duration-500 max-w-sm w-full bg-white rounded-2xl shadow-2xl p-6 pointer-events-auto"
                        style={
                            highlightRect ? {
                                top: highlightRect.top + highlightRect.height / 2,
                                left: highlightRect.right + 24, // Place to the right of the highlight
                                transform: 'translateY(-50%)',
                            } : {
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                            }
                        }>
                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-indigo-50 rounded-xl">
                                <div className="text-indigo-600 [&>svg]:w-6 [&>svg]:h-6">{currentTourStep.icon}</div>
                            </div>
                            <div className="flex-1 mt-1">
                                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-1">{currentTourStep.title}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">{currentTourStep.description}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                            <div className="flex gap-1.5">
                                {TOUR_STEPS.map((_, i) => (
                                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === tourStep ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-200'}`} />
                                ))}
                            </div>
                            <button onClick={handleTourNext} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-lg transition-colors shadow-md shadow-indigo-500/20">
                                {tourStep === TOUR_STEPS.length - 1 ? "Let's Go!" : "Next"}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Profile Completion Modal */}
            {showProfileCompletion && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 text-center">
                            <h2 className="text-2xl font-black text-slate-800">Complete Your Profile</h2>
                            <p className="text-sm text-slate-500 mt-1">Please fill in the remaining information to complete your student profile.</p>
                            <div className="mt-4">
                                <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5 px-1">
                                    {PROFILE_STEP_LABELS.map((label, i) => (
                                        <span key={label} className={profileStep >= i + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                    ))}
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300" style={{ width: `${(profileStep / PROFILE_TOTAL_STEPS) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1">

                            {/* STEP 1: PERSONAL INFO (NAT auto-filled + remaining) */}
                            {profileStep === 1 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-xs text-slate-400">Fields from your application are pre-filled. You may edit them.</p></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Last Name *</label><input name="lastName" value={profileFormData.lastName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">First Name *</label><input name="firstName" value={profileFormData.firstName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Suffix</label><input name="suffix" value={profileFormData.suffix} onChange={handleProfileFormChange} placeholder="Jr., II" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm placeholder:text-slate-300" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Middle Name</label><input name="middleName" value={profileFormData.middleName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="street" value={profileFormData.street} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">City</label><input name="city" value={profileFormData.city} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Province</label><input name="province" value={profileFormData.province} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Zip</label><input name="zipCode" value={profileFormData.zipCode} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact *</label><input name="mobile" value={profileFormData.mobile} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Email *</label><input name="email" value={profileFormData.email} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Birthday *</label><input type="date" name="dob" value={profileFormData.dob} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Age</label><input name="age" value={profileFormData.age} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" readOnly /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Sex *</label><select name="sex" value={profileFormData.sex} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Gender</label><select name="genderIdentity" value={profileFormData.genderIdentity} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Civil Status</label><select name="civilStatus" value={profileFormData.civilStatus} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated Legally">Separated Legally</option><option value="Separated Physically">Separated Physically</option><option value="With Live-In Partner">With Live-In Partner</option><option value="Divorced">Divorced</option><option value="Widow/er">Widow/er</option></select></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Nationality</label><input name="nationality" value={profileFormData.nationality} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">FB Account Link</label><input name="facebookUrl" value={profileFormData.facebookUrl} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Place of Birth</label><input name="placeOfBirth" value={profileFormData.placeOfBirth} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Religion</label><input name="religion" value={profileFormData.religion} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">School Last Attended</label><input name="schoolLastAttended" value={profileFormData.schoolLastAttended} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Level</label><select name="yearLevelApplying" value={profileFormData.yearLevelApplying} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="1st Year">I</option><option value="2nd Year">II</option><option value="3rd Year">III</option><option value="4th Year">IV</option></select></div>
                                    </div>
                                    {/* Supporter */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Person who supported your studies aside from parents</label>
                                        <div className="grid grid-cols-2 gap-2">{['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants'].map(opt => (<label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" value={opt} checked={(profileFormData.supporter || []).includes(opt)} onChange={e => handleProfileCheckboxGroup(e, 'supporter')} className="w-4 h-4 text-indigo-600" />{opt}</label>))}</div>
                                        <input name="supporterContact" placeholder="Supporter Contact Info" value={profileFormData.supporterContact} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm mt-2" />
                                    </div>
                                    {/* Working Student */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Are you a Working Student?</label>
                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value={o} checked={profileFormData.isWorkingStudent === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isWorkingStudent === 'Yes' && <select name="workingStudentType" value={profileFormData.workingStudentType} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select Type</option><option value="House help">House help</option><option value="Call Center Agent/BPO employee">Call Center Agent/BPO</option><option value="Fast food/Restaurant">Fast food/Restaurant</option><option value="Online employee/Freelancer">Online/Freelancer</option><option value="Self-employed">Self-employed</option></select>}
                                    </div>
                                    {/* PWD */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Are you a Person with a Disability (PWD)?</label>
                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value={o} checked={profileFormData.isPwd === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isPwd === 'Yes' && <select name="pwdType" value={profileFormData.pwdType} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Visual impairment">Visual</option><option value="Hearing impairment">Hearing</option><option value="Physical/Orthopedic disability">Physical/Orthopedic</option><option value="Chronic illness">Chronic illness</option><option value="Psychosocial disability">Psychosocial</option><option value="Communication disability">Communication</option></select>}
                                    </div>
                                    {/* Indigenous */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase block">Member of any Indigenous Group?</label>
                                        <div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value={o} checked={profileFormData.isIndigenous === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isIndigenous === 'Yes' && <select name="indigenousGroup" value={profileFormData.indigenousGroup} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Bukidnon">Bukidnon</option><option value="Tabihanon Group">Tabihanon</option><option value="ATA">ATA</option><option value="IFUGAO">IFUGAO</option><option value="Kalahing Kulot">Kalahing Kulot</option><option value="Lumad">Lumad</option></select>}
                                    </div>
                                    {/* Conflict & Solo Parent */}
                                    <div className="pt-3 border-t border-slate-100 space-y-3">
                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Witnessed armed conflict in your community?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="witnessedConflict" value={o} checked={profileFormData.witnessedConflict === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Feel safe in your community?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSafeInCommunity" value={o} checked={profileFormData.isSafeInCommunity === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Are you a Solo Parent?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSoloParent" value={o} checked={profileFormData.isSoloParent === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Son/daughter of a solo parent?</label><div className="flex gap-4">{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isChildOfSoloParent" value={o} checked={profileFormData.isChildOfSoloParent === o} onChange={handleProfileFormChange} className="w-4 h-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: FAMILY BACKGROUND */}
                            {profileStep === 2 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Name</label><input name="motherName" placeholder="N/A if not applicable" value={profileFormData.motherName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Occupation</label><input name="motherOccupation" placeholder="N/A" value={profileFormData.motherOccupation} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Mother's Contact</label><input name="motherContact" placeholder="N/A" value={profileFormData.motherContact} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Name</label><input name="fatherName" placeholder="N/A" value={profileFormData.fatherName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Occupation</label><input name="fatherOccupation" placeholder="N/A" value={profileFormData.fatherOccupation} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Father's Contact</label><input name="fatherContact" placeholder="N/A" value={profileFormData.fatherContact} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Parent's Address</label><input name="parentAddress" placeholder="N/A" value={profileFormData.parentAddress} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Brothers</label><input name="numBrothers" placeholder="N/A" value={profileFormData.numBrothers} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Sisters</label><input name="numSisters" placeholder="N/A" value={profileFormData.numSisters} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Birth Order</label><select name="birthOrder" value={profileFormData.birthOrder} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100"><p className="text-xs text-slate-400 mb-2 italic">If married, fill the fields below. Type N/A if not applicable.</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Spouse Name</label><input name="spouseName" placeholder="N/A" value={profileFormData.spouseName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Spouse Occupation</label><input name="spouseOccupation" placeholder="N/A" value={profileFormData.spouseOccupation} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">No. of Children</label><input name="numChildren" placeholder="N/A" value={profileFormData.numChildren} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: GUARDIAN */}
                            {profileStep === 3 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input name="guardianName" value={profileFormData.guardianName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="guardianAddress" value={profileFormData.guardianAddress} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact</label><input name="guardianContact" value={profileFormData.guardianContact} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Relation</label><select name="guardianRelation" value={profileFormData.guardianRelation} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm"><option value="">Select</option><option value="Relative">Relative</option><option value="Not relative">Not relative</option><option value="Landlord">Landlord</option><option value="Landlady">Landlady</option></select></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: EMERGENCY CONTACT */}
                            {profileStep === 4 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (Emergency)</h3></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Full Name</label><input name="emergencyName" value={profileFormData.emergencyName} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Address</label><input name="emergencyAddress" value={profileFormData.emergencyAddress} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Relationship</label><input name="emergencyRelationship" value={profileFormData.emergencyRelationship} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Contact Number</label><input name="emergencyNumber" value={profileFormData.emergencyNumber} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: EDUCATIONAL BACKGROUND */}
                            {profileStep === 5 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Elementary</label><input name="elemSchool" value={profileFormData.elemSchool} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="elemYearGraduated" value={profileFormData.elemYearGraduated} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Junior High School</label><input name="juniorHighSchool" value={profileFormData.juniorHighSchool} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="juniorHighYearGraduated" value={profileFormData.juniorHighYearGraduated} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Senior High School</label><input name="seniorHighSchool" value={profileFormData.seniorHighSchool} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated</label><input name="seniorHighYearGraduated" value={profileFormData.seniorHighYearGraduated} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">College</label><input name="collegeSchool" value={profileFormData.collegeSchool} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                        <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Year Graduated / Continuing</label><input name="collegeYearGraduated" value={profileFormData.collegeYearGraduated} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                    </div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Honor/Award Received</label><input name="honorsAwards" placeholder="N/A if not applicable" value={profileFormData.honorsAwards} onChange={handleProfileFormChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" /></div>
                                </div>
                            )}

                            {/* STEP 6: EXTRA-CURRICULAR */}
                            {profileStep === 6 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Name of Activities</label><textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={profileFormData.extracurricularActivities} onChange={handleProfileFormChange} rows={5} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none" /></div>
                                </div>
                            )}

                            {/* STEP 7: SCHOLARSHIPS */}
                            {profileStep === 7 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Name of Scholarship Availed</label><textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={profileFormData.scholarshipsAvailed} onChange={handleProfileFormChange} rows={5} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm resize-none" /></div>
                                </div>
                            )}

                            {/* STEP 8: FINISH */}
                            {profileStep === 8 && (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-slate-200"><svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                                    <h3 className="text-2xl font-bold text-slate-800">Final Step</h3>
                                    <p className="text-slate-500 text-sm">Please agree to the data privacy terms to complete your profile.</p>
                                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-left">
                                        <h4 className="text-sm font-bold text-indigo-900 mb-2">DATA PRIVACY ACT DISCLAIMER</h4>
                                        <p className="text-xs text-indigo-800/80 mb-5 leading-relaxed">By submitting this form, I hereby authorize Negros Oriental State University (NORSU) to collect, process, and retain my personal and sensitive information for purposes of academic administration, student services, and university records in strict accordance with the Data Privacy Act of 2012 (RA 10173).</p>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${profileFormData.agreedToPrivacy ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-400'}`}>{profileFormData.agreedToPrivacy && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}</div>
                                            <input type="checkbox" checked={profileFormData.agreedToPrivacy} onChange={e => setProfileFormData({ ...profileFormData, agreedToPrivacy: e.target.checked })} className="hidden" />
                                            <span className="text-sm font-bold text-slate-800">I have read and agree to the terms</span>
                                        </label>
                                    </div>
                                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100"><p className="text-xs text-emerald-700 italic leading-relaxed">"Thank you for completing your profile. Your responses help us serve you better!"</p></div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-between items-center rounded-b-3xl">
                            {profileStep > 1 ? (
                                <button type="button" onClick={() => setProfileStep(p => p - 1)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">Back</button>
                            ) : (
                                <div />
                            )}
                            {profileStep < PROFILE_TOTAL_STEPS ? (
                                <button type="button" onClick={handleProfileNextStep} className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md">Next Step</button>
                            ) : (
                                <button disabled={profileSaving || !profileFormData.agreedToPrivacy} onClick={handleProfileCompletion} className="px-8 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-500 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center gap-2 transition-all">{profileSaving ? 'Saving...' : 'Complete Profile'}</button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
                            {sidebarLinks.filter(link => link.group === group).map((link: any) => (
                                <button key={link.id} id={`nav-${link.id}`} onClick={() => { setActiveView(link.id); setIsEditing(false); setIsSidebarOpen(false); }} className={`nav-item nav-item-student w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeView === link.id ? 'nav-item-active text-sky-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
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
                        <h2 className="text-xl font-bold gradient-text-blue">{(viewLabels as any)[activeView] || activeView}</h2>
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
                        <StudentDashboardView
                            personalInfo={personalInfo}
                            activeVisit={activeVisit}
                            handleOfficeTimeIn={handleOfficeTimeIn}
                            handleOfficeTimeOut={handleOfficeTimeOut}
                            notifications={notifications}
                            colorMap={colorMap}
                            setActiveView={setActiveView}
                            eventsList={eventsList}
                            attendanceMap={attendanceMap}
                            StudentHero={StudentHero}
                        />
                    )}

                    {/* EVENTS */}
                    {activeView === 'events' && (
                        <StudentEventsView
                            eventsList={eventsList}
                            eventFilter={eventFilter}
                            setEventFilter={setEventFilter}
                            attendanceMap={attendanceMap}
                            fetchHistory={fetchHistory}
                            handleTimeIn={handleTimeIn}
                            handleTimeOut={handleTimeOut}
                            handleRateEvent={handleRateEvent}
                            ratedEvents={ratedEvents}
                            isTimingIn={isTimingIn}
                            setProofFile={setProofFile}
                            selectedEvent={selectedEvent}
                            setSelectedEvent={setSelectedEvent}
                            showRatingModal={showRatingModal}
                            setShowRatingModal={setShowRatingModal}
                            ratingForm={ratingForm}
                            setRatingForm={setRatingForm}
                            submitRating={submitRating}
                            showTimeInModal={showTimeInModal}
                            setShowTimeInModal={setShowTimeInModal}
                            visitReasons={visitReasons}
                            selectedReason={selectedReason}
                            setSelectedReason={setSelectedReason}
                            submitTimeIn={submitTimeIn}
                            personalInfo={personalInfo}
                            toast={toast}
                            Icons={Icons}
                            showCommandHub={showCommandHub}
                            setShowCommandHub={setShowCommandHub}
                            setActiveView={setActiveView}
                            setShowCounselingForm={setShowCounselingForm}
                            setShowSupportModal={setShowSupportModal}
                        />
                    )}

                    {/* ASSESSMENT - COUNSELING - SUPPORT - SCHOLARSHIP - FEEDBACK - PROFILE */}
                    {renderRemainingViews({ activeView, activeForm, loadingForm, formQuestions, formsList, assessmentForm, handleInventoryChange, submitAssessment, openAssessmentForm, showAssessmentModal, setShowAssessmentModal, showSuccessModal, setShowSuccessModal, isSubmitting, showCounselingForm, setShowCounselingForm, counselingForm, setCounselingForm, submitCounselingRequest, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, showCounselingRequestsModal, setShowCounselingRequestsModal, showSupportRequestsModal, setShowSupportRequestsModal, supportForm, setSupportForm, personalInfo, submitSupportRequest, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship, uploadProfilePicture })}
                </div>
            </main>
        </div>
    );
}
