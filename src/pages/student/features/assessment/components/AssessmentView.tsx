import React, { lazy, Suspense, useState, useCallback } from 'react';
import { useStudentFormsData } from '../hooks/useStudentFormsData';
import type { StudentRemainingFlatViewProps } from '../../../types';

const AssessmentFormModal = lazy(() => import('./AssessmentFormModal'));

const formatAssessmentDate = (value: string) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

export default function AssessmentView({
    personalInfo,
    showToast,
    Icons
}: StudentRemainingFlatViewProps) {
    const [activeForm, setActiveForm] = useState<any>(null);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const { formsList, completedForms, loadingForm, refreshForms } = useStudentFormsData({
        studentId: personalInfo.studentId
    });

    const openAssessmentForm = (form: any) => {
        setActiveForm(form);
        setShowAssessmentModal(true);
    };

    const onAssessmentSubmitted = useCallback(async () => {
        setShowAssessmentModal(false);
        setActiveForm(null);
        await refreshForms();
        setShowSuccessModal(true);
    }, [refreshForms]);

    const completedCount = formsList.filter((form: any) => completedForms.has(form.id)).length;
    const pendingCount = Math.max(formsList.length - completedCount, 0);

    return (
        <div className="student-assessment-root mx-auto max-w-6xl space-y-3 page-transition sm:space-y-5">
            <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500 sm:text-[10px] sm:tracking-[0.16em]">Student Services</p>
                        <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-2xl">Needs Assessment Tool</h2>
                        <p className="mt-1 max-w-xl text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">Complete the inventory to help us understand your needs and provide better support.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-60 sm:shrink-0">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-600 sm:text-[9px] sm:tracking-[0.12em]">To Answer</p>
                            <p className="mt-1 text-lg font-black leading-none text-blue-950 sm:text-xl">{pendingCount}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-600 sm:text-[9px] sm:tracking-[0.12em]">Done</p>
                            <p className="mt-1 text-lg font-black leading-none text-emerald-950 sm:text-xl">{completedCount}</p>
                        </div>
                    </div>
                </div>
            </section>

            {loadingForm ? (
                <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm sm:rounded-2xl sm:p-8">
                    <div className="flex min-h-[170px] flex-col items-center justify-center text-center sm:min-h-[220px]">
                        <div className="h-8 w-8 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin sm:h-10 sm:w-10" />
                        <p className="mt-3 text-xs font-bold text-slate-700 sm:mt-4 sm:text-sm">Loading assessment forms</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500 sm:text-xs">Please wait while we check the latest forms from the care staff.</p>
                    </div>
                </section>
            ) : formsList.length === 0 ? (
                <section className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-8">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <Icons.Assessment />
                    </div>
                    <h3 className="mt-3 text-sm font-black text-slate-950 sm:mt-4 sm:text-base">No assessment forms available</h3>
                    <p className="mx-auto mt-2 max-w-xs text-[12px] leading-5 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-6">New inventories from the care staff will appear here when they are ready for you.</p>
                </section>
            ) : (
                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">Assessment Inventory</p>
                            <h3 className="mt-1 text-sm font-black text-slate-950 sm:text-base">Available forms</h3>
                        </div>
                        <p className="text-xs font-bold text-slate-500">{formsList.length} form{formsList.length !== 1 ? 's' : ''} available</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {formsList.map((form: any, idx: number) => {
                            const isDone = completedForms.has(form.id);
                            return (
                                <button
                                    key={form.id}
                                    type="button"
                                    onClick={() => openAssessmentForm(form)}
                                    disabled={isDone}
                                    className={`group flex min-h-[148px] flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-all animate-fade-in-up focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:min-h-[168px] sm:rounded-2xl sm:p-4 ${isDone ? 'cursor-not-allowed border-slate-200 bg-slate-50/80 opacity-75' : 'border-slate-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md'}`}
                                    style={{ animationDelay: `${idx * 70}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-10 sm:w-10 ${isDone ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}>
                                            {isDone ? <Icons.CheckCircle /> : <Icons.Assessment />}
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${isDone ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                                            {isDone ? 'Completed' : 'Open'}
                                        </span>
                                    </div>

                                    <div className="mt-4 min-w-0 flex-1">
                                        <h4 className={`line-clamp-2 text-[13px] font-black leading-5 transition-colors sm:text-sm ${isDone ? 'text-slate-500' : 'text-slate-950 group-hover:text-blue-700'}`}>
                                            {form.title || 'Untitled assessment'}
                                        </h4>
                                        {form.description && (
                                            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{form.description}</p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatAssessmentDate(form.created_at)}</p>
                                        <span className={`inline-flex items-center gap-1 text-xs font-black ${isDone ? 'text-slate-400' : 'text-blue-600'}`}>
                                            {isDone ? 'Submitted' : 'Open form'}
                                            {!isDone && <Icons.ArrowRight className="h-3.5 w-3.5" />}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {showAssessmentModal && activeForm && (
                <Suspense fallback={null}>
                    <AssessmentFormModal
                        form={activeForm}
                        isOpen={showAssessmentModal}
                        studentId={personalInfo.studentId}
                        onClose={() => setShowAssessmentModal(false)}
                        onSubmitted={onAssessmentSubmitted}
                        showToast={showToast}
                    />
                </Suspense>
            )}

            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 student-mobile-modal-overlay">
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-2xl animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel sm:p-8">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 sm:h-16 sm:w-16">
                            <svg className="h-7 w-7 sm:h-8 sm:w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-base font-black text-slate-950 sm:text-lg">Assessment submitted</h3>
                        <p className="mt-2 text-[13px] leading-5 text-slate-500 sm:text-sm sm:leading-6">Thank you for completing the assessment. Your responses have been recorded and will be used to provide better support.</p>
                        <button type="button" onClick={() => setShowSuccessModal(false)} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press">Done</button>
                    </div>
                </div>
            )}
        </div>
    );
}
