import React, { useState, useEffect, useCallback, useRef } from 'react';
import { m } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    Eye,
    FileText,
    MoreHorizontal,
    MoreVertical,
    RefreshCw,
    Send,
    User,
    Users,
    XCircle
} from 'lucide-react';

import {
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingApprovable,
    isCareStaffCounselingRejectable,
    isCareStaffCounselingSchedulable,
    isCounselingAwaitingCare,
    isCounselingAwaitingDept,
    isCounselingCalendarVisible,
    isCounselingReturnedToCare,
    isCounselingSessionDone,
    isCounselingReschedulable
} from '../../../../../utils/workflow';
import {
    getCounselingStatusLabel,
    getCounselingStatusTone
} from '../../../../../utils/counselingStatusMeta';
import { toTitleCase } from '../../../../../utils/formatters';
import { Button } from '../../../../../components/ui/Button';
import CalendarView from '../../../../../components/CalendarView';
import CounselingEvaluationsList from './CounselingEvaluationsList';
import CounselingEvaluationFormModal from './CounselingEvaluationFormModal';
import CounselingScheduleModal from './CounselingScheduleModal';
import CounselingCompleteModal from './CounselingCompleteModal';
import CounselingOutcomeMenu from './CounselingOutcomeMenu';
import { usePermissions } from '../../../../../hooks/usePermissions';
import {
    getCounselingEvaluations,
    getGlobalEvaluationForm,
    type CounselingEvaluationQuestion,
    type CounselingEvaluationResponse
} from '../counselingEvaluationService';
import { useCareStaffCounseling } from '../hooks/useCareStaffCounseling';
import { COUNSELING_REQUESTS_PAGE_SIZE } from '../counselingData';

interface CareStaffCounselingPageProps {
    functions: any;
    refreshSignal?: number;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const COUNSELING_TAB_ACTIVE_STYLES: Record<string, { pill: string; badge: string }> = {
    [COUNSELING_STATUS.SUBMITTED]: {
        pill: 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs',
        badge: 'bg-amber-100 text-amber-800'
    },
    [COUNSELING_STATUS.APPROVED]: {
        pill: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs',
        badge: 'bg-blue-100 text-blue-800'
    },
    [COUNSELING_STATUS.RETURNED_TO_CARE]: {
        pill: 'bg-orange-50 text-orange-700 border-orange-200 shadow-xs',
        badge: 'bg-orange-100 text-orange-800'
    },
    [COUNSELING_STATUS.REFERRED]: {
        pill: 'bg-purple-600 text-white border-purple-600 shadow-xs',
        badge: 'bg-purple-800 text-white'
    },
    [COUNSELING_STATUS.STAFF_SCHEDULED]: {
        pill: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs',
        badge: 'bg-indigo-100 text-indigo-800'
    },
    [COUNSELING_STATUS.SCHEDULED]: {
        pill: 'bg-sky-50 text-sky-700 border-sky-200 shadow-xs',
        badge: 'bg-sky-100 text-sky-800'
    },
    [COUNSELING_STATUS.COMPLETED]: {
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs',
        badge: 'bg-emerald-100 text-emerald-800'
    },
    [COUNSELING_STATUS.COUNSELED]: {
        pill: 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs',
        badge: 'bg-teal-100 text-teal-800'
    },
    [COUNSELING_STATUS.MONITORING]: {
        pill: 'bg-violet-50 text-violet-700 border-violet-200 shadow-xs',
        badge: 'bg-violet-100 text-violet-800'
    },
    [COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING]: {
        pill: 'bg-rose-50 text-rose-700 border-rose-200 shadow-xs',
        badge: 'bg-rose-100 text-rose-800'
    },
    [COUNSELING_STATUS.RESCHEDULED]: {
        pill: 'bg-cyan-50 text-cyan-700 border-cyan-200 shadow-xs',
        badge: 'bg-cyan-100 text-cyan-800'
    }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.04 }
    }
};

const itemReveal = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
        dateStyle: 'medium'
    });
};

/** Detail modal for viewing Referral or Self-Referral form */
const CounselingDetailModal = ({
    request,
    view,
    setFormModalView,
    onClose,
    onSchedule,
    onComplete,
    onDownloadReferral
}: any) => (
    <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
    >
        <m.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-2xl w-full my-8 overflow-hidden relative text-left"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                {view === 'referral' && request.referred_by ? (
                    /* Department Referral Form view */
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">REFERRAL FORM</h3>
                                <p className="text-sm font-medium text-purple-600 mt-1">College/Department Referral for Counseling</p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Forwarded: {formatDateTime(request.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getCounselingStatusTone(request.status)}`}>{getCounselingStatusLabel(request.status)}</span>
                                <Button variant="ghost" size="sm" onClick={onClose} className="text-xl w-10 h-10 rounded-full hover:bg-slate-100/50 text-slate-400 shrink-0"><XCircle size={24} /></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/60">
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student</p><p className="text-slate-800 font-bold">{toTitleCase(request.student_name, '—')}</p></div>
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course & Year</p><p className="text-slate-800 font-bold">{request.course_year || '—'}</p></div>
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Referred By</p><p className="text-slate-800 font-bold">{request.referred_by || '—'}</p></div>
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact</p><p className="text-slate-800 font-bold">{request.contact_number || 'N/A'}</p></div>
                        </div>
                        <div className="mb-6">
                            <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason for Referral</p>
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.reason_for_referral || 'No reasons specified.'}</div>
                        </div>
                        <div className="mb-6">
                            <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Initial Actions Taken by Department</p>
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.personal_actions_taken || 'None reported.'}</div>
                        </div>
                        {getCounselingScheduledDate(request) && (
                            <div className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 flex gap-4 items-center mb-6">
                                <Calendar size={24} className="text-indigo-600 shrink-0" />
                                <div><p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Scheduled Session</p><p className="text-base font-bold text-indigo-900">{new Date(getCounselingScheduledDate(request) as string).toLocaleString()}</p></div>
                            </div>
                        )}
                        {request.resolution_notes && (
                            <div className="bg-emerald-50 p-5 rounded-[1.5rem] border border-emerald-100 mb-6">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Resolution Notes</p>
                                <p className="text-sm font-medium text-emerald-900 leading-relaxed">{request.resolution_notes}</p>
                            </div>
                        )}
                        <div className="flex gap-3">
                            <Button variant="secondary" size="md" onClick={() => onDownloadReferral(request)} leftIcon={<FileText size={16} />} className="flex-1 rounded-2xl">
                                Download Referral PDF
                            </Button>
                            <Button variant="secondary" size="md" onClick={() => setFormModalView('student')} leftIcon={<FileText size={16} />} className="flex-1 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100 hover:text-purple-800">
                                View Student Form
                            </Button>
                        </div>
                    </>
                ) : (
                    /* Student Self-Referral Form view */
                    <>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">SELF-REFERRAL FORM</h3>
                                <p className="text-sm font-medium text-purple-600 mt-1">Student Request for Counseling</p>
                                <p className="text-xs text-slate-400 mt-1 font-medium">Submitted: {formatDateTime(request.created_at)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getCounselingStatusTone(request.status)}`}>{getCounselingStatusLabel(request.status)}</span>
                                <Button variant="ghost" size="sm" onClick={onClose} className="text-xl w-10 h-10 rounded-full hover:bg-slate-100/50 text-slate-400 shrink-0"><XCircle size={24} /></Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/60">
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student</p><p className="text-slate-800 font-bold">{toTitleCase(request.student_name, '—')}</p></div>
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course & Year</p><p className="text-slate-800 font-bold">{request.course_year || '—'}</p></div>
                            <div className="col-span-full"><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact</p><p className="text-slate-800 font-bold">{request.contact_number || 'N/A'}</p></div>
                        </div>
                        <div className="mb-6">
                            <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason</p>
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.reason_for_referral || request.description || 'No reasons specified.'}</div>
                        </div>
                        <div className="mb-6">
                            <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Personal Actions Taken</p>
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.personal_actions_taken || 'None reported.'}</div>
                        </div>
                        <div className="mb-8">
                            <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Duration of Concern</p>
                            <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.date_duration_of_concern || 'Not specified.'}</div>
                        </div>
                        {getCounselingScheduledDate(request) && (
                            <div className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 flex gap-4 items-center mb-6">
                                <Calendar size={24} className="text-indigo-600 shrink-0" />
                                <div><p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-0.5">Scheduled Session</p><p className="text-base font-bold text-indigo-900">{new Date(getCounselingScheduledDate(request) as string).toLocaleString()}</p></div>
                            </div>
                        )}
                        {request.resolution_notes && (
                            <div className="bg-emerald-50 p-5 rounded-[1.5rem] border border-emerald-100 mb-6">
                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Resolution Notes</p>
                                <p className="text-sm font-medium text-emerald-900 leading-relaxed">{request.resolution_notes}</p>
                            </div>
                        )}
                        {request.referred_by && (
                            <Button variant="secondary" size="md" onClick={() => setFormModalView('referral')} leftIcon={<FileText size={16} />} className="w-full mt-2 rounded-2xl bg-purple-50 text-purple-700 hover:bg-purple-100">
                                View Referral Form
                            </Button>
                        )}
                    </>
                )}
            </div>
            {/* Action buttons */}
            <div className="p-6 border-t border-slate-200/60 flex flex-wrap gap-4 bg-slate-50/80 rounded-b-[2.5rem]">
                {isCareStaffCounselingSchedulable(request.status) && (
                    <Button variant="primary" size="md" onClick={() => onSchedule(request)} className="flex-1 rounded-[1.5rem] shadow-md shadow-purple-500/20">Schedule Session</Button>
                )}
                {(request.status === COUNSELING_STATUS.SCHEDULED || request.status === COUNSELING_STATUS.STAFF_SCHEDULED || request.status === COUNSELING_STATUS.RESCHEDULED) && (
                    <Button variant="primary" size="md" onClick={() => onComplete(request)} className="flex-1 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20">Mark as Complete</Button>
                )}
                <Button variant="secondary" size="md" onClick={onClose} className="flex-1 rounded-[1.5rem] bg-white border-slate-200 hover:bg-slate-100">Close Form</Button>
            </div>
        </m.div>
    </m.div>
);

const CareStaffCounselingPage = ({ functions, refreshSignal = 0 }: CareStaffCounselingPageProps) => {
    const {
        handleViewProfile,
        showToastMessage,
        counselingReqs,
        counselingTotal,
        counselingCounts,
        currentPage,
        setCurrentPage,
        loading,
        counselingTab,
        setCounselingTab,
        isRefreshingData,
        viewFormReq,
        setViewFormReq,
        showCounselingFormModal,
        setShowCounselingFormModal,
        formModalView,
        setFormModalView,
        showScheduleModal,
        setShowScheduleModal,
        scheduleData,
        setScheduleData,
        selectedApp,
        setSelectedApp,
        isSchedulingSession,
        showCompleteModal,
        setShowCompleteModal,
        completionForm,
        setCompletionForm,
        isCompletingSession,
        handleRefreshData,
        handleApproveRequest,
        handleRejectRequest,
        handleSetOutcome,
        handleRescheduleSession,
        handleScheduleFollowUp,
        handleScheduleSubmit,
        handleCompleteSession,
        handleDownloadReferralForm,
        totalRequestCount,
        visibleCounselingReqs
    } = useCareStaffCounseling({ functions, refreshSignal });

    const permissionsHook = usePermissions();
    const canManageOutcome = typeof permissionsHook.canPerformAction === 'function'
        ? permissionsHook.canPerformAction('manage_counseling_outcome')
        : Boolean(permissionsHook.getPermissionAccessState?.('action', 'manage_counseling_outcome')?.isAllowed);
    const canManageCounseling = typeof permissionsHook.canAccessFeature === 'function'
        ? permissionsHook.canAccessFeature('counseling')
        : Boolean(permissionsHook.getPermissionAccessState?.('feature', 'counseling')?.isAllowed);

    // Evaluations State
    const [evaluations, setEvaluations] = useState<CounselingEvaluationResponse[]>([]);
    const [evaluationQuestions, setEvaluationQuestions] = useState<CounselingEvaluationQuestion[]>([]);
    const [hasEvaluationForm, setHasEvaluationForm] = useState(false);
    const [evaluationsLoading, setEvaluationsLoading] = useState(false);
    const [evaluationsError, setEvaluationsError] = useState(false);
    const [showEvaluationBuilder, setShowEvaluationBuilder] = useState(false);

    // Schedule modal mode (new session vs reschedule vs follow-up)
    const [scheduleModalMode, setScheduleModalMode] = useState<'schedule' | 'reschedule' | 'follow_up'>('schedule');

    // Reject dialog state
    const [rejectModalReq, setRejectModalReq] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Context / Outcome Menu state
    const [outcomeMenuTarget, setOutcomeMenuTarget] = useState<any>(null);
    const [outcomeMenuPosition, setOutcomeMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const longPressTimerRef = useRef<any>(null);

    const openOutcomeMenu = (req: any, pos: { x: number; y: number }) => {
        setOutcomeMenuTarget(req);
        setOutcomeMenuPosition(pos);
    };

    const startLongPress = (req: any, e: React.TouchEvent) => {
        if (!isCounselingSessionDone(req.status) && !isCounselingReschedulable(req.status)) return;
        const touch = e.touches[0];
        longPressTimerRef.current = setTimeout(() => {
            openOutcomeMenu(req, { x: touch.clientX, y: touch.clientY });
        }, 500);
    };

    const cancelLongPress = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectModalReq) return;
        setIsRejecting(true);
        try {
            await handleRejectRequest(rejectModalReq, rejectReason);
            setRejectModalReq(null);
            setRejectReason('');
        } catch {
            // Handled in hook
        } finally {
            setIsRejecting(false);
        }
    };

    const handleCustomScheduleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedApp) return;

        if (scheduleModalMode === 'reschedule') {
            try {
                await handleRescheduleSession(selectedApp, scheduleData.date, scheduleData.time, scheduleData.notes);
                setShowScheduleModal(false);
                setSelectedApp(null);
                setScheduleData({ date: '', time: '', notes: '' });
            } catch {
                // Handled in hook
            }
        } else if (scheduleModalMode === 'follow_up') {
            try {
                await handleScheduleFollowUp(selectedApp, scheduleData.date, scheduleData.time, scheduleData.notes);
                setShowScheduleModal(false);
                setSelectedApp(null);
                setScheduleData({ date: '', time: '', notes: '' });
            } catch {
                // Handled in hook
            }
        } else {
            await handleScheduleSubmit(e);
        }
    };

    const loadEvaluations = useCallback(async () => {
        setEvaluationsLoading(true);
        setEvaluationsError(false);
        try {
            const [evals, formResult] = await Promise.all([
                getCounselingEvaluations(),
                getGlobalEvaluationForm()
            ]);
            setEvaluations(evals);
            setHasEvaluationForm(Boolean(formResult.form));
            setEvaluationQuestions(formResult.questions);
        } catch {
            setEvaluationsError(true);
        } finally {
            setEvaluationsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (counselingTab === 'Evaluations') {
            void loadEvaluations();
        }
    }, [counselingTab, loadEvaluations, refreshSignal]);

    const counselingTabs = [
        {
            id: COUNSELING_STATUS.SUBMITTED,
            label: 'Needs Review',
            count: counselingCounts.awaitingCare || 0
        },
        {
            id: COUNSELING_STATUS.APPROVED,
            label: 'College Review',
            count: counselingCounts.awaitingDept || 0
        },
        {
            id: COUNSELING_STATUS.RETURNED_TO_CARE,
            label: 'Returned to CARE',
            count: counselingCounts[COUNSELING_STATUS.RETURNED_TO_CARE] || 0
        },
        {
            id: COUNSELING_STATUS.REFERRED,
            label: 'Forwarded',
            count: counselingCounts[COUNSELING_STATUS.REFERRED] || 0
        },
        {
            id: COUNSELING_STATUS.STAFF_SCHEDULED,
            label: 'Staff Scheduled',
            count: counselingCounts[COUNSELING_STATUS.STAFF_SCHEDULED] || 0
        },
        {
            id: COUNSELING_STATUS.SCHEDULED,
            label: 'College Scheduled',
            count: counselingCounts[COUNSELING_STATUS.SCHEDULED] || 0
        },
        {
            id: COUNSELING_STATUS.COMPLETED,
            label: 'Completed',
            count: counselingCounts[COUNSELING_STATUS.COMPLETED] || 0
        },
        {
            id: COUNSELING_STATUS.COUNSELED,
            label: 'Counseled',
            count: counselingCounts[COUNSELING_STATUS.COUNSELED] || 0
        },
        {
            id: COUNSELING_STATUS.MONITORING,
            label: 'Monitoring',
            count: counselingCounts[COUNSELING_STATUS.MONITORING] || 0
        },
        {
            id: COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING,
            label: 'Subject for 2nd',
            count: counselingCounts[COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING] || 0
        },
        {
            id: COUNSELING_STATUS.RESCHEDULED,
            label: 'Rescheduled',
            count: counselingCounts[COUNSELING_STATUS.RESCHEDULED] || 0
        }
    ];

    const totalPages = Math.max(1, Math.ceil(counselingTotal / COUNSELING_REQUESTS_PAGE_SIZE));
    const startItem = counselingTotal === 0 ? 0 : (currentPage - 1) * COUNSELING_REQUESTS_PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * COUNSELING_REQUESTS_PAGE_SIZE, counselingTotal);

    return (
        <>
            <div className="flex h-full min-h-0 flex-col gap-4">
                {/* Purple Header Banner */}
                <div className="bg-[#6D28D9] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold uppercase tracking-widest text-[#DDD6FE]">
                                Guidance & Counseling
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-[11px] font-medium text-white/70">
                                Total: {totalRequestCount}
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Counseling Services
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Right Header Navigation Pills */}
                        <div className="flex items-center rounded-xl bg-black/20 p-1 backdrop-blur-sm border border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setCounselingTab(COUNSELING_STATUS.SUBMITTED);
                                    setCurrentPage(1);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                    counselingTab !== 'Calendar' && counselingTab !== 'Evaluations'
                                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 font-semibold'
                                }`}
                            >
                                <Users size={14} />
                                Requests
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCounselingTab('Calendar');
                                    setCurrentPage(1);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                    counselingTab === 'Calendar'
                                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 font-semibold'
                                }`}
                            >
                                <Calendar size={14} />
                                Calendar
                                {counselingCounts.Calendar > 0 && (
                                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                        {counselingCounts.Calendar}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setCounselingTab('Evaluations');
                                    setCurrentPage(1);
                                }}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                                    counselingTab === 'Evaluations'
                                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 font-semibold'
                                }`}
                            >
                                <ClipboardList size={14} />
                                Evaluations
                                {evaluations.length > 0 && (
                                    <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold text-white">
                                        {evaluations.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowEvaluationBuilder(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm"
                        >
                            <FileText size={14} />
                            <span>Evaluation Form</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh'}</span>
                        </button>
                    </div>
                </div>

                {/* White Toolbar */}
                {counselingTab !== 'Calendar' && counselingTab !== 'Evaluations' && (
                    <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 px-5 md:px-6 py-3 shadow-xs flex items-center justify-between gap-3 shrink-0">
                        {/* Status pills (horizontal row, left side) */}
                        <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full custom-scrollbar">
                            {counselingTabs.map((tab) => {
                                const isActive = counselingTab === tab.id;
                                const activeStyle = COUNSELING_TAB_ACTIVE_STYLES[tab.id] || {
                                    pill: 'bg-purple-600 text-white border-purple-600 shadow-xs',
                                    badge: 'bg-purple-800 text-white'
                                };
                                return (
                                    <button
                                        type="button"
                                        key={tab.id}
                                        onClick={() => {
                                            setCounselingTab(tab.id);
                                            setCurrentPage(1);
                                        }}
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold border transition-all duration-150 shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${
                                            isActive
                                                ? activeStyle.pill
                                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        <span
                                            className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                                                isActive
                                                    ? activeStyle.badge
                                                    : 'bg-gray-100 text-gray-500'
                                            }`}
                                        >
                                            {tab.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                    {counselingTab === 'Evaluations' ? (
                        <CounselingEvaluationsList
                            evaluations={evaluations}
                            questions={evaluationQuestions}
                            hasForm={hasEvaluationForm}
                            isLoading={evaluationsLoading}
                            isError={evaluationsError}
                            onRetry={loadEvaluations}
                            onManageForm={() => setShowEvaluationBuilder(true)}
                        />
                    ) : counselingTab === 'Calendar' ? (
                        <div className="min-h-0 flex-1 overflow-auto p-4">
                            <CalendarView requests={counselingReqs} />
                        </div>
                    ) : (
                        <>
                            {loading ? (
                                <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm font-medium text-slate-500">
                                    Loading counseling requests...
                                </div>
                            ) : visibleCounselingReqs.length === 0 ? (
                                <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                                        <Users size={28} />
                                    </div>
                                    <p className="mt-3 text-base font-bold text-slate-800">No requests found</p>
                                    <p className="mt-1 text-xs text-slate-400">No records currently match this filter.</p>
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                                    <m.table
                                        variants={staggerContainer}
                                        initial="hidden"
                                        animate="show"
                                        aria-label="Counseling requests"
                                        className="w-full text-left border-collapse"
                                    >
                                        <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-bold uppercase tracking-widest text-slate-400 backdrop-blur-sm">
                                            <tr>
                                                <th scope="col" className="px-6 py-3.5 w-[26%]">Student</th>
                                                <th scope="col" className="px-6 py-3.5 w-[22%]">Referral Info</th>
                                                <th scope="col" className="px-6 py-3.5 w-[14%]">Date Filed</th>
                                                <th scope="col" className="px-6 py-3.5 w-[14%]">Scheduled Date</th>
                                                <th scope="col" className="px-6 py-3.5 w-[12%]">Status</th>
                                                <th scope="col" className="px-6 py-3.5 text-right w-[12%] min-w-[160px]">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                            {visibleCounselingReqs.map((req) => {
                                                const isDone = isCounselingSessionDone(req.status);
                                                const hasRowMenu = isDone || isCounselingReschedulable(req.status);
                                                return (
                                                    <m.tr
                                                        variants={itemReveal}
                                                        key={req.id}
                                                        onContextMenu={(e) => {
                                                            if (hasRowMenu) {
                                                                e.preventDefault();
                                                                openOutcomeMenu(req, { x: e.clientX, y: e.clientY });
                                                            }
                                                        }}
                                                        onTouchStart={(e) => {
                                                            if (hasRowMenu) startLongPress(req, e);
                                                        }}
                                                        onTouchEnd={cancelLongPress}
                                                        onTouchMove={cancelLongPress}
                                                        className={`transition-colors ${
                                                            hasRowMenu ? 'cursor-context-menu hover:bg-slate-50/80' : 'hover:bg-purple-50/30'
                                                        }`}
                                                    >
                                                        <td className="px-6 py-4 min-w-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-xs text-purple-600">
                                                                    {getInitials(req.student_name)}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-slate-900 leading-snug">
                                                                        {toTitleCase(req.student_name, '—')}
                                                                    </p>
                                                                    <p className="text-xs text-slate-400 truncate">
                                                                        {req.course_year || '—'} · ID: {req.student_id}
                                                                        {req.follow_up_of && (
                                                                            <span className="ml-1.5 text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
                                                                                Follow-up
                                                                            </span>
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 min-w-0">
                                                            <div className="font-bold text-purple-700 truncate">
                                                                {req.referred_by || 'Student Self-Referral'}
                                                            </div>
                                                            <div className="text-xs text-slate-400 truncate max-w-xs">
                                                                {req.reason_for_referral || req.description || '—'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-sm">
                                                            {formatDate(req.created_at)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            {getCounselingScheduledDate(req) ? (
                                                                <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                                                                    <Calendar size={13} /> {new Date(getCounselingScheduledDate(req) as string).toLocaleDateString()}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Not scheduled</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getCounselingStatusTone(req.status)}`}>
                                                                {getCounselingStatusLabel(req.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleViewProfile(req.student_id)}
                                                                    leftIcon={<User size={13} />}
                                                                    className="rounded-xl border border-slate-200 text-xs font-semibold px-2.5 py-1 text-slate-600 hover:bg-slate-50 hover:text-purple-600"
                                                                >
                                                                    Profile
                                                                </Button>
                                                                <Button
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setViewFormReq(req);
                                                                        setShowCounselingFormModal(true);
                                                                        setFormModalView('referral');
                                                                    }}
                                                                    leftIcon={<Eye size={13} />}
                                                                    className="rounded-xl border border-slate-200 bg-white text-xs font-semibold px-2.5 py-1 text-slate-700 hover:bg-slate-50"
                                                                >
                                                                    View Form
                                                                </Button>

                                                                {/* Approval actions for Needs Review */}
                                                                {isCareStaffCounselingApprovable(req.status) && (
                                                                    <>
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            onClick={() => handleApproveRequest(req)}
                                                                            className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                                                        >
                                                                            Approve
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setRejectModalReq(req);
                                                                                setRejectReason('');
                                                                            }}
                                                                            className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 text-xs font-bold"
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {/* Actions for Returned to CARE */}
                                                                {isCounselingReturnedToCare(req.status) && (
                                                                    <>
                                                                        <Button
                                                                            variant="primary"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setSelectedApp(req);
                                                                                setScheduleModalMode('schedule');
                                                                                setScheduleData({ date: '', time: '', notes: '' });
                                                                                setShowScheduleModal(true);
                                                                            }}
                                                                            leftIcon={<Calendar size={13} />}
                                                                            className="rounded-xl bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                                                                        >
                                                                            Schedule
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setRejectModalReq(req);
                                                                                setRejectReason('');
                                                                            }}
                                                                            className="rounded-xl border border-red-200 text-red-600 hover:bg-red-50 px-2.5 py-1 text-xs font-bold"
                                                                        >
                                                                            Reject
                                                                        </Button>
                                                                    </>
                                                                )}

                                                                {/* Scheduling for Forwarded */}
                                                                {req.status === COUNSELING_STATUS.REFERRED && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedApp(req);
                                                                            setScheduleModalMode('schedule');
                                                                            setScheduleData({ date: '', time: '', notes: '' });
                                                                            setShowScheduleModal(true);
                                                                        }}
                                                                        leftIcon={<Calendar size={13} />}
                                                                        className="rounded-xl bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
                                                                    >
                                                                        Schedule
                                                                    </Button>
                                                                )}

                                                                {/* Completion actions for scheduled / rescheduled */}
                                                                {(req.status === COUNSELING_STATUS.STAFF_SCHEDULED ||
                                                                    req.status === COUNSELING_STATUS.SCHEDULED ||
                                                                    req.status === COUNSELING_STATUS.RESCHEDULED) && (
                                                                    <Button
                                                                        variant="primary"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setSelectedApp(req);
                                                                            setCompletionForm({ id: req.id, student_id: req.student_id, publicNotes: '', privateNotes: '' });
                                                                            setShowCompleteModal(true);
                                                                        }}
                                                                        leftIcon={<CheckCircle2 size={13} />}
                                                                        className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                                                    >
                                                                        Complete
                                                                    </Button>
                                                                )}

                                                                {/* Outcome / Actions Menu trigger */}
                                                                {hasRowMenu && (
                                                                    <button
                                                                        type="button"
                                                                        aria-label="Counseling action menu"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                                            openOutcomeMenu(req, {
                                                                                x: Math.max(12, rect.right - 280),
                                                                                y: rect.bottom + 4
                                                                            });
                                                                        }}
                                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                                                                    >
                                                                        <MoreVertical size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </m.tr>
                                                );
                                            })}
                                        </tbody>
                                    </m.table>
                                </div>
                            )}

                            {/* Pagination Footer */}
                            <div className="mt-auto bg-gray-50/50 border-t border-gray-100 rounded-b-2xl md:rounded-b-3xl px-6 py-3 flex items-center justify-between text-xs text-gray-500 shrink-0">
                                <div>
                                    Showing <span className="font-bold text-gray-900">{counselingTotal === 0 ? 0 : `${startItem}–${endItem}`}</span> of <span className="font-bold text-gray-900">{counselingTotal}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={loading || isRefreshingData || currentPage <= 1}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span className="text-xs font-semibold text-gray-700 px-1">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={loading || isRefreshingData || currentPage >= totalPages}
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Evaluation Builder Modal */}
            {showEvaluationBuilder && (
                <CounselingEvaluationFormModal
                    open={showEvaluationBuilder}
                    onClose={() => setShowEvaluationBuilder(false)}
                    showToast={showToastMessage}
                    onSaved={loadEvaluations}
                />
            )}

            {/* Read-only Form Modal */}
            {showCounselingFormModal && viewFormReq && (
                <CounselingDetailModal
                    request={viewFormReq}
                    view={formModalView}
                    setFormModalView={setFormModalView}
                    onClose={() => { setShowCounselingFormModal(false); setViewFormReq(null); }}
                    onSchedule={(req: any) => {
                        setShowCounselingFormModal(false);
                        setSelectedApp(req);
                        setScheduleModalMode('schedule');
                        setScheduleData({ date: '', time: '', notes: '' });
                        setShowScheduleModal(true);
                    }}
                    onComplete={(req: any) => {
                        setShowCounselingFormModal(false);
                        setSelectedApp(req);
                        setCompletionForm({ id: req.id, student_id: req.student_id, publicNotes: '', privateNotes: '' });
                        setShowCompleteModal(true);
                    }}
                    onDownloadReferral={handleDownloadReferralForm}
                />
            )}

            {/* Schedule Modal (fixes pre-existing bug: now rendered!) */}
            <CounselingScheduleModal
                open={showScheduleModal}
                onClose={() => {
                    setShowScheduleModal(false);
                    setSelectedApp(null);
                }}
                onSubmit={handleCustomScheduleSubmit}
                request={selectedApp}
                scheduleData={scheduleData}
                setScheduleData={setScheduleData}
                isSubmitting={isSchedulingSession}
                title={
                    scheduleModalMode === 'reschedule'
                        ? 'Reschedule Counseling Session'
                        : scheduleModalMode === 'follow_up'
                        ? 'Schedule Follow-up Counseling'
                        : 'Schedule Counseling Session'
                }
            />

            {/* Completion Modal (fixes pre-existing bug: now rendered!) */}
            <CounselingCompleteModal
                open={showCompleteModal}
                onClose={() => {
                    setShowCompleteModal(false);
                    setSelectedApp(null);
                    setCompletionForm({ id: null, student_id: null, publicNotes: '', privateNotes: '' });
                }}
                onSubmit={handleCompleteSession}
                request={completionForm?.id ? visibleCounselingReqs.find((r) => r.id === completionForm.id) || selectedApp : selectedApp}
                completionForm={completionForm}
                setCompletionForm={setCompletionForm}
                isSubmitting={isCompletingSession}
            />

            {/* Rejection Modal for CARE Staff */}
            {rejectModalReq && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-900">Reject Counseling Request</h3>
                            <button
                                type="button"
                                aria-label="Close reject dialog"
                                onClick={() => setRejectModalReq(null)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircle size={22} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <p className="text-sm font-bold text-red-950">
                                    {toTitleCase(rejectModalReq.student_name, 'Student')}
                                </p>
                                <p className="text-xs text-red-700 mt-1 line-clamp-2">
                                    {rejectModalReq.reason_for_referral || rejectModalReq.description || 'No description provided.'}
                                </p>
                            </div>
                            <div>
                                <label htmlFor="care-reject-reason" className="block text-xs font-bold text-gray-700 mb-1">
                                    Reason for Rejection (Optional)
                                </label>
                                <textarea
                                    id="care-reject-reason"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none"
                                    placeholder="State reason why request is rejected..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setRejectModalReq(null)}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isRejecting}
                                    onClick={handleConfirmReject}
                                    className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition shadow-md shadow-red-200 disabled:opacity-60"
                                >
                                    {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Outcome & Re-counseling Menu */}
            <CounselingOutcomeMenu
                request={outcomeMenuTarget}
                open={Boolean(outcomeMenuTarget && outcomeMenuPosition)}
                position={outcomeMenuPosition}
                onClose={() => {
                    setOutcomeMenuTarget(null);
                    setOutcomeMenuPosition(null);
                }}
                onSelectOutcome={async (req, outcome, notes) => {
                    await handleSetOutcome(req, outcome, notes);
                }}
                onReschedule={(req) => {
                    setSelectedApp(req);
                    setScheduleModalMode('reschedule');
                    setScheduleData({ date: '', time: '', notes: '' });
                    setShowScheduleModal(true);
                }}
                onScheduleFollowUp={(req) => {
                    setSelectedApp(req);
                    setScheduleModalMode('follow_up');
                    setScheduleData({ date: '', time: '', notes: '' });
                    setShowScheduleModal(true);
                }}
                canManageOutcome={canManageOutcome}
                canManageCounseling={canManageCounseling}
            />
        </>
    );
};

export default CareStaffCounselingPage;
