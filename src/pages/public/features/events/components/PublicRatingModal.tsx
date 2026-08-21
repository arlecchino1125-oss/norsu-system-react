import React from 'react';
import { createPortal } from 'react-dom';
import { getTextInputLimitProps } from '../../../../../utils/inputSecurity';

// Same seven criteria the student portal writes to event_feedback, so both
// surfaces produce rows the staff reports can read side by side.
const CRITERIA = [
    { key: 'q1', label: 'Relevance of the activity to the needs/problems of the clientele' },
    { key: 'q2', label: 'Quality of the activity' },
    { key: 'q3', label: 'Timeliness' },
    { key: 'q4', label: 'Management of the activity' },
    { key: 'q5', label: 'Overall organization of the activity' },
    { key: 'q6', label: 'Overall assessment of the activity' },
    { key: 'q7', label: 'Skills/competence of the facilitator/s' }
] as const;

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

interface PublicRatingModalProps {
    ratingForm: any;
    setRatingForm: (form: any) => void;
    submitRating: () => void;
    isSubmitting: boolean;
    onClose: () => void;
}

export default function PublicRatingModal({
    ratingForm,
    setRatingForm,
    submitRating,
    isSubmitting,
    onClose
}: PublicRatingModalProps) {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-0 sm:items-center sm:p-4" onClick={onClose}>
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
            <div
                className="relative flex h-[94vh] sm:h-auto sm:max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl border-0 sm:border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(clickEvent) => clickEvent.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-3.5 text-white sm:px-5 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <span className="inline-flex rounded bg-blue-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-blue-300">
                                Event Rating
                            </span>
                            <h3 className="mt-1 line-clamp-1 text-base font-black leading-snug text-white sm:text-lg">
                                {ratingForm.title || 'Participant Evaluation'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            aria-label="Close evaluation form"
                            onClick={onClose}
                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-3.5 sm:p-5">
                    <div className="space-y-3">
                        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="min-w-0">
                                    <p className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Activity Date</p>
                                    <p className="text-[12px] font-black leading-5 text-slate-900 sm:text-sm">
                                        {ratingForm.date_of_activity
                                            ? new Date(ratingForm.date_of_activity).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Evaluation Criteria</h4>
                            <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                Rate each item from <span className="font-black text-slate-700">1</span> poor to <span className="font-black text-slate-700">5</span> excellent.
                            </p>
                            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                                <div className="grid grid-cols-[1fr_repeat(5,2rem)] border-b border-slate-200 bg-slate-50 sm:grid-cols-[1fr_repeat(5,2.75rem)]">
                                    <div className="px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Criteria</div>
                                    {['1', '2', '3', '4', '5'].map((value) => (
                                        <div key={value} className="flex items-center justify-center text-[10px] font-black text-slate-500">{value}</div>
                                    ))}
                                </div>
                                {CRITERIA.map((item, index) => (
                                    <div key={item.key} className={`grid grid-cols-[1fr_repeat(5,2rem)] border-b border-slate-100 transition-colors last:border-0 sm:grid-cols-[1fr_repeat(5,2.75rem)] ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                                        <div className="flex items-center px-3 py-2.5 text-[11px] leading-4 text-slate-700 sm:text-xs">
                                            <span className="mr-2 font-black text-slate-500">{index + 1}.</span>
                                            {item.label}
                                        </div>
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <div key={value} className="flex items-center justify-center">
                                                <button
                                                    type="button"
                                                    aria-label={`${item.label}: ${value} out of 5`}
                                                    onClick={() => setRatingForm({ ...ratingForm, [item.key]: value })}
                                                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${ratingForm[item.key] === value
                                                        ? 'border-blue-600 bg-blue-600 shadow-sm'
                                                        : 'border-slate-300 hover:border-blue-400'
                                                        }`}
                                                >
                                                    {ratingForm[item.key] === value && <div className="h-2 w-2 rounded-full bg-white" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="public-feedback-best" className="mb-1.5 block text-[12px] font-black text-slate-700">What I like best about the activity:</label>
                                    <textarea
                                        id="public-feedback-best"
                                        {...getTextInputLimitProps('notes')}
                                        rows={3}
                                        value={ratingForm.open_best}
                                        onChange={(changeEvent) => setRatingForm({ ...ratingForm, open_best: changeEvent.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                        placeholder="Share what you enjoyed most..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="public-feedback-suggestions" className="mb-1.5 block text-[12px] font-black text-slate-700">My suggestions to further improve the activity:</label>
                                    <textarea
                                        id="public-feedback-suggestions"
                                        {...getTextInputLimitProps('notes')}
                                        rows={3}
                                        value={ratingForm.open_suggestions}
                                        onChange={(changeEvent) => setRatingForm({ ...ratingForm, open_suggestions: changeEvent.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                        placeholder="What could be improved..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="public-feedback-comments" className="mb-1.5 block text-[12px] font-black text-slate-700">Other comments:</label>
                                    <textarea
                                        id="public-feedback-comments"
                                        {...getTextInputLimitProps('notes')}
                                        rows={3}
                                        value={ratingForm.open_comments}
                                        onChange={(changeEvent) => setRatingForm({ ...ratingForm, open_comments: changeEvent.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                        placeholder="Any other feedback..."
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:px-5">
                    <button
                        type="button"
                        onClick={submitRating}
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 sm:w-auto"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
