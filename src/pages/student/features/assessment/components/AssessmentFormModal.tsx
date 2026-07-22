import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';

type AssessmentFormModalProps = {
    form: any;
    isOpen: boolean;
    studentId: string;
    onClose: () => void;
    onSubmitted: (formId: any, wasNewSubmission: boolean) => void | Promise<void>;
    showToast: (message: string, type?: string) => void;
};

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const CheckIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m20 6-11 11-5-5" />
    </svg>
);

export default function AssessmentFormModal({
    form,
    isOpen,
    studentId,
    onClose,
    onSubmitted,
    showToast
}: AssessmentFormModalProps) {
    const [formQuestions, setFormQuestions] = useState<any[]>([]);
    const [responses, setResponses] = useState<Record<string, any>>({});
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen || !form) return;

        let isActive = true;

        const loadQuestions = async () => {
            setResponses({});
            setFormQuestions([]);
            setIsLoadingQuestions(true);

            const { data, error } = await supabase
                .from('questions')
                .select('id, form_id, question_text, question_type, scale_min, scale_max, order_index')
                .eq('form_id', form.id)
                .order('order_index');

            if (!isActive) return;

            if (error) {
                setIsLoadingQuestions(false);
                showToast('Failed to load questions.', 'error');
                onClose();
                return;
            }

            setFormQuestions(data || []);
            setIsLoadingQuestions(false);
        };

        void loadQuestions();

        return () => {
            isActive = false;
        };
    }, [form, isOpen, onClose, showToast]);

    const handleInventoryChange = (questionId: any, value: any) => {
        setResponses((prev) => {
            const parsed = typeof value === 'number'
                ? value
                : (Number.isNaN(Number(value)) ? value : parseInt(value, 10));

            return {
                ...prev,
                [questionId]: parsed
            };
        });
    };

    const handleSubmit = async () => {
        if (!form || !studentId) return;

        setIsSubmitting(true);

        try {
            const { data: submissionData, error: submissionError } = await supabase
                .from('submissions')
                .insert([{
                    form_id: form.id,
                    student_id: studentId,
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (submissionError) throw submissionError;

            const answersPayload = Object.entries(responses).map(([questionId, answerValue]) => ({
                submission_id: submissionData.id,
                question_id: parseInt(questionId, 10),
                answer_value: answerValue
            }));

            if (answersPayload.length > 0) {
                const { error: answersError } = await supabase
                    .from('answers')
                    .insert(answersPayload);

                if (answersError) throw answersError;
            }

            await onSubmitted(form.id, true);
            onClose();
            setResponses({});
        } catch (error: any) {
            if (error?.code === '23505' || String('').toLowerCase().includes('duplicate')) {
                await onSubmitted(form.id, false);
                onClose();
                showToast('You have already completed this assessment.', 'error');
                return;
            }

            showToast('Error submitting assessment.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !form || typeof document === 'undefined') {
        return null;
    }

    const completionCount = Object.keys(responses).length;
    const progressPercent = formQuestions.length > 0
        ? Math.round((completionCount / formQuestions.length) * 100)
        : 0;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Needs Assessment</p>
                            <h3 className="mt-1 text-lg font-black leading-tight text-white">{form.title}</h3>
                            <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-slate-300">
                                {form.description || 'Please answer all questions honestly.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close assessment form"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <CloseIcon />
                        </button>
                    </div>

                    {formQuestions.length > 0 && (
                        <div className="mt-4 flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                                <div
                                    className="h-full rounded-full bg-blue-400 transition-all"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                                {completionCount}/{formQuestions.length}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 student-mobile-modal-scroll-panel sm:p-5">
                    {isLoadingQuestions ? (
                        <div className="flex min-h-[240px] flex-col items-center justify-center text-center">
                            <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                            <p className="mt-4 text-sm font-bold text-slate-700">Loading questions</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">Please wait while we prepare your assessment.</p>
                        </div>
                    ) : formQuestions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                            <p className="text-sm font-black text-slate-800">No questions found</p>
                            <p className="mt-2 text-xs leading-5 text-slate-500">This assessment does not have questions ready yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {formQuestions.map((question: any, index: number) => {
                                const questionAnswer = responses[question.id];
                                const isAnswered = questionAnswer !== undefined;
                                const isTextQuestion = question.question_type === 'text' || question.question_type === 'open_ended';

                                return (
                                    <article
                                        key={question.id}
                                        className={`rounded-2xl border bg-white p-4 shadow-sm transition ${isAnswered ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isAnswered ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold leading-6 text-slate-800">{question.question_text}</p>
                                            </div>
                                        </div>

                                        {isTextQuestion ? (
                                            <div className="mt-3 sm:ml-11">
                                                <textarea
                                                    className="min-h-[96px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                                    rows={3}
                                                    placeholder="Type your answer here..."
                                                    value={questionAnswer || ''}
                                                    onChange={(event) => handleInventoryChange(question.id, event.target.value)}
                                                />
                                            </div>
                                        ) : (
                                            <div className="mt-3 sm:ml-11">
                                                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                                                    {[1, 2, 3, 4, 5].map((value) => {
                                                        const isSelected = questionAnswer === value;
                                                        return (
                                                            <button
                                                                key={value}
                                                                type="button"
                                                                aria-pressed={isSelected}
                                                                onClick={() => handleInventoryChange(question.id, value)}
                                                                className={`min-h-11 rounded-xl border text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50'}`}
                                                            >
                                                                {value}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-2 flex items-start justify-between gap-3">
                                                    <span className="max-w-[45%] text-[10px] font-semibold leading-4 text-slate-400">Strongly Disagree</span>
                                                    <span className="max-w-[45%] text-right text-[10px] font-semibold leading-4 text-slate-400">Strongly Agree</span>
                                                </div>
                                            </div>
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
                        disabled={isSubmitting || formQuestions.length === 0}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <CheckIcon />
                                Submit Assessment
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
