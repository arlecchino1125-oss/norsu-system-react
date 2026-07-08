import React from 'react';
import { XCircle, MapPin } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { COUNSELING_STATUS, getCounselingScheduledDate, isCounselingAwaitingDept, isWithCareStaffCounseling } from '../../../../../utils/workflow';

export function DeptViewFormModal(props: any) {
    const { showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff, referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral, referralSearchQuery, setReferralSearchQuery, sigCanvasRef, data, showEventAttendees, setShowEventAttendees, deptAttendees, yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter, deptSectionFilter, setDeptSectionFilter, exportToExcel, showStudentModal, setShowStudentModal, selectedStudent, viewFormRecord, setViewFormRecord, viewFormMode, setViewFormMode } = props;
    return (<>
        {/* View Form Modal — Same as Care Staff: Student Form or Referral Form */}
            {
                showStudentModal && selectedStudent && (
                    <div className="fixed inset-0 bg-transparent z-[105] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">Student Basic Information</h3>
                                    <p className="text-sm text-gray-500">Read-only student profile for department viewing</p>
                                </div>
                                <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <XCircle size={24} />
                                </button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                                        {(selectedStudent.name || selectedStudent.first_name || 'S').charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">
                                            {selectedStudent.name || [
                                                selectedStudent.first_name,
                                                selectedStudent.middle_name,
                                                selectedStudent.last_name,
                                                selectedStudent.suffix
                                            ].filter(Boolean).join(' ')}
                                        </h4>
                                        <p className="text-sm text-gray-500">{selectedStudent.email || 'No email provided'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Student ID No.</label><input readOnly value={selectedStudent.student_id || selectedStudent.id || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Status</label><input readOnly value={selectedStudent.status || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">College</label><input readOnly value={selectedStudent.department || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Program</label><input readOnly value={selectedStudent.course || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Year Level</label><input readOnly value={selectedStudent.year_level || selectedStudent.year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Section</label><input readOnly value={selectedStudent.section || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input readOnly value={selectedStudent.mobile || selectedStudent.contact_number || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Sex Assigned at Birth</label><input readOnly value={selectedStudent.sex || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Permanent Address</label>
                                    <textarea
                                        readOnly
                                        rows={3}
                                        value={[selectedStudent.street, selectedStudent.city, selectedStudent.province, selectedStudent.zip_code, selectedStudent.region].filter(Boolean).join(', ')}
                                        className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed resize-none"
                                    />
                                </div>
                            </div>
                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowStudentModal(false)} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                viewFormRecord && (
                    <div className="fixed inset-0 bg-transparent z-[110] flex items-center justify-center p-4">
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
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewFormRecord.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'bg-indigo-100 text-indigo-700' : isWithCareStaffCounseling(viewFormRecord.status) ? 'bg-purple-100 text-purple-700' : viewFormRecord.status === COUNSELING_STATUS.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{viewFormRecord.status === COUNSELING_STATUS.REFERRED ? 'Forwarded' : viewFormRecord.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'With CARE Staff' : viewFormRecord.status}</span>
                                                <button onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                        </div>
                                        {/* Student info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input readOnly value={viewFormRecord.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={viewFormRecord.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Student Contact Number</label><input readOnly value={viewFormRecord.contact_number || 'N/A'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Request Type</label><input readOnly value={viewFormRecord.request_type || 'Dean Referral'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
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
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${viewFormRecord.status === COUNSELING_STATUS.COMPLETED ? 'bg-green-100 text-green-700' : viewFormRecord.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'bg-indigo-100 text-indigo-700' : viewFormRecord.status === COUNSELING_STATUS.REFERRED ? 'bg-purple-100 text-purple-700' : viewFormRecord.status === COUNSELING_STATUS.SCHEDULED ? 'bg-blue-100 text-blue-700' : viewFormRecord.status === COUNSELING_STATUS.REJECTED ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{isCounselingAwaitingDept(viewFormRecord.status) ? 'Pending Review' : viewFormRecord.status === COUNSELING_STATUS.REFERRED ? 'Forwarded' : viewFormRecord.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'With CARE Staff' : viewFormRecord.status}</span>
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
                                        {getCounselingScheduledDate(viewFormRecord) && (
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-3"><p className="text-xs font-bold text-blue-800 uppercase mb-1">Scheduled Session</p><p className="text-sm font-semibold text-blue-900">{new Date(getCounselingScheduledDate(viewFormRecord) as string).toLocaleString()}</p></div>
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

            
    </>);
}