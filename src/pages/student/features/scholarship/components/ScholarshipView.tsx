import React from 'react';
import { createPortal } from 'react-dom';
import type { StudentRemainingFlatViewProps } from '../../../types';

const formatScholarshipDate = (value: string) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';

    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const isScholarshipExpired = (deadline: string) => {
    if (!deadline) return false;
    const date = new Date(deadline);
    return !Number.isNaN(date.getTime()) && date < new Date();
};

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
    </svg>
);

const ArrowIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
    </svg>
);

export default function ScholarshipView({
    scholarshipsList,
    myApplications,
    selectedScholarship,
    setSelectedScholarship,
    showScholarshipModal,
    setShowScholarshipModal,
    handleApplyScholarship,
    isApplyingScholarshipId,
    Icons
}: StudentRemainingFlatViewProps) {
    const openScholarships = scholarshipsList.filter((scholarship: any) => !isScholarshipExpired(scholarship.deadline)).length;
    const appliedScholarships = scholarshipsList.filter((scholarship: any) =>
        myApplications.some((app: any) => app.scholarship_id === scholarship.id)
    ).length;

    const closeModal = () => setShowScholarshipModal(false);

    const renderApplicationAction = () => {
        if (!selectedScholarship) return null;

        const method = selectedScholarship.application_method || 'portal';
        const isExpired = isScholarshipExpired(selectedScholarship.deadline);
        const isApplied = myApplications.some((app: any) => app.scholarship_id === selectedScholarship.id);
        const isBusy = isApplyingScholarshipId === String(selectedScholarship.id);

        if (method === 'external_link') {
            const hasUrl = !!String(selectedScholarship.application_url || '').trim();
            return (
                <button
                    type="button"
                    onClick={() => {
                        if (hasUrl) {
                            window.open(selectedScholarship.application_url, '_blank', 'noopener,noreferrer');
                        }
                    }}
                    disabled={!hasUrl}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press"
                >
                    {hasUrl ? 'Apply on Official Website' : 'Application link unavailable'}
                    {hasUrl && <ArrowIcon />}
                </button>
            );
        }

        if (method === 'express_interest') {
            if (isApplied) {
                return (
                    <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                        <Icons.CheckCircle /> Interest Registered
                    </button>
                );
            }

            return (
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => { handleApplyScholarship(selectedScholarship); }}
                        disabled={isExpired || isBusy}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press"
                    >
                        {isExpired ? 'Deadline Passed' : (isBusy ? 'Registering...' : 'Express Interest')}
                    </button>
                    <p className="text-center text-[10px] font-semibold leading-4 text-slate-400">
                        This registers interest for reservation. Additional requirements may be requested by CARE staff.
                    </p>
                </div>
            );
        }

        if (isApplied) {
            return (
                <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                    <Icons.CheckCircle /> Application Submitted
                </button>
            );
        }

        return (
            <button
                type="button"
                onClick={() => { handleApplyScholarship(selectedScholarship); }}
                disabled={isExpired || isBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press"
            >
                {isExpired ? 'Deadline Passed' : (isBusy ? 'Applying...' : 'Apply Now')}
            </button>
        );
    };

    return (
        <div className="student-scholarship-root mx-auto max-w-6xl space-y-3 page-transition sm:space-y-5">
            <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500 sm:text-[10px] sm:tracking-[0.16em]">Student Services</p>
                        <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-2xl">Scholarship Services</h2>
                        <p className="mt-1 max-w-xl text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">View available scholarships and check your eligibility.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-60 sm:shrink-0">
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-blue-600 sm:text-[9px] sm:tracking-[0.12em]">Open</p>
                            <p className="mt-1 text-lg font-black leading-none text-blue-950 sm:text-xl">{openScholarships}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-emerald-600 sm:text-[9px] sm:tracking-[0.12em]">Applied</p>
                            <p className="mt-1 text-lg font-black leading-none text-emerald-950 sm:text-xl">{appliedScholarships}</p>
                        </div>
                    </div>
                </div>
            </section>

            {scholarshipsList.length === 0 ? (
                <section className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-8">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                        <Icons.Scholarship />
                    </div>
                    <h3 className="mt-3 text-sm font-black text-slate-950 sm:mt-4 sm:text-base">No scholarships available</h3>
                    <p className="mx-auto mt-2 max-w-xs text-[12px] leading-5 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-6">Scholarship opportunities from the care staff will appear here when they are ready for you.</p>
                </section>
            ) : (
                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">Scholarship Board</p>
                            <h3 className="mt-1 text-sm font-black text-slate-950 sm:text-base">Available scholarships</h3>
                        </div>
                        <p className="text-xs font-bold text-slate-500">{scholarshipsList.length} scholarship{scholarshipsList.length !== 1 ? 's' : ''}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                        {scholarshipsList.map((scholarship: any, idx: number) => {
                            const isApplied = myApplications.some((app: any) => app.scholarship_id === scholarship.id);
                            const isExpired = isScholarshipExpired(scholarship.deadline);

                            return (
                                <button
                                    key={scholarship.id}
                                    type="button"
                                    onClick={() => { setSelectedScholarship(scholarship); setShowScholarshipModal(true); }}
                                    className="group flex min-h-[112px] flex-col rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-all animate-fade-in-up hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:min-h-[148px] sm:rounded-2xl sm:p-4"
                                    style={{ animationDelay: `${idx * 70}ms` }}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${isApplied ? 'border-emerald-100 bg-emerald-50 text-emerald-600' : 'border-blue-100 bg-blue-50 text-blue-600'}`}>
                                            {isApplied ? <Icons.CheckCircle /> : <Icons.Scholarship />}
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${isExpired ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-emerald-100 bg-emerald-50 text-emerald-700'}`}>
                                            {isExpired ? 'Closed' : 'Open'}
                                        </span>
                                    </div>

                                    <div className="mt-2 min-w-0 flex-1 sm:mt-3">
                                        <h4 className="line-clamp-2 text-[13px] font-black leading-5 text-slate-950 transition-colors group-hover:text-blue-700 sm:text-sm" title={scholarship.title}>
                                            {scholarship.title || 'Untitled scholarship'}
                                        </h4>
                                        {scholarship.description && (
                                            <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:line-clamp-2">{scholarship.description}</p>
                                        )}
                                    </div>

                                    <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 sm:mt-3 sm:pt-2.5">
                                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Due {formatScholarshipDate(scholarship.deadline)}</p>
                                        {isApplied && (
                                            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-black uppercase text-blue-600">
                                                Applied
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {showScholarshipModal && selectedScholarship && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4" onClick={closeModal}>
                    <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Scholarship Details</p>
                                    <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight text-white sm:text-lg">{selectedScholarship.title}</h3>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${isScholarshipExpired(selectedScholarship.deadline) ? 'border-white/10 bg-white/10 text-slate-300' : 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100'}`}>
                                            {isScholarshipExpired(selectedScholarship.deadline) ? 'Closed' : 'Open'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close scholarship details"
                                    onClick={closeModal}
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 student-mobile-modal-scroll-panel sm:p-5">
                            <div className="space-y-3">
                                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Description</h4>
                                    <p className="mt-2 text-[12px] leading-5 text-slate-700 sm:text-sm sm:leading-6">{selectedScholarship.description || 'No description provided.'}</p>
                                </section>

                                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Requirements</h4>
                                    <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-slate-700 sm:text-sm sm:leading-6">
                                        {selectedScholarship.requirements || 'No specific requirements listed.'}
                                    </p>
                                </section>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">Deadline</p>
                                        <p className="mt-1 text-xs font-black text-blue-950 sm:text-sm">{formatScholarshipDate(selectedScholarship.deadline)}</p>
                                    </div>
                                    <div className={`rounded-xl border px-3 py-2 ${isScholarshipExpired(selectedScholarship.deadline) ? 'border-slate-200 bg-slate-50' : 'border-emerald-100 bg-emerald-50'}`}>
                                        <p className={`text-[9px] font-black uppercase tracking-[0.12em] ${isScholarshipExpired(selectedScholarship.deadline) ? 'text-slate-500' : 'text-emerald-600'}`}>Status</p>
                                        <p className={`mt-1 text-xs font-black sm:text-sm ${isScholarshipExpired(selectedScholarship.deadline) ? 'text-slate-700' : 'text-emerald-950'}`}>
                                            {isScholarshipExpired(selectedScholarship.deadline) ? 'Closed' : 'Accepting'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="shrink-0 border-t border-slate-100 bg-white p-4 sm:px-5">
                            {renderApplicationAction()}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
