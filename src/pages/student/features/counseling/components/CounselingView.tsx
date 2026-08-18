import React, { lazy, Suspense, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStudentCounselingData } from '../hooks/useStudentCounselingData';
import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCounselingAwaitingDept
} from '../../../../../utils/workflow';
import { getEvaluatedCounselingRequestIds } from '../studentCounselingEvaluationService';
import CounselingEvaluationModal from './CounselingEvaluationModal';

const CounselingFormModal = lazy(() => import('./CounselingFormModal'));

const getCounselingStatusTone = (status: string) => {
    if (isCounselingAwaitingDept(status)) return 'border-slate-200 bg-slate-50 text-slate-600';
    if (status === COUNSELING_STATUS.REJECTED) return 'border-rose-100 bg-rose-50 text-rose-700';
    if (status === COUNSELING_STATUS.REFERRED) return 'border-violet-100 bg-violet-50 text-violet-700';
    if (status === COUNSELING_STATUS.STAFF_SCHEDULED) return 'border-indigo-100 bg-indigo-50 text-indigo-700';
    if (status === COUNSELING_STATUS.SCHEDULED) return 'border-blue-100 bg-blue-50 text-blue-700';
    if (status === COUNSELING_STATUS.COMPLETED) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
};

const getCounselingStatusLabel = (status: string, forwardedLabel = 'Forwarded') => {
    if (isCounselingAwaitingDept(status)) return 'Pending Review';
    if (status === COUNSELING_STATUS.STAFF_SCHEDULED) return 'With CARE Staff';
    if (status === COUNSELING_STATUS.REFERRED) return forwardedLabel;
    return status;
};

const getRequestPreview = (request: any) =>
    request.reason_for_referral || request.description || request.personal_actions_taken || 'No summary provided.';

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

const CheckIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const GuideIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
);

/** Care Path Guide Modal explaining the counseling process. */
const CarePathGuideModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 student-mobile-modal-overlay" onClick={onClose}>
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Care Path</p>
                    <h3 className="mt-0.5 text-lg font-black text-slate-950">How Counseling Works</h3>
                </div>
                <button
                    type="button"
                    aria-label="Close guide"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 active:scale-95"
                >
                    <CloseIcon />
                </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-6 text-left">
                {[
                    { step: '1', title: 'Submit Request', desc: 'Fill out the confidential self-referral form specifying your concern and preferences.' },
                    { step: '2', title: 'Counselor Review', desc: 'CARE guidance staff reviews your request with strict confidentiality and assigns a counselor.' },
                    { step: '3', title: 'Schedule & Attend', desc: 'You receive your confirmed session schedule and attend your appointment with the counselor.' },
                    { step: '4', title: 'Evaluate & Reflect', desc: 'Complete the evaluation form to share your feedback and help us improve student guidance.' },
                ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white">{item.step}</span>
                        <div className="min-w-0">
                            <p className="text-sm font-black text-slate-950">{item.title}</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-4 px-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
                >
                    Got it
                </button>
            </div>
        </div>
    </div>
);

/** Slide-in drawer listing every counseling request the student has made. */
const RequestsDrawer = ({ requests, evaluatedIds, formatFullDate, onSelect, onEvaluate, onClose }: any) => (
    <div className="fixed inset-0 z-50 flex justify-end bg-transparent student-mobile-modal-overlay" onClick={onClose}>
        <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl student-mobile-modal-drawer-panel" onClick={(event) => event.stopPropagation()}>
            <div className="shrink-0 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Counseling</p>
                        <h3 className="mt-1 text-lg font-black">Your Requests</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{requests.length} total request{requests.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close requests"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                    >
                        <CloseIcon />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                {requests.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="text-sm font-black text-slate-800">No requests found</p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">Once you submit a request, updates from CARE staff will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {requests.map((req: any) => {
                            const isCompleted = req.status === COUNSELING_STATUS.COMPLETED;
                            const isEvaluated = evaluatedIds.has(req.id);
                            return (
                                <div
                                    key={req.id}
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                                >
                                    <button
                                        type="button"
                                        onClick={() => onSelect(req)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-slate-950">{req.request_type || 'Self-Referral'}</p>
                                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{getRequestPreview(req)}</p>
                                                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatFullDate(new Date(req.created_at))}</p>
                                            </div>
                                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getCounselingStatusTone(req.status)}`}>
                                                {getCounselingStatusLabel(req.status)}
                                            </span>
                                        </div>
                                    </button>

                                    {isCompleted && (
                                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                                            {isEvaluated ? (
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                    <CheckIcon /> Session Evaluated
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => onEvaluate(req)}
                                                    className="inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-500 transition"
                                                >
                                                    Evaluate Session
                                                    <ArrowIcon />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
);

/** Full modal showing details for a single selected request. */
const RequestDetailsModal = ({ request, isEvaluated, formatFullDate, Icons, onClose, onEvaluate, onOpenCsm }: any) => {
    const isCompleted = request.status === COUNSELING_STATUS.COMPLETED;
    const scheduledDate = getCounselingScheduledDate(request);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 student-mobile-modal-overlay" onClick={onClose}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel" onClick={(event) => event.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Counseling Request</p>
                        <h3 className="mt-0.5 text-lg font-black text-slate-950">{request.request_type || 'Self-Referral'}</h3>
                    </div>
                    <button
                        type="button"
                        aria-label="Close details"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                    >
                        <CloseIcon />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-6 student-mobile-modal-scroll-panel text-left">
                    <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <span className="text-xs font-bold text-slate-500">Current Status</span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${getCounselingStatusTone(request.status)}`}>
                            {getCounselingStatusLabel(request.status)}
                        </span>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-100 p-4 text-xs">
                        <div>
                            <p className="font-bold text-slate-400">Date Submitted</p>
                            <p className="mt-0.5 font-bold text-slate-800">{formatFullDate(new Date(request.created_at))}</p>
                        </div>
                        {scheduledDate && (
                            <div>
                                <p className="font-bold text-slate-400">Scheduled Date</p>
                                <p className="mt-0.5 font-bold text-indigo-700">{formatFullDate(new Date(scheduledDate))}</p>
                            </div>
                        )}
                        {request.counselor_name && (
                            <div>
                                <p className="font-bold text-slate-400">Assigned Counselor</p>
                                <p className="mt-0.5 font-bold text-slate-800">{request.counselor_name}</p>
                            </div>
                        )}
                        {request.reason_for_referral && (
                            <div>
                                <p className="font-bold text-slate-400">Reason</p>
                                <p className="mt-0.5 text-slate-700 leading-relaxed">{request.reason_for_referral}</p>
                            </div>
                        )}
                        {request.description && (
                            <div>
                                <p className="font-bold text-slate-400">Description</p>
                                <p className="mt-0.5 text-slate-700 leading-relaxed">{request.description}</p>
                            </div>
                        )}
                    </div>

                    {isCompleted && (
                        <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                            <p className="text-xs font-black text-purple-900">How was your session?</p>
                            <p className="mt-0.5 text-xs text-purple-700/80">Your feedback helps improve our guidance services.</p>
                            <div className="mt-3">
                                {isEvaluated ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                        <CheckIcon /> Session Evaluated
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={onEvaluate}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-purple-500"
                                    >
                                        Evaluate Session
                                        <ArrowIcon />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {onOpenCsm && (
                        <button
                            type="button"
                            onClick={onOpenCsm}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                            Give General Feedback on this Service
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export interface CounselingViewProps {
    personalInfo: any;
    formatFullDate: (date: any) => string;
    showToast: (message: string, type?: string) => void;
    setFeedbackPrefill?: (prefill: any) => void;
    setActiveView?: (view: string) => void;
    counselingRequests?: any[];
    refreshCounselingRequests?: () => Promise<void>;
    Icons: any;
    [key: string]: any;
}

export default function CounselingView({
    personalInfo,
    formatFullDate,
    showToast,
    setFeedbackPrefill,
    setActiveView,
    counselingRequests: rawCounselingRequests,
    refreshCounselingRequests: rawRefreshCounselingRequests,
    Icons,
}: CounselingViewProps) {
    const defaultCounseling = useStudentCounselingData({
        studentId: personalInfo?.studentId || '',
    });

    const counselingRequests = rawCounselingRequests ?? defaultCounseling.counselingRequests;
    const refreshCounselingRequests = rawRefreshCounselingRequests ?? defaultCounseling.refreshCounselingRequests;

    const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [showCounselingRequestsModal, setShowCounselingRequestsModal] = useState(false);
    const [showCarePathModal, setShowCarePathModal] = useState(false);

    // Evaluation modal states
    const [evaluatingRequest, setEvaluatingRequest] = useState<any | null>(null);
    const [showOpenEvaluation, setShowOpenEvaluation] = useState(false);
    const [evaluatedRequestIds, setEvaluatedRequestIds] = useState<Set<number>>(new Set());

    const loadEvaluatedIds = useCallback(async () => {
        if (!personalInfo?.studentId) return;
        try {
            const ids = await getEvaluatedCounselingRequestIds(personalInfo.studentId);
            setEvaluatedRequestIds(ids);
        } catch {
            // Silently fall back
        }
    }, [personalInfo?.studentId]);

    useEffect(() => {
        void loadEvaluatedIds();
    }, [loadEvaluatedIds]);

    const openRequestModal = (req: any) => {
        setSelectedRequest(req);
    };

    const openCounselingForm = () => setShowCounselingForm(true);

    const onCounselingSubmitted = useCallback(async () => {
        setShowCounselingForm(false);
        await refreshCounselingRequests();
    }, [refreshCounselingRequests]);

    const handleEvaluationSubmitted = useCallback(async (requestId: number | null) => {
        if (requestId !== null) {
            setEvaluatedRequestIds(prev => new Set([...prev, requestId]));
        }
        setEvaluatingRequest(null);
        setShowOpenEvaluation(false);
        await refreshCounselingRequests();
    }, [refreshCounselingRequests]);

    const activeRequests = counselingRequests.filter((request: any) => CARE_STAFF_ACTIVE_COUNSELING_STATUSES.includes(request.status));
    const completedRequests = counselingRequests.filter((request: any) => request.status === COUNSELING_STATUS.COMPLETED);
    const latestRequest = counselingRequests[0];

    return (
        <div className="student-counseling-root mx-auto max-w-6xl space-y-4 page-transition sm:space-y-5">
            {/* Header Banner */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Student Services</p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">Counseling Services</h2>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Request private counseling support and follow your submitted requests in one place.</p>
                    </div>
                    <div className="flex items-center gap-2 sm:shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowCarePathModal(true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                        >
                            <GuideIcon />
                            Guide
                        </button>
                        <button
                            type="button"
                            onClick={openCounselingForm}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-95"
                        >
                            Request
                            <ArrowIcon />
                        </button>
                    </div>
                </div>
            </section>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Total', value: counselingRequests.length, icon: <Icons.Counseling />, tone: 'border-blue-100 bg-blue-50 text-blue-600' },
                    { label: 'Active', value: activeRequests.length, icon: <Icons.Clock />, tone: 'border-amber-100 bg-amber-50 text-amber-600' },
                    { label: 'Closed', value: completedRequests.length, icon: <Icons.CheckCircle />, tone: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
                ].map((item) => (
                    <div key={item.label} className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${item.tone}`}>{item.icon}</div>
                        </div>
                        <p className="mt-2 text-xl font-black leading-none text-slate-950">{item.value}</p>
                    </div>
                ))}
            </div>

            {/* Latest Request Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Request Flow</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">Latest request</h3>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowCounselingRequestsModal(true)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                        View all
                    </button>
                </div>
                {latestRequest ? (
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/50">
                        <button
                            type="button"
                            onClick={() => openRequestModal(latestRequest)}
                            className="w-full text-left"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{latestRequest.request_type || 'Self-Referral'}</p>
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{getRequestPreview(latestRequest)}</p>
                                    <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatFullDate(new Date(latestRequest.created_at))}</p>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getCounselingStatusTone(latestRequest.status)}`}>
                                    {getCounselingStatusLabel(latestRequest.status)}
                                </span>
                            </div>
                        </button>
                        {latestRequest.status === COUNSELING_STATUS.COMPLETED && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                                {evaluatedRequestIds.has(latestRequest.id) ? (
                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                        <CheckIcon /> Session Evaluated
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setEvaluatingRequest(latestRequest)}
                                        className="inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-purple-500 transition"
                                    >
                                        Evaluate Session
                                        <ArrowIcon />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
                        <p className="text-sm font-bold text-slate-700">No counseling requests yet.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Your submitted requests will appear here after you send the form.</p>
                    </div>
                )}
            </section>

            {/* Track 2: Dedicated In-Person / Walk-In Consultation Evaluation Card */}
            <section className="flex flex-col gap-3 rounded-2xl border border-purple-200/80 bg-purple-50/50 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-600">In-Person Consultation</p>
                    <h3 className="mt-0.5 text-base font-black text-slate-950">Attended a Walk-In Counseling Session?</h3>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-slate-600">If your counseling was conducted face-to-face without an online booking, submit your evaluation here.</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowOpenEvaluation(true)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-purple-500"
                >
                    Evaluate Session
                    <ArrowIcon />
                </button>
            </section>

            {/* Modals */}
            {showCarePathModal && createPortal(
                <CarePathGuideModal onClose={() => setShowCarePathModal(false)} />,
                document.body
            )}

            {showCounselingForm && (
                <Suspense fallback={null}>
                    <CounselingFormModal
                        isOpen={showCounselingForm}
                        onClose={() => setShowCounselingForm(false)}
                        personalInfo={personalInfo}
                        showToast={showToast}
                        onSubmitted={onCounselingSubmitted}
                    />
                </Suspense>
            )}

            {showCounselingRequestsModal && createPortal(
                <RequestsDrawer
                    requests={counselingRequests}
                    evaluatedIds={evaluatedRequestIds}
                    formatFullDate={formatFullDate}
                    onSelect={(req: any) => { setShowCounselingRequestsModal(false); openRequestModal(req); }}
                    onEvaluate={(req: any) => { setShowCounselingRequestsModal(false); setEvaluatingRequest(req); }}
                    onClose={() => setShowCounselingRequestsModal(false)}
                />,
                document.body
            )}

            {selectedRequest && createPortal(
                <RequestDetailsModal
                    request={selectedRequest}
                    isEvaluated={evaluatedRequestIds.has(selectedRequest.id)}
                    formatFullDate={formatFullDate}
                    Icons={Icons}
                    onClose={() => setSelectedRequest(null)}
                    onEvaluate={() => {
                        const target = selectedRequest;
                        setSelectedRequest(null);
                        setEvaluatingRequest(target);
                    }}
                    onOpenCsm={() => {
                        setFeedbackPrefill?.({
                            source: 'counseling',
                            counselingRequestId: selectedRequest.id,
                            service_availed: selectedRequest.request_type ? `Counseling - ${selectedRequest.request_type}` : 'Counseling Services',
                        });
                        setSelectedRequest(null);
                        setActiveView?.('feedback');
                    }}
                />,
                document.body
            )}

            {evaluatingRequest && (
                <CounselingEvaluationModal
                    open={Boolean(evaluatingRequest)}
                    requestId={evaluatingRequest.id}
                    personalInfo={personalInfo}
                    onClose={() => setEvaluatingRequest(null)}
                    onSubmitted={handleEvaluationSubmitted}
                    showToast={showToast}
                />
            )}

            {showOpenEvaluation && (
                <CounselingEvaluationModal
                    open={showOpenEvaluation}
                    requestId={null}
                    personalInfo={personalInfo}
                    onClose={() => setShowOpenEvaluation(false)}
                    onSubmitted={handleEvaluationSubmitted}
                    showToast={showToast}
                />
            )}
        </div>
    );
}
