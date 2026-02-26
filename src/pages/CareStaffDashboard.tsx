import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    Award,
    BarChart2,
    Bell,
    BookOpen,
    Calendar,
    CheckCircle,
    ClipboardList,
    FileText,
    LayoutDashboard,
    LogOut,
    Menu,
    RefreshCw,
    Shield,
    Star,
    Users,
    XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import AuditLogsPage from './carestaff/AuditLogsPage';
import CareStaffDashboardView from './carestaff/CareStaffDashboardView';
import CounselingPage from './carestaff/CounselingPage';
import EventsPage from './carestaff/EventsPage';
import FeedbackPage from './carestaff/FeedbackPage';
import FormManagementPage from './carestaff/FormManagementPage';
import HomePage from './carestaff/HomePage';
import NATManagementPage from './carestaff/NATManagementPage';
import OfficeLogbookPage from './carestaff/OfficeLogbookPage';
import ScholarshipPage from './carestaff/ScholarshipPage';
import StudentAnalyticsPage from './carestaff/StudentAnalyticsPage';
import StudentPopulationPage from './carestaff/StudentPopulationPage';
import SupportRequestsPage from './carestaff/SupportRequestsPage';
import { renderCareStaffModals } from './carestaff/modals/CareStaffModals';
import type { CareStaffDashboardFunctions, ToastHandler, ToastType } from './carestaff/types';

const PROFILE_NOTIFICATION_ACTIONS = [
    'Student Profile Updated',
    'Student Profile Completed',
    'Student Profile Picture Updated'
];

const ACTIVE_TABS = [
    'home',
    'dashboard',
    'population',
    'analytics',
    'nat',
    'counseling',
    'support',
    'events',
    'scholarship',
    'forms',
    'feedback',
    'audit',
    'logbook'
] as const;

type ActiveTab = (typeof ACTIVE_TABS)[number];
type CommandHubTab = 'actions' | 'help' | 'notes';

interface ToastState {
    msg: string;
    type: ToastType;
}

interface NotificationItem {
    id?: string | number;
    action?: string;
    details?: unknown;
    message?: string;
    created_at?: string | null;
}

interface StaffNote {
    id: number;
    text: string;
    time: string;
}

interface AuthSession {
    id?: string;
    full_name?: string;
}

interface RealtimeInsertPayload {
    new?: NotificationItem;
}

type NavItem = { tab: ActiveTab; label: string; icon: LucideIcon };
type NavSection = { title?: string; withDivider?: boolean; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
    {
        items: [
            { tab: 'home', icon: LayoutDashboard, label: 'Home' },
            { tab: 'dashboard', icon: Activity, label: 'Dashboard' }
        ]
    },
    {
        title: 'Student Management',
        withDivider: true,
        items: [
            { tab: 'population', icon: Users, label: 'Student Population' },
            { tab: 'analytics', icon: BarChart2, label: 'Student Analytics' }
        ]
    },
    {
        title: 'Services',
        withDivider: true,
        items: [
            { tab: 'nat', icon: FileText, label: 'NAT Management' },
            { tab: 'counseling', icon: Users, label: 'Counseling' },
            { tab: 'support', icon: CheckCircle, label: 'Support Requests' },
            { tab: 'events', icon: Calendar, label: 'Events' },
            { tab: 'scholarship', icon: Award, label: 'Scholarships' }
        ]
    },
    {
        title: 'Administration',
        withDivider: true,
        items: [
            { tab: 'forms', icon: ClipboardList, label: 'Forms' },
            { tab: 'feedback', icon: Star, label: 'Feedback' },
            { tab: 'audit', icon: Shield, label: 'Audit Logs' },
            { tab: 'logbook', icon: BookOpen, label: 'Office Logbook' }
        ]
    }
];

const MODULE_TAB_MAP: Record<string, ActiveTab> = {
    'Student Analytics': 'analytics',
    'Form Management': 'forms',
    'Event Broadcasting': 'events',
    'Scholarship Tracking': 'scholarship'
};

const STAT_TAB_MAP: Record<string, ActiveTab> = {
    students: 'population',
    cases: 'support',
    events: 'events',
    reports: 'forms',
    forms: 'forms'
};

const QUICK_ACTION_TAB_MAP: Record<string, ActiveTab> = {
    'Schedule Wellness Check': 'counseling',
    'View Reports': 'analytics'
};

const CareStaffDashboard = () => {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as {
        session?: AuthSession | null;
        isAuthenticated: boolean;
        logout: () => void;
    };

    const [activeTab, setActiveTab] = useState<ActiveTab>('home');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    // Data States
    const [toast, setToast] = useState<ToastState | null>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    // Command Hub (FAB Panel)
    const [showCommandHub, setShowCommandHub] = useState<boolean>(false);
    const [commandHubTab, setCommandHubTab] = useState<CommandHubTab>('actions');
    const [staffNotes, setStaffNotes] = useState<StaffNote[]>(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('care_staff_notes') || '[]');
            return Array.isArray(parsed) ? (parsed as StaffNote[]) : [];
        } catch {
            return [];
        }
    });

    const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Session guard - redirect to login if no session
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/care-staff');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current) {
                clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    const refreshAll = useCallback(async () => {
        setIsRefreshing(true);
        try {
            // Since data is decentralized, full refresh reloads the page.
            window.location.reload();
        } finally {
            setIsRefreshing(false);
        }
    }, []);

    const showToastMessage = useCallback<ToastHandler>((msg, type = 'success') => {
        setToast({ msg, type });

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

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

            const merged = [
                ...((auditRows || []) as NotificationItem[]),
                ...((notificationRows || []) as NotificationItem[])
            ]
                .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                .slice(0, 25);

            if (isMounted) {
                setNotifications(merged);
            }
        };

        fetchProfileNotifications();

        const profileNotificationsChannel = supabase
            .channel('care_staff_profile_notifications')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: RealtimeInsertPayload) => {
                const action = payload?.new?.action;
                if (typeof action !== 'string' || !PROFILE_NOTIFICATION_ACTIONS.includes(action)) {
                    return;
                }
                if (payload.new) {
                    setNotifications((prev) => [payload.new as NotificationItem, ...prev].slice(0, 25));
                }
            })
            .subscribe();

        const profileNotificationsFallbackChannel = supabase
            .channel('care_staff_profile_notifications_fallback')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: RealtimeInsertPayload) => {
                const message = String(payload?.new?.message || '');
                if (!message.startsWith('[PROFILE UPDATE]')) {
                    return;
                }
                if (payload.new) {
                    setNotifications((prev) => [payload.new as NotificationItem, ...prev].slice(0, 25));
                }
            })
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(profileNotificationsChannel).catch(console.error);
            supabase.removeChannel(profileNotificationsFallbackChannel).catch(console.error);
        };
    }, []);

    const logAudit = useCallback(async (action: string, details: unknown) => {
        try {
            const { error } = await supabase.from('audit_logs').insert([
                {
                    user_id: session?.id || 'unknown',
                    user_name: session?.full_name || 'CARE Staff',
                    action,
                    details
                }
            ]);
            if (error) {
                console.error('Audit log error:', error);
            }
        } catch (err: unknown) {
            console.error('Audit log error:', err);
        }
    }, [session?.full_name, session?.id]);

    // System Reset (matches HTML handleResetSystem exactly - wipes 14+ tables)
    const handleResetSystem = useCallback(async () => {
        setShowResetModal(false);
        try {
            const standardTables = [
                'answers',
                'submissions',
                'notifications',
                'office_visits',
                'support_requests',
                'counseling_requests',
                'event_feedback',
                'event_attendance',
                'applications',
                'scholarships',
                'events',
                'audit_logs',
                'needs_assessments',
                'students'
            ];
            for (const table of standardTables) {
                await supabase.from(table).delete().neq('id', 0);
            }
            // Delete from tables with specific PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            showToastMessage('System data has been successfully reset.');
            window.location.reload();
        } catch (err: unknown) {
            console.error('Reset error:', err);
            showToastMessage('Reset completed with some warnings. Check console.', 'error');
        }
    }, [showToastMessage]);

    const functions = useMemo<CareStaffDashboardFunctions>(() => ({
        showToast: showToastMessage,
        showToastMessage,
        logAudit,
        handleGetStarted: () => setActiveTab('dashboard'),
        handleDocs: () => window.open('https://norsu.edu.ph', '_blank'),
        handleLaunchModule: (module: string) => {
            const tab = MODULE_TAB_MAP[module];
            if (tab) {
                setActiveTab(tab);
            }
        },
        handleOpenAnalytics: () => setActiveTab('analytics'),

        handleStatClick: (stat: string) => {
            const tab = STAT_TAB_MAP[stat];
            if (tab) {
                setActiveTab(tab);
            }
        },
        handleResetSystem: () => handleResetSystem(),
        setShowResetModal,
        handleViewAllActivity: () => setActiveTab('audit'),
        handleQuickAction: (action: string) => {
            const tab = QUICK_ACTION_TAB_MAP[action];
            if (tab) {
                setActiveTab(tab);
            }
        }
    }), [handleResetSystem, logAudit, showToastMessage]);

    const setActiveTabFromString = useCallback((tab: string) => {
        setActiveTab(tab as ActiveTab);
    }, []);

    const renderActiveTab = (): React.ReactNode => {
        switch (activeTab) {
            case 'home':
                return <HomePage functions={functions} />;
            case 'population':
                return <StudentPopulationPage functions={functions} />;
            case 'dashboard':
                return <CareStaffDashboardView setActiveTab={setActiveTabFromString} />;
            case 'analytics':
                return <StudentAnalyticsPage functions={functions} />;
            case 'nat':
                return <NATManagementPage showToast={showToastMessage} />;
            case 'counseling':
                return <CounselingPage functions={functions} />;
            case 'support':
                return <SupportRequestsPage functions={functions} />;
            case 'events':
                return <EventsPage functions={functions} />;
            case 'scholarship':
                return <ScholarshipPage functions={functions} />;
            case 'forms':
                return <FormManagementPage functions={functions} />;
            case 'feedback':
                return <FeedbackPage functions={functions} />;
            case 'audit':
                return <AuditLogsPage />;
            case 'logbook':
                return <OfficeLogbookPage functions={functions} />;
            default:
                return null;
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
                    {NAV_SECTIONS.map((section, sectionIndex) => (
                        <div key={section.title || `section-${sectionIndex}`} className={section.withDivider ? 'pt-5 mt-4 border-t border-white/5' : ''}>
                            {section.title && (
                                <p className="px-4 text-[10px] font-bold text-purple-400/50 uppercase tracking-[0.15em] mb-3">
                                    {section.title}
                                </p>
                            )}

                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.tab}
                                        onClick={() => setActiveTab(item.tab)}
                                        className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeTab === item.tab ? 'nav-item-active text-purple-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Icon size={18} /> {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
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
                    {renderActiveTab()}

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
