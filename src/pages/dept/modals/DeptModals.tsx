import React from 'react';
import { XCircle, MapPin } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';

export function renderDeptModals(props: any) {
    const {
        data,
        counselingRequests,
        showProfileModal, setShowProfileModal, profileForm, setProfileForm, handleProfileSubmit,
        showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff,
        referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq,
        referralSearchQuery, setReferralSearchQuery, sigCanvasRef,
        showHistoryModal, setShowHistoryModal, selectedHistoryStudent, exportPDF,
        showStudentModal, setShowStudentModal, selectedStudent,
        showEventAttendees, setShowEventAttendees, deptAttendees,
        yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
        deptSectionFilter, setDeptSectionFilter, exportToExcel,
        showDecisionModal, setShowDecisionModal, decisionData, setDecisionData, submitDecision,
        showApplicantScheduleModal, setShowApplicantScheduleModal, applicantScheduleData, setApplicantScheduleData, confirmApplicantSchedule,
        viewFormRecord, setViewFormRecord,
        viewFormMode, setViewFormMode
    } = props;

    return (
        <>
            {/* Applicant Scheduling Modal */}
            {showApplicantScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Schedule Department Interview</h3>
                            <button onClick={() => setShowApplicantScheduleModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={confirmApplicantSchedule} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Interview Date</label>
                                <input required type="date" value={applicantScheduleData.date} onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Interview Time</label>
                                <input required type="time" value={applicantScheduleData.time} onChange={(e) => setApplicantScheduleData({ ...applicantScheduleData, time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Confirm Schedule</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Profile Modal */}
            {
                showProfileModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Edit Profile</h3>
                                <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Name</label><input value={profileForm.name || ''} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div>
                                <div><label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Department</label><input value={profileForm.department || ''} disabled className="w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400" /></div>
                                <button type="submit" className="w-full py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700">Save Changes</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Referral Modal — NORSU Counseling Referral Form */}
            {
                showReferralModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                                <div>
                                    <h3 className="font-bold text-lg">{forwardingToStaff ? 'Forward to CARE Staff — Referral Form' : 'NORSU Counseling Referral Form'}</h3>
                                    <p className="text-xs text-gray-400">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                </div>
                                <button onClick={() => { setShowReferralModal(false); setForwardingToStaff(false); }} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
                            </div>
                            <form onSubmit={handleReferralSubmit} className="p-6 space-y-5">
                                {/* Student Selection (only for direct referrals) */}
                                {!forwardingToStaff && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Name of Student <span className="text-red-400">*</span></label>
                                        <div className="relative">
                                            <input type="text" value={referralSearchQuery} onChange={(e) => { setReferralSearchQuery(e.target.value); if (referralForm.student) setReferralForm({ ...referralForm, student: '' }); }} placeholder="Search student name..." className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                                            {referralSearchQuery && !referralForm.student && (
                                                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto z-20">
                                                    {(data?.students || []).filter((s: any) => s.name.toLowerCase().includes(referralSearchQuery.toLowerCase())).slice(0, 8).map((s: any) => (
                                                        <button key={s.id} type="button" onClick={() => { setReferralForm({ ...referralForm, student: s.name }); setReferralSearchQuery(s.name); }} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm border-b border-gray-50 last:border-0">
                                                            <span className="font-bold">{s.name}</span><span className="text-gray-400 ml-2 text-xs">{s.course} - {s.year}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Auto-filled student info */}
                                {(forwardingToStaff || referralForm.student) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Name of Student</p><p className="text-sm font-semibold text-gray-900">{referralForm.student}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Course & Year</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = (data?.students || []).find((st: any) => st.name === referralForm.student); return s ? `${s.course || ''} - ${s.year || ''}` : (selectedCounselingReq?.course_year || 'N/A'); })()}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Contact Number</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = (data?.students || []).find((st: any) => st.name === referralForm.student); return s?.mobile || selectedCounselingReq?.contact_number || 'N/A'; })()}</p></div>
                                    </div>
                                )}

                                {/* Referrer Info (auto-filled) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Referred by</label><input readOnly value={data?.profile?.name || ''} className="w-full px-4 py-2.5 border rounded-xl text-sm bg-gray-100 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Referrer Contact Number</label><input value={referralForm.referrer_contact_number} onChange={e => setReferralForm({ ...referralForm, referrer_contact_number: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" placeholder="Your contact number" /></div>
                                    <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-500 mb-1">Relationship with Student</label><input value={referralForm.relationship_with_student} onChange={e => setReferralForm({ ...referralForm, relationship_with_student: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" placeholder="e.g. Dean, Faculty Adviser" /></div>
                                </div>

                                {/* Reason for Referral */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Reason for Referral <span className="text-red-400">*</span></label>
                                    <textarea value={referralForm.reason_for_referral} onChange={e => setReferralForm({ ...referralForm, reason_for_referral: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-28" placeholder="Describe the reason for referring this student..." required></textarea>
                                </div>

                                {/* Actions Made */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Actions Made by Referring Person</label>
                                    <textarea value={referralForm.actions_made} onChange={e => setReferralForm({ ...referralForm, actions_made: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-24" placeholder="What actions have you taken before referring this student?"></textarea>
                                </div>

                                {/* Date/Duration of Observations */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Observations</label>
                                    <textarea value={referralForm.date_duration_of_observations} onChange={e => setReferralForm({ ...referralForm, date_duration_of_observations: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-20" placeholder="e.g. Observed since February 2026, approximately 2 weeks"></textarea>
                                </div>

                                {/* Signature Pad */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Name and Signature of the Referring Person <span className="text-red-400">*</span></label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                                        <SignatureCanvas
                                            ref={sigCanvasRef}
                                            penColor="#1a1a2e"
                                            canvasProps={{ className: 'w-full', style: { width: '100%', height: '150px' } }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <p className="text-[10px] text-gray-400">Draw your signature above</p>
                                        <button type="button" onClick={() => sigCanvasRef.current?.clear()} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear Signature</button>
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg shadow-emerald-200/50 transition-all">{forwardingToStaff ? 'Forward to CARE Staff' : 'Submit Referral'}</button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                showHistoryModal && selectedHistoryStudent && (() => {
                    const studentRecords = (counselingRequests || []).filter((r: any) => r.student_name === selectedHistoryStudent.student_name);
                    return (
                        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl dark:bg-gray-800">
                                <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                    <div>
                                        <h3 className="font-bold text-lg dark:text-white">Case History: {selectedHistoryStudent.student_name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">ID: {selectedHistoryStudent.student_id}</p>
                                    </div>
                                    <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                    {studentRecords.map((record: any, i: any) => (
                                        <div key={i} className="relative pl-8 border-l-2 border-gray-200 dark:border-gray-700">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-white dark:border-gray-800"></div>
                                            <div className="mb-1 flex justify-between">
                                                <span className="font-bold text-gray-900 dark:text-white">{record.request_type}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(record.created_at).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2 dark:text-gray-300">{record.reason_for_referral || record.description}</p>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${record.status === 'Completed' ? 'bg-green-100 text-green-700' : record.status === 'Referred' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>{record.status}</span>
                                            {/* Per-record action buttons */}
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <button onClick={() => { setViewFormRecord(record); setViewFormMode('student'); }} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200">View Student Form</button>
                                                {record.referred_by && (
                                                        <button onClick={() => { setViewFormRecord(record); setViewFormMode('referral'); }} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200">View Forwarded Form</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {studentRecords.length === 0 && <p className="text-center text-gray-400 py-4">No records found.</p>}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* View Form Modal — Same as Care Staff: Student Form or Referral Form */}
            {
                viewFormRecord && (
                    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50">
                            <div className="p-8">
                                {/* Referral Form View */}
                                {viewFormRecord.referred_by && viewFormMode === 'referral' ? (
                                    <>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h3 className="font-extrabold text-lg">DEAN'S REFERRAL FORM</h3>
                                                <p className="text-xs text-gray-400 mt-1">Referral submitted for counseling intervention</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Submitted: {new Date(viewFormRecord.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewFormRecord.status === 'Referred' ? 'bg-purple-100 text-purple-700' : viewFormRecord.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{viewFormRecord.status === 'Referred' ? 'Forwarded' : viewFormRecord.status}</span>
                                                <button onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                        </div>
                                        {/* Student info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input readOnly value={viewFormRecord.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={viewFormRecord.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        {/* Referral details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Referred by</label><input readOnly value={viewFormRecord.referred_by || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Referrer Contact Number</label><input readOnly value={viewFormRecord.referrer_contact_number || 'N/A'} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Relationship with Student</label><input readOnly value={viewFormRecord.relationship_with_student || 'N/A'} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Referral</label>
                                            <textarea readOnly rows={4} value={viewFormRecord.reason_for_referral || viewFormRecord.description || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Actions Made by Referrer</label>
                                            <textarea readOnly rows={3} value={viewFormRecord.actions_made || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Observations</label>
                                            <textarea readOnly rows={2} value={viewFormRecord.date_duration_of_observations || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        {viewFormRecord.referrer_signature && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Name and Signature of the Referring Person</label>
                                                <div className="bg-white border-2 border-dashed border-purple-200 rounded-xl p-4 flex flex-col items-center">
                                                    <img src={viewFormRecord.referrer_signature} alt="Referrer Signature" className="max-h-24 object-contain" />
                                                    <div className="w-48 border-t border-gray-400 mt-2 pt-1 text-center">
                                                        <p className="text-sm font-bold text-gray-800">{viewFormRecord.referred_by}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {viewFormRecord.resolution_notes && (
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-3"><p className="text-xs font-bold text-green-800 uppercase mb-1">Resolution Notes</p><p className="text-sm text-green-900">{viewFormRecord.resolution_notes}</p></div>
                                        )}
                                        <div className="flex gap-3 mt-4">
                                            <button onClick={() => setViewFormMode('student')} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">View Student Form</button>
                                        </div>
                                    </>
                                ) : (
                                    /* Student Self-Referral Form view */
                                    <>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL FOR COUNSELING FORM</h3>
                                                <p className="text-xs text-gray-400 mt-1">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                                <p className="text-[10px] text-gray-400 mt-1">Submitted: {new Date(viewFormRecord.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewFormRecord.status === 'Completed' ? 'bg-green-100 text-green-700' : viewFormRecord.status === 'Referred' ? 'bg-purple-100 text-purple-700' : viewFormRecord.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : viewFormRecord.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{viewFormRecord.status === 'Submitted' ? 'Pending Review' : viewFormRecord.status === 'Referred' ? 'Forwarded' : viewFormRecord.status}</span>
                                                <button onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input readOnly value={viewFormRecord.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={viewFormRecord.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input readOnly value={viewFormRecord.contact_number || 'Not set'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling</label>
                                            <textarea readOnly rows={4} value={viewFormRecord.reason_for_referral || viewFormRecord.description || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                                            <textarea readOnly rows={3} value={viewFormRecord.personal_actions_taken || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                                            <textarea readOnly rows={2} value={viewFormRecord.date_duration_of_concern || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        {viewFormRecord.scheduled_date && (
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-3"><p className="text-xs font-bold text-blue-800 uppercase mb-1">Scheduled Session</p><p className="text-sm font-semibold text-blue-900">{new Date(viewFormRecord.scheduled_date).toLocaleString()}</p></div>
                                        )}
                                        {viewFormRecord.resolution_notes && (
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-3"><p className="text-xs font-bold text-green-800 uppercase mb-1">Resolution Notes</p><p className="text-sm text-green-900">{viewFormRecord.resolution_notes}</p></div>
                                        )}
                                        {viewFormRecord.referred_by && (
                                            <button onClick={() => setViewFormMode('referral')} className="w-full mt-2 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all flex items-center justify-center gap-2">View Referral Form</button>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                                <button onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Attendees Modal - Enhanced */}
            {
                showEventAttendees && (() => {
                    const yearLevels = [...new Set(deptAttendees.map((a: any) => a.year_level).filter(Boolean))].sort();
                    const attCourses = [...new Set(deptAttendees.map((a: any) => a.course).filter(Boolean))].sort();
                    const attSections = [...new Set(deptAttendees.map((a: any) => a.section).filter(Boolean))].sort();
                    let filtered = deptAttendees;
                    if (yearLevelFilter !== 'All') filtered = filtered.filter((a: any) => a.year_level === yearLevelFilter);
                    if (deptCourseFilter !== 'All') filtered = filtered.filter((a: any) => a.course === deptCourseFilter);
                    if (deptSectionFilter !== 'All') filtered = filtered.filter((a: any) => a.section === deptSectionFilter);
                    const completedCount = deptAttendees.filter((a: any) => a.time_out).length;

                    return (
                        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 animate-backdrop">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-scale-in">
                                <div className="p-6 border-b bg-gray-50 rounded-t-2xl dark:bg-gray-700 dark:border-gray-600">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">Attendees List</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{showEventAttendees.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => {
                                                if (filtered.length === 0) return;
                                                const headers = ['Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
                                                const rows = filtered.map((a: any) => [
                                                    a.student_name,
                                                    a.department || '',
                                                    a.course || '',
                                                    a.year_level || '',
                                                    a.section || '',
                                                    new Date(a.time_in).toLocaleString(),
                                                    a.time_out ? new Date(a.time_out).toLocaleString() : '-',
                                                    a.time_out ? 'Completed' : 'Still In'
                                                ]);
                                                exportToExcel(headers, rows, `${showEventAttendees.title}_attendees`);
                                            }} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500">
                                                Export Excel
                                            </button>
                                            <button onClick={() => { setShowEventAttendees(null); setYearLevelFilter('All'); setDeptCourseFilter('All'); setDeptSectionFilter('All'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs mb-3">
                                        <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-bold dark:bg-blue-900/30 dark:text-blue-300">{deptAttendees.length} Total</span>
                                        <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold dark:bg-green-900/30 dark:text-green-300">{completedCount} Completed</span>
                                        <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full font-bold dark:bg-yellow-900/30 dark:text-yellow-300">{deptAttendees.length - completedCount} Still In</span>
                                    </div>
                                    {yearLevels.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Year:</span>
                                            <button onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>All</button>
                                            {yearLevels.map((yl: any) => {
                                                const count = deptAttendees.filter((a: any) => a.year_level === yl).length;
                                                return <button key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>{yl} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attCourses.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Course:</span>
                                            <button onClick={() => setDeptCourseFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === 'All' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attCourses.map((c: any) => {
                                                const count = deptAttendees.filter((a: any) => a.course === c).length;
                                                return <button key={c} onClick={() => setDeptCourseFilter(c)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{c} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attSections.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Section:</span>
                                            <button onClick={() => setDeptSectionFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attSections.map((s: any) => {
                                                const count = deptAttendees.filter((a: any) => a.section === s).length;
                                                return <button key={s} onClick={() => setDeptSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === s ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>Sec {s} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className="p-0 overflow-y-auto flex-1 bg-white dark:bg-gray-800">
                                    {filtered.length === 0 ? <p className="text-center py-8 text-gray-500 dark:text-gray-400">No attendees yet.</p> : (
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 dark:bg-gray-700 dark:text-gray-300">
                                                <tr>
                                                    <th className="px-6 py-3">Student</th>
                                                    <th className="px-6 py-3">Course</th>
                                                    <th className="px-6 py-3">Year / Sec</th>
                                                    <th className="px-6 py-3">Time In</th>
                                                    <th className="px-6 py-3">Time Out</th>
                                                    <th className="px-6 py-3">Location</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {filtered.map((att: any, i: any) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <td className="px-6 py-3">
                                                            <p className="font-bold text-gray-900 dark:text-white">{att.student_name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{att.department}</p>
                                                        </td>
                                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium dark:text-gray-400">{att.course || '-'}</td>
                                                        <td className="px-6 py-3 text-gray-600 text-xs font-medium dark:text-gray-400">{att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}</td>
                                                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">{new Date(att.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                        <td className="px-6 py-3">{att.time_out ? <span className="text-green-600 font-medium dark:text-green-400">{new Date(att.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> : <span className="text-yellow-600 text-xs font-bold dark:text-yellow-400">Still In</span>}</td>
                                                        <td className="px-6 py-3 text-xs">
                                                            {att.latitude ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 dark:text-blue-400"><MapPin size={12} />Map</a> : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            }

            {/* Decision Modal */}
            {
                showDecisionModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md dark:bg-gray-800">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center dark:border-gray-700">
                                <h3 className="font-bold text-lg dark:text-white">Confirm {decisionData.type}</h3>
                                <button onClick={() => setShowDecisionModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    Are you sure you want to <strong>{decisionData.type}</strong> this request?
                                    {decisionData.type === 'Approved' ? ' This will refer it back to CARE Staff for final processing.' : ' This will close the request.'}
                                </p>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1 dark:text-gray-300">Notes / Remarks</label>
                                    <textarea value={decisionData.notes} onChange={e => setDecisionData({ ...decisionData, notes: e.target.value })} className="w-full px-4 py-2 border rounded-lg h-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white" required></textarea>
                                </div>
                                <button onClick={submitDecision} className={`w-full py-2 text-white rounded-lg font-bold ${decisionData.type === 'Approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                    Confirm {decisionData.type}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
