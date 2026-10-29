import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, RefreshCw, LogOut, KeyRound, ArrowUpRight,
    Users, Building2, Activity, LayoutGrid, FileText
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { getSafeErrorMessage } from '../utils/errorMasking';
import { useToast, type ToastType } from '../components/ui/toast/useToast';

import { useAdminData } from './admin/hooks/useAdminData';
import { useAdminActions } from './admin/hooks/useAdminActions';
import { useAdminAuditLogs } from './admin/hooks/useAdminAuditLogs';
import type { AdminPanelKey } from './admin/types';

import { StaffAccountsPanel } from './admin/features/staff/components/StaffAccountsPanel';
import { StaffProvisionModal } from './admin/features/staff/components/StaffProvisionModal';
import { CollegesPanel } from './admin/features/colleges/components/CollegesPanel';
import { CollegesModal } from './admin/features/colleges/components/CollegesModal';
import { AuditPanel } from './admin/features/audit/components/AuditPanel';
import { AuditModal } from './admin/features/audit/components/AuditModal';
import { GovernancePanel } from './admin/features/system/components/GovernancePanel';
import { GovernanceModal } from './admin/features/system/components/GovernanceModal';
import { StudentAuthHealthModal } from './admin/features/students/components/StudentAuthHealthModal';

type MobileSectionKey = 'Overview' | 'Staff' | 'Audit Logs' | 'Colleges' | 'Role Map';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;

    const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
    const [activePanelModal, setActivePanelModal] = useState<AdminPanelKey | null>(null);
    const [activeMobileSection, setActiveMobileSection] = useState<MobileSectionKey>('Overview');

    useEffect(() => {
        if (!isAuthenticated) navigate('/admin');
    }, [isAuthenticated, navigate]);

    const { showToast: pushSharedToast } = useToast();
    const showToast = React.useCallback((msg: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(msg) : msg;
        pushSharedToast(safeMessage, type as ToastType);
    }, [pushSharedToast]);

    const adminStats = useAdminData();
    const {
        accounts,
        departmentsData,
        coursesData,
        studentsData,
        applicationsCount,
        departments,
        linkedStudentCount,
        authPendingStudentCount,
        refetchAccounts,
        refetchDepartments,
        refetchCourses,
        refetchStudents,
        refetchApplications
    } = adminStats;

    const adminActions = useAdminActions({ showToast, session, refetchAccounts });
    const auditLogsData = useAdminAuditLogs(Boolean(isAuthenticated), showToast);

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await Promise.all([
                refetchAccounts(),
                refetchDepartments(),
                refetchCourses(),
                refetchStudents(),
                refetchApplications(),
                auditLogsData.fetchAuditLogs()
            ]);
            showToast('Admin data refreshed.');
        } catch (error: any) {
            showToast("Couldn't refresh admin data.", 'error');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/admin');
    };

    const activeStudentCount = studentsData.filter(s => String(s.status || '').trim() === 'Active').length;

    if (!session) return null;

    return (
        <div className="min-h-screen bg-[#F3F7F9] text-slate-800 font-['Outfit',sans-serif]">
            {/* Desktop Dashboard Container (hidden on mobile < 768px) */}
            <div className="hidden md:block max-w-[1380px] mx-auto px-6 py-4 space-y-4">
                {/* Section A: Compact Executive Hero Header */}
                <div
                    className="relative rounded-2xl px-5 py-4 text-white overflow-hidden shadow-md space-y-3.5"
                    style={{
                        background: 'linear-gradient(135deg, #0b2327 0%, #0f3d39 52%, #0a2024 100%)'
                    }}
                >
                    {/* Ambient Glow Overlay */}
                    <div
                        className="pointer-events-none absolute inset-0 opacity-80"
                        style={{
                            background: 'radial-gradient(ellipse at 35% 0%, rgba(16, 185, 129, 0.20) 0%, transparent 65%)'
                        }}
                    />

                    {/* Top Row: Heading on Left, Controls on Right */}
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-white leading-none">
                                    Account Management
                                </h1>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold tracking-widest uppercase text-emerald-200">
                                    <Shield size={10} className="text-emerald-300" />
                                    <span>Admin Control Room</span>
                                </span>
                            </div>
                            <p className="text-emerald-100/70 text-xs mt-1 truncate">
                                Manage staff access, institutional colleges, and cross-role governance from one unified admin workspace.
                            </p>
                        </div>

                        {/* Right: Compact Horizontal Operational Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.06] border border-white/15 rounded-xl p-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleRefreshData}
                                disabled={isRefreshingData}
                                className="py-1.5 px-3 rounded-lg bg-white text-slate-900 font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs hover:bg-slate-100 transition cursor-pointer disabled:opacity-60"
                            >
                                <RefreshCw size={12} className={isRefreshingData ? 'animate-spin' : ''} />
                                <span>Refresh Data</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/admin/permissions')}
                                className="py-1.5 px-3 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/35 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <KeyRound size={12} className="text-emerald-300" />
                                <span>Role Permissions</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => navigate('/privacy-policy')}
                                className="py-1.5 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/90 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <FileText size={12} />
                                <span>Privacy Policy</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleLogout}
                                className="py-1.5 px-2.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 text-white/80 font-semibold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <LogOut size={12} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Full-Width 4-Column Single-Source-of-Truth KPI Strip */}
                    <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-0.5">
                        {/* 1. Staff Accounts */}
                        <button
                            type="button"
                            onClick={() => setActivePanelModal('staff_accounts')}
                            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition text-left group"
                        >
                            <div className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/90 leading-tight">
                                    Staff Accounts
                                </p>
                                <p className="text-[11px] text-white/60 font-medium truncate mt-0.5">
                                    Active institutional logins
                                </p>
                            </div>
                            <span className="text-2xl font-extrabold tabular-nums text-white group-hover:text-emerald-200 transition-colors">
                                {accounts.length}
                            </span>
                        </button>

                        {/* 2. Colleges */}
                        <button
                            type="button"
                            onClick={() => setActivePanelModal('colleges')}
                            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition text-left group"
                        >
                            <div className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/90 leading-tight">
                                    Colleges
                                </p>
                                <p className="text-[11px] text-white/60 font-medium truncate mt-0.5">
                                    {coursesData.length} academic courses assigned
                                </p>
                            </div>
                            <span className="text-2xl font-extrabold tabular-nums text-white group-hover:text-emerald-200 transition-colors">
                                {departmentsData.length}
                            </span>
                        </button>

                        {/* 3. Student Records ↗ */}
                        <button
                            type="button"
                            onClick={() => setActivePanelModal('student_access')}
                            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition text-left group"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/90 leading-tight">
                                    <span>Student Records</span>
                                    <ArrowUpRight size={12} className="text-emerald-300" />
                                </div>
                                <p className="text-[11px] text-white/60 font-medium truncate mt-0.5">
                                    {activeStudentCount.toLocaleString()} active &middot; ID &amp; Auth Tools
                                </p>
                            </div>
                            <span className="text-2xl font-extrabold tabular-nums text-white group-hover:text-emerald-200 transition-colors">
                                {studentsData.length.toLocaleString()}
                            </span>
                        </button>

                        {/* 4. Tracked Staff Logs */}
                        <button
                            type="button"
                            onClick={() => setActivePanelModal('audit_monitor')}
                            className="rounded-xl bg-white/[0.08] hover:bg-white/[0.13] border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-2 cursor-pointer transition text-left group"
                        >
                            <div className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-200/90 leading-tight">
                                    Tracked Staff Logs
                                </p>
                                <p className="text-[11px] text-white/60 font-medium truncate mt-0.5">
                                    Cross-role staff actions
                                </p>
                            </div>
                            <span className="text-2xl font-extrabold tabular-nums text-white group-hover:text-emerald-200 transition-colors">
                                {auditLogsData.auditTotalCount.toLocaleString()}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Section B: Balanced 12-Column Dynamic-Stretch Workspace Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Left Column (lg:col-span-7): Interactive Staff Accounts Workspace */}
                    <StaffAccountsPanel
                        accounts={accounts}
                        departments={departments}
                        onOpenModal={() => setActivePanelModal('staff_accounts')}
                        showToast={showToast}
                        refetchAccounts={refetchAccounts}
                        handleArchiveAccount={adminActions.handleArchiveAccount}
                        invokeManagedStaffFunction={adminActions.invokeManagedStaffFunction}
                    />

                    {/* Right Column (lg:col-span-5): 3-Card Right Rail */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Card 1: Toggleable Minimized Staff Audit Notification Log */}
                        <AuditPanel
                            auditLogs={auditLogsData.auditLogs}
                            auditLoading={auditLogsData.auditLoading}
                            auditTotalCount={auditLogsData.auditTotalCount}
                            auditRoleFilter={auditLogsData.auditRoleFilter}
                            setAuditRoleFilter={auditLogsData.setAuditRoleFilter}
                            auditSearch={auditLogsData.auditSearch}
                            setAuditSearch={auditLogsData.setAuditSearch}
                            onOpenModal={() => setActivePanelModal('audit_monitor')}
                        />

                        {/* Card 2: Institutional Colleges */}
                        <CollegesPanel
                            departmentsData={departmentsData}
                            coursesData={coursesData}
                            onOpenModal={() => setActivePanelModal('colleges')}
                            showToast={showToast}
                            refetchDepartments={refetchDepartments}
                        />

                        {/* Card 3: Governance & Role Signals (Role Map) */}
                        <GovernancePanel
                            onOpenModal={() => setActivePanelModal('governance')}
                            onOpenAuditModal={() => setActivePanelModal('audit_monitor')}
                        />
                    </div>
                </div>
            </div>

            {/* Dedicated Mobile View (< 768px / Mobile Layout Mode) */}
            <div className="block md:hidden pb-20">
                {/* 1. Compact Sticky App Header */}
                <div
                    className="sticky top-0 z-30 px-3 py-2.5 text-white shadow-md space-y-2"
                    style={{
                        background: 'linear-gradient(135deg, #0b2327 0%, #0f3d39 52%, #0a2024 100%)'
                    }}
                >
                    {/* Top row: Title + Admin pill on left; Refresh + Permissions on right */}
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <h1 className="text-base font-extrabold tracking-tight text-white truncate">
                                Account Management
                            </h1>
                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[9px] font-bold tracking-wider uppercase text-emerald-200 shrink-0">
                                Admin
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                type="button"
                                onClick={handleRefreshData}
                                disabled={isRefreshingData}
                                className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white hover:bg-white/20 transition cursor-pointer"
                                aria-label="Refresh Data"
                            >
                                <RefreshCw size={13} className={isRefreshingData ? 'animate-spin' : ''} />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/admin/permissions')}
                                className="px-2 py-1 rounded-lg bg-emerald-500/25 border border-emerald-400/35 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                                <KeyRound size={11} className="text-emerald-300" />
                                <span>Roles</span>
                            </button>
                        </div>
                    </div>

                    {/* Bottom row: Single-row 4-column compact KPI bar */}
                    <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
                        <div
                            onClick={() => setActivePanelModal('staff_accounts')}
                            className="rounded-lg bg-white/[0.08] p-1.5 border border-white/10 cursor-pointer"
                        >
                            <p className="text-[8.5px] font-extrabold uppercase text-emerald-200 truncate">Staff</p>
                            <p className="text-sm font-extrabold tabular-nums text-white mt-0.5">{accounts.length}</p>
                        </div>
                        <div
                            onClick={() => setActivePanelModal('colleges')}
                            className="rounded-lg bg-white/[0.08] p-1.5 border border-white/10 cursor-pointer"
                        >
                            <p className="text-[8.5px] font-extrabold uppercase text-emerald-200 truncate">Colleges</p>
                            <p className="text-sm font-extrabold tabular-nums text-white mt-0.5">{departmentsData.length}</p>
                        </div>
                        <div
                            onClick={() => setActivePanelModal('student_access')}
                            className="rounded-lg bg-white/[0.08] p-1.5 border border-white/10 cursor-pointer"
                        >
                            <p className="text-[8.5px] font-extrabold uppercase text-emerald-200 truncate">Students</p>
                            <p className="text-sm font-extrabold tabular-nums text-white mt-0.5">{studentsData.length.toLocaleString()}</p>
                        </div>
                        <div
                            onClick={() => setActivePanelModal('audit_monitor')}
                            className="rounded-lg bg-white/[0.08] p-1.5 border border-white/10 cursor-pointer"
                        >
                            <p className="text-[8.5px] font-extrabold uppercase text-emerald-200 truncate">Logs</p>
                            <p className="text-sm font-extrabold tabular-nums text-white mt-0.5">{auditLogsData.auditTotalCount.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* 2. Horizontal Section Switcher Pills */}
                <div className="sticky top-[86px] z-20 bg-[#F3F7F9]/95 backdrop-blur-xs border-b border-slate-200/80 px-3 py-2 overflow-x-auto touch-pan-x flex items-center gap-1.5 custom-scrollbar">
                    {(['Overview', 'Staff', 'Audit Logs', 'Colleges', 'Role Map'] as MobileSectionKey[]).map(sec => {
                        const isActive = activeMobileSection === sec;
                        return (
                            <button
                                type="button"
                                key={sec}
                                onClick={() => setActiveMobileSection(sec)}
                                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${isActive
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                                    }`}
                            >
                                {sec}
                            </button>
                        );
                    })}
                </div>

                {/* 3. Mobile Active Section Content */}
                <div className="p-3 space-y-3">
                    {activeMobileSection === 'Overview' && (
                        <>
                            <StaffAccountsPanel
                                accounts={accounts}
                                departments={departments}
                                onOpenModal={() => setActivePanelModal('staff_accounts')}
                                showToast={showToast}
                                refetchAccounts={refetchAccounts}
                                handleArchiveAccount={adminActions.handleArchiveAccount}
                                invokeManagedStaffFunction={adminActions.invokeManagedStaffFunction}
                            />
                            <AuditPanel
                                auditLogs={auditLogsData.auditLogs}
                                auditLoading={auditLogsData.auditLoading}
                                auditTotalCount={auditLogsData.auditTotalCount}
                                auditRoleFilter={auditLogsData.auditRoleFilter}
                                setAuditRoleFilter={auditLogsData.setAuditRoleFilter}
                                auditSearch={auditLogsData.auditSearch}
                                setAuditSearch={auditLogsData.setAuditSearch}
                                onOpenModal={() => setActivePanelModal('audit_monitor')}
                            />
                            <CollegesPanel
                                departmentsData={departmentsData}
                                coursesData={coursesData}
                                onOpenModal={() => setActivePanelModal('colleges')}
                                showToast={showToast}
                                refetchDepartments={refetchDepartments}
                            />
                            <GovernancePanel
                                onOpenModal={() => setActivePanelModal('governance')}
                                onOpenAuditModal={() => setActivePanelModal('audit_monitor')}
                            />
                        </>
                    )}

                    {activeMobileSection === 'Staff' && (
                        <StaffAccountsPanel
                            accounts={accounts}
                            departments={departments}
                            onOpenModal={() => setActivePanelModal('staff_accounts')}
                            showToast={showToast}
                            refetchAccounts={refetchAccounts}
                            handleArchiveAccount={adminActions.handleArchiveAccount}
                            invokeManagedStaffFunction={adminActions.invokeManagedStaffFunction}
                        />
                    )}

                    {activeMobileSection === 'Audit Logs' && (
                        <AuditPanel
                            auditLogs={auditLogsData.auditLogs}
                            auditLoading={auditLogsData.auditLoading}
                            auditTotalCount={auditLogsData.auditTotalCount}
                            auditRoleFilter={auditLogsData.auditRoleFilter}
                            setAuditRoleFilter={auditLogsData.setAuditRoleFilter}
                            auditSearch={auditLogsData.auditSearch}
                            setAuditSearch={auditLogsData.setAuditSearch}
                            onOpenModal={() => setActivePanelModal('audit_monitor')}
                        />
                    )}

                    {activeMobileSection === 'Colleges' && (
                        <CollegesPanel
                            departmentsData={departmentsData}
                            coursesData={coursesData}
                            onOpenModal={() => setActivePanelModal('colleges')}
                            showToast={showToast}
                            refetchDepartments={refetchDepartments}
                        />
                    )}

                    {activeMobileSection === 'Role Map' && (
                        <GovernancePanel
                            onOpenModal={() => setActivePanelModal('governance')}
                            onOpenAuditModal={() => setActivePanelModal('audit_monitor')}
                        />
                    )}
                </div>

                {/* 4. Sticky Bottom Navigation Bar */}
                <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around shadow-lg">
                    <button
                        type="button"
                        onClick={() => setActiveMobileSection('Overview')}
                        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${activeMobileSection === 'Overview' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <LayoutGrid size={16} />
                        <span>Control Room</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMobileSection('Staff')}
                        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${activeMobileSection === 'Staff' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Users size={16} />
                        <span>Staff ({accounts.length})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMobileSection('Audit Logs')}
                        className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10.5px] font-bold transition-colors cursor-pointer ${activeMobileSection === 'Audit Logs' ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        <Activity size={16} />
                        <span>Audit Log</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/permissions')}
                        className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-lg text-[10.5px] font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                        <KeyRound size={16} />
                        <span>RBAC Roles</span>
                    </button>
                </div>
            </div>

            {/* Modal Workspaces */}
            <StaffProvisionModal
                isOpen={activePanelModal === 'staff_accounts' || activePanelModal === 'staffAccounts'}
                onClose={() => setActivePanelModal(null)}
                departments={departments}
                showToast={showToast}
                refetchAccounts={refetchAccounts}
            />

            <CollegesModal
                isOpen={activePanelModal === 'colleges'}
                onClose={() => setActivePanelModal(null)}
                departmentsData={departmentsData}
                coursesData={coursesData}
                showToast={showToast}
                refetchDepartments={refetchDepartments}
            />

            <StudentAuthHealthModal
                isOpen={activePanelModal === 'student_access' || activePanelModal === 'studentOverview'}
                onClose={() => setActivePanelModal(null)}
                studentsData={studentsData}
                applicationsCount={applicationsCount}
                linkedStudentCount={linkedStudentCount}
                authPendingStudentCount={authPendingStudentCount}
                showToast={showToast}
                handleRefreshData={handleRefreshData}
                invokeManagedStudentFunction={adminActions.invokeManagedStudentFunction}
            />

            <AuditModal
                isOpen={activePanelModal === 'audit_monitor' || activePanelModal === 'audit'}
                onClose={() => setActivePanelModal(null)}
                auditLogs={auditLogsData.auditLogs}
                auditLoading={auditLogsData.auditLoading}
                auditTotalCount={auditLogsData.auditTotalCount}
                auditRoleFilter={auditLogsData.auditRoleFilter}
                setAuditRoleFilter={auditLogsData.setAuditRoleFilter}
                auditSearch={auditLogsData.auditSearch}
                setAuditSearch={auditLogsData.setAuditSearch}
                auditPage={auditLogsData.auditPage}
                setAuditPage={auditLogsData.setAuditPage}
            />

            <GovernanceModal
                isOpen={activePanelModal === 'governance'}
                onClose={() => setActivePanelModal(null)}
                onNavigatePermissions={() => navigate('/admin/permissions')}
            />
        </div>
    );
}
