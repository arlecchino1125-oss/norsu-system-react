import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../lib/supabase';

type AssessmentFormModalProps = {
    form: any;
    isOpen: boolean;
    studentId: string;
    onClose: () => void;
    onSubmitted: (formId: any, wasNewSubmission: boolean) => void | Promise<void>;
    showToast: (message: string, type?: string) => void;
};

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
                showToast(`Failed to load questions: ${error.message}`, 'error');
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
            if (error?.code === '23505' || String(error?.message || '').toLowerCase().includes('duplicate')) {
                await onSubmitted(form.id, false);
                onClose();
                showToast('You have already completed this assessment.', 'error');
                return;
            }

            showToast(`Error submitting assessment: ${error.message}`, 'error');
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
            className="student-mobile-modal-overlay"
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px' }}
        >
            <div
                className="animate-backdrop"
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
                onClick={onClose}
            />
            <div
                className="animate-scale-in student-mobile-modal-panel"
                style={{ position: 'relative', width: '100%', maxWidth: '640px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', overflow: 'hidden' }}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={{ padding: 'clamp(16px, 4vw, 24px)', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)', color: '#fff', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 'clamp(16px, 4.5vw, 18px)', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>{form.title}</h3>
                            <p style={{ fontSize: '12px', opacity: 0.75, marginTop: '4px', lineHeight: 1.4 }}>
                                {form.description || 'Please answer all questions honestly.'}
                            </p>
                            {formQuestions.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                                    <div style={{ flex: 1, maxWidth: '180px', height: '5px', background: 'rgba(255,255,255,0.2)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div
                                            style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg, #7dd3fc, #6ee7b7)', borderRadius: '99px', transition: 'width 0.4s ease' }}
                                        />
                                    </div>
                                    <span style={{ fontSize: '10px', fontWeight: 700, opacity: 0.7 }}>
                                        {completionCount}/{formQuestions.length}
                                    </span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '18px' }}
                        >
                            x
                        </button>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 'clamp(16px, 4vw, 24px)', background: '#f8fafc' }}>
                    {isLoadingQuestions ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', textAlign: 'center' }}>
                            <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid #dbeafe', borderTopColor: '#3b82f6', marginBottom: '16px' }} />
                            <p style={{ color: '#6b7280', fontWeight: 600, fontSize: '14px' }}>Loading questions...</p>
                            <p style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>Please wait while we prepare your assessment.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {formQuestions.map((question: any, index: number) => (
                                <div
                                    key={question.id}
                                    style={{
                                        background: '#fff',
                                        borderRadius: '14px',
                                        padding: '16px',
                                        border: `1.5px solid ${responses[question.id] !== undefined ? '#93c5fd' : '#e5e7eb'}`,
                                        boxShadow: responses[question.id] !== undefined ? '0 2px 8px rgba(59,130,246,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
                                        transition: 'all 0.25s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
                                        <span
                                            style={{
                                                width: '26px',
                                                height: '26px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                flexShrink: 0,
                                                background: responses[question.id] !== undefined ? '#3b82f6' : '#e5e7eb',
                                                color: responses[question.id] !== undefined ? '#fff' : '#9ca3af',
                                                transition: 'all 0.25s ease'
                                            }}
                                        >
                                            {index + 1}
                                        </span>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', lineHeight: 1.6, margin: 0, paddingTop: '2px' }}>
                                            {question.question_text}
                                        </p>
                                    </div>
                                    {question.question_type === 'text' || question.question_type === 'open_ended' ? (
                                        <div className="ml-0 sm:ml-10">
                                            <textarea
                                                style={{ width: '100%', background: '#f9fafb', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                                                rows={2}
                                                placeholder="Type your answer here..."
                                                value={responses[question.id] || ''}
                                                onChange={(event) => handleInventoryChange(question.id, event.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="ml-0 sm:ml-10">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <button
                                                        key={value}
                                                        onClick={() => handleInventoryChange(question.id, value)}
                                                        style={{
                                                            flex: 1,
                                                            height: '44px',
                                                            borderRadius: '10px',
                                                            border: `2px solid ${responses[question.id] === value ? '#3b82f6' : '#e5e7eb'}`,
                                                            background: responses[question.id] === value ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#fff',
                                                            color: responses[question.id] === value ? '#fff' : '#6b7280',
                                                            fontWeight: 700,
                                                            fontSize: '14px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            transform: responses[question.id] === value ? 'scale(1.05)' : 'scale(1)',
                                                            boxShadow: responses[question.id] === value ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                                                        }}
                                                    >
                                                        {value}
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Disagree</span>
                                                <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 500 }}>Strongly Agree</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={{ padding: '16px clamp(16px, 4vw, 24px)', borderTop: '1px solid #f1f5f9', background: '#fff', flexShrink: 0 }}>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || formQuestions.length === 0}
                        className="btn-press"
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: isSubmitting || formQuestions.length === 0 ? '#cbd5e1' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: isSubmitting || formQuestions.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: isSubmitting || formQuestions.length === 0 ? 'none' : '0 4px 14px rgba(37,99,235,0.3)', transition: 'all 0.25s ease' }}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path d="M5 13l4 4L19 7" />
                                </svg>
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
