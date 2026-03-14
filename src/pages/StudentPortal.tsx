
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createPortal } from 'react-dom';
import StudentDashboardView from './student/StudentDashboardView';
import StudentEventsView from './student/StudentEventsView';
import { renderRemainingViews, ServiceIntroModal } from './student/StudentPortalViews';
import DatePicker from '../components/ui/DatePicker';
import {
    getAttendanceHistory,
    getRatedEventIds
} from '../services/studentPortalService';
import { STUDENT_LIST_COLUMNS } from '../services/careStaffService';
import { fetchDepartmentNameForCourse } from '../utils/courseDepartment';
import { joinNameParts, splitFullName } from '../utils/nameUtils';
import { buildStudentAddress, getStudentEmergencyContact, getStudentSex } from '../utils/studentFields';
import { useStudentProfileData } from '../hooks/student/useStudentProfileData';
import { useStudentEventsData } from '../hooks/student/useStudentEventsData';
import { useStudentFormsData } from '../hooks/student/useStudentFormsData';
import { useStudentCounselingData } from '../hooks/student/useStudentCounselingData';
import { useStudentSupportData } from '../hooks/student/useStudentSupportData';

const supabaseClient = supabase;
const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';

const isValidYearLevel = (value: string) => YEAR_LEVEL_OPTIONS.includes(value);

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
    motherLastName?: string;
    motherGivenName?: string;
    motherMiddleName?: string;
    fatherLastName?: string;
    fatherGivenName?: string;
    fatherMiddleName?: string;
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
    const { session, loading, updateSession, logout } = useAuth() as any;
    const navigate = useNavigate();

    const [activeView, setActiveView] = useState('dashboard');
    const [profileTab, setProfileTab] = useState('personal');
    // Timer removed from main component
    const [feedbackType, setFeedbackType] = useState('service');
    const [rating, setRating] = useState(0);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [selectedSupportRequest, setSelectedSupportRequest] = useState<any>(null);
    const [sessionFeedback, setSessionFeedback] = useState<any>({ rating: 0, comment: '' });
    const [feedbackPrefill, setFeedbackPrefill] = useState<any>(null);
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
        files: [] as File[]
    });
    const [showScholarshipModal, setShowScholarshipModal] = useState(false);
    const [selectedScholarship, setSelectedScholarship] = useState<any>(null);

    // Office Logbook Modal State
    const [showTimeInModal, setShowTimeInModal] = useState(false);
    const [visitReasons, setVisitReasons] = useState<any[]>([]);
    const [selectedReason, setSelectedReason] = useState('');
    const [showTimeOutFeedback, setShowTimeOutFeedback] = useState(false);
    const [timeOutVisitReason, setTimeOutVisitReason] = useState('');

    const [proofFile, setProofFile] = useState<any>(null);
    const [isTimingIn, setIsTimingIn] = useState(false);

    const handleLogout = React.useCallback(() => {
        logout();
        navigate('/student/login', { replace: true });
    }, [logout, navigate]);

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
        motherLastName: "", motherGivenName: "", motherMiddleName: "",
        fatherLastName: "", fatherGivenName: "", fatherMiddleName: "",
        witnessedConflict: "",
        isSoloParent: false, isChildOfSoloParent: false
    });
    const [showMoreProfile, setShowMoreProfile] = useState(false);
    const [courseYearGate, setCourseYearGate] = useState<any>({
        visible: false,
        expired: false,
        course: '',
        year: '1st Year',
        courseLocked: false,
        yearLocked: false,
        courseOptions: [] as string[],
        windowStart: null as string | null,
        windowEnd: null as string | null
    });
    const [isSubmittingCourseYearGate, setIsSubmittingCourseYearGate] = useState(false);
    const courseYearGateVisibleRef = useRef(false);
    const courseYearGateConfirmedRef = useRef(false);
    const archiveRpcStateRef = useRef<'unknown' | 'available' | 'missing'>(
        sessionStorage.getItem(ARCHIVE_RPC_MISSING_CACHE_KEY) === '1' ? 'missing' : 'unknown'
    );

    // Onboarding Tour State
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [hasSeenTourState, setHasSeenTourState] = useState(true); // Default true

    // Profile Completion Modal State
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [profileStep, setProfileStep] = useState(1);
    const PROFILE_TOTAL_STEPS = 8;
    const PROFILE_STEP_LABELS = ['Personal', 'Family', 'Guardian', 'Emergency', 'Education', 'Activities', 'Scholarships', 'Finish'];
    const profileCompletionInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[16px] leading-5 text-slate-700 outline-none placeholder:text-slate-300 sm:py-2.5 sm:text-sm';
    const profileCompletionTextareaClass = `${profileCompletionInputClass} min-h-[8rem] resize-none`;
    const profileCompletionLabelClass = 'text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500';
    const profileCompletionGridTwoClass = 'grid grid-cols-1 gap-3 sm:grid-cols-2';
    const profileCompletionGridThreeClass = 'grid grid-cols-1 gap-3 sm:grid-cols-3';
    const profileCompletionRadioGroupClass = 'flex flex-col gap-3 sm:flex-row sm:gap-4';
    const profileCompletionCheckboxGridClass = 'grid grid-cols-1 gap-2 sm:grid-cols-2';
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
        motherLastName: '', motherGivenName: '', motherMiddleName: '', motherOccupation: '', motherContact: '',
        fatherLastName: '', fatherGivenName: '', fatherMiddleName: '', fatherOccupation: '', fatherContact: '',
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

    const getStoredParentParts = React.useCallback((studentData: any, prefix: 'mother' | 'father') => {
        const last = studentData?.[`${prefix}_last_name`] || '';
        const given = studentData?.[`${prefix}_given_name`] || '';
        const middle = studentData?.[`${prefix}_middle_name`] || '';

        if (last || given || middle) {
            return { last, given, middle };
        }

        const fallback = splitFullName(studentData?.[`${prefix}_name`]);
        return {
            last: fallback.last,
            given: fallback.given,
            middle: fallback.middle
        };
    }, []);

    const PROFILE_FIELD_LABELS: Record<string, string> = {
        first_name: 'First Name',
        last_name: 'Last Name',
        middle_name: 'Middle Name',
        suffix: 'Suffix',
        dob: 'Birth Date',
        age: 'Age',
        place_of_birth: 'Place of Birth',
        nationality: 'Nationality',
        sex: 'Sex',
        gender: 'Gender',
        gender_identity: 'Gender Identity',
        civil_status: 'Civil Status',
        address: 'Address',
        street: 'Street',
        city: 'City',
        province: 'Province',
        zip_code: 'Zip Code',
        mobile: 'Mobile',
        email: 'Email',
        facebook_url: 'Facebook URL',
        religion: 'Religion',
        school_last_attended: 'School Last Attended',
        year_level: 'Year Level',
        section: 'Section',
        supporter: 'Supporter',
        supporter_contact: 'Supporter Contact',
        is_working_student: 'Working Student Status',
        working_student_type: 'Working Student Type',
        is_pwd: 'PWD Status',
        pwd_type: 'PWD Type',
        is_indigenous: 'Indigenous Status',
        indigenous_group: 'Indigenous Group',
        witnessed_conflict: 'Witnessed Conflict',
        is_safe_in_community: 'Community Safety',
        is_solo_parent: 'Solo Parent Status',
        is_child_of_solo_parent: 'Child of Solo Parent Status',
        mother_name: 'Mother Name',
        mother_last_name: 'Mother Last Name',
        mother_given_name: 'Mother Given Name',
        mother_middle_name: 'Mother Middle Name',
        mother_occupation: 'Mother Occupation',
        mother_contact: 'Mother Contact',
        father_name: 'Father Name',
        father_last_name: 'Father Last Name',
        father_given_name: 'Father Given Name',
        father_middle_name: 'Father Middle Name',
        father_occupation: 'Father Occupation',
        father_contact: 'Father Contact',
        parent_address: 'Parent Address',
        num_brothers: 'No. of Brothers',
        num_sisters: 'No. of Sisters',
        birth_order: 'Birth Order',
        spouse_name: 'Spouse Name',
        spouse_occupation: 'Spouse Occupation',
        num_children: 'No. of Children',
        guardian_name: 'Guardian Name',
        guardian_address: 'Guardian Address',
        guardian_contact: 'Guardian Contact',
        guardian_relation: 'Guardian Relation',
        emergency_name: 'Emergency Contact Name',
        emergency_address: 'Emergency Address',
        emergency_relationship: 'Emergency Relationship',
        emergency_number: 'Emergency Number',
        emergency_contact: 'Emergency Contact',
        elem_school: 'Elementary School',
        elem_year_graduated: 'Elementary Year Graduated',
        junior_high_school: 'Junior High School',
        junior_high_year_graduated: 'Junior High Year Graduated',
        senior_high_school: 'Senior High School',
        senior_high_year_graduated: 'Senior High Year Graduated',
        college_school: 'College School',
        college_year_graduated: 'College Year Graduated',
        honors_awards: 'Honors/Awards',
        extracurricular_activities: 'Extracurricular Activities',
        scholarships_availed: 'Scholarships Availed',
        profile_completed: 'Profile Completion',
        profile_picture_url: 'Profile Picture'
    };

    const normalizeProfileField = (value: any) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? '1' : '0';
        if (typeof value === 'number') return Number.isNaN(value) ? '' : String(value);
        return String(value).trim();
    };

    const toProfileFieldLabel = (field: string) => {
        if (PROFILE_FIELD_LABELS[field]) return PROFILE_FIELD_LABELS[field];
        return field
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    const getChangedProfileFields = (beforeProfile: any, afterPayload: any) => {
        const changedFields: string[] = [];
        Object.keys(afterPayload || {}).forEach((key) => {
            const beforeValue = normalizeProfileField(beforeProfile?.[key]);
            const afterValue = normalizeProfileField(afterPayload?.[key]);
            if (beforeValue !== afterValue) {
                changedFields.push(toProfileFieldLabel(key));
            }
        });
        return changedFields;
    };

    const logStudentProfileUpdate = async ({
        action,
        beforeProfile,
        afterPayload,
        fallbackName,
        fallbackStudentId
    }: {
        action: string;
        beforeProfile: any;
        afterPayload: any;
        fallbackName?: string;
        fallbackStudentId?: string;
    }) => {
        try {
            const changedFields = getChangedProfileFields(beforeProfile, afterPayload);
            if (changedFields.length === 0) return;

            const studentId = fallbackStudentId || personalInfo.studentId || session?.user?.id || 'unknown';
            const fullName = (fallbackName || `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`).trim() || 'Student';
            const changedPreview = changedFields.slice(0, 6).join(', ');
            const moreSuffix = changedFields.length > 6 ? ` (+${changedFields.length - 6} more)` : '';
            const details = `${fullName} (${studentId}) modified: ${changedPreview}${moreSuffix}.`;

            const { error: auditError } = await supabaseClient.from('audit_logs').insert([{
                user_id: studentId,
                user_name: fullName,
                action,
                details
            }]);

            if (auditError) {
                const { error: notificationError } = await supabaseClient.from('notifications').insert([{
                    student_id: studentId,
                    message: `[PROFILE UPDATE] ${details}`
                }]);
                if (notificationError) {
                    console.warn('Profile update log fallback failed:', notificationError.message);
                }
            }
        } catch (loggingError: any) {
            console.warn('Unable to record profile update notification:', loggingError?.message || loggingError);
        }
    };

    const handleProfileCompletion = async () => {
        if (!profileFormData.agreedToPrivacy) return;
        setProfileSaving(true);
        try {
            const { data: beforeProfile } = await supabaseClient
                .from('students')
                .select(STUDENT_LIST_COLUMNS)
                .eq('student_id', personalInfo.studentId)
                .maybeSingle();

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
                witnessed_conflict: profileFormData.witnessedConflict === 'Yes', is_safe_in_community: profileFormData.isSafeInCommunity === 'Yes',
                is_solo_parent: profileFormData.isSoloParent === 'Yes',
                is_child_of_solo_parent: profileFormData.isChildOfSoloParent === 'Yes',
                // Family
                mother_name: joinNameParts({
                    given: profileFormData.motherGivenName,
                    middle: profileFormData.motherMiddleName,
                    last: profileFormData.motherLastName
                }) || null,
                mother_last_name: profileFormData.motherLastName || null,
                mother_given_name: profileFormData.motherGivenName || null,
                mother_middle_name: profileFormData.motherMiddleName || null,
                mother_occupation: profileFormData.motherOccupation,
                mother_contact: profileFormData.motherContact,
                father_name: joinNameParts({
                    given: profileFormData.fatherGivenName,
                    middle: profileFormData.fatherMiddleName,
                    last: profileFormData.fatherLastName
                }) || null,
                father_last_name: profileFormData.fatherLastName || null,
                father_given_name: profileFormData.fatherGivenName || null,
                father_middle_name: profileFormData.fatherMiddleName || null,
                father_occupation: profileFormData.fatherOccupation,
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
            await logStudentProfileUpdate({
                action: 'Student Profile Completed',
                beforeProfile,
                afterPayload: payload,
                fallbackName: `${profileFormData.firstName || personalInfo.firstName || ''} ${profileFormData.lastName || personalInfo.lastName || ''}`.trim(),
                fallbackStudentId: personalInfo.studentId
            });
            await refreshStudentProfile();
            setProfileStep(1);
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

    const { refreshEvents } = useStudentEventsData({ setEventsList });
    const { refreshForms } = useStudentFormsData({
        studentId: personalInfo.studentId,
        setFormsList,
        setCompletedForms,
        setLoadingForm
    });
    const { refreshCounselingRequests } = useStudentCounselingData({
        studentId: personalInfo.studentId,
        setCounselingRequests
    });
    const { refreshSupportRequests } = useStudentSupportData({
        studentId: personalInfo.studentId,
        setSupportRequests
    });
    const { refreshActiveVisit, refreshVisitReasons, refreshNotifications } = useStudentProfileData({
        studentId: personalInfo.studentId,
        setActiveVisit,
        setVisitReasons,
        setNotifications
    });

    useEffect(() => {
        const checkSession = async () => {
            if (!session?.user?.id) return;
            try {
                // Fetch student data
                const { data: studentDataRaw, error: studentError } = await supabaseClient
                    .from('students')
                    .select(STUDENT_LIST_COLUMNS)
                    .eq('student_id', session.user.id) // Assuming auth id maps to student_id or email
                    .single();
                const studentData: any = studentDataRaw as any;

                if (studentError) {
                    console.error('Error fetching student data:', studentError);
                } else if (studentData) {
                    setPersonalInfo((prev: any) => ({
                        ...prev,
                        ...studentData,
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
                        address: buildStudentAddress(studentData),
                        mobile: studentData.mobile,
                        email: studentData.email,
                        facebookUrl: studentData.facebook_url,
                        dob: studentData.dob,
                        age: studentData.age,
                        sex: getStudentSex(studentData),
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
            const { data } = await supabaseClient
                .from('scholarships')
                .select('id, title, description, requirements, deadline')
                .order('deadline', { ascending: true });
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
            const payload = {
                scholarship_id: scholarship.id,
                student_id: personalInfo.studentId,
                status: 'Pending'
            } as any;

            const { error } = await supabaseClient.from('scholarship_applications').insert([payload]);
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

    const syncStudentSession = React.useCallback((studentPatch: any) => {
        if (!studentPatch || session?.userType !== 'student') return;
        updateSession?.((prev: any) => ({
            ...(prev || {}),
            ...studentPatch,
            userType: 'student',
            role: 'Student'
        }));
    }, [session?.userType, updateSession]);

    const getCourseYearWindowRange = (startValue: string | null | undefined, endValue: string | null | undefined) => {
        const startText = formatGateDate(startValue || null);
        const endText = formatGateDate(endValue || null);
        if (startText && endText) return `${startText} to ${endText}`;
        if (startText) return `Starts ${startText}`;
        if (endText) return `Until ${endText}`;
        return null;
    };

    const formatGateDate = (value: string | null) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString();
    };

    const getSchoolYearLabel = (startValue: string | null | undefined, endValue: string | null | undefined) => {
        const startDate = startValue ? new Date(startValue) : null;
        const endDate = endValue ? new Date(endValue) : null;
        const hasStart = Boolean(startDate && !Number.isNaN(startDate.getTime()));
        const hasEnd = Boolean(endDate && !Number.isNaN(endDate.getTime()));

        if (!hasStart && !hasEnd) return 'SY Unknown';
        if (!hasStart && hasEnd) {
            const endYear = (endDate as Date).getFullYear();
            return `SY ${endYear - 1}-${endYear}`;
        }
        if (hasStart && !hasEnd) {
            const startYear = (startDate as Date).getFullYear();
            return `SY ${startYear}-${startYear + 1}`;
        }

        const startYear = (startDate as Date).getFullYear();
        const endYear = (endDate as Date).getFullYear();
        return `SY ${Math.min(startYear, endYear)}-${Math.max(startYear, endYear)}`;
    };

    const submitCourseYearConfirmation = async () => {
        if (!personalInfo.studentId) return;
        if (!courseYearGate.course) {
            showToast('Course is required.', 'error');
            return;
        }
        if (!isValidYearLevel(courseYearGate.year)) {
            showToast('Select a valid year level.', 'error');
            return;
        }
        if (courseYearGate.expired) {
            showToast('Course/year update window has ended. Contact CARE staff.', 'error');
            return;
        }

        setIsSubmittingCourseYearGate(true);
        try {
            const nowIso = new Date().toISOString();
            const matchedDepartment = await fetchDepartmentNameForCourse(
                supabaseClient,
                courseYearGate.course,
                personalInfo.department || 'Unassigned'
            );
            const { error } = await supabaseClient
                .from('students')
                .update({
                    course: courseYearGate.course,
                    year_level: courseYearGate.year,
                    department: matchedDepartment,
                    status: 'Active',
                    course_year_confirmed_at: nowIso,
                    course_year_update_required: false
                })
                .eq('student_id', personalInfo.studentId);
            if (error) throw error;

            const { error: enrollmentSyncError } = await supabaseClient
                .from('enrolled_students')
                .update({
                    course: courseYearGate.course,
                    year_level: courseYearGate.year
                })
                .eq('student_id', personalInfo.studentId);
            if (enrollmentSyncError) {
                console.warn('Failed to sync enrollment record after course/year confirmation.', enrollmentSyncError);
            }

            setPersonalInfo((prev: any) => ({
                ...prev,
                course: courseYearGate.course,
                year: courseYearGate.year,
                department: matchedDepartment,
                status: 'Active',
                courseYearWindowStart: courseYearGate.windowStart || prev.courseYearWindowStart || null,
                courseYearWindowEnd: courseYearGate.windowEnd || prev.courseYearWindowEnd || null
            }));

            syncStudentSession({
                course: courseYearGate.course,
                year_level: courseYearGate.year,
                department: matchedDepartment,
                status: 'Active',
                course_year_update_required: false,
                course_year_window_start: courseYearGate.windowStart || session?.course_year_window_start || null,
                course_year_window_end: courseYearGate.windowEnd || session?.course_year_window_end || null,
                course_year_confirmed_at: nowIso
            });

            courseYearGateVisibleRef.current = false;
            courseYearGateConfirmedRef.current = true;
            setCourseYearGate((prev: any) => ({
                ...prev,
                visible: false,
                expired: false
            }));
            showToast('Course and year confirmed successfully.');
        } catch (error: any) {
            showToast('Failed to confirm course/year: ' + error.message, 'error');
        } finally {
            setIsSubmittingCourseYearGate(false);
        }
    };

    // Timer removed (handled by Clock component)

    // Helper to determine department from course
    // Removed hardcoded getDepartment in favor of dynamic fetch

    const refreshStudentProfile = React.useCallback(async () => {
        if (!session || session.userType !== 'student') return;

        const studentId = session.student_id || session?.user?.id;
        if (!studentId) return;
        try {
            let studentData: any = session;
            const { data: latestStudent } = await supabaseClient
                .from('students')
                .select(STUDENT_LIST_COLUMNS)
                .eq('student_id', studentId)
                .maybeSingle();
            if (latestStudent) {
                studentData = latestStudent;
            }

            let archiveError: any = null;
            let archivedRows = 0;
            if (archiveRpcStateRef.current !== 'missing') {
                const rpcResult = await supabaseClient.rpc('archive_and_reset_expired_course_year');
                archiveError = rpcResult.error;
                archivedRows = Number(rpcResult.data || 0);

                if (archiveError) {
                    const errorText = String(archiveError.message || '').toLowerCase();
                    const missingRpc = errorText.includes('archive_and_reset_expired_course_year');
                    if (missingRpc) {
                        archiveRpcStateRef.current = 'missing';
                        sessionStorage.setItem(ARCHIVE_RPC_MISSING_CACHE_KEY, '1');
                    } else {
                        archiveRpcStateRef.current = 'available';
                        console.warn('Failed to run expired course/year archive reset RPC.', archiveError);
                    }
                } else {
                    archiveRpcStateRef.current = 'available';
                    sessionStorage.removeItem(ARCHIVE_RPC_MISSING_CACHE_KEY);
                }
            }

            if (archivedRows > 0) {
                const { data: refreshedStudent } = await supabaseClient
                    .from('students')
                    .select(STUDENT_LIST_COLUMNS)
                    .eq('student_id', studentId)
                    .maybeSingle();
                if (refreshedStudent) studentData = refreshedStudent;
            }

            if (archiveRpcStateRef.current === 'missing' || archiveError) {
                const windowEnd = studentData.course_year_window_end || null;
                const windowEndDate = windowEnd ? new Date(windowEnd) : null;
                const expired = Boolean(windowEndDate && new Date() > windowEndDate);
                const hasWindowState = Boolean(
                    studentData.course
                    || studentData.year_level
                    || studentData.course_year_update_required
                    || studentData.course_year_window_start
                    || studentData.course_year_window_end
                );
                if (expired && hasWindowState) {
                    const { error: fallbackResetError } = await supabaseClient
                        .from('students')
                        .update({
                            course: null,
                            year_level: null,
                            status: 'Inactive',
                            course_year_confirmed_at: null,
                            course_year_update_required: false,
                            course_year_window_start: null,
                            course_year_window_end: null
                        })
                        .eq('student_id', studentData.student_id);
                    if (!fallbackResetError) {
                        studentData = {
                            ...studentData,
                            course: null,
                            year_level: null,
                            status: 'Inactive',
                            course_year_confirmed_at: null,
                            course_year_update_required: false,
                            course_year_window_start: null,
                            course_year_window_end: null
                        };
                    }
                }
            }

            const course = studentData.course || '';

            let matchedDepartment = studentData.department || 'Unassigned';

            if (course) {
                try {
                    matchedDepartment = await fetchDepartmentNameForCourse(
                        supabaseClient,
                        course,
                        matchedDepartment
                    );
                } catch (courseLookupError) {
                    console.warn('Failed to refresh department from selected course.', courseLookupError);
                }
            }

            const motherParts = getStoredParentParts(studentData, 'mother');
            const fatherParts = getStoredParentParts(studentData, 'father');

            setPersonalInfo((prev: any) => ({
                ...prev,
                firstName: studentData.first_name || '',
                lastName: studentData.last_name || '',
                middleName: studentData.middle_name || '',
                suffix: studentData.suffix || '',
                studentId: studentData.student_id,
                course: course,
                year: studentData.year_level || '',
                status: studentData.status || 'Active',
                department: matchedDepartment,
                section: studentData.section || '',
                email: studentData.email || '',
                mobile: studentData.mobile || '',
                facebookUrl: studentData.facebook_url || '',
                address: buildStudentAddress(studentData),
                street: studentData.street || '',
                city: studentData.city || '',
                province: studentData.province || '',
                zipCode: studentData.zip_code || '',
                emergencyContact: getStudentEmergencyContact(studentData),
                dob: studentData.dob || '',
                age: studentData.age || '',
                placeOfBirth: studentData.place_of_birth || '',
                sex: getStudentSex(studentData),
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
                witnessedConflict: studentData.witnessed_conflict ? 'Yes' : 'No',
                isSoloParent: studentData.is_solo_parent || false,
                isChildOfSoloParent: studentData.is_child_of_solo_parent || false,
                religion: studentData.religion || '',
                isSafeInCommunity: studentData.is_safe_in_community ? 'Yes' : 'No',
                motherLastName: motherParts.last,
                motherGivenName: motherParts.given,
                motherMiddleName: motherParts.middle,
                motherOccupation: studentData.mother_occupation || '',
                motherContact: studentData.mother_contact || '',
                fatherLastName: fatherParts.last,
                fatherGivenName: fatherParts.given,
                fatherMiddleName: fatherParts.middle,
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
                courseYearWindowStart: studentData.course_year_window_start || null,
                courseYearWindowEnd: studentData.course_year_window_end || null,
            }));

            if (studentData.course_year_update_required) {
                const trustedCourse = course || '';
                const trustedYear = isValidYearLevel(studentData.year_level || '') ? studentData.year_level : '1st Year';

                const { data: courseRows } = await supabaseClient
                    .from('courses')
                    .select('name')
                    .order('name');
                const normalizedCourseOptions = [...new Set([trustedCourse, ...(courseRows || []).map((row: any) => row.name).filter(Boolean)].filter(Boolean))];

                const now = new Date();
                const windowStart = studentData.course_year_window_start || null;
                const windowEnd = studentData.course_year_window_end || null;
                const windowStartDate = windowStart ? new Date(windowStart) : null;
                const windowEndDate = windowEnd ? new Date(windowEnd) : null;
                const beforeWindow = Boolean(windowStartDate && now < windowStartDate);
                const expired = Boolean(windowEndDate && now > windowEndDate);

                setPersonalInfo((prev: any) => ({
                    ...prev,
                    course: trustedCourse || '',
                    year: trustedYear || '1st Year'
                }));

                // Only set the gate if it's not already visible (user may be mid-interaction)
                // and hasn't already been confirmed in this session
                if (!courseYearGateVisibleRef.current && !courseYearGateConfirmedRef.current) {
                    const shouldShow = !beforeWindow && !expired;
                    courseYearGateVisibleRef.current = shouldShow;
                    setCourseYearGate({
                        visible: shouldShow,
                        expired,
                        course: trustedCourse || '',
                        year: trustedYear || '1st Year',
                        courseLocked: false,
                        yearLocked: false,
                        courseOptions: normalizedCourseOptions,
                        windowStart,
                        windowEnd
                    });
                }
            } else {
                if (!courseYearGateVisibleRef.current) {
                    setCourseYearGate((prev: any) => ({
                        ...prev,
                        visible: false,
                        expired: false
                    }));
                }
            }

            syncStudentSession({
                ...studentData,
                department: matchedDepartment
            });

            const profileCompleted = studentData.profile_completed === true;
            if (!profileCompleted) {
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
                    sex: getStudentSex(studentData),
                    genderIdentity: studentData.gender_identity || '',
                    civilStatus: studentData.civil_status || '',
                    street: studentData.street || '',
                    city: studentData.city || '',
                    province: studentData.province || '',
                    zipCode: studentData.zip_code || '',
                    mobile: studentData.mobile || '',
                    email: studentData.email || '',
                    facebookUrl: studentData.facebook_url || '',
                    motherLastName: motherParts.last,
                    motherGivenName: motherParts.given,
                    motherMiddleName: motherParts.middle,
                    motherOccupation: studentData.mother_occupation || '',
                    motherContact: studentData.mother_contact || '',
                    fatherLastName: fatherParts.last,
                    fatherGivenName: fatherParts.given,
                    fatherMiddleName: fatherParts.middle,
                    fatherOccupation: studentData.father_occupation || '',
                    fatherContact: studentData.father_contact || '',
                }));
            }
            setShowProfileCompletion(!profileCompleted);
            setHasSeenTourState(Boolean(studentData.has_seen_tour));
        } catch (error) {
            console.error('Failed to refresh student profile.', error);
        }
    }, [session, syncStudentSession, getStoredParentParts]);

    // Sync session to personalInfo
    useEffect(() => {
        refreshStudentProfile();
    }, [refreshStudentProfile]);

    // Sequences the Tour to appear AFTER Profile Completion closes
    useEffect(() => {
        if (!loading && session && !showProfileCompletion && !hasSeenTourState) {
            setShowTour(true);
        }
    }, [loading, session, showProfileCompletion, hasSeenTourState]);

    // Save Profile Changes to Supabase
    const saveProfileChanges = async (nextPersonalInfo = personalInfo) => {
        setIsEditing(false);
        try {
            const { data: beforeProfile } = await supabaseClient
                .from('students')
                .select(STUDENT_LIST_COLUMNS)
                .eq('student_id', personalInfo.studentId)
                .maybeSingle();

            const updatePayload = {
                first_name: nextPersonalInfo.firstName || null,
                last_name: nextPersonalInfo.lastName || null,
                middle_name: nextPersonalInfo.middleName || null,
                suffix: nextPersonalInfo.suffix || null,
                place_of_birth: nextPersonalInfo.placeOfBirth || null,
                department: nextPersonalInfo.department || null,
                street: nextPersonalInfo.street || null,
                city: nextPersonalInfo.city || null,
                province: nextPersonalInfo.province || null,
                zip_code: nextPersonalInfo.zipCode || null,
                mobile: nextPersonalInfo.mobile || null,
                email: nextPersonalInfo.email || null,
                civil_status: nextPersonalInfo.civilStatus || null,
                facebook_url: nextPersonalInfo.facebookUrl || null,
                dob: nextPersonalInfo.dob || null,
                sex: nextPersonalInfo.sex || null,
                gender_identity: nextPersonalInfo.genderIdentity || null,
                nationality: nextPersonalInfo.nationality || null,
                school_last_attended: nextPersonalInfo.schoolLastAttended || null,
                is_working_student: Boolean(nextPersonalInfo.isWorkingStudent),
                working_student_type: nextPersonalInfo.workingStudentType || null,
                supporter: nextPersonalInfo.supporter || null,
                supporter_contact: nextPersonalInfo.supporterContact || null,
                is_pwd: Boolean(nextPersonalInfo.isPwd),
                pwd_type: nextPersonalInfo.pwdType || null,
                is_indigenous: Boolean(nextPersonalInfo.isIndigenous),
                indigenous_group: nextPersonalInfo.indigenousGroup || null,
                witnessed_conflict: Boolean(nextPersonalInfo.witnessedConflict),
                is_solo_parent: Boolean(nextPersonalInfo.isSoloParent),
                is_child_of_solo_parent: Boolean(nextPersonalInfo.isChildOfSoloParent),
                section: nextPersonalInfo.section || null,
                // New fields
                religion: nextPersonalInfo.religion || null,
                is_safe_in_community: Boolean(nextPersonalInfo.isSafeInCommunity),
                mother_name: joinNameParts({
                    given: nextPersonalInfo.motherGivenName,
                    middle: nextPersonalInfo.motherMiddleName,
                    last: nextPersonalInfo.motherLastName
                }) || null,
                mother_last_name: nextPersonalInfo.motherLastName || null,
                mother_given_name: nextPersonalInfo.motherGivenName || null,
                mother_middle_name: nextPersonalInfo.motherMiddleName || null,
                mother_occupation: nextPersonalInfo.motherOccupation || null,
                mother_contact: nextPersonalInfo.motherContact || null,
                father_name: joinNameParts({
                    given: nextPersonalInfo.fatherGivenName,
                    middle: nextPersonalInfo.fatherMiddleName,
                    last: nextPersonalInfo.fatherLastName
                }) || null,
                father_last_name: nextPersonalInfo.fatherLastName || null,
                father_given_name: nextPersonalInfo.fatherGivenName || null,
                father_middle_name: nextPersonalInfo.fatherMiddleName || null,
                father_occupation: nextPersonalInfo.fatherOccupation || null,
                father_contact: nextPersonalInfo.fatherContact || null,
                parent_address: nextPersonalInfo.parentAddress || null,
                num_brothers: nextPersonalInfo.numBrothers || null,
                num_sisters: nextPersonalInfo.numSisters || null,
                birth_order: nextPersonalInfo.birthOrder || null,
                spouse_name: nextPersonalInfo.spouseName || null,
                spouse_occupation: nextPersonalInfo.spouseOccupation || null,
                num_children: nextPersonalInfo.numChildren || null,
                guardian_name: nextPersonalInfo.guardianName || null,
                guardian_address: nextPersonalInfo.guardianAddress || null,
                guardian_contact: nextPersonalInfo.guardianContact || null,
                guardian_relation: nextPersonalInfo.guardianRelation || null,
                emergency_name: nextPersonalInfo.emergencyName || null,
                emergency_address: nextPersonalInfo.emergencyAddress || null,
                emergency_relationship: nextPersonalInfo.emergencyRelationship || null,
                emergency_number: nextPersonalInfo.emergencyNumber || null,
                elem_school: nextPersonalInfo.elemSchool || null,
                elem_year_graduated: nextPersonalInfo.elemYearGraduated || null,
                junior_high_school: nextPersonalInfo.juniorHighSchool || null,
                junior_high_year_graduated: nextPersonalInfo.juniorHighYearGraduated || null,
                senior_high_school: nextPersonalInfo.seniorHighSchool || null,
                senior_high_year_graduated: nextPersonalInfo.seniorHighYearGraduated || null,
                college_school: nextPersonalInfo.collegeSchool || null,
                college_year_graduated: nextPersonalInfo.collegeYearGraduated || null,
                honors_awards: nextPersonalInfo.honorsAwards || null,
                extracurricular_activities: nextPersonalInfo.extracurricularActivities || null,
                scholarships_availed: nextPersonalInfo.scholarshipsAvailed || null,
            };

            const { error } = await supabaseClient
                .from('students')
                .update(updatePayload)
                .eq('student_id', personalInfo.studentId);

            if (error) throw error;
            await logStudentProfileUpdate({
                action: 'Student Profile Updated',
                beforeProfile,
                afterPayload: updatePayload,
                fallbackName: `${nextPersonalInfo.firstName || ''} ${nextPersonalInfo.lastName || ''}`.trim(),
                fallbackStudentId: nextPersonalInfo.studentId
            });
            await refreshStudentProfile();
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
            await logStudentProfileUpdate({
                action: 'Student Profile Picture Updated',
                beforeProfile: { profile_picture_url: personalInfo.profile_picture_url || null },
                afterPayload: { profile_picture_url: publicUrl },
                fallbackName: `${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim(),
                fallbackStudentId: personalInfo.studentId
            });
            setPersonalInfo((prev: any) => ({ ...prev, profile_picture_url: publicUrl }));
            showToast("Profile picture updated!");
        } catch (err: any) {
            showToast("Failed to upload picture: " + err.message, 'error');
        }
    };

    // Fetch Events from Supabase (service-backed)
    useEffect(() => {
        refreshEvents();
    }, [activeView]);

    // Fetch All Active Forms (service-backed)
    useEffect(() => {
        if (activeView === 'assessment') {
            refreshForms();
        }
    }, [activeView, personalInfo.studentId]);

    // Fetch student lists + realtime subscriptions (service-backed)
    useEffect(() => {
        if (!personalInfo.studentId) return;

        if (activeView === 'counseling') {
            refreshCounselingRequests();
        }

        if (activeView === 'dashboard' || activeView === 'counseling') {
            refreshNotifications();
        }

        if (activeView === 'support') {
            refreshSupportRequests();
        }

        const counselingChannel = supabaseClient
            .channel('student_counseling')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `student_id=eq.${personalInfo.studentId}` }, () => {
                if (activeView === 'counseling') {
                    refreshCounselingRequests();
                }
            })
            .subscribe();

        const supportChannel = supabaseClient
            .channel('student_support')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'support_requests', filter: `student_id=eq.${personalInfo.studentId}` }, () => {
                refreshSupportRequests();
            })
            .subscribe();

        const notifChannel = supabaseClient
            .channel('student_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `student_id=eq.${personalInfo.studentId}` }, () => {
                refreshNotifications();
            })
            .subscribe();

        const eventsChannel = supabaseClient
            .channel('student_events')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshEvents)
            .subscribe();

        const attendanceChannel = supabaseClient
            .channel('student_attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance', filter: `student_id=eq.${personalInfo.studentId}` }, () => {
                fetchHistory();
            })
            .subscribe();

        const formsChannel = supabaseClient
            .channel('student_forms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'forms', filter: 'is_active=eq.true' }, refreshForms)
            .subscribe();

        const applicationsChannel = supabaseClient
            .channel('student_applications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'applications', filter: `student_id=eq.${personalInfo.studentId}` }, (payload: any) => {
                showToast(`Application Status Updated: ${payload.new.status}`, 'info');
            })
            .subscribe();

        const profileChannel = supabaseClient
            .channel('student_profile_update')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'students', filter: `student_id=eq.${personalInfo.studentId}` }, (payload: any) => {
                setPersonalInfo((prev: any) => ({ ...prev, ...payload.new }));
                showToast("Your profile has been updated by an administrator.", 'info');
            })
            .subscribe();

        return () => {
            const channels = [counselingChannel, supportChannel, notifChannel, eventsChannel, attendanceChannel, formsChannel, applicationsChannel, profileChannel];
            channels.forEach((ch: any) => {
                if (ch) supabaseClient.removeChannel(ch).catch(() => { });
            });
        };
    }, [activeView, personalInfo.studentId]);

    // Real-time subscription for counseling requests with toast
    useEffect(() => {
        if (!personalInfo.studentId) return;

        refreshCounselingRequests();

        const channel = supabaseClient.channel('student_counseling_updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests', filter: `student_id=eq.${personalInfo.studentId}` }, (payload: any) => {
                refreshCounselingRequests();
                if (payload.new.status !== payload.old.status) {
                    showToast(`Counseling Request Status Updated: ${payload.new.status}`, 'info');
                }
            })
            .subscribe();

        return () => { supabaseClient.removeChannel(channel); };
    }, [personalInfo.studentId]);

    // Fetch Active Office Visit (service-backed)
    useEffect(() => {
        refreshActiveVisit();
    }, [refreshActiveVisit]);

    // Fetch Visit Reasons (service-backed)
    useEffect(() => {
        refreshVisitReasons();
    }, [refreshVisitReasons]);

    const formatFullDate = (date: any) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const formatTime = (date: any) => date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    // Fetch Attendance and Rating History
    const fetchHistory = async () => {
        if (!personalInfo.studentId) return;

        const attendanceData = await getAttendanceHistory(personalInfo.studentId);

        if (attendanceData) {
            const map: Record<string, any> = {};
            attendanceData.forEach((r: any) => map[r.event_id] = r);
            setAttendanceMap(map);
        }

        const ratingData = await getRatedEventIds(personalInfo.studentId);

        setRatedEvents(ratingData || []);
    };

    // Fetch on load AND when switching views (to keep sync)
    useEffect(() => {
        fetchHistory();
    }, [personalInfo.studentId, activeView]);

    const syncEventAttendeeCount = async (eventId: any) => {
        const { count, error: countError } = await supabaseClient
            .from('event_attendance')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId);

        if (countError) throw countError;

        const attendeeCount = count || 0;
        const { error: updateError } = await supabaseClient
            .from('events')
            .update({ attendees: attendeeCount })
            .eq('id', eventId);

        if (updateError) throw updateError;

        setEventsList((prev: any) => prev.map((item: any) => (
            item.id === eventId
                ? { ...item, attendees: attendeeCount }
                : item
        )));
    };

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
                const { data: existingAttendance } = await supabaseClient
                    .from('event_attendance')
                    .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                    .eq('event_id', event.id)
                    .eq('student_id', personalInfo.studentId)
                    .maybeSingle();

                if (existingAttendance?.time_in) {
                    setAttendanceMap((prev: any) => ({ ...prev, [event.id]: existingAttendance }));
                    setProofFile(null);
                    showToast(existingAttendance.time_out
                        ? "Your attendance is already recorded for this event."
                        : "You have already timed in for this event.", 'error');
                    setIsTimingIn(false);
                    return;
                }

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

                try {
                    await syncEventAttendeeCount(event.id);
                } catch (countSyncError) {
                    console.warn('Failed to sync event attendee count after time in.', countSyncError);
                }

                setAttendanceMap((prev: any) => ({ ...prev, [event.id]: { event_id: event.id, time_in: now, time_out: null } }));
                setProofFile(null);
                showToast("Time In Successful! Location Verified.");
            } catch (err: any) {
                if (err.code === '23505') {
                    showToast("You have already timed in for this event.", 'error');
                    // Refresh attendance to sync state
                    const { data } = await supabaseClient
                        .from('event_attendance')
                        .select('id, event_id, student_id, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department')
                        .eq('event_id', event.id)
                        .eq('student_id', personalInfo.studentId)
                        .single();
                    if (data) setAttendanceMap((prev: any) => ({ ...prev, [event.id]: data }));
                } else {
                    console.error("Time In Error:", err);
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
                sex: personalInfo.sex || '',
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
        const { data: qs } = await supabaseClient
            .from('questions')
            .select('id, form_id, question_text, question_type, scale_min, scale_max, order_index')
            .eq('form_id', form.id)
            .order('order_index');
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
            const windowRange = getCourseYearWindowRange(
                personalInfo.courseYearWindowStart,
                personalInfo.courseYearWindowEnd
            );
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                course_year: `${personalInfo.course || ''} - ${personalInfo.year || ''}`,
                year_window_range: windowRange,
                contact_number: personalInfo.mobile || '',
                request_type: 'Self-Referral',
                description: counselingForm.reason_for_referral,
                reason_for_referral: counselingForm.reason_for_referral,
                personal_actions_taken: counselingForm.personal_actions_taken,
                date_duration_of_concern: counselingForm.date_duration_of_concern,
                department: personalInfo.department,
                status: 'Submitted'
            } as any;

            let { error } = await supabaseClient.from('counseling_requests').insert([payload]);
            if (error && String(error.message || '').toLowerCase().includes('year_window_range')) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.year_window_range;
                ({ error } = await supabaseClient.from('counseling_requests').insert([fallbackPayload]));
            }
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
            const windowRange = getCourseYearWindowRange(
                personalInfo.courseYearWindowStart,
                personalInfo.courseYearWindowEnd
            );
            // Upload multiple files (up to 4)
            const docUrls: string[] = [];
            if (supportForm.files && supportForm.files.length > 0) {
                for (const file of supportForm.files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${personalInfo.studentId}_support_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
                    const { error: uploadError } = await supabaseClient.storage.from('support_documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    const { data: publicUrlData } = supabaseClient.storage.from('support_documents').getPublicUrl(fileName);
                    docUrls.push(publicUrlData.publicUrl);
                }
            }
            const description = `[Q1 Description]: ${supportForm.q1}\n[Q2 Previous Support]: ${supportForm.q2}\n[Q3 Required Support]: ${supportForm.q3}\n[Q4 Other Needs]: ${supportForm.q4}`.trim();
            const finalCategories = [...supportForm.categories];
            if (supportForm.otherCategory) finalCategories.push(`Other: ${supportForm.otherCategory}`);
            const documentsValue = docUrls.length > 0 ? JSON.stringify(docUrls) : null;
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                department: personalInfo.department,
                support_type: finalCategories.join(', '),
                description: description,
                documents_url: documentsValue,
                course_year: `${personalInfo.course || ''} - ${personalInfo.year || ''}`,
                year_window_range: windowRange,
                status: 'Submitted'
            } as any;
            let { error } = await supabaseClient.from('support_requests').insert([payload]);
            if (error && String(error.message || '').toLowerCase().includes('year_window_range')) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.year_window_range;
                ({ error } = await supabaseClient.from('support_requests').insert([fallbackPayload]));
            }
            if (error && String(error.message || '').toLowerCase().includes('course_year')) {
                const fallbackPayload = { ...payload };
                delete fallbackPayload.course_year;
                delete fallbackPayload.year_window_range;
                ({ error } = await supabaseClient.from('support_requests').insert([fallbackPayload]));
            }
            if (error) throw error;
            showToast("Support Request Submitted!");
            setShowSupportModal(false);
            setSupportForm({ categories: [], otherCategory: '', q1: '', q2: '', q3: '', q4: '', files: [] });
            // Immediately refresh support requests list for live update
            await refreshSupportRequests();
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
        const visitReason = activeVisit.reason || '';
        await supabaseClient.from('office_visits').update({ time_out: new Date().toISOString(), status: 'Completed' }).eq('id', activeVisit.id);
        setActiveVisit(null);
        showToast("You have Timed Out. Thank you for visiting!");
        // Trigger feedback form with the visit reason pre-filled
        setTimeOutVisitReason(visitReason);
        setShowTimeOutFeedback(true);
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
                syncStudentSession({ has_seen_tour: true });
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
                <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-4 student-mobile-modal-overlay">
                    <div className="flex min-h-full items-start justify-center sm:items-center student-mobile-modal-shell">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] overflow-hidden flex flex-col student-mobile-modal-panel">
                        {/* Header */}
                        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-sky-50 p-4 text-center sm:p-6">
                            <h2 className="text-xl font-black text-slate-800 sm:text-2xl">Complete Your Profile</h2>
                            <p className="mt-1 text-sm text-slate-500">Please fill in the remaining information to complete your student profile.</p>
                            <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between gap-3">
                                    <div className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-600 shadow-sm sm:hidden">
                                        {PROFILE_STEP_LABELS[profileStep - 1]}
                                    </div>
                                    <div className="text-[11px] font-semibold text-slate-400 sm:hidden">
                                        Step {profileStep} of {PROFILE_TOTAL_STEPS}
                                    </div>
                                    <div className="hidden w-full justify-between px-1 text-[10px] font-bold text-slate-400 sm:flex">
                                        {PROFILE_STEP_LABELS.map((label, i) => (
                                            <span key={label} className={profileStep >= i + 1 ? 'text-indigo-600' : ''}>{label}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all duration-300" style={{ width: `${(profileStep / PROFILE_TOTAL_STEPS) * 100}%` }} />
                                </div>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

                            {/* STEP 1: PERSONAL INFO (NAT auto-filled + remaining) */}
                            {profileStep === 1 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Personal Information</h3><p className="text-sm leading-relaxed text-slate-400">Fields from your application are pre-filled. You may edit them.</p></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Last Name *</label><input name="lastName" value={profileFormData.lastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>First Name *</label><input name="firstName" value={profileFormData.firstName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Suffix</label><input name="suffix" value={profileFormData.suffix} onChange={handleProfileFormChange} placeholder="Jr., II" className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Middle Name</label><input name="middleName" value={profileFormData.middleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="street" value={profileFormData.street} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>City</label><input name="city" value={profileFormData.city} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Province</label><input name="province" value={profileFormData.province} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Zip</label><input name="zipCode" value={profileFormData.zipCode} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact *</label><input name="mobile" value={profileFormData.mobile} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Email *</label><input name="email" value={profileFormData.email} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birthday *</label><DatePicker required name="dob" value={profileFormData.dob} onChange={(val) => { setProfileFormData((prev: any) => { const age = val ? Math.floor((Date.now() - new Date(val + 'T00:00:00').getTime()) / 31557600000) : ''; return { ...prev, dob: val, age }; }); }} placeholder="Select birth date" className="[&>button]:min-h-[3rem] [&>button]:rounded-xl [&>button]:border-slate-200 [&>button]:bg-slate-50 [&>button]:px-4 [&>button]:py-3 [&>button]:text-[16px] sm:[&>button]:py-2.5 sm:[&>button]:text-sm" /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Age</label><input name="age" value={profileFormData.age} onChange={handleProfileFormChange} className={profileCompletionInputClass} readOnly /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Sex *</label><select name="sex" value={profileFormData.sex} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Gender</label><select name="genderIdentity" value={profileFormData.genderIdentity} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Cis-gender">Cis-gender</option><option value="Transgender">Transgender</option><option value="Non-binary">Non-binary</option><option value="Prefer not to say">Prefer not to say</option></select></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Civil Status</label><select name="civilStatus" value={profileFormData.civilStatus} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Single">Single</option><option value="Married">Married</option><option value="Separated Legally">Separated Legally</option><option value="Separated Physically">Separated Physically</option><option value="With Live-In Partner">With Live-In Partner</option><option value="Divorced">Divorced</option><option value="Widow/er">Widow/er</option></select></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Nationality</label><input name="nationality" value={profileFormData.nationality} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>FB Account Link</label><input name="facebookUrl" value={profileFormData.facebookUrl} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Place of Birth</label><input name="placeOfBirth" value={profileFormData.placeOfBirth} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Religion</label><input name="religion" value={profileFormData.religion} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>School Last Attended</label><input name="schoolLastAttended" value={profileFormData.schoolLastAttended} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Level</label><select name="yearLevelApplying" value={profileFormData.yearLevelApplying} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="1st Year">I</option><option value="2nd Year">II</option><option value="3rd Year">III</option><option value="4th Year">IV</option></select></div>
                                    </div>
                                    {/* Supporter */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Person who supported your studies aside from parents</label>
                                        <div className={profileCompletionCheckboxGridClass}>{['Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Partner', 'Scholarship Grants'].map(opt => (<label key={opt} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" value={opt} checked={(profileFormData.supporter || []).includes(opt)} onChange={e => handleProfileCheckboxGroup(e, 'supporter')} className="h-4 w-4 text-indigo-600" />{opt}</label>))}</div>
                                        <input name="supporterContact" placeholder="Supporter Contact Info" value={profileFormData.supporterContact} onChange={handleProfileFormChange} className={`${profileCompletionInputClass} mt-2`} />
                                    </div>
                                    {/* Working Student */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Are you a Working Student?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isWorkingStudent" value={o} checked={profileFormData.isWorkingStudent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isWorkingStudent === 'Yes' && <select name="workingStudentType" value={profileFormData.workingStudentType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select Type</option><option value="House help">House help</option><option value="Call Center Agent/BPO employee">Call Center Agent/BPO</option><option value="Fast food/Restaurant">Fast food/Restaurant</option><option value="Online employee/Freelancer">Online/Freelancer</option><option value="Self-employed">Self-employed</option></select>}
                                    </div>
                                    {/* PWD */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Are you a Person with a Disability (PWD)?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isPwd" value={o} checked={profileFormData.isPwd === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isPwd === 'Yes' && <select name="pwdType" value={profileFormData.pwdType} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Visual impairment">Visual</option><option value="Hearing impairment">Hearing</option><option value="Physical/Orthopedic disability">Physical/Orthopedic</option><option value="Chronic illness">Chronic illness</option><option value="Psychosocial disability">Psychosocial</option><option value="Communication disability">Communication</option></select>}
                                    </div>
                                    {/* Indigenous */}
                                    <div className="pt-3 border-t border-slate-100 space-y-2">
                                        <label className={`${profileCompletionLabelClass} block`}>Member of any Indigenous Group?</label>
                                        <div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isIndigenous" value={o} checked={profileFormData.isIndigenous === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div>
                                        {profileFormData.isIndigenous === 'Yes' && <select name="indigenousGroup" value={profileFormData.indigenousGroup} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Bukidnon">Bukidnon</option><option value="Tabihanon Group">Tabihanon</option><option value="ATA">ATA</option><option value="IFUGAO">IFUGAO</option><option value="Kalahing Kulot">Kalahing Kulot</option><option value="Lumad">Lumad</option></select>}
                                    </div>
                                    {/* Conflict & Solo Parent */}
                                    <div className="pt-3 border-t border-slate-100 space-y-3">
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Witnessed armed conflict in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="witnessedConflict" value={o} checked={profileFormData.witnessedConflict === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Feel safe in your community?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSafeInCommunity" value={o} checked={profileFormData.isSafeInCommunity === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Are you a Solo Parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isSoloParent" value={o} checked={profileFormData.isSoloParent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                        <div><label className={`${profileCompletionLabelClass} block mb-1.5`}>Son/daughter of a solo parent?</label><div className={profileCompletionRadioGroupClass}>{['Yes', 'No'].map(o => <label key={o} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="isChildOfSoloParent" value={o} checked={profileFormData.isChildOfSoloParent === o} onChange={handleProfileFormChange} className="h-4 w-4" /><span className="text-sm">{o}</span></label>)}</div></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: FAMILY BACKGROUND */}
                            {profileStep === 2 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Family Background</h3></div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Last Name</label><input name="motherLastName" placeholder="N/A if not applicable" value={profileFormData.motherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Given Name</label><input name="motherGivenName" placeholder="N/A if not applicable" value={profileFormData.motherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Middle Name</label><input name="motherMiddleName" placeholder="N/A if not applicable" value={profileFormData.motherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Occupation</label><input name="motherOccupation" placeholder="N/A" value={profileFormData.motherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Mother's Contact</label><input name="motherContact" placeholder="N/A" value={profileFormData.motherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Last Name</label><input name="fatherLastName" placeholder="N/A" value={profileFormData.fatherLastName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Given Name</label><input name="fatherGivenName" placeholder="N/A" value={profileFormData.fatherGivenName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Middle Name</label><input name="fatherMiddleName" placeholder="N/A" value={profileFormData.fatherMiddleName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Occupation</label><input name="fatherOccupation" placeholder="N/A" value={profileFormData.fatherOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Father's Contact</label><input name="fatherContact" placeholder="N/A" value={profileFormData.fatherContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Parent's Address</label><input name="parentAddress" placeholder="N/A" value={profileFormData.parentAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridThreeClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Brothers</label><input name="numBrothers" placeholder="N/A" value={profileFormData.numBrothers} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Sisters</label><input name="numSisters" placeholder="N/A" value={profileFormData.numSisters} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Birth Order</label><select name="birthOrder" value={profileFormData.birthOrder} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option>{['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Only child', 'Legally adopted', 'Simulated', 'Foster child'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100"><p className="text-xs text-slate-400 mb-2 italic">If married, fill the fields below. Type N/A if not applicable.</p>
                                        <div className={profileCompletionGridThreeClass}>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse Name</label><input name="spouseName" placeholder="N/A" value={profileFormData.spouseName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Spouse Occupation</label><input name="spouseOccupation" placeholder="N/A" value={profileFormData.spouseOccupation} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                            <div className="space-y-1.5"><label className={profileCompletionLabelClass}>No. of Children</label><input name="numChildren" placeholder="N/A" value={profileFormData.numChildren} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: GUARDIAN */}
                            {profileStep === 3 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Guardian</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name</label><input name="guardianName" value={profileFormData.guardianName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="guardianAddress" value={profileFormData.guardianAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact</label><input name="guardianContact" value={profileFormData.guardianContact} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relation</label><select name="guardianRelation" value={profileFormData.guardianRelation} onChange={handleProfileFormChange} className={profileCompletionInputClass}><option value="">Select</option><option value="Relative">Relative</option><option value="Not relative">Not relative</option><option value="Landlord">Landlord</option><option value="Landlady">Landlady</option></select></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 4: EMERGENCY CONTACT */}
                            {profileStep === 4 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Person to Contact (Emergency)</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Full Name</label><input name="emergencyName" value={profileFormData.emergencyName} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Address</label><input name="emergencyAddress" value={profileFormData.emergencyAddress} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Relationship</label><input name="emergencyRelationship" value={profileFormData.emergencyRelationship} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Contact Number</label><input name="emergencyNumber" value={profileFormData.emergencyNumber} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 5: EDUCATIONAL BACKGROUND */}
                            {profileStep === 5 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Educational Background</h3></div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Elementary</label><input name="elemSchool" value={profileFormData.elemSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="elemYearGraduated" value={profileFormData.elemYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Junior High School</label><input name="juniorHighSchool" value={profileFormData.juniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="juniorHighYearGraduated" value={profileFormData.juniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Senior High School</label><input name="seniorHighSchool" value={profileFormData.seniorHighSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated</label><input name="seniorHighYearGraduated" value={profileFormData.seniorHighYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className={profileCompletionGridTwoClass}>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>College</label><input name="collegeSchool" value={profileFormData.collegeSchool} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                        <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Year Graduated / Continuing</label><input name="collegeYearGraduated" value={profileFormData.collegeYearGraduated} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                    </div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Honor/Award Received</label><input name="honorsAwards" placeholder="N/A if not applicable" value={profileFormData.honorsAwards} onChange={handleProfileFormChange} className={profileCompletionInputClass} /></div>
                                </div>
                            )}

                            {/* STEP 6: EXTRA-CURRICULAR */}
                            {profileStep === 6 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Extra-Curricular Involvement</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Activities</label><textarea name="extracurricularActivities" placeholder="N/A if not applicable" value={profileFormData.extracurricularActivities} onChange={handleProfileFormChange} rows={5} className={profileCompletionTextareaClass} /></div>
                                </div>
                            )}

                            {/* STEP 7: SCHOLARSHIPS */}
                            {profileStep === 7 && (
                                <div className="space-y-4">
                                    <div className="mb-2"><h3 className="text-lg font-bold text-slate-800">Scholarships</h3></div>
                                    <div className="space-y-1.5"><label className={profileCompletionLabelClass}>Name of Scholarship Availed</label><textarea name="scholarshipsAvailed" placeholder="N/A if not applicable" value={profileFormData.scholarshipsAvailed} onChange={handleProfileFormChange} rows={5} className={profileCompletionTextareaClass} /></div>
                                </div>
                            )}

                            {/* STEP 8: FINISH */}
                            {profileStep === 8 && (
                                <div className="space-y-6 text-center">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto border-2 border-slate-200"><svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></div>
                                    <h3 className="text-xl font-bold text-slate-800 sm:text-2xl">Final Step</h3>
                                    <p className="text-slate-500 text-sm">Please agree to the data privacy terms to complete your profile.</p>
                                    <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-left sm:p-6">
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
                        <div className="rounded-b-[2rem] border-t border-slate-100 bg-slate-50 p-4 sm:p-5">
                            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                            {profileStep > 1 ? (
                                <button type="button" onClick={() => setProfileStep(p => p - 1)} className="w-full rounded-xl px-6 py-3 font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5">Back</button>
                            ) : (
                                <div className="hidden sm:block" />
                            )}
                            {profileStep < PROFILE_TOTAL_STEPS ? (
                                <button type="button" onClick={handleProfileNextStep} className="w-full rounded-xl bg-slate-900 px-8 py-3 font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5">Next Step</button>
                            ) : (
                                <button disabled={profileSaving || !profileFormData.agreedToPrivacy} onClick={handleProfileCompletion} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 px-8 py-3 font-bold text-white shadow-lg transition-all disabled:opacity-50 sm:w-auto sm:py-2.5">{profileSaving ? 'Saving...' : 'Complete Profile'}</button>
                            )}
                            </div>
                        </div>
                    </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Forced Course/Year Confirmation Gate */}
            {courseYearGate.visible && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 student-mobile-modal-overlay">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 student-mobile-modal-panel student-mobile-modal-scroll-panel">
                        <h3 className="text-lg font-extrabold text-slate-900">Course and Year Confirmation Required</h3>
                        <p className="text-sm text-slate-600 mt-2">
                            Please confirm your course and year level for the current enrollment cycle before continuing.
                        </p>
                        {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd) && (
                            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                <span>School Year: {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd)}</span>
                            </div>
                        )}

                        <div className="mt-4 space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Course</label>
                                {courseYearGate.courseLocked ? (
                                    <input
                                        readOnly
                                        value={courseYearGate.course}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                    />
                                ) : (
                                    <select
                                        value={courseYearGate.course}
                                        onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, course: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                    >
                                        <option value="">Select course</option>
                                        {(courseYearGate.courseOptions || []).map((courseName: string) => (
                                            <option key={courseName} value={courseName}>{courseName}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Year Level</label>
                                {courseYearGate.yearLocked ? (
                                    <input
                                        readOnly
                                        value={courseYearGate.year}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                    />
                                ) : (
                                    <select
                                        value={courseYearGate.year}
                                        onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, year: e.target.value }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                    >
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>

                        {courseYearGate.expired && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                The update window has ended. Contact CARE staff to reopen your confirmation window.
                            </div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={handleLogout}
                                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700"
                            >
                                Logout
                            </button>
                            {!courseYearGate.expired && (
                                <button
                                    type="button"
                                    onClick={submitCourseYearConfirmation}
                                    disabled={isSubmittingCourseYearGate}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isSubmittingCourseYearGate ? 'Saving...' : 'Confirm'}
                                </button>
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
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"><Icons.Logout /> Logout</button>
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
                        <NotificationBell notifications={notifications} accentColor="blue" />
                    </div>
                </header>

                <div
                    key={activeView}
                    className={`flex-1 overflow-y-auto p-6 lg:p-10 ${activeView === 'profile' ? '' : 'page-transition'}`}
                    style={activeView === 'profile' ? { transform: 'none' } : undefined}
                >


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
                            showTimeInModal={showTimeInModal}
                            setShowTimeInModal={setShowTimeInModal}
                            visitReasons={visitReasons}
                            selectedReason={selectedReason}
                            setSelectedReason={setSelectedReason}
                            submitTimeIn={submitTimeIn}
                            showTimeOutFeedback={showTimeOutFeedback}
                            setShowTimeOutFeedback={setShowTimeOutFeedback}
                            timeOutVisitReason={timeOutVisitReason}
                            showToast={showToast}
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
                    {renderRemainingViews({ activeView, activeForm, loadingForm, formQuestions, formsList, assessmentForm, handleInventoryChange, submitAssessment, openAssessmentForm, showAssessmentModal, setShowAssessmentModal, showSuccessModal, setShowSuccessModal, isSubmitting, showCounselingForm, setShowCounselingForm, counselingForm, setCounselingForm, submitCounselingRequest, counselingRequests, openRequestModal, selectedRequest, setSelectedRequest, selectedSupportRequest, setSelectedSupportRequest, formatFullDate, sessionFeedback, setSessionFeedback, submitSessionFeedback, Icons, supportRequests, showSupportModal, setShowSupportModal, showCounselingRequestsModal, setShowCounselingRequestsModal, showSupportRequestsModal, setShowSupportRequestsModal, supportForm, setSupportForm, personalInfo, submitSupportRequest, showScholarshipModal, setShowScholarshipModal, selectedScholarship, setSelectedScholarship, feedbackType, setFeedbackType, rating, setRating, profileTab, setProfileTab, isEditing, setIsEditing, setPersonalInfo, saveProfileChanges, attendanceMap, showMoreProfile, setShowMoreProfile, showCommandHub, setShowCommandHub, completedForms, scholarshipsList, myApplications, handleApplyScholarship, uploadProfilePicture, setActiveView, feedbackPrefill, setFeedbackPrefill })}
                </div>

                {/* FAB TRIGGER FOR COMMAND HUB */}
                <button
                    onClick={() => setShowCommandHub(true)}
                    className={`fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-xl shadow-blue-500/40 hover:shadow-2xl hover:shadow-blue-500/60 hover:scale-110 transition-all duration-300 flex items-center justify-center group ${showCommandHub ? 'hidden' : 'animate-float'}`}
                >
                    <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                </button>

                {/* STUDENT COMMAND HUB */}
                {showCommandHub && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-backdrop student-mobile-modal-overlay" onClick={() => setShowCommandHub(false)}>
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in border border-white/20 student-mobile-modal-panel student-mobile-modal-scroll-panel" onClick={(e: any) => e.stopPropagation()}>
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
            </main>

            {/* GLOBAL TOAST NOTIFICATION */}
            {toast && createPortal(
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] px-6 py-3.5 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 animate-fade-in-up transition-all ${toast.type === 'error'
                    ? 'bg-red-600 text-white shadow-red-500/30'
                    : toast.type === 'info'
                        ? 'bg-blue-600 text-white shadow-blue-500/30'
                        : 'bg-emerald-600 text-white shadow-emerald-500/30'
                    }`}>
                    {toast.type === 'error' ? (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                    ) : toast.type === 'info' ? (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    ) : (
                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                    )}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-2 text-white/70 hover:text-white transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
}

