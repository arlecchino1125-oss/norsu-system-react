import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
    LayoutDashboard, CalendarDays, HeartHandshake, Settings, Users, ClipboardList,
    LogOut, UserCircle, Menu, FileText, CheckCircle, XCircle, Info, Trash2,
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
import { Bar } from 'react-chartjs-2';
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
    const { session, isAuthenticated, logout } = useAuth();
    const clock = useLiveClock();
    const [activeModule, setActiveModule] = useState('dashboard');
    const [data, setData] = useState(null);
    const [toast, setToast] = useState(null);

    // Modals
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showReferralModal, setShowReferralModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showDecisionModal, setShowDecisionModal] = useState(false);
    const [decisionData, setDecisionData] = useState({ id: null, type: '', notes: '' });
    const [selectedSupportRequest, setSelectedSupportRequest] = useState(null);

    // Events State
    const [eventsList, setEventsList] = useState([]);
    const [showEventAttendees, setShowEventAttendees] = useState(null);
    const [deptAttendees, setDeptAttendees] = useState([]);
    const [yearLevelFilter, setYearLevelFilter] = useState('All');
    const [counselingRequests, setCounselingRequests] = useState([]);
    const [supportRequests, setSupportRequests] = useState([]);
    const [lastSeenSupportCount, setLastSeenSupportCount] = useState(0);

    // Filters & Inputs
    const [studentSearch, setStudentSearch] = useState('');
    const [counseledSearch, setCounseledSearch] = useState('');
    const [counseledDate, setCounseledDate] = useState('');
    const [newReason, setNewReason] = useState('');

    // Forms
    const [profileForm, setProfileForm] = useState({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [referralForm, setReferralForm] = useState({ student: '', type: '', notes: '' });

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

    // Helper to determine department from course
    const getDepartment = React.useCallback((course) => {
        if (!course) return 'Unassigned';
        const c = course.toLowerCase();
        if (c.includes('agriculture') || c.includes('forestry')) return 'College of Agriculture and Forestry';
        if (c.includes('criminology') || c.includes('criminal justice')) return 'College of Criminal Justice Education';
        if (c.includes('information technology')) return 'College of Information Technology';
        if (c.includes('midwifery') || c.includes('computer science')) return 'College of Arts and Sciences';
        if (c.includes('engineering')) return 'College of Engineering';
        if (c.includes('education') || c.includes('teacher')) return 'College of Education';
        if (c.includes('nursing')) return 'College of Nursing';
        if (c.includes('accountancy') || c.includes('business')) return 'College of Business';
        return 'College of Arts and Sciences';
    }, []);

    // Fetch Real Students from Supabase
    useEffect(() => {
        const fetchStudents = async () => {
            if (!data?.profile) return;
            const { data: studentsData } = await supabase.from('students').select('*');
            if (studentsData) {
                const mappedStudents = studentsData.map(s => ({
                    id: s.student_id,
                    name: `${s.first_name} ${s.last_name}`,
                    email: s.email || 'No Email',
                    year: s.year_level,
                    status: s.status,
                    department: s.department || getDepartment(s.course),
                    course: s.course,
                    ...s
                }));
                setData(prev => ({ ...prev, students: mappedStudents }));
            }
        };

        if (data?.profile) {
            fetchStudents();
            const channel = supabase.channel('dept_students_realtime')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudents)
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [data?.profile, getDepartment]);

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests', filter: `department=eq.${data.profile.department}` }, (payload) => {
                console.log("DeptDashboard: Update Payload:", payload);
                fetchRequests();
                if (payload.eventType === 'INSERT') {
                    showToastMessage(`New Counseling Request Received`, 'info');
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [data?.profile?.department]);

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
            }, (payload) => {
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

    const showToastMessage = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const getFilteredData = () => {
        const dept = data.profile.department;
        const filteredStudents = data.students.filter(s => s.department === dept);

        const activeStudents = filteredStudents.filter(s => s.status === 'Active');
        const populationByYear = {
            '1st Year': activeStudents.filter(s => s.year === '1st Year').length,
            '2nd Year': activeStudents.filter(s => s.year === '2nd Year').length,
            '3rd Year': activeStudents.filter(s => s.year === '3rd Year').length,
            '4th Year': activeStudents.filter(s => s.year === '4th Year').length,
        };

        return { ...data, students: filteredStudents, requests: counselingRequests, populationStats: populationByYear };
    };

    const filteredData = getFilteredData();

    // Chart Data Preparation
    const approved = filteredData.requests.filter(r => r.status === 'Approved').length;
    const rejected = filteredData.requests.filter(r => r.status === 'Rejected').length;
    const pending = filteredData.requests.filter(r => r.status === 'Pending').length;

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

    // Actions
    const updateRequestStatus = async (req, status) => {
        try {
            const newStatus = status === 'Approved' ? 'Referred' : 'Rejected';
            await supabase.from('counseling_requests').update({ status: newStatus }).eq('id', req.id);

            if (status === 'Approved') {
                await supabase.from('notifications').insert([{
                    student_id: req.student_id,
                    message: `Your counseling request has been approved by ${data.profile.department} and referred to Care Staff.`
                }]);
            }
            showToastMessage(`Request ${status}.`, 'success');
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const deleteRequest = async (id) => {
        if (!confirm('Delete this record?')) return;
        try {
            const { error } = await supabase.from('counseling_requests').delete().eq('id', id);
            if (error) throw error;
            showToastMessage('Record deleted.');
        } catch (err) {
            showToastMessage("Error deleting: " + err.message, 'error');
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('staff_accounts')
                .update({
                    full_name: profileForm.name
                })
                .eq('id', session.id);

            if (error) throw error;

            setData(prev => ({
                ...prev,
                profile: { ...prev.profile, name: profileForm.name }
            }));
            setShowProfileModal(false);
            showToastMessage('Profile updated.');
        } catch (err) {
            showToastMessage("Error updating profile: " + err.message, 'error');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/department/login');
    };

    const handleReferralSubmit = async (e) => {
        e.preventDefault();
        try {
            const studentObj = filteredData.students.find(s => s.name === referralForm.student);
            await supabase.from('counseling_requests').insert([{
                student_id: studentObj?.id || 'UNKNOWN',
                student_name: referralForm.student,
                request_type: referralForm.type,
                description: referralForm.notes,
                department: data.profile.department,
                status: 'Referred'
            }]);
            if (studentObj) await supabase.from('notifications').insert([{ student_id: studentObj.id, message: `You have been referred for counseling by ${data.profile.department}.` }]);

            showToastMessage('Referral submitted.');
        } catch (err) { showToastMessage("Error: " + err.message, 'error'); }

        setShowReferralModal(false);
        setReferralForm({ student: '', type: '', notes: '' });
    };

    const addReason = () => {
        if (!newReason.trim()) return;
        const newData = { ...data };
        newData.settings.referralReasons.push(newReason);
        setData(newData);
        setNewReason('');
    };

    const deleteReason = (idx) => {
        const newData = { ...data };
        newData.settings.referralReasons.splice(idx, 1);
        setData(newData);
    };

    const exportPDF = (studentName) => {
        const records = data.requests.filter(r => r.student === studentName);
        const doc = new jsPDF();
        doc.text(`${studentName}'s History`, 14, 22);
        doc.autoTable({
            head: [["Date", "Type", "Status", "ID"]],
            body: records.map(r => [r.date, r.type, r.status, r.id]),
            startY: 30,
        });
        doc.save(`${studentName}_History.pdf`);
    };

    const exportToExcel = (headers, rows, fileName) => {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${fileName}.xlsx`);
    };

    const handleViewDeptAttendees = async (event) => {
        const myDept = data.profile.department;
        try {
            const { data: attendeesData, error } = await supabase
                .from('event_attendance')
                .select('*')
                .eq('event_id', event.id)
                .eq('department', myDept)
                .order('time_in', { ascending: false });

            if (error) throw error;

            // Enrich with year_level from students table
            let enriched = attendeesData || [];
            if (enriched.length > 0) {
                const studentIds = [...new Set(enriched.map(a => a.student_id).filter(Boolean))];
                if (studentIds.length > 0) {
                    const { data: studs } = await supabase.from('students').select('student_id, year_level').in('student_id', studentIds);
                    const ylMap = {};
                    (studs || []).forEach(s => { ylMap[s.student_id] = s.year_level; });
                    enriched = enriched.map(a => ({ ...a, year_level: ylMap[a.student_id] || '' }));
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

    const openDecisionModal = (id, type) => {
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
            setSupportRequests(prev => prev.filter(r => r.id !== id));
            setShowDecisionModal(false);
        } catch (err) { showToastMessage(err.message, 'error'); }
    };

    const renderDetailedDescription = (desc) => {
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
                    ].map(item => (
                        <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Services</p>
                        {[
                            { id: 'events', icon: <CalendarDays size={18} />, label: 'Dept. Events' },
                            { id: 'support_approvals', icon: <HeartHandshake size={18} />, label: 'Support Approvals', hasIndicator: supportRequests.length > lastSeenSupportCount },
                        ].map(item => (
                            <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                                {item.hasIndicator && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Management</p>
                        {[
                            { id: 'students', icon: <Users size={18} />, label: 'Students' },
                            { id: 'counseled', icon: <ClipboardList size={18} />, label: 'Counseled Students' },
                        ].map(item => (
                            <button key={item.id} onClick={() => setActiveModule(item.id)} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">System</p>
                        {[
                            { id: 'settings', icon: <Settings size={18} />, label: 'Settings' },
                        ].map(item => (
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
                        <h2 className="text-xl font-bold gradient-text-green capitalize">{moduleLabels[activeModule] || activeModule}</h2>
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
                        <div className="space-y-8 animate-fade-in">
                            {/* Welcome Hero with Live Clock */}
                            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-8 md:p-10 text-white shadow-2xl shadow-emerald-900/20">
                                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                                <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl -ml-16 -mb-16" />
                                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-green-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

                                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                                    <div className="text-center lg:text-left flex-1">
                                        <p className="text-emerald-300/80 text-sm font-medium tracking-wide uppercase mb-2 animate-fade-in-up">{clock.greeting}</p>
                                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                                            Welcome to <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-green-300 bg-clip-text text-transparent">Dept. Head Portal</span>
                                        </h1>
                                        <p className="text-emerald-200/70 text-base mb-6 max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                                            Manage your department's student welfare, approve requests, and monitor academic performance.
                                        </p>
                                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                                            <button onClick={() => setActiveModule('students')} className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:scale-[1.02] transition-all duration-200">
                                                <Users size={18} /> View Students
                                            </button>
                                            <button onClick={() => setActiveModule('events')} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-200">
                                                <CalendarDays size={18} /> Events
                                            </button>
                                        </div>
                                    </div>

                                    {/* Live Clock */}
                                    <div className="text-center flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                                        <div className="relative">
                                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-6 min-w-[260px]">
                                                <div className="flex items-baseline justify-center gap-1 mb-3">
                                                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{clock.h}</span>
                                                    <span className="text-5xl md:text-6xl font-light text-emerald-300 animate-pulse">:</span>
                                                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{clock.m}</span>
                                                    <span className="text-5xl md:text-6xl font-light text-emerald-300 animate-pulse">:</span>
                                                    <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-emerald-300">{clock.s}</span>
                                                    <span className="text-lg font-bold text-emerald-400 ml-2 self-start mt-2">{clock.ampm}</span>
                                                </div>
                                                <p className="text-emerald-300/70 text-sm font-medium">{clock.dateString}</p>
                                            </div>
                                            <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-3xl -z-10" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                                {[
                                    { label: 'Total Requests', value: filteredData.requests.length, icon: <FileText size={20} />, gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
                                    { label: 'Pending Approval', value: filteredData.requests.filter(r => r.status === 'Submitted' || r.status === 'Pending').length, icon: <Info size={20} />, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
                                    { label: 'Referred', value: filteredData.requests.filter(r => r.status === 'Referred' || r.status === 'Scheduled').length, icon: <CheckCircle size={20} />, gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
                                    { label: 'Total Students', value: filteredData.students.length, icon: <Users size={20} />, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' }
                                ].map((card, idx) => (
                                    <div key={idx} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100/80 flex flex-col justify-between h-32 animate-fade-in-up">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 font-medium text-sm">{card.label}</span>
                                            <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl text-white shadow-lg`}>{card.icon}</div>
                                        </div>
                                        <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                                    </div>
                                ))}
                            </div>

                            {/* Population + Quick Launch */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Population by Year */}
                                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-emerald-500" /> Live Student Population (Active)</h3>
                                    <div className="grid grid-cols-4 gap-4 text-center">
                                        {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
                                            <div key={year} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{year}</p>
                                                <p className="text-2xl font-extrabold text-emerald-700">{filteredData.populationStats?.[year] || 0}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-5 space-y-3 card-hover">
                                    <h3 className="font-bold text-gray-900 px-1 flex items-center gap-2"><Settings size={16} className="text-emerald-500" /> Quick Actions</h3>
                                    <button onClick={() => { setReferralForm({ student: '', type: '', notes: '' }); setShowReferralModal(true); }} className="card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 flex items-start gap-4 group">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform"><UserPlus size={18} /></div>
                                        <div><h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">Refer Student</h4><p className="text-xs text-gray-500">Submit a counseling referral</p></div>
                                    </button>
                                    <button onClick={() => setActiveModule('reports')} className="card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-200 flex items-start gap-4 group">
                                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-105 transition-transform"><BarChart3 size={18} /></div>
                                        <div><h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">View Reports</h4><p className="text-xs text-gray-500">Statistics & charts</p></div>
                                    </button>
                                </div>
                            </div>

                            {/* Recent Requests */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                                <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Recent Requests</h3></div>
                                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                                    {filteredData.requests.length === 0 ? <p className="text-center text-gray-400 py-4">No requests found.</p> : filteredData.requests.slice(0, 8).map(req => (
                                        <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-white transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{req.student_name.charAt(0)}</div>
                                                <div><p className="text-sm font-bold text-gray-900">{req.student_name}</p><p className="text-xs text-gray-500">{req.request_type}</p></div>
                                            </div>
                                            {req.status === 'Submitted' ? (
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateRequestStatus(req, 'Approved')} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center" title="Approve & Refer"><CheckCircle size={16} /></button>
                                                    <button onClick={() => updateRequestStatus(req, 'Rejected')} className="w-8 h-8 rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center" title="Reject"><XCircle size={16} /></button>
                                                </div>
                                            ) : <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${req.status === 'Referred' ? 'bg-yellow-100 text-yellow-700' : req.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{req.status}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pro Tip */}
                            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden shadow-xl shadow-emerald-200/30">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                                <div className="flex-1 relative z-10">
                                    <h3 className="text-lg font-bold mb-1">💡 Pro Tip: Student Referrals</h3>
                                    <p className="text-sm text-emerald-100/80">Use the Refer Student tool to flag at-risk students for early counseling interventions.</p>
                                </div>
                                <button onClick={() => { setReferralForm({ student: '', type: '', notes: '' }); setShowReferralModal(true); }} className="mt-4 md:mt-0 ml-0 md:ml-6 px-6 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/25 transition-all whitespace-nowrap">Refer Student</button>
                            </div>
                        </div>
                    )}

                    {/* REPORTS */}
                    {activeModule === 'reports' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm max-w-3xl mx-auto card-hover">
                                <h3 className="font-bold text-gray-900 mb-6 dark:text-white">Status Distribution</h3>
                                <div className="relative h-96 w-full"><Bar data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                            </div>
                        </div>
                    )}

                    {/* Other Modules omitted for brevity, logic follows same pattern */}
                    {/* SETTINGS */}
                    {activeModule === 'settings' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm max-w-3xl card-hover flex justify-between items-center">
                                <div><h3 className="font-bold text-gray-900 dark:text-white">Dark Mode</h3><p className="text-sm text-gray-500">Toggle theme</p></div>
                                <button onClick={() => setData(prev => ({ ...prev, settings: { ...prev.settings, darkMode: !prev.settings.darkMode } }))} className={`w-12 h-6 rounded-full relative transition-colors ${data.settings.darkMode ? 'bg-green-600' : 'bg-gray-200'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-transform ${data.settings.darkMode ? 'translate-x-6' : ''}`}></div></button>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm max-w-3xl card-hover">
                                <h3 className="font-bold text-gray-900 mb-4 dark:text-white">Referral Reasons</h3>
                                <div className="flex gap-3 mb-6"><input value={newReason} onChange={(e) => setNewReason(e.target.value)} className="flex-1 border rounded-lg px-4 py-2 text-sm dark:bg-gray-700 dark:text-white" placeholder="New reason..." /><button onClick={addReason} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Add</button></div>
                                <div className="space-y-2">{data.settings.referralReasons.map((r, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border dark:bg-gray-700 dark:border-gray-600"><span className="text-sm dark:text-gray-200">{r}</span><button onClick={() => deleteReason(i)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button></div>
                                ))}</div>
                            </div>
                        </div>
                    )}

                    {/* SUPPORT APPROVALS */}
                    {activeModule === 'support_approvals' && (
                        <div className="space-y-8 animate-fade-in">
                            <header>
                                <h1 className="text-2xl font-bold text-gray-900">Support Request Approvals</h1>
                                <p className="text-gray-500 text-sm mt-1">Review requests forwarded to {data.profile.department}</p>
                            </header>

                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden card-hover">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                                        <tr>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Student</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Type</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Description</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {supportRequests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                <td className="p-4">
                                                    <div className="font-bold text-gray-900 dark:text-white">{req.student_name}</div>
                                                    <div className="text-xs text-gray-400">{req.student_id}</div>
                                                </td>
                                                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{req.support_type}</span></td>
                                                <td className="p-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                                <td className="p-4">
                                                    <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs" title={req.description}>{req.description}</div>
                                                    {req.documents_url && <a href={req.documents_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">View Attachment</a>}
                                                </td>
                                                <td className="p-4 flex gap-2">
                                                    <button onClick={() => openDecisionModal(req.id, 'Approved')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Approve</button>
                                                    <button onClick={() => openDecisionModal(req.id, 'Rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                                                </td>
                                            </tr>
                                        ))}
                                        {supportRequests.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">No pending support requests.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}                {activeModule === 'events' && (
                        <div className="space-y-8 animate-fade-in">
                            <header>
                                <h1 className="text-2xl font-bold text-gray-900">Department Events</h1>
                                <p className="text-gray-500 text-sm mt-1">Monitor student attendance for {data.profile.department}</p>
                            </header>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {eventsList.map(event => (
                                    <div key={event.id} className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm hover:shadow-md transition card-hover">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${event.type === 'Event' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{event.type}</span>
                                            <span className="text-xs text-gray-500">{event.event_date}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-2 dark:text-white">{event.title}</h3>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 dark:text-gray-400">{event.description}</p>
                                        {event.type === 'Event' && (
                                            <button onClick={() => handleViewDeptAttendees(event)} className="w-full py-2 bg-green-50 text-green-700 font-bold text-xs rounded-lg hover:bg-green-100 transition">
                                                View {data.profile.department.split(' ')[0]} Attendees
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Basic rendering for Students and Counseled lists as well */}
                    {activeModule === 'students' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm card-hover"><input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="w-full pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" placeholder="Search students..." /></div>
                            <div className="space-y-4">
                                {filteredData.students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(s => (
                                    <div key={s.id} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/80 shadow-sm flex justify-between items-center card-hover">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full bg-${s.status === 'Active' ? 'green' : 'gray'}-500 text-white flex items-center justify-center font-bold`}>{s.name.charAt(0)}</div>
                                            <div><h3 className="font-bold text-gray-900 dark:text-white">{s.name}</h3><p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p></div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => { setSelectedStudent(s); setShowStudentModal(true); }} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">View Profile</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* COUNSELED STUDENTS */}
                    {activeModule === 'counseled' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm flex gap-4 card-hover">
                                <input value={counseledSearch} onChange={(e) => setCounseledSearch(e.target.value)} className="flex-1 pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" placeholder="Search by name..." />
                                <input type="date" value={counseledDate} onChange={(e) => setCounseledDate(e.target.value)} className="w-48 pl-4 pr-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-none" />
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden card-hover">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                                        <tr>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Student Name</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Date</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Issue</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Status</th>
                                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase dark:text-gray-300">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredData.requests
                                            .filter(r => (r.status === 'Completed' || r.status === 'Referred') &&
                                                r.student_name.toLowerCase().includes(counseledSearch.toLowerCase()) &&
                                                (!counseledDate || r.created_at?.startsWith(counseledDate)))
                                            .map(r => (
                                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{r.student_name}</td>
                                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">{new Date(r.created_at).toLocaleDateString()}</td>
                                                    <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold dark:bg-blue-900/30 dark:text-blue-300">{r.request_type}</span></td>
                                                    <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>{r.status}</span></td>
                                                    <td className="p-4">
                                                        <button onClick={() => { setSelectedHistoryStudent(r); setShowHistoryModal(true); }} className="text-blue-600 hover:text-blue-800 text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300">View History</button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                {filteredData.requests.filter(r => r.status === 'Completed' || r.status === 'Referred').length === 0 && (
                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">No counseled students found.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main >

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

            {/* Referral Modal */}
            {
                showReferralModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Refer Student</h3>
                                <button onClick={() => setShowReferralModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <form onSubmit={handleReferralSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Student Name</label>
                                    <select value={referralForm.student} onChange={e => setReferralForm({ ...referralForm, student: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                        <option value="">Select Student</option>
                                        {filteredData.students.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Reason</label>
                                    <select value={referralForm.type} onChange={e => setReferralForm({ ...referralForm, type: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                        <option value="">Select Reason</option>
                                        {data.settings.referralReasons.map((r, i) => <option key={i} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Notes</label>
                                    <textarea value={referralForm.notes} onChange={e => setReferralForm({ ...referralForm, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Additional details..." required></textarea>
                                </div>
                                <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Submit Referral</button>
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
                                {filteredData.requests.filter(r => r.student_name === selectedHistoryStudent.student_name).map((record, i) => (
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

                                        <div className="col-span-2"><label className="block text-xs font-bold mb-1 text-gray-500 dark:text-gray-400">Full Address String (Legacy)</label><textarea readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200" rows="1" value={selectedStudent.address || ''}></textarea></div>

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
            {showEventAttendees && (() => {
                const yearLevels = [...new Set(deptAttendees.map(a => a.year_level).filter(Boolean))].sort();
                let filtered = deptAttendees;
                if (yearLevelFilter !== 'All') filtered = filtered.filter(a => a.year_level === yearLevelFilter);
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
                                            const headers = ['Student Name', 'Department', 'Year Level', 'Time In', 'Time Out', 'Status'];
                                            const rows = filtered.map(a => [
                                                a.student_name,
                                                a.department || '',
                                                a.year_level || '',
                                                new Date(a.time_in).toLocaleString(),
                                                a.time_out ? new Date(a.time_out).toLocaleString() : '-',
                                                a.time_out ? 'Completed' : 'Still In'
                                            ]);
                                            exportToExcel(headers, rows, `${showEventAttendees.title}_attendees`);
                                        }} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500">
                                            <Download size={14} /> Export Excel
                                        </button>
                                        <button onClick={() => { setShowEventAttendees(null); setYearLevelFilter('All'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
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
                            </div>
                            <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                                {filtered.length === 0 ? <p className="text-center py-8 text-gray-500 dark:text-gray-400">No attendees yet.</p> : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 dark:bg-gray-700 dark:text-gray-300">
                                            <tr>
                                                <th className="px-6 py-3">Student</th>
                                                <th className="px-6 py-3">Year Level</th>
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
                                                    <td className="px-6 py-3 text-gray-600 text-xs font-medium dark:text-gray-400">{att.year_level || '-'}</td>
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
            })()}

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
                                    {decisionData.type === 'Approved' ? ' This will refer it back to Care Staff for final processing.' : ' This will close the request.'}
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
