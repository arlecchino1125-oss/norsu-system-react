import Modal from '../../../../../components/ui/Modal';
import {
    CheckCircle, Send, Eye,
    Filter, ClipboardList, GraduationCap, XCircle, Download, Paperclip, RefreshCw
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
import type { CareStaffDashboardFunctions } from '../../../types';
import { SUPPORT_STATUS } from '../../../../../utils/workflow';
import PaginationControls from '../../../../../components/PaginationControls';
import { Button } from '../../../../../components/ui/Button';
import { useCareStaffSupport } from '../hooks/useCareStaffSupport';
import type { CareStaffSupportPageProps } from '../hooks/useCareStaffSupport';
import { SUPPORT_REQUESTS_PAGE_SIZE } from '../supportData';
import { SUPPORT_DOCUMENT_ACCEPT } from '../../../../../utils/inputSecurity';


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

    return (
        <>
            <div className="flex min-h-full flex-col">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <ClipboardList size={24} className="text-purple-600" />
                            <h1 className="text-2xl font-bold text-gray-900">Additional Support Management</h1>
                        </div>
                        <p className="text-gray-500 text-sm">Manage and respond to student support requests across all categories</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handleRefreshData}
                        disabled={isRefreshingData}
                        isLoading={isRefreshingData}
                        leftIcon={<RefreshCw size={16} />}
                        className="shadow-sm hover:text-purple-600"
                    >
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                </div>

                <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="max-w-full overflow-x-auto">
                        <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
                            {supportTabs.map((tab) => {
                                const isActive = supportTab === tab.id;
                                return (
                                    <button
                                        type="button"
                                        key={tab.id}
                                        onClick={() => setSupportTab(tab.id)}
                                        className={`rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${isActive ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                                    >
                                        {tab.label}
                                        <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                        <Filter size={16} className="text-gray-400" />
                        <span className="sr-only">Support category</span>
                        <select aria-label="Filter support requests by category" value={supportCategory} onChange={e => setSupportCategory(e.target.value)} className="cursor-pointer bg-transparent text-sm font-semibold text-gray-700 focus:outline-none">
                            {['All', 'Working Student Support', 'Indigenous Persons Support', 'Orphan Support', 'Financial Hardship'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                </div>

                {supportLoading ? (
                    <LoadingSkeleton type="table" count={5} />
                ) : visibleSupportReqs.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-left text-sm">
                                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    <tr>
                                        <th scope="col" className="px-4 py-3">Student</th>
                                        <th scope="col" className="px-4 py-3">Support categories</th>
                                        <th scope="col" className="whitespace-nowrap px-4 py-3">Date filed</th>
                                        <th scope="col" className="px-4 py-3">Status</th>
                                        <th scope="col" className="px-4 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibleSupportReqs.map(req => (
                                        <tr key={req.id} className="transition-colors hover:bg-gray-50/80">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-100 bg-purple-50">
                                                        <GraduationCap size={17} className="text-purple-600" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900">{toTitleCase(req.student_name, '—')}</p>
                                                        <p className="text-xs text-gray-500">{req.student_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex max-w-md flex-wrap gap-1">
                                                    {req.support_type ? req.support_type.split(', ').map((cat: string) => (
                                                        <span key={cat} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">{cat}</span>
                                                    )) : <span className="text-xs text-gray-500">None specified</span>}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-gray-600">{formatDate(req.created_at)}</td>
                                            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={req.status} /></td>
                                            <td className="whitespace-nowrap px-4 py-3 text-right">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => openSupportModal(req)}
                                                    leftIcon={req.status === SUPPORT_STATUS.FORWARDED_TO_DEPT ? <Eye size={14} /> : <ClipboardList size={14} />}
                                                    className="min-h-9 hover:text-purple-600"
                                                >
                                                    {req.status === SUPPORT_STATUS.FORWARDED_TO_DEPT ? 'View' : 'Manage'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-white py-10 text-center text-sm text-gray-500">No requests found in this stage.</p>
                )}
                <div className="mt-auto rounded-xl border border-gray-100 shadow-sm">
                    <PaginationControls
                        page={currentPage}
                        pageSize={SUPPORT_REQUESTS_PAGE_SIZE}
                        total={supportTotal}
                        isLoading={supportLoading || isRefreshingData}
                        onPageChange={setCurrentPage}
                    />
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

