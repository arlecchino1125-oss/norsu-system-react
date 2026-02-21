import { XCircle } from 'lucide-react';

const DeptCounselingQueuePage = ({
    counselingRequests,
    counselingTab,
    setCounselingTab,
    cascadeFilterBar,
    matchesCascadeFilters,
    getStudentForRequest,
    selectedCounselingReq,
    setSelectedCounselingReq,
    showCounselingViewModal,
    setShowCounselingViewModal,
    showScheduleModal,
    setShowScheduleModal,
    showRejectModal,
    setShowRejectModal,
    scheduleData,
    setScheduleData,
    rejectNotes,
    setRejectNotes,
    handleApproveAndSchedule,
    handleRejectRequest,
    handleCompleteRequest,
    handleStartForward
}: any) => {
    return (
        <>
            {/* COUNSELING QUEUE */}
            <div className="space-y-6 animate-fade-in">
                {/* Cascade Filters */}
                <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm">
                    {cascadeFilterBar}
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Pending Review', count: counselingRequests.filter(r => r.status === 'Submitted').length, color: 'amber', tab: 'Submitted' },
                        { label: 'Scheduled', count: counselingRequests.filter(r => r.status === 'Scheduled').length, color: 'blue', tab: 'Scheduled' },
                        { label: 'Completed', count: counselingRequests.filter(r => r.status === 'Completed').length, color: 'green', tab: 'Completed' },
                        { label: 'Forwarded', count: counselingRequests.filter(r => r.status === 'Referred').length, color: 'purple', tab: 'Referred' },
                        { label: 'Rejected', count: counselingRequests.filter(r => r.status === 'Rejected').length, color: 'red', tab: 'Rejected' }
                    ].map(stat => (
                        <button key={stat.tab} onClick={() => setCounselingTab(stat.tab)} className={`p-4 rounded-xl border text-left transition-all ${counselingTab === stat.tab ? `bg-${stat.color}-50 border-${stat.color}-200 shadow-sm` : 'bg-white/80 border-gray-100 hover:border-gray-200'}`}>
                            <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                            <p className={`text-2xl font-extrabold ${counselingTab === stat.tab ? `text-${stat.color}-600` : 'text-gray-900'}`}>{stat.count}</p>
                        </button>
                    ))}
                </div>

                {/* Request Cards */}
                <div className="space-y-3">
                    {counselingRequests.filter(r => r.status === counselingTab).length === 0 ? (
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-12 text-center">
                            <p className="text-gray-400 text-sm">No {counselingTab.toLowerCase()} requests found.</p>
                        </div>
                    ) : counselingRequests.filter(r => r.status === counselingTab).filter(r => matchesCascadeFilters(getStudentForRequest(r))).map((req, idx) => (
                        <div key={req.id} onClick={() => { setSelectedCounselingReq(req); setShowCounselingViewModal(true); }} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">{req.student_name.charAt(0)}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{req.student_name}</h4>
                                        {req.course_year && <p className="text-xs text-gray-500">{req.course_year}</p>}
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{req.reason_for_referral || req.description || 'No reason provided'}</p>
                                        <p className="text-[10px] text-gray-400 mt-2">{new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4 flex-shrink-0">
                                    {req.status === 'Submitted' && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedCounselingReq(req); setShowScheduleModal(true); }} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors" title="Approve & Schedule">✓ Schedule</button>
                                            <button onClick={(e) => { e.stopPropagation(); setSelectedCounselingReq(req); setShowRejectModal(true); }} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors" title="Reject">✗ Reject</button>
                                        </>
                                    )}
                                    {req.status === 'Scheduled' && (
                                        <>
                                            <button onClick={(e) => { e.stopPropagation(); handleCompleteRequest(req); }} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">✓ Complete</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleStartForward(req); }} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors">→ Forward</button>
                                        </>
                                    )}
                                    {req.scheduled_date && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-semibold">{new Date(req.scheduled_date).toLocaleDateString()}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Counseling View Modal — Read-only Self-Referral Form */}
            {showCounselingViewModal && selectedCounselingReq && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL FOR COUNSELING FORM</h3>
                                    <p className="text-xs text-gray-400 mt-1">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                    <p className="text-[10px] text-gray-400 mt-1">Submitted: {new Date(selectedCounselingReq.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${selectedCounselingReq.status === 'Submitted' ? 'bg-amber-100 text-amber-700' : selectedCounselingReq.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : selectedCounselingReq.status === 'Referred' ? 'bg-purple-100 text-purple-700' : selectedCounselingReq.status === 'Completed' ? 'bg-green-100 text-green-700' : selectedCounselingReq.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{selectedCounselingReq.status === 'Submitted' ? 'Pending Review' : selectedCounselingReq.status}</span>
                                    <button onClick={() => setShowCounselingViewModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                                </div>
                            </div>
                            {/* Read-only form fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input readOnly value={selectedCounselingReq.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={selectedCounselingReq.course_year || 'N/A'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input readOnly value={selectedCounselingReq.contact_number || 'N/A'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling</label>
                                <textarea readOnly rows={4} value={selectedCounselingReq.reason_for_referral || selectedCounselingReq.description || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                                <textarea readOnly rows={3} value={selectedCounselingReq.personal_actions_taken || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                                <textarea readOnly rows={2} value={selectedCounselingReq.date_duration_of_concern || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                            </div>
                            {/* Signature (shown for referred requests) */}
                            {selectedCounselingReq.referrer_signature && (
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Name and Signature of the Referring Person</label>
                                    <div className="bg-white border-2 border-dashed border-purple-200 rounded-xl p-4 flex flex-col items-center">
                                        <img src={selectedCounselingReq.referrer_signature} alt="Referrer Signature" className="max-h-24 object-contain" />
                                        <div className="w-48 border-t border-gray-400 mt-2 pt-1 text-center">
                                            <p className="text-sm font-bold text-gray-800">{selectedCounselingReq.referred_by}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Status-specific info */}
                            {selectedCounselingReq.scheduled_date && (
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-3"><p className="text-xs font-bold text-blue-800 uppercase mb-1">Scheduled Session</p><p className="text-sm font-semibold text-blue-900">{new Date(selectedCounselingReq.scheduled_date).toLocaleString()}</p></div>
                            )}
                            {selectedCounselingReq.referred_by && (
                                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-3"><p className="text-xs font-bold text-purple-800 uppercase mb-1">Forwarded by</p><p className="text-sm font-semibold text-purple-900">{selectedCounselingReq.referred_by}</p></div>
                            )}
                        </div>
                        {/* Action buttons */}
                        <div className="p-6 border-t border-gray-100 flex flex-wrap gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                            {selectedCounselingReq.status === 'Submitted' && (
                                <>
                                    <button onClick={() => { setShowCounselingViewModal(false); setShowScheduleModal(true); }} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-200/50 hover:shadow-xl transition-all">Approve & Schedule</button>
                                    <button onClick={() => { setShowCounselingViewModal(false); setShowRejectModal(true); }} className="flex-1 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-sm hover:bg-red-100 transition-all">Reject</button>
                                </>
                            )}
                            {selectedCounselingReq.status === 'Scheduled' && (
                                <>
                                    <button onClick={() => handleCompleteRequest(selectedCounselingReq)} className="flex-1 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-200/50 hover:shadow-xl transition-all">Mark as Completed</button>
                                    <button onClick={() => handleStartForward(selectedCounselingReq)} className="flex-1 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all">Forward to CARE Staff</button>
                                </>
                            )}
                            <button onClick={() => setShowCounselingViewModal(false)} className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && selectedCounselingReq && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Approve & Schedule Session</h3>
                            <button onClick={() => setShowScheduleModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                        </div>
                        <form onSubmit={handleApproveAndSchedule} className="p-6 space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <p className="text-sm font-bold text-emerald-900">{selectedCounselingReq.student_name}</p>
                                <p className="text-xs text-emerald-700 mt-1 line-clamp-2">{selectedCounselingReq.reason_for_referral || selectedCounselingReq.description}</p>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Session Date <span className="text-red-400">*</span></label><input type="date" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Session Time <span className="text-red-400">*</span></label><input type="time" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm" required /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Notes (Optional)</label><textarea value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })} className="w-full px-4 py-2 border rounded-xl text-sm h-20" placeholder="Additional instructions for the student..."></textarea></div>
                            <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg shadow-emerald-200/50 transition-all">Approve & Schedule</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedCounselingReq && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Reject Request</h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                <p className="text-sm font-bold text-red-900">{selectedCounselingReq.student_name}</p>
                                <p className="text-xs text-red-700 mt-1 line-clamp-2">{selectedCounselingReq.reason_for_referral || selectedCounselingReq.description}</p>
                            </div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Reason for Rejection (Optional)</label><textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-sm h-24" placeholder="Explain why this request is being rejected..."></textarea></div>
                            <div className="flex gap-3">
                                <button onClick={handleRejectRequest} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all">Reject Request</button>
                                <button onClick={() => setShowRejectModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeptCounselingQueuePage;
