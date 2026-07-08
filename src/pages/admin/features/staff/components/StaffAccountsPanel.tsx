import React, { useState } from 'react';
import { UserPlus, Archive } from 'lucide-react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { getStaffRoleBadgeClass, isFunctionUnavailableError } from '../../../utils';
import type { AdminPanelKey } from '../../../types';

const STAFF_ACCOUNT_PAGE_SIZE = 10;

interface StaffAccountsPanelProps {
    accounts: any[];
    departments: string[];
    accountOverviewStats: { label: string; value: number }[];
    renderExpandablePanel: (props: any) => React.ReactNode;
    showToast: (msg: string, type?: string) => void;
    refetchAccounts: () => void;
    handleArchiveAccount: (account: any, id: string | null, set: (id: string | null) => void) => Promise<void>;
    invokeManagedStaffFunction: (body: any) => Promise<any>;
}

export function StaffAccountsPanel({
    accounts,
    departments,
    accountOverviewStats,
    renderExpandablePanel,
    showToast,
    refetchAccounts,
    handleArchiveAccount,
    invokeManagedStaffFunction
}: StaffAccountsPanelProps) {
    const [staffAccountsPage, setStaffAccountsPage] = useState(1);
    const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
    const [form, setForm] = useState<any>({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
    const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
    const [savingAccountEmailId, setSavingAccountEmailId] = useState<string | null>(null);
    const [archivingAccountId, setArchivingAccountId] = useState<string | null>(null);
    const [editingDepartmentAccountId, setEditingDepartmentAccountId] = useState<string | null>(null);
    const [departmentDrafts, setDepartmentDrafts] = useState<Record<string, string>>({});
    const [savingAccountDepartmentId, setSavingAccountDepartmentId] = useState<string | null>(null);

    const getAccountEmailDraft = (account: any) =>
        emailDrafts[String(account.id)] ?? String(account.email || '');

    const getAccountDepartmentDraft = (account: any) =>
        departmentDrafts[String(account.id)] ?? String(account.department || '');

    const handleCreate = async (e: any) => {
        e.preventDefault();
        const payload = { ...form };
        payload.username = payload.username.trim();
        payload.email = String(payload.email || '').trim().toLowerCase();
        if (payload.role !== 'Department Head') delete payload.department;
        setIsCreatingAccount(true);

        try {
            const result = await invokeEdgeFunction('provision-staff-account', {
                body: payload,
                requireAuth: true,
                non2xxMessage: 'Your admin session could not be verified. Sign in again.',
                fallbackMessage: 'Failed to provision staff account.'
            });

            showToast('Account created and linked to Supabase Auth.');
            void sendTransactionalEmailNotification(result?.emailPayload, 'Failed to send credential email.').then((emailResult) => {
                if (emailResult.emailSent === false) {
                    showToast(`Account created, but credential email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
            setForm({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
            refetchAccounts();
        } catch (error: any) {
            if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to create account.', 'error');
                setIsCreatingAccount(false);
                return;
            }

            showToast(
                "We couldn't create the account. This feature isn't available yet.",
                'error'
            );
        } finally {
            setIsCreatingAccount(false);
        }
    };

    const handleSaveAccountEmail = async (account: any) => {
        const normalizedEmail = getAccountEmailDraft(account).trim().toLowerCase();
        if (!normalizedEmail) {
            showToast('Enter a real email before saving.', 'error');
            return;
        }

        setSavingAccountEmailId(String(account.id));
        try {
            const result = await invokeManagedStaffFunction({
                mode: 'update-account-email',
                staffAccountId: account.id,
                email: normalizedEmail
            });

            await refetchAccounts();
            setEmailDrafts((prev) => {
                const next = { ...prev };
                delete next[String(account.id)];
                return next;
            });

            showToast(
                result?.warning
                    ? `Saved ${account.username}'s email. ${result.warning}`
                    : `Saved ${account.username}'s email.`,
                result?.warning ? 'error' : 'success'
            );
        } catch (error: any) {
            showToast("Couldn't save email.", 'error');
        } finally {
            setSavingAccountEmailId(null);
        }
    };

    const handleSaveAccountDepartment = async (account: any) => {
        const normalizedDepartment = getAccountDepartmentDraft(account).trim();
        if (!normalizedDepartment) {
            showToast('Select a college before saving.', 'error');
            return;
        }

        setSavingAccountDepartmentId(String(account.id));
        try {
            await invokeManagedStaffFunction({
                mode: 'update-account-department',
                staffAccountId: account.id,
                department: normalizedDepartment
            });

            await refetchAccounts();
            setDepartmentDrafts((prev) => {
                const next = { ...prev };
                delete next[String(account.id)];
                return next;
            });
            setEditingDepartmentAccountId(null);
            showToast(`Saved ${account.username}'s college.`);
        } catch (error: any) {
            showToast(error?.message || "Couldn't save college.", 'error');
        } finally {
            setSavingAccountDepartmentId(null);
        }
    };

    // Clamp at render time instead of correcting the page number via an effect --
    // Previous/Next already self-clamp in their own onClick handlers, so this is
    // only needed so a shrinking account list (e.g. after an archive) never renders
    // a page past the end.
    const staffAccountPageCount = Math.max(1, Math.ceil(accounts.length / STAFF_ACCOUNT_PAGE_SIZE));
    const currentStaffAccountsPage = Math.min(staffAccountsPage, staffAccountPageCount);
    const visibleStaffAccountStart = accounts.length === 0 ? 0 : ((currentStaffAccountsPage - 1) * STAFF_ACCOUNT_PAGE_SIZE) + 1;
    const visibleStaffAccountEnd = Math.min(accounts.length, currentStaffAccountsPage * STAFF_ACCOUNT_PAGE_SIZE);
    const paginatedAccounts = accounts.slice(
        (currentStaffAccountsPage - 1) * STAFF_ACCOUNT_PAGE_SIZE,
        currentStaffAccountsPage * STAFF_ACCOUNT_PAGE_SIZE
    );

    const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100';
    const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';

    return renderExpandablePanel({
        panelKey: 'staffAccounts' as AdminPanelKey,
        title: `Staff Accounts (${accounts.length})`,
        description: 'Create staff logins and manage existing accounts in one place.',
        icon: <UserPlus className="h-5 w-5" />,
        badge: `${accounts.length} accounts`,
        className: 'min-w-0',
        bodyClassName: 'p-5 sm:p-6',
        headerActions: (
            <div className="flex flex-wrap gap-2">
                {accountOverviewStats.map((stat) => (
                    <div key={stat.label} className="min-w-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                        <p className="mt-0.5 text-xl font-semibold text-slate-900">{stat.value}</p>
                    </div>
                ))}
            </div>
        ),
        children: (
            <div className="space-y-5">
                <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <label className={labelClass}>Role</label>
                            <select className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                <option value="Department Head">Department Head (Dean)</option>
                                <option value="Care Staff">CARE Staff</option>
                                <option value="Registrar">Registrar</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Full Name</label>
                            <input required className={inputClass} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Username</label>
                            <input required className={inputClass} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Password</label>
                            <input required type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input required type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                        </div>
                        {form.role === 'Department Head' && (
                            <div>
                                <label className={labelClass}>College</label>
                                <select className={inputClass} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                    <option value="">Select College</option>
                                    {departments.map((departmentName) => (
                                        <option key={departmentName} value={departmentName}>{departmentName}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                    <button
                        disabled={isCreatingAccount}
                        className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isCreatingAccount ? 'Creating...' : 'Create Staff Account'}
                    </button>
                </form>

                <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Existing Accounts</h3>
                        <span className="text-sm font-semibold text-slate-700">{accounts.length} total</span>
                    </div>

                    {accounts.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                            No staff accounts found.
                        </div>
                    ) : paginatedAccounts.map((acc: any) => (
                        <div key={acc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold text-slate-900">{acc.full_name || 'Unnamed Staff'}</h4>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStaffRoleBadgeClass(acc.role)}`}>
                                            {acc.role === 'Care Staff' ? 'CARE Staff' : acc.role}
                                        </span>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${acc.auth_user_id ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                                            {acc.auth_user_id ? 'Linked' : 'Unlinked'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {acc.username || 'No username'} - {acc.department || 'No college'}
                                    </p>
                                    {acc.role === 'Department Head' && (
                                        editingDepartmentAccountId === String(acc.id) ? (
                                            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <select
                                                    value={getAccountDepartmentDraft(acc)}
                                                    onChange={(e) => setDepartmentDrafts((prev) => ({
                                                        ...prev,
                                                        [String(acc.id)]: e.target.value
                                                    }))}
                                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 focus:border-teal-400 focus:bg-white focus:outline-none"
                                                >
                                                    <option value="">Select College</option>
                                                    {departments.map((departmentName) => (
                                                        <option key={departmentName} value={departmentName}>{departmentName}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSaveAccountDepartment(acc)}
                                                    disabled={savingAccountDepartmentId === String(acc.id)}
                                                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {savingAccountDepartmentId === String(acc.id) ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingDepartmentAccountId(null);
                                                        setDepartmentDrafts((prev) => {
                                                            const next = { ...prev };
                                                            delete next[String(acc.id)];
                                                            return next;
                                                        });
                                                    }}
                                                    disabled={savingAccountDepartmentId === String(acc.id)}
                                                    className="inline-flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setEditingDepartmentAccountId(String(acc.id))}
                                                className="mt-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
                                            >
                                                Edit College
                                            </button>
                                        )
                                    )}
                                    {acc.email ? (
                                        <p className="mt-1 break-all text-xs text-slate-400">{acc.email}</p>
                                    ) : (
                                        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                            <input
                                                type="email"
                                                value={getAccountEmailDraft(acc)}
                                                onChange={(e) => setEmailDrafts((prev) => ({
                                                    ...prev,
                                                    [String(acc.id)]: e.target.value
                                                }))}
                                                placeholder="Add real email"
                                                className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleSaveAccountEmail(acc)}
                                                disabled={savingAccountEmailId === String(acc.id)}
                                                className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {savingAccountEmailId === String(acc.id) ? 'Saving...' : 'Save Email'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <button
                                    disabled={archivingAccountId === String(acc.id)}
                                    onClick={() => handleArchiveAccount(acc, archivingAccountId, setArchivingAccountId)}
                                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    title={`Archive ${acc.full_name || acc.username || 'staff account'}`}
                                >
                                    <Archive className={`h-4 w-4 ${archivingAccountId === String(acc.id) ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {accounts.length > 0 && (
                    <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 text-sm text-slate-500 xl:flex-row xl:items-center xl:justify-between">
                        <p>
                            Showing <span className="font-semibold text-slate-700">{visibleStaffAccountStart}</span> to <span className="font-semibold text-slate-700">{visibleStaffAccountEnd}</span> of <span className="font-semibold text-slate-700">{accounts.length}</span> staff accounts
                        </p>
                        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                            <button
                                type="button"
                                onClick={() => setStaffAccountsPage((prev) => Math.max(1, prev - 1))}
                                disabled={currentStaffAccountsPage === 1}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                                Page {currentStaffAccountsPage} of {staffAccountPageCount}
                            </span>
                            <button
                                type="button"
                                onClick={() => setStaffAccountsPage((prev) => Math.min(staffAccountPageCount, prev + 1))}
                                disabled={currentStaffAccountsPage >= staffAccountPageCount}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    });
}
