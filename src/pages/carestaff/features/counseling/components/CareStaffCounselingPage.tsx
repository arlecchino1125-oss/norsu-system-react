import React, { useState, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import {
    Calendar,
    CheckCircle,
    ClipboardList,
    Clock,
    Eye,
    FileText,
    RefreshCw,
    Send,
    User,
    Users,
    XCircle
} from 'lucide-react';

import {
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingSchedulable
} from '../../../../../utils/workflow';
import { Button } from '../../../../../components/ui/Button';
import CalendarView from '../../../../../components/CalendarView';
import CounselingEvaluationsList from './CounselingEvaluationsList';
import CounselingEvaluationFormModal from './CounselingEvaluationFormModal';
import {
    getCounselingEvaluations,
    getGlobalEvaluationForm,
    type CounselingEvaluationQuestion,
    type CounselingEvaluationResponse
} from '../counselingEvaluationService';
import { useCareStaffCounseling } from '../hooks/useCareStaffCounseling';

interface CareStaffCounselingPageProps {
    functions: any;
    refreshSignal?: number;
}

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
    onDownloadReferral,
    getCounselingStatusTone,
    getCounselingStatusLabel
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
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student</p><p className="text-slate-800 font-bold">{request.student_name || '—'}</p></div>
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
                            <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student</p><p className="text-slate-800 font-bold">{request.student_name || '—'}</p></div>
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
                {(request.status === COUNSELING_STATUS.SCHEDULED || request.status === COUNSELING_STATUS.STAFF_SCHEDULED) && (
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
        getCounselingStatusTone,
        getCounselingStatusLabel,
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
        handleScheduleSubmit,
        handleCompleteSession,
        handleDownloadReferralForm,
        totalRequestCount,
        visibleCounselingReqs
    } = useCareStaffCounseling({ functions, refreshSignal });

    // Evaluations State
    const [evaluations, setEvaluations] = useState<CounselingEvaluationResponse[]>([]);
    const [evaluationQuestions, setEvaluationQuestions] = useState<CounselingEvaluationQuestion[]>([]);
    const [hasEvaluationForm, setHasEvaluationForm] = useState(false);
    const [evaluationsLoading, setEvaluationsLoading] = useState(false);
    const [evaluationsError, setEvaluationsError] = useState(false);
    const [showEvaluationBuilder, setShowEvaluationBuilder] = useState(false);

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

    // KPI Cards configuration for interactive direct filtering
    const KPI_ITEMS = [
        {
            id: COUNSELING_STATUS.REFERRED,
            label: 'Forwarded',
            count: counselingCounts[COUNSELING_STATUS.REFERRED] || 0,
            icon: <Send size={18} />,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40',
            badgeColor: 'bg-purple-100 text-purple-700'
        },
        {
            id: COUNSELING_STATUS.STAFF_SCHEDULED,
            label: 'Staff Scheduled',
            count: counselingCounts[COUNSELING_STATUS.STAFF_SCHEDULED] || 0,
            icon: <Calendar size={18} />,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
            activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40',
            badgeColor: 'bg-indigo-100 text-indigo-700'
        },
        {
            id: COUNSELING_STATUS.SUBMITTED,
            label: 'Awaiting College',
            count: counselingCounts.awaitingDept || 0,
            icon: <Clock size={18} />,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40',
            badgeColor: 'bg-amber-100 text-amber-700'
        },
        {
            id: COUNSELING_STATUS.SCHEDULED,
            label: 'College Scheduled',
            count: counselingCounts[COUNSELING_STATUS.SCHEDULED] || 0,
            icon: <Calendar size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40',
            badgeColor: 'bg-blue-100 text-blue-700'
        },
        {
            id: COUNSELING_STATUS.COMPLETED,
            label: 'Completed',
            count: counselingCounts[COUNSELING_STATUS.COMPLETED] || 0,
            icon: <CheckCircle size={18} />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40',
            badgeColor: 'bg-emerald-100 text-emerald-700'
        },
        {
            id: COUNSELING_STATUS.REJECTED,
            label: 'Rejected',
            count: counselingCounts[COUNSELING_STATUS.REJECTED] || 0,
            icon: <XCircle size={18} />,
            color: 'text-rose-600',
            bg: 'bg-rose-50',
            activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40',
            badgeColor: 'bg-rose-100 text-rose-700'
        }
    ];

    return (
        <>
            <div className="flex h-full min-h-0 flex-col gap-3.5">
                {/* Header Toolbar */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Counseling Management</h1>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                                {totalRequestCount} Total
                            </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">Review applications, orchestrate referrals, and schedule guidance sessions securely.</p>
                    </div>

                    {/* View Switcher & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Secondary View Toggles */}
                        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                            <button
                                type="button"
                                onClick={() => {
                                    if (counselingTab === 'Calendar' || counselingTab === 'Evaluations') {
                                        setCounselingTab(COUNSELING_STATUS.REFERRED);
                                    }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    counselingTab !== 'Calendar' && counselingTab !== 'Evaluations'
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <FileText size={14} />
                                Queue
                            </button>
                            <button
                                type="button"
                                onClick={() => setCounselingTab('Calendar')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    counselingTab === 'Calendar'
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Calendar size={14} />
                                Calendar
                            </button>
                            <button
                                type="button"
                                onClick={() => setCounselingTab('Evaluations')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                    counselingTab === 'Evaluations'
                                        ? 'bg-white text-purple-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <ClipboardList size={14} />
                                Evaluations
                                {evaluations.length > 0 && (
                                    <span className="ml-0.5 rounded-full bg-purple-100 px-1.5 py-0.2 text-[10px] font-black text-purple-700">
                                        {evaluations.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        <Button
                            variant="secondary"
                            size="md"
                            onClick={() => setShowEvaluationBuilder(true)}
                            leftIcon={<ClipboardList size={16} />}
                            className="shrink-0"
                        >
                            Evaluation Form
                        </Button>
                        <Button
                            variant="secondary"
                            size="md"
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            leftIcon={<RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />}
                            className="shrink-0 hover:text-purple-600"
                        >
                            {isRefreshingData ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </div>

                {/* Interactive Clickable KPI Filter Cards */}
                {counselingTab !== 'Calendar' && counselingTab !== 'Evaluations' && (
                    <m.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6"
                    >
                        {KPI_ITEMS.map((stat) => {
                            const isSelected = counselingTab === stat.id;
                            return (
                                <m.button
                                    type="button"
                                    key={stat.id}
                                    variants={itemReveal}
                                    onClick={() => setCounselingTab(stat.id)}
                                    className={`group relative flex items-center justify-between gap-2.5 rounded-2xl border p-3 text-left transition-all duration-150 ${
                                        isSelected
                                            ? stat.activeBorder
                                            : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${stat.bg} ${stat.color} ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}>
                                            {stat.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-[11px] font-bold text-slate-500">{stat.label}</p>
                                            <p className="text-lg font-black tabular-nums text-slate-900 leading-tight">{stat.count}</p>
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-600" />
                                    )}
                                </m.button>
                            );
                        })}
                    </m.div>
                )}

                {/* Main Content Area */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                    ) : loading ? (
                        <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm font-medium text-slate-500">
                            Loading counseling requests...
                        </div>
                    ) : visibleCounselingReqs.length === 0 ? (
                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
                            <Users size={32} className="text-slate-300" />
                            <p className="mt-3 text-sm font-bold text-slate-700">No requests found</p>
                            <p className="mt-1 text-xs text-slate-500">No records currently match this filter.</p>
                        </div>
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-auto">
                                <m.table variants={staggerContainer} initial="hidden" animate="show" aria-label="Counseling requests" className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-500 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-4 py-3">Student Details</th>
                                            <th className="px-4 py-3">Referral Info</th>
                                            <th className="px-4 py-3">Request Date</th>
                                            <th className="px-4 py-3">Scheduled Date</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                        {visibleCounselingReqs.map((req) => (
                                            <m.tr variants={itemReveal} key={req.id} className="transition-colors hover:bg-purple-50/30">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-900">{req.student_name || '—'}</div>
                                                    <div className="text-[10px] text-slate-400">{req.course_year || '—'} • ID: {req.student_id}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-purple-900">{req.referred_by || 'Student Self-Referral'}</div>
                                                    <div className="text-[10px] text-slate-400 truncate max-w-xs">{req.reason_for_referral || req.description || '—'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(req.created_at)}</td>
                                                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                    {getCounselingScheduledDate(req) ? (
                                                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                                                            <Calendar size={12} /> {new Date(getCounselingScheduledDate(req) as string).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Not scheduled</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getCounselingStatusTone(req.status)}`}>
                                                        {getCounselingStatusLabel(req.status)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="ghost" size="sm" onClick={() => handleViewProfile(req.student_id)} leftIcon={<User size={14} />} className="shrink-0 text-slate-500 hover:text-purple-600">
                                                            Profile
                                                        </Button>
                                                        <Button variant="secondary" size="sm" onClick={() => { setViewFormReq(req); setShowCounselingFormModal(true); setFormModalView('referral'); }} leftIcon={<Eye size={14} />} className="shrink-0 justify-center bg-white">
                                                            View Form
                                                        </Button>
                                                        {isCareStaffCounselingSchedulable(req.status) && (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedApp(req);
                                                                    setScheduleData({ date: '', time: '', location: 'CARE Center Office', notes: '' });
                                                                    setShowScheduleModal(true);
                                                                }}
                                                                leftIcon={<Calendar size={14} />}
                                                                className="shrink-0 bg-purple-600 hover:bg-purple-700"
                                                            >
                                                                Schedule
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </m.tr>
                                        ))}
                                    </tbody>
                                </m.table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showEvaluationBuilder && (
                <CounselingEvaluationFormModal
                    open={showEvaluationBuilder}
                    onClose={() => setShowEvaluationBuilder(false)}
                    showToast={showToastMessage}
                    onSaved={loadEvaluations}
                />
            )}

            {showCounselingFormModal && viewFormReq && (
                <CounselingDetailModal
                    request={viewFormReq}
                    view={formModalView}
                    setFormModalView={setFormModalView}
                    onClose={() => { setShowCounselingFormModal(false); setViewFormReq(null); }}
                    onSchedule={(req: any) => {
                        setShowCounselingFormModal(false);
                        setSelectedApp(req);
                        setScheduleData({ date: '', time: '', location: 'CARE Center Office', notes: '' });
                        setShowScheduleModal(true);
                    }}
                    onComplete={(req: any) => {
                        setShowCounselingFormModal(false);
                        setCompletionForm({ id: req.id, student_id: req.student_id, publicNotes: '', privateNotes: '' });
                        setShowCompleteModal(true);
                    }}
                    onDownloadReferral={handleDownloadReferralForm}
                    getCounselingStatusTone={getCounselingStatusTone}
                    getCounselingStatusLabel={getCounselingStatusLabel}
                />
            )}
        </>
    );
};

export default CareStaffCounselingPage;
