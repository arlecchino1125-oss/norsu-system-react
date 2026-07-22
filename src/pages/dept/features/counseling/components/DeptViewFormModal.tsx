import React from 'react';
import { GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import Modal from '../../../../../components/ui/Modal';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';
import { COUNSELING_STATUS, getCounselingScheduledDate, isCounselingAwaitingDept, isWithCareStaffCounseling } from '../../../../../utils/workflow';

export function DeptViewFormModal(props: any) {
    const { showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff, referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral, referralSearchQuery, setReferralSearchQuery, sigCanvasRef, data, showEventAttendees, setShowEventAttendees, deptAttendees, yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter, deptSectionFilter, setDeptSectionFilter, exportToExcel, showStudentModal, setShowStudentModal, selectedStudent, viewFormRecord, setViewFormRecord, viewFormMode, setViewFormMode } = props;
    return (<>
        {/* View Form Modal — Same as Care Staff: Student Form or Referral Form */}
            {
                showStudentModal && selectedStudent && (() => {
                    const fullName = selectedStudent.name || [
                        selectedStudent.first_name,
                        selectedStudent.middle_name,
                        selectedStudent.last_name,
                        selectedStudent.suffix
                    ].filter(Boolean).join(' ');
                    const isActive = String(selectedStudent.status || '').trim() === 'Active';
                    const address = [selectedStudent.street, selectedStudent.city, selectedStudent.province, selectedStudent.zip_code, selectedStudent.region].filter(Boolean).join(', ');
                    const enrollmentRows = [
                        { label: 'College', value: selectedStudent.department },
                        { label: 'Program', value: selectedStudent.course },
                        { label: 'Year Level', value: selectedStudent.year_level || selectedStudent.year },
                        { label: 'Section', value: selectedStudent.section }
                    ];
                    const personalRows = [
                        { label: 'Contact Number', value: selectedStudent.mobile || selectedStudent.contact_number },
                        { label: 'Sex Assigned at Birth', value: selectedStudent.sex }
                    ];
                    const displayValue = (value: unknown) => value
                        ? String(value)
                        : <span className="font-normal text-slate-400">Not provided</span>;
                    const closeStudentProfile = () => setShowStudentModal(false);

                    return (
                        <Modal
                            open
                            onClose={closeStudentProfile}
                            title="Student profile"
                            subtitle="Department directory record"
                            size="lg"
                            zIndex="z-[105]"
                            footer={(
                                <button
                                    type="button"
                                    aria-label="Close student profile"
                                    onClick={closeStudentProfile}
                                    className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                >
                                    Close
                                </button>
                            )}
                        >
                            <section className="flex items-start gap-4 border-b border-slate-100 pb-5" aria-labelledby="dept-student-profile-name">
                                <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-800">
                                    {(fullName || 'S').charAt(0).toUpperCase()}
                                    {selectedStudent.profile_picture_url && (
                                        <ResolvedProfileImage
                                            storedValue={selectedStudent.profile_picture_url}
                                            studentId={String(selectedStudent.student_id || selectedStudent.id || '')}
                                            alt={`${fullName || 'Student'} profile`}
                                            className="absolute inset-0 h-full w-full"
                                            previewOnClick={false}
                                            referrerPolicy="no-referrer"
                                        />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 id="dept-student-profile-name" className="text-xl font-bold text-slate-900">{fullName || 'Unnamed Student'}</h2>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {selectedStudent.status || 'Unknown'}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-sm font-medium text-slate-500">
                                        {selectedStudent.student_id || selectedStudent.id || 'Student ID not provided'}
                                    </p>
                                    <p className="mt-2 flex min-w-0 items-center gap-2 break-all text-sm text-slate-600">
                                        <Mail size={15} className="shrink-0 text-slate-400" />
                                        {selectedStudent.email || 'Email not provided'}
                                    </p>
                                </div>
                            </section>

                            <section className="pt-5">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <GraduationCap size={17} className="text-emerald-600" />
                                    Enrollment
                                </h3>
                                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    {enrollmentRows.map((row) => (
                                        <div key={row.label} className="min-w-0">
                                            <dt className="text-xs font-semibold text-slate-500">{row.label}</dt>
                                            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{displayValue(row.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className="mt-5 border-t border-slate-100 pt-5">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <Phone size={16} className="text-emerald-600" />
                                    Contact &amp; personal
                                </h3>
                                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    {personalRows.map((row) => (
                                        <div key={row.label} className="min-w-0">
                                            <dt className="text-xs font-semibold text-slate-500">{row.label}</dt>
                                            <dd className="mt-1 break-words text-sm font-semibold text-slate-800">{displayValue(row.value)}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>

                            <section className="mt-5 border-t border-slate-100 pt-5">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                                    <MapPin size={16} className="text-emerald-600" />
                                    Permanent address
                                </h3>
                                <p className="mt-2 break-words text-sm font-semibold text-slate-800">{displayValue(address)}</p>
                            </section>
                        </Modal>
                    );
                })()
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
                                                <button type="button" onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                        </div>
                                        {/* Student info */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label htmlFor="dept-form-referral-student-name" className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input id="dept-form-referral-student-name" readOnly value={viewFormRecord.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-referral-course-year" className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input id="dept-form-referral-course-year" readOnly value={viewFormRecord.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-referral-contact" className="block text-xs font-bold text-gray-500 mb-1">Student Contact Number</label><input id="dept-form-referral-contact" readOnly value={viewFormRecord.contact_number || 'N/A'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-referral-request-type" className="block text-xs font-bold text-gray-500 mb-1">Request Type</label><input id="dept-form-referral-request-type" readOnly value={viewFormRecord.request_type || 'Dean Referral'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        {/* Referral details */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label htmlFor="dept-form-referrer-name" className="block text-xs font-bold text-gray-500 mb-1">Referred by</label><input id="dept-form-referrer-name" readOnly value={viewFormRecord.referred_by || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-referrer-contact" className="block text-xs font-bold text-gray-500 mb-1">Referrer Contact Number</label><input id="dept-form-referrer-contact" readOnly value={viewFormRecord.referrer_contact_number || 'N/A'} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-referrer-relationship" className="block text-xs font-bold text-gray-500 mb-1">Relationship with Student</label><input id="dept-form-referrer-relationship" readOnly value={viewFormRecord.relationship_with_student || 'N/A'} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-referral-reason" className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Referral</label>
                                            <textarea id="dept-form-referral-reason" readOnly rows={4} value={viewFormRecord.reason_for_referral || viewFormRecord.description || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-referral-actions" className="block text-xs font-bold text-gray-500 mb-1">Actions Made by Referrer</label>
                                            <textarea id="dept-form-referral-actions" readOnly rows={3} value={viewFormRecord.actions_made || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-referral-observations" className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Observations</label>
                                            <textarea id="dept-form-referral-observations" readOnly rows={2} value={viewFormRecord.date_duration_of_observations || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        {viewFormRecord.referrer_signature && (
                                            <div className="mb-4">
                                                <p className="block text-xs font-bold text-gray-500 mb-1">Name and Signature of the Referring Person</p>
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
                                            <button type="button" onClick={() => setViewFormMode('student')} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all flex items-center justify-center gap-2">View Student Form</button>
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
                                                <button type="button" onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                            <div><label htmlFor="dept-form-student-name" className="block text-xs font-bold text-gray-500 mb-1">Name of Student</label><input id="dept-form-student-name" readOnly value={viewFormRecord.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-student-course-year" className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input id="dept-form-student-course-year" readOnly value={viewFormRecord.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                            <div><label htmlFor="dept-form-student-contact" className="block text-xs font-bold text-gray-500 mb-1">Contact Number</label><input id="dept-form-student-contact" readOnly value={viewFormRecord.contact_number || 'Not set'} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 cursor-not-allowed" /></div>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-student-reason" className="block text-xs font-bold text-gray-500 mb-1">Reason/s for Requesting Counseling</label>
                                            <textarea id="dept-form-student-reason" readOnly rows={4} value={viewFormRecord.reason_for_referral || viewFormRecord.description || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-student-actions" className="block text-xs font-bold text-gray-500 mb-1">Personal Actions Taken</label>
                                            <textarea id="dept-form-student-actions" readOnly rows={3} value={viewFormRecord.personal_actions_taken || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        <div className="mb-4">
                                            <label htmlFor="dept-form-student-concern-duration" className="block text-xs font-bold text-gray-500 mb-1">Date / Duration of Concern</label>
                                            <textarea id="dept-form-student-concern-duration" readOnly rows={2} value={viewFormRecord.date_duration_of_concern || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 cursor-not-allowed resize-none"></textarea>
                                        </div>
                                        {getCounselingScheduledDate(viewFormRecord) && (
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-3"><p className="text-xs font-bold text-blue-800 uppercase mb-1">Scheduled Session</p><p className="text-sm font-semibold text-blue-900">{new Date(getCounselingScheduledDate(viewFormRecord) as string).toLocaleString()}</p></div>
                                        )}
                                        {viewFormRecord.resolution_notes && (
                                            <div className="bg-green-50 p-4 rounded-xl border border-green-100 mb-3"><p className="text-xs font-bold text-green-800 uppercase mb-1">Resolution Notes</p><p className="text-sm text-green-900">{viewFormRecord.resolution_notes}</p></div>
                                        )}
                                        {viewFormRecord.referred_by && (
                                            <button type="button" onClick={() => setViewFormMode('referral')} className="w-full mt-2 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-sm hover:bg-purple-100 transition-all flex items-center justify-center gap-2">View Referral Form</button>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="p-6 border-t border-gray-100 flex gap-3 sticky bottom-0 bg-white rounded-b-2xl">
                                <button type="button" onClick={() => { setViewFormRecord(null); setViewFormMode('student'); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                )
            }

            
    </>);
}
