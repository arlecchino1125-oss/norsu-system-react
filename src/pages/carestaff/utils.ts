import {
    Activity,
    Award,
    BarChart2,
    BookOpen,
    Calendar,
    CheckCircle,
    ClipboardList,
    Download,
    FileText,
    LayoutDashboard,
    Shield,
    Star,
    Users
} from 'lucide-react';
import type { ActiveTab, NavSection } from './types';

export const PROFILE_NOTIFICATION_ACTIONS = [
    'Student Profile Updated',
    'Student Profile Completed',
    'Student Profile Picture Updated'
];

export const CARE_STAFF_TAB_FEATURES: Partial<Record<ActiveTab, string>> = {
    population: 'student_population',
    analytics: 'student_analytics',
    nat: 'nat_management',
    counseling: 'counseling',
    support: 'support_requests',
    events: 'events',
    calendar: 'calendar',
    scholarship: 'scholarships',
    forms: 'forms',
    feedback: 'feedback',
    export_center: 'export_center',
    settings: 'settings',
    audit: 'audit_logs',
    logbook: 'office_logbook'
};

export const CARE_STAFF_REFRESHABLE_TABS = new Set<ActiveTab>([
    'population',
    'dashboard',
    'counseling',
    'support',
    'audit'
]);

export const NAV_SECTIONS: NavSection[] = [
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

export const HEADER_TITLES: Record<ActiveTab, string> = {
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

export const MODULE_TAB_MAP: Record<string, ActiveTab> = {
    'Student Analytics': 'analytics',
    'Form Management': 'forms',
    'Event Broadcasting': 'events',
    'Scholarship Tracking': 'scholarship'
};

export const STAT_TAB_MAP: Record<string, ActiveTab> = {
    students: 'population',
    cases: 'support',
    events: 'events',
    reports: 'forms',
    forms: 'forms'
};

export const QUICK_ACTION_TAB_MAP: Record<string, ActiveTab> = {
    'Schedule Wellness Check': 'counseling',
    'View Reports': 'analytics'
};

export const STAFF_BELL_LIMIT = 25;
