import React, { Suspense, lazy, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useNavigate } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { previewTransactionalEmailNotification, sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { useDeptData } from '../hooks/dept/useDeptData';
import { getDepartmentApplicationsPage, getDepartmentInterviewQueue } from '../services/deptService';
import { exportPDF, exportToExcel } from '../utils/dashboardUtils';
import {
    COUNSELING_STATUS,
    SUPPORT_STATUS,
    isCounselingAwaitingDept,
    isWithCareStaffCounseling
} from '../utils/workflow';
import DeptHomePage from './dept/DeptHomePage';
import DeptCounselingQueuePage from './dept/DeptCounselingQueuePage';
import DeptSupportApprovalsPage from './dept/DeptSupportApprovalsPage';
import DeptEventsPage from './dept/DeptEventsPage';
import DeptStudentsPage from './dept/DeptStudentsPage';
import DeptCounseledPage from './dept/DeptCounseledPage';
import DeptSettingsPage from './dept/DeptSettingsPage';
import DeptAdmissionsPage from './dept/DeptAdmissionsPage';
import DeptInterviewQueuePage from './dept/DeptInterviewQueuePage';
import StaffCalendarPage from './shared/StaffCalendarPage';
import StaffExportCenterPage from './shared/StaffExportCenterPage';
import NorsuBrand from '../components/NorsuBrand';
import { renderDeptModals } from './dept/modals/DeptModals';
import {
    LayoutDashboard, CalendarDays, HeartHandshake, Settings, Users, ClipboardList,
    LogOut, UserCircle, Menu, FileText, CheckCircle, XCircle, Info,
    UserPlus, BarChart3, AlertCircle, User, MapPin, GraduationCap, Bell, Download, RefreshCw
} from 'lucide-react';
const DeptReportsPage = lazy(() => import('./dept/DeptReportsPage'));
const READY_FOR_INTERVIEW_STATUSES = [
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview'
];

// ─── Live Clock Hook ───
export default function DeptDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, updateSession, logout } = useAuth() as any;
    const [activeModule, setActiveModule] = useState<string>('dashboard');
    const {
        data, setData, eventsList, counselingRequests, setCounselingRequests,
        supportRequests, setSupportRequests, admissionApplicants,
        lastSeenSupportCount, setLastSeenSupportCount, toast, setToast, refreshAllData, showToastMessage,
        admissionsState,
        counselingState
    } = useDeptData(session, isAuthenticated);
    const [isRefreshingData, setIsRefreshingData] = useState(false);

    const getApplicantFullName = (application: any) =>
        [application?.first_name, application?.last_name]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .join(' ')
        || 'Applicant';

    const getCourseNameForChoice = (application: any, choice?: number) => {
        const currentChoice = Number(choice || application?.current_choice || 1);
        if (currentChoice === 2) return String(application?.alt_course_1 || '').trim() || null;
        if (currentChoice === 3) return String(application?.alt_course_2 || '').trim() || null;
        return String(application?.priority_course || '').trim() || null;
    };

    const getChoiceLabel = (choice: number) => {
        if (choice === 2) return '2nd Choice';
        if (choice === 3) return '3rd Choice';
        return '1st Choice';
    };

    const shouldKeepAdmissionRow = (nextStatus: string, application: any, nextChoice?: number) => {
        const normalizedStatus = String(nextStatus || '').trim();
        if (normalizedStatus === 'Interview Scheduled') return true;
        if (normalizedStatus === 'Approved for Enrollment') return false;
        if (normalizedStatus === 'Application Unsuccessful') return false;
        if (!normalizedStatus.includes('Forwarded to')) return true;

        const routedChoice = Number(nextChoice || application?.current_choice || 1);
        const routedCourse = getCourseNameForChoice(application, routedChoice);
        const normalizedCourse = String(routedCourse || '').trim().toLowerCase();
        const routedDepartment = data?.courseMap?.[normalizedCourse];

        if (!routedCourse || !routedDepartment) {
            return true;
        }

        return String(routedDepartment || '').trim() === String(data?.profile?.department || '').trim();
    };

    const patchAdmissionRows = useCallback((updater: (rows: any[]) => any[]) => {
        admissionsState.setRows((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [admissionsState]);

    const patchCounselingRows = useCallback((updater: (rows: any[]) => any[]) => {
        setCounselingRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setCounselingRequests]);

    const patchSupportRows = useCallback((updater: (rows: any[]) => any[]) => {
        setSupportRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setSupportRequests]);

    const invokeManagedAdmissionsFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-department-admissions', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to manage department admissions.'
        });
    }, []);

    const sendAdmissionsEmailNotification = useCallback(async (payload: any) => {
        return sendTransactionalEmailNotification(payload, 'Failed to send applicant email.');
    }, []);

    const invokeManagedDepartmentServicesFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-department-services', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to manage department services.'
        });
    }, []);

    const syncStaffSession = useCallback((patch: Record<string, unknown>) => {
        updateSession?.((prev: any) => ({
            ...(prev || {}),
            ...(patch || {}),
            user: {
                ...(prev?.user || {}),
                ...((patch as any)?.user || {})
            }
        }));
    }, [updateSession]);

    const requestStaffSecurityOtp = useCallback(async (
        purpose: 'password_change' | 'email_change',
        nextEmailValue?: string
    ) => {
        return invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'request-security-otp',
                purpose,
                email: purpose === 'email_change'
                    ? String(nextEmailValue || '').trim().toLowerCase()
                    : undefined
            },
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to send the security OTP.'
        });
    }, []);

    const confirmStaffSecurityEmailChange = useCallback(async (nextEmailValue: string, otp: string) => {
        const normalizedEmail = String(nextEmailValue || '').trim().toLowerCase();
        if (!normalizedEmail) {
            throw new Error('Email is required.');
        }

        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'confirm-email-change',
                email: normalizedEmail,
                otp: String(otp || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your department login email.'
        });

        syncStaffSession({
            email: normalizedEmail,
            auth_email: normalizedEmail,
            user: {
                ...(session?.user || {}),
                email: normalizedEmail
            }
        });
        setData((prev: any) => ({
            ...prev,
            profile: {
                ...(prev?.profile || {}),
                email: normalizedEmail
            }
        }));
    }, [session?.user, setData, syncStaffSession]);

    const confirmStaffPasswordChange = useCallback(async (nextPasswordValue: string, otp: string) => {
        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'confirm-password-change',
                password: String(nextPasswordValue || ''),
                otp: String(otp || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your department password.'
        });
    }, []);

    const updateStaffProfileName = useCallback(async (nextNameValue: string) => {
        const normalizedName = String(nextNameValue || '').trim().replace(/\s+/g, ' ');
        if (normalizedName.length < 2) {
            throw new Error('A valid profile name is required.');
        }

        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'update-self-profile',
                payload: {
                    full_name: normalizedName
                }
            },
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your department profile.'
        });

        syncStaffSession({
            full_name: normalizedName
        });
        setData((prev: any) => ({
            ...prev,
            profile: {
                ...(prev?.profile || {}),
                name: normalizedName
            }
        }));
    }, [setData, syncStaffSession]);

    const queueProcessEmailNotification = useCallback((payload: any, context: string) => {
        void sendTransactionalEmailNotification(payload).then((emailResult) => {
            if (emailResult.emailSent === false) {
                showToastMessage(`${context} Email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
            }
        });
    }, [showToastMessage]);

    // Modals
    const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
    const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<any>(null);
    const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [showSupportModal, setShowSupportModal] = useState<boolean>(false);
    const [showDecisionModal, setShowDecisionModal] = useState<boolean>(false);
    const [decisionData, setDecisionData] = useState<any>({ id: null, type: '', notes: '' });
    const [selectedSupportRequest, setSelectedSupportRequest] = useState<any>(null);
    // Support Approval modals
    const [showApproveScheduleModal, setShowApproveScheduleModal] = useState<boolean>(false);
    const [approveScheduleData, setApproveScheduleData] = useState<any>({ id: null, student_id: null, date: '', time: '', notes: '' });
    const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
    const [resolveData, setResolveData] = useState<any>({ id: null, student_id: null, notes: '' });
    const [showReferCareModal, setShowReferCareModal] = useState<boolean>(false);
    const [referCareForm, setReferCareForm] = useState<any>({ id: null, student_id: null, student_name: '', date_acted: '', actions_taken: '', comments: '' });
    const sigCanvasRefSupport = useRef<any>(null);

    // Events State
    const [showEventAttendees, setShowEventAttendees] = useState<any>(null);
    const [deptAttendees, setDeptAttendees] = useState<any[]>([]);
    const [yearLevelFilter, setYearLevelFilter] = useState<string>('All');
    const [showApplicantScheduleModal, setShowApplicantScheduleModal] = useState<boolean>(false);
    const [applicantScheduleMode, setApplicantScheduleMode] = useState<'schedule' | 'reschedule'>('schedule');
    const [applicantScheduleData, setApplicantScheduleData] = useState<any>({ date: '', time: '', venue: '', panel: '', notes: '' });
    const [isSchedulingApplicant, setIsSchedulingApplicant] = useState(false);
    const [isProcessingBulkApplicantAction, setIsProcessingBulkApplicantAction] = useState(false);
    const [isLoadingEmailPreview, setIsLoadingEmailPreview] = useState(false);
    const [isConfirmingEmailPreview, setIsConfirmingEmailPreview] = useState(false);
    const [emailPreviewState, setEmailPreviewState] = useState<any>(null);
    const [pendingApplicantActionId, setPendingApplicantActionId] = useState<string | null>(null);
    const [selectedApplicants, setSelectedApplicants] = useState<any[]>([]);
    const [interviewQueueDate, setInterviewQueueDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
    const [interviewQueueRows, setInterviewQueueRows] = useState<any[]>([]);
    const [isInterviewQueueLoading, setIsInterviewQueueLoading] = useState(false);
    const [interviewQueueError, setInterviewQueueError] = useState<string | null>(null);
    const [admissionsDashboardCounts, setAdmissionsDashboardCounts] = useState({
        readyForInterview: 0,
        scheduled: 0,
        approved: 0,
        unsuccessful: 0
    });
    const [viewFormRecord, setViewFormRecord] = useState<any>(null);
    const [viewFormMode, setViewFormMode] = useState<string>('student');

    // Counseling Queue State
    const [counselingTab, setCounselingTab] = useState<string>(COUNSELING_STATUS.SUBMITTED);
    const [selectedCounselingReq, setSelectedCounselingReq] = useState<any>(null);
    const [showCounselingViewModal, setShowCounselingViewModal] = useState<boolean>(false);
    const [deptFormModalView, setDeptFormModalView] = useState<string>('referral');
    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [scheduleData, setScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
    const [rejectNotes, setRejectNotes] = useState<string>('');
    const [forwardingToStaff, setForwardingToStaff] = useState<boolean>(false);
    const [isSubmittingCounselingSchedule, setIsSubmittingCounselingSchedule] = useState(false);
    const [isSubmittingCounselingReject, setIsSubmittingCounselingReject] = useState(false);
    const [pendingCounselingCompletionId, setPendingCounselingCompletionId] = useState<string | null>(null);
    const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
    const [referralSearchQuery, setReferralSearchQuery] = useState<string>('');

    // Filters & Inputs
    const [studentSearch, setStudentSearch] = useState<string>('');
    const [counseledSearch, setCounseledSearch] = useState<string>('');
    const [counseledDate, setCounseledDate] = useState<string>('');
    const [newReason, setNewReason] = useState<string>('');
    // Cascading Filters (Course → Year → Section)
    const [deptCourseFilter, setDeptCourseFilter] = useState<string>('All');
    const [deptYearFilter, setDeptYearFilter] = useState<string>('All');
    const [deptSectionFilter, setDeptSectionFilter] = useState<string>('All');

    // Forms
    const [profileForm, setProfileForm] = useState<any>({});
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [referralForm, setReferralForm] = useState<any>({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
    const sigCanvasRef = useRef<any>(null);
    const [isSubmittingSupportSchedule, setIsSubmittingSupportSchedule] = useState(false);
    const [pendingSupportRejectId, setPendingSupportRejectId] = useState<string | null>(null);
    const [isSubmittingSupportResolve, setIsSubmittingSupportResolve] = useState(false);
    const [isSubmittingSupportRefer, setIsSubmittingSupportRefer] = useState(false);

    // Mark support requests as seen
    useEffect(() => {
        if (activeModule === 'support_approvals') {
            setLastSeenSupportCount(supportRequests.length);
        }
    }, [activeModule, supportRequests]);

    // Derive notifications from counseling + support request activity
    const deptNotifications = useMemo(() => {
        const items: Array<{ id: string | number; message: string; created_at: string | null }> = [];
        (counselingRequests || []).forEach((r: any) => {
            items.push({
                id: `cr-${r.id}`,
                message: `Counseling request from ${r.student_name || 'a student'} \u2014 ${r.status}`,
                created_at: r.created_at || null,
            });
        });
        (supportRequests || []).forEach((r: any) => {
            items.push({
                id: `sr-${r.id}`,
                message: `Support request: ${r.support_type || r.type || r.request_type || 'General'} from ${r.student_name || 'a student'} \u2014 ${r.status}`,
                created_at: r.created_at || null,
            });
        });
        return items.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, 30);
    }, [counselingRequests, supportRequests]);

    const refreshInterviewQueue = useCallback(async () => {
        const departmentName = String(data?.profile?.department || '').trim();
        if (!departmentName) return;

        setIsInterviewQueueLoading(true);
        setInterviewQueueError(null);
        try {
            const rows = await getDepartmentInterviewQueue(departmentName, interviewQueueDate);
            setInterviewQueueRows(rows);
        } catch (error: any) {
            setInterviewQueueError(error?.message || 'Failed to load interview queue.');
        } finally {
            setIsInterviewQueueLoading(false);
        }
    }, [data?.profile?.department, interviewQueueDate]);

    const refreshAdmissionsDashboardCounts = useCallback(async () => {
        const departmentName = String(data?.profile?.department || '').trim();
        if (!departmentName) return;

        try {
            const [
                readyResult,
                scheduledResult,
                approvedResult,
                unsuccessfulResult
            ] = await Promise.all([
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: READY_FOR_INTERVIEW_STATUSES },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Interview Scheduled'] },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Approved for Enrollment'] },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Application Unsuccessful'] },
                    { page: 1, pageSize: 1 }
                )
            ]);

            setAdmissionsDashboardCounts({
                readyForInterview: Number(readyResult?.total || 0),
                scheduled: Number(scheduledResult?.total || 0),
                approved: Number(approvedResult?.total || 0),
                unsuccessful: Number(unsuccessfulResult?.total || 0)
            });
        } catch (error) {
            console.error('Failed to load department admissions dashboard counts:', error);
        }
    }, [READY_FOR_INTERVIEW_STATUSES, data?.profile?.department]);

    useEffect(() => {
        if (activeModule !== 'interview_queue' || !data?.profile?.department) return;
        void refreshInterviewQueue();
    }, [activeModule, data?.profile?.department, refreshInterviewQueue]);

    useEffect(() => {
        if (!data?.profile?.department) return;
        void refreshAdmissionsDashboardCounts();
    }, [data?.profile?.department, refreshAdmissionsDashboardCounts]);

    const matchesInterviewQueueDate = (value: unknown) => {
        const text = String(value || '').trim();
        return Boolean(text && String(interviewQueueDate || '').trim() && text.startsWith(interviewQueueDate));
    };

    const shouldRefreshInterviewQueueForDateChange = (previousValue: unknown, nextValue: unknown) =>
        matchesInterviewQueueDate(previousValue) || matchesInterviewQueueDate(nextValue);

    const parseInterviewDateTime = (value: unknown) => {
        const text = String(value || '').trim();
        if (!text) {
            return { date: '', time: '' };
        }

        const [datePart, ...timeParts] = text.split(' ');
        return {
            date: datePart || '',
            time: timeParts.join(' ').trim()
        };
    };

    const getFilteredData = () => {
        const dept = String(data?.profile?.department || '').trim();
        const students = Array.isArray(data?.students) ? data.students : [];
        const filteredStudents = students.filter((s: any) =>
            s.department === dept
            && Boolean(s.course)
            && Boolean(s.year)
        );

        const activeStudents = filteredStudents.filter((s: any) => s.status === 'Active');
        const populationByYear = {
            '1st Year': activeStudents.filter((s: any) => s.year === '1st Year').length,
            '2nd Year': activeStudents.filter((s: any) => s.year === '2nd Year').length,
            '3rd Year': activeStudents.filter((s: any) => s.year === '3rd Year').length,
            '4th Year': activeStudents.filter((s: any) => s.year === '4th Year').length,
        };

        return {
            ...(data || {}),
            students: filteredStudents,
            requests: Array.isArray(counselingRequests) ? counselingRequests : [],
            populationStats: populationByYear
        };
    };

    const filteredData = getFilteredData();
    const departmentAlertItems = [
        {
            key: 'admissions-ready',
            label: 'Admissions ready for interview scheduling',
            count: admissionApplicants.filter((app: any) => READY_FOR_INTERVIEW_STATUSES.includes(String(app?.status || '').trim())).length,
            module: 'admissions',
            tone: 'border-blue-200 bg-blue-50 text-blue-700'
        },
        {
            key: 'admissions-absent',
            label: 'Applicants marked absent',
            count: admissionApplicants.filter((app: any) =>
                String(app?.status || '').trim() === 'Interview Scheduled'
                && String(app?.interview_queue_status || '').trim() === 'Absent'
            ).length,
            module: 'admissions',
            tone: 'border-amber-200 bg-amber-50 text-amber-700'
        },
        {
            key: 'counseling-review',
            label: 'Counseling awaiting department review',
            count: counselingRequests.filter((request: any) => isCounselingAwaitingDept(request?.status)).length,
            module: 'counseling_queue',
            tone: 'border-emerald-200 bg-emerald-50 text-emerald-700'
        },
        {
            key: 'support-forwarded',
            label: 'Additional support cases forwarded to the department',
            count: supportRequests.filter((request: any) => String(request?.status || '').trim() === SUPPORT_STATUS.FORWARDED_TO_DEPT).length,
            module: 'support_approvals',
            tone: 'border-purple-200 bg-purple-50 text-purple-700'
        }
    ];

    // Derived cascading filter options — pull ALL courses belonging to this college from courseMap
    const dept = String(data?.profile?.department || '').trim();
    const deptCourses = data?.courseMap
        ? [...new Set(Object.entries(data.courseMap).filter(([_, d]) => d === dept).map(([courseName]) => courseName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')))].sort()
        : [...new Set(filteredData.students.map((s: any) => s.course).filter(Boolean))].sort();


    // Helper: check if a student matches the current cascade filters
    const matchesCascadeFilters = (student: any) => {
        if (!student) return true;
        if (deptCourseFilter !== 'All' && student.course?.toLowerCase() !== deptCourseFilter.toLowerCase()) return false;
        if (deptYearFilter !== 'All' && student.year !== deptYearFilter) return false;
        if (deptSectionFilter !== 'All' && student.section !== deptSectionFilter) return false;
        return true;
    };

    // Helper: lookup student for a request by student_id
    const getStudentForRequest = (req: any) =>
        filteredData.students.find((s: any) =>
            String(s.student_id || s.id || '') === String(req.student_id || '')
        );

    // Filter bar rendered as a JSX element (NOT a component function) to prevent unmount/remount on re-render
    const cascadeFilterBar = (
        <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm font-medium text-gray-500">Filter:</label>
            <select value={deptCourseFilter} onChange={(e) => { setDeptCourseFilter(e.target.value); setDeptYearFilter('All'); setDeptSectionFilter('All'); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-700 max-w-[200px]">
                <option value="All">All Courses</option>
                {deptCourses.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={deptYearFilter} onChange={(e) => { setDeptYearFilter(e.target.value); setDeptSectionFilter('All'); }} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-700 max-w-[140px]">
                <option value="All">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
            </select>
            <select value={deptSectionFilter} onChange={(e) => setDeptSectionFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 bg-white text-gray-700 max-w-[120px]">
                <option value="All">All Sections</option>
                <option value="A">Sec A</option>
                <option value="B">Sec B</option>
                <option value="C">Sec C</option>
                <option value="D">Sec D</option>
                <option value="E">Sec E</option>
            </select>
            {(deptCourseFilter !== 'All' || deptYearFilter !== 'All' || deptSectionFilter !== 'All') && (
                <button onClick={() => { setDeptCourseFilter('All'); setDeptYearFilter('All'); setDeptSectionFilter('All'); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">Reset</button>
            )}
        </div>
    );

    // Chart Data Preparation
    const awaitingReview = filteredData.requests.filter((r: any) => isCounselingAwaitingDept(r.status)).length;
    const deptScheduled = filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.SCHEDULED).length;
    const withCareStaff = filteredData.requests.filter((r: any) => isWithCareStaffCounseling(r.status)).length;
    const completed = filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.COMPLETED).length;
    const rejected = filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.REJECTED).length;

    const chartData = {
        labels: ['Awaiting Review', 'Dept Scheduled', 'With CARE Staff', 'Completed', 'Rejected'],
        datasets: [{
            label: 'Requests',
            data: [awaitingReview, deptScheduled, withCareStaff, completed, rejected],
            backgroundColor: ['rgba(234, 179, 8, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
            borderColor: ['rgb(234, 179, 8)', 'rgb(59, 130, 246)', 'rgb(168, 85, 247)', 'rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
            borderWidth: 1
        }]
    };

    // ─── Counseling Queue Actions ───
    const handleApproveAndSchedule = async (e: any) => {
        e.preventDefault();
        if (!selectedCounselingReq || isSubmittingCounselingSchedule) return;
        setIsSubmittingCounselingSchedule(true);
        try {
            const scheduledDate = `${scheduleData.date} ${scheduleData.time}`;
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'schedule-counseling',
                requestId: selectedCounselingReq.id,
                date: scheduleData.date,
                time: scheduleData.time,
                notes: scheduleData.notes
            });
            patchCounselingRows((rows) => rows.map((row: any) => (
                String(row.id) === String(selectedCounselingReq.id)
                    ? {
                        ...row,
                        status: COUNSELING_STATUS.SCHEDULED,
                        scheduled_date: scheduledDate,
                        resolution_notes: scheduleData.notes || null
                    }
                    : row
            )));
            showToastMessage('Request approved and session scheduled.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request approved and session scheduled.');
            setShowScheduleModal(false);
            setShowCounselingViewModal(false);
            setScheduleData({ date: '', time: '', notes: '' });
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingCounselingSchedule(false);
        }
    };

    const handleRejectRequest = async () => {
        if (!selectedCounselingReq || isSubmittingCounselingReject) return;
        setIsSubmittingCounselingReject(true);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'reject-counseling',
                requestId: selectedCounselingReq.id,
                notes: rejectNotes
            });
            patchCounselingRows((rows) => rows.map((row: any) => (
                String(row.id) === String(selectedCounselingReq.id)
                    ? {
                        ...row,
                        status: COUNSELING_STATUS.REJECTED,
                        resolution_notes: rejectNotes || null
                    }
                    : row
            )));
            showToastMessage('Request rejected.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request rejected.');
            setShowRejectModal(false);
            setShowCounselingViewModal(false);
            setRejectNotes('');
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingCounselingReject(false);
        }
    };

    const handleCompleteRequest = async (req: any) => {
        const nextRequestId = String(req?.id || '').trim();
        if (!nextRequestId || pendingCounselingCompletionId === nextRequestId) return;
        setPendingCounselingCompletionId(nextRequestId);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'complete-counseling',
                requestId: nextRequestId
            });
            patchCounselingRows((rows) => rows.map((row: any) => (
                String(row.id) === nextRequestId
                    ? { ...row, status: COUNSELING_STATUS.COMPLETED }
                    : row
            )));
            showToastMessage('Request marked as completed.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request marked as completed.');
            setShowCounselingViewModal(false);
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setPendingCounselingCompletionId(null);
        }
    };

    const handleStartForward = (req: any) => {
        setForwardingToStaff(true);
        setSelectedCounselingReq(req);
        setShowCounselingViewModal(false);
        setReferralForm({
            student: req.student_name,
            type: req.request_type || 'Self-Referral',
            notes: req.reason_for_referral || req.description || '',
            referrer_contact_number: '',
            relationship_with_student: 'Dean',
            reason_for_referral: req.reason_for_referral || req.description || '',
            actions_made: `Scheduled a meeting with the student. Issue was not fully resolved at department level.`,
            date_duration_of_observations: req.date_duration_of_concern || ''
        });
        setShowReferralModal(true);
    };

    // Legacy function kept for backwards compatibility
    const updateRequestStatus = async (req: any, status: any) => {
        if (status === 'Approved') {
            setSelectedCounselingReq(req);
            setShowScheduleModal(true);
        } else {
            setSelectedCounselingReq(req);
            setShowRejectModal(true);
        }
    };

    const deleteRequest = async (id: any) => {
        void id;
        showToastMessage('Direct counseling deletion is no longer supported from this page.', 'error');
    };

    const closeEmailPreviewModal = useCallback(() => {
        setEmailPreviewState(null);
        setIsLoadingEmailPreview(false);
        setIsConfirmingEmailPreview(false);
    }, []);

    const previewAdmissionsEmails = useCallback(async (payloads: any[]) => {
        return Promise.all((Array.isArray(payloads) ? payloads : []).map(async (payload: any) => {
            const normalizedEmail = String(payload?.email || '').trim().toLowerCase();
            if (!normalizedEmail) {
                return {
                    type: String(payload?.type || '').trim(),
                    email: '',
                    name: String(payload?.name || 'Applicant').trim() || 'Applicant',
                    subject: 'Email address missing',
                    html: '<p>No email address is available for this recipient, so no preview could be generated.</p>'
                };
            }

            return previewTransactionalEmailNotification(payload, 'Failed to preview applicant email.');
        }));
    }, []);

    const openAdmissionsEmailPreview = useCallback(async ({
        title,
        confirmLabel,
        payloads,
        onConfirm
    }: {
        title: string;
        confirmLabel: string;
        payloads: any[];
        onConfirm: () => Promise<void>;
    }) => {
        setIsLoadingEmailPreview(true);
        try {
            const previews = await previewAdmissionsEmails(payloads);
            setEmailPreviewState({
                title,
                confirmLabel,
                previews,
                recipientCount: previews.length,
                onConfirm
            });
        } catch (error: any) {
            showToastMessage(error?.message || 'Failed to load email preview.', 'error');
        } finally {
            setIsLoadingEmailPreview(false);
        }
    }, [previewAdmissionsEmails, showToastMessage]);

    const handleConfirmEmailPreview = useCallback(async () => {
        if (!emailPreviewState?.onConfirm || isConfirmingEmailPreview) return;

        setIsConfirmingEmailPreview(true);
        try {
            await emailPreviewState.onConfirm();
            closeEmailPreviewModal();
        } finally {
            setIsConfirmingEmailPreview(false);
        }
    }, [closeEmailPreviewModal, emailPreviewState, isConfirmingEmailPreview]);

    const buildScheduleEmailPayloads = useCallback(() => {
        if (selectedApplicants.length === 0) {
            throw new Error('No applicant is selected for scheduling.');
        }
        if (!applicantScheduleData.date || !applicantScheduleData.time) {
            throw new Error('Interview date and time are required.');
        }

        const isReschedule = applicantScheduleMode === 'reschedule';
        const interviewDate = `${applicantScheduleData.date} ${applicantScheduleData.time}`;
        const interviewVenue = String(applicantScheduleData.venue || '').trim();
        const interviewPanel = String(applicantScheduleData.panel || '').trim();

        return selectedApplicants.map((application: any) => ({
            type: isReschedule ? 'APPLICANT_INTERVIEW_RESCHEDULED' : 'APPLICANT_INTERVIEW_SCHEDULED',
            email: application?.email,
            name: getApplicantFullName(application),
            referenceId: application?.reference_id,
            course: getCourseNameForChoice(application),
            interviewDate,
            department: data?.profile?.department,
            venue: interviewVenue,
            panel: interviewPanel
        }));
    }, [applicantScheduleData.date, applicantScheduleData.panel, applicantScheduleData.time, applicantScheduleData.venue, applicantScheduleMode, data?.profile?.department, selectedApplicants]);

    // ─── Admissions Actions ───
    if (!data) return null;

    const closeApplicantScheduleModal = () => {
        setShowApplicantScheduleModal(false);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setSelectedApplicants([]);
    };

    const handleScheduleInterview = (app: any) => {
        setSelectedApplicants(app ? [app] : []);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setShowApplicantScheduleModal(true);
    };

    const handleBulkScheduleInterviews = (applications: any[]) => {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0) {
            showToastMessage('Select at least one applicant to bulk schedule.', 'error');
            return;
        }

        setSelectedApplicants(nextApplicants);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setShowApplicantScheduleModal(true);
    };

    const handleRescheduleInterview = (app: any) => {
        const nextApplicant = app || null;
        if (!nextApplicant) return;
        if (String(nextApplicant?.interview_queue_status || '').trim() !== 'Absent') {
            showToastMessage('Only applicants marked absent can be rescheduled.', 'error');
            return;
        }

        const { date, time } = parseInterviewDateTime(nextApplicant?.interview_date);
        setSelectedApplicants([nextApplicant]);
        setApplicantScheduleMode('reschedule');
        setApplicantScheduleData({
            date,
            time,
            venue: String(nextApplicant?.interview_venue || ''),
            panel: String(nextApplicant?.interview_panel || ''),
            notes: ''
        });
        setShowApplicantScheduleModal(true);
    };

    const executeApplicantSchedule = async () => {
        if (isSchedulingApplicant) return;
        setIsSchedulingApplicant(true);
        try {
            if (selectedApplicants.length === 0) {
                throw new Error('No applicant is selected for scheduling.');
            }

            const interviewDate = `${applicantScheduleData.date} ${applicantScheduleData.time}`;
            const interviewVenue = String(applicantScheduleData.venue || '').trim();
            const interviewPanel = String(applicantScheduleData.panel || '').trim();
            const selectedApplicationIds = selectedApplicants
                .map((app: any) => String(app?.id || '').trim())
                .filter(Boolean);

            console.log('[DEPT] Scheduling interview(s) for:', selectedApplicationIds, applicantScheduleData);

            let scheduledIds: string[] = [];
            let skipped: Array<Record<string, unknown>> = [];
            const isReschedule = applicantScheduleMode === 'reschedule';

            if (isReschedule) {
                await invokeManagedAdmissionsFunction({
                    mode: 'reschedule-interview',
                    applicationId: selectedApplicationIds[0],
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = selectedApplicationIds;
            } else if (selectedApplicants.length === 1) {
                await invokeManagedAdmissionsFunction({
                    mode: 'schedule-interview',
                    applicationId: selectedApplicationIds[0],
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = selectedApplicationIds;
            } else {
                const result = await invokeManagedAdmissionsFunction({
                    mode: 'bulk-schedule-interviews',
                    applicationIds: selectedApplicationIds,
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = Array.isArray(result?.scheduledIds)
                    ? result.scheduledIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
                    : [];
                skipped = Array.isArray(result?.skipped) ? result.skipped : [];
            }

            if (scheduledIds.length === 0) {
                const skippedMessage = skipped.length > 0
                    ? String(skipped[0]?.reason || 'No applicants could be scheduled.')
                    : 'No applicants could be scheduled.';
                throw new Error(skippedMessage);
            }

            const scheduledIdSet = new Set(scheduledIds.map((id) => String(id)));
            const scheduledApplicants = selectedApplicants.filter((app: any) => scheduledIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.map((row: any) => (
                scheduledIdSet.has(String(row?.id || ''))
                    ? {
                        ...row,
                        status: 'Interview Scheduled',
                        interview_date: interviewDate,
                        interview_venue: interviewVenue || null,
                        interview_panel: interviewPanel || null,
                        interview_queue_status: null
                    }
                    : row
            )));

            const successMessage = isReschedule
                ? 'Interview rescheduled successfully.'
                : scheduledApplicants.length === 1
                    ? 'Interview scheduled successfully.'
                    : `${scheduledApplicants.length} interviews scheduled successfully.`;
            showToastMessage(successMessage, 'success');

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped because they were no longer schedulable.`, 'error');
            }

            closeApplicantScheduleModal();

            if (
                isReschedule
                    ? shouldRefreshInterviewQueueForDateChange(selectedApplicants[0]?.interview_date, interviewDate)
                    : applicantScheduleData.date === interviewQueueDate
            ) {
                void refreshInterviewQueue();
            }

            if (scheduledApplicants.length > 0) {
                void refreshAdmissionsDashboardCounts();
                void Promise.allSettled(scheduledApplicants.map((application: any) => (
                    sendAdmissionsEmailNotification({
                        type: isReschedule ? 'APPLICANT_INTERVIEW_RESCHEDULED' : 'APPLICANT_INTERVIEW_SCHEDULED',
                        email: application?.email,
                        name: getApplicantFullName(application),
                        referenceId: application?.reference_id,
                        course: getCourseNameForChoice(application),
                        interviewDate,
                        department: data?.profile?.department,
                        venue: interviewVenue,
                        panel: interviewPanel
                    })
                ))).then((results) => {
                    const failedCount = results.filter((result) =>
                        result.status === 'fulfilled'
                            ? result.value?.emailSent === false
                            : true
                    ).length;

                    if (failedCount > 0) {
                        showToastMessage(
                            `${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`,
                            'error'
                        );
                    }
                });
            }
        } catch (err: any) {
            console.error('[DEPT] Schedule exception:', err);
            showToastMessage(err.message, 'error');
        } finally {
            setIsSchedulingApplicant(false);
        }
    };

    const confirmApplicantSchedule = async (e: any) => {
        e.preventDefault();
        try {
            const isReschedule = applicantScheduleMode === 'reschedule';
            const previewPayloads = buildScheduleEmailPayloads();
            await openAdmissionsEmailPreview({
                title: isReschedule
                    ? 'Preview Reschedule Email'
                    : selectedApplicants.length > 1
                        ? 'Preview Bulk Schedule Emails'
                        : 'Preview Schedule Email',
                confirmLabel: isReschedule ? 'Confirm Reschedule and Send' : 'Confirm Schedule and Send',
                payloads: previewPayloads,
                onConfirm: executeApplicantSchedule
            });
        } catch (error: any) {
            showToastMessage(error?.message || 'Failed to open email preview.', 'error');
        }
    };

    const handleBulkApproveApplicants = async (
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) => {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Approval Emails',
                confirmLabel: 'Confirm Approval and Send',
                payloads: nextApplicants.map((application: any) => ({
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application),
                    department: data?.profile?.department
                })),
                onConfirm: () => handleBulkApproveApplicants(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants
                .map((app: any) => String(app?.id || '').trim())
                .filter(Boolean);
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-approve-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be approved.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));
            setInterviewQueueRows((rows) => rows.map((row: any) => (
                updatedIdSet.has(String(row?.id || ''))
                    ? { ...row, status: 'Approved for Enrollment', interview_queue_status: null }
                    : row
            )));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} approved for enrollment.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk approval.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => (
                sendAdmissionsEmailNotification({
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application),
                    department: data?.profile?.department
                })
            ))).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? emailResult.value?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage(err?.message || 'Failed to bulk approve applicants.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    };

    const handleBulkForwardApplicants = async (
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) => {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Forward Emails',
                confirmLabel: 'Confirm Forward and Send',
                payloads: nextApplicants.map((application: any) => {
                    const currentChoice = Number(application?.current_choice || 1);
                    const nextChoice = currentChoice + 1;
                    return {
                        type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                        email: application?.email,
                        name: getApplicantFullName(application),
                        referenceId: application?.reference_id,
                        fromChoice: getChoiceLabel(currentChoice),
                        toChoice: getChoiceLabel(nextChoice),
                        nextCourse: getCourseNameForChoice(application, nextChoice),
                        department: data?.profile?.department
                    };
                }),
                onConfirm: () => handleBulkForwardApplicants(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants
                .map((app: any) => String(app?.id || '').trim())
                .filter(Boolean);
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-forward-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be forwarded.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.flatMap((row: any) => {
                if (!updatedIdSet.has(String(row?.id || ''))) {
                    return [row];
                }

                const nextChoice = Number(row?.current_choice || 1) + 1;
                const nextStatus = nextChoice === 2
                    ? 'Forwarded to 2nd Choice for Interview'
                    : 'Forwarded to 3rd Choice for Interview';

                return shouldKeepAdmissionRow(nextStatus, row, nextChoice)
                    ? [{
                        ...row,
                        status: nextStatus,
                        current_choice: nextChoice,
                        interview_queue_status: null
                    }]
                    : [];
            }));
            setInterviewQueueRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} forwarded to the next course choice.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk forwarding.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => {
                const currentChoice = Number(application?.current_choice || 1);
                const nextChoice = currentChoice + 1;

                return sendAdmissionsEmailNotification({
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    fromChoice: getChoiceLabel(currentChoice),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(application, nextChoice),
                    department: data?.profile?.department
                });
            })).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? emailResult.value?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage(err?.message || 'Failed to bulk forward applicants.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    };

    const handleBulkMarkApplicantsUnsuccessful = async (
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) => {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Unsuccessful Emails',
                confirmLabel: 'Confirm Unsuccessful and Send',
                payloads: nextApplicants.map((application: any) => ({
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application, application?.current_choice || 1),
                    department: data?.profile?.department
                })),
                onConfirm: () => handleBulkMarkApplicantsUnsuccessful(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants
                .map((app: any) => String(app?.id || '').trim())
                .filter(Boolean);
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-mark-unsuccessful-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be marked unsuccessful.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));
            setInterviewQueueRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} marked unsuccessful.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk unsuccessful marking.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => (
                sendAdmissionsEmailNotification({
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application, application?.current_choice || 1),
                    department: data?.profile?.department
                })
            ))).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? emailResult.value?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage(err?.message || 'Failed to bulk mark applicants unsuccessful.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    };

    const handleApproveApplicant = async (
        app: any,
        options: { skipPreview?: boolean } = {}
    ) => {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Approval Email',
                confirmLabel: 'Confirm Approval and Send',
                payloads: [{
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app),
                    department: data?.profile?.department
                }],
                onConfirm: () => handleApproveApplicant(app, { skipPreview: true })
            });
            return;
        }
        setPendingApplicantActionId(nextApplicationId);
        try {
            console.log('[DEPT] Approving applicant:', app.id);
            const emailPayload = {
                type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                email: app?.email,
                name: getApplicantFullName(app),
                referenceId: app?.reference_id,
                course: getCourseNameForChoice(app),
                department: data?.profile?.department
            };
            await invokeManagedAdmissionsFunction({
                mode: 'approve-application',
                applicationId: app.id
            });
            showToastMessage('Applicant approved for enrollment.', 'success');
            void refreshAdmissionsDashboardCounts();
            patchAdmissionRows((rows) => rows.filter((row: any) => String(row.id) !== String(app.id)));
            setInterviewQueueRows((rows) => rows.map((row: any) => (
                String(row.id) === String(app.id)
                    ? { ...row, status: 'Approved for Enrollment' }
                    : row
            )));
            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }
            void sendAdmissionsEmailNotification(emailPayload).then((emailResult) => {
                if (emailResult.emailSent === false) {
                    showToastMessage(`Applicant approved, but email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
        } catch (err: any) {
            console.error('[DEPT] Approve exception:', err);
            showToastMessage(err.message, 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    };

    const handleMarkApplicantAbsent = async (app: any) => {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        if (!window.confirm(`Mark ${app.first_name} as absent for the scheduled interview?`)) return;

        setPendingApplicantActionId(nextApplicationId);
        try {
            await invokeManagedAdmissionsFunction({
                mode: 'set-interview-queue-status',
                applicationId: nextApplicationId,
                queueStatus: 'Absent'
            });

            patchAdmissionRows((rows) => rows.map((row: any) => (
                String(row.id) === nextApplicationId
                    ? { ...row, interview_date: null, interview_queue_status: 'Absent' }
                    : row
            )));
            setInterviewQueueRows((rows) => rows.filter((row: any) => String(row?.id || '') !== nextApplicationId));

            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }

            showToastMessage('Applicant marked absent.', 'success');
        } catch (err: any) {
            showToastMessage(err?.message || 'Failed to mark applicant absent.', 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    };

    const handleRejectApplicant = async (
        app: any,
        options: { skipPreview?: boolean } = {}
    ) => {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        const nextChoice = (app.current_choice || 1) + 1;
        const previewStatus = nextChoice === 2 && app.alt_course_1
            ? 'Forwarded to 2nd Choice for Interview'
            : nextChoice === 3 && app.alt_course_2
                ? 'Forwarded to 3rd Choice for Interview'
                : 'Application Unsuccessful';
        if (!options.skipPreview) {
            const previewPayload = previewStatus === 'Application Unsuccessful'
                ? {
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app, app.current_choice || 1),
                    department: data?.profile?.department
                }
                : {
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    fromChoice: getChoiceLabel(app.current_choice || 1),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(app, nextChoice),
                    department: data?.profile?.department
                };
            await openAdmissionsEmailPreview({
                title: previewStatus === 'Application Unsuccessful'
                    ? 'Preview Unsuccessful Email'
                    : 'Preview Forward Email',
                confirmLabel: previewStatus === 'Application Unsuccessful'
                    ? 'Confirm Unsuccessful and Send'
                    : 'Confirm Forward and Send',
                payloads: [previewPayload],
                onConfirm: () => handleRejectApplicant(app, { skipPreview: true })
            });
            return;
        }
        setPendingApplicantActionId(nextApplicationId);
        try {
            let newStatus = '';

            if (nextChoice === 2 && app.alt_course_1) {
                newStatus = 'Forwarded to 2nd Choice for Interview';
            } else if (nextChoice === 3 && app.alt_course_2) {
                newStatus = 'Forwarded to 3rd Choice for Interview';
            } else {
                newStatus = 'Application Unsuccessful';
            }

            console.log('[DEPT] Rejecting applicant:', app.id, '→', newStatus);
            await invokeManagedAdmissionsFunction({
                mode: 'reject-application',
                applicationId: app.id
            });

            const emailPayload = newStatus === 'Application Unsuccessful'
                ? {
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app, app.current_choice || 1),
                    department: data?.profile?.department
                }
                : {
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    fromChoice: getChoiceLabel(app.current_choice || 1),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(app, nextChoice),
                    department: data?.profile?.department
                };

            const successMessage = newStatus === 'Application Unsuccessful'
                ? 'Applicant marked unsuccessful.'
                : 'Applicant forwarded to next choice.';

            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();
            patchAdmissionRows((rows) => {
                if (!shouldKeepAdmissionRow(newStatus, app, nextChoice)) {
                    return rows.filter((row: any) => String(row.id) !== String(app.id));
                }

                return rows.map((row: any) => (
                    String(row.id) === String(app.id)
                        ? {
                            ...row,
                            status: newStatus,
                            current_choice: nextChoice,
                            interview_queue_status: null
                        }
                        : row
                ));
            });
            setInterviewQueueRows((rows) => rows.filter((row: any) => String(row.id) !== String(app.id)));
            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }
            void sendAdmissionsEmailNotification(emailPayload).then((backgroundEmailResult) => {
                if (backgroundEmailResult.emailSent === false) {
                    showToastMessage(`${successMessage} Email failed: ${backgroundEmailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
        } catch (err: any) {
            console.error('[DEPT] Reject exception:', err);
            showToastMessage(err.message, 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    };

    const handleProfileSubmit = async (e: any) => {
        e.preventDefault();
        if (isUpdatingProfile) return;
        setIsUpdatingProfile(true);
        try {
            const { error } = await supabase
                .from('staff_accounts')
                .update({
                    full_name: profileForm.name
                })
                .eq('id', session.id);

            if (error) throw error;

            setData((prev: any) => ({
                ...prev,
                profile: { ...prev.profile, name: profileForm.name }
            }));
            setShowProfileModal(false);
            showToastMessage('Profile updated.');
        } catch (err: any) {
            showToastMessage("Error updating profile: " + err.message, 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/department/login');
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refreshAllData();
            await refreshAdmissionsDashboardCounts();
            await refreshInterviewQueue();
            showToastMessage('Department data refreshed.', 'success');
        } catch (error: any) {
            showToastMessage(error?.message || 'Failed to refresh department data.', 'error');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const handleReferralSubmit = async (e: any) => {
        e.preventDefault();
        if (isSubmittingReferral) return;
        setIsSubmittingReferral(true);
        try {
            if (forwardingToStaff && selectedCounselingReq) {
                const signatureData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                const result = await invokeManagedDepartmentServicesFunction({
                    mode: 'forward-counseling-to-care',
                    requestId: selectedCounselingReq.id,
                    referrerContactNumber: referralForm.referrer_contact_number,
                    relationshipWithStudent: referralForm.relationship_with_student,
                    reasonForReferral: referralForm.reason_for_referral,
                    actionsMade: referralForm.actions_made,
                    dateDurationOfObservations: referralForm.date_duration_of_observations,
                    referrerSignature: signatureData
                });
                patchCounselingRows((rows) => rows.map((row: any) => (
                    String(row.id) === String(selectedCounselingReq.id)
                        ? {
                            ...row,
                            status: COUNSELING_STATUS.REFERRED,
                            referred_by: data.profile.name,
                            referrer_contact_number: referralForm.referrer_contact_number || null,
                            relationship_with_student: referralForm.relationship_with_student || null,
                            reason_for_referral: referralForm.reason_for_referral || row.reason_for_referral || row.description || null,
                            actions_made: referralForm.actions_made || null,
                            date_duration_of_observations: referralForm.date_duration_of_observations || null,
                            referrer_signature: signatureData || null
                        }
                        : row
                )));
                showToastMessage('Request forwarded to CARE Staff.', 'success');
                queueProcessEmailNotification(result?.emailPayload, 'Request forwarded to CARE Staff.');
            } else {
                const studentObj = filteredData.students.find((s: any) => s.name === referralForm.student);
                const sigData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                const result = await invokeManagedDepartmentServicesFunction({
                    mode: 'create-counseling-referral',
                    studentId: studentObj?.id || '',
                    studentName: referralForm.student,
                    courseYear: studentObj ? `${studentObj.course || ''} - ${studentObj.year || ''}` : '',
                    contactNumber: studentObj?.mobile || '',
                    reasonForReferral: referralForm.reason_for_referral,
                    referrerContactNumber: referralForm.referrer_contact_number,
                    relationshipWithStudent: referralForm.relationship_with_student,
                    actionsMade: referralForm.actions_made,
                    dateDurationOfObservations: referralForm.date_duration_of_observations,
                    referrerSignature: sigData
                });
                await counselingState.refresh();
                showToastMessage('Referral submitted.');
                queueProcessEmailNotification(result?.emailPayload, 'Referral submitted.');
            }
            setShowReferralModal(false);
            setForwardingToStaff(false);
            setSelectedCounselingReq(null);
            setReferralForm({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
            if (sigCanvasRef.current) sigCanvasRef.current.clear();
        } catch (err: any) {
            showToastMessage("Error: " + err.message, 'error');
        } finally {
            setIsSubmittingReferral(false);
        }
    };

    const addReason = () => {
        if (!newReason.trim()) return;
        const newData = { ...data };
        newData.settings.referralReasons.push(newReason);
        setData(newData);
        setNewReason('');
    };

    const deleteReason = (idx: number) => {
        const newData = { ...data };
        newData.settings.referralReasons.splice(idx, 1);
        setData(newData);
    };

    const handleViewDeptAttendees = async (event: any) => {
        const myDept = data.profile.department;
        try {
            const { data: attendeesData, error } = await supabase
                .from('event_attendance')
                .select('*')
                .eq('event_id', event.id)
                .eq('department', myDept)
                .order('time_in', { ascending: false });

            if (error) throw error;

            // Enrich with year_level, section, course from students table
            let enriched = attendeesData || [];
            if (enriched.length > 0) {
                const studentIds = [...new Set(enriched.map(a => a.student_id).filter(Boolean))];
                if (studentIds.length > 0) {
                    const { data: studs } = await supabase.from('students').select('student_id, year_level, section, course').in('student_id', studentIds);
                    const stuMap: Record<string, any> = {};
                    (studs || []).forEach(s => { stuMap[s.student_id] = s; });
                    enriched = enriched.map(a => ({
                        ...a,
                        year_level: stuMap[a.student_id]?.year_level || '',
                        section: stuMap[a.student_id]?.section || '',
                        course: a.course || stuMap[a.student_id]?.course || ''
                    }));
                }
            }

            setDeptAttendees(enriched);
            setYearLevelFilter('All');
            setShowEventAttendees(event);
        } catch (err) {
            console.error(err);
            setToast({ type: 'error', msg: 'Failed to load attendees.' });
            setTimeout(() => setToast(null), 3000);
        }
    };

    const openDecisionModal = (id: any, type: string) => {
        setDecisionData({ id, type, notes: type === 'Approved' ? 'Approved' : '' });
        setShowDecisionModal(true);
    };

    const submitDecision = async () => {
        showToastMessage('This legacy support decision modal is no longer used. Please use the current support workflow actions.', 'error');
        setShowDecisionModal(false);
    };

    // ── Support Approval Actions ──
    const handleSupportApproveAndSchedule = async () => {
        const { id, date, time, notes } = approveScheduleData;
        if (isSubmittingSupportSchedule) return;
        if (!date || !time) { showToastMessage('Please select date and time.', 'error'); return; }
        setIsSubmittingSupportSchedule(true);
        try {
            const scheduledDate = `${date} ${time}`;
            const deptNotes = JSON.stringify({
                scheduled_date: scheduledDate,
                approval_notes: notes
            });
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'approve-support-and-schedule',
                requestId: id,
                date,
                time,
                notes
            });
            showToastMessage('Visit scheduled successfully.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Visit scheduled successfully.');
            setShowApproveScheduleModal(false);
            setApproveScheduleData({ id: null, student_id: null, date: '', time: '', notes: '' });
            patchSupportRows((rows) => rows.map((row: any) => (
                String(row.id) === String(id)
                    ? {
                        ...row,
                        status: SUPPORT_STATUS.VISIT_SCHEDULED,
                        dept_notes: deptNotes
                    }
                    : row
            )));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportSchedule(false);
        }
    };

    const handleRejectSupport = async (id: string, notes: string) => {
        const nextRequestId = String(id || '').trim();
        if (!nextRequestId || pendingSupportRejectId === nextRequestId) return;
        setPendingSupportRejectId(nextRequestId);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'reject-support',
                requestId: nextRequestId,
                notes
            });
            showToastMessage('Request rejected.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request rejected.');
            patchSupportRows((rows) => rows.map((r: any) => (
                String(r.id) === nextRequestId
                    ? { ...r, status: SUPPORT_STATUS.REJECTED, dept_notes: notes }
                    : r
            )));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setPendingSupportRejectId(null);
        }
    };

    const handleResolveSupport = async () => {
        const { id, notes } = resolveData;
        if (isSubmittingSupportResolve) return;
        if (!notes.trim()) { showToastMessage('Please add resolution notes.', 'error'); return; }
        setIsSubmittingSupportResolve(true);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'resolve-support',
                requestId: id,
                notes
            });
            showToastMessage('Request marked as resolved and sent to CARE.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request marked as resolved and sent to CARE.');
            setShowResolveModal(false);
            setResolveData({ id: null, student_id: null, notes: '' });
            patchSupportRows((rows) => rows.map((r: any) => String(r.id) === String(id) ? { ...r, status: SUPPORT_STATUS.RESOLVED_BY_DEPT, dept_notes: notes } : r));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportResolve(false);
        }
    };

    const handleReferToCare = async () => {
        const { id, date_acted, actions_taken, comments } = referCareForm;
        if (isSubmittingSupportRefer) return;
        if (!actions_taken.trim()) { showToastMessage('Please describe actions taken.', 'error'); return; }
        const sigData = sigCanvasRefSupport.current && !sigCanvasRefSupport.current.isEmpty() ? sigCanvasRefSupport.current.toDataURL() : null;
        setIsSubmittingSupportRefer(true);
        try {
            const referralData = JSON.stringify({
                referred_by: data.profile.name,
                date_acted,
                actions_taken,
                comments,
                signature: sigData
            });
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'refer-support-to-care',
                requestId: id,
                dateActed: date_acted,
                actionsTaken: actions_taken,
                comments,
                signature: sigData
            });
            showToastMessage('Request referred to CARE Staff.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request referred to CARE Staff.');
            setShowReferCareModal(false);
            setReferCareForm({ id: null, student_id: null, student_name: '', date_acted: '', actions_taken: '', comments: '' });
            patchSupportRows((rows) => rows.map((r: any) => String(r.id) === String(id) ? { ...r, status: SUPPORT_STATUS.REFERRED_TO_CARE, dept_notes: referralData } : r));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportRefer(false);
        }
    };

    const renderDetailedDescription = (desc: any) => {
        if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
        const q1Index = desc.indexOf('[Q1 Description]:');
        if (q1Index === -1) {
            return <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{desc}</p>;
        }
        // Parsing logic simplified for brevity but functional
        return <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{desc}</p>;
    };



    // Module label map for header
    const moduleLabels = {
        dashboard: 'Home',
        admissions: 'Admissions Screening',
        interview_queue: 'Interview Queue',
        calendar: 'Calendar',
        export_center: 'Export Center',
        counseling_queue: 'Counseling',
        events: 'College Events',
        support_approvals: 'Additional Support',
        settings: 'Settings',
        students: 'Students',
        counseled: 'Counseled Students',
        reports: 'Reports',
    };

    const moduleLoadingFallback = (
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
            <p className="text-sm font-semibold text-gray-700">Loading report module...</p>
            <p className="mt-1 text-xs text-gray-500">Preparing charts and analytics for this page.</p>
        </div>
    );

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-dept-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-emerald-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div onClick={() => setActiveModule('settings')} className="cursor-pointer group">
                            <NorsuBrand title={data.profile.name} subtitle={data.profile.department} accent="emerald" size="sm" className="min-w-0" />
                            <p className="mt-2 pl-[4.4rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50 transition-colors group-hover:text-emerald-100/80">Open Profile & Settings</p>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-emerald-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {[
                        { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Home' },
                    ].map((item: any) => (
                        <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Services</p>
                        {[
                            { id: 'counseling_queue', icon: <ClipboardList size={18} />, label: 'Counseling', hasIndicator: counselingRequests.filter((r: any) => isCounselingAwaitingDept(r.status)).length > 0 },
                            { id: 'calendar', icon: <CalendarDays size={18} />, label: 'Calendar' },
                            { id: 'events', icon: <CalendarDays size={18} />, label: 'College Events' },
                            { id: 'support_approvals', icon: <HeartHandshake size={18} />, label: 'Additional Support', hasIndicator: supportRequests.length > lastSeenSupportCount },
                        ].map((item: any) => (
                            <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                                {item.hasIndicator && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Management</p>
                        {[
                            { id: 'admissions', icon: <UserPlus size={18} />, label: 'Admissions Screening', hasIndicator: admissionApplicants.length > 0 },
                            { id: 'interview_queue', icon: <CalendarDays size={18} />, label: 'Interview Queue' },
                            { id: 'export_center', icon: <Download size={18} />, label: 'Export Center' },
                            { id: 'students', icon: <Users size={18} />, label: 'Students' },
                            { id: 'counseled', icon: <ClipboardList size={18} />, label: 'Counseled Students' },
                        ].map((item: any) => (
                            <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                                {item.hasIndicator && <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">System</p>
                        {[
                            { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
                        ].map((item: any) => (
                            <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}
                <header className="h-16 glass gradient-border-green flex items-center justify-between px-6 lg:px-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Menu /></button>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/70">NORSU-G CARE</p>
                            <h2 className="text-xl font-bold gradient-text-green capitalize">{(moduleLabels as any)[activeModule] || activeModule}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <img src="/carecenter.png" alt="NORSU-G CARE" className="hidden h-10 w-10 rounded-full border border-emerald-100 bg-white object-cover shadow-sm md:block" />
                        <button
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 hover:shadow-md transition-all border border-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isRefreshingData ? 'animate-spin' : ''} />
                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>
                        <NotificationBell notifications={deptNotifications} accentColor="emerald" />
                    </div>
                </header>

                <div key={activeModule} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">

                    {/* DASHBOARD / HOME */}
                    {activeModule === 'dashboard' && (
                        <DeptHomePage
                            filteredData={filteredData}
                            counselingRequests={counselingRequests}
                            admissionsDashboardCounts={admissionsDashboardCounts}
                            departmentAlertItems={departmentAlertItems}
                            setActiveModule={setActiveModule}
                            setForwardingToStaff={setForwardingToStaff}
                            setReferralForm={setReferralForm}
                            setShowReferralModal={setShowReferralModal}
                            setSelectedCounselingReq={setSelectedCounselingReq}
                            setShowCounselingViewModal={setShowCounselingViewModal}
                        />
                    )}

                    {activeModule === 'counseling_queue' && (
                        <DeptCounselingQueuePage
                            counselingRequests={counselingRequests}
                            counselingTab={counselingTab}
                            setCounselingTab={setCounselingTab}
                            cascadeFilterBar={cascadeFilterBar}
                            matchesCascadeFilters={matchesCascadeFilters}
                            getStudentForRequest={getStudentForRequest}
                            selectedCounselingReq={selectedCounselingReq}
                            setSelectedCounselingReq={setSelectedCounselingReq}
                            setForwardingToStaff={setForwardingToStaff}
                            setReferralForm={setReferralForm}
                            setShowReferralModal={setShowReferralModal}
                            showCounselingViewModal={showCounselingViewModal}
                            setShowCounselingViewModal={setShowCounselingViewModal}
                            showScheduleModal={showScheduleModal}
                            setShowScheduleModal={setShowScheduleModal}
                            showRejectModal={showRejectModal}
                            setShowRejectModal={setShowRejectModal}
                            scheduleData={scheduleData}
                            setScheduleData={setScheduleData}
                            rejectNotes={rejectNotes}
                            setRejectNotes={setRejectNotes}
                            handleApproveAndSchedule={handleApproveAndSchedule}
                            handleRejectRequest={handleRejectRequest}
                            handleCompleteRequest={handleCompleteRequest}
                            handleStartForward={handleStartForward}
                            isSubmittingCounselingSchedule={isSubmittingCounselingSchedule}
                            isSubmittingCounselingReject={isSubmittingCounselingReject}
                            pendingCounselingCompletionId={pendingCounselingCompletionId}
                        />
                    )}

                    {/* ADMISSIONS SCREENING */}
                    {activeModule === 'admissions' && (
                        <DeptAdmissionsPage
                            applicants={admissionApplicants}
                            handleApproveApplicant={handleApproveApplicant}
                            handleRejectApplicant={handleRejectApplicant}
                            handleMarkApplicantAbsent={handleMarkApplicantAbsent}
                            handleBulkApproveApplicants={handleBulkApproveApplicants}
                            handleBulkForwardApplicants={handleBulkForwardApplicants}
                            handleBulkMarkApplicantsUnsuccessful={handleBulkMarkApplicantsUnsuccessful}
                            handleRescheduleInterview={handleRescheduleInterview}
                            handleScheduleInterview={handleScheduleInterview}
                            handleBulkScheduleInterviews={handleBulkScheduleInterviews}
                            pendingApplicantActionId={pendingApplicantActionId}
                            isSchedulingApplicant={isSchedulingApplicant}
                            isProcessingBulkApplicantAction={isProcessingBulkApplicantAction}
                        />
                    )}

                    {activeModule === 'interview_queue' && (
                        <DeptInterviewQueuePage
                            queueDate={interviewQueueDate}
                            setQueueDate={setInterviewQueueDate}
                            queueRows={interviewQueueRows}
                            isLoadingQueue={isInterviewQueueLoading}
                            queueError={interviewQueueError}
                            refreshInterviewQueue={refreshInterviewQueue}
                        />
                    )}

                    {activeModule === 'calendar' && (
                        <StaffCalendarPage
                            scope="department"
                            departmentName={data?.profile?.department}
                            accent="emerald"
                        />
                    )}

                    {activeModule === 'export_center' && (
                        <StaffExportCenterPage
                            scope="department"
                            departmentName={data?.profile?.department}
                            accent="emerald"
                            showToast={showToastMessage}
                        />
                    )}

                    {/* REPORTS */}
                    {activeModule === 'reports' && (
                        <Suspense fallback={moduleLoadingFallback}>
                            <DeptReportsPage chartData={chartData} />
                        </Suspense>
                    )}

                    {/* SETTINGS */}
                    {activeModule === 'settings' && (
                        <DeptSettingsPage
                            data={data}
                            setData={setData}
                            newReason={newReason}
                            setNewReason={setNewReason}
                            addReason={addReason}
                            deleteReason={deleteReason}
                            authEmail={session?.user?.email || session?.auth_email || data?.profile?.email || ''}
                            requestStaffSecurityOtp={requestStaffSecurityOtp}
                            confirmStaffSecurityEmailChange={confirmStaffSecurityEmailChange}
                            confirmStaffPasswordChange={confirmStaffPasswordChange}
                            updateStaffProfileName={updateStaffProfileName}
                            showToast={showToastMessage}
                        />
                    )}

                    {/* SUPPORT APPROVALS */}
                    {activeModule === 'support_approvals' && (
                        <DeptSupportApprovalsPage
                            data={data}
                            supportRequests={supportRequests}
                            filteredData={filteredData}
                            matchesCascadeFilters={matchesCascadeFilters}
                            cascadeFilterBar={cascadeFilterBar}
                            openDecisionModal={openDecisionModal}
                            showApproveScheduleModal={showApproveScheduleModal}
                            setShowApproveScheduleModal={setShowApproveScheduleModal}
                            approveScheduleData={approveScheduleData}
                            setApproveScheduleData={setApproveScheduleData}
                            handleSupportApproveAndSchedule={handleSupportApproveAndSchedule}
                            handleRejectSupport={handleRejectSupport}
                            pendingSupportRejectId={pendingSupportRejectId}
                            showResolveModal={showResolveModal}
                            setShowResolveModal={setShowResolveModal}
                            resolveData={resolveData}
                            setResolveData={setResolveData}
                            handleResolveSupport={handleResolveSupport}
                            showReferCareModal={showReferCareModal}
                            setShowReferCareModal={setShowReferCareModal}
                            referCareForm={referCareForm}
                            setReferCareForm={setReferCareForm}
                            handleReferToCare={handleReferToCare}
                            sigCanvasRefSupport={sigCanvasRefSupport}
                            isSubmittingSupportSchedule={isSubmittingSupportSchedule}
                            isSubmittingSupportResolve={isSubmittingSupportResolve}
                            isSubmittingSupportRefer={isSubmittingSupportRefer}
                        />
                    )}

                    {activeModule === 'events' && (
                        <DeptEventsPage
                            data={data}
                            eventsList={eventsList}
                            handleViewDeptAttendees={handleViewDeptAttendees}
                        />
                    )}

                    {/* STUDENTS */}
                    {activeModule === 'students' && (
                        <DeptStudentsPage
                            filteredData={filteredData}
                            studentSearch={studentSearch}
                            setStudentSearch={setStudentSearch}
                            matchesCascadeFilters={matchesCascadeFilters}
                            cascadeFilterBar={cascadeFilterBar}
                            setSelectedStudent={setSelectedStudent}
                            setShowStudentModal={setShowStudentModal}
                        />
                    )}

                    {/* COUNSELED STUDENTS */}
                    {activeModule === 'counseled' && (
                        <DeptCounseledPage
                            filteredData={filteredData}
                            counseledSearch={counseledSearch}
                            setCounseledSearch={setCounseledSearch}
                            counseledDate={counseledDate}
                            setCounseledDate={setCounseledDate}
                            matchesCascadeFilters={matchesCascadeFilters}
                            getStudentForRequest={getStudentForRequest}
                            cascadeFilterBar={cascadeFilterBar}
                            setSelectedHistoryStudent={setSelectedHistoryStudent}
                            setShowHistoryModal={setShowHistoryModal}
                        />
                    )}
                </div >
            </main >

            {renderDeptModals({
                data,
                counselingRequests,
                showProfileModal, setShowProfileModal, profileForm, setProfileForm, handleProfileSubmit, isUpdatingProfile,
                showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff,
                referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral,
                referralSearchQuery, setReferralSearchQuery, sigCanvasRef,
                showHistoryModal, setShowHistoryModal, selectedHistoryStudent, exportPDF: (name: string) => exportPDF(name, counselingRequests),
                showStudentModal, setShowStudentModal, selectedStudent,
                showEventAttendees, setShowEventAttendees, deptAttendees,
                yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
                deptSectionFilter, setDeptSectionFilter, exportToExcel,
                showDecisionModal, setShowDecisionModal, decisionData, setDecisionData, submitDecision,
                showApplicantScheduleModal, closeApplicantScheduleModal, applicantScheduleMode, applicantScheduleData, setApplicantScheduleData, confirmApplicantSchedule, isSchedulingApplicant: (isSchedulingApplicant || isLoadingEmailPreview || isConfirmingEmailPreview), selectedApplicants,
                viewFormRecord, setViewFormRecord,
                viewFormMode, setViewFormMode
            })}

            {emailPreviewState && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{emailPreviewState.title || 'Email Preview'}</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Read-only preview of recipients and email content before sending.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeEmailPreviewModal}
                                disabled={isConfirmingEmailPreview}
                                className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>

                        <div className="border-b border-gray-100 px-6 py-3 text-sm text-gray-600">
                            {emailPreviewState.recipientCount || 0} recipient{emailPreviewState.recipientCount === 1 ? '' : 's'}
                        </div>

                        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
                            {(emailPreviewState.previews || []).map((preview: any, index: number) => (
                                <div key={`${preview.email || 'missing-email'}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">{preview.name || 'Applicant'}</p>
                                            <p className="text-xs text-gray-500">{preview.email || 'No email address available'}</p>
                                        </div>
                                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${preview.email ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {preview.email ? 'Ready to Send' : 'Missing Email'}
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Subject</p>
                                        <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                                            {preview.subject || 'No subject available'}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Email Content</p>
                                        <div
                                            className="mt-1 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 space-y-2"
                                            dangerouslySetInnerHTML={{ __html: preview.html || '<p>No preview available.</p>' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 border-t border-gray-100 px-6 py-4 md:flex-row md:justify-end">
                            <button
                                type="button"
                                onClick={closeEmailPreviewModal}
                                disabled={isConfirmingEmailPreview}
                                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleConfirmEmailPreview()}
                                disabled={isConfirmingEmailPreview}
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                                {isConfirmingEmailPreview
                                    ? 'Sending...'
                                    : (emailPreviewState.confirmLabel || 'Confirm and Send')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}
