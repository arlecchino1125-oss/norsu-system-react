import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    Download,
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
import { createDeferredChannelCleanup } from '../lib/realtime';
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
import StudentPopulationPage from './carestaff/StudentPopulationPage';
import SupportRequestsPage from './carestaff/SupportRequestsPage';
import StaffAccountSecurityPage from './shared/StaffAccountSecurityPage';
import NorsuBrand from '../components/NorsuBrand';
import StaffCalendarPage from './shared/StaffCalendarPage';
import StaffExportCenterPage from './shared/StaffExportCenterPage';
import { renderCareStaffModals } from './carestaff/modals/CareStaffModals';
import NotificationBell from '../components/NotificationBell';
import type { CareStaffDashboardFunctions, ToastHandler, ToastType } from './carestaff/types';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import {
    getStudentActivationPolicy as fetchStudentActivationPolicy,
    updateStudentActivationPolicy as saveStudentActivationPolicy
} from '../lib/studentActivationPolicy';
import { COUNSELING_STATUS, SUPPORT_STATUS, getCounselingScheduledDate, isCounselingCalendarVisible } from '../utils/workflow';

const StudentAnalyticsPage = lazy(() => import('./carestaff/StudentAnalyticsPage'));

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
    'calendar',
    'scholarship',
    'forms',
    'feedback',
    'export_center',
    'settings',
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
    time_label?: string | null;
    sort_at?: string | null;
}

interface StaffNote {
    id: number;
    text: string;
    time: string;
}

interface AuthSession {
    id?: string;
    full_name?: string;
    auth_email?: string;
    user?: {
        email?: string;
    };
}

interface SupportNotificationRow {
    id?: string | number;
    student_id?: string | null;
    student_name?: string | null;
    support_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    dept_notes?: string | null;
}

interface CounselingNotificationRow {
    id?: string | number;
    student_id?: string | null;
    student_name?: string | null;
    request_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    scheduled_date?: string | null;
    schedule_date?: string | null;
}

interface RealtimeChangePayload<T = NotificationItem> {
    old?: T;
    new?: T;
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
            { tab: 'calendar', icon: Calendar, label: 'Calendar' },
            { tab: 'scholarship', icon: Award, label: 'Scholarships' },
            { tab: 'export_center', icon: Download, label: 'Export Center' }
        ]
    },
    {
        title: 'Administration',
        withDivider: true,
        items: [
            { tab: 'forms', icon: ClipboardList, label: 'Forms' },
            { tab: 'feedback', icon: Star, label: 'Feedback' },
            { tab: 'settings', icon: Shield, label: 'Settings' },
            { tab: 'audit', icon: Shield, label: 'Audit Logs' },
            { tab: 'logbook', icon: BookOpen, label: 'Office Logbook' }
        ]
    }
];

const HEADER_TITLES: Record<ActiveTab, string> = {
    home: 'Home',
    dashboard: 'Dashboard',
    population: 'Student Population',
    analytics: 'Student Analytics',
    nat: 'NORSU ADMISSION TEST DASHBOARD',
    counseling: 'Counseling',
    support: 'Support Requests',
    events: 'Events',
    calendar: 'Calendar',
    scholarship: 'Scholarships',
    export_center: 'Export Center',
    forms: 'Forms',
    feedback: 'Feedback',
    settings: 'Settings',
    audit: 'Audit Logs',
    logbook: 'Office Logbook'
};

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

const STAFF_BELL_LIMIT = 25;

const parseTimestamp = (value: unknown): string | null => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw) ? raw.replace(' ', 'T') : raw;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const parseJsonRecord = (value: unknown): Record<string, unknown> | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
};

const isSameLocalDay = (value: string | null, base = new Date()) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return (
        date.getFullYear() === base.getFullYear() &&
        date.getMonth() === base.getMonth() &&
        date.getDate() === base.getDate()
    );
};

const formatTodayTimeLabel = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

const getNotificationIdentity = (item: NotificationItem) => {
    if (item.id !== undefined && item.id !== null) {
        if (typeof item.id === 'string') return item.id;
        if (item.message) return `message-${item.id}`;
        if (item.action) return `action-${item.id}`;
        return `item-${item.id}`;
    }
    return `${item.message || item.action || 'notification'}-${item.sort_at || item.created_at || ''}`;
};

const getNotificationSortTime = (item: NotificationItem) =>
    new Date(item.sort_at || item.created_at || 0).getTime();

const dedupeAndLimitNotifications = (items: NotificationItem[]) => {
    const seen = new Set<string>();
    return items
        .filter((item) => {
            const key = getNotificationIdentity(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((a, b) => getNotificationSortTime(b) - getNotificationSortTime(a))
        .slice(0, STAFF_BELL_LIMIT);
};

const prependNotification = (prev: NotificationItem[], next: NotificationItem | null) =>
    next ? dedupeAndLimitNotifications([next, ...prev]) : prev;

const getStudentLabel = (studentName?: string | null, studentId?: string | null) => {
    const trimmedName = String(studentName || '').trim();
    if (trimmedName) return trimmedName;
    const trimmedId = String(studentId || '').trim();
    return trimmedId ? `student ${trimmedId}` : 'a student';
};

const mapSupportSubmittedNotification = (request: SupportNotificationRow): NotificationItem => {
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-submitted-${request.id}`,
        message: `New support request from ${studentLabel}${supportType ? ` for ${supportType}` : ''}.`,
        created_at: request.created_at || null,
        sort_at: request.created_at || null,
    };
};

const mapSupportReferredNotification = (
    request: SupportNotificationRow,
    alertAt?: string | null
): NotificationItem => {
    const deptNotes = parseJsonRecord(request.dept_notes);
    const occurredAt = alertAt || parseTimestamp(deptNotes?.date_acted) || request.created_at || null;
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-referred-${request.id}`,
        message: `Support case for ${studentLabel}${supportType ? ` (${supportType})` : ''} was referred back to CARE.`,
        created_at: occurredAt,
        sort_at: occurredAt,
    };
};

const mapCounselingReferredNotification = (
    request: CounselingNotificationRow,
    alertAt?: string | null
): NotificationItem => {
    const occurredAt = alertAt || request.created_at || null;
    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const requestType = String(request.request_type || '').trim();
    return {
        id: `staff-counseling-referred-${request.id}`,
        message: `Counseling case for ${studentLabel}${requestType ? ` (${requestType})` : ''} was referred to CARE.`,
        created_at: occurredAt,
        sort_at: occurredAt,
    };
};

const mapCounselingScheduledTodayNotification = (
    request: CounselingNotificationRow,
    alertAt?: string | null
): NotificationItem | null => {
    const scheduledAt = parseTimestamp(getCounselingScheduledDate(request));
    if (!isSameLocalDay(scheduledAt)) return null;

    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const requestType = String(request.request_type || '').trim();
    return {
        id: `staff-counseling-scheduled-${request.id}`,
        message: `Counseling session with ${studentLabel}${requestType ? ` (${requestType})` : ''} is scheduled today.`,
        created_at: alertAt || request.created_at || scheduledAt,
        sort_at: alertAt || scheduledAt,
        time_label: formatTodayTimeLabel(scheduledAt),
    };
};

const mapSupportVisitScheduledTodayNotification = (
    request: SupportNotificationRow,
    alertAt?: string | null
): NotificationItem | null => {
    const deptNotes = parseJsonRecord(request.dept_notes);
    const scheduledAt = parseTimestamp(deptNotes?.scheduled_date);
    if (!isSameLocalDay(scheduledAt)) return null;

    const studentLabel = getStudentLabel(request.student_name, request.student_id);
    const supportType = String(request.support_type || '').trim();
    return {
        id: `staff-support-visit-scheduled-${request.id}`,
        message: `Support visit with ${studentLabel}${supportType ? ` (${supportType})` : ''} is scheduled today.`,
        created_at: alertAt || request.created_at || scheduledAt,
        sort_at: alertAt || scheduledAt,
        time_label: formatTodayTimeLabel(scheduledAt),
    };
};

const CareStaffDashboard = () => {
    const navigate = useNavigate();
    const { session, isAuthenticated, updateSession, logout } = useAuth() as {
        session?: AuthSession | null;
        isAuthenticated: boolean;
        updateSession?: (updates: any) => void;
        logout: () => void;
    };

    const [activeTab, setActiveTab] = useState<ActiveTab>('home');
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

    // Data States
    const [toast, setToast] = useState<ToastState | null>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [isResettingSystem, setIsResettingSystem] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [studentActivationPolicy, setStudentActivationPolicy] = useState({
        requireEnrollmentKey: true,
        updatedAt: null as string | null,
        updatedBy: null as string | null
    });
    const [isLoadingStudentActivationPolicy, setIsLoadingStudentActivationPolicy] = useState(false);
    const [isSavingStudentActivationPolicy, setIsSavingStudentActivationPolicy] = useState(false);

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
    const bellSyncRef = useRef<() => Promise<void>>(async () => undefined);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshNonce, setRefreshNonce] = useState(0);

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

    const showToastMessage = useCallback<ToastHandler>((msg, type = 'success') => {
        setToast({ msg, type });

        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
        }

        toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    }, []);

    const loadStudentActivationPolicy = useCallback(async () => {
        setIsLoadingStudentActivationPolicy(true);
        try {
            const policy = await fetchStudentActivationPolicy();
            setStudentActivationPolicy(policy);
        } catch (error: any) {
            showToastMessage(error?.message || 'Failed to load the student activation policy.', 'error');
        } finally {
            setIsLoadingStudentActivationPolicy(false);
        }
    }, [showToastMessage]);

    useEffect(() => {
        void loadStudentActivationPolicy();
    }, [loadStudentActivationPolicy]);

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
            non2xxMessage: 'Your CARE Staff session could not be verified. Please sign in again.',
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
            non2xxMessage: 'Your CARE Staff session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your staff login email.'
        });

        syncStaffSession({
            email: normalizedEmail,
            auth_email: normalizedEmail,
            user: {
                ...(session?.user || {}),
                email: normalizedEmail
            }
        });
    }, [session?.user, syncStaffSession]);

    const confirmStaffPasswordChange = useCallback(async (nextPasswordValue: string, otp: string) => {
        await invokeEdgeFunction('manage-staff-accounts', {
            body: {
                mode: 'confirm-password-change',
                password: String(nextPasswordValue || ''),
                otp: String(otp || '').trim()
            },
            requireAuth: true,
            non2xxMessage: 'Your CARE Staff session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your staff password.'
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
            non2xxMessage: 'Your CARE Staff session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to update your staff profile.'
        });

        syncStaffSession({
            full_name: normalizedName
        });
    }, [syncStaffSession]);

    const toggleStudentActivationPolicy = useCallback(async () => {
        const nextRequireEnrollmentKey = !studentActivationPolicy.requireEnrollmentKey;

        setIsSavingStudentActivationPolicy(true);
        try {
            const updatedPolicy = await saveStudentActivationPolicy(nextRequireEnrollmentKey);
            setStudentActivationPolicy(updatedPolicy);
            showToastMessage(
                nextRequireEnrollmentKey
                    ? 'Student Portal activation now requires an uploaded enrollment key.'
                    : 'Student Portal activation can now continue after a warning even without an uploaded enrollment key.'
            );
        } catch (error: any) {
            showToastMessage(error?.message || 'Failed to update the student activation policy.', 'error');
        } finally {
            setIsSavingStudentActivationPolicy(false);
        }
    }, [showToastMessage, studentActivationPolicy.requireEnrollmentKey]);

    const refreshAll = useCallback(async () => {
        setIsRefreshing(true);
        try {
            await bellSyncRef.current();
            setRefreshNonce((current) => current + 1);
            showToastMessage('Current view refreshed.');
        } catch (error) {
            console.error('Failed to refresh care staff dashboard view:', error);
            showToastMessage('Failed to refresh the current view.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    }, [showToastMessage]);

    useEffect(() => {
        let isMounted = true;

        const fetchStaffBellNotifications = async () => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(todayStart.getDate() + 1);

            const [
                { data: auditRows },
                { data: profileNotificationRows },
                { data: supportSubmittedRows },
                { data: supportReferredRows },
                { data: counselingReferredRows },
                { data: counselingScheduledRows },
                { data: supportVisitRows }
            ] = await Promise.all([
                supabase
                    .from('audit_logs')
                    .select('id, action, details, created_at')
                    .in('action', PROFILE_NOTIFICATION_ACTIONS)
                    .order('created_at', { ascending: false })
                    .limit(STAFF_BELL_LIMIT),
                supabase
                    .from('notifications')
                    .select('id, message, created_at')
                    .like('message', '[PROFILE UPDATE]%')
                    .order('created_at', { ascending: false })
                    .limit(STAFF_BELL_LIMIT),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at')
                    .eq('status', SUPPORT_STATUS.SUBMITTED)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at, dept_notes')
                    .eq('status', SUPPORT_STATUS.REFERRED_TO_CARE)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('counseling_requests')
                    .select('id, student_id, student_name, request_type, status, created_at')
                    .eq('status', COUNSELING_STATUS.REFERRED)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase
                    .from('counseling_requests')
                    .select('id, student_id, student_name, request_type, status, created_at, scheduled_date')
                    .in('status', [COUNSELING_STATUS.STAFF_SCHEDULED, COUNSELING_STATUS.SCHEDULED])
                    .gte('scheduled_date', todayStart.toISOString())
                    .lt('scheduled_date', tomorrowStart.toISOString())
                    .order('scheduled_date', { ascending: true })
                    .limit(10),
                supabase
                    .from('support_requests')
                    .select('id, student_id, student_name, support_type, status, created_at, dept_notes')
                    .eq('status', SUPPORT_STATUS.VISIT_SCHEDULED)
                    .order('created_at', { ascending: false })
                    .limit(100)
            ]);

            const merged = dedupeAndLimitNotifications([
                ...((auditRows || []) as NotificationItem[]),
                ...((profileNotificationRows || []) as NotificationItem[]),
                ...((supportSubmittedRows || []) as SupportNotificationRow[]).map((row) => mapSupportSubmittedNotification(row)),
                ...((supportReferredRows || []) as SupportNotificationRow[]).map((row) => mapSupportReferredNotification(row)),
                ...((counselingReferredRows || []) as CounselingNotificationRow[]).map((row) => mapCounselingReferredNotification(row)),
                ...((counselingScheduledRows || []) as CounselingNotificationRow[])
                    .map((row) => mapCounselingScheduledTodayNotification(row))
                    .filter(Boolean) as NotificationItem[],
                ...((supportVisitRows || []) as SupportNotificationRow[])
                    .map((row) => mapSupportVisitScheduledTodayNotification(row))
                    .filter(Boolean) as NotificationItem[]
            ]);

            if (isMounted) {
                setNotifications(merged);
            }
        };

        bellSyncRef.current = fetchStaffBellNotifications;
        fetchStaffBellNotifications();

        const syncBellNotifications = () => {
            fetchStaffBellNotifications().catch((error) => {
                console.error('Failed to sync care staff notifications:', error);
            });
        };

        const handleWindowFocus = () => {
            syncBellNotifications();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                syncBellNotifications();
            }
        };

        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        const removeProfileNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_notifications')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: RealtimeChangePayload) => {
                    const action = payload?.new?.action;
                    if (typeof action !== 'string' || !PROFILE_NOTIFICATION_ACTIONS.includes(action)) {
                        return;
                    }
                    if (payload.new) {
                        setNotifications((prev) => prependNotification(prev, payload.new as NotificationItem));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeProfileNotificationsFallbackChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_notifications_fallback')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: RealtimeChangePayload) => {
                    const message = String(payload?.new?.message || '');
                    if (!message.startsWith('[PROFILE UPDATE]')) {
                        return;
                    }
                    if (payload.new) {
                        setNotifications((prev) => prependNotification(prev, payload.new as NotificationItem));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeSupportNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_service_notifications_support')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_requests' }, (payload: RealtimeChangePayload<SupportNotificationRow>) => {
                    if (!payload.new) return;
                    if (payload.new.status === SUPPORT_STATUS.SUBMITTED) {
                        setNotifications((prev) => prependNotification(prev, mapSupportSubmittedNotification(payload.new as SupportNotificationRow)));
                    }
                    if (payload.new.status === SUPPORT_STATUS.REFERRED_TO_CARE) {
                        setNotifications((prev) => prependNotification(prev, mapSupportReferredNotification(payload.new as SupportNotificationRow, new Date().toISOString())));
                    }
                    if (payload.new.status === SUPPORT_STATUS.VISIT_SCHEDULED) {
                        setNotifications((prev) => prependNotification(prev, mapSupportVisitScheduledTodayNotification(payload.new as SupportNotificationRow, new Date().toISOString())));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_requests' }, (payload: RealtimeChangePayload<SupportNotificationRow>) => {
                    if (!payload.new) return;

                    const nextStatus = payload.new.status;
                    const prevStatus = payload.old?.status;
                    const alertAt = new Date().toISOString();

                    if (nextStatus === SUPPORT_STATUS.REFERRED_TO_CARE && prevStatus !== SUPPORT_STATUS.REFERRED_TO_CARE) {
                        setNotifications((prev) => prependNotification(prev, mapSupportReferredNotification(payload.new as SupportNotificationRow, alertAt)));
                    }

                    const nextScheduledAt = parseTimestamp(parseJsonRecord(payload.new.dept_notes)?.scheduled_date);
                    const prevScheduledAt = parseTimestamp(parseJsonRecord(payload.old?.dept_notes)?.scheduled_date);
                    if (
                        nextStatus === SUPPORT_STATUS.VISIT_SCHEDULED &&
                        (prevStatus !== SUPPORT_STATUS.VISIT_SCHEDULED || nextScheduledAt !== prevScheduledAt)
                    ) {
                        setNotifications((prev) => prependNotification(prev, mapSupportVisitScheduledTodayNotification(payload.new as SupportNotificationRow, alertAt)));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeCounselingNotificationsChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_service_notifications_counseling')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'counseling_requests' }, (payload: RealtimeChangePayload<CounselingNotificationRow>) => {
                    if (!payload.new) return;
                    const alertAt = new Date().toISOString();
                    if (payload.new.status === COUNSELING_STATUS.REFERRED) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingReferredNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                    if (isCounselingCalendarVisible(payload.new.status)) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingScheduledTodayNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                })
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'counseling_requests' }, (payload: RealtimeChangePayload<CounselingNotificationRow>) => {
                    if (!payload.new) return;

                    const nextStatus = payload.new.status;
                    const prevStatus = payload.old?.status;
                    const alertAt = new Date().toISOString();

                    if (nextStatus === COUNSELING_STATUS.REFERRED && prevStatus !== COUNSELING_STATUS.REFERRED) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingReferredNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }

                    const nextScheduledAt = parseTimestamp(getCounselingScheduledDate(payload.new as CounselingNotificationRow));
                    const prevScheduledAt = parseTimestamp(getCounselingScheduledDate(payload.old as CounselingNotificationRow | undefined));
                    if (
                        isCounselingCalendarVisible(nextStatus) &&
                        (prevStatus !== nextStatus || nextScheduledAt !== prevScheduledAt)
                    ) {
                        setNotifications((prev) => prependNotification(prev, mapCounselingScheduledTodayNotification(payload.new as CounselingNotificationRow, alertAt)));
                    }
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        return () => {
            isMounted = false;
            bellSyncRef.current = async () => undefined;
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            removeProfileNotificationsChannel();
            removeProfileNotificationsFallbackChannel();
            removeSupportNotificationsChannel();
            removeCounselingNotificationsChannel();
        };
    }, []);

    const logAudit = useCallback(async (action: string, details: unknown) => {
        try {
            const { error } = await supabase.from('audit_logs').insert([
                {
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
        if (isResettingSystem) return;
        setShowResetModal(false);
        setIsResettingSystem(true);
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
        } finally {
            setIsResettingSystem(false);
        }
    }, [isResettingSystem, showToastMessage]);

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
        },
        handleViewProfile: (studentId: string) => {
            setPendingProfileId(studentId);
            setActiveTab('population');
        }
    }), [handleResetSystem, logAudit, showToastMessage]);

    const setActiveTabFromString = useCallback((tab: string) => {
        setActiveTab(tab as ActiveTab);
    }, []);

    const tabLoadingFallback = (
        <div className="rounded-2xl border border-purple-100 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
            <p className="text-sm font-semibold text-gray-700">Loading module...</p>
            <p className="mt-1 text-xs text-gray-500">Preparing this page and its assets.</p>
        </div>
    );

    const renderActiveTab = (): React.ReactNode => {
        switch (activeTab) {
            case 'home':
                return <HomePage functions={functions} />;
            case 'population':
                return <StudentPopulationPage functions={functions} pendingProfileId={pendingProfileId} onProfileOpened={() => setPendingProfileId(null)} />;
            case 'dashboard':
                return <CareStaffDashboardView setActiveTab={setActiveTabFromString} />;
            case 'analytics':
                return (
                    <Suspense fallback={tabLoadingFallback}>
                        <StudentAnalyticsPage functions={functions} />
                    </Suspense>
                );
            case 'nat':
                return <NATManagementPage showToast={showToastMessage} />;
            case 'counseling':
                return <CounselingPage functions={functions} />;
            case 'support':
                return <SupportRequestsPage functions={functions} />;
            case 'events':
                return <EventsPage functions={functions} />;
            case 'calendar':
                return <StaffCalendarPage scope="care" accent="purple" />;
            case 'export_center':
                return <StaffExportCenterPage scope="care" accent="purple" showToast={showToastMessage} />;
            case 'scholarship':
                return <ScholarshipPage functions={functions} />;
            case 'forms':
                return <FormManagementPage functions={functions} />;
            case 'feedback':
                return <FeedbackPage functions={functions} />;
            case 'settings':
                return (
                    <div className="space-y-6">
                        <StaffAccountSecurityPage
                            portalLabel="CARE Staff"
                            authEmail={session?.user?.email || session?.auth_email || ''}
                            staffName={session?.full_name || 'CARE Staff'}
                            staffRole="Care Staff"
                            requestStaffSecurityOtp={requestStaffSecurityOtp}
                            confirmStaffSecurityEmailChange={confirmStaffSecurityEmailChange}
                            confirmStaffPasswordChange={confirmStaffPasswordChange}
                            updateStaffProfileName={updateStaffProfileName}
                            showToast={showToastMessage}
                        />
                        <div className="rounded-3xl border border-purple-100/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-purple-500/80">Student Activation Policy</p>
                                    <h2 className="mt-2 text-xl font-bold text-slate-900">Require enrollment keys before Student Portal activation</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                        When this is turned on, students must match an uploaded enrollment key before their Student Portal account can be activated.
                                        When turned off, the portal still checks first, then shows a warning and lets the student continue like the previous NAT activation flow.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={toggleStudentActivationPolicy}
                                    disabled={isLoadingStudentActivationPolicy || isSavingStudentActivationPolicy}
                                    className={`relative inline-flex h-11 w-24 items-center rounded-full border px-1 transition-all ${
                                        studentActivationPolicy.requireEnrollmentKey
                                            ? 'border-emerald-200 bg-emerald-500/90'
                                            : 'border-amber-200 bg-amber-400/90'
                                    } ${(isLoadingStudentActivationPolicy || isSavingStudentActivationPolicy) ? 'cursor-not-allowed opacity-60' : 'hover:scale-[1.02]'}`}
                                    aria-pressed={studentActivationPolicy.requireEnrollmentKey}
                                >
                                    <span
                                        className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[10px] font-black uppercase tracking-wide text-slate-700 shadow-sm transition-transform ${
                                            studentActivationPolicy.requireEnrollmentKey ? 'translate-x-0' : 'translate-x-12'
                                        }`}
                                    >
                                        {studentActivationPolicy.requireEnrollmentKey ? 'ON' : 'OFF'}
                                    </span>
                                </button>
                            </div>
                            <div className={`mt-5 rounded-2xl border p-4 ${
                                studentActivationPolicy.requireEnrollmentKey
                                    ? 'border-emerald-100 bg-emerald-50/70'
                                    : 'border-amber-100 bg-amber-50/80'
                            }`}>
                                <p className="text-sm font-semibold text-slate-800">
                                    Current mode:{' '}
                                    <span className={studentActivationPolicy.requireEnrollmentKey ? 'text-emerald-700' : 'text-amber-700'}>
                                        {studentActivationPolicy.requireEnrollmentKey
                                            ? 'Enrollment key required before activation'
                                            : 'Warning first, then continue activation if no key exists'}
                                    </span>
                                </p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                    {isLoadingStudentActivationPolicy
                                        ? 'Loading the latest activation policy...'
                                        : studentActivationPolicy.requireEnrollmentKey
                                            ? 'Students will stop at activation until CARE Staff uploads or syncs their enrollment key.'
                                            : 'Students can review a warning and continue activation even if CARE Staff has not uploaded the enrollment key yet.'}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'audit':
                return <AuditLogsPage />;
            case 'logbook':
                return <OfficeLogbookPage functions={functions} />;
            default:
                return null;
        }
    };

    const headerTitle = HEADER_TITLES[activeTab] || activeTab;

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden animate-backdrop" onClick={() => setSidebarOpen(false)} />}

            {/* Premium Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-72 bg-gradient-sidebar transform transition-all duration-500 ease-out lg:static lg:translate-x-0 flex flex-col ${sidebarOpen ? 'translate-x-0 shadow-2xl shadow-purple-900/30' : '-translate-x-full'}`}>
                {/* Logo Area */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="cursor-pointer group" onClick={() => setActiveTab('settings')}>
                            <NorsuBrand title="CARE Staff" subtitle="NORSU-G CARE operations" accent="purple" size="sm" className="min-w-0" />
                            <p className="mt-2 pl-[4.4rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-200/50 transition-colors group-hover:text-purple-100/80">Open Profile & Settings</p>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-purple-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
                    </div>
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
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-500/70">NORSU-G CARE</p>
                            <h2 className="text-xl font-bold gradient-text">{headerTitle}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <img src="/carecenter.png" alt="NORSU-G CARE" className="hidden h-10 w-10 rounded-full border border-purple-100 bg-white object-cover shadow-sm md:block" />
                        <button
                            onClick={refreshAll}
                            disabled={isRefreshing}
                            title="Refresh Current View"
                            className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-purple-600 hover:shadow-md transition-all border border-gray-100 disabled:opacity-50"
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            <span>{isRefreshing ? 'Refreshing...' : 'Refresh View'}</span>
                        </button>
                        <NotificationBell notifications={notifications} accentColor="purple" expandProfileUpdates />
                    </div>
                </header>

                <div key={`${activeTab}-${refreshNonce}`} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">
                    {renderActiveTab()}

                    {renderCareStaffModals({
                        showCommandHub, setShowCommandHub, commandHubTab, setCommandHubTab, staffNotes, setStaffNotes,
                        setActiveTab, toast, setToast,
                        showResetModal, setShowResetModal, handleResetSystem, isResettingSystem,
                    })}
                </div>
            </main>
        </div>
    );
};

export default CareStaffDashboard;
