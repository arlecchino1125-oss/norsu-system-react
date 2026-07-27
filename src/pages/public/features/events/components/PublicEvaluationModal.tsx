import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    getPublicEvaluationForm,
    publicEvaluate,
    type PublicEvaluationForm,
    type PublicEvaluationQuestion
} from '../publicEventsService';

interface PublicEvaluationModalProps {
    open: boolean;
    eventId: number;
    eventTitle: string;
    studentId: string;
    email: string;
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

export default function PublicEvaluationModal({
    open,
    eventId,
    eventTitle,
    studentId,
    email,
    onClose,
    onSubmitted,
    showToast
}: PublicEvaluationModalProps) {
    const [form, setForm] = useState<PublicEvaluationForm | null>(null);
    const [questions, setQuestions] = useState<PublicEvaluationQuestion[]>([]);
    const [responses, setResponses] = useState<Record<number, string | number>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Callbacks live in a ref so the loader below depends on the event alone.
    // With them in the dependency array, any parent re-render (a toast timing
    // out, a refetch landing) reloaded the form and wiped half-typed answers.
    const callbacks = useRef({ onClose, showToast });
    useEffect(() => { callbacks.current = { onClose, showToast }; });

    useEffect(() => {
        if (!open) return;
        let active = true;

        const load = async () => {
            setIsLoading(true);
            setResponses({});
            try {
                const result = await getPublicEvaluationForm(eventId);
                if (!active) return;
                setForm(result.form);
                setQuestions(result.questions);
            } catch (err: any) {
                if (!active) return;
                callbacks.current.showToast(err.message || 'Could not load the evaluation.', 'error');
                callbacks.current.onClose();
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void load();
        return () => { active = false; };
    }, [open, eventId]);

    const isAnswered = (question: PublicEvaluationQuestion) => {
        const answer = responses[question.id];
        return answer !== undefined && String(answer).trim() !== '';
    };
    // Every question, not just the required ones: a half-filled evaluation is
    // not worth storing, and the RPC rejects one anyway.
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

            await publicEvaluate(eventId, studentId, email, form.id, answers);
            showToast('Evaluation submitted. Thank you!');
            onSubmitted();
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Could not submit the evaluation.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 sm:items-center sm:p-4" onClick={onClose}>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Event Evaluation</p>
                            <h3 className="mt-1 text-lg font-black leading-tight text-white">{form?.title || eventTitle}</h3>
                            {form?.description && (
                                <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-300">{form.description}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            aria-label="Close evaluation form"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                    {isLoading ? (
                        <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading questions...</p>
                    ) : (
                        <div className="space-y-3">
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
                                                            onClick={() => setResponses((prev) => ({ ...prev, [question.id]: value }))}
                                                            className={`min-h-11 min-w-11 rounded-xl border text-sm font-black transition ${answer === value ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'}`}
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
                                                {(question.choices ?? []).map((choice: string) => (
                                                    <label key={choice} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                                        <input
                                                            type="radio"
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
                                                className="mt-3 min-h-[88px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-300 focus:bg-white sm:ml-10 sm:w-[calc(100%-2.5rem)]"
                                                value={String(answer ?? '')}
                                                onChange={(changeEvent) => setResponses((prev) => ({ ...prev, [question.id]: changeEvent.target.value }))}
                                                placeholder="Type your answer..."
                                            />
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-5">
                    {!isLoading && unansweredCount > 0 && (
                        <p className="mb-2 text-center text-[11px] font-bold text-amber-600">
                            {unansweredCount} of {questions.length} question{questions.length === 1 ? '' : 's'} still unanswered.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || isLoading || !canSubmit}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
