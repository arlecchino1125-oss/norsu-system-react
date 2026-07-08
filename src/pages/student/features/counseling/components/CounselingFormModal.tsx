import React, { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';
import { getTextInputLimitProps, validateTextInput } from '../../../../../utils/inputSecurity';

type CounselingFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onSubmitted?: () => void | Promise<void>;
};

const createInitialCounselingForm = () => ({
    reason_for_referral: '',
    personal_actions_taken: '',
    date_duration_of_concern: ''
});

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const SubmitIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const InfoIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </svg>
);

const SummaryField = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{value || 'Not set'}</p>
    </div>
);

const FieldBlock = ({ children, helper, label, required, htmlFor }: { children: ReactNode; helper?: string; htmlFor: string; label: string; required?: boolean }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor={htmlFor} className="block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            {label}
            {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
        {helper && <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>}
        <div className="mt-3">{children}</div>
    </div>
);

const textareaClassName = 'w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm font-semibold leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100';

export default function CounselingFormModal({
    isOpen,
    onClose,
    personalInfo,
    showToast,
    onSubmitted
}: CounselingFormModalProps) {
    const [form, setForm] = useState(createInitialCounselingForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(createInitialCounselingForm());
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        const reasonCheck = validateTextInput(form.reason_for_referral, 'notes', {
            required: true,
            multiline: true,
            label: 'Reason for requesting counseling'
        });
        const actionsCheck = validateTextInput(form.personal_actions_taken, 'notes', {
            multiline: true,
            label: 'Personal actions taken'
        });
        const durationCheck = validateTextInput(form.date_duration_of_concern, 'mediumText', {
            multiline: true,
            label: 'Date / duration of concern'
        });
        const invalidText = [reasonCheck, actionsCheck, durationCheck].find((check) => !check.valid);

        if (invalidText?.error) {
            showToast(invalidText.error, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                course_year: `${personalInfo.course || ''} - ${personalInfo.year || ''}`,
                contact_number: personalInfo.mobile || '',
                request_type: 'Self-Referral',
                description: reasonCheck.value,
                reason_for_referral: reasonCheck.value,
                personal_actions_taken: actionsCheck.value,
                date_duration_of_concern: durationCheck.value,
                department: personalInfo.department,
                status: 'Submitted'
            } as any;

            const { error } = await supabase.from('counseling_requests').insert([payload]);
            if (error) throw error;

            await onSubmitted?.();
            showToast('Counseling Request Submitted!');
            onClose();
            setForm(createInitialCounselingForm());
        } catch {
            showToast(`Error.`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4">
            <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel">
                <div className="shrink-0 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Counseling Request</p>
                            <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">Self-referral form</h3>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Share the concern CARE staff should review for counseling support.</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close counseling request form"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 student-mobile-modal-scroll-panel sm:p-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                                <InfoIcon />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Student Summary</p>
                                <h4 className="mt-1 text-base font-black text-slate-950">Request owner</h4>
                                <p className="mt-1 text-xs leading-5 text-slate-500">These details are attached to the request from your student profile.</p>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <SummaryField label="Name" value={`${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim()} />
                            <SummaryField label="Course & Year" value={`${personalInfo.course || ''} - ${personalInfo.year || ''}`.trim()} />
                            <SummaryField label="Contact" value={personalInfo.mobile || 'Not set'} />
                        </div>
                    </section>

                    <FieldBlock
                        htmlFor="counsel-reason"
                        label="Reason/s for requesting counseling"
                        helper="Briefly describe why you are requesting counseling support."
                        required
                    >
                        <textarea
                            id="counsel-reason"
                            name="counsel-reason"
                            {...getTextInputLimitProps('notes')}
                            rows={4}
                            value={form.reason_for_referral}
                            onChange={(event) => setForm((prev) => ({ ...prev, reason_for_referral: event.target.value }))}
                            className={textareaClassName}
                            placeholder="Describe your reason/s for seeking counseling..."
                        />
                    </FieldBlock>

                    <FieldBlock
                        htmlFor="counsel-actions"
                        label="Personal actions taken"
                        helper="Add any steps you already tried, if applicable."
                    >
                        <textarea
                            id="counsel-actions"
                            name="counsel-actions"
                            {...getTextInputLimitProps('notes')}
                            rows={3}
                            value={form.personal_actions_taken}
                            onChange={(event) => setForm((prev) => ({ ...prev, personal_actions_taken: event.target.value }))}
                            className={textareaClassName}
                            placeholder="Describe any steps you've taken..."
                        />
                    </FieldBlock>

                    <FieldBlock
                        htmlFor="counsel-duration"
                        label="Date / duration of concern"
                        helper="Tell CARE when this started or how long it has been ongoing."
                    >
                        <textarea
                            id="counsel-duration"
                            name="counsel-duration"
                            {...getTextInputLimitProps('mediumText')}
                            rows={2}
                            value={form.date_duration_of_concern}
                            onChange={(event) => setForm((prev) => ({ ...prev, date_duration_of_concern: event.target.value }))}
                            className={textareaClassName}
                            placeholder="e.g. Since January 2026, approximately 3 weeks..."
                        />
                    </FieldBlock>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-xs font-semibold leading-5 text-blue-900">Requests are reviewed by authorized CARE personnel and routed through the counseling support workflow.</p>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:p-5">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                            {!isSubmitting && <SubmitIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
