import { lazy, Suspense, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStudentCounselingData } from '../hooks/useStudentCounselingData';
import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCounselingAwaitingDept
} from '../../../../../utils/workflow';
import type { StudentRemainingFlatViewProps } from '../../../types';

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

/** Slide-in drawer listing every counseling request the student has made. */
const RequestsDrawer = ({ requests, formatFullDate, onSelect, onClose }: any) => (
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
                        {requests.map((req: any) => (
                            <button
                                key={req.id}
                                type="button"
                                onClick={() => onSelect(req)}
                                className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-black text-slate-950">{req.request_type || 'Self-Referral'}</p>
                                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{getRequestPreview(req)}</p>
                                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatFullDate(new Date(req.created_at))}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getCounselingStatusTone(req.status)}`}>{getCounselingStatusLabel(req.status)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
);

/** Read-only detail sheet for one request, with the CSM feedback prompt for completed sessions. */
const RequestDetailsModal = ({ request, formatFullDate, Icons, onClose, onOpenCsm }: any) => (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel">
            <div className="shrink-0 border-b border-slate-100 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Counseling Request</p>
                        <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">Self-referral details</h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Submitted {formatFullDate(new Date(request.created_at))}</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close request details"
                        onClick={onClose}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                        <CloseIcon />
                    </button>
                </div>
                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getCounselingStatusTone(request.status)}`}>
                    {getCounselingStatusLabel(request.status, 'Forwarded to CARE Staff')}
                </span>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 student-mobile-modal-scroll-panel sm:p-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                        { label: 'Student', value: request.student_name || 'Not set' },
                        { label: 'Course & Year', value: request.course_year || 'Not set' },
                        { label: 'Contact', value: request.contact_number || 'Not set' },
                    ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                            <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{item.value}</p>
                        </div>
                    ))}
                </div>

                {[
                    { label: 'Reason/s for requesting counseling', value: request.reason_for_referral || request.description || '' },
                    { label: 'Personal actions taken', value: request.personal_actions_taken || '' },
                    { label: 'Date / duration of concern', value: request.date_duration_of_concern || '' },
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.value || 'Not provided.'}</p>
                    </div>
                ))}

                <div className="space-y-3">
                    {request.referred_by && (
                        <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">Forwarded to CARE Staff by</p>
                            <p className="mt-1 text-sm font-bold text-violet-950">{request.referred_by}</p>
                        </div>
                    )}
                    {getCounselingScheduledDate(request) && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">Scheduled Session</p>
                            <p className="mt-1 text-sm font-bold text-blue-950">{new Date(getCounselingScheduledDate(request) as string).toLocaleString()}</p>
                        </div>
                    )}
                    {request.status === COUNSELING_STATUS.REJECTED && (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">Request Rejected</p>
                            <p className="mt-1 text-sm leading-6 text-rose-950">{request.resolution_notes || 'Your request has been reviewed and was not approved at this time.'}</p>
                        </div>
                    )}
                    {request.status === COUNSELING_STATUS.COMPLETED && request.resolution_notes && (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Counselor Advice</p>
                            <p className="mt-1 text-sm leading-6 text-emerald-950">{request.resolution_notes}</p>
                        </div>
                    )}
                </div>

                {request.status === COUNSELING_STATUS.COMPLETED && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-black text-slate-950">Counseling Feedback</h4>
                        {(request.rating || (typeof request.feedback === 'string' && request.feedback.startsWith('[CSM]'))) ? (
                            <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center">
                                {request.rating ? (
                                    <div className="mb-2 flex justify-center gap-1 text-amber-500">
                                        {[1, 2, 3, 4, 5].map((n) => <div key={n} className="scale-75"><Icons.Star filled={n <= request.rating} /></div>)}
                                    </div>
                                ) : null}
                                <p className="text-sm italic text-amber-900">
                                    {request.feedback?.startsWith('[CSM]')
                                        ? 'Feedback submitted through the CSM form.'
                                        : `"${request.feedback || 'No comment provided.'}"`}
                                </p>
                                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700">Thank you for your feedback</p>
                            </div>
                        ) : (
                            <div className="mt-3 space-y-3">
                                <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                                    Please complete the Client Satisfaction Measurement form for this completed counseling session.
                                </p>
                                <button
                                    type="button"
                                    onClick={onOpenCsm}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500"
                                >
                                    Open CSM Feedback Form
                                    <ArrowIcon />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
);

export default function CounselingView({
    formatFullDate,
    Icons,
    personalInfo,
    setFeedbackPrefill,
    setActiveView,
    showToast
}: StudentRemainingFlatViewProps) {
    const [showCounselingRequestsModal, setShowCounselingRequestsModal] = useState(false);
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);

    const { counselingRequests, refreshCounselingRequests } = useStudentCounselingData({
        studentId: personalInfo.studentId
    });

    const openRequestModal = (req: any) => {
        setSelectedRequest(req);
    };

    const openCounselingForm = () => setShowCounselingForm(true);

    const onCounselingSubmitted = useCallback(async () => {
        setShowCounselingForm(false);
        await refreshCounselingRequests();
    }, [refreshCounselingRequests]);

    const activeRequests = counselingRequests.filter((request: any) => CARE_STAFF_ACTIVE_COUNSELING_STATUSES.includes(request.status));
    const completedRequests = counselingRequests.filter((request: any) => request.status === COUNSELING_STATUS.COMPLETED);
    const latestRequest = counselingRequests[0];

    return (
        <div className="student-counseling-root mx-auto max-w-6xl space-y-4 page-transition sm:space-y-5">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Student Services</p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">Counseling Services</h2>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">Request private counseling support and follow your submitted requests in one place.</p>
                    </div>
                    <div className="sm:shrink-0">
                        <button
                            type="button"
                            onClick={openCounselingForm}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:w-auto"
                        >
                            Request
                            <ArrowIcon />
                        </button>
                    </div>
                </div>
            </section>

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
                    <button
                        type="button"
                        onClick={() => openRequestModal(latestRequest)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
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
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
                        <p className="text-sm font-bold text-slate-700">No counseling requests yet.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Your submitted requests will appear here after you send the form.</p>
                    </div>
                )}
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Care Path</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">What happens next</h3>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                        { step: '1', title: 'Submit', copy: 'Send the request with your concern.' },
                        { step: '2', title: 'Review', copy: 'CARE checks the details privately.' },
                        { step: '3', title: 'Schedule', copy: 'You receive the next session update.' },
                    ].map((item) => (
                        <div key={item.step} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">{item.step}</span>
                            <div className="min-w-0">
                                <p className="text-sm font-black text-slate-950">{item.title}</p>
                                <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.copy}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

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
                    formatFullDate={formatFullDate}
                    onSelect={(req: any) => { setShowCounselingRequestsModal(false); openRequestModal(req); }}
                    onClose={() => setShowCounselingRequestsModal(false)}
                />,
                document.body
            )}

            {selectedRequest && createPortal(
                <RequestDetailsModal
                    request={selectedRequest}
                    formatFullDate={formatFullDate}
                    Icons={Icons}
                    onClose={() => setSelectedRequest(null)}
                    onOpenCsm={() => {
                        setFeedbackPrefill({
                            source: 'counseling',
                            counselingRequestId: selectedRequest.id,
                            service_availed: selectedRequest.request_type ? `Counseling - ${selectedRequest.request_type}` : 'Counseling Services',
                        });
                        setSelectedRequest(null);
                        setActiveView('feedback');
                    }}
                />,
                document.body
            )}
        </div>
    );
}
