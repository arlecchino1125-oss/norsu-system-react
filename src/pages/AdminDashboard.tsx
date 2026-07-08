import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, LogOut, KeyRound, Maximize2, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getSafeErrorMessage } from '../utils/errorMasking';
import { useToast, type ToastType } from '../components/ui/toast/ToastProvider';

import { useAdminData } from './admin/hooks/useAdminData';
import { useAdminActions } from './admin/hooks/useAdminActions';
import { useAdminAuditLogs } from './admin/hooks/useAdminAuditLogs';
import type { AdminPanelKey } from './admin/types';

import { AdminAlerts } from './admin/components/AdminAlerts';
import { StaffAccountsPanel } from './admin/features/staff/components/StaffAccountsPanel';
import { CollegesPanel } from './admin/features/colleges/components/CollegesPanel';
import { StudentOverviewPanel } from './admin/features/students/components/StudentOverviewPanel';
import { GovernancePanel } from './admin/features/system/components/GovernancePanel';
import { AuditPanel } from './admin/features/audit/components/AuditPanel';
import { IdSwapModal } from './admin/features/students/components/IdSwapModal';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;

    const [toast] = useState<{ msg: string; type: string } | null>(null);
    const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
    const [activePanelModal, setActivePanelModal] = useState<AdminPanelKey | null>(null);
    const [showIdSwapModal, setShowIdSwapModal] = useState<boolean>(false);

    useEffect(() => {
        if (!isAuthenticated) navigate('/admin');
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!activePanelModal || typeof window === 'undefined') return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setActivePanelModal(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activePanelModal]);

    const { showToast: pushSharedToast } = useToast();
    // Display is owned by the app-wide <ToastProvider>; local `toast` stays null
    // so the legacy inline toast render below no-ops.
    const showToast = React.useCallback((msg: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(msg) : msg;
        pushSharedToast(safeMessage, type as ToastType);
    }, [pushSharedToast]);

    const adminStats = useAdminData();
    const { refetchAccounts, refetchDepartments, refetchCourses, refetchStudents, refetchApplications } = adminStats;

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

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    // Derived statistics for hero
    const activeAuditDepartments = new Set(auditLogsData.auditLogs.map((log) => String(log.actor_department || '').trim()).filter(Boolean)).size;
    const heroStats = [
        { label: 'Staff Accounts', value: adminStats.accounts.length, hint: `${adminStats.accounts.filter(a => Boolean(a.auth_user_id)).length} linked to auth` },
        { label: 'Colleges', value: adminStats.departmentsData.length, hint: `${adminStats.coursesData.length} courses assigned` },
        { label: 'Student Records', value: adminStats.studentsData.length, hint: `${adminStats.applicationsCount} applications tracked` },
        { label: 'Tracked Staff Logs', value: auditLogsData.auditTotalCount, hint: `${activeAuditDepartments} colleges visible on this page` }
    ];

    const accountOverviewStats = [
        { label: 'Admins', value: adminStats.accounts.filter(a => String(a.role || '').trim() === 'Admin').length },
        { label: 'Department Heads', value: adminStats.accounts.filter(a => String(a.role || '').trim() === 'Department Head').length },
        { label: 'CARE Staff', value: adminStats.accounts.filter(a => String(a.role || '').trim() === 'Care Staff').length },
        { label: 'Registrars', value: adminStats.accounts.filter(a => String(a.role || '').trim() === 'Registrar').length },
        { label: 'Unlinked', value: adminStats.unlinkedStaffAccountCount }
    ];

    const renderExpandablePanel = ({
        panelKey, title, description, icon, badge, children, className = '', bodyClassName, headerActions
    }: any) => {
        const isOpen = activePanelModal === panelKey;
        const modalBodyClassName = bodyClassName === undefined ? 'p-6 sm:p-7' : bodyClassName;
        const panelClass = 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur';
        const sectionHeaderIconClass = 'flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700';

        return (
            <>
                <div className={`${panelClass} ${className}`.trim()}>
                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <button type="button" onClick={() => setActivePanelModal(panelKey)} className="flex min-w-0 flex-1 items-start gap-4 text-left">
                                <div className={`${sectionHeaderIconClass} transition-transform duration-200 ${isOpen ? 'scale-100 border-teal-200 bg-teal-50 text-teal-700' : 'scale-95'}`}>
                                    {icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                                        {badge && (
                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                {badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                                </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-3">
                                {headerActions}
                                <button type="button" onClick={() => setActivePanelModal(panelKey)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                                    <Maximize2 className="h-4 w-4" />
                                    <span>Open</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isOpen && typeof document !== 'undefined' && createPortal(
                    <div
                        className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/60"
                        style={{ top: 'clamp(1rem, 7vh, 5.5rem)', width: 'min(94vw, 1280px)', height: 'min(82vh, 820px)' }}
                        role="dialog"
                        aria-labelledby={`${panelKey}-modal-title`}
                    >
                        <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex min-w-0 items-start gap-4">
                                    <div className={`${sectionHeaderIconClass} border-teal-200 bg-teal-50 text-teal-700`}>{icon}</div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 id={`${panelKey}-modal-title`} className="text-xl font-semibold text-slate-900">{title}</h2>
                                            {badge && <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{badge}</span>}
                                        </div>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setActivePanelModal(null)}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 lg:shrink-0"
                                    aria-label={`Close ${title}`}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className={`min-h-0 flex-1 overflow-y-auto ${modalBodyClassName}`.trim()}>
                            {children}
                        </div>
                    </div>,
                    document.body
                )}
            </>
        );
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-gradient-to-b from-teal-50 via-sky-50 to-transparent" />
                <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

                <div className="page-transition relative mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 xl:px-8 2xl:px-10">

                    <div className="overflow-hidden rounded-[24px] border border-slate-900/10 bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                        <div className="bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#0f172a_0%,#134e4a_50%,#0f172a_100%)] p-4 sm:p-5">
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_290px]">
                                <div>
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 max-w-xl">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                                                <Shield className="h-3.5 w-3.5" />
                                                Admin Control Room
                                            </div>
                                            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">Account Management</h1>
                                            <p className="mt-1.5 text-sm leading-6 text-slate-200">
                                                Manage staff access, monitor cross-role activity, and keep institution-wide setup healthy from one admin workspace.
                                            </p>
                                        </div>

                                        <div className="w-full rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur xl:max-w-[340px]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Section Modals</p>
                                                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                                                        Open each admin section in a floating workspace.
                                                    </p>
                                                </div>
                                                <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                                                    {activePanelModal ? '1 open' : 'Ready'}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-300">
                                                <span>Page stays compact while details open on top.</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePanelModal(null)}
                                                    disabled={!activePanelModal}
                                                    className="font-semibold text-white transition hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Close Modal
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                                        {heroStats.map((stat) => (
                                            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{stat.label}</p>
                                                <p className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">{stat.value}</p>
                                                <p className="mt-1 text-[11px] text-slate-300">{stat.hint}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[22px] border border-white/10 bg-white/10 p-3.5 backdrop-blur">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">Operational Controls</p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                        <button
                                            onClick={handleRefreshData}
                                            disabled={isRefreshingData}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/admin/permissions')}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                                        >
                                            <KeyRound size={16} />
                                            <span>Role Permissions</span>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 sm:col-span-2 xl:col-span-1"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <AdminAlerts
                        adminAlerts={adminStats.adminAlerts}
                        renderExpandablePanel={renderExpandablePanel}
                    />

                    <div className="grid grid-cols-1 gap-8">
                        <StaffAccountsPanel
                            accounts={adminStats.accounts}
                            departments={adminStats.departments}
                            accountOverviewStats={accountOverviewStats}
                            renderExpandablePanel={renderExpandablePanel}
                            showToast={showToast}
                            refetchAccounts={adminStats.refetchAccounts}
                            handleArchiveAccount={adminActions.handleArchiveAccount}
                            invokeManagedStaffFunction={adminActions.invokeManagedStaffFunction}
                        />
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <StudentOverviewPanel
                            studentsData={adminStats.studentsData}
                            applicationsCount={adminStats.applicationsCount}
                            linkedStudentCount={adminStats.linkedStudentCount}
                            authPendingStudentCount={adminStats.authPendingStudentCount}
                            setShowIdSwapModal={setShowIdSwapModal}
                            renderExpandablePanel={renderExpandablePanel}
                        />

                        <GovernancePanel renderExpandablePanel={renderExpandablePanel} />
                    </div>

                    <div className="mt-8">
                        <AuditPanel
                            {...auditLogsData}
                            renderExpandablePanel={renderExpandablePanel}
                        />
                    </div>

                    <CollegesPanel
                        departmentsData={adminStats.departmentsData}
                        coursesData={adminStats.coursesData}
                        renderExpandablePanel={renderExpandablePanel}
                        showToast={showToast}
                        refetchDepartments={adminStats.refetchDepartments}
                    />

                    {toast && (
                        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                            <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                            <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                        </div>
                    )}

                    {showIdSwapModal && (
                        <IdSwapModal
                            showToast={showToast}
                            handleRefreshData={handleRefreshData}
                            invokeManagedStudentFunction={adminActions.invokeManagedStudentFunction}
                            setShowIdSwapModal={setShowIdSwapModal}
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
