import React from 'react';
import type { PublicAssessmentForm } from '../publicEventsService';
import type { PublicIdentity } from '../hooks/usePublicEvents';

interface PublicAssessmentViewProps {
    identity: PublicIdentity | null;
    formsList: PublicAssessmentForm[];
    isLoading: boolean;
    isError: boolean;
    onRequireSignIn: () => void;
    onOpenForm: (form: PublicAssessmentForm) => void;
    onRefresh: () => void;
}

const ClipboardIcon = () => (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="m9 14 2 2 4-4" />
    </svg>
);

const ArrowIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const formatAssessmentDate = (value: string) => {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PublicAssessmentView({
    identity,
    formsList,
    isLoading,
    isError,
    onRequireSignIn,
    onOpenForm,
    onRefresh,
}: PublicAssessmentViewProps) {
    return (
        <div className="mx-auto max-w-lg px-4 pt-5 pb-10 animate-fade-in space-y-4">
            {!identity && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                    <p className="min-w-0 text-xs font-semibold text-amber-800">
                        Viewing as a guest. Enter your Student ID to answer the assessment forms.
                    </p>
                    <button
                        type="button"
                        onClick={onRequireSignIn}
                        className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-amber-600"
                    >
                        Sign In
                    </button>
                </div>
            )}

            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Available Forms</h3>
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="text-xs font-black uppercase tracking-wider text-blue-600 transition-colors hover:text-blue-800"
                    >
                        Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
                        Loading forms…
                    </div>
                ) : isError ? (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center text-sm font-semibold text-rose-600">
                        Could not load the assessment forms. Please try again.
                    </div>
                ) : formsList.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                            <ClipboardIcon />
                        </div>
                        <p className="text-sm font-black text-slate-700">No assessment forms right now.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Check back later — new forms appear here when the CARE office publishes them.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {formsList.map((form) => {
                            const isDone = Boolean(identity) && form.is_completed;
                            return (
                                <button
                                    key={form.id}
                                    type="button"
                                    onClick={() => {
                                        if (!identity) {
                                            onRequireSignIn();
                                            return;
                                        }
                                        onOpenForm(form);
                                    }}
                                    className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <h4 className={`line-clamp-2 text-[13px] font-black leading-5 transition-colors sm:text-sm ${isDone ? 'text-slate-500' : 'text-slate-950 group-hover:text-blue-700'}`}>
                                            {form.title || 'Untitled assessment'}
                                        </h4>
                                        {isDone && (
                                            <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-600">
                                                Done
                                            </span>
                                        )}
                                    </div>
                                    {form.description && (
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{form.description}</p>
                                    )}
                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                            {formatAssessmentDate(form.created_at)}
                                        </p>
                                        <span className={`inline-flex items-center gap-1 text-xs font-black ${isDone ? 'text-slate-400' : 'text-blue-600'}`}>
                                            {isDone ? 'Submitted' : identity ? 'Open form' : 'Sign in to answer'}
                                            {!isDone && <ArrowIcon />}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}