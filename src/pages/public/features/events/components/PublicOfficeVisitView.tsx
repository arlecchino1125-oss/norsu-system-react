import React from 'react';
import type { PublicIdentity } from '../hooks/usePublicEvents';
import { usePublicOfficeVisit } from '../hooks/usePublicOfficeVisit';
import { toTitleCase } from '../../../../../utils/formatters';

interface PublicOfficeVisitViewProps {
    identity: PublicIdentity | null;
    onRequireSignIn: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const Icons = {
    Building: () => (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M8 14h.01" />
            <path d="M16 14h.01" />
            <path d="M8 18h.01" />
            <path d="M16 18h.01" />
        </svg>
    ),
    Clock: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    Check: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    ArrowRight: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    ),
    User: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
        </svg>
    )
};

const formatTimeLabel = (isoString?: string) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

export default function PublicOfficeVisitView({
    identity,
    onRequireSignIn,
    showToast
}: PublicOfficeVisitViewProps) {
    const {
        identityMode,
        setIdentityMode,
        visitorFirstName,
        setVisitorFirstName,
        visitorLastName,
        setVisitorLastName,
        customStudentId,
        setCustomStudentId,
        selectedReason,
        setSelectedReason,
        reasons,
        isLoadingReasons,
        activeVisit,
        isSubmitting,
        showSuccessModal,
        setShowSuccessModal,
        lastCompletedVisit,
        handleTimeIn,
        handleTimeOut
    } = usePublicOfficeVisit(identity, showToast);

    return (
        <div className="mx-auto max-w-lg px-4 pt-5 pb-20 space-y-4 animate-fade-in">
            {/* ── Active Visit in Progress Card ── */}
            {activeVisit ? (
                <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                            </span>
                            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                                Visit In Progress
                            </span>
                        </div>
                        <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                            Timed In at {formatTimeLabel(activeVisit.timeIn)}
                        </span>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-1.5">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visitor</p>
                        <p className="text-sm font-black text-slate-900">{toTitleCase(activeVisit.studentName, 'Visitor')}</p>
                        {activeVisit.studentId && (
                            <p className="text-xs font-semibold text-slate-500">ID: {activeVisit.studentId}</p>
                        )}
                        <div className="pt-2 border-t border-slate-200/60">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reason for Visit</p>
                            <p className="text-xs font-bold text-slate-800">{activeVisit.reason}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleTimeOut}
                        disabled={isSubmitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Icons.Clock />
                        {isSubmitting ? 'Recording Time Out...' : 'Time Out from Office Visit'}
                    </button>
                </div>
            ) : (
                /* ── New Time In Form ── */
                <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-sm space-y-5">
                    {/* Header */}
                    <div>
                        <div className="flex items-center gap-2 text-indigo-600 mb-1">
                            <Icons.Building />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Office Logbook</span>
                        </div>
                        <h3 className="text-base font-black text-slate-900">Log Your CARE Office Visit</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            Record your arrival at the CARE Center office so staff can assist you and keep the digital logbook updated.
                        </p>
                    </div>

                    {/* Identity Toggle */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 text-xs">
                        <button
                            type="button"
                            onClick={() => setIdentityMode('student')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
                                identityMode === 'student'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            🎓 NORSU Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setIdentityMode('visitor')}
                            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 font-bold transition-all ${
                                identityMode === 'visitor'
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            👤 Guest / Visitor
                        </button>
                    </div>

                    {/* Student Identity Form */}
                    {identityMode === 'student' ? (
                        <div className="space-y-2">
                            {identity?.student ? (
                                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-emerald-950">
                                            NORSU Student ID Verified
                                        </p>
                                        <p className="text-[11px] font-semibold text-emerald-700">
                                            ID: {identity.student.student_id}
                                        </p>
                                    </div>
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-200 text-emerald-800">
                                        <Icons.Check />
                                    </span>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="office-student-id" className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Student ID Number
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            id="office-student-id"
                                            type="text"
                                            value={customStudentId}
                                            onChange={(e) => setCustomStudentId(e.target.value)}
                                            placeholder="e.g. 2023-12345"
                                            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={onRequireSignIn}
                                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Lookup ID
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Visitor Identity Form */
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="visitor-first-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                                    First Name
                                </label>
                                <input
                                    id="visitor-first-name"
                                    type="text"
                                    value={visitorFirstName}
                                    onChange={(e) => setVisitorFirstName(e.target.value)}
                                    placeholder="e.g. Juan"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                            <div>
                                <label htmlFor="visitor-last-name" className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Last Name
                                </label>
                                <input
                                    id="visitor-last-name"
                                    type="text"
                                    value={visitorLastName}
                                    onChange={(e) => setVisitorLastName(e.target.value)}
                                    placeholder="e.g. Dela Cruz"
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                            </div>
                        </div>
                    )}

                    {/* Reason for Visit Selection */}
                    <div className="space-y-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Reason for Visit
                        </label>

                        {isLoadingReasons ? (
                            <div className="py-4 text-center text-xs text-slate-400 font-semibold">
                                Loading visit reasons...
                            </div>
                        ) : (
                            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                                {reasons.map((r) => {
                                    const isSelected = selectedReason === r.reason;
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setSelectedReason(r.reason)}
                                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all ${
                                                isSelected
                                                    ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 font-bold shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                            }`}
                                        >
                                            <span className="text-xs leading-snug">{r.reason}</span>
                                            <span className={`h-4 w-4 shrink-0 rounded-full border flex items-center justify-center ${
                                                isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                                            }`}>
                                                {isSelected && <Icons.Check />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Submit Time In Button */}
                    <button
                        type="button"
                        onClick={handleTimeIn}
                        disabled={isSubmitting || !selectedReason}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 text-xs font-black text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSubmitting ? 'Recording Time In...' : 'Confirm Time In'}
                        <Icons.ArrowRight />
                    </button>
                </div>
            )}

            {/* ── Time Out Success Modal ── */}
            {showSuccessModal && lastCompletedVisit && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-scale-in text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600">
                            🎉
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900">Office Visit Completed</h3>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                Thank you for visiting the CARE Center office. Your logbook entry has been successfully updated.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left text-xs space-y-1">
                            <p><strong className="text-slate-500">Visitor:</strong> <span className="font-bold text-slate-900">{toTitleCase(lastCompletedVisit.student_name, 'Visitor')}</span></p>
                            <p><strong className="text-slate-500">Reason:</strong> <span className="font-bold text-slate-900">{lastCompletedVisit.reason}</span></p>
                            <p><strong className="text-slate-500">Time Out:</strong> <span className="font-bold text-slate-900">{formatTimeLabel(lastCompletedVisit.time_out)}</span></p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full rounded-xl bg-slate-900 py-3 text-xs font-black text-white transition hover:bg-slate-800"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
