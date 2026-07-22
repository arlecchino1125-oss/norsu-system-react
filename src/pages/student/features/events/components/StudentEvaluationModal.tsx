import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import {
    getEvaluationForEvent,
    submitEvaluation,
    type StudentEvaluationForm,
    type StudentEvaluationQuestion
} from '../studentEvaluationService';

interface StudentEvaluationModalProps {
    open: boolean;
    eventId: number;
    eventTitle: string;
    personalInfo: any;
    onClose: () => void;
    onSubmitted: (eventId: number) => void | Promise<void>;
    showToast: (message: string, type?: string) => void;
}

const range = (min: number, max: number) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

export default function StudentEvaluationModal({
    open,
    eventId,
    eventTitle,
    personalInfo,
    onClose,
    onSubmitted,
    showToast
}: StudentEvaluationModalProps) {
    const [form, setForm] = useState<StudentEvaluationForm | null>(null);
    const [questions, setQuestions] = useState<StudentEvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<Record<number, string | number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            setResponses({});
            try {
                const result = await getEvaluationForEvent(eventId);
                if (!active) return;
                if (!result) {
                    showToast('This event has no evaluation form.', 'error');
                    onClose();
                    return;
                }
                setForm(result.form);
                setQuestions(result.questions);
            } catch {
                if (active) {
                    showToast('Could not load the evaluation.', 'error');
                    onClose();
                }
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open, eventId, onClose, showToast]);

    const handleSubmit = async () => {
        const missing = questions.find(
            (question) => question.is_required && (responses[question.id] === undefined || responses[question.id] === '')
        );
        if (missing) {
            showToast('Please answer all required questions.', 'error');
            return;
        }
        if (!form) return;

        setIsSubmitting(true);
        try {
            await submitEvaluation(form.id, questions, responses);
            showToast('Evaluation submitted. Thank you!', 'success');
            await onSubmitted(eventId);
            onClose();
        } catch (error: any) {
            // The unique index on (form_id, student_id) is the real guard against
            // a double submit -- a second tap loses the race at the database.
            if (error?.code === '23505') {
                showToast('You have already submitted this evaluation.', 'error');
                await onSubmitted(eventId);
                onClose();
                return;
            }
            showToast('Could not submit the evaluation.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4" onClick={onClose}>
            <div
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-300">Event Evaluation</p>
                    <h3 className="mt-1 text-lg font-black leading-tight text-white">{form?.title || eventTitle}</h3>
                    {form?.description && (
                        <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-300">{form.description}</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 student-mobile-modal-scroll-panel sm:p-5">
                    {/* Filled in from the student record and not editable -- the server
                        stamps these same values on submit, so typing here would change nothing. */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Your Details</h4>
                        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <dt className="font-semibold text-slate-400">Name</dt>
                                <dd className="font-black text-slate-900">{personalInfo?.firstName} {personalInfo?.lastName}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">Student ID</dt>
                                <dd className="font-black text-slate-900">{personalInfo?.studentId || '-'}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">College / Department</dt>
                                <dd className="font-black text-slate-900">{personalInfo?.department || '-'}</dd>
                            </div>
                            <div>
                                <dt className="font-semibold text-slate-400">Course &amp; Year</dt>
                                <dd className="font-black text-slate-900">{personalInfo?.course || '-'} — {personalInfo?.year || '-'}</dd>
                            </div>
                        </dl>
                    </section>

                    {isLoading ? (
                        <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading questions…</p>
                    ) : (
                        <div className="mt-3 space-y-3">
                            {questions.map((question, index) => {
                                const answer = responses[question.id];
                                return (
                                    <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-500">{index + 1}</span>
                                            <p className="text-sm font-bold leading-6 text-slate-800">
                                                {question.question_text}
                                                {question.is_required && <span className="ml-1 text-red-500">*</span>}
                                            </p>
                                        </div>

                                        {question.question_type === 'scale' && (
                                            <div className="mt-3 sm:ml-10">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {range(question.scale_min ?? 1, question.scale_max ?? 5).map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            aria-pressed={answer === value}
                                                            onClick={() => setResponses((prev) => ({ ...prev, [question.id]: value }))}
                                                            className={`min-h-11 min-w-11 rounded-xl border text-sm font-black transition ${answer === value ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200'}`}
                                                        >
                                                            {value}
                                                        </button>
                                                    ))}
                                                </div>
                                                {(question.scale_min_label || question.scale_max_label) && (
                                                    <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
                                                        <span>{question.scale_min_label}</span>
                                                        <span>{question.scale_max_label}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {question.question_type === 'choice' && (
                                            <div className="mt-3 space-y-2 sm:ml-10">
                                                {(question.choices ?? []).map((choice) => (
                                                    <label key={choice} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                                        <input
                                                            type="radio"
                                                            name={`question-${question.id}`}
                                                            checked={answer === choice}
                                                            onChange={() => setResponses((prev) => ({ ...prev, [question.id]: choice }))}
                                                            className="h-4 w-4"
                                                        />
                                                        {choice}
                                                    </label>
                                                ))}
                                            </div>
                                        )}

                                        {question.question_type === 'text' && (
                                            <textarea
                                                aria-label={question.question_text}
                                                className="mt-3 min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-purple-300 focus:bg-white sm:ml-10 sm:w-[calc(100%-2.5rem)]"
                                                value={String(answer ?? '')}
                                                onChange={(event) => setResponses((prev) => ({ ...prev, [question.id]: event.target.value }))}
                                                placeholder="Type your answer…"
                                            />
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-5">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoading || questions.length === 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-black text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-slate-300 btn-press"
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Evaluation'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
