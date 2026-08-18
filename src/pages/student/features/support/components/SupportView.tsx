import React, { lazy, Suspense, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useStudentSupportData } from '../hooks/useStudentSupportData';
import {
    getStoredAssetEntries,
    getStoredAssetLabel,
    openStoredAsset
} from '../../../../../utils/storageAssets';
import { CARE_STAFF_ACTIVE_SUPPORT_STATUSES, SUPPORT_STATUS } from '../../../../../utils/workflow';
import type { StudentRemainingFlatViewProps } from '../../../types';

const SupportFormModal = lazy(() => import('./SupportFormModal'));

const SUPPORT_APPLICATION_SECTIONS = [
    {
        title: '1. We welcome your application',
        paragraphs: [
            'We welcome applications from students with disabilities or special learning needs. By completing this form, you help us to form a clearer picture of your needs, which will enable us to see how we could support you, should you be admitted.',
            'As in the case of all other applicants, first of all we consider your academic merits and whether you comply with the admission criteria for the program that you want to apply for. Then we will consider what is reasonable and practical for the specific program to which you have applied.'
        ]
    },
    {
        title: '2. We protect your information',
        paragraphs: [
            'We will respect your privacy and keep your information confidential. However, we have to share relevant information with key academic, administrative and support staff members. They need such information to determine how we might best support you, should you be admitted for studies at NORSU-Guihulngan Campus.'
        ]
    },
    {
        title: '3. Submit this form with supporting documents',
        paragraphs: [
            'Please submit the completed form and all supporting documents, such as copies of medical or psychological proof of your condition or disability, when you apply. We must receive all your documents by the closing date for applications. We cannot process your application unless we have all the necessary information.'
        ]
    },
    {
        title: '4. Should you need assistance or information',
        paragraphs: [
            'Contact the Student Affairs and Services Office to learn about the kind of support the University offers.'
        ]
    },
    {
        title: '5. When you arrive on campus',
        paragraphs: [
            'We present an orientation session for students with disabilities and special needs every year. It takes place at the first month of the academic year, as part of the orientation program for newcomer students.'
        ]
    },
    {
        title: '6. How can we reach you?',
        paragraphs: [
            'When we receive your form, we send it to the faculty to which you are applying so that they can determine whether they can support you. The personal information you provide here also allows us to locate your application swiftly.'
        ]
    }
];

const getSupportStatusTone = (status: string) => {
    if (status === SUPPORT_STATUS.COMPLETED || status === SUPPORT_STATUS.RESOLVED_BY_DEPT) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    if (status === SUPPORT_STATUS.REFERRED_TO_CARE || status === SUPPORT_STATUS.FORWARDED_TO_DEPT) return 'border-violet-100 bg-violet-50 text-violet-700';
    if (status === SUPPORT_STATUS.VISIT_SCHEDULED || status === SUPPORT_STATUS.APPROVED) return 'border-blue-100 bg-blue-50 text-blue-700';
    if (status === SUPPORT_STATUS.REJECTED) return 'border-rose-100 bg-rose-50 text-rose-700';
    return 'border-slate-200 bg-slate-50 text-slate-600';
};

const getSupportStatusLabel = (status: string) => {
    if (status === SUPPORT_STATUS.SUBMITTED || status === SUPPORT_STATUS.PENDING) return 'Pending Review';
    if (status === SUPPORT_STATUS.FORWARDED_TO_DEPT) return 'With College';
    if (status === SUPPORT_STATUS.RESOLVED_BY_DEPT) return 'College Resolved';
    if (status === SUPPORT_STATUS.REFERRED_TO_CARE) return 'With CARE';
    return status || 'Pending Review';
};

const getSupportScheduledDate = (request: any) => {
    if (!request?.dept_notes) return null;
    try {
        const parsed = JSON.parse(request.dept_notes);
        return parsed?.scheduled_date || null;
    } catch {
        return null;
    }
};

const getSupportResolution = (request: any) => {
    if (!request) return null;

    if (request.status === SUPPORT_STATUS.RESOLVED_BY_DEPT && request.dept_notes) {
        try {
            const parsed = JSON.parse(request.dept_notes);
            if (parsed?.referred_by) return null;
        } catch {
            return { by: 'College Designate / Dean', text: request.dept_notes };
        }
    }

    if (request.status === SUPPORT_STATUS.COMPLETED && request.resolution_notes) {
        return { by: 'CARE Staff', text: request.resolution_notes };
    }

    return null;
};

const extractSupportAnswers = (description = '') => {
    const readPart = (startToken: string, endToken: string | null) => {
        const start = description.indexOf(startToken);
        if (start === -1) return '';
        const end = endToken ? description.indexOf(endToken, start) : -1;
        return end === -1
            ? description.substring(start + startToken.length).trim()
            : description.substring(start + startToken.length, end).trim();
    };

    if (!description.includes('[Q1 Description]:')) {
        return { q1: description, q2: '', q3: '', q4: '' };
    }

    return {
        q1: readPart('[Q1 Description]:', '[Q2 Previous Support]:'),
        q2: readPart('[Q2 Previous Support]:', '[Q3 Required Support]:'),
        q3: readPart('[Q3 Required Support]:', '[Q4 Other Needs]:'),
        q4: readPart('[Q4 Other Needs]:', null),
    };
};

const getSupportPreview = (request: any) => {
    const answers = extractSupportAnswers(request?.description || '');
    return answers.q3 || answers.q1 || request?.description || 'No support details provided.';
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

const CheckIcon = () => (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m20 6-11 11-5-5" />
    </svg>
);

/** Slide-in drawer listing every support request the student has made. */
const SupportRequestsDrawer = ({ requests, formatFullDate, onSelect, onClose }: any) => (
        <div className="fixed inset-0 z-50 flex justify-end bg-transparent student-mobile-modal-overlay" onClick={onClose}>
            <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl student-mobile-modal-drawer-panel" onClick={(event) => event.stopPropagation()}>
                <div className="shrink-0 border-b border-slate-100 bg-slate-950 px-5 py-4 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Additional Support</p>
                            <h3 className="mt-1 text-lg font-black">Your Requests</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-400">{requests.length} total request{requests.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close support requests"
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
                            <p className="mt-2 text-xs leading-5 text-slate-500">Once you submit a request, updates from the support team will appear here.</p>
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
                                            <p className="truncate text-sm font-black text-slate-950">{req.support_type || 'Additional Support'}</p>
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{getSupportPreview(req)}</p>
                                            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatFullDate(new Date(req.created_at))}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getSupportStatusTone(req.status)}`}>{getSupportStatusLabel(req.status)}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
);


/** Read-only detail sheet for one support request. */
const SupportRequestDetailsModal = ({ request, personalInfo, formatFullDate, showToast, onClose }: any) => (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4" onClick={onClose}>
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel" onClick={(event) => event.stopPropagation()}>
                <div className="shrink-0 border-b border-slate-100 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Support Request</p>
                            <h3 className="mt-1 text-lg font-black leading-tight text-slate-950">Request details</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Submitted {formatFullDate(new Date(request.created_at))}</p>
                        </div>
                        <button
                            type="button"
                            aria-label="Close support request details"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                    <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getSupportStatusTone(request.status)}`}>
                        {getSupportStatusLabel(request.status)}
                    </span>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 student-mobile-modal-scroll-panel sm:p-5">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {[
                            { label: 'Student', value: request.student_name || `${personalInfo.firstName} ${personalInfo.lastName}`.trim() || 'Not set' },
                            { label: 'Program', value: `${personalInfo.course || ''} ${personalInfo.year ? `- ${personalInfo.year}` : ''}`.trim() || 'Not set' },
                            { label: 'Contact', value: personalInfo.mobile || personalInfo.email || 'Not set' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                                <p className="mt-1 break-words text-sm font-bold leading-5 text-slate-800">{item.value}</p>
                            </div>
                        ))}
                    </div>

                    {(() => {
                        const answers = extractSupportAnswers(request.description || '');
                        const resolution = getSupportResolution(request);
                        const scheduledDate = getSupportScheduledDate(request);
                        return (
                            <>
                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Selected Categories</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {(request.support_type || 'Additional Support').split(',').map((item: string) => (
                                            <span key={item.trim()} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase text-blue-700">{item.trim()}</span>
                                        ))}
                                    </div>
                                </div>

                                {[
                                    { label: 'Need or condition', value: answers.q1 },
                                    { label: 'Previous support', value: answers.q2 },
                                    { label: 'Required campus support', value: answers.q3 },
                                    { label: 'Other needs', value: answers.q4 },
                                ].map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.value || 'Not provided.'}</p>
                                    </div>
                                ))}

                                {scheduledDate && (
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-700">College Visit Schedule</p>
                                        <p className="mt-1 text-sm font-bold text-blue-950">{scheduledDate}</p>
                                    </div>
                                )}

                                {resolution && (
                                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Resolution Letter</p>
                                        <p className="mt-1 text-xs font-bold text-emerald-800">From: {resolution.by}</p>
                                        <p className="mt-3 whitespace-pre-wrap rounded-xl border border-emerald-100 bg-white p-3 text-sm leading-6 text-emerald-950">{resolution.text}</p>
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {request.documents_url && (() => {
                        const urls = getStoredAssetEntries(request.documents_url);
                        return urls.length > 0 ? (
                            <section className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Supporting Documents</p>
                                <div className="mt-3 space-y-2">
                                    {urls.map((url: string, idx: number) => (
                                        <button
                                            key={url}
                                            type="button"
                                            onClick={async () => {
                                                try {
                                                    await openStoredAsset('support_documents', url, 300, {
                                                        category: 'support-student',
                                                        requestId: Number(request.id),
                                                        index: idx
                                                    });
                                                } catch (error: any) {
                                                    showToast?.(error.message || 'Unable to open the selected document.', 'error');
                                                }
                                            }}
                                            className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-left transition hover:bg-blue-100"
                                        >
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" /></svg>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black text-blue-800">Document {idx + 1}</p>
                                                <p className="truncate text-xs text-blue-500">{getStoredAssetLabel(url)}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </section>
                        ) : null;
                    })()}
                </div>
            </div>
        </div>
);

/** Support Path Guide Modal explaining what to prepare. */
const SupportPathModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 student-mobile-modal-overlay" onClick={onClose}>
        <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl student-mobile-modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Support Path</p>
                    <h3 className="mt-0.5 text-lg font-black text-slate-950">What to Prepare</h3>
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
                    { step: '1', title: 'Need Description', desc: 'Describe the specific access, physical, or academic learning accommodations you require.' },
                    { step: '2', title: 'Supporting Proof', desc: 'Attach medical certificates, psychological reports, PWD IDs, or relevant documents if available.' },
                    { step: '3', title: 'Staff Review & Routing', desc: 'Your request is confidentially routed to the designated CARE student support specialists.' },
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

export default function SupportView({
    formatFullDate,
    personalInfo,
    showToast,
    Icons
}: StudentRemainingFlatViewProps) {
    const [showSupportRequestsModal, setShowSupportRequestsModal] = useState(false);
    const [selectedSupportRequest, setSelectedSupportRequest] = useState<any>(null);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showReadFirstGuide, setShowReadFirstGuide] = useState(false);
    const [hasReadFirstAcknowledged, setHasReadFirstAcknowledged] = useState(false);
    const [showSupportPathModal, setShowSupportPathModal] = useState(false);

    const { supportRequests, refreshSupportRequests } = useStudentSupportData({
        studentId: personalInfo.studentId
    });

    const openSupportForm = () => setShowSupportModal(true);

    const onSupportSubmitted = useCallback(async () => {
        setShowSupportModal(false);
        await refreshSupportRequests();
    }, [refreshSupportRequests]);

    const activeRequests = supportRequests.filter((request: any) => CARE_STAFF_ACTIVE_SUPPORT_STATUSES.includes(request.status));
    const closedRequests = supportRequests.filter((request: any) => [SUPPORT_STATUS.COMPLETED, SUPPORT_STATUS.RESOLVED_BY_DEPT, SUPPORT_STATUS.REJECTED].includes(request.status));
    const latestRequest = supportRequests[0];

    return (
        <div className="student-support-root mx-auto max-w-6xl space-y-4 page-transition sm:space-y-5">
            {/* Unified Header & Read-First Guide Card */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Student Services</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Accommodations</span>
                        </div>
                        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">Additional Support</h2>
                        <p className="mt-1 max-w-xl text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
                            Request accommodations or support for disability, learning, access, or special student needs.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowSupportPathModal(true)}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95"
                        >
                            <svg className="h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                                <polyline points="10 9 9 9 8 9" />
                            </svg>
                            What to Prepare
                        </button>
                        <button
                            type="button"
                            aria-expanded={showReadFirstGuide}
                            onClick={() => setShowReadFirstGuide((isOpen) => !isOpen)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-95 ${
                                showReadFirstGuide
                                    ? 'border-blue-200 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                            {showReadFirstGuide ? 'Hide Guide' : 'Read Guide'}
                        </button>

                        {hasReadFirstAcknowledged && (
                            <button
                                type="button"
                                onClick={openSupportForm}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-95"
                            >
                                Apply Now
                                <ArrowIcon />
                            </button>
                        )}
                    </div>
                </div>

                {/* Status / Acknowledgment Notice Strip */}
                <div className="mt-3.5 border-t border-slate-100 pt-3">
                    {hasReadFirstAcknowledged ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                                    <CheckIcon />
                                </span>
                                <p className="truncate text-xs font-bold text-emerald-900">
                                    Application guide completed — form unlocked.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openSupportForm}
                                className="inline-flex shrink-0 items-center gap-1 text-xs font-black text-emerald-800 hover:text-emerald-950 sm:hidden"
                            >
                                Apply →
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
                            <p className="text-[11px] font-semibold text-blue-900">
                                Open the guide, read the document, and confirm to unlock the application form.
                            </p>
                            {!showReadFirstGuide && (
                                <button
                                    type="button"
                                    onClick={() => setShowReadFirstGuide(true)}
                                    className="shrink-0 text-[11px] font-bold text-blue-700 hover:underline"
                                >
                                    Open →
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Expanded Guide Content */}
                {showReadFirstGuide && (
                    <div className="mt-3 border-t border-slate-100 pt-3 space-y-3">
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-center">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">Form for Students Who Require Additional Support</p>
                            <p className="mt-1 text-xs font-bold text-slate-800">Negros Oriental State University</p>
                            <p className="text-[10px] font-medium text-slate-500">Office of the Campus Student Affairs and Services, Guihulngan Campus</p>
                        </div>

                        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                            {SUPPORT_APPLICATION_SECTIONS.map((section) => (
                                <article key={section.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                    <h4 className="text-xs font-black text-slate-950">{section.title}</h4>
                                    <div className="mt-1.5 space-y-1.5">
                                        {section.paragraphs.map((paragraph) => (
                                            <p key={paragraph} className="text-[11px] font-medium leading-relaxed text-slate-600">{paragraph}</p>
                                        ))}
                                    </div>
                                </article>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setHasReadFirstAcknowledged(true);
                                setShowReadFirstGuide(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:scale-[0.99] ${
                                hasReadFirstAcknowledged
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                    : 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100'
                            }`}
                        >
                            <span className="min-w-0">
                                <span className="block text-xs font-black">I have read the application guide</span>
                                <span className="mt-0.5 block text-[10px] font-semibold opacity-80">This unlocks the application form.</span>
                            </span>
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${hasReadFirstAcknowledged ? 'border-emerald-200 bg-emerald-500 text-white' : 'border-blue-300 bg-white text-transparent'}`}>
                                <CheckIcon />
                            </span>
                        </button>
                    </div>
                )}
            </section>

            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Total', value: supportRequests.length, icon: <Icons.Support />, tone: 'border-blue-100 bg-blue-50 text-blue-600' },
                    { label: 'Active', value: activeRequests.length, icon: <Icons.Clock />, tone: 'border-amber-100 bg-amber-50 text-amber-600' },
                    { label: 'Closed', value: closedRequests.length, icon: <Icons.CheckCircle />, tone: 'border-emerald-100 bg-emerald-50 text-emerald-600' },
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
                        onClick={() => setShowSupportRequestsModal(true)}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                        View all
                    </button>
                </div>
                {latestRequest ? (
                    <button
                        type="button"
                        onClick={() => setSelectedSupportRequest(latestRequest)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{latestRequest.support_type || 'Additional Support'}</p>
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{getSupportPreview(latestRequest)}</p>
                                <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{formatFullDate(new Date(latestRequest.created_at))}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-black uppercase ${getSupportStatusTone(latestRequest.status)}`}>
                                {getSupportStatusLabel(latestRequest.status)}
                            </span>
                        </div>
                    </button>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center">
                        <p className="text-sm font-bold text-slate-700">No support requests yet.</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Submitted requests and college updates will appear here.</p>
                    </div>
                )}
            </section>

            {showSupportPathModal && createPortal(
                <SupportPathModal onClose={() => setShowSupportPathModal(false)} />,
                document.body
            )}

            {showSupportRequestsModal && createPortal(
                <SupportRequestsDrawer
                    requests={supportRequests}
                    formatFullDate={formatFullDate}
                    onSelect={(req: any) => { setShowSupportRequestsModal(false); setSelectedSupportRequest(req); }}
                    onClose={() => setShowSupportRequestsModal(false)}
                />,
                document.body
            )}

            {selectedSupportRequest && createPortal(
                <SupportRequestDetailsModal
                    request={selectedSupportRequest}
                    personalInfo={personalInfo}
                    formatFullDate={formatFullDate}
                    showToast={showToast}
                    onClose={() => setSelectedSupportRequest(null)}
                />,
                document.body
            )}

            {showSupportModal && (
                <Suspense fallback={null}>
                    <SupportFormModal
                        isOpen={showSupportModal}
                        onClose={() => setShowSupportModal(false)}
                        personalInfo={personalInfo}
                        showToast={showToast}
                        onSubmitted={onSupportSubmitted}
                    />
                </Suspense>
            )}
        </div>
    );
}
