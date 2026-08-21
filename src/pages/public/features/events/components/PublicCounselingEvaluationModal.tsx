import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    evaluatePublicCounseling,
    getPublicCounselingEvaluationForm,
    type PublicEvaluationForm,
    type PublicEvaluationQuestion
} from '../publicEventsService';

interface PublicCounselingEvaluationModalProps {
    open: boolean;
    studentId: string;
    onClose: () => void;
    onSubmitted: () => void;
    showToast: (message: string, type?: string) => void;
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, index) => min + index);

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

export default function PublicCounselingEvaluationModal({
    open,
    studentId,
    onClose,
    onSubmitted,
    showToast
}: PublicCounselingEvaluationModalProps) {
    const [form, setForm] = useState<PublicEvaluationForm | null>(null);
    const [questions, setQuestions] = useState<PublicEvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<Record<number, string | number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const callbacks = useRef({ onClose, showToast });
    useEffect(() => { callbacks.current = { onClose, showToast }; });

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            setResponses({});
            try {
                const result = await getPublicCounselingEvaluationForm();
                if (!active) return;
                setForm(result.form);
                setQuestions(result.questions);
            } catch (err: any) {
                if (!active) return;
                callbacks.current.showToast(err.message || 'Could not load the counseling evaluation form.', 'error');
                callbacks.current.onClose();
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open]);

    const isAnswered = (question: PublicEvaluationQuestion) => {
        const answer = responses[question.id];
        return answer !== undefined && String(answer).trim() !== '';
    };

    const unansweredCount = questions.filter((question) => !isAnswered(question)).length;
    const canSubmit = questions.length > 0 && unansweredCount === 0;

    const handleSubmit = async () => {
        if (!form) return;
        if (!canSubmit) {
            showToast(
                questions.length === 0
                    ? 'This evaluation has no questions yet.'
                    : `Answer all ${questions.length} questions before submitting.`,
                'error'
            );
            return;
        }

        setIsSubmitting(true);
        try {
            const answers = questions.map((question) => ({
                question_id: question.id,
                answer_value: question.question_type === 'scale' ? Number(responses[question.id]) : null,
                answer_text: question.question_type !== 'scale' ? String(responses[question.id]) : null
            }));

            await evaluatePublicCounseling(studentId, answers);
            showToast('Counseling evaluation submitted. Thank you for your feedback!');
            onSubmitted();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Could not submit the evaluation.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    const totalCount = questions.length;
    const answeredCount = totalCount - unansweredCount;
    const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-4" onClick={onClose}>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
            <div
                className="relative flex h-[94vh] sm:h-auto sm:max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
                {/* ── Compact Header ── */}
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-3.5 text-white sm:px-5 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded bg-purple-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-purple-300">
                                Counseling Evaluation
                            </span>
                            <h3 className="mt-1 line-clamp-1 text-base font-black leading-snug text-white sm:text-lg">
                                {form?.title || 'Counseling Service Evaluation'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            aria-label="Close evaluation form"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {/* Progress tracker */}
                    {totalCount > 0 && !isLoading && (
                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-purple-400 transition-all duration-300 ease-out"
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
                    {/* Instructions card (scrolls away) */}
                    {form?.description && (
                        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-3.5 sm:p-4 text-slate-700 shadow-sm">
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-purple-700 mb-1">
                                Overview &amp; Instructions
                            </p>
                            <p className="text-xs leading-relaxed text-slate-600">
                                {form.description}
                            </p>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="py-12 text-center text-sm font-semibold text-slate-500">Loading questions…</div>
                    ) : (
                        <div className="space-y-3">
                            {questions.map((question, index) => {
                                const answer = responses[question.id];
                                const isAnswered = answer !== undefined && answer !== '';

                                return (
                                    <article
                                        key={question.id}
                                        className={`rounded-2xl border bg-white p-3.5 sm:p-4 shadow-sm transition-all ${
                                            isAnswered
                                                ? 'border-purple-200 ring-1 ring-purple-100/70'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition-colors ${
                                                    isAnswered
                                                        ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <p className="min-w-0 flex-1 text-[13.5px] sm:text-sm font-bold leading-snug text-slate-800">
                                                {question.question_text}
                                                {question.is_required && <span className="ml-1 text-red-500">*</span>}
                                            </p>
                                        </div>

                                        {question.question_type === 'scale' && (
                                            <div className="mt-3">
                                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                                    {range(question.scale_min ?? 1, question.scale_max ?? 5).map((value) => {
                                                        const isSelected = answer === value;
                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                onClick={() => setResponses((prev) => ({ ...prev, [question.id]: value }))}
                                                                className={`flex min-h-[44px] items-center justify-center rounded-xl border text-sm font-black transition-all active:scale-95 ${
                                                                    isSelected
                                                                        ? 'border-purple-600 bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-purple-200 hover:bg-purple-50/40'
                                                                }`}
                                                            >
                                                                {value}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {(question.scale_min_label || question.scale_max_label) && (
                                                    <div className="mt-1.5 flex justify-between px-1 text-[10px] font-semibold text-slate-400">
                                                        <span>{question.scale_min_label || 'Poor'}</span>
                                                        <span>{question.scale_max_label || 'Excellent'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {question.question_type === 'choice' && (
                                            <div className="mt-3 space-y-2">
                                                {(question.choices ?? []).map((choice: string) => (
                                                    <label key={choice} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-sm text-slate-700 cursor-pointer hover:bg-slate-100/60 transition">
                                                        <input
                                                            type="radio"
                                                            checked={answer === choice}
                                                            onChange={() => setResponses((prev) => ({ ...prev, [question.id]: choice }))}
                                                            className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <span className="font-semibold text-xs sm:text-sm">{choice}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {question.question_type === 'text' && (
                                            <textarea
                                                className="mt-3 min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-100"
                                                value={String(answer ?? '')}
                                                onChange={(changeEvent) => setResponses((prev) => ({ ...prev, [question.id]: changeEvent.target.value }))}
                                                placeholder="Type your answer…"
                                            />
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
                                        {unansweredCount} question{unansweredCount === 1 ? '' : 's'} remaining
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
                                disabled={isSubmitting || isLoading || !canSubmit}
                                className="inline-flex min-w-[130px] items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-sm shadow-purple-500/20 transition-all hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            >
                                {isSubmitting ? 'Submitting…' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
