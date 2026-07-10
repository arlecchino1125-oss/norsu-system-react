import React, { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../../../lib/supabase';
import {
    getTextInputLimitProps, validateTextInput,
    MAX_SUPPORT_DOCUMENT_BYTES, SUPPORT_DOCUMENT_ACCEPT, isSupportedDocumentFile
} from '../../../../../utils/inputSecurity';

type SupportFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    onSubmitted?: () => void | Promise<void>;
};

const SUPPORT_CATEGORIES = [
    { value: 'Persons with Disabilities (PWDs)', label: 'PWD' },
    { value: 'Indigenous Peoples (IPs) & Cultural Communities', label: 'IPs / Cultural' },
    { value: 'Working Students', label: 'Working' },
    { value: 'Economically Challenged Students', label: 'Economic Need' },
    { value: 'Students with Special Learning Needs', label: 'Learning Needs' },
    { value: 'Rebel Returnees', label: 'Rebel Returnees' },
    { value: 'Orphans', label: 'Orphans' },
    { value: 'Senior Citizens', label: 'Senior Citizens' },
    { value: 'Homeless Students', label: 'Homeless' },
    { value: 'Solo Parenting', label: 'Solo Parenting' },
    { value: 'Pregnant Women', label: 'Pregnant' },
    { value: 'Women in Especially Difficult Circumstances', label: 'Women in Need' }
];
const createInitialSupportForm = () => ({
    categories: [] as string[],
    otherCategory: '',
    q1: '',
    q2: '',
    q3: '',
    q4: '',
    files: [] as File[]
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

const UploadIcon = () => (
    <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
    </svg>
);

const SummaryField = ({ label, value }: { label: string; value: string }) => (
    <div className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 sm:rounded-xl sm:px-3 sm:py-2.5">
        <p className="truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-400 sm:text-[9px]">{label}</p>
        <p className="mt-0.5 truncate text-[11px] font-bold leading-4 text-slate-800 sm:mt-1 sm:text-sm sm:leading-5" title={value || 'Not set'}>{value || 'Not set'}</p>
    </div>
);

const SectionCard = ({ children, description, title }: { children: ReactNode; description?: string; title: string }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
        <div className="mb-2 sm:mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em]">{title}</p>
            {description && <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500 sm:mt-1 sm:text-xs sm:leading-5">{description}</p>}
        </div>
        {children}
    </section>
);

const FieldBlock = ({ children, helper, htmlFor, label }: { children: ReactNode; helper?: string; htmlFor: string; label: string }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-[11px] font-black leading-4 text-slate-700 sm:text-xs sm:leading-5">{label}</label>
        {helper && <p className="mt-1 text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">{helper}</p>}
        <div className="mt-1.5 sm:mt-2">{children}</div>
    </div>
);

const textareaClassName = 'w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-[12px] font-semibold leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:px-3 sm:py-2.5 sm:text-sm sm:leading-6';

export default function SupportFormModal({
    isOpen,
    onClose,
    personalInfo,
    showToast,
    onSubmitted
}: SupportFormModalProps) {
    const [form, setForm] = useState(createInitialSupportForm);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm(createInitialSupportForm());
        }
    }, [isOpen]);

    const handleSupportDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.target.files || []);
        const validFiles = selectedFiles.filter((file) => {
            if (!isSupportedDocumentFile(file)) {
                showToast(`${file.name} must be an image or PDF file.`, 'error');
                return false;
            }
            if (file.size > MAX_SUPPORT_DOCUMENT_BYTES) {
                showToast(`${file.name} must be under 1 MB.`, 'error');
                return false;
            }
            return true;
        });

        setForm((prev) => ({
            ...prev,
            files: [...prev.files, ...validFiles].slice(0, 4)
        }));
        event.target.value = '';
    };

    const handleSubmit = async () => {
        if (form.categories.length === 0 && !form.otherCategory) {
            showToast('Select at least one category.', 'error');
            return;
        }

        const otherCategoryCheck = validateTextInput(form.otherCategory, 'shortText', { label: 'Other category' });
        const q1Check = validateTextInput(form.q1, 'notes', { multiline: true, label: 'Disability or special learning need' });
        const q2Check = validateTextInput(form.q2, 'notes', { multiline: true, label: 'Previous school support' });
        const q3Check = validateTextInput(form.q3, 'notes', { multiline: true, label: 'Required support' });
        const q4Check = validateTextInput(form.q4, 'notes', { multiline: true, label: 'Other special needs' });
        const invalidText = [otherCategoryCheck, q1Check, q2Check, q3Check, q4Check].find((check) => !check.valid);
        if (invalidText?.error) {
            showToast(invalidText.error, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const docUrls: string[] = [];
            if (form.files.length > 0) {
                for (const file of form.files) {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${personalInfo.studentId}_support_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${fileExt}`;
                    const { error: uploadError } = await supabase.storage.from('support_documents').upload(fileName, file);
                    if (uploadError) throw uploadError;
                    docUrls.push(fileName);
                }
            }

            const description = `[Q1 Description]: ${q1Check.value}\n[Q2 Previous Support]: ${q2Check.value}\n[Q3 Required Support]: ${q3Check.value}\n[Q4 Other Needs]: ${q4Check.value}`.trim();
            const finalCategories = [...form.categories];
            if (otherCategoryCheck.value) {
                finalCategories.push(`Other: ${otherCategoryCheck.value}`);
            }

            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                department: personalInfo.department,
                support_type: finalCategories.join(', '),
                description,
                documents_url: docUrls.length > 0 ? JSON.stringify(docUrls) : null,
                status: 'Submitted'
            } as any;

            const { error } = await supabase.from('support_requests').insert([payload]);
            if (error) throw error;

            await onSubmitted?.();
            showToast('Support Request Submitted!');
            onClose();
            setForm(createInitialSupportForm());
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-2 student-mobile-modal-overlay sm:items-center sm:p-4">
            <div className="student-support-form-modal flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel">
                <div className="shrink-0 border-b border-slate-100 p-3 sm:p-5">
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500 sm:text-[10px] sm:tracking-[0.16em]">Additional Support</p>
                            <h3 className="mt-0.5 text-base font-black leading-5 text-slate-950 sm:mt-1 sm:text-lg sm:leading-tight">Support request form</h3>
                            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs sm:leading-5">Tell Student Affairs what assistance or accommodation you need.</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close support request form"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:h-9 sm:w-9"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-3 student-mobile-modal-scroll-panel sm:space-y-4 sm:p-5">
                    <SectionCard title="Student Summary" description="These details are attached to the request from your student profile.">
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <SummaryField label="Name" value={`${personalInfo.firstName || ''} ${personalInfo.lastName || ''}`.trim()} />
                            <SummaryField label="Program & Year" value={`${personalInfo.course || ''} - ${personalInfo.year || ''}`.trim()} />
                            <SummaryField label="Contact" value={personalInfo.mobile || personalInfo.email || 'Not set'} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Support Category" description="Choose all categories that match your request.">
                        <div className="grid grid-cols-2 items-start gap-1.5 sm:gap-2">
                            {SUPPORT_CATEGORIES.map((category, index) => {
                                const checked = form.categories.includes(category.value);
                                return (
                                    <label
                                        key={category.value}
                                        htmlFor={`support-cat-${index}`}
                                        title={category.value}
                                        className={`flex min-h-[2.375rem] cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-bold leading-4 transition sm:min-h-[3rem] sm:rounded-xl sm:p-3 sm:text-sm sm:leading-5 ${checked ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        <input
                                            id={`support-cat-${index}`}
                                            name={`support-cat-${index}`}
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => {
                                                const categories = event.target.checked
                                                    ? [...form.categories, category.value]
                                                    : form.categories.filter((entry) => entry !== category.value);
                                                setForm((prev) => ({ ...prev, categories }));
                                            }}
                                            className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-300 sm:h-4 sm:w-4"
                                        />
                                        <span className="min-w-0 truncate">{category.label}</span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:mt-3 sm:p-3">
                            <label htmlFor="support-other-specify" className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-xs">Other category</label>
                            <input
                                id="support-other-specify"
                                name="support-other-specify"
                                {...getTextInputLimitProps('shortText')}
                                value={form.otherCategory}
                                onChange={(event) => setForm((prev) => ({ ...prev, otherCategory: event.target.value }))}
                                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:mt-2 sm:px-3 sm:py-2.5 sm:text-sm"
                                placeholder="Specify another category if needed"
                            />
                        </div>
                    </SectionCard>

                    <SectionCard title="Program Context" description="Program preferences are pulled from your student profile.">
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                            <SummaryField label="1st Priority" value={personalInfo.priorityCourse || 'Not set'} />
                            <SummaryField label="2nd Priority" value={personalInfo.altCourse1 || 'Not set'} />
                            <SummaryField label="3rd Priority" value={personalInfo.altCourse2 || 'Not set'} />
                        </div>
                    </SectionCard>

                    <SectionCard title="Support Details" description="Short, clear answers help the proper team review the request.">
                        <div className="space-y-3 sm:space-y-4">
                            <FieldBlock htmlFor="support-q1" label="Describe your disability or special learning need">
                                <textarea
                                    id="support-q1"
                                    name="support-q1"
                                    {...getTextInputLimitProps('notes')}
                                    rows={2}
                                    value={form.q1}
                                    onChange={(event) => setForm((prev) => ({ ...prev, q1: event.target.value }))}
                                    className={textareaClassName}
                                    placeholder="Briefly describe the need or condition..."
                                />
                            </FieldBlock>
                            <FieldBlock htmlFor="support-q2" label="Previous school support">
                                <textarea
                                    id="support-q2"
                                    name="support-q2"
                                    {...getTextInputLimitProps('notes')}
                                    rows={2}
                                    value={form.q2}
                                    onChange={(event) => setForm((prev) => ({ ...prev, q2: event.target.value }))}
                                    className={textareaClassName}
                                    placeholder="Describe any support you received before..."
                                />
                            </FieldBlock>
                            <FieldBlock htmlFor="support-q3" label="Support needed from NORSU-Guihulngan Campus">
                                <textarea
                                    id="support-q3"
                                    name="support-q3"
                                    {...getTextInputLimitProps('notes')}
                                    rows={2}
                                    value={form.q3}
                                    onChange={(event) => setForm((prev) => ({ ...prev, q3: event.target.value }))}
                                    className={textareaClassName}
                                    placeholder="Describe what assistance would help you participate..."
                                />
                            </FieldBlock>
                            <FieldBlock htmlFor="support-q4" label="Other special needs or assistance">
                                <textarea
                                    id="support-q4"
                                    name="support-q4"
                                    {...getTextInputLimitProps('notes')}
                                    rows={2}
                                    value={form.q4}
                                    onChange={(event) => setForm((prev) => ({ ...prev, q4: event.target.value }))}
                                    className={textareaClassName}
                                    placeholder="Add anything else the support team should know..."
                                />
                            </FieldBlock>
                        </div>
                    </SectionCard>

                    <SectionCard title="Supporting Documents" description="Upload up to 4 images or PDFs. Each file must be under 1 MB.">
                        <label htmlFor="support-documents" className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition sm:rounded-2xl sm:p-5 ${form.files.length >= 4 ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm sm:h-10 sm:w-10">
                                <UploadIcon />
                            </span>
                            <span className="mt-2 text-xs font-black sm:mt-3 sm:text-sm">{form.files.length >= 4 ? 'Document limit reached' : 'Choose support documents'}</span>
                            <span className="mt-0.5 text-[11px] font-semibold sm:mt-1 sm:text-xs">{form.files.length}/4 files selected</span>
                            <input
                                id="support-documents"
                                name="support-documents"
                                type="file"
                                accept={SUPPORT_DOCUMENT_ACCEPT}
                                multiple
                                onChange={handleSupportDocumentChange}
                                disabled={form.files.length >= 4}
                                className="sr-only"
                            />
                        </label>
                        {form.files.length > 0 && (
                            <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
                                {form.files.map((file, index) => (
                                    <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 px-2.5 py-2 sm:gap-3 sm:px-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-blue-900 sm:text-sm">{file.name}</p>
                                            <p className="text-[10px] font-semibold text-blue-500">{(file.size / 1024).toFixed(0)} KB</p>
                                        </div>
                                        <button
                                            type="button"
                                            aria-label={`Remove ${file.name}`}
                                            onClick={() => setForm((prev) => ({ ...prev, files: prev.files.filter((_, fileIndex) => fileIndex !== index) }))}
                                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-white text-rose-500 transition hover:bg-rose-50 sm:h-8 sm:w-8"
                                        >
                                            <CloseIcon />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:rounded-2xl sm:p-4">
                        <p className="text-[11px] font-semibold leading-4 text-blue-900 sm:text-xs sm:leading-5">Support information is reviewed by authorized personnel and routed only to staff who can help evaluate or provide assistance.</p>
                    </div>
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white p-3 sm:p-5">
                    <div className="flex items-center gap-2 sm:justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex w-auto shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:px-4 sm:py-2.5 sm:text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:bg-slate-300 sm:flex-none sm:px-4 sm:py-2.5 sm:text-sm"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            {!isSubmitting && <SubmitIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
