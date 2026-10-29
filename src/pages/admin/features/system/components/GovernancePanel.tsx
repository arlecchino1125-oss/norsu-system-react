import React from 'react';
import { Shield, ExternalLink } from 'lucide-react';

interface GovernancePanelProps {
    onOpenModal: () => void;
    onOpenAuditModal: () => void;
}

export function GovernancePanel({
    onOpenModal,
    onOpenAuditModal
}: GovernancePanelProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col gap-3.5 font-['Outfit',sans-serif]">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
                                Governance &amp; Role Signals
                            </h3>
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shrink-0">
                                Role Map
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                            Domain boundaries and live role coverage signals.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onOpenModal}
                    className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                    <ExternalLink size={12} className="text-slate-400" />
                    <span>Role Map</span>
                </button>
            </div>

            {/* Single Compliance Signal Bar (clicking opens Audit Monitor modal) */}
            <div
                onClick={onOpenAuditModal}
                className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3.5 py-2 flex items-center justify-between cursor-pointer hover:bg-emerald-100/60 transition group"
                title="Click to view full Staff Audit Monitor"
            >
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Compliance
                </span>
                <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Active Logging
                </span>
            </div>

            {/* 3 Domain Ownership Rows */}
            <div className="space-y-2 pt-0.5">
                {/* Admin Owns */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-800 leading-tight">
                            Admin Owns
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                            Staff account creation, archiving, and role assignment
                        </p>
                    </div>
                    <span className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[9.5px] font-bold text-slate-600 whitespace-nowrap shrink-0 shadow-2xs">
                        Institution Governance
                    </span>
                </div>

                {/* CARE Staff Owns */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-800 leading-tight">
                            CARE Staff Owns
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                            Student population, NAT, activation policy, and student-service workflows
                        </p>
                    </div>
                    <span className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[9.5px] font-bold text-slate-600 whitespace-nowrap shrink-0 shadow-2xs">
                        Student Services
                    </span>
                </div>

                {/* College Designates Own */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-800 leading-tight">
                            College Designates Own
                        </p>
                        <p className="text-[11px] text-slate-600 font-medium truncate mt-0.5">
                            Admissions and college-level student follow-up
                        </p>
                    </div>
                    <span className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[9.5px] font-bold text-slate-600 whitespace-nowrap shrink-0 shadow-2xs">
                        College Operations
                    </span>
                </div>
            </div>
        </div>
    );
}
