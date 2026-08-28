import React from 'react';
import type { PublicStudent } from '../publicEventsService';

interface PublicCounselingViewProps {
    identity: { student: PublicStudent } | null;
    onRequireSignIn: () => void;
    onRequestAppointment: () => void;
    onStartEvaluation: () => void;
}

const CalendarIcon = () => (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const FileCheckIcon = () => (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
    </svg>
);

const ArrowIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export default function PublicCounselingView({
    identity,
    onRequireSignIn,
    onRequestAppointment,
    onStartEvaluation
}: PublicCounselingViewProps) {
    if (!identity) {
        return (
            <div className="mx-auto max-w-lg px-3.5 pt-4 pb-8 text-center animate-fade-in sm:px-4 sm:pt-6 sm:pb-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <FileCheckIcon />
                    </div>
                    <h2 className="text-base font-black text-slate-900 sm:text-xl">Sign in required</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
                        Please enter your Student ID to request a confidential counseling session or submit session evaluation feedback.
                    </p>
                    <div className="mt-4 sm:mt-5">
                        <button
                            type="button"
                            onClick={onRequireSignIn}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-xs font-black text-white shadow-sm transition hover:bg-purple-500 sm:rounded-2xl sm:py-3.5 sm:text-sm"
                        >
                            Sign In with Student ID
                            <ArrowIcon />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-3.5 pt-3.5 pb-10 space-y-3 sm:px-4 sm:pt-5 sm:pb-12 sm:space-y-4 animate-fade-in">
            {/* Student ID Banner */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 flex items-center justify-between sm:rounded-2xl sm:p-4">
                <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-purple-600 sm:text-[10px]">Verified Student</p>
                    <p className="text-xs font-black text-purple-950">ID: {identity.student.student_id}</p>
                </div>
                <span className="rounded-md bg-purple-200/60 px-2 py-0.5 text-[9px] font-black text-purple-900 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[10px]">
                    Confidential
                </span>
            </div>

            {/* Option 1: Request Appointment */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5 sm:rounded-3xl sm:p-5 sm:space-y-3">
                <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                        <CalendarIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black text-slate-900 sm:text-sm">Request Counseling Appointment</h3>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed sm:mt-1 sm:text-xs">
                            Submit a confidential self-referral for personal, academic, or emotional guidance support.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onRequestAppointment}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 active:scale-[0.98] sm:rounded-xl sm:py-3"
                >
                    Book Appointment Form
                    <ArrowIcon />
                </button>
            </div>

            {/* Option 2: Session Evaluation */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5 sm:rounded-3xl sm:p-5 sm:space-y-3">
                <div className="flex items-start gap-2.5 sm:gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 sm:h-12 sm:w-12 sm:rounded-2xl">
                        <FileCheckIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xs font-black text-slate-900 sm:text-sm">Evaluate Completed Session</h3>
                        <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed sm:mt-1 sm:text-xs">
                            Share feedback on your recent counseling session to help us improve our guidance services.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onStartEvaluation}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-purple-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-purple-500 active:scale-[0.98] sm:rounded-xl sm:py-3"
                >
                    Open Session Evaluation
                    <ArrowIcon />
                </button>
            </div>
        </div>
    );
}
