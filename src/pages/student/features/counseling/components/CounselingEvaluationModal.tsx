import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import {
    getGlobalEvaluationFormForStudent,
    submitCounselingEvaluation,
    type StudentCounselingEvaluationForm,
    type StudentCounselingEvaluationQuestion
} from '../studentCounselingEvaluationService';

interface CounselingEvaluationModalProps {
    open: boolean;
    requestId: number | null;
    personalInfo: any;
    onClose: () => void;
    onSubmitted: (requestId: number | null) => void | Promise<void>;
    showToast: (message: string, type?: string) => void;
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

export default function CounselingEvaluationModal({
    open,
    requestId,
    personalInfo,
    onClose,
    onSubmitted,
    showToast
}: CounselingEvaluationModalProps) {
    const [form, setForm] = useState<StudentCounselingEvaluationForm | null>(null);
    const [questions, setQuestions] = useState<StudentCounselingEvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<Record<number, string | number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const lastSubmitTimeRef = useRef<number>(0);

    const callbacks = useRef({ onClose, showToast });
    useEffect(() => { callbacks.current = { onClose, showToast }; });

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            setResponses({});
            try {
                const result = await getGlobalEvaluationFormForStudent(requestId);
                if (!active) return;
                if (!result.form) {
                    callbacks.current.showToast('No counseling evaluation form is available right now.', 'error');
                    callbacks.current.onClose();
                    return;
                }
                setForm(result.form);
                setQuestions(result.questions);
            } catch (err: any) {
                if (active) {
                    callbacks.current.showToast(err?.message || 'Could not load the evaluation form.', 'error');
                    callbacks.current.onClose();
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open, requestId]);

    // Validation: Checks if every single question on the form has a valid answer (strict intake like public evaluation)
    const isAnswered = (question: StudentCounselingEvaluationQuestion) => {
        const answer = responses[question.id];
        return answer !== undefined && String(answer).trim() !== '';
    };

    const unansweredCount = questions.filter((q) => !isAnswered(q)).length;
    const canSubmit = questions.length > 0 && unansweredCount === 0;

    const handleSubmit = async () => {
        if (!form) return;

        // Rate limiting / double-click protection (3 second throttle cooldown)
        const now = Date.now();
        if (now - lastSubmitTimeRef.current < 3000) {
            showToast('Please wait a moment before submitting again.', 'error');
            return;
        }

        if (!canSubmit) {
            showToast(
                questions.length === 0
                    ? 'This evaluation has no questions yet.'
                    : `Please answer all ${questions.length} questions before submitting (${unansweredCount} remaining).`,
                'error'
            );
            return;
        }

        lastSubmitTimeRef.current = now;
        setIsSubmitting(true);

        try {
            await submitCounselingEvaluation(form.id, requestId, personalInfo.studentId, questions, responses);
            showToast('Evaluation submitted successfully. Thank you for your feedback!', 'success');
            await onSubmitted(requestId);
            onClose();
        } catch (error: any) {
            if (error?.code === '23505') {
                showToast('You have already submitted an evaluation for this session.', 'error');
                await onSubmitted(requestId);
                onClose();
                return;
            }
            showToast(error?.message || 'Could not submit the evaluation.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm p-3 student-mobile-modal-overlay sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-5 py-4 text-white sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">
                                {requestId ? 'Session Evaluation' : 'Direct / Walk-In Intake'}
                            </span>
                            <h3 className="mt-1.5 text-lg font-black leading-tight text-white sm:text-xl">
                                {form?.title || 'Counseling Service Evaluation'}
                            </h3>
                            {form?.description && (
                                <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-slate-300">
                                    {form.description}
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Close evaluation form"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50/70 p-4 student-mobile-modal-scroll-panel sm:p-6 space-y-4">
                    {/* Student Identity Snapshot */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Student Information</h4>
                        <dl className="mt-2.5 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <dt className="font-semibold text-slate-400">Name</dt>
                                <dd className="mt-0.5 font-black text-slate-900">{personalInfo?.firstName} {personalInfo?.lastName}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">Student ID</dt>
                                <dd className="mt-0.5 font-black text-slate-900">{personalInfo?.studentId || '-'}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">College / Department</dt>
                                <dd className="mt-0.5 font-bold text-slate-800">{personalInfo?.department || '-'}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">Course &amp; Year</dt>
                                <dd className="mt-0.5 font-bold text-slate-800">{personalInfo?.course || '-'} — {personalInfo?.year || '-'}</dd>
                            </div>
                        </dl>
                    </section>

                    {/* Questions Form */}
                    {isLoading ? (
                        <div className="py-12 text-center">
                            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-2" />
                            <p className="text-sm font-bold text-slate-500">Loading evaluation questions…</p>
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                            <p className="text-sm font-bold text-slate-700">No questions available on this form.</p>
                            <p className="mt-1 text-xs text-slate-500">Please check back later or notify CARE center staff.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {questions.map((question, index) => {
                                const answer = responses[question.id];
                                const isItemAnswered = isAnswered(question);

                                return (
                                    <article
                                        key={question.id}
                                        className={`rounded-2xl border bg-white p-4.5 shadow-sm transition ${
                                            isItemAnswered ? 'border-slate-200/90' : 'border-amber-200/70 bg-amber-50/10'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black transition ${
                                                    isItemAnswered ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold leading-snug text-slate-900">
                                                    {question.question_text}
                                                    <span className="ml-1 text-red-500 font-black">*</span>
                                                </p>
                                            </div>
                                        </div>

                                        {/* Scale Question Type (1-5 Buttons) */}
                                        {question.question_type === 'scale' && (
                                            <div className="mt-3.5 sm:ml-10">
                                                <div className="flex flex-wrap gap-2">
                                                    {range(question.scale_min ?? 1, question.scale_max ?? 5).map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            aria-pressed={answer === value}
                                                            onClick={() => setResponses((prev) => ({ ...prev, [question.id]: value }))}
                                                            className={`h-11 min-w-11 flex-1 sm:flex-none rounded-xl border text-sm font-black transition ${
                                                                answer === value
                                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.03]'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'
                                                            }`}
                                                        >
                                                            {value}
                                                        </button>
                                                    ))}
                                                </div>
                                                {(question.scale_min_label || question.scale_max_label) && (
                                                    <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">
                                                        <span>{question.scale_min_label || 'Low'}</span>
                                                        <span>{question.scale_max_label || 'High'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Choice Question Type */}
                                        {question.question_type === 'choice' && (
                                            <div className="mt-3.5 space-y-2 sm:ml-10">
                                                {(question.choices ?? []).map((choice) => (
                                                    <label
                                                        key={choice}
                                                        className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition cursor-pointer ${
                                                            answer === choice
                                                                ? 'border-blue-500 bg-blue-50/70 text-blue-900'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`counseling-question-${question.id}`}
                                                            checked={answer === choice}
                                                            onChange={() => setResponses((prev) => ({ ...prev, [question.id]: choice }))}
                                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{choice}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {/* Text Question Type */}
                                        {question.question_type === 'text' && (
                                            <div className="mt-3 sm:ml-10">
                                                <textarea
                                                    aria-label={question.question_text}
                                                    rows={3}
                                                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                                    value={String(answer ?? '')}
                                                    onChange={(event) => setResponses((prev) => ({ ...prev, [question.id]: event.target.value }))}
                                                    placeholder="Type your response here..."
                                                />
                                            </div>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer with Completion Progress and Actions */}
                <div className="shrink-0 border-t border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:px-6">
                    <div className="mb-3 sm:mb-0">
                        {questions.length > 0 && (
                            <p className="text-xs font-semibold text-slate-500">
                                {canSubmit ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                                        ✓ All {questions.length} questions completed
                                    </span>
                                ) : (
                                    <span>
                                        <strong className="text-slate-800">{questions.length - unansweredCount}</strong> of{' '}
                                        <strong>{questions.length}</strong> answered{' '}
                                        <span className="text-amber-600 font-bold">({unansweredCount} remaining)</span>
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="flex-1 sm:flex-none rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting || isLoading}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 active:scale-[0.98]"
                        >
                            {isSubmitting ? 'Submitting…' : 'Submit Evaluation'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
