import { useState } from 'react';
import { XCircle, Eye, Paperclip } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const DeptSupportApprovalsPage = ({
    data,
    supportRequests,
    filteredData,
    matchesCascadeFilters,
    cascadeFilterBar,
    openDecisionModal
}: any) => {
    const [viewReq, setViewReq] = useState<any>(null);
    const [viewStudent, setViewStudent] = useState<any>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const openViewModal = async (req: any) => {
        setViewReq(req);
        setViewStudent(null);
        setShowViewModal(true);
        if (req.student_id) {
            const { data } = await supabase.from('students').select('*').eq('student_id', req.student_id).maybeSingle();
            setViewStudent(data);
        }
    };

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

    return (
        <div className="space-y-8 animate-fade-in">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Support Request Approvals</h1>
                <p className="text-gray-500 text-sm mt-1">Review requests forwarded to {data.profile.department}</p>
            </header>

            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-gray-100/80 shadow-sm">
                {cascadeFilterBar}
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden card-hover">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-700 dark:border-gray-600">
                        <tr>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Student</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Type</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Description</th>
                            <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {supportRequests.filter(req => {
                            const stu = filteredData.students.find(s => s.id === req.student_id);
                            return matchesCascadeFilters(stu);
                        }).map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onClick={() => openViewModal(req)}>
                                <td className="p-4">
                                    <div className="font-bold text-gray-900 dark:text-white">{req.student_name}</div>
                                    <div className="text-xs text-gray-400">{req.student_id}</div>
                                </td>
                                <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{req.support_type}</span></td>
                                <td className="p-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 max-w-xs" title={req.description}>{req.description}</div>
                                    {req.documents_url && <a href={req.documents_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block" onClick={e => e.stopPropagation()}>View Attachment</a>}
                                </td>
                                <td className="p-4 flex gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => openViewModal(req)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"><Eye size={12} className="inline mr-1" />View</button>
                                    <button onClick={() => openDecisionModal(req.id, 'Approved')} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200">Approve</button>
                                    <button onClick={() => openDecisionModal(req.id, 'Rejected')} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                                </td>
                            </tr>
                        ))}
                        {supportRequests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">No pending support requests.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* View Detail Modal — same layout as Care Staff */}
            {showViewModal && viewReq && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
                    <div className="relative bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Support Application</h3>
                                <p className="text-xs text-gray-500 mt-1">Forwarded by CARE Staff for your review</p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Student Information */}
                            <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-sm text-purple-600 mb-4 uppercase tracking-wider border-b border-gray-200 pb-2">Student Information</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><label className="block text-xs font-bold text-gray-500">Full Name</label><div className="font-semibold text-gray-900">{viewReq.student_name}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date Filed</label><div className="font-semibold text-gray-900">{new Date(viewReq.created_at).toLocaleDateString()}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Date of Birth</label><div className="font-semibold text-gray-900">{viewStudent?.dob || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Program — Year</label><div className="font-semibold text-gray-900">{viewStudent?.course || '-'} - {viewStudent?.year_level || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Mobile</label><div className="font-semibold text-gray-900">{viewStudent?.mobile || '-'}</div></div>
                                    <div><label className="block text-xs font-bold text-gray-500">Email</label><div className="font-semibold text-gray-900">{viewStudent?.email || '-'}</div></div>
                                    <div className="col-span-2"><label className="block text-xs font-bold text-gray-500">Home Address</label><div className="font-semibold text-gray-900">{viewStudent?.address || '-'}</div></div>
                                </div>
                            </section>

                            {/* Section A: Studies */}
                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{viewStudent?.priority_course || 'N/A'}</span></div>
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{viewStudent?.alt_course_1 || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{viewStudent?.alt_course_2 || 'N/A'}</span></div>
                                </div>
                            </section>

                            {/* Section B: Categories & Particulars */}
                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">B. Particulars of Need</h4>
                                <div className="mb-4">
                                    <p className="text-xs font-bold text-gray-600 mb-1">Categories:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {viewReq.support_type ? viewReq.support_type.split(', ').map((cat: string, i: number) => (
                                            <span key={i} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-700">{cat}</span>
                                        )) : <span className="text-xs text-gray-400">None</span>}
                                    </div>
                                </div>
                                {renderDetailedDescription(viewReq.description)}
                                {viewReq.documents_url && (
                                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                        <a href={viewReq.documents_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline font-bold flex items-center gap-2"><Paperclip size={14} /> View Supporting Documents</a>
                                    </div>
                                )}
                            </section>

                            {/* CARE Staff Notes */}
                            {viewReq.care_notes && (
                                <section className="bg-yellow-50 p-5 rounded-xl border border-yellow-200">
                                    <h4 className="font-bold text-sm text-yellow-700 mb-2 uppercase tracking-wider">CARE Staff Notes</h4>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewReq.care_notes}</p>
                                </section>
                            )}

                            {/* Status / Resolution Info */}
                            {(viewReq.dept_notes || viewReq.resolution_notes) && (
                                <section className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-sm text-gray-700 mb-3 uppercase tracking-wider">Decision & Resolution</h4>
                                    {viewReq.dept_notes && (
                                        <div className="mb-3">
                                            <p className="text-xs font-bold text-gray-500 mb-1">Your Notes:</p>
                                            <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100">{viewReq.dept_notes}</p>
                                        </div>
                                    )}
                                    {viewReq.resolution_notes && (
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 mb-1">Final Resolution (by CARE Staff):</p>
                                            <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100">{viewReq.resolution_notes}</p>
                                        </div>
                                    )}
                                </section>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            <button onClick={() => { setShowViewModal(false); openDecisionModal(viewReq.id, 'Approved'); }} className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition">Approve</button>
                            <button onClick={() => { setShowViewModal(false); openDecisionModal(viewReq.id, 'Rejected'); }} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition">Reject</button>
                            <button onClick={() => setShowViewModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-300 transition">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeptSupportApprovalsPage;
