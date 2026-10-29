import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus, X, Loader2 } from 'lucide-react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { isFunctionUnavailableError } from '../../../utils';

interface StaffProvisionModalProps {
    isOpen: boolean;
    onClose: () => void;
    departments: string[];
    showToast: (msg: string, type?: string) => void;
    refetchAccounts: () => void;
}

export function StaffProvisionModal({
    isOpen,
    onClose,
    departments,
    showToast,
    refetchAccounts
}: StaffProvisionModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState({
        role: 'Department Head',
        full_name: '',
        username: '',
        email: '',
        department: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = { ...form };
        payload.username = payload.username.trim();
        payload.email = String(payload.email || '').trim().toLowerCase();
        if (payload.role !== 'Department Head') delete payload.department;

        setIsCreating(true);
        try {
            await invokeEdgeFunction('provision-staff-account', {
                body: payload,
                requireAuth: true,
                non2xxMessage: 'Your admin session could not be verified. Sign in again.',
                fallbackMessage: 'Failed to provision staff account.'
            });

            showToast(`Account created. Login credentials were emailed to ${payload.email}.`);
            setForm({ username: '', full_name: '', role: 'Department Head', department: '', email: '' });
            refetchAccounts();
            onClose();
        } catch (error: any) {
            if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to create account.', 'error');
                return;
            }
            showToast("We couldn't create the account. This feature isn't available yet.", 'error');
        } finally {
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Outfit',sans-serif]">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="staff-provision-modal-title"
                className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="staff-provision-modal-title" className="font-extrabold text-base text-slate-900 leading-tight">
                                Staff Provisioning &amp; Directory
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Create new staff logins, assign college designates, or revoke access.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-colors cursor-pointer shrink-0"
                        aria-label="Close dialog"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body Form */}
                <div className="p-6">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                Provision New Staff Account
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                                Auto-generates secure password via email
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label htmlFor="modal-staff-role" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                                        Role
                                    </label>
                                    <select
                                        id="modal-staff-role"
                                        value={form.role}
                                        onChange={e => setForm({ ...form, role: e.target.value })}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none transition"
                                    >
                                        <option value="Department Head">College Designate (Dean)</option>
                                        <option value="Care Staff">CARE Staff</option>
                                        <option value="Registrar">Registrar</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>

                                <div>
                                    <label htmlFor="modal-staff-fullname" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                                        Full Name
                                    </label>
                                    <input
                                        id="modal-staff-fullname"
                                        required
                                        type="text"
                                        value={form.full_name}
                                        onChange={e => setForm({ ...form, full_name: e.target.value })}
                                        placeholder="e.g. Dr. Maria L. Santos"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="modal-staff-username" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                                        Username
                                    </label>
                                    <input
                                        id="modal-staff-username"
                                        required
                                        type="text"
                                        value={form.username}
                                        onChange={e => setForm({ ...form, username: e.target.value })}
                                        placeholder="e.g. dean.cted"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none transition"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="modal-staff-email" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                                        Institutional Email
                                    </label>
                                    <input
                                        id="modal-staff-email"
                                        required
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        placeholder="name@institution.edu.ph"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none transition"
                                    />
                                </div>

                                {form.role === 'Department Head' && (
                                    <div className="sm:col-span-2">
                                        <label htmlFor="modal-staff-department" className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1.5">
                                            Assigned College
                                        </label>
                                        <select
                                            id="modal-staff-department"
                                            required
                                            value={form.department}
                                            onChange={e => setForm({ ...form, department: e.target.value })}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none transition"
                                        >
                                            <option value="">Select College...</option>
                                            {departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isCreating}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                                {isCreating ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        <span>Creating Staff Account...</span>
                                    </>
                                ) : (
                                    <span>Create Staff Account</span>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

