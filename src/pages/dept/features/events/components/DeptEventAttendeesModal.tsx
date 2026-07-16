import React from 'react';
import { XCircle, MapPin } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { COUNSELING_STATUS, getCounselingScheduledDate, isCounselingAwaitingDept, isWithCareStaffCounseling } from '../../../../../utils/workflow';
import { AttendanceProofButton } from '../../../../../components/AttendanceProofButton';

export function DeptEventAttendeesModal(props: any) {
    const { showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff, referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral, referralSearchQuery, setReferralSearchQuery, sigCanvasRef, data, showEventAttendees, setShowEventAttendees, deptAttendees, yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter, deptSectionFilter, setDeptSectionFilter, exportToExcel, showStudentModal, setShowStudentModal, selectedStudent, viewFormRecord, setViewFormRecord, viewFormMode, setViewFormMode, showToastMessage } = props;
    return (<>
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
                        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4 animate-backdrop">
                            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh] animate-scale-in">
                                <div className="p-6 border-b bg-gray-50 rounded-t-2xl dark:bg-gray-700 dark:border-gray-600">
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <h3 className="font-bold text-lg dark:text-white">Attendees List</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{showEventAttendees.title}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => {
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
                                            <button type="button" onClick={() => { setShowEventAttendees(null); setYearLevelFilter('All'); setDeptCourseFilter('All'); setDeptSectionFilter('All'); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><XCircle /></button>
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
                                            <button type="button" onClick={() => setYearLevelFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === 'All' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>All</button>
                                            {yearLevels.map((yl: any) => {
                                                const count = deptAttendees.filter((a: any) => a.year_level === yl).length;
                                                return <button type="button" key={yl} onClick={() => setYearLevelFilter(yl)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${yearLevelFilter === yl ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100 dark:bg-gray-600 dark:text-gray-300 dark:border-gray-500'}`}>{yl} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attCourses.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Course:</span>
                                            <button type="button" onClick={() => setDeptCourseFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === 'All' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attCourses.map((c: any) => {
                                                const count = deptAttendees.filter((a: any) => a.course === c).length;
                                                return <button type="button" key={c} onClick={() => setDeptCourseFilter(c)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptCourseFilter === c ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>{c} ({count})</button>;
                                            })}
                                        </div>
                                    )}
                                    {attSections.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            <span className="text-[10px] text-gray-400 font-bold uppercase mr-1 self-center">Section:</span>
                                            <button type="button" onClick={() => setDeptSectionFilter('All')} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === 'All' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>All</button>
                                            {attSections.map((s: any) => {
                                                const count = deptAttendees.filter((a: any) => a.section === s).length;
                                                return <button type="button" key={s} onClick={() => setDeptSectionFilter(s)} className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${deptSectionFilter === s ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}>Sec {s} ({count})</button>;
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
                                                    <th className="px-6 py-3">Proof</th>
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
                                                        <td className="px-6 py-3 text-xs">
                                                            <AttendanceProofButton
                                                                storedReference={att.proof_url}
                                                                attendanceId={Number(att.id)}
                                                                onError={(message) => showToastMessage?.(message, 'error')}
                                                            />
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

            
    </>);
}
