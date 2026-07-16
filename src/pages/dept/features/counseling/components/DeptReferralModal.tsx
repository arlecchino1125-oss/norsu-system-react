import React from 'react';
import { XCircle, MapPin } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { COUNSELING_STATUS, getCounselingScheduledDate, isCounselingAwaitingDept, isWithCareStaffCounseling } from '../../../../../utils/workflow';

export function DeptReferralModal(props: any) {
    const { showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff, referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral, referralSearchQuery, setReferralSearchQuery, referralStudentOptions, isReferralStudentSearchLoading, selectedReferralStudent, selectReferralStudent, sigCanvasRef, data, showEventAttendees, setShowEventAttendees, deptAttendees, yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter, deptSectionFilter, setDeptSectionFilter, exportToExcel, showStudentModal, setShowStudentModal, selectedStudent, viewFormRecord, setViewFormRecord, viewFormMode, setViewFormMode } = props;
    return (<>
        {/* Referral Modal — NORSU Counseling Referral Form */}
            {
                showReferralModal && (
                    <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                                <div>
                                    <h3 className="font-bold text-lg">{forwardingToStaff ? 'Forward to CARE Staff — Referral Form' : 'NORSU Counseling Referral Form'}</h3>
                                    <p className="text-xs text-gray-400">Office of the Director, Counseling, Assessment, Resources, and Enhancement Center</p>
                                </div>
                                <button type="button" onClick={() => { setShowReferralModal(false); setForwardingToStaff(false); }} className="text-gray-400 hover:text-gray-600"><XCircle /></button>
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
                                                    {(referralStudentOptions || []).map((s: any) => (
                                                        <button key={s.id} type="button" onClick={() => selectReferralStudent(s)} className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm border-b border-gray-50 last:border-0">
                                                            <span className="font-bold">{s.name}</span><span className="text-gray-400 ml-2 text-xs">{s.course} - {s.year}</span>
                                                        </button>
                                                    ))}
                                                    {(referralStudentOptions || []).length === 0 && (
                                                        <p className="px-4 py-2 text-xs text-gray-400">{isReferralStudentSearchLoading ? 'Searching students...' : 'No matching students found.'}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Auto-filled student info */}
                                {(forwardingToStaff || referralForm.student) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Name of Student</p><p className="text-sm font-semibold text-gray-900">{referralForm.student}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Course & Year</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = selectedReferralStudent?.name === referralForm.student ? selectedReferralStudent : (data?.students || []).find((st: any) => st.name === referralForm.student); return s ? `${s.course || ''} - ${s.year || ''}` : (selectedCounselingReq?.course_year || 'N/A'); })()}</p></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Contact Number</p><p className="text-sm font-semibold text-gray-900">{(() => { const s = selectedReferralStudent?.name === referralForm.student ? selectedReferralStudent : (data?.students || []).find((st: any) => st.name === referralForm.student); return s?.mobile || selectedCounselingReq?.contact_number || 'N/A'; })()}</p></div>
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
                                    <textarea value={referralForm.actions_made} onChange={e => setReferralForm({ ...referralForm, actions_made: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-24" placeholder="What actions have you taken before referring this student?" required></textarea>
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

                                <button type="submit" disabled={Boolean(isSubmittingReferral)} className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:shadow-lg shadow-emerald-200/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none">{isSubmittingReferral ? (forwardingToStaff ? 'Forwarding...' : 'Submitting...') : (forwardingToStaff ? 'Forward to CARE Staff' : 'Submit Referral')}</button>
                            </form>
                        </div>
                    </div>
                )
            }

            
    </>);
}
