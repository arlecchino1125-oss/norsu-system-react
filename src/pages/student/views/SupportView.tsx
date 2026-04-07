import React, { lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
    getStoredAssetEntries,
    getStoredAssetLabel,
    openStoredAsset
} from '../../../utils/storageAssets';
import { SUPPORT_STATUS } from '../../../utils/workflow';

const SupportFormModal = lazy(() => import('../forms/SupportFormModal'));

const getSupportStatusTone = (status: string) => {
    if (status === SUPPORT_STATUS.COMPLETED || status === SUPPORT_STATUS.RESOLVED_BY_DEPT) return 'bg-green-100 text-green-700';
    if (status === SUPPORT_STATUS.REFERRED_TO_CARE) return 'bg-orange-100 text-orange-700';
    if (status === SUPPORT_STATUS.VISIT_SCHEDULED) return 'bg-blue-100 text-blue-700';
    if (status === SUPPORT_STATUS.REJECTED) return 'bg-red-100 text-red-700';
    if (status === SUPPORT_STATUS.FORWARDED_TO_DEPT) return 'bg-orange-100 text-orange-700';
    return 'bg-yellow-100 text-yellow-700';
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

export default function SupportView({
    supportRequests,
    setShowSupportRequestsModal,
    showSupportRequestsModal,
    selectedSupportRequest,
    setSelectedSupportRequest,
    formatFullDate,
    personalInfo,
    openSupportForm,
    showSupportModal,
    setShowSupportModal,
    onSupportSubmitted,
    showToast,
    Icons
}: any) {
    return (
        <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 page-transition">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in-up">
                <div><h2 className="text-xl sm:text-2xl font-extrabold mb-1 text-gray-800">Additional Support</h2><p className="text-sm text-gray-400">For students with disabilities or special needs</p></div>
                <button onClick={() => setShowSupportRequestsModal(true)} className="relative flex w-full sm:w-auto items-center justify-center gap-2 bg-white/90 backdrop-blur-sm border border-purple-100/50 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 hover:bg-purple-50 transition-all shadow-sm btn-press">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Your Requests
                    {supportRequests.length > 0 && <span className="bg-teal-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{supportRequests.length}</span>}
                </button>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-5 sm:p-8 shadow-sm animate-fade-in-up">
                <div className="text-center mb-6 sm:mb-8 border-b border-purple-100/50 pb-6">
                    <h2 className="font-bold text-lg sm:text-xl text-gray-900">NEGROS ORIENTAL STATE UNIVERSITY</h2>
                    <p className="text-sm text-gray-500">Office of the Campus Student Affairs and Services</p>
                    <p className="text-sm text-gray-500">Guihulngan Campus</p>
                    <h3 className="font-extrabold text-base sm:text-lg mt-4 bg-gradient-to-r from-blue-500 to-sky-400 bg-clip-text text-transparent">FORM FOR STUDENTS WHO REQUIRE ADDITIONAL SUPPORT</h3>
                </div>
                <div className="space-y-5 sm:space-y-6 text-sm text-gray-700 leading-relaxed">
                    <section><h4 className="font-bold text-gray-900 mb-2">1. We welcome your application</h4><p>We welcome applications from students with disabilities or special learning needs. By completing this form, you help us to form a clearer picture of your needs, which will enable us to see how we could support you, should you be admitted.</p><p className="mt-2">As in the case of all other applicants, first of all we consider your academic merits and whether you comply with the admission criteria for the program that you want to apply for. Then we will consider what is reasonable and practical for the specific program to which you have applied.</p></section>
                    <section><h4 className="font-bold text-gray-900 mb-2">2. We protect your information</h4><p>We will respect your privacy and keep your information confidential. However, we have to share relevant information with key academic, administrative and support staff members. They need such information to determine how we might best support you, should you be admitted for studies at NORSU-Guihulngan Campus.</p></section>
                    <section><h4 className="font-bold text-gray-900 mb-2">3. Submit this form, along with the supporting documents, to your application profile</h4><p>Please submit the completed form and all supporting documents (e.g. any copies of medical or psychological proof of your condition and/or disability) when you apply. We must receive all your documents by the closing date for applications. We cannot process your application unless we have all the necessary information.</p></section>
                    <section><h4 className="font-bold text-gray-900 mb-2">4. Should you need assistance or information</h4><p>Contact the Student Affairs and Services Office to learn about the kind of support the University offers.</p></section>
                    <section><h4 className="font-bold text-gray-900 mb-2">5. When you arrive on campus</h4><p>We present an orientation session for students with disabilities and special needs every year. It takes place at the first month of the academic year, as part of the orientation program for newcomer students.</p></section>
                    <section><h4 className="font-bold text-gray-900 mb-2">6. How can we reach you?</h4><p>When we receive your form, we send it to the faculty to which you are applying so that they can determine whether they can support you. The personal information you provide here also allows us to locate your application swiftly.</p></section>
                </div>
                <div className="mt-8 pt-6 border-t border-purple-100/50 flex justify-center">
                    <button onClick={openSupportForm} className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-400 hover:to-sky-300 transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 btn-press">
                        Proceed to Application Form <Icons.ArrowRight />
                    </button>
                </div>
            </div>

            {showSupportRequestsModal && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-50 student-mobile-modal-overlay" onClick={() => setShowSupportRequestsModal(false)}>
                    <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-fade-in-up student-mobile-modal-drawer-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex-shrink-0">
                            <div className="flex justify-between items-center">
                                <div><h3 className="text-lg font-extrabold">Your Support Requests</h3><p className="text-xs text-teal-200 mt-0.5">{supportRequests.length} total request{supportRequests.length !== 1 ? 's' : ''}</p></div>
                                <button onClick={() => setShowSupportRequestsModal(false)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-lg">×</button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {supportRequests.length === 0 ? (
                                <div className="text-center py-12"><p className="text-gray-400 text-sm">No requests found.</p></div>
                            ) : supportRequests.map((req: any, idx: number) => (
                                <div key={req.id} onClick={() => setSelectedSupportRequest(req)} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer" style={{ animationDelay: `${idx * 60}ms` }}>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
                                        <span className="text-sm font-bold bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg">{req.support_type}</span>
                                        <span className={`self-start sm:self-auto text-[10px] px-2 py-1 rounded-full font-bold uppercase ${getSupportStatusTone(req.status)}`}>{req.status}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400">{formatFullDate(new Date(req.created_at))}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {selectedSupportRequest && createPortal(
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 student-mobile-modal-overlay" onClick={() => setSelectedSupportRequest(null)}>
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-purple-100/50 animate-scale-in student-mobile-modal-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="px-5 py-4 sm:px-6 bg-gradient-to-r from-teal-600 to-emerald-700 text-white flex items-center justify-between shrink-0">
                            <h3 className="font-extrabold text-base sm:text-lg">Support Request Details</h3>
                            <button onClick={() => setSelectedSupportRequest(null)} className="text-white hover:text-teal-200">×</button>
                        </div>
                        <div className="p-5 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Current Status</p>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${getSupportStatusTone(selectedSupportRequest.status)}`}>
                                        {selectedSupportRequest.status}
                                    </span>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Date Submitted</p>
                                    <p className="text-sm font-medium">{formatFullDate(new Date(selectedSupportRequest.created_at))}</p>
                                </div>
                            </div>

                            {(() => {
                                const isDeptResolved = selectedSupportRequest.status === SUPPORT_STATUS.RESOLVED_BY_DEPT;
                                const isCompleted = selectedSupportRequest.status === SUPPORT_STATUS.COMPLETED;
                                let resolutionText = '';
                                let resolvedBy = '';

                                if (isDeptResolved && selectedSupportRequest.dept_notes) {
                                    try {
                                        const parsed = JSON.parse(selectedSupportRequest.dept_notes);
                                        if (!parsed.referred_by) {
                                            resolutionText = selectedSupportRequest.dept_notes;
                                        }
                                    } catch {
                                        resolutionText = selectedSupportRequest.dept_notes;
                                    }
                                    resolvedBy = 'Department Head / Dean';
                                } else if (isCompleted && selectedSupportRequest.resolution_notes) {
                                    resolutionText = selectedSupportRequest.resolution_notes;
                                    resolvedBy = 'CARE Staff';
                                }

                                if (!resolutionText) return null;

                                return (
                                    <details className="rounded-xl overflow-hidden border border-emerald-200 shadow-sm group">
                                        <summary className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
                                            <div className="flex items-center gap-2 text-white">
                                                <Icons.CheckCircle />
                                                <span className="font-bold text-sm">Resolution Letter</span>
                                                <svg className="w-4 h-4 text-white/70 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-100 bg-white/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                                {isDeptResolved ? 'Resolved' : 'Completed'}
                                            </span>
                                        </summary>
                                        <div className="bg-emerald-50/50 p-5 space-y-3">
                                            <div className="flex items-center gap-2 text-xs text-emerald-800">
                                                <span className="font-bold uppercase tracking-wider">From:</span>
                                                <span className="font-semibold bg-white px-2.5 py-1 rounded-lg border border-emerald-100">{resolvedBy}</span>
                                            </div>
                                            <div className="bg-white rounded-xl p-5 border border-emerald-100 shadow-sm">
                                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{resolutionText}</p>
                                            </div>
                                            <p className="text-[10px] text-emerald-600 font-medium text-right italic">
                                                Your support request has been addressed. Contact the office if you have further concerns.
                                            </p>
                                        </div>
                                    </details>
                                );
                            })()}

                            {getSupportScheduledDate(selectedSupportRequest) && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <p className="text-xs font-bold text-blue-800 uppercase mb-1">Department Visit Schedule</p>
                                    <p className="text-sm text-blue-900">{getSupportScheduledDate(selectedSupportRequest)}</p>
                                </div>
                            )}

                            <hr className="border-gray-200" />
                            <h4 className="font-bold text-sm text-blue-800 uppercase tracking-wider opacity-80">Original Request Form</h4>

                            <section className="bg-gray-50 p-4 rounded-xl border border-gray-100 opacity-90 pointer-events-none">
                                <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Student Information</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold">{personalInfo.firstName} {personalInfo.lastName}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold">{new Date(selectedSupportRequest.created_at).toLocaleDateString()}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold">{personalInfo.dob}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Program - Year Level</label><div className="font-semibold">{personalInfo.course} - {personalInfo.year}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Cell Phone Number</label><div className="font-semibold">{personalInfo.mobile}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Email Address</label><div className="font-semibold">{personalInfo.email}</div></div>
                                    <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold">{personalInfo.address}</div></div>
                                </div>
                            </section>

                            <section className="opacity-90 pointer-events-none">
                                <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">Category</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {['Persons with Disabilities (PWDs)', 'Indigenous Peoples (IPs) & Cultural Communities', 'Working Students', 'Economically Challenged Students', 'Students with Special Learning Needs', 'Rebel Returnees', 'Orphans', 'Senior Citizens', 'Homeless Students', 'Solo Parenting', 'Pregnant Women', 'Women in Especially Difficult Circumstances'].map((cat) => (
                                        <label key={cat} className="flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={(selectedSupportRequest.support_type || '').includes(cat)} readOnly className="w-4 h-4 text-blue-600 rounded" /> {cat}</label>
                                    ))}
                                    {selectedSupportRequest.support_type?.includes('Other:') && (() => {
                                        const match = selectedSupportRequest.support_type.match(/Other:\s*(.+)$/);
                                        return match ? (
                                            <div className="col-span-1 sm:col-span-2 flex flex-col items-start gap-2 mt-2 sm:flex-row sm:items-center">
                                                <input type="checkbox" checked readOnly className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="text-sm text-gray-600">Others, specify:</span>
                                                <input value={match[1]} readOnly className="border-b border-gray-300 px-2 py-1 text-sm flex-1 bg-transparent text-gray-600" />
                                            </div>
                                        ) : null;
                                    })()}
                                </div>
                            </section>

                            <section className="opacity-90 pointer-events-none">
                                <h4 className="font-bold text-sm text-blue-800 mb-4 uppercase tracking-wider">A. Your Studies</h4>
                                <div className="space-y-3">
                                    <div><label className="block text-xs font-bold text-gray-500">1st Priority</label><input disabled value={personalInfo.priorityCourse} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500">2nd Priority</label><input disabled value={personalInfo.altCourse1} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500">3rd Priority</label><input disabled value={personalInfo.altCourse2} className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700" /></div>
                                </div>
                            </section>

                            <section className="opacity-90 pointer-events-none">
                                <h4 className="font-bold text-sm text-blue-800 mb-2 uppercase tracking-wider">B. Particulars of your disability or special learning need</h4>
                                <div className="space-y-4 mt-4">
                                    {(() => {
                                        const desc = selectedSupportRequest.description || '';
                                        let q1 = '';
                                        let q2 = '';
                                        let q3 = '';
                                        let q4 = '';
                                        if (desc.includes('[Q1 Description]:')) {
                                            const getPart = (startToken: string, endToken: string | null) => {
                                                const start = desc.indexOf(startToken);
                                                if (start === -1) return '';
                                                const end = endToken ? desc.indexOf(endToken, start) : -1;
                                                return end === -1 ? desc.substring(start + startToken.length).trim() : desc.substring(start + startToken.length, end).trim();
                                            };
                                            q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
                                            q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
                                            q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
                                            q4 = getPart('[Q4 Other Needs]:', null);
                                        } else {
                                            q1 = desc;
                                        }
                                        return (
                                            <>
                                                <div><label className="block text-xs font-bold text-gray-700 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</label><textarea rows={2} value={q1} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                <div><label className="block text-xs font-bold text-gray-700 mb-1">2. What kind of support did you receive at your previous school?</label><textarea rows={2} value={q2} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                <div><label className="block text-xs font-bold text-gray-700 mb-1">3. What support or assistance do you require from NORSU-Guihulngan Campus to enable you to fully participate in campus activities...?</label><textarea rows={3} value={q3} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                                <div><label className="block text-xs font-bold text-gray-700 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</label><textarea rows={2} value={q4} readOnly className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-none"></textarea></div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </section>

                            {selectedSupportRequest.documents_url && (() => {
                                const urls = getStoredAssetEntries(selectedSupportRequest.documents_url);
                                return urls.length > 0 ? (
                                    <section className="mt-2">
                                        <h4 className="font-bold text-sm text-blue-800 mb-3 uppercase tracking-wider">Supporting Documents</h4>
                                        <div className="space-y-2">
                                            {urls.map((url: string, idx: number) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={async () => {
                                                        try {
                                                            await openStoredAsset('support_documents', url);
                                                        } catch (error: any) {
                                                            showToast?.(error.message || 'Unable to open the selected document.', 'error');
                                                        }
                                                    }}
                                                    className="group flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-left hover:bg-blue-100 transition-colors"
                                                >
                                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200 transition-colors">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-blue-700 truncate">Document {idx + 1}</p>
                                                        <p className="text-xs text-blue-500 truncate">{getStoredAssetLabel(url)}</p>
                                                    </div>
                                                    <svg className="w-4 h-4 text-blue-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                ) : null;
                            })()}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 text-left sm:text-right">
                            <button onClick={() => setSelectedSupportRequest(null)} className="w-full sm:w-auto px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 font-bold text-sm shadow-sm transition-all focus:ring-2 focus:ring-teal-500 focus:outline-none focus:ring-offset-1">Close</button>
                        </div>
                    </div>
                </div>,
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
