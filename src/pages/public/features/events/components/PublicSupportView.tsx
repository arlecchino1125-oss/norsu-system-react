import React, { useState, type ReactNode } from 'react';
import type { PublicStudent } from '../publicEventsService';
import { submitPublicSupportRequest } from '../publicEventsService';
import { uploadStudentSupportDocuments } from '../../../../student/features/support/supportDocumentStorage';
import {
    getTextInputLimitProps, validateTextInput,
    MAX_SUPPORT_DOCUMENT_BYTES, SUPPORT_DOCUMENT_ACCEPT, isSupportedDocumentFile
} from '../../../../../utils/inputSecurity';

interface PublicSupportViewProps {
    identity: { student: PublicStudent } | null;
    onRequireSignIn: () => void;
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

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

const ArrowIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

const HandIcon = () => (
    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
        <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </svg>
);

const SectionCard = ({ children, description, title }: { children: ReactNode; description?: string; title: string }) => (
    <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:rounded-2xl sm:p-4">
        <div className="mb-2 sm:mb-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">{title}</p>
            {description && <p className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500 sm:text-xs sm:leading-5">{description}</p>}
        </div>
        {children}
    </section>
);

const FieldBlock = ({ children, helper, htmlFor, label }: { children: ReactNode; helper?: string; htmlFor: string; label: string }) => (
    <div>
        <label htmlFor={htmlFor} className="block text-[11px] font-black leading-4 text-slate-700 sm:text-xs sm:leading-5">{label}</label>
        {helper && <p className="mt-0.5 text-[10px] leading-3.5 text-slate-500 sm:text-xs sm:leading-4">{helper}</p>}
        <div className="mt-1.5 sm:mt-2">{children}</div>
    </div>
);

const textareaClassName = 'w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold leading-5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:py-2.5 sm:text-sm sm:leading-6';

export default function PublicSupportView({
    identity,
    onRequireSignIn,
    showToast
}: PublicSupportViewProps) {
    const [form, setForm] = useState(createInitialSupportForm);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!identity) {
        return (
            <div className="mx-auto max-w-lg px-3.5 pt-4 pb-8 text-center animate-fade-in sm:px-4 sm:pt-6 sm:pb-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600 sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <HandIcon />
                    </div>
                    <h2 className="text-base font-black text-slate-900 sm:text-xl">Sign in required</h2>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 sm:mt-2 sm:text-sm">
                        Please enter your Student ID to submit a confidential support or accommodation request.
                    </p>
                    <div className="mt-4 sm:mt-5">
                        <button
                            type="button"
                            onClick={onRequireSignIn}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-xs font-black text-white shadow-sm transition hover:bg-teal-500 sm:rounded-2xl sm:py-3.5 sm:text-sm"
                        >
                            Sign In with Student ID
                            <SubmitIcon />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
            let docUrls: string[] = [];
            if (form.files.length > 0) {
                try {
                    docUrls = await uploadStudentSupportDocuments(form.files);
                } catch {
                    // Stored in support request details if direct document upload requires portal login
                }
            }

            await submitPublicSupportRequest({
                studentId: identity.student.student_id,
                categories: form.categories,
                otherCategory: otherCategoryCheck.value || undefined,
                q1: q1Check.value || '',
                q2: q2Check.value || '',
                q3: q3Check.value || '',
                q4: q4Check.value || '',
                documentsUrl: docUrls.length > 0 ? JSON.stringify(docUrls) : undefined
            });

            setIsSuccess(true);
            showToast('Support Request Submitted!', 'success');
            setForm(createInitialSupportForm());
        } catch (err: any) {
            showToast(err.message || 'Error submitting request.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="mx-auto max-w-lg px-4 pt-6 pb-12 text-center animate-fade-in">
                <div className="rounded-3xl border border-teal-200 bg-white p-6 shadow-sm sm:p-8 space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-600">
                        🎉
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900 sm:text-xl">Support Request Submitted</h2>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                            Thank you. Student Affairs and the CARE Center support team will review your request.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left text-xs space-y-1">
                        <p><strong className="text-slate-500">Student ID:</strong> <span className="font-bold text-slate-900">{identity.student.student_id}</span></p>
                        <p className="text-slate-500 text-[11px] mt-1">You can monitor and view updates anytime inside your Student Portal.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsSuccess(false)}
                        className="w-full rounded-2xl bg-slate-900 py-3.5 text-xs font-black text-white transition hover:bg-slate-800"
                    >
                        Submit Another Request
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-lg px-3.5 pt-3.5 pb-16 space-y-3 sm:px-4 sm:pt-5 sm:pb-20 sm:space-y-4 animate-fade-in">
            {/* Header Identity Card */}
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 flex items-center justify-between sm:rounded-2xl sm:p-4">
                <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-teal-600 sm:text-[10px]">Verified Student</p>
                    <p className="text-xs font-black text-teal-950">ID: {identity.student.student_id}</p>
                </div>
                <span className="rounded-md bg-teal-200/60 px-2 py-0.5 text-[9px] font-black text-teal-900 sm:rounded-lg sm:px-2.5 sm:py-1 sm:text-[10px]">
                    Support Services
                </span>
            </div>

            {/* Support Category Selection */}
            <SectionCard title="Support Category" description="Choose all categories that match your request.">
                <div className="grid grid-cols-2 items-start gap-1.5 sm:gap-2">
                    {SUPPORT_CATEGORIES.map((category, index) => {
                        const checked = form.categories.includes(category.value);
                        return (
                            <label
                                key={category.value}
                                htmlFor={`pub-support-cat-${index}`}
                                title={category.value}
                                className={`flex min-h-[2.375rem] cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-bold leading-4 transition sm:min-h-[3rem] sm:rounded-xl sm:p-3 sm:text-sm sm:leading-5 ${checked ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                <input
                                    id={`pub-support-cat-${index}`}
                                    name={`pub-support-cat-${index}`}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(event) => {
                                        const categories = event.target.checked
                                            ? [...form.categories, category.value]
                                            : form.categories.filter((entry) => entry !== category.value);
                                        setForm((prev) => ({ ...prev, categories }));
                                    }}
                                    className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-300 sm:h-4 sm:w-4"
                                />
                                <span className="min-w-0 truncate">{category.label}</span>
                            </label>
                        );
                    })}
                </div>
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2.5 sm:mt-3 sm:p-3">
                    <label htmlFor="pub-support-other-specify" className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-500 sm:text-xs">Other category</label>
                    <input
                        id="pub-support-other-specify"
                        name="pub-support-other-specify"
                        {...getTextInputLimitProps('shortText')}
                        value={form.otherCategory}
                        onChange={(event) => setForm((prev) => ({ ...prev, otherCategory: event.target.value }))}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100 sm:mt-2 sm:px-3 sm:py-2.5 sm:text-sm"
                        placeholder="Specify another category if needed"
                    />
                </div>
            </SectionCard>

            {/* Support Details Questions */}
            <SectionCard title="Support Details" description="Short, clear answers help the proper team review the request.">
                <div className="space-y-3 sm:space-y-4">
                    <FieldBlock htmlFor="pub-support-q1" label="Describe your disability or special learning need">
                        <textarea
                            id="pub-support-q1"
                            name="pub-support-q1"
                            {...getTextInputLimitProps('notes')}
                            rows={2}
                            value={form.q1}
                            onChange={(event) => setForm((prev) => ({ ...prev, q1: event.target.value }))}
                            className={textareaClassName}
                            placeholder="Briefly describe the need or condition..."
                        />
                    </FieldBlock>
                    <FieldBlock htmlFor="pub-support-q2" label="Previous school support">
                        <textarea
                            id="pub-support-q2"
                            name="pub-support-q2"
                            {...getTextInputLimitProps('notes')}
                            rows={2}
                            value={form.q2}
                            onChange={(event) => setForm((prev) => ({ ...prev, q2: event.target.value }))}
                            className={textareaClassName}
                            placeholder="Describe any support you received before..."
                        />
                    </FieldBlock>
                    <FieldBlock htmlFor="pub-support-q3" label="Support needed from NORSU-Guihulngan Campus">
                        <textarea
                            id="pub-support-q3"
                            name="pub-support-q3"
                            {...getTextInputLimitProps('notes')}
                            rows={2}
                            value={form.q3}
                            onChange={(event) => setForm((prev) => ({ ...prev, q3: event.target.value }))}
                            className={textareaClassName}
                            placeholder="Describe what assistance would help you participate..."
                        />
                    </FieldBlock>
                    <FieldBlock htmlFor="pub-support-q4" label="Other special needs or assistance">
                        <textarea
                            id="pub-support-q4"
                            name="pub-support-q4"
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

            {/* Supporting Documents */}
            <SectionCard title="Supporting Documents" description="Upload up to 4 images or PDFs. Each file must be under 1 MB.">
                <label htmlFor="pub-support-documents" className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-3 text-center transition sm:rounded-2xl sm:p-5 ${form.files.length >= 4 ? 'border-slate-200 bg-slate-100 text-slate-400' : 'border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100'}`}>
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm sm:h-10 sm:w-10">
                        <UploadIcon />
                    </span>
                    <span className="mt-2 text-xs font-black sm:mt-3 sm:text-sm">{form.files.length >= 4 ? 'Document limit reached' : 'Choose support documents'}</span>
                    <span className="mt-0.5 text-[11px] font-semibold sm:mt-1 sm:text-xs">{form.files.length}/4 files selected</span>
                    <input
                        id="pub-support-documents"
                        name="pub-support-documents"
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
                            <div key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50 px-2.5 py-2 sm:gap-3 sm:px-3">
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-bold text-teal-900 sm:text-sm">{file.name}</p>
                                    <p className="text-[10px] font-semibold text-teal-600">{(file.size / 1024).toFixed(0)} KB</p>
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

            <div className="rounded-2xl border border-teal-100 bg-teal-50/80 p-4">
                <p className="text-xs font-semibold leading-5 text-teal-900">
                    Support information is reviewed by authorized personnel and routed only to staff who can help evaluate or provide assistance.
                </p>
            </div>

            {/* Submit Button */}
            <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 text-xs font-black text-white shadow-sm transition hover:bg-teal-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                {!isSubmitting && <SubmitIcon />}
            </button>
        </div>
    );
}
