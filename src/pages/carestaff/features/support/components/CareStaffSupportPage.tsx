import Modal from '../../../../../components/ui/Modal';
import { m } from 'framer-motion';
import {
    CheckCircle, Send,
    Filter, GraduationCap, XCircle, Download, Paperclip, RefreshCw,
    Edit, ChevronLeft, ChevronRight, Users
} from 'lucide-react';
import StatusBadge from '../../../../../components/StatusBadge';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import { formatDate, toTitleCase } from '../../../../../utils/formatters';
import { buildStudentAddress } from '../../../../../utils/studentFields';
import {
    getStoredAssetEntries,
    openStoredAsset,
    parseCareNotesPayload
} from '../../../../../utils/storageAssets';
import { SUPPORT_STATUS } from '../../../../../utils/workflow';
import { Button } from '../../../../../components/ui/Button';
import { useCareStaffSupport } from '../hooks/useCareStaffSupport';
import type { CareStaffSupportPageProps } from '../hooks/useCareStaffSupport';
import { SUPPORT_REQUESTS_PAGE_SIZE } from '../supportData';
import { SUPPORT_DOCUMENT_ACCEPT } from '../../../../../utils/inputSecurity';

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

const getInitials = (name?: string | null) => {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'ST';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const TAB_ACTIVE_STYLES: Record<string, { pill: string; badge: string }> = {
    [SUPPORT_STATUS.SUBMITTED]: {
        pill: 'bg-purple-600 text-white border-purple-600 shadow-xs',
        badge: 'bg-purple-800 text-white'
    },
    [SUPPORT_STATUS.FORWARDED_TO_DEPT]: {
        pill: 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs',
        badge: 'bg-blue-100 text-blue-800'
    },
    [SUPPORT_STATUS.VISIT_SCHEDULED]: {
        pill: 'bg-teal-50 text-teal-700 border-teal-200 shadow-xs',
        badge: 'bg-teal-100 text-teal-800'
    },
    'dept_updates': {
        pill: 'bg-orange-50 text-orange-700 border-orange-200 shadow-xs',
        badge: 'bg-orange-100 text-orange-800'
    },
    [SUPPORT_STATUS.COMPLETED]: {
        pill: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-xs',
        badge: 'bg-emerald-100 text-emerald-800'
    }
};

const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case SUPPORT_STATUS.SUBMITTED:
            return 'bg-purple-50 text-purple-700 border-purple-200';
        case SUPPORT_STATUS.FORWARDED_TO_DEPT:
            return 'bg-blue-50 text-blue-700 border-blue-200';
        case SUPPORT_STATUS.VISIT_SCHEDULED:
            return 'bg-teal-50 text-teal-700 border-teal-200';
        case SUPPORT_STATUS.RESOLVED_BY_DEPT:
            return 'bg-teal-50 text-teal-700 border-teal-200';
        case SUPPORT_STATUS.REFERRED_TO_CARE:
            return 'bg-orange-50 text-orange-700 border-orange-200';
        case SUPPORT_STATUS.APPROVED:
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        case SUPPORT_STATUS.REJECTED:
            return 'bg-rose-50 text-rose-700 border-rose-200';
        case SUPPORT_STATUS.COMPLETED:
            return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        default:
            return 'bg-gray-50 text-gray-700 border-gray-200';
    }
};


/** Full-screen review modal for one support request, with status-dependent staff actions. */
const SupportRequestModal = ({
    request, student, supportForm, setSupportForm, letterFile, setLetterFile,
    isForwardingSupport, isFinalizingSupport, showToast, parseDeptNotes, renderDetailedDescription,
    onClose, onPrint, onForward, onLetterFileChange, onFinalize
}: any) => {
    const carePayload = parseCareNotesPayload(request.care_notes);
    const hasCarePayload = Boolean(carePayload?.notes?.trim()) || Boolean(carePayload?.letterReference);
    return (
        <Modal
            open
            onClose={onClose}
            anchorId="staff-content-region"
            size="full"
            title="Support Application"
            subtitle={`${toTitleCase(request.student_name, 'Student')} · Filed ${formatDate(request.created_at)}`}
            headerMeta={(
                <div className="flex items-center gap-3">
                    <StatusBadge status={request.status} />
                    <Button variant="secondary" onClick={onPrint} className="!rounded-xl !p-2.5 !bg-gray-50 hover:!bg-gray-100 hover:text-blue-600 shadow-sm border-gray-200 transition-colors" title="Print Application"><Download size={18} /></Button>
                </div>
            )}
        >
            <div className="space-y-6">
                {/* Student Information Section */}
                        <section className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100/80 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
                            <h4 className="font-bold text-sm text-purple-600 mb-5 uppercase tracking-widest flex items-center gap-2 relative z-10">
                                <GraduationCap size={16} /> Student Information
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm relative z-10">
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Full Name</p><div className="font-semibold text-gray-900 text-base">{toTitleCase(request.student_name, '—')}</div></div>
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date Filed</p><div className="font-semibold text-gray-900 text-base">{formatDate(request.created_at)}</div></div>
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date of Birth</p><div className="font-semibold text-gray-900 text-base">{student?.dob || '-'}</div></div>
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Program — Year</p><div className="font-semibold text-gray-900 text-base">{request.course_year || `${student?.course || '-'} - ${student?.year_level || '-'}`}</div></div>
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Mobile</p><div className="font-semibold text-gray-900 text-base">{student?.mobile || '-'}</div></div>
                                <div><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email</p><div className="font-semibold text-gray-900 text-base">{student?.email || '-'}</div></div>
                                <div className="sm:col-span-2 lg:col-span-3"><p className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Home Address</p><div className="font-semibold text-gray-900 text-base">{buildStudentAddress(student) || '-'}</div></div>
                            </div>
                        </section>

                        {/* Section A: Studies */}
                        <section>
                            <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{student?.priority_course || 'N/A'}</span></div>
                                <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{student?.alt_course_1 || 'N/A'}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{student?.alt_course_2 || 'N/A'}</span></div>
                            </div>
                        </section>

                        {/* Categories & Particulars */}
                        <section>
                            <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">B. Particulars of Need</h4>
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-600 mb-1">Categories:</p>
                                <div className="flex flex-wrap gap-1">
                                    {request.support_type ? request.support_type.split(', ').map((cat: string) => (
                                        <span key={cat} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">{cat}</span>
                                    )) : <span className="text-xs text-gray-400">None</span>}
                                </div>
                            </div>
                            {renderDetailedDescription(request.description)}
                            {request.documents_url && (() => {
                                const urls = getStoredAssetEntries(request.documents_url);
                                return urls.length > 0 ? (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1"><Paperclip size={12} /> Supporting Documents ({urls.length})</p>
                                        {urls.map((url: string, idx: number) => (
                                            <Button
                                                key={url}
                                                variant="ghost"
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
                                                leftIcon={<Download size={14} className="flex-shrink-0" />}
                                                className="w-full !justify-start !py-1 !text-left text-sm font-medium !text-blue-700 hover:!text-blue-900 hover:underline !rounded-none !bg-transparent"
                                            >
                                                <span className="truncate">Document {idx + 1} — {decodeURIComponent(url.split('/').pop() || 'file')}</span>
                                            </Button>
                                        ))}
                                    </div>
                                ) : null;
                            })()}
                        </section>


                        {/* CARE Staff Endorsement (read-only) */}
                        {hasCarePayload && (
                            <section className="bg-amber-50/60 p-5 rounded-xl border border-amber-200">
                                <h4 className="font-bold text-sm text-amber-700 mb-4 uppercase tracking-widest flex items-center gap-2">
                                    <Paperclip size={16} /> CARE Staff Endorsement
                                </h4>
                                <div className="text-sm text-gray-800 space-y-3">
                                    {carePayload.notes ? (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Notes Sent to the College Designate</p>
                                            <p className="whitespace-pre-wrap bg-white border border-amber-100 p-3 rounded-lg">{carePayload.notes}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm italic text-gray-500">No notes were added for this endorsement.</p>
                                    )}
                                    {carePayload.letterReference && (
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Uploaded Endorsement Letter</p>
                                            <Button
                                                variant="secondary"
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await openStoredAsset('support_documents', carePayload.letterReference, 300, {
                                                            category: 'support-endorsement',
                                                            requestId: Number(request.id)
                                                        });
                                                    } catch (error) {
                                                        showToast?.(error.message || 'Unable to open the endorsement letter.', 'error');
                                                    }
                                                }}
                                                leftIcon={<Download size={14} />}
                                                className="w-full sm:w-auto !justify-center !bg-white border-gray-200"
                                            >
                                                View Endorsement Letter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}


                        {/* Action Section */}
                        <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                            <h4 className="font-bold text-sm text-gray-700 mb-4 uppercase tracking-wider">Staff Actions</h4>

                            {request.status === SUPPORT_STATUS.SUBMITTED && (
                                <div>
                                    <label htmlFor="care-support-dean-notes" className="block text-xs font-bold text-gray-700 mb-1">CARE Staff Notes (For College Designate)</label>
                                    <textarea id="care-support-dean-notes" rows={3} value={supportForm.care_notes} onChange={e => setSupportForm({ ...supportForm, care_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Add endorsement notes..."></textarea>
                                    <div className="mt-3">
                                        <label htmlFor="care-support-endorsement-letter" className="block text-xs font-bold text-gray-700 mb-1">Attach Endorsement Letter (Optional)</label>
                                        <input id="care-support-endorsement-letter" type="file" accept={SUPPORT_DOCUMENT_ACCEPT} onChange={onLetterFileChange} className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                                        {letterFile && (
                                            <div className="flex items-center gap-2 mt-1.5 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-1.5">
                                                <Paperclip size={12} className="text-yellow-600" />
                                                <span className="text-xs text-gray-700 truncate flex-1">{letterFile.name}</span>
                                                <Button variant="ghost" size="sm" type="button" onClick={() => setLetterFile(null)} className="!text-red-400 hover:!text-red-600 !p-0"><XCircle size={14} /></Button>
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="primary" disabled={isForwardingSupport} isLoading={isForwardingSupport} onClick={onForward} className="w-full mt-3 !bg-yellow-500 hover:!bg-yellow-600 !py-2 !rounded-lg !shadow-none">{isForwardingSupport ? 'Forwarding...' : 'Forward to College Designate'}</Button>
                                </div>
                            )}

                            {request.status === SUPPORT_STATUS.FORWARDED_TO_DEPT && (
                                <div className="text-center text-sm text-gray-500 italic py-4">Waiting for College Designate review...</div>
                            )}

                            {request.status === SUPPORT_STATUS.VISIT_SCHEDULED && (() => {
                                const deptUpdate = parseDeptNotes(request.dept_notes);
                                return (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Department Visit Scheduled</p>
                                            <p className="text-sm text-blue-900">
                                                {deptUpdate?.scheduled_date || 'Schedule pending'}
                                            </p>
                                            {deptUpdate?.approval_notes && (
                                                <p className="text-sm text-blue-800 mt-2 whitespace-pre-wrap">{deptUpdate.approval_notes}</p>
                                            )}
                                        </div>
                                        <div className="text-center text-sm text-gray-500 italic py-2">
                                            Waiting for the department visit outcome before CARE Staff completes the case.
                                        </div>
                                    </div>
                                );
                            })()}

                            {(request.status === SUPPORT_STATUS.APPROVED || request.status === SUPPORT_STATUS.REJECTED) && (
                                <div>
                                    <div className={`p-3 rounded-lg mb-3 ${request.status === SUPPORT_STATUS.APPROVED ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                                        <p className="text-xs font-bold uppercase">College Designate's Decision: {request.status}</p>
                                        <p className="text-sm mt-1">{request.dept_notes || 'No notes provided.'}</p>
                                    </div>
                                    <label htmlFor="care-support-resolution" className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                    <textarea id="care-support-resolution" rows={3} value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                    <Button variant="primary" disabled={isFinalizingSupport} isLoading={isFinalizingSupport} onClick={onFinalize} className="w-full mt-2 !bg-green-600 hover:!bg-green-700 !py-2 !rounded-lg !shadow-none">{isFinalizingSupport ? 'Completing...' : 'Notify Student & Complete'}</Button>
                                </div>
                            )}

                            {(request.status === SUPPORT_STATUS.REFERRED_TO_CARE || request.status === SUPPORT_STATUS.RESOLVED_BY_DEPT) && (() => {
                                let referral: any = null;
                                try { referral = JSON.parse(request.dept_notes); } catch { /* not JSON */ }
                                return (
                                    <div>
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-4">
                                            <h5 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Send size={14} /> Department Referral Report
                                            </h5>
                                            {referral ? (
                                                <div className="space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Referred By</p>
                                                            <p className="text-sm font-semibold text-gray-900">{referral.referred_by || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase">Date Acted / Visit Date</p>
                                                            <p className="text-sm font-semibold text-gray-900">{referral.date_acted || '-'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Actions Taken During Visit</p>
                                                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{referral.actions_taken || 'None provided'}</p>
                                                    </div>
                                                    {referral.comments && (
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Other Comments / Observations</p>
                                                            <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">{referral.comments}</p>
                                                        </div>
                                                    )}
                                                    {referral.signature && (
                                                        <div>
                                                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Signature</p>
                                                            <div className="bg-white p-2 rounded-lg border border-gray-200 inline-block">
                                                                <img src={referral.signature} alt="Referrer Signature" className="max-h-20" />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-600">{request.dept_notes || 'No referral details provided.'}</p>
                                            )}
                                        </div>
                                        <label htmlFor="care-support-referral-resolution" className="block text-xs font-bold text-gray-700 mb-1">Final Resolution / Ideas for Student</label>
                                        <textarea id="care-support-referral-resolution" rows={3} value={supportForm.resolution_notes} onChange={e => setSupportForm({ ...supportForm, resolution_notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Provide solution or next steps..."></textarea>
                                        <Button variant="primary" disabled={isFinalizingSupport} isLoading={isFinalizingSupport} onClick={onFinalize} className="w-full mt-2 !bg-green-600 hover:!bg-green-700 !py-2 !rounded-lg !shadow-none">{isFinalizingSupport ? 'Completing...' : 'Notify Student & Complete'}</Button>
                                    </div>
                                );
                            })()}

                            {request.status === SUPPORT_STATUS.COMPLETED && (
                                <p className="text-xs text-green-600 font-bold bg-green-50 p-2 rounded"><CheckCircle size={12} className="inline mr-1" /> Request Resolved</p>
                            )}
                        </section>
                </div>
            </Modal>
        );
    };

const CareStaffSupportPage = ({ functions, refreshSignal = 0 }: CareStaffSupportPageProps) => {
    const {
        showToast,
        supportTotal,
        currentPage,
        setCurrentPage,
        supportLoading,
        supportTab,
        setSupportTab,
        supportCategory,
        setSupportCategory,
        isRefreshingData,
        showSupportModal,
        setShowSupportModal,
        selectedSupportReq,
        selectedStudent,
        supportForm,
        setSupportForm,
        letterFile,
        setLetterFile,
        isForwardingSupport,
        isFinalizingSupport,
        parseDeptNotes,
        supportTabs,
        visibleSupportReqs,
        handleRefreshData,
        openSupportModal,
        handleForwardSupport,
        handleLetterFileChange,
        handleFinalizeSupport,
        handlePrintSupport,
        renderDetailedDescription
    } = useCareStaffSupport({ functions, refreshSignal });

    const totalPages = Math.max(1, Math.ceil(supportTotal / SUPPORT_REQUESTS_PAGE_SIZE));
    const startItem = supportTotal === 0 ? 0 : (currentPage - 1) * SUPPORT_REQUESTS_PAGE_SIZE + 1;
    const endItem = Math.min(currentPage * SUPPORT_REQUESTS_PAGE_SIZE, supportTotal);

    return (
        <>
            <div className="flex h-full min-h-0 flex-col gap-4">
                {/* Header Toolbar (Dark Gradient) */}
                <div
                    style={{ background: 'linear-gradient(135deg, #1e0f40 0%, #2d1b69 100%)' }}
                    className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border border-purple-900/40 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 shrink-0"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Additional Support Management</h1>
                            <span className="rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs font-semibold text-purple-200">
                                {supportTotal} Total
                            </span>
                        </div>
                        <p className="mt-1 text-xs md:text-sm font-medium text-purple-200/80">Manage and respond to student support requests across all categories.</p>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50 self-start xl:self-auto cursor-pointer"
                    >
                        <RefreshCw size={14} className={isRefreshingData ? 'animate-spin' : ''} />
                        <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                    </button>
                </div>

                {/* White Toolbar */}
                <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 px-5 md:px-6 py-3 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 shrink-0">
                    {/* Status pills (horizontal row, left side) */}
                    <div className="flex items-center gap-2 overflow-x-auto py-0.5 max-w-full">
                        {supportTabs.map((tab) => {
                            const isActive = supportTab === tab.id;
                            const activeStyle = TAB_ACTIVE_STYLES[tab.id] || {
                                pill: 'bg-purple-600 text-white border-purple-600 shadow-xs',
                                badge: 'bg-purple-800 text-white'
                            };
                            return (
                                <button
                                    type="button"
                                    key={tab.id}
                                    onClick={() => {
                                        setSupportTab(tab.id);
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

                    {/* Category filter dropdown far right */}
                    <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 shadow-xs hover:border-gray-300 transition-colors self-start md:self-auto shrink-0">
                        <Filter size={14} className="text-gray-400 shrink-0" />
                        <span className="sr-only">Support category</span>
                        <select
                            aria-label="Filter support requests by category"
                            value={supportCategory}
                            onChange={(e) => {
                                setSupportCategory(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="cursor-pointer bg-transparent text-xs font-medium text-gray-700 focus:outline-none pr-1"
                        >
                            {['All', 'Working Student Support', 'Indigenous Persons Support', 'Orphan Support', 'Financial Hardship'].map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {/* Main Content Area (White Card) */}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                    {supportLoading ? (
                        <div className="p-6">
                            <LoadingSkeleton type="table" count={5} />
                        </div>
                    ) : visibleSupportReqs.length > 0 ? (
                        <div className="min-h-0 flex-1 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
                            <m.table variants={staggerContainer} initial="hidden" animate="show" aria-label="Support requests" className="w-full text-left border-collapse">
                                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[11px] font-bold uppercase tracking-widest text-slate-400 backdrop-blur-sm">
                                    <tr>
                                        <th scope="col" className="px-6 py-3.5 w-[28%]">Student</th>
                                        <th scope="col" className="px-6 py-3.5 w-[28%]">Support Categories</th>
                                        <th scope="col" className="px-6 py-3.5 w-[18%]">Date Filed</th>
                                        <th scope="col" className="px-6 py-3.5 w-[16%]">Status</th>
                                        <th scope="col" className="px-6 py-3.5 w-[100px] text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                                    {visibleSupportReqs.map((req) => (
                                        <m.tr variants={itemReveal} key={req.id} className="transition-colors hover:bg-purple-50/20">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-xs text-purple-600">
                                                        {getInitials(req.student_name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-900 leading-snug">{toTitleCase(req.student_name, '—')}</p>
                                                        <p className="font-mono text-xs text-slate-400">{req.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex max-w-md flex-wrap gap-1.5">
                                                    {req.support_type ? req.support_type.split(', ').map((cat: string) => (
                                                        <span
                                                            key={cat}
                                                            className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600"
                                                        >
                                                            {cat}
                                                        </span>
                                                    )) : (
                                                        <span className="text-xs text-gray-400">None specified</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                                                {formatDate(req.created_at)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeClass(req.status)}`}>
                                                    {req.status}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => openSupportModal(req)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs transition-all hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                                                >
                                                    <Edit size={13} className="shrink-0" />
                                                    <span>Manage</span>
                                                </button>
                                            </td>
                                        </m.tr>
                                    ))}
                                </tbody>
                            </m.table>
                        </div>
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-12 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-3">
                                <Users size={28} />
                            </div>
                            <p className="text-base font-bold text-slate-800">No requests found</p>
                            <p className="mt-1 text-xs text-slate-400">No records currently match this filter.</p>
                        </div>
                    )}

                    {/* Pagination Footer */}
                    <div className="mt-auto bg-gray-50/50 border-t border-gray-100 rounded-b-2xl md:rounded-b-3xl px-6 py-3 flex items-center justify-between text-xs text-gray-500 shrink-0">
                        <div>
                            Showing <span className="font-bold text-gray-900">{supportTotal === 0 ? 0 : `${startItem}–${endItem}`}</span> of <span className="font-bold text-gray-900">{supportTotal}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={supportLoading || isRefreshingData || currentPage <= 1}
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
                                disabled={supportLoading || isRefreshingData || currentPage >= totalPages}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40 transition-colors shadow-2xs cursor-pointer"
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Support Modal - Anchored full-region overlay (matches attendees list) */}
            {showSupportModal && selectedSupportReq && (
                <SupportRequestModal
                    request={selectedSupportReq}
                    student={selectedStudent}
                    supportForm={supportForm}
                    setSupportForm={setSupportForm}
                    letterFile={letterFile}
                    setLetterFile={setLetterFile}
                    isForwardingSupport={isForwardingSupport}
                    isFinalizingSupport={isFinalizingSupport}
                    showToast={showToast}
                    parseDeptNotes={parseDeptNotes}
                    renderDetailedDescription={renderDetailedDescription}
                    onClose={() => setShowSupportModal(false)}
                    onPrint={handlePrintSupport}
                    onForward={handleForwardSupport}
                    onLetterFileChange={handleLetterFileChange}
                    onFinalize={handleFinalizeSupport}
                />
            )}
        </>
    );
};

export default CareStaffSupportPage;

