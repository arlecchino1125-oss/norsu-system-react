import type { LucideIcon } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
export type ToastHandler = (msg: string, type?: ToastType) => void;

export const ACTIVE_TABS = [
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

export type ActiveTab = (typeof ACTIVE_TABS)[number];
export type CommandHubTab = 'actions' | 'help' | 'notes';

export interface NotificationItem {
    id?: string | number;
    action?: string;
    details?: unknown;
    message?: string;
    created_at?: string | null;
    time_label?: string | null;
    sort_at?: string | null;
}

export interface StaffNote {
    id: number;
    text: string;
    time: string;
}

export interface AuthSession {
    id?: string;
    full_name?: string;
    auth_email?: string;
    user?: {
        email?: string;
    };
}

export interface SupportNotificationRow {
    id?: string | number;
    student_id?: string | null;
    student_name?: string | null;
    support_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    dept_notes?: string | null;
}

export interface CounselingNotificationRow {
    id?: string | number;
    student_id?: string | null;
    student_name?: string | null;
    request_type?: string | null;
    status?: string | null;
    created_at?: string | null;
    scheduled_date?: string | null;
    schedule_date?: string | null;
}

export interface RealtimeChangePayload<T = NotificationItem> {
    old?: T;
    new?: T;
}

type NavItem = { tab: ActiveTab; label: string; icon: LucideIcon };
export type NavSection = { title?: string; withDivider?: boolean; items: NavItem[] };

export interface CareStaffDashboardFunctions {
    showToast: ToastHandler;
    showToastMessage: ToastHandler;
    logAudit: (action: string, details: unknown) => Promise<void>;
    handleGetStarted: () => void;
    handleDocs: () => void;
    handleLaunchModule: (module: string) => void;
    handleOpenAnalytics: () => void;
    handleStatClick: (stat: string) => void;
    handleViewAllActivity: () => void;
    handleQuickAction: (action: string) => void;
    handleViewProfile?: (studentId: string) => void;
}
