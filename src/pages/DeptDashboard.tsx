import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import DeptHomePage from './dept/DeptHomePage';
import DeptCounselingQueuePage from './dept/DeptCounselingQueuePage';
import DeptSupportApprovalsPage from './dept/DeptSupportApprovalsPage';
import DeptEventsPage from './dept/DeptEventsPage';
import DeptStudentsPage from './dept/DeptStudentsPage';
import DeptCounseledPage from './dept/DeptCounseledPage';
import DeptReportsPage from './dept/DeptReportsPage';
import DeptSettingsPage from './dept/DeptSettingsPage';
import DeptAdmissionsPage from './dept/DeptAdmissionsPage';
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
import jsPDF from 'jspdf';
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
    const [data, setData] = useState<any>(null);
    const [toast, setToast] = useState<any>(null);

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
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [showEventAttendees, setShowEventAttendees] = useState<any>(null);
    const [deptAttendees, setDeptAttendees] = useState<any[]>([]);
    const [yearLevelFilter, setYearLevelFilter] = useState<string>('All');
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [lastSeenSupportCount, setLastSeenSupportCount] = useState<number>(0);

    // Admissions Screening State
    const [admissionApplicants, setAdmissionApplicants] = useState<any[]>([]);
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

    // Initialize Data from Session
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/department/login');
            return;
        }

        if (session) {
            setData({
                profile: {
                    name: session.full_name,
                    department: session.department || 'Unassigned',
                    email: session.email,
                    id: session.id
                },
                students: [],
                requests: [],
                settings: {
                    referralReasons: ['Academic Performance', 'Attendance Issues', 'Behavioral Concern', 'Career Guidance', 'Personal/Emotional'],
                    darkMode: false
                }
            });
        }
    }, [isAuthenticated, session, navigate]);

    // Fetch Real Students, Courses, and Departments
    useEffect(() => {
        const fetchStudents = async () => {
            if (!data?.profile) return;
            // 1. Fetch Students
            const { data: studentsData } = await supabase.from('students').select('*');

            // 2. Fetch Courses and Departments to map dynamically
            const { data: coursesData } = await supabase.from('courses').select('id, name, department_id');
            const { data: deptsData } = await supabase.from('departments').select('id, name');

            const courseMap: any = {};
            if (coursesData && deptsData) {
                const deptMap: any = {};
                deptsData.forEach(d => deptMap[d.id] = d.name);
                coursesData.forEach(c => courseMap[c.name.trim().toLowerCase()] = deptMap[c.department_id] || 'Unassigned');
            }

            if (studentsData) {
                const mappedStudents = studentsData.map(s => ({
                    id: s.student_id,
                    name: `${s.first_name} ${s.last_name}`,
                    email: s.email || 'No Email',
                    year: s.year_level,
                    status: s.status,
                    department: s.department || courseMap[s.course?.trim().toLowerCase()] || 'Unassigned',
                    course: s.course,
                    ...s
                }));
                setData((prev: any) => ({ ...prev, students: mappedStudents, courseMap }));
            }
        };

        if (data?.profile) {
            fetchStudents();
            const channel = supabase.channel('dept_students_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudents)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [data?.profile]);

    // Dark Mode Effect
    useEffect(() => {
        if (data?.settings?.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [data?.settings?.darkMode]);

    // Fetch Events (Always Active)
    useEffect(() => {
        const fetchEvents = async () => {
            const { data: eventsData } = await supabase
                .from('events').select('*').order('created_at', { ascending: false });
            if (eventsData) setEventsList(eventsData);
        };

        fetchEvents();
        const channel = supabase.channel('dept_events_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchEvents)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    // Fetch Counseling Requests
    useEffect(() => {
        if (!data?.profile?.department) return;

        const fetchRequests = async () => {
            // console.log("DeptDashboard: Fetching requests for department:", data.profile.department);
            const { data: reqs, error } = await supabase
                .from('counseling_requests')
                .select('*')
                .eq('department', data.profile.department)
                .order('created_at', { ascending: false });

            if (error) console.error("DeptDashboard: Error fetching requests:", error);
            if (reqs) {
                setCounselingRequests(reqs);
            }
        };

        fetchRequests();
        const channel = supabase
            .channel('dept_counseling')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `department=eq.${data.profile.department}` }, (payload: any) => {
                console.log("DeptDashboard: Update Payload:", payload);
                fetchRequests();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Counseling Request Received`, 'info');
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department]);

    // Fetch Admissions Applicants
    useEffect(() => {
        if (!data?.profile?.department || !data?.courseMap) return;

        const fetchAdmissions = async () => {
            const { data: apps, error } = await supabase
                .from('applications')
                .select('*')
                .in('status', ['Qualified for Interview (1st Choice)', 'Forwarded to 2nd Choice for Interview', 'Forwarded to 3rd Choice for Interview', 'Interview Scheduled'])
                .order('created_at', { ascending: false });

            if (apps) {
                // Filter apps to those routed to THIS department head
                const myDeptApps = apps.filter((app: any) => {
                    const activeChoice = app.current_choice || 1;
                    const activeCourse = activeChoice === 1 ? app.priority_course : activeChoice === 2 ? app.alt_course_1 : app.alt_course_2;

                    const mappedDept = data.courseMap[activeCourse?.trim().toLowerCase()];
                    console.log(`\n============================`);
                    console.log(`[DEBUG] ADMISSIONS MATCHING:`);
                    console.log(`  - Applicant: ${app.first_name} ${app.last_name}`);
                    console.log(`  - Active Course: "${activeCourse}"`);
                    console.log(`  - Mapped Dept (from Supabase): "${mappedDept}"`);
                    console.log(`  - My Dept Profile (from Session): "${data.profile.department}"`);
                    console.log(`  - MATCHED? ${mappedDept === data.profile.department}`);
                    console.log(`============================\n`);

                    // Route using dynamic course map matched from the db
                    const belongsToDept = mappedDept === data.profile.department;
                    return belongsToDept;
                });
                setAdmissionApplicants(myDeptApps);
            }
        };

        fetchAdmissions();
        const channel = supabase.channel('dept_admissions_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, fetchAdmissions)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department, data?.courseMap]);

    // Fetch Support Requests
    useEffect(() => {
        if (!data?.profile?.department) return;

        const fetchSupport = async () => {
            const { data: reqs } = await supabase
                .from('support_requests')
                .select('*')
                .eq('department', data.profile.department)
                .eq('status', 'Forwarded to Dept')
                .order('created_at', { ascending: false });
            if (reqs) setSupportRequests(reqs);
        };

        fetchSupport();
        const channel = supabase
            .channel('dept_support_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'support_requests',
                filter: `department=eq.${data.profile.department}`
            }, (payload: any) => {
                if (payload.new && payload.new.status === 'Forwarded to Dept') {
                    setToast({ msg: "New Support Request Received", type: "success" });
                    setTimeout(() => setToast(null), 3000);
                }
                fetchSupport();
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department, activeModule]);

    // Mark support requests as seen
    useEffect(() => {
        if (activeModule === 'support_approvals') {
            setLastSeenSupportCount(supportRequests.length);
        }
    }, [activeModule, supportRequests]);

    if (!data) return null;

    const showToastMessage = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

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

    const exportPDF = (studentName: any) => {
        const records = data.requests.filter((r: any) => r.student === studentName);
        const doc = new jsPDF();
        doc.text(`${studentName}'s History`, 14, 22);
        (doc as any).autoTable({
            head: [["Date", "Type", "Status", "ID"]],
            body: records.map((r: any) => [r.date, r.type, r.status, r.id]),
            startY: 30,
        });
        doc.save(`${studentName}_History.pdf`);
    };

    const exportToExcel = (headers: any, rows: any, fileName: string) => {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
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

            {/* Applicant Scheduling Modal */}
            {showApplicantScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Schedule Department Interview</h3>
                            <button onClick={() => setShowApplicantScheduleModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={confirmApplicantSchedule} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Interview Date</label>
                                <input required type="date" value={applicantScheduleData.date} onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Interview Time</label>
                                <input required type="time" value={applicantScheduleData.time} onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Confirm Schedule</button>
                        </form>
                    </div>
                </div>
            )}

            {
                toast && (
                    <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <div className="text-xl">{toast.type === 'error' ? '!' : '✓'}</div>
                        <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                    </div>
                )
            }

            {/* MODALS */}

            {/* Profile Modal */}
            {
                showProfileModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Edit Profile</h3>
                                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Name</label><input value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Department</label><input value={profileForm.department || ''} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400" /></div>
                                <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Save Changes</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Referral Modal — NORSU Counseling Referral Form */}
            {
                showReferralModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                                <div>
                                    <h3 className="font-bold text-lg">{forwardingToStaff ? 'Forward to CARE Staff — Referral Form' : 'NORSU Counseling Referral Form'}</h3>
                                    <p className="text-xs text-gray-400">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                </div>
                                <button onClick={() => { setShowReferralModal(false); setForwardingToStaff(false); }} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                            </div>
                            <form onSubmit={handleReferralSubmit} className="p-6 space-y-5">
                                {/* Student Selection (only for direct referrals) */}
                                {!forwardingToStaff && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Name of Student <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <input type="text" value={referralSearchQuery} onChange={(e) => { setReferralSearchQuery(e.target.value); if (referralForm.student) setReferralForm({ ...referralForm, student: '' }); }} placeholder="Search student name..." className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                                            {referralSearchQuery && !referralForm.student && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto z-20">
                                                    {filteredData.students.filter((s: any) => s.name.toLowerCase().includes(referralSearchQuery.toLowerCase())).slice(0, 8).map((s: any) => (
                                                        <button key={s.id} type="button" onClick={() => { setReferralForm({ ...referralForm, student: s.name }); setReferralSearchQuery(s.name); }} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm border-b border-gray-50 last:border-0">
                                                            <span className="font-bold">{s.name}</span><span className="text-gray-400 ml-2 text-xs">{s.course} - {s.year}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Auto-filled student info */}
                                {(forwardingToStaff || referralForm.student) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Name of Student</p><p className="text-sm font-semibold text-gray-900">{referralForm.student}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Course & Year</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = filteredData.students.find((st: any) => st.name === referralForm.student); return s ? `${s.course || ''} - ${s.year || ''}` : (selectedCounselingReq?.course_year || 'N/A'); })()}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Contact Number</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = filteredData.students.find((st: any) => st.name === referralForm.student); return s?.mobile || selectedCounselingReq?.contact_number || 'N/A'; })()}</p></div>
                                    </div>
                                )}

                                {/* Referrer Info (auto-filled) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Referred by</label><input readOnly value={data?.profile?.name || ''} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-gray-100 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Referrer Contact Number</label><input value={referralForm.referrer_contact_number} onChange={e => setReferralForm({ ...referralForm, referrer_contact_number: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" placeholder="Your contact number" /></div>
                                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Relationship with Student</label><input value={referralForm.relationship_with_student} onChange={e => setReferralForm({ ...referralForm, relationship_with_student: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" placeholder="e.g. Department Head, Faculty Adviser" /></div>
                                </div>

                                {/* Reason for Referral */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Reason for Referral <span className="text-red-400">*</span></label>
                                    <textarea value={referralForm.reason_for_referral} onChange={e => setReferralForm({ ...referralForm, reason_for_referral: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-28" placeholder="Describe the reason for referring this student..." required></textarea>
                                </div>

                                {/* Actions Made */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Actions Made by Referring Person</label>
                                    <textarea value={referralForm.actions_made} onChange={e => setReferralForm({ ...referralForm, actions_made: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-24" placeholder="What actions have you taken before referring this student?"></textarea>
                                </div>

                                {/* Date/Duration of Observations */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Observations</label>
                                    <textarea value={referralForm.date_duration_of_observations} onChange={e => setReferralForm({ ...referralForm, date_duration_of_observations: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-20" placeholder="e.g. Observed since February 2026, approximately 2 weeks"></textarea>
                                </div>

                                {/* Signature Pad */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Name and Signature of the Referring Person <span className="text-red-400">*</span></label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                                        <SignatureCanvas
                                            ref={sigCanvasRef}
                                            penColor="#1a1a2e"
                                            canvasProps={{ className: 'w-full', style: { width: '100%', height: '150px' } }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-[10px] text-gray-400">Draw your signature above</p>
                                        <button type="button" onClick={() => sigCanvasRef.current?.clear()} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear Signature</button>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg shadow-emerald-200/50 transition-all">{forwardingToStaff ? 'Forward to CARE Staff' : 'Submit Referral'}</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                showHistoryModal && selectedHistoryStudent && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <div>
                                    <h3 className="font-bold text-lg dark:text-white">Case History: {selectedHistoryStudent.student_name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedHistoryStudent.student_id}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => exportPDF(selectedHistoryStudent.student_name)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300">Export PDF</button>
                                    <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                                </div>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                {filteredData.requests.filter((r: any) => r.student_name === selectedHistoryStudent.student_name).map((record: any, i: any) => (
                                    <div key={i} className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                                        <div className="mb-1 flex justify-between">
                                            <span className="font-bold text-gray-900 dark:text-white">{record.request_type}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(record.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">{record.description}</p>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${record.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{record.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Student Details Modal */}
            {
                showStudentModal && selectedStudent && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col dark:bg-gray-800 animate-slide-in-up">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 dark:border-gray-700">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">Student Profile</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Read-only view of student details</p>
                                </div>
                                <button onClick={() => setShowStudentModal(false)} className="p-2 hover:bg-gray-200 rounded-full transition text-gray-400 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"><XCircle size={24} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white dark:bg-gray-800">
                                {/* Personal Information */}
                                <section>
                                    <h4 className="font-bold text-sm text-blue-600 mb-4 border-b border-blue-100 pb-2 flex items-center gap-2 dark:text-blue-400 dark:border-gray-700"><User size={16} /> Personal Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">First Name</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.first_name || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Last Name</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.last_name || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Middle Name</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.middle_name || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Suffix</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.suffix || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Date of Birth</label><input readOnly type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.dob || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Place of Birth</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.place_of_birth || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Sex</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.sex || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Gender Identity</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.gender_identity || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Civil Status</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.civil_status || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Nationality</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.nationality || ''} /></div>
                                    </div>
                                </section>

                                {/* Contact & Address */}
                                <section>
                                    <h4 className="font-bold text-sm text-green-600 mb-4 border-b border-green-100 pb-2 flex items-center gap-2 dark:text-green-400 dark:border-gray-700"><MapPin size={16} /> Address & Contact</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Street / Info</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.street || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">City/Municipality</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.city || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Province</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.province || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Zip Code</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.zip_code || ''} /></div>

                                        <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Full Address String (Legacy)</label><textarea readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" rows={1} value={selectedStudent.address || ''}></textarea></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Mobile</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.mobile || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Email</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.email || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Facebook URL</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.facebook_url || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Emergency Contact</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.emergency_contact || ''} /></div>
                                    </div>
                                </section>

                                {/* Academic Info */}
                                <section>
                                    <h4 className="font-bold text-sm text-purple-600 mb-4 border-b border-purple-100 pb-2 flex items-center gap-2 dark:text-purple-400 dark:border-gray-700"><GraduationCap size={16} /> Academic Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Student ID</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.student_id || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Department</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.department || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Course</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.course || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Year Level</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.year_level || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Status</label><input readOnly className={`w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm font-bold input-readonly dark:bg-gray-700 dark:border-gray-600 ${selectedStudent.status === 'Active' ? 'text-green-600' : 'text-red-600'}`} value={selectedStudent.status || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">School Last Attended</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.school_last_attended || ''} /></div>

                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Priority Course</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.priority_course || ''} /></div>
                                        <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Alt Course 1</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.alt_course_1 || ''} /></div>
                                    </div>
                                </section>

                                {/* Additional Info */}
                                <section>
                                    <h4 className="font-bold text-sm text-orange-600 mb-4 border-b border-orange-100 pb-2 flex items-center gap-2 dark:text-orange-400 dark:border-gray-700"><Info size={16} /> Additional Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.is_working_student || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">Working Student</label>
                                        </div>
                                        {selectedStudent.is_working_student && <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Working Type</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.working_student_type || ''} /></div>}

                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.is_pwd || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">PWD</label>
                                        </div>
                                        {selectedStudent.is_pwd && <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Disability Type</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.pwd_type || ''} /></div>}

                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.is_indigenous || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">Indigenous Person</label>
                                        </div>
                                        {selectedStudent.is_indigenous && <div><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Group</label><input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.indigenous_group || ''} /></div>}

                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.witnessed_conflict || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">Witnessed Conflict?</label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.is_solo_parent || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">Solo Parent</label>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={selectedStudent.is_child_of_solo_parent || false} readOnly className="rounded text-purple-600 focus:ring-0 cursor-not-allowed" />
                                            <label className="text-sm text-gray-700 font-bold dark:text-gray-300">Child of Solo Parent</label>
                                        </div>

                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Supporter Name</label>
                                            <input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mb-2 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.supporter || ''} />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Supporter Contact</label>
                                            <input readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm mb-2 text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" value={selectedStudent.supporter_contact || ''} />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Attendees Modal - Enhanced */}
            {
                showEventAttendees && (() => {
                    const yearLevels = [...new Set(deptAttendees.map(a => a.year_level).filter(Boolean))].sort();
                    const attCourses = [...new Set(deptAttendees.map(a => a.course).filter(Boolean))].sort();
                    const attSections = [...new Set(deptAttendees.map(a => a.section).filter(Boolean))].sort();
                    let filtered = deptAttendees;
                    if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
                    if (deptCourseFilter !== 'All') filtered = filtered.filter(a => a.course === deptCourseFilter);
                    if (deptSectionFilter !== 'All') filtered = filtered.filter(a => a.section === deptSectionFilter);
                    const completedCount = deptAttendees.filter(a => a.time_out).length;

                    return (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-backdrop">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-scale-in">
                                <div className="p-6 border-b bg-gray-50 rounded-t-2xl dark:bg-gray-700 dark:border-gray-600">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">Attendees List</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{showEventAttendees.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => {
                                                if (filtered.length === 0) return;
                                                const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                                                const rows = filtered.map(a => [
                                                    a.student_name,
                                                    a.department || '',
                                                    a.course || '',
                                                    a.year_level || '',
                                                    a.section || '',
                                                    new Date(a.time_in).toLocaleString(),
                                                    a.time_out ? new Date(a.time_out).toLocaleString() : '-',
                                                    a.time_out ? 'Completed' : 'Still In'
                                                ]);
                                                exportToExcel(headers, rows, `${showEventAttendees.title}_attendees`);
                                            }} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500">
                                                <Download size={14} /> Export Excel
                                            </button>
                                            <button onClick={() => { setShowEventAttendees(null); setYearLevelFilter('All'); setDeptCourseFilter('All'); setDeptSectionFilter('All'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs mb-3">
                                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold dark:bg-blue-900/30 dark:text-blue-300">{deptAttendees.length} Total</span>
                                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold dark:bg-green-900/30 dark:text-green-300">{completedCount} Completed</span>
                                        <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold dark:bg-yellow-900/30 dark:text-yellow-300">{deptAttendees.length - completedCount} Still In</span>
                                    </div>
                                    {yearLevels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Year:</span>
                                            <button onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>All</button>
                                            {yearLevels.map(yl => {
                                                const count = deptAttendees.filter(a => a.year_level === yl).length;
                                                return <button key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>{yl} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attCourses.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Course:</span>
                                            <button onClick={() => setDeptCourseFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === 'All' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attCourses.map(c => {
                                                const count = deptAttendees.filter(a => a.course === c).length;
                                                return <button key={c} onClick={() => setDeptCourseFilter(c)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{c} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attSections.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Section:</span>
                                            <button onClick={() => setDeptSectionFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attSections.map(s => {
                                                const count = deptAttendees.filter(a => a.section === s).length;
                                                return <button key={s} onClick={() => setDeptSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === s ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>Sec {s} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                                    {filtered.length === 0 ? <p className="text-center py-8 text-gray-500 dark:text-gray-400">No attendees yet.</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 dark:bg-gray-700 dark:text-gray-300">
                                                <tr>
                                                    <th className="px-6 py-3">Student</th>
                                                    <th className="px-6 py-3">Course</th>
                                                    <th className="px-6 py-3">Year / Sec</th>
                                                    <th className="px-6 py-3">Time In</th>
                                                    <th className="px-6 py-3">Time Out</th>
                                                    <th className="px-6 py-3">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {filtered.map((att, i) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-3">
                                                            <p className="font-bold text-gray-900 dark:text-white">{att.student_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{att.department}</p>
                                                        </td>
                                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium dark:text-gray-400">{att.course || '-'}</td>
                                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium dark:text-gray-400">{att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}</td>
                                                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td className="px-6 py-3">{att.time_out ? <span className="text-green-600 font-medium dark:text-green-400">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 text-xs font-bold dark:text-yellow-400">Still In</span>}</td>
                                                        <td className="px-6 py-3 text-xs">
                                                            {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1 dark:text-blue-400"><MapPin size={12} />Map</a> : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Decision Modal */}
            {
                showDecisionModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Confirm {decisionData.type}</h3>
                                <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Are you sure you want to <strong>{decisionData.type}</strong> this request?
                                    {decisionData.type === 'Approved' ? ' This will refer it back to CARE Staff for final processing.' : ' This will close the request.'}
                                </p>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Notes / Remarks</label>
                                    <textarea value={decisionData.notes} onChange={e => setDecisionData({ ...decisionData, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required></textarea>
                                </div>
                                <button onClick={submitDecision} className={`w-full py-2 text-white rounded-lg font-bold ${decisionData.type === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    Confirm {decisionData.type}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}
