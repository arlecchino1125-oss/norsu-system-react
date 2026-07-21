import { formatDate, formatDateTime } from '../../../../../utils/formatters';
import CalendarView from '../../../../../components/CalendarView';
import {
    Users, FileText, Clock, CheckCircle, Calendar,
    User, Eye, Send, Download, XCircle, RefreshCw, AlertCircle
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { Button } from '../../../../../components/ui/Button';
// --- Kinetic Motion Variants ---

const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.08 }
    }
} as const;

const itemReveal = {
    hidden: { opacity: 0, y: 20 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 380, damping: 28 }
    }
} as const;

const modalOverlay = {
    hidden: { opacity: 0, backdropFilter: "blur(0px)" },
    show: { opacity: 1, backdropFilter: "blur(8px)", transition: { duration: 0.3 } },
    exit: { opacity: 0, backdropFilter: "blur(0px)", transition: { duration: 0.2 } }
} as const;

const modalContent = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } }
} as const;
import type { CareStaffDashboardFunctions } from '../../../types';
import {
    COUNSELING_AWAITING_DEPT_STATUSES,
    COUNSELING_CALENDAR_STATUSES,
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCareStaffCounselingSchedulable
} from '../../../../../utils/workflow';
import PaginationControls from '../../../../../components/PaginationControls';
import { useCareStaffCounseling } from '../hooks/useCareStaffCounseling';
import type { CareStaffCounselingPageProps } from '../hooks/useCareStaffCounseling';
import { COUNSELING_REQUESTS_PAGE_SIZE } from '../counselingData';
/** Read-only referral / self-referral form modal with schedule & complete actions. */

const CounselingFormModal = ({
    request, formModalView, setFormModalView,
    getCounselingStatusTone, getCounselingStatusLabel,
    onClose, onDownload, onSchedule, onComplete
}: any) => (
        <m.div
            variants={modalOverlay} initial="hidden" animate="show" exit="exit"
            className="fixed inset-0 bg-slate-950/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
        >
            <m.div variants={modalContent} className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50">
                <div className="p-8">
                    {request.referred_by && formModalView === 'referral' ? (
                        <>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-extrabold text-2xl text-slate-900 tracking-tight">DEAN'S REFERRAL</h3>
                                    <p className="text-sm font-medium text-purple-600 mt-1">Intervention Referral Form</p>
                                    <p className="text-xs text-slate-400 mt-1 font-medium">Submitted: {formatDateTime(request.created_at)}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getCounselingStatusTone(request.status)}`}>{getCounselingStatusLabel(request.status)}</span>
                                    <Button variant="ghost" size="sm" onClick={onClose} className="text-xl w-10 h-10 rounded-full hover:bg-slate-100/50 text-slate-400 shrink-0"><XCircle size={24} /></Button>
                                </div>
                            </div>
                            {/* Student info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/60">
                                <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Student</p><p className="text-slate-800 font-bold">{request.student_name || '—'}</p></div>
                                <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course & Year</p><p className="text-slate-800 font-bold">{request.course_year || '—'}</p></div>
                                <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Contact</p><p className="text-slate-800 font-bold">{request.contact_number || 'N/A'}</p></div>
                                <div><p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Request Type</p><p className="inline-flex px-2 py-0.5 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-md">{request.request_type || 'Dean Referral'}</p></div>
                            </div>
                            {/* Referral details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                                <div><p className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1.5">Referred By</p><p className="text-purple-900 font-bold">{request.referred_by || '—'}</p></div>
                                <div><p className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1.5">Referrer Contact</p><p className="text-slate-700 font-medium">{request.referrer_contact_number || 'N/A'}</p></div>
                                <div className="col-span-full"><p className="block text-xs font-bold text-purple-400 uppercase tracking-widest mb-1.5">Relationship</p><p className="text-slate-700 font-medium">{request.relationship_with_student || 'N/A'}</p></div>
                            </div>
                            <div className="mb-6">
                                <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason for Referral</p>
                                <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.reason_for_referral || request.description || 'No reasons specified.'}</div>
                            </div>
                            <div className="mb-6">
                                <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Actions Made by Referrer</p>
                                <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.actions_made || 'None reported.'}</div>
                            </div>
                            <div className="mb-8">
                                <p className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Observation Duration</p>
                                <div className="w-full bg-slate-50 border border-slate-200/60 rounded-[1.5rem] p-5 text-sm font-medium text-slate-700 shadow-inner">{request.date_duration_of_observations || 'Not specified.'}</div>
                            </div>
                            {/* Signature */}
                            {request.referrer_signature && (
                                <div className="mb-8 bg-slate-50 border border-slate-200/60 rounded-[2rem] p-6 flex flex-col items-center justify-center">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Digitally Signed By</p>
                                    <img src={request.referrer_signature} alt="Referrer Signature" className="max-h-20 object-contain drop-shadow-sm mb-4" />
                                    <div className="w-64 border-t border-slate-300 pt-2 text-center">
                                        <p className="text-base font-black text-slate-800">{request.referred_by}</p>
                                    </div>
                                </div>
                            )}
                            {/* Scheduled info */}
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
                            {/* Buttons */}
                            <div className="flex gap-4">
                                <Button variant="secondary" size="md" onClick={() => onDownload(request)} leftIcon={<Download size={16} />} className="flex-1 rounded-2xl bg-slate-100 hover:bg-slate-200">
                                    Download PDF
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
    return (
        <>
            <div className="space-y-8 pb-12">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-2">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Counseling Management</h1>
                        <p className="text-slate-500 text-sm mt-1.5 max-w-2xl">Review applications, orchestrate referrals, and schedule guidance sessions securely.</p>
                    </div>
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        leftIcon={<RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />}
                        className="bg-white/80 backdrop-blur-md rounded-2xl border-slate-200 shadow-sm hover:shadow hover:bg-slate-50"
                    >
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>
                {/* Stats Row */}
                <m.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
                >
                    {[
                        { label: 'Total Requests', value: totalRequestCount, icon: <FileText size={20} />, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200/50' },
                        { label: 'Awaiting Dept', value: counselingCounts.awaitingDept || 0, icon: <Clock size={20} />, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200/50' },
                        { label: 'Referred', value: counselingCounts[COUNSELING_STATUS.REFERRED] || 0, icon: <Send size={20} />, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200/50' },
                        { label: 'Scheduled', value: counselingCounts.Calendar || 0, icon: <Calendar size={20} />, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200/50' },
                        { label: 'Completed', value: counselingCounts[COUNSELING_STATUS.COMPLETED] || 0, icon: <CheckCircle size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200/50' },
                    ].map((stat) => (
                        <m.div
                            key={stat.label}
                            variants={itemReveal}
                            className={`bg-white/70 backdrop-blur-xl rounded-[2rem] p-6 border ${stat.border} shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden`}
                        >
                            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${stat.bg} opacity-50 blur-2xl pointer-events-none`} />
                            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 ${stat.color} shadow-sm relative z-10`}>
                                {stat.icon}
                            </div>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5 relative z-10">{stat.label}</p>
                            <p className="text-3xl font-black text-slate-900 relative z-10">{stat.value}</p>
                        </m.div>
                    ))}
                </m.div>
                {/* Tab Bar */}
                <div className="flex flex-wrap items-center gap-2 mb-8 bg-slate-100/50 p-1.5 rounded-full inline-flex">
                    {[
                        { id: COUNSELING_STATUS.REFERRED, label: `Forwarded (${counselingCounts[COUNSELING_STATUS.REFERRED] || 0})` },
                        { id: COUNSELING_STATUS.STAFF_SCHEDULED, label: `Staff Scheduled (${counselingCounts[COUNSELING_STATUS.STAFF_SCHEDULED] || 0})` },
                        { id: COUNSELING_STATUS.SUBMITTED, label: `Awaiting Dept (${counselingCounts.awaitingDept || 0})` },
                        { id: COUNSELING_STATUS.SCHEDULED, label: `Dept Scheduled (${counselingCounts[COUNSELING_STATUS.SCHEDULED] || 0})` },
                        { id: COUNSELING_STATUS.COMPLETED, label: `Completed (${counselingCounts[COUNSELING_STATUS.COMPLETED] || 0})` },
                        { id: COUNSELING_STATUS.REJECTED, label: `Rejected (${counselingCounts[COUNSELING_STATUS.REJECTED] || 0})` },
                        { id: 'Calendar', label: 'Calendar View' },
                    ].map(tab => (
                        <button type="button"
                            key={tab.id}
                            onClick={() => setCounselingTab(tab.id)}
                            className={`relative px-5 py-2.5 text-sm font-bold rounded-full transition-colors z-10 ${counselingTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {counselingTab === tab.id && (
                                <m.div
                                    layoutId="counselingActiveTab"
                                    className="absolute inset-0 bg-purple-600 rounded-full shadow-md shadow-purple-200 -z-10"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <span className="relative z-10">{tab.label}</span>
                        </button>
                    ))}
                </div>
                {counselingTab === 'Calendar' ? (
                    <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 p-6 shadow-sm">
                        <CalendarView requests={counselingReqs} />
                    </div>
                ) : loading ? (
                    <div className="text-center py-16 text-slate-500 font-medium">Loading counseling requests...</div>
                ) : visibleCounselingReqs.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                            <User size={24} />
                        </div>
                        <p className="text-slate-500 font-medium tracking-wide">No requests found in this category.</p>
                    </div>
                ) : (
                    <m.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 xl:grid-cols-2 gap-5"
                    >
                        {visibleCounselingReqs.map(req => (
                            <m.div
                                variants={itemReveal}
                                key={req.id}
                                className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] p-6 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
                            >
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${req.status === COUNSELING_STATUS.COMPLETED ? 'bg-emerald-100 text-emerald-600' :
                                            req.status === COUNSELING_STATUS.REFERRED ? 'bg-purple-100 text-purple-600' :
                                                req.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'bg-indigo-100 text-indigo-600' :
                                                    'bg-blue-100 text-blue-600'
                                            }`}>
                                            {req.status === COUNSELING_STATUS.COMPLETED ? <CheckCircle size={22} /> : <Users size={22} />}
                                        </div>
                                        <div>
                                            <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-purple-700 transition-colors">{req.student_name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md tracking-wide">{req.request_type}</span>
                                                <span className="text-xs text-slate-400 font-medium">Logged: {formatDate(req.created_at)}</span>
                                            </div>
                                            {getCounselingScheduledDate(req) && (
                                                <div className="flex items-center gap-1.5 mt-2 text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md text-xs font-bold inline-flex">
                                                    <Calendar size={12} />
                                                    Scheduled: {formatDate(getCounselingScheduledDate(req) as string)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Actions Footer */}
                                <div className="flex items-center gap-2 pt-4 border-t border-slate-100/80">
                                    <Button variant="secondary" size="sm" onClick={() => handleViewProfile?.(req.student_id)} leftIcon={<User size={14} />} className="rounded-xl flex-1 justify-center bg-slate-50 hover:bg-slate-100">
                                        Profile
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => { setViewFormReq(req); setShowCounselingFormModal(true); setFormModalView('referral'); }} leftIcon={<Eye size={14} />} className="rounded-xl flex-1 justify-center bg-slate-50 hover:bg-slate-100">
                                        View Form
                                    </Button>
                                    {isCareStaffCounselingSchedulable(req.status) && (
                                        <Button variant="primary" size="sm" onClick={() => { setSelectedApp(req); setShowScheduleModal(true); }} leftIcon={<Calendar size={14} />} className="rounded-xl flex-1 justify-center shadow-md shadow-purple-500/20">
                                            Schedule
                                        </Button>
                                    )}
                                    {(req.status === COUNSELING_STATUS.SCHEDULED || req.status === COUNSELING_STATUS.STAFF_SCHEDULED) && (
                                        <Button variant="primary" size="sm" onClick={() => { setCompletionForm({ id: req.id, student_id: req.student_id, publicNotes: '', privateNotes: '' }); setShowCompleteModal(true); }} leftIcon={<CheckCircle size={14} />} className="rounded-xl flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 text-white">
                                            Complete
                                        </Button>
                                    )}
                                </div>
                            </m.div>
                        ))}
                    </m.div>
                )}
                <div className="mt-8 rounded-[2rem] border border-slate-200/60 shadow-sm bg-white/70 backdrop-blur-md overflow-hidden">
                    <PaginationControls
                        page={currentPage}
                        pageSize={COUNSELING_REQUESTS_PAGE_SIZE}
                        total={counselingTotal}
                        isLoading={loading || isRefreshingData}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
            <AnimatePresence>
                {/* Read-only Form Modal — Referral or Student Form */}
                {showCounselingFormModal && viewFormReq && (
                    <CounselingFormModal
                        request={viewFormReq}
                        formModalView={formModalView}
                        setFormModalView={setFormModalView}
                        getCounselingStatusTone={getCounselingStatusTone}
                        getCounselingStatusLabel={getCounselingStatusLabel}
                        onClose={() => { setShowCounselingFormModal(false); setFormModalView('referral'); }}
                        onDownload={handleDownloadReferralForm}
                        onSchedule={(req: any) => { setShowCounselingFormModal(false); setFormModalView('referral'); setSelectedApp(req); setShowScheduleModal(true); }}
                        onComplete={(req: any) => { setShowCounselingFormModal(false); setFormModalView('referral'); setCompletionForm({ ...completionForm, id: req.id, student_id: req.student_id }); setShowCompleteModal(true); }}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {/* Schedule Counseling Modal */}
                {showScheduleModal && (
                    <m.div
                        variants={modalOverlay} initial="hidden" animate="show" exit="exit"
                        className="fixed inset-0 bg-slate-950/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <m.div variants={modalContent} className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-md border border-purple-100/50">
                            <div className="px-6 py-5 border-b border-slate-200/60 flex justify-between items-center">
                                <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Schedule Session</h3>
                                <Button variant="ghost" size="sm" onClick={() => setShowScheduleModal(false)} className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"><XCircle size={20} /></Button>
                            </div>
                            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-5">
                                <div><label htmlFor="care-counseling-date" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date</label><input id="care-counseling-date" type="date" required className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} /></div>
                                <div><label htmlFor="care-counseling-time" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Time</label><input id="care-counseling-time" type="time" required className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} /></div>
                                <div><label htmlFor="care-counseling-location" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Location</label><input id="care-counseling-location" className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" value={scheduleData.location} onChange={e => setScheduleData({ ...scheduleData, location: e.target.value })} placeholder="e.g. Guidance Office" /></div>
                                <div><label htmlFor="care-counseling-notes" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Notes for Student</label><textarea id="care-counseling-notes" rows={3} className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-sm font-medium resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all" value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })} placeholder="Optional instructions to bring documents, etc..." /></div>
                                <div className="flex gap-4 pt-4 border-t border-slate-100">
                                    <Button type="button" variant="secondary" size="md" disabled={isSchedulingSession} onClick={() => setShowScheduleModal(false)} className="flex-1 rounded-2xl bg-white border-slate-200 hover:bg-slate-50">Cancel</Button>
                                    <Button type="submit" variant="primary" size="md" disabled={isSchedulingSession} className="flex-1 rounded-2xl shadow-md shadow-purple-500/20">{isSchedulingSession ? 'Scheduling...' : 'Confirm Schedule'}</Button>
                                </div>
                            </form>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {/* Complete Counseling Session Modal */}
                {showCompleteModal && (
                    <m.div
                        variants={modalOverlay} initial="hidden" animate="show" exit="exit"
                        className="fixed inset-0 bg-slate-950/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm"
                    >
                        <m.div variants={modalContent} className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] shadow-2xl w-full max-w-lg p-8 border border-emerald-100/50">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-xl text-slate-900 tracking-tight">Complete Session</h3>
                                    <p className="text-sm font-medium text-emerald-600">Mark counseling as successfully concluded</p>
                                </div>
                            </div>
                            <form onSubmit={handleCompleteSession} className="space-y-6">
                                <div>
                                    <label htmlFor="care-counseling-public-notes" className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Public Resolution Notes</label>
                                    <textarea id="care-counseling-public-notes" required rows={4} className="w-full bg-slate-50 border border-slate-200/60 rounded-xl p-4 text-sm font-medium resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 inline-block" placeholder="Summarize outcomes, advice provided, and any next steps for the student..." value={completionForm.publicNotes} onChange={e => setCompletionForm({ ...completionForm, publicNotes: e.target.value })}></textarea>
                                </div>
                                <div className="bg-rose-50/50 border border-rose-100 rounded-[1.5rem] p-5">
                                    <label htmlFor="care-counseling-private-notes" className="flex items-center gap-1.5 text-xs font-bold text-rose-500 uppercase tracking-widest mb-2">
                                        <AlertCircle size={14} /> Confidential Notes
                                    </label>
                                    <textarea id="care-counseling-private-notes" className="w-full bg-white/50 border border-rose-200/60 rounded-xl p-4 text-sm font-medium resize-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 outline-none transition-all placeholder:text-rose-300" rows={3} placeholder="Private notes, internal observations..." value={completionForm.privateNotes} onChange={e => setCompletionForm({ ...completionForm, privateNotes: e.target.value })}></textarea>
                                    <p className="text-[10px] font-bold text-rose-400 mt-2 uppercase tracking-wide">Visible to Guidance Staff only</p>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <Button type="button" variant="secondary" size="md" disabled={isCompletingSession} onClick={() => setShowCompleteModal(false)} className="flex-1 rounded-2xl bg-white border-slate-200 hover:bg-slate-50">Cancel</Button>
                                    <Button type="submit" variant="primary" size="md" disabled={isCompletingSession} className="flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 text-white border-transparent">{isCompletingSession ? 'Completing...' : 'Finalize Session'}</Button>
                                </div>
                            </form>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default CareStaffCounselingPage;
