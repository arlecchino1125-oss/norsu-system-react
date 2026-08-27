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
import { toTitleCase } from '../../../../../utils/formatters';
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
            label: 'FORWARDED',
            count: counselingCounts[COUNSELING_STATUS.REFERRED] || 0,
            icon: <Send size={15} />,
            color: 'text-purple-600',
            activeBorder: 'border-purple-400 bg-purple-50/40'
        },
        {
            id: COUNSELING_STATUS.STAFF_SCHEDULED,
            label: 'STAFF SCHEDULED',
            count: counselingCounts[COUNSELING_STATUS.STAFF_SCHEDULED] || 0,
            icon: <Calendar size={15} />,
            color: 'text-blue-500',
            activeBorder: 'border-blue-400 bg-blue-50/40'
        },
        {
            id: COUNSELING_STATUS.SUBMITTED,
            label: 'AWAITING COLLEGE',
            count: counselingCounts.awaitingDept || 0,
            icon: <Clock size={15} />,
            color: 'text-orange-500',
            activeBorder: 'border-orange-400 bg-orange-50/40'
        },
        {
            id: COUNSELING_STATUS.SCHEDULED,
            label: 'COLLEGE SCHEDULED',
            count: counselingCounts[COUNSELING_STATUS.SCHEDULED] || 0,
            icon: <Calendar size={15} />,
            color: 'text-blue-500',
            activeBorder: 'border-blue-400 bg-blue-50/40'
        },
        {
            id: COUNSELING_STATUS.COMPLETED,
            label: 'COMPLETED',
            count: counselingCounts[COUNSELING_STATUS.COMPLETED] || 0,
            icon: <CheckCircle size={15} />,
            color: 'text-emerald-500',
            activeBorder: 'border-emerald-400 bg-emerald-50/40'
        },
        {
            id: COUNSELING_STATUS.REJECTED,
            label: 'REJECTED',
            count: counselingCounts[COUNSELING_STATUS.REJECTED] || 0,
            icon: <XCircle size={15} />,
            color: 'text-red-500',
            activeBorder: 'border-red-400 bg-red-50/40'
        }
    ];

    return (
        <>
            <div className="flex h-full min-h-0 flex-col gap-4">
                {/* Header Toolbar (Dark Gradient) */}
                <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Counseling Management</h1>
                            <span className="rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-purple-200">
                                {totalRequestCount} Total
                            </span>
                        </div>
                        <p className="mt-1 text-xs md:text-sm font-medium text-purple-200/80">Review applications, orchestrate referrals, and schedule guidance sessions securely.</p>
                    </div>

                    {/* View Switcher & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* View Toggles */}
                        <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    if (counselingTab === 'Calendar' || counselingTab === 'Evaluations') {
                                        setCounselingTab(COUNSELING_STATUS.REFERRED);
                                    }
                                }}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                                    counselingTab !== 'Calendar' && counselingTab !== 'Evaluations'
                                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 font-semibold'
                                }`}
                            >
                                <FileText size={14} />
                                Queue
                            </button>
                            <button
                                type="button"
                                onClick={() => setCounselingTab('Calendar')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
                                    counselingTab === 'Calendar'
                                        ? 'bg-[#8B5CF6] text-white shadow-sm font-bold'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 font-semibold'
                                }`}
                            >
                                <Calendar size={14} />
                                Calendar
                            </button>
                            <button
                                type="button"
                                onClick={() => setCounselingTab('Evaluations')}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition ${
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

                {/* Interactive Clickable KPI Filter Cards */}
                {counselingTab !== 'Calendar' && counselingTab !== 'Evaluations' && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 shrink-0">
                        {KPI_ITEMS.map((stat) => {
                            const isSelected = counselingTab === stat.id;
                            return (
                                <button
                                    type="button"
                                    key={stat.id}
                                    onClick={() => setCounselingTab(stat.id)}
                                    className={`border-2 rounded-2xl px-4 py-3.5 transition-all duration-150 relative flex items-center justify-between text-left ${
                                        isSelected
                                            ? stat.activeBorder
                                            : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className={`shrink-0 ${stat.color}`}>{stat.icon}</span>
                                            <span className={`truncate text-[10px] font-extrabold uppercase tracking-wider ${isSelected ? stat.color : 'text-slate-400'}`}>
                                                {stat.label}
                                            </span>
                                        </div>
                                        <span className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                                            {stat.count}
                                        </span>
                                    </div>
                                    <span
                                        className={`h-2 w-2 shrink-0 rounded-full bg-slate-900 transition-opacity duration-150 ${
                                            isSelected ? 'opacity-100' : 'opacity-0'
                                        }`}
                                    />
                                </button>
                            );
                        })}
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
                    ) : loading ? (
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
                        <div className="flex min-h-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                                <m.table variants={staggerContainer} initial="hidden" animate="show" aria-label="Counseling requests" className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[10px] font-black uppercase tracking-widest text-slate-400 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-5 py-3.5 w-[30%]">Student Details</th>
                                            <th className="px-5 py-3.5 w-[20%]">Referral Info</th>
                                            <th className="px-5 py-3.5 w-[14%]">Request Date</th>
                                            <th className="px-5 py-3.5 w-[14%]">Scheduled Date</th>
                                            <th className="px-5 py-3.5 w-[12%]">Status</th>
                                            <th className="px-5 py-3.5 text-right w-[10%] min-w-[140px]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                        {visibleCounselingReqs.map((req) => (
                                            <m.tr variants={itemReveal} key={req.id} className="transition-colors hover:bg-purple-50/30">
                                                <td className="px-5 py-3.5 min-w-0">
                                                    <div className="font-bold text-slate-900 truncate">{toTitleCase(req.student_name, '—')}</div>
                                                    <div className="text-[11px] text-slate-400 truncate">{req.course_year || '—'} · ID: {req.student_id}</div>
                                                </td>
                                                <td className="px-5 py-3.5 min-w-0">
                                                    <div className="font-bold text-purple-700 truncate">{req.referred_by || 'Student Self-Referral'}</div>
                                                    <div className="text-[11px] text-slate-400 truncate max-w-xs">{req.reason_for_referral || req.description || '—'}</div>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap text-xs">{formatDate(req.created_at)}</td>
                                                <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                                    {getCounselingScheduledDate(req) ? (
                                                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700">
                                                            <Calendar size={13} /> {new Date(getCounselingScheduledDate(req) as string).toLocaleDateString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Not scheduled</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getCounselingStatusTone(req.status)}`}>
                                                        {getCounselingStatusLabel(req.status)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button variant="ghost" size="sm" onClick={() => handleViewProfile(req.student_id)} leftIcon={<User size={13} />} className="rounded-xl border border-slate-200 text-xs font-semibold px-2.5 py-1 text-slate-600 hover:bg-slate-50 hover:text-purple-600">
                                                            Profile
                                                        </Button>
                                                        <Button variant="secondary" size="sm" onClick={() => { setViewFormReq(req); setShowCounselingFormModal(true); setFormModalView('referral'); }} leftIcon={<Eye size={13} />} className="rounded-xl border border-slate-200 bg-white text-xs font-semibold px-2.5 py-1 text-slate-700 hover:bg-slate-50">
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
                                                                leftIcon={<Calendar size={13} />}
                                                                className="rounded-xl bg-purple-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-purple-700"
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
