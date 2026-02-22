import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { useDeptData } from '../hooks/dept/useDeptData';
import { exportPDF, exportToExcel } from '../utils/dashboardUtils';
import DeptHomePage from './dept/DeptHomePage';
import DeptCounselingQueuePage from './dept/DeptCounselingQueuePage';
import DeptSupportApprovalsPage from './dept/DeptSupportApprovalsPage';
import DeptEventsPage from './dept/DeptEventsPage';
import DeptStudentsPage from './dept/DeptStudentsPage';
import DeptCounseledPage from './dept/DeptCounseledPage';
import DeptReportsPage from './dept/DeptReportsPage';
import DeptSettingsPage from './dept/DeptSettingsPage';
import DeptAdmissionsPage from './dept/DeptAdmissionsPage';
import { renderDeptModals } from './dept/modals/DeptModals';
import {
    LayoutDashboard, CalendarDays, HeartHandshake, Settings, Users, ClipboardList,
    LogOut, UserCircle, Menu, FileText, CheckCircle, XCircle, Info,
    UserPlus, BarChart3, AlertCircle, User, MapPin, GraduationCap, Bell, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import 'jspdf-autotable';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// ─── Live Clock Hook ───
const useLiveClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    const hours = currentTime.getHours();
    const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const [timePart, ampm] = timeString.split(' ');
    const [h, m, s] = timePart.split(':');
    return { greeting, h, m, s, ampm, dateString };
};

export default function DeptDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const clock = useLiveClock();
    const [activeModule, setActiveModule] = useState<string>('dashboard');
    const {
        data, setData, eventsList, counselingRequests,
        supportRequests, setSupportRequests, admissionApplicants,
        lastSeenSupportCount, setLastSeenSupportCount, toast, setToast, showToastMessage
    } = useDeptData(session, isAuthenticated);

    // Modals
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

    // Events State
    // Events State
    // Events State
    const [showEventAttendees, setShowEventAttendees] = useState<any>(null);
    const [deptAttendees, setDeptAttendees] = useState<any[]>([]);
    const [yearLevelFilter, setYearLevelFilter] = useState<string>('All');
    const [showApplicantScheduleModal, setShowApplicantScheduleModal] = useState<boolean>(false);
    const [applicantScheduleData, setApplicantScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [selectedApplicant, setSelectedApplicant] = useState<any>(null);

    // Counseling Queue State
    const [counselingTab, setCounselingTab] = useState<string>('Submitted');
    const [selectedCounselingReq, setSelectedCounselingReq] = useState<any>(null);
    const [showCounselingViewModal, setShowCounselingViewModal] = useState<boolean>(false);
    const [deptFormModalView, setDeptFormModalView] = useState<string>('referral');
    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [scheduleData, setScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
    const [rejectNotes, setRejectNotes] = useState<string>('');
    const [forwardingToStaff, setForwardingToStaff] = useState<boolean>(false);
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
    const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
    const [referralForm, setReferralForm] = useState<any>({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
    const sigCanvasRef = useRef<any>(null);

    // Mark support requests as seen
    useEffect(() => {
        if (activeModule === 'support_approvals') {
            setLastSeenSupportCount(supportRequests.length);
        }
    }, [activeModule, supportRequests]);

    if (!data) return null;


    const getFilteredData = () => {
        const dept = data.profile.department;
        const filteredStudents = data.students.filter((s: any) => s.department === dept);

        console.log("[DEBUG FILTER] My Dept:", dept);
        console.log("[DEBUG FILTER] All Students Length:", data.students.length);
        console.log("[DEBUG FILTER] Dept Students Length:", filteredStudents.length);
        if (filteredStudents.length > 0) {
            console.log("[DEBUG FILTER] First Dept Student Course:", filteredStudents[0].course);
        }

        const activeStudents = filteredStudents.filter((s: any) => s.status === 'Active');
        const populationByYear = {
            '1st Year': activeStudents.filter((s: any) => s.year === '1st Year').length,
            '2nd Year': activeStudents.filter((s: any) => s.year === '2nd Year').length,
            '3rd Year': activeStudents.filter((s: any) => s.year === '3rd Year').length,
            '4th Year': activeStudents.filter((s: any) => s.year === '4th Year').length,
        };

        return { ...data, students: filteredStudents, requests: counselingRequests, populationStats: populationByYear };
    };

    const filteredData = getFilteredData();

    // Derived cascading filter options (scoped to this department's students)
    const deptCourses = [...new Set(filteredData.students.map((s: any) => s.course).filter(Boolean))].sort();
    const deptAvailableSections = [...new Set(
        filteredData.students
            .filter((s: any) => (deptCourseFilter === 'All' || s.course === deptCourseFilter) && (deptYearFilter === 'All' || s.year === deptYearFilter))
            .map((s: any) => s.section)
            .filter(Boolean)
    )].sort();

    // Helper: check if a student matches the current cascade filters
    const matchesCascadeFilters = (student: any) => {
        if (!student) return true;
        if (deptCourseFilter !== 'All' && student.course !== deptCourseFilter) return false;
        if (deptYearFilter !== 'All' && student.year !== deptYearFilter) return false;
        if (deptSectionFilter !== 'All' && student.section !== deptSectionFilter) return false;
        return true;
    };

    // Helper: lookup student for a request by student_id
    const getStudentForRequest = (req: any) => filteredData.students.find((s: any) => s.id === req.student_id);

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
                {deptAvailableSections.map((s: any) => <option key={s} value={s}>Sec {s}</option>)}
            </select>
            {(deptCourseFilter !== 'All' || deptYearFilter !== 'All' || deptSectionFilter !== 'All') && (
                <button onClick={() => { setDeptCourseFilter('All'); setDeptYearFilter('All'); setDeptSectionFilter('All'); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">Reset</button>
            )}
        </div>
    );

    // Chart Data Preparation
    const approved = filteredData.requests.filter((r: any) => r.status === 'Approved').length;
    const rejected = filteredData.requests.filter((r: any) => r.status === 'Rejected').length;
    const pending = filteredData.requests.filter((r: any) => r.status === 'Pending').length;

    const chartData = {
        labels: ['Approved', 'Rejected', 'Pending'],
        datasets: [{
            label: 'Requests',
            data: [approved, rejected, pending],
            backgroundColor: ['rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(234, 179, 8, 0.7)'],
            borderColor: ['rgb(34, 197, 94)', 'rgb(239, 68, 68)', 'rgb(234, 179, 8)'],
            borderWidth: 1
        }]
    };

    // ─── Counseling Queue Actions ───
    const handleApproveAndSchedule = async (e: any) => {
        e.preventDefault();
        if (!selectedCounselingReq) return;
        try {
            await supabase.from('counseling_requests').update({
                status: 'Scheduled',
                scheduled_date: `${scheduleData.date} ${scheduleData.time}`,
                resolution_notes: scheduleData.notes
            }).eq('id', selectedCounselingReq.id);
            // Notify student
            await supabase.from('notifications').insert([{ student_id: selectedCounselingReq.student_id, message: `Your counseling request has been approved and scheduled for ${scheduleData.date} at ${scheduleData.time} by ${data.profile.department}.` }]);
            showToastMessage('Request approved and session scheduled.', 'success');
            setShowScheduleModal(false);
            setShowCounselingViewModal(false);
            setScheduleData({ date: '', time: '', notes: '' });
        } catch (err: any) { showToastMessage(err.message, 'error'); }
    };

    const handleRejectRequest = async () => {
        if (!selectedCounselingReq) return;
        try {
            await supabase.from('counseling_requests').update({ status: 'Rejected', resolution_notes: rejectNotes }).eq('id', selectedCounselingReq.id);
            await supabase.from('notifications').insert([{ student_id: selectedCounselingReq.student_id, message: `Your counseling request has been reviewed and was not approved by ${data.profile.department}.${rejectNotes ? ' Reason: ' + rejectNotes : ''}` }]);
            showToastMessage('Request rejected.', 'success');
            setShowRejectModal(false);
            setShowCounselingViewModal(false);
            setRejectNotes('');
        } catch (err: any) { showToastMessage(err.message, 'error'); }
    };

    const handleCompleteRequest = async (req: any) => {
        try {
            await supabase.from('counseling_requests').update({ status: 'Completed' }).eq('id', req.id);
            await supabase.from('notifications').insert([{ student_id: req.student_id, message: `Your counseling session has been resolved and marked as Completed by ${data.profile.department}.` }]);
            showToastMessage('Request marked as completed.', 'success');
            setShowCounselingViewModal(false);
        } catch (err: any) { showToastMessage(err.message, 'error'); }
    };

    const handleStartForward = (req: any) => {
        setForwardingToStaff(true);
        setSelectedCounselingReq(req);
        setShowCounselingViewModal(false);
        const studentObj = filteredData.students.find((s: any) => s.id === req.student_id);
        setReferralForm({
            student: req.student_name,
            type: req.request_type || 'Self-Referral',
            notes: req.reason_for_referral || req.description || '',
            referrer_contact_number: '',
            relationship_with_student: 'Department Head',
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
        if (!confirm('Delete this record?')) return;
        try {
            const { error } = await supabase.from('counseling_requests').delete().eq('id', id);
            if (error) throw error;
            showToastMessage('Record deleted.');
        } catch (err: any) {
            showToastMessage("Error deleting: " + err.message, 'error');
        }
    };

    // ─── Admissions Actions ───
    const handleScheduleInterview = (app: any) => {
        setSelectedApplicant(app);
        setShowApplicantScheduleModal(true);
    };

    const confirmApplicantSchedule = async (e: any) => {
        e.preventDefault();
        try {
            console.log('[DEPT] Scheduling interview for:', selectedApplicant?.id, applicantScheduleData);
            const { error } = await supabase.from('applications').update({
                status: 'Interview Scheduled',
                interview_date: `${applicantScheduleData.date} ${applicantScheduleData.time}`
            }).eq('id', selectedApplicant.id);
            if (error) {
                console.error('[DEPT] Schedule update error:', error);
                showToastMessage('Failed to schedule: ' + error.message, 'error');
                return;
            }
            console.log('[DEPT] Interview scheduled successfully');
            showToastMessage('Interview scheduled successfully.', 'success');
            setShowApplicantScheduleModal(false);
            setApplicantScheduleData({ date: '', time: '', notes: '' });
        } catch (err: any) {
            console.error('[DEPT] Schedule exception:', err);
            showToastMessage(err.message, 'error');
        }
    };

    const handleApproveApplicant = async (app: any) => {
        if (!window.confirm(`Approve ${app.first_name} for enrollment in your department?`)) return;
        try {
            console.log('[DEPT] Approving applicant:', app.id);
            const { error } = await supabase.from('applications').update({ status: 'Approved for Enrollment' }).eq('id', app.id);
            if (error) {
                console.error('[DEPT] Approve error:', error);
                showToastMessage('Failed to approve: ' + error.message, 'error');
                return;
            }
            showToastMessage(`Applicant approved for enrollment.`, 'success');
        } catch (err: any) {
            console.error('[DEPT] Approve exception:', err);
            showToastMessage(err.message, 'error');
        }
    };

    const handleRejectApplicant = async (app: any) => {
        if (!window.confirm(`Reject ${app.first_name}? They will be forwarded to their next course choice.`)) return;
        try {
            const nextChoice = (app.current_choice || 1) + 1;
            let newStatus = '';

            if (nextChoice === 2 && app.alt_course_1) {
                newStatus = 'Forwarded to 2nd Choice for Interview';
            } else if (nextChoice === 3 && app.alt_course_2) {
                newStatus = 'Forwarded to 3rd Choice for Interview';
            } else {
                newStatus = 'Application Unsuccessful';
            }

            console.log('[DEPT] Rejecting applicant:', app.id, '→', newStatus);
            const { error } = await supabase.from('applications').update({
                status: newStatus,
                current_choice: nextChoice
            }).eq('id', app.id);

            if (error) {
                console.error('[DEPT] Reject error:', error);
                showToastMessage('Failed to reject: ' + error.message, 'error');
                return;
            }

            showToastMessage(`Applicant forwarded to next choice.`, 'success');
        } catch (err: any) {
            console.error('[DEPT] Reject exception:', err);
            showToastMessage(err.message, 'error');
        }
    };

    const handleProfileSubmit = async (e: any) => {
        e.preventDefault();
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
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/department/login');
    };

    const handleReferralSubmit = async (e: any) => {
        e.preventDefault();
        try {
            if (forwardingToStaff && selectedCounselingReq) {
                // Forward existing request to care staff
                const signatureData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                await supabase.from('counseling_requests').update({
                    status: 'Referred',
                    referred_by: data.profile.name,
                    referrer_contact_number: referralForm.referrer_contact_number,
                    relationship_with_student: referralForm.relationship_with_student,
                    reason_for_referral: referralForm.reason_for_referral,
                    actions_made: referralForm.actions_made,
                    date_duration_of_observations: referralForm.date_duration_of_observations,
                    referrer_signature: signatureData
                }).eq('id', selectedCounselingReq.id);
                // Notify student
                await supabase.from('notifications').insert([{ student_id: selectedCounselingReq.student_id, message: `Your counseling request has been forwarded to CARE Staff by ${data.profile.department} for further assistance.` }]);
                showToastMessage('Request forwarded to CARE Staff.', 'success');
            } else {
                // Direct referral by dept head (new request)
                const studentObj = filteredData.students.find((s: any) => s.name === referralForm.student);
                const sigData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                await supabase.from('counseling_requests').insert([{
                    student_id: studentObj?.id || 'UNKNOWN',
                    student_name: referralForm.student,
                    course_year: studentObj ? `${studentObj.course || ''} - ${studentObj.year || ''}` : '',
                    contact_number: studentObj?.mobile || '',
                    request_type: 'Dept Head Referral',
                    description: referralForm.reason_for_referral,
                    referred_by: data.profile.name,
                    referrer_contact_number: referralForm.referrer_contact_number,
                    relationship_with_student: referralForm.relationship_with_student,
                    reason_for_referral: referralForm.reason_for_referral,
                    actions_made: referralForm.actions_made,
                    date_duration_of_observations: referralForm.date_duration_of_observations,
                    referrer_signature: sigData,
                    department: data.profile.department,
                    status: 'Referred'
                }]);
                if (studentObj) await supabase.from('notifications').insert([{ student_id: studentObj.id, message: `You have been referred for counseling by ${data.profile.department}.` }]);
                showToastMessage('Referral submitted.');
            }
        } catch (err: any) { showToastMessage("Error: " + err.message, 'error'); }

        setShowReferralModal(false);
        setForwardingToStaff(false);
        setSelectedCounselingReq(null);
        setReferralForm({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
        if (sigCanvasRef.current) sigCanvasRef.current.clear();
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
        const { id, type: decision, notes } = decisionData;
        try {
            const { error } = await supabase.from('support_requests')
                .update({ status: decision, dept_notes: notes })
                .eq('id', id);
            if (error) throw error;
            showToastMessage(`Request ${decision}`);
            setSupportRequests(prev => prev.filter((r: any) => r.id !== id));
            setShowDecisionModal(false);
        } catch (err: any) { showToastMessage(err.message, 'error'); }
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
        counseling_queue: 'Counseling Requests',
        events: 'Dept. Events',
        support_approvals: 'Support Approvals',
        settings: 'Settings',
        students: 'Students',
        counseled: 'Counseled Students',
        reports: 'Reports',
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-dept-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-emerald-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div onClick={() => { setProfileForm(data.profile); setShowProfileModal(true); }} className="flex items-center gap-3 cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-600/30 text-sm">DH</div>
                        <div>
                            <h1 className="font-bold text-white text-lg tracking-tight">{data.profile.name}</h1>
                            <p className="text-emerald-300/70 text-xs font-medium truncate max-w-[160px]">{data.profile.department}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-emerald-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
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
                            { id: 'counseling_queue', icon: <ClipboardList size={18} />, label: 'Counseling Requests', hasIndicator: counselingRequests.filter((r: any) => r.status === 'Submitted').length > 0 },
                            { id: 'events', icon: <CalendarDays size={18} />, label: 'Dept. Events' },
                            { id: 'support_approvals', icon: <HeartHandshake size={18} />, label: 'Support Approvals', hasIndicator: supportRequests.length > lastSeenSupportCount },
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
                        <h2 className="text-xl font-bold gradient-text-green capitalize">{(moduleLabels as any)[activeModule] || activeModule}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 hover:text-emerald-600 hover:shadow-md transition-all relative border border-gray-100">
                            <Bell size={20} />
                        </button>
                    </div>
                </header>

                <div key={activeModule} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">

                    {/* DASHBOARD / HOME */}
                    {activeModule === 'dashboard' && (
                        <DeptHomePage
                            clock={clock}
                            filteredData={filteredData}
                            counselingRequests={counselingRequests}
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
                        />
                    )}

                    {/* ADMISSIONS SCREENING */}
                    {activeModule === 'admissions' && (
                        <DeptAdmissionsPage
                            applicants={admissionApplicants}
                            handleApproveApplicant={handleApproveApplicant}
                            handleRejectApplicant={handleRejectApplicant}
                            handleScheduleInterview={handleScheduleInterview}
                        />
                    )}

                    {/* REPORTS */}
                    {activeModule === 'reports' && (
                        <DeptReportsPage chartData={chartData} />
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
                filteredData,
                showProfileModal, setShowProfileModal, profileForm, setProfileForm, handleProfileSubmit,
                showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff,
                referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq,
                referralSearchQuery, setReferralSearchQuery, sigCanvasRef,
                showHistoryModal, setShowHistoryModal, selectedHistoryStudent, exportPDF: (name: string) => exportPDF(name, filteredData.requests),
                showStudentModal, setShowStudentModal, selectedStudent,
                showEventAttendees, setShowEventAttendees, deptAttendees,
                yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
                deptSectionFilter, setDeptSectionFilter, exportToExcel,
                showDecisionModal, setShowDecisionModal, decisionData, setDecisionData, submitDecision,
                showApplicantScheduleModal, setShowApplicantScheduleModal, applicantScheduleData, setApplicantScheduleData, confirmApplicantSchedule
            })}

        </div >
    );
}
