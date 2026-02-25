import React, { useState, useEffect, useRef } from 'react';
import { exportToExcel, savePdf } from '../utils/dashboardUtils';
import { ClockDisplay, GreetingText } from '../components/ClockDisplay';
import QuestionChart from '../components/charts/QuestionChart';
import YearLevelChart from '../components/charts/YearLevelChart';
import TopQuestionsChart from '../components/charts/TopQuestionsChart';
import StatusBadge from '../components/StatusBadge';
import CalendarView from '../components/CalendarView';
import AuditLogsPage from './carestaff/AuditLogsPage';
import OfficeLogbookPage from './carestaff/OfficeLogbookPage';
import ScholarshipPage from './carestaff/ScholarshipPage';
import FormManagementPage from './carestaff/FormManagementPage';
import FeedbackPage from './carestaff/FeedbackPage';
import NATManagementPage from './carestaff/NATManagementPage';
import StudentPopulationPage from './carestaff/StudentPopulationPage';
import StudentAnalyticsPage from './carestaff/StudentAnalyticsPage';
import HomePage from './carestaff/HomePage';
import CounselingPage from './carestaff/CounselingPage';
import SupportRequestsPage from './carestaff/SupportRequestsPage';
import EventsPage from './carestaff/EventsPage';
import CareStaffDashboardView from './carestaff/CareStaffDashboardView';
import { renderCareStaffModals } from './carestaff/modals/CareStaffModals';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import {
    LayoutDashboard, Users, ClipboardList, Calendar, CheckCircle,
    XCircle, Clock, Search, Filter, Download, User, MapPin,
    Phone, Mail, FileText, ChevronRight, Menu, LogOut, Bell,
    ArrowUpDown, Edit, Trash2, UploadCloud, AlertTriangle, Key, Plus,
    BarChart2, PieChart, List, Activity, Settings, Book, GraduationCap,
    TrendingUp, ClipboardCheck, CalendarCheck, Award, Rocket, ListChecks, Shield, Star, BookOpen,
    Send, Paperclip, MessageCircle, Info, Lock, Eye, RefreshCw
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import 'jspdf-autotable';


ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);
import { Chart } from 'chart.js/auto'; // Ensure Chart is imported if not already handled by react-chartjs-2 imports

const STORAGE_KEY = 'norsu_care_data_v2';

// exportToExcel, savePdf       → src/utils/dashboardUtils.js
// QuestionChart, YearLevelChart, TopQuestionsChart → src/components/charts/
// StatusBadge                  → src/components/StatusBadge.jsx

// HomePage - see src/pages/carestaff/HomePage.jsx

const CareStaffDashboard = () => {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const PROFILE_NOTIFICATION_ACTIONS = [
        'Student Profile Updated',
        'Student Profile Completed',
        'Student Profile Picture Updated'
    ];
    const [activeTab, setActiveTab] = useState<string>('home');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    // Session guard — redirect to login if no session
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/care-staff');
        }
    }, [isAuthenticated, navigate]);

    // Data States
    const [toast, setToast] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<any[]>([]);

    // Command Hub (FAB Panel)
    const [showCommandHub, setShowCommandHub] = useState<boolean>(false);
    const [commandHubTab, setCommandHubTab] = useState<string>('actions');
    const [staffNotes, setStaffNotes] = useState<any[]>(() => {
        try { return JSON.parse(localStorage.getItem('care_staff_notes') || '[]'); } catch { return []; }
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const refreshAll = async () => {
        setIsRefreshing(true);
        try {
            // Since data is decentralized, full refresh reloads the page.
            window.location.reload();
        } finally {
            setIsRefreshing(false);
        }
    };

    // Auto-calculate stats effect removed (handled by useMemo)






    const showToastMessage = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        let isMounted = true;

        const fetchProfileNotifications = async () => {
            const [{ data: auditRows }, { data: notificationRows }] = await Promise.all([
                supabase
                    .from('audit_logs')
                    .select('id, action, details, created_at')
                    .in('action', PROFILE_NOTIFICATION_ACTIONS)
                    .order('created_at', { ascending: false })
                    .limit(25),
                supabase
                    .from('notifications')
                    .select('id, message, created_at')
                    .like('message', '[PROFILE UPDATE]%')
                    .order('created_at', { ascending: false })
                    .limit(25)
            ]);

            const merged = [...(auditRows || []), ...(notificationRows || [])]
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 25);

            if (isMounted) setNotifications(merged);
        };

        fetchProfileNotifications();

        const profileNotificationsChannel = supabase
            .channel('care_staff_profile_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: any) => {
                const action = payload?.new?.action;
                if (!PROFILE_NOTIFICATION_ACTIONS.includes(action)) return;
                setNotifications((prev) => [payload.new, ...prev].slice(0, 25));
            })
            .subscribe();

        const profileNotificationsFallbackChannel = supabase
            .channel('care_staff_profile_notifications_fallback')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
                const message = String(payload?.new?.message || '');
                if (!message.startsWith('[PROFILE UPDATE]')) return;
                setNotifications((prev) => [payload.new, ...prev].slice(0, 25));
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(profileNotificationsChannel).catch(console.error);
            supabase.removeChannel(profileNotificationsFallbackChannel).catch(console.error);
        };
    }, []);

    const logAudit = async (action: any, details: any) => {
        try {
            const { error } = await supabase.from('audit_logs').insert([{
                user_id: session?.id || 'unknown',
                user_name: session?.full_name || 'CARE Staff',
                action,
                details
            }]);
            if (error) console.error('Audit log error:', error);
        } catch (err: any) {
            console.error('Audit log error:', err);
        }
    };

    const functions = {
        showToast: showToastMessage,
        logAudit,
        handleGetStarted: () => setActiveTab('dashboard'),
        handleDocs: () => window.open('https://norsu.edu.ph', '_blank'),
        handleLaunchModule: (module: any) => {
            if (module === 'Student Analytics') setActiveTab('analytics');
            if (module === 'Form Management') setActiveTab('forms');
            if (module === 'Event Broadcasting') setActiveTab('events');
            if (module === 'Scholarship Tracking') setActiveTab('scholarship');
        },
        handleOpenAnalytics: () => setActiveTab('analytics'),

        handleStatClick: (stat: any) => {
            if (stat === 'students') setActiveTab('population'); // Updated to point to new tab
            if (stat === 'cases') setActiveTab('support');
            if (stat === 'events') setActiveTab('events');
            if (stat === 'reports') setActiveTab('forms'); // Or wherever reports go
            if (stat === 'forms') setActiveTab('forms');
        },
        handleResetSystem: () => handleResetSystem(),
        setShowResetModal,
        handleViewAllActivity: () => setActiveTab('audit'), // Or specific activity view
        handleQuickAction: (action: any) => {
            if (action === 'Schedule Wellness Check') setActiveTab('counseling');
            if (action === 'View Reports') setActiveTab('analytics');
        }
    };

    // System Reset (matches HTML handleResetSystem exactly — wipes 14+ tables)
    const handleResetSystem = async () => {
        setShowResetModal(false);
        try {
            const standardTables = [
                'answers', 'submissions', 'notifications', 'office_visits', 'support_requests',
                'counseling_requests', 'event_feedback', 'event_attendance', 'applications',
                'scholarships', 'events', 'audit_logs', 'needs_assessments', 'students'
            ];
            for (const table of standardTables) {
                await supabase.from(table).delete().neq('id', 0);
            }
            // Delete from tables with specific PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            showToastMessage('System data has been successfully reset.');
            window.location.reload();
        } catch (err: any) {
            console.error('Reset error:', err);
            showToastMessage('Reset completed with some warnings. Check console.', 'error');
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0 shadow-2xl shadow-purple-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-purple rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-purple-600/30 text-sm">CS</div>
                        <div>
                            <h1 className="font-bold text-white text-lg tracking-tight">CARE Staff</h1>
                            <p className="text-purple-300/70 text-xs font-medium">NORSU Portal</p>
                        </div>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-purple-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                    {[
                        { tab: 'home', icon: <LayoutDashboard size={18} />, label: 'Home' },
                        { tab: 'dashboard', icon: <Activity size={18} />, label: 'Dashboard' },
                    ].map(item => (
                        <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Student Management</p>
                        {[
                            { tab: 'population', icon: <Users size={18} />, label: 'Student Population' },
                            { tab: 'analytics', icon: <BarChart2 size={18} />, label: 'Student Analytics' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Services</p>
                        {[
                            { tab: 'nat', icon: <FileText size={18} />, label: 'NAT Management' },
                            { tab: 'counseling', icon: <Users size={18} />, label: 'Counseling' },
                            { tab: 'support', icon: <CheckCircle size={18} />, label: 'Support Requests' },
                            { tab: 'events', icon: <Calendar size={18} />, label: 'Events' },
                            { tab: 'scholarship', icon: <Award size={18} />, label: 'Scholarships' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="pt-5 mt-4 border-t border-white/5">
                        <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">Administration</p>
                        {[
                            { tab: 'forms', icon: <ClipboardList size={18} />, label: 'Forms' },
                            { tab: 'feedback', icon: <Star size={18} />, label: 'Feedback' },
                            { tab: 'audit', icon: <Shield size={18} />, label: 'Audit Logs' },
                            { tab: 'logbook', icon: <BookOpen size={18} />, label: 'Office Logbook' },
                        ].map(item => (
                            <button key={item.tab} onClick={() => setActiveTab(item.tab)} className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                                {item.icon} {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button onClick={() => { logout(); navigate('/care-staff'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}
                <header className="h-16 glass gradient-border flex items-center justify-between px-6 lg:px-10 relative z-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"><Menu /></button>
                        <h2 className="text-xl font-bold gradient-text capitalize">{activeTab}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={refreshAll} disabled={isRefreshing} title="Refresh Dashboard" className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 hover:text-purple-600 hover:shadow-md transition-all border border-gray-100 disabled:opacity-50">
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-gray-500 hover:text-purple-600 hover:shadow-md transition-all relative border border-gray-100">
                            <Bell size={20} />
                            {notifications.length > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse-glow" />}
                        </button>
                    </div>
                </header>

                <div key={activeTab} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">
                    {activeTab === 'home' && <HomePage functions={functions} />}
                    {activeTab === 'population' && <StudentPopulationPage functions={functions} />}
                    {activeTab === 'dashboard' && (
                        <CareStaffDashboardView setActiveTab={setActiveTab} />
                    )}

                    {activeTab === 'analytics' && <StudentAnalyticsPage functions={functions} />}
                    {activeTab === 'nat' && <NATManagementPage showToast={showToastMessage} />}

                    {activeTab === 'counseling' && <CounselingPage functions={functions} />}

                    {activeTab === 'support' && <SupportRequestsPage functions={functions} />}

                    {activeTab === 'events' && <EventsPage functions={functions} />}
                    {activeTab === 'scholarship' && <ScholarshipPage functions={functions} />}
                    {activeTab === 'forms' && <FormManagementPage functions={functions} />}
                    {activeTab === 'feedback' && <FeedbackPage functions={functions} />}
                    {activeTab === 'audit' && <AuditLogsPage />}
                    {activeTab === 'logbook' && <OfficeLogbookPage functions={functions} />}

                    {renderCareStaffModals({
                        showCommandHub, setShowCommandHub, commandHubTab, setCommandHubTab, staffNotes, setStaffNotes,
                        setActiveTab, toast, setToast,
                        showResetModal, setShowResetModal, handleResetSystem,
                    })}
                </div>
            </main>
        </div>
    );
};

export default CareStaffDashboard;
