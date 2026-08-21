import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { PublicAssessmentQuestion } from '../publicEventsService';

interface PublicAssessmentFormModalProps {
    form: { id: number; title: string; description?: string | null };
    isOpen: boolean;
    studentId: string | null;
    onClose: () => void;
    onSubmit: (responses: Record<number, string | number>) => Promise<boolean>;
    showToast: (message: string, type?: string) => void;
    questions?: PublicAssessmentQuestion[];
}

const isTextQuestion = (q: PublicAssessmentQuestion) =>
    q?.question_type === 'text' || q?.question_type === 'open_ended';

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const CheckIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m20 6-11 11-5-5" />
    </svg>
);

const InfoIcon = () => (
    <svg className="h-4 w-4 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const renderScaleValue = (min: number | null, max: number | null) => {
    const lo = min ?? 1;
    const hi = max ?? 5;
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
};

const SCALE_LEGEND = [
    { value: 1, label: 'Strongly Disagree' },
    { value: 2, label: 'Disagree' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Agree' },
    { value: 5, label: 'Strongly Agree' },
];

export default function PublicAssessmentFormModal({
    form,
    isOpen,
    studentId,
    onClose,
    onSubmit,
    showToast,
    questions: preloadedQuestions = [],
}: PublicAssessmentFormModalProps) {
    const questions = preloadedQuestions;
    const [responses, setResponses] = useState<Record<number, string | number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullInstructions, setShowFullInstructions] = useState(false);

    if (!isOpen || !form || typeof document === 'undefined') return null;

    const totalCount = questions.length;
    const answeredCount = questions.filter((q) =>
        isTextQuestion(q)
            ? responses[q.id] !== undefined && String(responses[q.id]).trim() !== ''
            : responses[q.id] !== undefined
    ).length;

    const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
    const canSubmit = totalCount > 0 && answeredCount === totalCount;

    const handleAnswerChange = (qid: number, value: string | number) => {
        setResponses((prev) => {
            const next = { ...prev, [qid]: value };
            if (value === '' || value === undefined) delete next[qid];
            return next;
        });
    };

    const handleSubmit = async () => {
        if (!studentId) {
            showToast('Please sign in with your Student ID first.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const ok = await onSubmit(responses);
            if (ok) {
                onClose();
            }
        } catch (err: any) {
            showToast(err.message || 'Something went wrong.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
            <div
                className="relative flex h-[94vh] sm:h-auto sm:max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Compact Header ── */}
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-3.5 text-white sm:px-5 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded bg-blue-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">
                                Needs Assessment
                            </span>
                            <h3 className="mt-1 line-clamp-1 text-base font-black leading-snug text-white sm:text-lg">
                                {form.title}
                            </h3>
                        </div>
                        <button
                            type="button"
                            aria-label="Close assessment form"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Real-time Progress Bar */}
                    {totalCount > 0 && (
                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-blue-400 transition-all duration-300 ease-out"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="shrink-0 font-mono text-[10px] font-bold text-slate-300">
                                {answeredCount}/{totalCount} <span className="text-slate-400">({progressPercent}%)</span>
                            </span>
                        </div>
                    )}
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-3.5 sm:p-5 space-y-3.5">
                    {/* Instructions Card (scrolls away naturally) */}
                    {form.description && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5 sm:p-4 text-slate-700 shadow-sm">
                            <div className="flex items-start gap-2.5">
                                <InfoIcon />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-700">
                                        Instructions &amp; Overview
                                    </p>
                                    <p className={`mt-1 text-xs leading-relaxed text-slate-600 ${showFullInstructions ? '' : 'line-clamp-3'}`}>
                                        {form.description}
                                    </p>
                                    {form.description.length > 140 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowFullInstructions(!showFullInstructions)}
                                            className="mt-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            {showFullInstructions ? 'Show less' : 'Read full instructions…'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rating Scale Legend Pill */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1.5">
                            Rating Scale
                        </p>
                        <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-bold text-slate-600">
                            {SCALE_LEGEND.map((item) => (
                                <div key={item.value} className="flex flex-col items-center">
                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-700">
                                        {item.value}
                                    </span>
                                    <span className="mt-1 line-clamp-1 text-[9px] leading-tight text-slate-400">
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Questions List */}
                    {questions.length === 0 ? (
                        <div className="py-12 text-center text-sm font-semibold text-slate-400">
                            No questions found for this form.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((q, index) => {
                                const isAnswered = responses[q.id] !== undefined;
                                const isText = isTextQuestion(q);

                                return (
                                    <article
                                        key={q.id}
                                        className={`rounded-2xl border bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-150 ${
                                            isAnswered
                                                ? 'border-blue-200/90 ring-1 ring-blue-100/70'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                                                    isAnswered
                                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13.5px] sm:text-sm font-bold leading-snug text-slate-800">
                                                    {q.question_text}
                                                </p>
                                            </div>
                                        </div>

                                        {isText ? (
                                            <div className="mt-3">
                                                <textarea
                                                    rows={3}
                                                    value={responses[q.id] ?? ''}
                                                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                                    placeholder="Your answer…"
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-3">
                                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                                    {renderScaleValue(q.scale_min, q.scale_max).map((value) => {
                                                        const isSelected = responses[q.id] === value;
                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                onClick={() => handleAnswerChange(q.id, value)}
                                                                className={`flex min-h-[44px] items-center justify-center rounded-xl border text-sm font-black transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                                                                    isSelected
                                                                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/40'
                                                                }`}
                                                            >
                                                                {value}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Sticky Footer ── */}
                <div className="shrink-0 border-t border-slate-200/80 bg-white px-4 py-3 sm:px-5 sm:py-3.5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-500">
                                {canSubmit ? (
                                    <span className="text-emerald-600">✓ All {totalCount} completed</span>
                                ) : (
                                    <span>
                                        {totalCount - answeredCount} question{totalCount - answeredCount === 1 ? '' : 's'} remaining
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !canSubmit}
                                className="inline-flex min-w-[130px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        Submitting…
                                    </>
                                ) : (
                                    <>
                                        <CheckIcon />
                                        Submit
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

