import { useState } from 'react';
import { XCircle, Eye, Paperclip, Calendar, CheckCircle, Send, Clock, AlertTriangle, MessageSquare, FileText, Download } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import SignatureCanvas from 'react-signature-canvas';
import { buildStudentAddress } from '../../../../../utils/studentFields';
import {
    getStoredAssetEntries,
    openStoredAsset,
    parseCareNotesPayload
} from '../../../../../utils/storageAssets';
import { SUPPORT_STATUS, isDeptSupportCompleted } from '../../../../../utils/workflow';
import { getTextInputLimitProps, validateTextInput } from '../../../../../utils/inputSecurity';
import { AsyncButton } from '../../../../../components/ui/Button';

const renderDetailedDescription = (desc: any) => {
    if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
    const q1Index = desc.indexOf('[Q1 Description]:');
    if (q1Index === -1) return <p className="text-sm text-gray-800 whitespace-pre-wrap">{desc}</p>;

    const getPart = (key: string, nextKey: string | null) => {
        const start = desc.indexOf(key);
        if (start === -1) return null;
        let end = nextKey ? desc.indexOf(nextKey) : -1;
        if (end === -1) end = desc.length;
        return desc.substring(start + key.length, end).trim();
    };

    const q1 = getPart('[Q1 Description]:', '[Q2 Previous Support]:');
    const q2 = getPart('[Q2 Previous Support]:', '[Q3 Required Support]:');
    const q3 = getPart('[Q3 Required Support]:', '[Q4 Other Needs]:');
    const q4 = getPart('[Q4 Other Needs]:', null);

    return (
        <div className="space-y-4 mt-3">
            {q1 && <div><p className="text-xs font-bold text-gray-600 mb-1">1. Upon application, you indicated that you have a disability or special learning need. Please describe it briefly.</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q1}</p></div>}
            {q2 && <div><p className="text-xs font-bold text-gray-600 mb-1">2. What kind of support did you receive at your previous school?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q2}</p></div>}
            {q3 && <div><p className="text-xs font-bold text-gray-600 mb-1">3. What support or assistance do you require from NORSU to fully participate in campus activities?</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q3}</p></div>}
            {q4 && <div><p className="text-xs font-bold text-gray-600 mb-1">4. Indicate and elaborate on any other special needs or assistance that may be required:</p><p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 whitespace-pre-wrap">{q4}</p></div>}
        </div>
    );
};

const getScheduledDate = (req: any) => {
    try {
        if (req.scheduled_visit_date) return req.scheduled_visit_date;
        const parsed = JSON.parse(req.dept_notes);
        return parsed?.scheduled_date || null;
    } catch { return null; }
};

const parseDeptNotes = (notes: string | null | undefined) => {
    if (!notes) return null;
    try {
        return JSON.parse(notes);
    } catch {
        return null;
    }
};

const DeptArchiveDetails = ({ req, fallbackReferrerName }: any) => {
    if (req.status === SUPPORT_STATUS.REFERRED_TO_CARE) {
        const referral = parseDeptNotes(req.dept_notes);
        return (
            <section className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                <h4 className="font-bold text-sm text-orange-700 mb-4 uppercase tracking-wider border-b border-orange-200 pb-2">
                    Department Referral to CARE Staff
                </h4>
                {referral ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="block text-xs font-bold text-gray-500">Referred By</p>
                                <div className="font-semibold text-gray-900">{referral.referred_by || fallbackReferrerName || '-'}</div>
                            </div>
                            <div>
                                <p className="block text-xs font-bold text-gray-500">Date Acted / Visit Date</p>
                                <div className="font-semibold text-gray-900">{referral.date_acted || '-'}</div>
                            </div>
                        </div>
                        <div>
                            <p className="block text-xs font-bold text-gray-500 mb-1">Actions Taken During Visit</p>
                            <div className="bg-white border border-orange-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                                {referral.actions_taken || 'No actions recorded.'}
                            </div>
                        </div>
                        {referral.comments && (
                            <div>
                                <p className="block text-xs font-bold text-gray-500 mb-1">Other Comments / Observations</p>
                                <div className="bg-white border border-orange-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                                    {referral.comments}
                                </div>
                            </div>
                        )}
                        {referral.signature && (
                            <div>
                                <p className="block text-xs font-bold text-gray-500 mb-1">Name and Signature</p>
                                <div className="bg-white border border-orange-100 rounded-lg p-3 inline-block">
                                    <img src={referral.signature} alt="Department referrer signature" className="max-h-24" />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white border border-orange-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                        {req.dept_notes || 'No referral details recorded.'}
                    </div>
                )}
            </section>
        );
    }

    if (req.status === SUPPORT_STATUS.RESOLVED_BY_DEPT) {
        return (
            <section className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                <h4 className="font-bold text-sm text-emerald-700 mb-3 uppercase tracking-wider border-b border-emerald-200 pb-2">
                    Department Resolution Notes
                </h4>
                <div className="bg-white border border-emerald-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {req.dept_notes || 'No resolution notes recorded.'}
                </div>
            </section>
        );
    }

    if (req.status === SUPPORT_STATUS.REJECTED) {
        return (
            <section className="bg-red-50 p-5 rounded-xl border border-red-200">
                <h4 className="font-bold text-sm text-red-700 mb-3 uppercase tracking-wider border-b border-red-200 pb-2">
                    Department Rejection Notes
                </h4>
                <div className="bg-white border border-red-100 rounded-lg p-3 text-sm text-gray-800 whitespace-pre-wrap">
                    {req.dept_notes || 'No rejection reason recorded.'}
                </div>
            </section>
        );
    }

    return null;
};

const SendMessageModal = ({ form, setForm, notice, setNotice, onSend, onClose }: any) => (
        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Message Student</h3>
                    <button type="button" aria-label="Close message dialog" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                </div>
                <p className="text-xs text-gray-500 mb-4">Sending a message to <strong>{form.student_name}</strong>. They will receive this in their portal notifications.</p>
                <div className="space-y-4">
                    {notice && (
                        <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {notice.message}
                        </div>
                    )}
                    <textarea aria-label="Message to student" value={form.message} {...getTextInputLimitProps('notes')} onChange={(e) => { setNotice(null); setForm({ ...form, message: e.target.value }); }} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Write your message here..." required />
                    <AsyncButton onClick={onSend} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"><Send size={16} className="mr-2" /> Send Message</AsyncButton>
                </div>
            </div>
        </div>
);

const SupportViewDetailModal = ({
    req, student, fallbackReferrerName,
    onClose, onOpenLetter, onApproveSchedule, onReject, onResolve, onReferCare
}: any) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" aria-label="Close support application" className="absolute inset-0 bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400" onClick={onClose} />
            <div className="relative bg-white w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col animate-fade-in-up rounded-2xl overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-bold text-xl text-gray-900">Support Application</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {req.status === SUPPORT_STATUS.VISIT_SCHEDULED
                                ? 'Visit scheduled — awaiting resolution'
                                : req.status === SUPPORT_STATUS.FORWARDED_TO_DEPT
                                    ? 'Forwarded by CARE Staff for your review'
                                    : req.status === SUPPORT_STATUS.RESOLVED_BY_DEPT
                                        ? 'Resolved by the department'
                                        : req.status === SUPPORT_STATUS.REFERRED_TO_CARE
                                            ? 'Referred back to CARE Staff by the department'
                                            : req.status === SUPPORT_STATUS.REJECTED
                                                ? 'Rejected by the department'
                                                : 'Finalized support record'}
                        </p>
                    </div>
                    <button type="button" aria-label="Close support application" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Endorsement Letter Button */}
                    {req.care_notes && (
                        <button type="button" onClick={onOpenLetter} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 text-yellow-800 rounded-xl font-bold text-sm hover:from-yellow-100 hover:to-amber-100 hover:border-yellow-300 transition-all shadow-sm">
                            <FileText size={16} /> View CARE Staff Endorsement Letter
                        </button>
                    )}

                    <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-sm text-purple-600 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Student Information</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="block text-xs font-bold text-gray-500">Full Name</p><div className="font-semibold text-gray-900">{req.student_name}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Date Filed</p><div className="font-semibold text-gray-900">{new Date(req.created_at).toLocaleDateString()}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Date of Birth</p><div className="font-semibold text-gray-900">{student?.dob || '-'}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Program — Year</p><div className="font-semibold text-gray-900">{student?.course || '-'} - {student?.year_level || '-'}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Mobile</p><div className="font-semibold text-gray-900">{student?.mobile || '-'}</div></div>
                            <div><p className="block text-xs font-bold text-gray-500">Email</p><div className="font-semibold text-gray-900">{student?.email || '-'}</div></div>
                            <div className="col-span-2"><p className="block text-xs font-bold text-gray-500">Home Address</p><div className="font-semibold text-gray-900">{buildStudentAddress(student) || '-'}</div></div>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{student?.priority_course || 'N/A'}</span></div>
                            <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{student?.alt_course_1 || 'N/A'}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{student?.alt_course_2 || 'N/A'}</span></div>
                        </div>
                    </section>

                    <section>
                        <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">B. Particulars of Need</h4>
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-600 mb-1">Categories:</p>
                            <div className="flex flex-wrap gap-1">
                                {req.support_type ? req.support_type.split(', ').map((cat: string) => (
                                            <span key={cat} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">{cat}</span>
                                        )) : <span className="text-xs text-gray-400">None</span>}
                            </div>
                        </div>
                        {renderDetailedDescription(req.description)}
                        {req.documents_url && (() => {
                            const urls = getStoredAssetEntries(req.documents_url);
                            return urls.length > 0 ? (
                                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1"><Paperclip size={12} /> Supporting Documents ({urls.length})</p>
                                    {urls.map((url: string, idx: number) => (
                                        <button
                                            key={url}
                                                    type="button"
                                            onClick={async () => {
                                                try {
                                                    await openStoredAsset('support_documents', url, 300, {
                                                        category: 'support-student',
                                                        requestId: Number(req.id),
                                                        index: idx
                                                    });
                                                } catch (error) {
                                                    console.error('Failed to open support document.', error);
                                                }
                                            }}
                                            className="flex w-full items-center gap-2 py-1 text-left text-sm font-medium text-blue-700 hover:text-blue-900 hover:underline"
                                        >
                                            <Eye size={14} className="flex-shrink-0" />
                                            <span className="truncate">Document {idx + 1} — {decodeURIComponent(url.split('/').pop() || 'file')}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : null;
                        })()}
                    </section>

                    <DeptArchiveDetails req={req} fallbackReferrerName={fallbackReferrerName} />

                    {req.status === SUPPORT_STATUS.VISIT_SCHEDULED && (
                        <section className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                            <h4 className="font-bold text-sm text-blue-700 mb-2 uppercase tracking-wider">Scheduled Visit</h4>
                            <p className="text-sm font-bold text-blue-900">{getScheduledDate(req) || 'Date pending'}</p>
                        </section>
                    )}
                </div>

                {/* Footer Actions — context-aware */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                    {req.status === SUPPORT_STATUS.FORWARDED_TO_DEPT && (
                        <>
                            <button type="button" onClick={() => onApproveSchedule(req)} className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition">Approve & Schedule</button>
                            <button type="button" onClick={() => onReject(req)} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition">Reject</button>
                        </>
                    )}
                    {req.status === SUPPORT_STATUS.VISIT_SCHEDULED && (
                        <>
                            <button type="button" onClick={() => onResolve(req)} className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition"><CheckCircle size={14} className="inline mr-1" /> Mark Resolved</button>
                            <button type="button" onClick={() => onReferCare(req)} className="flex-1 py-2.5 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 transition"><Send size={14} className="inline mr-1" /> Refer to CARE</button>
                        </>
                    )}
                    <button type="button" onClick={onClose} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-300 transition">Close</button>
                </div>
            </div>
        </div>
);

const ReferToCareModal = ({ form, setForm, referrerName, sigRef, isSubmitting, onSubmit, onClose }: any) => (
        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold">Refer to CARE Staff</h3>
                        <p className="text-xs text-gray-400 mt-1">Student: {form.student_name}</p>
                    </div>
                    <button type="button" aria-label="Close CARE referral" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                </div>
                <div className="space-y-5">
                    {/* Auto-filled referrer */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Referred By</p><p className="text-sm font-semibold text-gray-900">{referrerName}</p></div>
                        <div><p className="text-[10px] font-bold text-gray-400 uppercase">Student</p><p className="text-sm font-semibold text-gray-900">{form.student_name}</p></div>
                    </div>

                    <div>
                        <label htmlFor="dept-care-referral-date" className="block text-xs font-bold text-gray-500 mb-1">Date Acted / Visit Date <span className="text-red-400">*</span></label>
                        <input id="dept-care-referral-date" required type="date" value={form.date_acted} onChange={e => setForm({ ...form, date_acted: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                    </div>

                    <div>
                        <label htmlFor="dept-care-referral-actions" className="block text-xs font-bold text-gray-500 mb-1">Actions Taken During Visit <span className="text-red-400">*</span></label>
                        <textarea id="dept-care-referral-actions" value={form.actions_taken} onChange={e => setForm({ ...form, actions_taken: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-28" placeholder="Describe the actions taken during the personal meeting..." required />
                    </div>

                    <div>
                        <label htmlFor="dept-care-referral-comments" className="block text-xs font-bold text-gray-500 mb-1">Other Comments / Observations</label>
                        <textarea id="dept-care-referral-comments" value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-20" placeholder="Any additional observations or comments..." />
                    </div>

                    {/* Signature Pad */}
                    <div>
                        <p className="block text-xs font-bold text-gray-500 mb-1">Name and Signature <span className="text-red-400">*</span></p>
                        <p className="text-sm font-semibold text-gray-700 mb-2">{referrerName}</p>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                            <SignatureCanvas
                                ref={sigRef}
                                penColor="#1a1a2e"
                                canvasProps={{ 'aria-label': 'Department referrer signature pad', className: 'w-full', style: { width: '100%', height: '150px' } }}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-gray-400">Draw your signature above</p>
                            <button type="button" onClick={() => sigRef.current?.clear()} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear Signature</button>
                        </div>
                    </div>

                    <button type="button" disabled={isSubmitting} onClick={onSubmit} className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg shadow-orange-200/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-none"><Send size={16} className={`inline mr-1 ${isSubmitting ? 'animate-spin' : ''}`} /> {isSubmitting ? 'Submitting...' : 'Submit Referral to CARE Staff'}</button>
                </div>
            </div>
        </div>
);

const ResolveSupportModal = ({ form, setForm, isSubmitting, onSubmit, onClose }: any) => (
        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Mark as Resolved</h3>
                    <button type="button" aria-label="Close resolution dialog" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                </div>
                <p className="text-sm text-gray-500 mb-4">This will mark the request as resolved and notify CARE Staff.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="dept-resolution-notes" className="text-xs font-bold text-gray-500 uppercase block mb-1">Resolution Notes <span className="text-red-400">*</span></label>
                        <textarea id="dept-resolution-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Describe how the issue was resolved..." required />
                    </div>
                    <button type="button" disabled={isSubmitting} onClick={onSubmit} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:cursor-not-allowed disabled:opacity-60"><CheckCircle size={16} className={`inline mr-1 ${isSubmitting ? 'animate-spin' : ''}`} /> {isSubmitting ? 'Sending...' : 'Mark Resolved & Send to CARE'}</button>
                </div>
            </div>
        </div>
);

const ApproveScheduleModal = ({ form, setForm, isSubmitting, onSubmit, onClose }: any) => (
        <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">Approve & Schedule Visit</h3>
                    <button type="button" aria-label="Close visit scheduling" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="dept-support-visit-date" className="text-xs font-bold text-gray-500 uppercase block mb-1">Visit Date</label>
                        <input id="dept-support-visit-date" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                    </div>
                    <div>
                        <label htmlFor="dept-support-visit-time" className="text-xs font-bold text-gray-500 uppercase block mb-1">Visit Time</label>
                        <input id="dept-support-visit-time" required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                    </div>
                    <div>
                        <label htmlFor="dept-support-visit-notes" className="text-xs font-bold text-gray-500 uppercase block mb-1">Notes (Optional)</label>
                        <textarea id="dept-support-visit-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Additional notes..." />
                    </div>
                    <button type="button" disabled={isSubmitting} onClick={onSubmit} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? 'Scheduling...' : 'Approve & Schedule Visit'}</button>
                </div>
            </div>
        </div>
);

const CompletedSupportTab = ({ requests, findStudentForRequest, matchesCascadeFilters, onView, onMessage }: any) => (
        <div className="space-y-4">
            {requests.flatMap(req => {
                const stu = findStudentForRequest(req);
                if (!matchesCascadeFilters(stu)) return [];
                const isResolved = req.status === SUPPORT_STATUS.RESOLVED_BY_DEPT || req.status === SUPPORT_STATUS.COMPLETED;
                const isRejected = req.status === SUPPORT_STATUS.REJECTED;
                const isReferredBack = req.status === SUPPORT_STATUS.REFERRED_TO_CARE;
                return [(
                    <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow opacity-90">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{req.student_name}</h3>
                                <p className="text-xs text-gray-400">{req.student_id}</p>
                                <div className="flex gap-2 mt-2">
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">{req.support_type}</span>
                                    <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${isRejected ? 'bg-red-50 text-red-700' : isResolved ? 'bg-green-50 text-green-700' : isReferredBack ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                                        {isRejected ? <AlertTriangle size={12} /> : isResolved ? <CheckCircle size={12} /> : isReferredBack ? <Send size={12} /> : <CheckCircle size={12} />}
                                        {req.status}
                                    </span>
                                </div>
                            </div>
                            <button type="button" onClick={() => onMessage(req)} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition flex items-center gap-2">
                                <MessageSquare size={14} /> Contact Student
                            </button>
                        </div>
                        <div className="flex gap-2 border-t border-gray-100 mt-4 pt-4">
                            <button type="button" onClick={() => onView(req)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition"><Eye size={14} className="inline mr-1" />View Archive Details</button>
                        </div>
                    </div>
                )];
            })}
            {requests.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-gray-100 border-dashed">
                    <CheckCircle size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No completed requests yet.</p>
                </div>
            )}
        </div>
);

const ScheduledSupportTab = ({ requests, findStudentForRequest, matchesCascadeFilters, onView, onResolve, onReferCare }: any) => (
        <div className="space-y-4">
            {requests.flatMap(req => {
                const stu = findStudentForRequest(req);
                if (!matchesCascadeFilters(stu)) return [];
                const visitDate = getScheduledDate(req);
                return [(
                    <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">{req.student_name}</h3>
                                <p className="text-xs text-gray-400">{req.student_id}</p>
                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold mt-1 inline-block">{req.support_type}</span>
                            </div>
                            {visitDate && (
                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-100">
                                    <Calendar size={16} />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase">Scheduled Visit</p>
                                        <p className="text-sm font-bold">{visitDate}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => onView(req)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition"><Eye size={14} className="inline mr-1" />View Details</button>
                            <button type="button" onClick={() => onResolve(req)} className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200 transition"><CheckCircle size={14} className="inline mr-1" />Mark Resolved</button>
                            <button type="button" onClick={() => onReferCare(req)} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-200 transition"><Send size={14} className="inline mr-1" />Refer to CARE</button>
                        </div>
                    </div>
                )];
            })}
            {requests.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-gray-100 border-dashed">
                    <Calendar size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-medium">No scheduled visits.</p>
                </div>
            )}
        </div>
);

const QueueSupportTab = ({ requests, findStudentForRequest, matchesCascadeFilters, onView, onApproveSchedule, onReject }: any) => (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Student</th>
                        <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Type</th>
                        <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                        <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Details</th>
                        <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {requests.flatMap(req => {
                        const stu = findStudentForRequest(req);
                        if (!matchesCascadeFilters(stu)) return [];
                        return [(
                        <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onView(req)}>
                            <td className="p-4">
                                <div className="font-bold text-gray-900">{req.student_name}</div>
                                <div className="text-xs text-gray-400">{req.student_id}</div>
                            </td>
                            <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{req.support_type}</span></td>
                            <td className="p-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                            <td className="p-4">
                                <div className="text-sm font-semibold text-gray-600 max-w-xs">Open request to view details</div>
                                {req.documents_url && (() => {
                                    let count = 1;
                                    try { const p = JSON.parse(req.documents_url); if (Array.isArray(p)) count = p.length; } catch { /* ignore malformed payload */ }
                                    return <span className="text-xs text-blue-600 mt-1 block flex items-center gap-1" onClick={e => e.stopPropagation()}><Paperclip size={10} /> {count} attachment{count > 1 ? 's' : ''}</span>;
                                })()}
                            </td>
                            <td className="p-4 flex gap-2" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={() => onView(req)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"><Eye size={12} className="inline mr-1" />View</button>
                                <button type="button" onClick={() => onApproveSchedule(req)} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"><Calendar size={12} className="inline mr-1" />Approve & Schedule</button>
                                <button type="button" onClick={() => onReject(req)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                            </td>
                        </tr>
                    )];
                    })}
                    {requests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400"><AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />No pending support requests in queue.</td></tr>}
                </tbody>
            </table>
        </div>
);

const DeptSupportApprovalsPage = ({
    data,
    supportRequests,
    filteredData,
    matchesCascadeFilters,
    cascadeFilterBar,
    modalState, setShowApproveScheduleModal,
    approveScheduleData, setApproveScheduleData,
    handleSupportApproveAndSchedule,
    handleRejectSupport,
    pendingSupportRejectId,
    setShowResolveModal,
    resolveData, setResolveData,
    handleResolveSupport,
    setShowReferCareModal,
    referCareForm, setReferCareForm,
    handleReferToCare,
    sigCanvasRefSupport,
    submissionState
}: any) => {
    const { showApproveScheduleModal, showResolveModal, showReferCareModal } = modalState;
    const { isSubmittingSupportSchedule, isSubmittingSupportResolve, isSubmittingSupportRefer } = submissionState;
    const [viewReq, setViewReq] = useState<any>(null);
    const [viewStudent, setViewStudent] = useState<any>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'queue' | 'scheduled' | 'completed'>('queue');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageData, setMessageData] = useState({ student_id: '', student_name: '', message: '' });
    const [messageNotice, setMessageNotice] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
    const [showLetterModal, setShowLetterModal] = useState(false);

    const openViewModal = async (req: any) => {
        setViewReq(req);
        setViewStudent(null);
        setShowViewModal(true);
        if (req.student_id) {
            const { data } = await supabase
                .from('students_directory')
                .select('dob, mobile, email, address, street, city, province, zip_code, region, course, year_level, priority_course, alt_course_1, alt_course_2')
                .eq('student_id', req.student_id)
                .maybeSingle();
            setViewStudent(data);
        }
    };

    const queueRequests = supportRequests.filter((r: any) => r.status === SUPPORT_STATUS.FORWARDED_TO_DEPT);
    const scheduledRequests = supportRequests.filter((r: any) => r.status === SUPPORT_STATUS.VISIT_SCHEDULED);
    const completedRequests = supportRequests.filter((r: any) => isDeptSupportCompleted(r.status));
    const findStudentForRequest = (req: any) =>
        filteredData.students.find((student: any) =>
            String(student.student_id || student.id || '') === String(req.student_id || '')
        );


    const tabs = [
        { id: 'queue' as const, label: 'Queue', count: queueRequests.length, icon: <Clock size={16} />, color: 'yellow' },
        { id: 'scheduled' as const, label: 'Scheduled', count: scheduledRequests.length, icon: <Calendar size={16} />, color: 'blue' },
        { id: 'completed' as const, label: 'Completed', count: completedRequests.length, icon: <CheckCircle size={16} />, color: 'green' },
    ];

    const handleSendMessage = async () => {
        const messageCheck = validateTextInput(messageData.message, 'notes', {
            required: true,
            multiline: true,
            label: 'Message'
        });
        if (!messageCheck.valid) {
            setMessageNotice({ type: 'error', message: messageCheck.error || 'Message is invalid.' });
            return;
        }
        try {
            const { error } = await supabase.from('notifications').insert([{
                student_id: messageData.student_id,
                message: `Message from ${data.profile.department}: ${messageCheck.value}`
            }]);
            if (error) throw error;
            setShowMessageModal(false);
            setMessageData({ student_id: '', student_name: '', message: '' });
            setMessageNotice({ type: 'success', message: 'Message sent successfully.' });
        } catch (err: any) {
            setMessageNotice({ type: 'error', message: err.message || 'Failed to send message.' });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Additional Support</h1>
                <p className="text-gray-500 text-sm mt-1">Review additional support cases forwarded to {data.profile.department}</p>
            </header>
            {messageNotice && !showMessageModal && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${messageNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {messageNotice.message}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
                {tabs.map(tab => (
                    <button type="button" key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                            ? tab.color === 'yellow' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200'
                                : tab.color === 'green' ? 'bg-green-500 text-white shadow-lg shadow-green-200'
                                    : 'bg-blue-500 text-white shadow-lg shadow-blue-200'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
                        {tab.icon} {tab.label}
                        {tab.count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>}
                    </button>
                ))}
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm">
                {cascadeFilterBar}
            </div>

            {/* QUEUE TAB */}
            {activeTab === 'queue' && (
                <QueueSupportTab
                    requests={queueRequests}
                    findStudentForRequest={findStudentForRequest}
                    matchesCascadeFilters={matchesCascadeFilters}
                    onView={openViewModal}
                    onApproveSchedule={(req: any) => { setApproveScheduleData({ id: req.id, student_id: req.student_id, date: '', time: '', notes: '' }); setShowApproveScheduleModal(true); }}
                    onReject={(req: any) => { setRejectingId(req.id); setRejectNotes(''); }}
                />
            )}

            {/* SCHEDULED TAB */}
            {activeTab === 'scheduled' && (
                <ScheduledSupportTab
                    requests={scheduledRequests}
                    findStudentForRequest={findStudentForRequest}
                    matchesCascadeFilters={matchesCascadeFilters}
                    onView={openViewModal}
                    onResolve={(req: any) => { setResolveData({ id: req.id, student_id: req.student_id, notes: '' }); setShowResolveModal(true); }}
                    onReferCare={(req: any) => { setReferCareForm({ id: req.id, student_id: req.student_id, student_name: req.student_name, date_acted: '', actions_taken: '', comments: '' }); setShowReferCareModal(true); }}
                />
            )}

            {/* COMPLETED TAB */}
            {activeTab === 'completed' && (
                <CompletedSupportTab
                    requests={completedRequests}
                    findStudentForRequest={findStudentForRequest}
                    matchesCascadeFilters={matchesCascadeFilters}
                    onView={openViewModal}
                    onMessage={(req: any) => { setMessageNotice(null); setMessageData({ student_id: req.student_id, student_name: req.student_name, message: '' }); setShowMessageModal(true); }}
                />
            )}

            {/* Reject Confirmation Inline */}
            {rejectingId && (
                <div className="fixed inset-0 bg-transparent z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Reject Support Request</h3>
                        <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4" placeholder="Reason for rejection..." required />
                        <div className="flex gap-2">
                            <button type="button" onClick={async () => {
                                await handleRejectSupport(rejectingId, rejectNotes);
                                setRejectingId(null);
                            }} disabled={pendingSupportRejectId === String(rejectingId)} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{pendingSupportRejectId === String(rejectingId) ? 'Rejecting...' : 'Confirm Reject'}</button>
                            <button type="button" onClick={() => setRejectingId(null)} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve & Schedule Modal */}
            {showApproveScheduleModal && (
                <ApproveScheduleModal
                    form={approveScheduleData}
                    setForm={setApproveScheduleData}
                    isSubmitting={isSubmittingSupportSchedule}
                    onSubmit={handleSupportApproveAndSchedule}
                    onClose={() => setShowApproveScheduleModal(false)}
                />
            )}

            {/* Resolve Modal */}
            {showResolveModal && (
                <ResolveSupportModal
                    form={resolveData}
                    setForm={setResolveData}
                    isSubmitting={isSubmittingSupportResolve}
                    onSubmit={handleResolveSupport}
                    onClose={() => setShowResolveModal(false)}
                />
            )}

            {/* Refer to CARE Modal */}
            {showReferCareModal && (
                <ReferToCareModal
                    form={referCareForm}
                    setForm={setReferCareForm}
                    referrerName={data.profile.name}
                    sigRef={sigCanvasRefSupport}
                    isSubmitting={isSubmittingSupportRefer}
                    onSubmit={handleReferToCare}
                    onClose={() => setShowReferCareModal(false)}
                />
            )}

            {/* View Detail Modal — same layout as before */}
            {showViewModal && viewReq && (
                <SupportViewDetailModal
                    req={viewReq}
                    student={viewStudent}
                    fallbackReferrerName={data.profile.name}
                    onClose={() => setShowViewModal(false)}
                    onOpenLetter={() => setShowLetterModal(true)}
                    onApproveSchedule={(req: any) => { setShowViewModal(false); setApproveScheduleData({ id: req.id, student_id: req.student_id, date: '', time: '', notes: '' }); setShowApproveScheduleModal(true); }}
                    onReject={(req: any) => { setShowViewModal(false); setRejectingId(req.id); setRejectNotes(''); }}
                    onResolve={(req: any) => { setShowViewModal(false); setResolveData({ id: req.id, student_id: req.student_id, notes: '' }); setShowResolveModal(true); }}
                    onReferCare={(req: any) => { setShowViewModal(false); setReferCareForm({ id: req.id, student_id: req.student_id, student_name: req.student_name, date_acted: '', actions_taken: '', comments: '' }); setShowReferCareModal(true); }}
                />
            )}

            {/* Send Message Modal */}
            {showMessageModal && (
                <SendMessageModal
                    form={messageData}
                    setForm={setMessageData}
                    notice={messageNotice}
                    setNotice={setMessageNotice}
                    onSend={handleSendMessage}
                    onClose={() => setShowMessageModal(false)}
                />
            )}

            {/* Endorsement Letter Viewer Modal */}
            {showLetterModal && viewReq?.care_notes && (() => {
                const { letterReference, notes: notesText } = parseCareNotesPayload(viewReq.care_notes);
                return (
                    <div className="fixed inset-0 bg-transparent z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-yellow-50 to-amber-50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><FileText size={18} className="text-yellow-600" /> Endorsement Letter</h3>
                                    <p className="text-xs text-gray-500">From CARE Staff</p>
                                </div>
                                <button type="button" aria-label="Close endorsement letter" onClick={() => setShowLetterModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* Formal Letter Preview */}
                                <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-inner">
                                    <div className="text-center border-b border-gray-200 pb-4 mb-4">
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Republic of the Philippines</p>
                                        <p className="font-bold text-sm text-gray-900 mt-1">NEGROS ORIENTAL STATE UNIVERSITY</p>
                                        <p className="text-[10px] text-gray-500">Office of Campus Student Affairs and Services</p>
                                        <p className="text-[10px] text-gray-400">Guihulngan Campus</p>
                                    </div>
                                    <div className="space-y-3 text-sm text-gray-700">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-500">Date: {new Date(viewReq.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            <span className="text-xs text-gray-500">Re: {viewReq.student_name}</span>
                                        </div>
                                        {notesText && (
                                            <div className="mt-3">
                                                <p className="text-xs font-bold text-gray-500 mb-1 uppercase">Staff Remarks:</p>
                                                <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{notesText}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {letterReference && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                await openStoredAsset('support_documents', letterReference, 300, {
                                                    category: 'support-endorsement',
                                                    requestId: Number(viewReq.id)
                                                });
                                            } catch (error) {
                                                console.error('Failed to open endorsement letter.', error);
                                            }
                                        }}
                                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 py-3 text-sm font-bold text-white shadow-yellow-200/50 transition-all hover:shadow-lg"
                                    >
                                        <Download size={16} /> Download Original Letter
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DeptSupportApprovalsPage;

