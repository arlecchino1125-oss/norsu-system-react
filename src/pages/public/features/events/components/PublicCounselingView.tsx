import React from 'react';
import type { PublicStudent } from '../publicEventsService';

interface PublicCounselingViewProps {
    identity: { student: PublicStudent } | null;
    onRequireSignIn: () => void;
    onStartEvaluation: () => void;
}

const ArrowIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const FileCheckIcon = () => (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <path d="m9 15 2 2 4-4" />
    </svg>
);

export default function PublicCounselingView({
    identity,
    onRequireSignIn,
    onStartEvaluation
}: PublicCounselingViewProps) {
    if (!identity) {
        return (
            <div className="mx-auto max-w-2xl py-12 text-center animate-fade-in">
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                        <FileCheckIcon />
                    </div>
                    <h2 className="text-xl font-black text-slate-900 sm:text-2xl">Counseling Service Evaluation</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                        Please sign in with your Student ID to submit confidential evaluation feedback for your counseling session.
                    </p>
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={onRequireSignIn}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-500"
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
        <div className="mx-auto max-w-3xl py-8 animate-fade-in">
            <div className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 px-6 py-8 text-white sm:px-8">
                    <span className="inline-flex items-center rounded-md bg-purple-400/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-purple-200 backdrop-blur-sm">
                        Confidential Feedback
                    </span>
                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl">Counseling Evaluation</h2>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-purple-100/90 sm:text-sm">
                        Your honest feedback helps us enhance the quality and responsiveness of university guidance and counseling services.
                    </p>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Authenticated Student</h4>
                        <p className="mt-1 text-sm font-black text-slate-800">
                            Student ID: <span className="font-mono text-purple-700">{identity.student.student_id}</span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            Your identity details (department, program, year level) will be securely stamped by the server for statistical reporting.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                        <div className="text-xs text-slate-500">
                            Takes about 1–2 minutes to complete.
                        </div>
                        <button
                            type="button"
                            onClick={onStartEvaluation}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:bg-purple-500"
                        >
                            Open Evaluation Form
                            <ArrowIcon />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
