import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X, KeyRound } from 'lucide-react';

interface GovernanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigatePermissions: () => void;
}

export function GovernanceModal({
    isOpen,
    onClose,
    onNavigatePermissions
}: GovernanceModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    if (typeof document === 'undefined') return null;

    const modalContent = (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Outfit',sans-serif]">
            <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="governance-modal-title"
                className="relative bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 id="governance-modal-title" className="font-extrabold text-base text-slate-900 leading-tight">
                                Governance Boundaries &amp; Domain Roles
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Cross-role responsibility matrix and institutional data ownership rules.
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

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Admin */}
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                                    Admin Owns
                                </span>
                                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-bold text-slate-600">
                                    Institution Governance
                                </span>
                            </div>
                            <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>Staff account creation, archiving, and role assignment</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>College and department master-data setup</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>Email record cleanup and institution-wide maintenance tasks</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>Cross-role audit monitoring and institution-wide alerts</span>
                                </li>
                            </ul>
                        </div>

                        {/* CARE Staff */}
                        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                                    CARE Staff Owns
                                </span>
                                <span className="rounded-md bg-sky-50 border border-sky-200 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                                    Student Services
                                </span>
                            </div>
                            <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-start gap-1.5">
                                    <span className="text-sky-600 font-bold">&check;</span>
                                    <span>Student population, NAT, activation policy, and student-service workflows</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-sky-600 font-bold">&check;</span>
                                    <span>Archive and restore controls with reason capture and audit logs</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-sky-600 font-bold">&check;</span>
                                    <span>Operational case handling instead of institution-wide governance</span>
                                </li>
                            </ul>
                        </div>

                        {/* College Designates */}
                        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">
                                    College Designates Own
                                </span>
                                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                                    College Operations
                                </span>
                            </div>
                            <ul className="space-y-2 text-xs text-slate-600">
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>Admissions and college-level student follow-up</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>First-line counseling and support workflows inside their college</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                    <span className="text-emerald-600 font-bold">&check;</span>
                                    <span>Operational reporting for their assigned programs</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Policy Callout Banner */}
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs text-slate-600 leading-relaxed">
                            <span className="font-bold text-slate-900">Data Protection Policy:</span> Bulk student-data reset controls have been removed from the system entirely. Record changes flow through archive, restore, and per-record workflows with full audit logging.
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onNavigatePermissions();
                            }}
                            className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
                        >
                            <KeyRound size={13} />
                            <span>Configure RBAC Matrix &rarr;</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

