import { LayoutDashboard, Users, UserCheck, CalendarDays, ClipboardList, BookOpen, AlertCircle, FileText, Settings, FileSpreadsheet } from 'lucide-react';
import Sidebar, { type NavSection, type SidebarAccent } from '../../../components/layout/Sidebar';

// ── Per-college sidebar colors ──
// Tailwind can't build class names from variables, so each color is spelled out.
// To theme another college: add a preset below and map its code in COLLEGE_ACCENTS.
const EMERALD: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#052e16_0%,#064e3b_50%,#065f46_100%)] border-r border-emerald-500/10',
    activeBg: 'bg-emerald-500/10 backdrop-blur-md', activeText: 'text-emerald-300 font-semibold', activeBarClass: 'bg-emerald-500',
    sectionText: 'text-emerald-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-emerald-100', brandAccent: 'emerald',
    pill: 'from-emerald-400/60 to-emerald-700/80 border-emerald-300/20', pillShadow: '0 4px 0 rgba(16,120,90,0.5), 0 6px 12px rgba(16,120,90,0.35)',
};
const BLUE: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#0c1a2e_0%,#0f2a4a_50%,#0b3a63_100%)] border-r border-blue-500/10',
    activeBg: 'bg-blue-500/10 backdrop-blur-md', activeText: 'text-blue-300 font-semibold', activeBarClass: 'bg-blue-500',
    sectionText: 'text-blue-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-blue-100', brandAccent: 'blue',
    pill: 'from-blue-400/60 to-blue-700/80 border-blue-300/20', pillShadow: '0 4px 0 rgba(40,80,160,0.5), 0 6px 12px rgba(40,80,160,0.35)',
};
const GREEN: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#0a2e14_0%,#166534_50%,#15803d_100%)] border-r border-green-500/10',
    activeBg: 'bg-green-500/10 backdrop-blur-md', activeText: 'text-green-300 font-semibold', activeBarClass: 'bg-green-500',
    sectionText: 'text-green-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-green-100', brandAccent: 'emerald',
    pill: 'from-green-400/60 to-green-700/80 border-green-300/20', pillShadow: '0 4px 0 rgba(30,130,60,0.5), 0 6px 12px rgba(30,130,60,0.35)',
};
const RED: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#2e0a0a_0%,#4a0f0f_50%,#631b1b_100%)] border-r border-red-500/10',
    activeBg: 'bg-red-500/10 backdrop-blur-md', activeText: 'text-red-300 font-semibold', activeBarClass: 'bg-red-500',
    sectionText: 'text-red-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-red-100', brandAccent: 'purple',
    pill: 'from-red-400/60 to-red-700/80 border-red-300/20', pillShadow: '0 4px 0 rgba(160,40,40,0.5), 0 6px 12px rgba(160,40,40,0.35)',
};
const PURPLE: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#1a0b2e_0%,#2e1054_50%,#3b1466_100%)] border-r border-purple-500/10',
    activeBg: 'bg-purple-500/10 backdrop-blur-md', activeText: 'text-purple-300 font-semibold', activeBarClass: 'bg-purple-500',
    sectionText: 'text-purple-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-purple-100', brandAccent: 'purple',
    pill: 'from-purple-400/60 to-purple-700/80 border-purple-300/20', pillShadow: '0 4px 0 rgba(120,60,180,0.5), 0 6px 12px rgba(120,60,180,0.35)',
};
const AMBER: SidebarAccent = {
    sidebar: 'bg-[linear-gradient(180deg,#2e1e05_0%,#4a340f_50%,#63491b_100%)] border-r border-amber-500/10',
    activeBg: 'bg-amber-500/10 backdrop-blur-md', activeText: 'text-amber-300 font-semibold', activeBarClass: 'bg-amber-500',
    sectionText: 'text-amber-400/40', hoverBg: 'hover:bg-white/5', hoverText: 'hover:text-amber-100', brandAccent: 'purple',
    pill: 'from-amber-400/60 to-amber-700/80 border-amber-300/20', pillShadow: '0 4px 0 rgba(160,120,40,0.5), 0 6px 12px rgba(160,120,40,0.35)',
};

// Single source of truth: college code → accent key. The key drives BOTH the sidebar
// preset (below) and the portal-wide retint (`data-dept-accent` on the dept root, whose
// color values live in index.css). CAS is dark green (emerald); CAFF the brighter green.
const CODE_TO_KEY: Record<string, string> = {
    CAFF: 'green',
    CAS: 'emerald',
    CBA: 'amber',
    CCJE: 'purple',
    CIT: 'red',
    CTED: 'blue',
};
const KEY_TO_ACCENT: Record<string, SidebarAccent> = {
    green: GREEN, emerald: EMERALD, amber: AMBER, purple: PURPLE, red: RED, blue: BLUE,
};

/** Department strings look like "CCJE (College of Criminal Justice Education)" — key off the leading code. */
export function deptAccentKey(department?: string): string {
    const code = String(department || '').trim().split(/[\s(]/)[0].toUpperCase();
    return CODE_TO_KEY[code] ?? 'emerald';
}
function getDeptAccent(department?: string): SidebarAccent {
    return KEY_TO_ACCENT[deptAccentKey(department)];
}

const DEPT_SECTIONS: NavSection[] = [
    { items: [{ id: 'dashboard', label: 'Home', icon: LayoutDashboard }] },
    {
        title: 'Services',
        withDivider: true,
        items: [
            { id: 'admissions', label: 'Admissions Screening', icon: UserCheck, indicator: true },
            { id: 'interview_queue', label: 'Interview Queue', icon: ClipboardList },
            { id: 'counseling_queue', label: 'Counseling & Referrals', icon: Users },
            { id: 'support_approvals', label: 'Additional Support', icon: AlertCircle, indicator: true },
        ],
    },
    {
        title: 'Management',
        withDivider: true,
        items: [
            { id: 'students', label: 'Students Directory', icon: BookOpen },
            { id: 'counseled', label: 'Counseled Students', icon: Users },
            { id: 'events', label: 'College Events', icon: CalendarDays },
        ],
    },
    {
        title: 'System',
        withDivider: true,
        items: [
            { id: 'reports', label: 'Reports', icon: FileText },
            { id: 'export_center', label: 'Export Center', icon: FileSpreadsheet },
            { id: 'settings', label: 'Settings', icon: Settings },
        ],
    },
];

export function DeptSidebar({
    data,
    activeModule,
    setActiveModule,
    setIsSidebarOpen,
    handleLogout,
    isCollapsed,
    onToggleCollapse,
}: any) {
    return (
        <Sidebar
            sections={DEPT_SECTIONS}
            activeTab={activeModule}
            onTabChange={(tab) => { setActiveModule(tab); setIsSidebarOpen(false); }}
            onLogout={handleLogout}
            accentStyle={getDeptAccent(data?.profile?.department)}
            brandTitle={data?.profile?.department || 'NORSU G COLLEGE'}
            brandCareSrc={null}
            brandStacked
            isCollapsed={isCollapsed}
            onToggleCollapse={onToggleCollapse}
        />
    );
}
