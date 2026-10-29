import React, { useState, useMemo, useRef, useEffect } from 'react';
import { UserPlus, Search, MoreVertical, ExternalLink, X, Loader2, KeyRound, Archive, Building2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { getStaffRoleBadgeClass, isFunctionUnavailableError } from '../../../utils';

type RoleFilterKey = 'ALL' | 'DEANS' | 'CARE' | 'REGISTRARS' | 'ADMINS' | 'UNLINKED';

interface StaffAccountsPanelProps {
    accounts: any[];
    departments: string[];
    onOpenModal: () => void;
    showToast: (msg: string, type?: string) => void;
    refetchAccounts: () => void;
    handleArchiveAccount: (account: any, id: string | null, set: (id: string | null) => void) => Promise<void>;
    invokeManagedStaffFunction: (body: any) => Promise<any>;
}

export function StaffAccountsPanel({
    accounts,
    departments,
    onOpenModal,
    showToast,
    refetchAccounts,
    handleArchiveAccount,
    invokeManagedStaffFunction
}: StaffAccountsPanelProps) {
    const [roleFilter, setRoleFilter] = useState<RoleFilterKey>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [showQuickForm, setShowQuickForm] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    // Editing college inline state
    const [editingCollegeAccountId, setEditingCollegeAccountId] = useState<string | null>(null);
    const [collegeDraft, setCollegeDraft] = useState<string>('');
    const [isSavingCollege, setIsSavingCollege] = useState(false);

    // Archiving state
    const [archivingAccountId, setArchivingAccountId] = useState<string | null>(null);

    // Quick provision state
    const [isCreatingAccount, setIsCreatingAccount] = useState(false);
    const [form, setForm] = useState({
        role: 'Department Head',
        full_name: '',
        username: '',
        email: '',
        department: ''
    });

    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActiveMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Counts for filter pills
    const deansCount = accounts.filter(a => String(a.role || '').trim() === 'Department Head').length;
    const careCount = accounts.filter(a => String(a.role || '').trim() === 'Care Staff').length;
    const registrarsCount = accounts.filter(a => String(a.role || '').trim() === 'Registrar').length;
    const adminsCount = accounts.filter(a => String(a.role || '').trim() === 'Admin').length;
    const unlinkedCount = accounts.filter(a => !a.auth_user_id).length;

    // Filter accounts
    const filteredAccounts = useMemo(() => {
        return accounts.filter(account => {
            const role = String(account.role || '').trim();
            const isUnlinked = !account.auth_user_id;

            // Role filtering
            if (roleFilter === 'DEANS' && role !== 'Department Head') return false;
            if (roleFilter === 'CARE' && role !== 'Care Staff') return false;
            if (roleFilter === 'REGISTRARS' && role !== 'Registrar') return false;
            if (roleFilter === 'ADMINS' && role !== 'Admin') return false;
            if (roleFilter === 'UNLINKED' && !isUnlinked) return false;

            // Search filtering
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const name = String(account.full_name || '').toLowerCase();
                const username = String(account.username || '').toLowerCase();
                const email = String(account.email || '').toLowerCase();
                const dept = String(account.department || '').toLowerCase();
                if (!name.includes(term) && !username.includes(term) && !email.includes(term) && !dept.includes(term)) {
                    return false;
                }
            }

            return true;
        });
    }, [accounts, roleFilter, searchTerm]);

    const handleCreateStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...form };
        payload.username = payload.username.trim();
        payload.email = String(payload.email || '').trim().toLowerCase();
        if (payload.role !== 'Department Head') delete payload.department;

        setIsCreatingAccount(true);
        try {
            await invokeEdgeFunction('provision-staff-account', {
                body: payload,
                requireAuth: true,
                non2xxMessage: 'Your admin session could not be verified. Sign in again.',
                fallbackMessage: 'Failed to provision staff account.'
            });

            showToast(`Account created. Login credentials were emailed to ${payload.email}.`);
            setForm({ role: 'Department Head', full_name: '', username: '', email: '', department: '' });
            setShowQuickForm(false);
            refetchAccounts();
        } catch (error: any) {
            if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to create account.', 'error');
                return;
            }
            showToast("We couldn't create the account. This feature isn't available yet.", 'error');
        } finally {
            setIsCreatingAccount(false);
        }
    };

    const handleSaveCollege = async (account: any) => {
        const normalizedDept = collegeDraft.trim();
        if (!normalizedDept) {
            showToast('Select a college before saving.', 'error');
            return;
        }

        setIsSavingCollege(true);
        try {
            await invokeManagedStaffFunction({
                mode: 'update-account-department',
                staffAccountId: account.id,
                department: normalizedDept
            });
            await refetchAccounts();
            setEditingCollegeAccountId(null);
            showToast(`Saved ${account.username}'s college assignment.`);
        } catch (error: any) {
            showToast(error?.message || "Couldn't save college.", 'error');
        } finally {
            setIsSavingCollege(false);
        }
    };

    const handleSendPasswordReset = async (account: any) => {
        setActiveMenuId(null);
        if (!account.email) {
            showToast('This account has no email address configured.', 'error');
            return;
        }
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(account.email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            showToast(`Password reset link sent to ${account.email}.`);
        } catch (err: any) {
            showToast(err.message || 'Failed to send password reset email.', 'error');
        }
    };

    return (
        <div className="lg:col-span-7 relative">
            <div className="lg:absolute lg:inset-0 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3.5 overflow-hidden font-['Outfit',sans-serif]">
                {/* 1. Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="font-extrabold text-base text-slate-900 leading-tight">
                                Staff Accounts &amp; Role Assignment
                            </h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Provision staff logins, filter by role, and manage College Designate assignments.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowQuickForm(prev => !prev)}
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                        >
                            <span>+ New Staff</span>
                        </button>
                        <button
                            type="button"
                            onClick={onOpenModal}
                            className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
                        >
                            <ExternalLink size={13} className="text-slate-500" />
                            <span>Modal</span>
                        </button>
                    </div>
                </div>

                {/* Inline Quick-Provision Form Drawer */}
                {showQuickForm && (
                    <form onSubmit={handleCreateStaff} className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3.5 space-y-3 shrink-0 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                Quick Provision Staff Login
                            </span>
                            <button
                                type="button"
                                onClick={() => setShowQuickForm(false)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                aria-label="Close quick form"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <select
                                value={form.role}
                                onChange={e => setForm({ ...form, role: e.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="Department Head">College Designate (Dean)</option>
                                <option value="Care Staff">CARE Staff</option>
                                <option value="Registrar">Registrar</option>
                                <option value="Admin">Admin</option>
                            </select>
                            <input
                                required
                                type="text"
                                placeholder="Full Name (e.g. Dr. Maria L. Santos)"
                                value={form.full_name}
                                onChange={e => setForm({ ...form, full_name: e.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                            />
                            <input
                                required
                                type="text"
                                placeholder="Username (e.g. dean.cted)"
                                value={form.username}
                                onChange={e => setForm({ ...form, username: e.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                            />
                            <input
                                required
                                type="email"
                                placeholder="Email (name@institution.edu.ph)"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none"
                            />
                            {form.role === 'Department Head' && (
                                <select
                                    required
                                    value={form.department}
                                    onChange={e => setForm({ ...form, department: e.target.value })}
                                    className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                >
                                    <option value="">Select College...</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowQuickForm(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isCreatingAccount}
                                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                {isCreatingAccount ? <Loader2 size={12} className="animate-spin" /> : null}
                                <span>Create Staff Account</span>
                            </button>
                        </div>
                    </form>
                )}

                {/* 2. Role Breakdown Filter Strip (6 cards in a row) */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 shrink-0">
                    {/* ALL ROLES */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('ALL')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'ALL'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'ALL' ? 'text-slate-300' : 'text-slate-400'}`}>
                            All Roles
                        </p>
                        <p className="mt-0.5 text-base font-extrabold">All</p>
                    </button>

                    {/* DEANS */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('DEANS')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'DEANS'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'DEANS' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Deans
                        </p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums">{deansCount}</p>
                    </button>

                    {/* CARE STAFF */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('CARE')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'CARE'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'CARE' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Care Staff
                        </p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums">{careCount}</p>
                    </button>

                    {/* REGISTRARS */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('REGISTRARS')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'REGISTRARS'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'REGISTRARS' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Registrars
                        </p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums">{registrarsCount}</p>
                    </button>

                    {/* ADMINS */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('ADMINS')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'ADMINS'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'ADMINS' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Admins
                        </p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums">{adminsCount}</p>
                    </button>

                    {/* UNLINKED */}
                    <button
                        type="button"
                        onClick={() => setRoleFilter('UNLINKED')}
                        className={`rounded-xl px-2.5 py-2 text-left transition cursor-pointer border ${roleFilter === 'UNLINKED'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-slate-50/80 hover:bg-slate-100 border-slate-200/80 text-slate-800'
                            }`}
                    >
                        <p className={`text-[9px] font-extrabold uppercase tracking-wider ${roleFilter === 'UNLINKED' ? 'text-slate-300' : 'text-slate-400'}`}>
                            Unlinked
                        </p>
                        <p className="mt-0.5 text-base font-extrabold tabular-nums">{unlinkedCount}</p>
                    </button>
                </div>

                {/* 3. Search Input Bar */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search staff by name, username, email, or college..."
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none transition"
                        />
                    </div>
                    {roleFilter !== 'ALL' && (
                        <button
                            type="button"
                            onClick={() => setRoleFilter('ALL')}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 whitespace-nowrap cursor-pointer px-1"
                        >
                            Reset filter
                        </button>
                    )}
                </div>

                {/* 4. Dynamic Height-Matching Staff Roster List */}
                <div className="divide-y divide-slate-100 border border-slate-200/75 rounded-xl flex-1 min-h-0 max-h-[380px] lg:max-h-none overflow-y-auto custom-scrollbar">
                    {filteredAccounts.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">
                            No staff accounts match your current filter.
                        </div>
                    ) : (
                        filteredAccounts.map(account => {
                            const isDesignate = account.role === 'Department Head';
                            const isLinked = Boolean(account.auth_user_id);
                            const isEditingThisCollege = editingCollegeAccountId === String(account.id);
                            const isArchivingThis = archivingAccountId === String(account.id);
                            const roleDisplay = isDesignate ? 'College Designate' : account.role;

                            return (
                                <div
                                    key={account.id}
                                    className="p-3 sm:px-4 sm:py-3 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1">
                                        {/* Line 1: Name + Role badge + Linked badge */}
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                                                {account.full_name || 'Unnamed Staff'}
                                            </h3>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${getStaffRoleBadgeClass(account.role)}`}>
                                                {roleDisplay}
                                            </span>
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${isLinked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                                {isLinked ? 'Linked' : 'Unlinked'}
                                            </span>
                                        </div>

                                        {/* Line 2: @username · email · assigned college */}
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                                            <span className="font-bold text-slate-600">@{account.username || 'user'}</span>
                                            {account.email && (
                                                <>
                                                    <span className="text-slate-300 font-sans">&middot;</span>
                                                    <span className="text-slate-400 truncate max-w-xs">{account.email}</span>
                                                </>
                                            )}
                                            <span className="text-slate-300 font-sans">&middot;</span>
                                            <span className="text-slate-600 font-sans font-medium">
                                                {account.department ? `${account.department}` : (account.role === 'Admin' ? 'Institution-wide' : 'No college assigned')}
                                            </span>
                                        </div>

                                        {/* Inline Edit College Control */}
                                        {isEditingThisCollege && (
                                            <div className="mt-2 flex items-center gap-2 animate-fade-in font-sans">
                                                <select
                                                    value={collegeDraft}
                                                    onChange={e => setCollegeDraft(e.target.value)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
                                                >
                                                    <option value="">Select College...</option>
                                                    {departments.map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    disabled={isSavingCollege}
                                                    onClick={() => handleSaveCollege(account)}
                                                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-2.5 py-1 rounded-lg transition disabled:opacity-50 cursor-pointer"
                                                >
                                                    {isSavingCollege ? 'Saving...' : 'Save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingCollegeAccountId(null)}
                                                    className="border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold px-2 py-1 rounded-lg transition cursor-pointer"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3-Dots Action Menu */}
                                    <div className="relative shrink-0 font-sans">
                                        <button
                                            type="button"
                                            onClick={() => setActiveMenuId(activeMenuId === String(account.id) ? null : String(account.id))}
                                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                                            aria-label="Account actions"
                                        >
                                            <MoreVertical size={14} />
                                        </button>

                                        {activeMenuId === String(account.id) && (
                                            <div
                                                ref={menuRef}
                                                className="absolute right-0 top-9 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-xs font-medium z-30 animate-fade-in"
                                            >
                                                {isDesignate && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setCollegeDraft(String(account.department || ''));
                                                            setEditingCollegeAccountId(String(account.id));
                                                            setActiveMenuId(null);
                                                        }}
                                                        className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                                                    >
                                                        <Building2 size={13} className="text-slate-400" />
                                                        <span>Edit College</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleSendPasswordReset(account)}
                                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 text-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                                                >
                                                    <KeyRound size={13} className="text-slate-400" />
                                                    <span>Send Password Reset</span>
                                                </button>

                                                {account.role !== 'Admin' && (
                                                    <button
                                                        type="button"
                                                        disabled={isArchivingThis}
                                                        onClick={() => {
                                                            setActiveMenuId(null);
                                                            handleArchiveAccount(account, archivingAccountId, setArchivingAccountId);
                                                        }}
                                                        className="w-full px-3 py-2 text-left hover:bg-amber-50 text-amber-700 flex items-center gap-2 cursor-pointer transition-colors border-t border-slate-100"
                                                    >
                                                        <Archive size={13} className="text-amber-500" />
                                                        <span>{isArchivingThis ? 'Archiving...' : 'Archive Account'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
