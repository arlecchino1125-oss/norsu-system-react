import { useState } from 'react';
import { XCircle, Eye, Paperclip, Calendar, CheckCircle, Send, Clock, AlertTriangle, MessageSquare, FileText, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SignatureCanvas from 'react-signature-canvas';

const DeptSupportApprovalsPage = ({
    data,
    supportRequests,
    filteredData,
    matchesCascadeFilters,
    cascadeFilterBar,
    openDecisionModal,
    showApproveScheduleModal, setShowApproveScheduleModal,
    approveScheduleData, setApproveScheduleData,
    handleSupportApproveAndSchedule,
    handleRejectSupport,
    showResolveModal, setShowResolveModal,
    resolveData, setResolveData,
    handleResolveSupport,
    showReferCareModal, setShowReferCareModal,
    referCareForm, setReferCareForm,
    handleReferToCare,
    sigCanvasRefSupport
}: any) => {
    const [viewReq, setViewReq] = useState<any>(null);
    const [viewStudent, setViewStudent] = useState<any>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'queue' | 'scheduled' | 'completed'>('queue');
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNotes, setRejectNotes] = useState('');
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageData, setMessageData] = useState({ student_id: '', student_name: '', message: '' });
    const [showLetterModal, setShowLetterModal] = useState(false);

    const openViewModal = async (req: any) => {
        setViewReq(req);
        setViewStudent(null);
        setShowViewModal(true);
        if (req.student_id) {
            const { data } = await supabase.from('students').select('*').eq('student_id', req.student_id).maybeSingle();
            setViewStudent(data);
        }
    };

    const queueRequests = supportRequests.filter((r: any) => r.status === 'Forwarded to Dept');
    const scheduledRequests = supportRequests.filter((r: any) => r.status === 'Visit Scheduled');
    const completedRequests = supportRequests.filter((r: any) => r.status === 'Resolved by Dept' || r.status === 'Referred to CARE');

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

    const tabs = [
        { id: 'queue' as const, label: 'Queue', count: queueRequests.length, icon: <Clock size={16} />, color: 'yellow' },
        { id: 'scheduled' as const, label: 'Scheduled', count: scheduledRequests.length, icon: <Calendar size={16} />, color: 'blue' },
        { id: 'completed' as const, label: 'Completed', count: completedRequests.length, icon: <CheckCircle size={16} />, color: 'green' },
    ];

    const handleSendMessage = async () => {
        if (!messageData.message.trim()) return;
        try {
            await supabase.from('notifications').insert([{
                student_id: messageData.student_id,
                message: `Message from ${data.profile.department}: ${messageData.message}`
            }]);
            setShowMessageModal(false);
            setMessageData({ student_id: '', student_name: '', message: '' });
            // Cannot use showToastMessage easily without plumbing it down, so rely on UI feedback.
            // (Assuming standard alert is fine or silent success is okay since modal closes)
            alert("Message sent successfully.");
        } catch (err: any) { alert(err.message); }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <header>
                <h1 className="text-2xl font-bold text-gray-900">Support Request Approvals</h1>
                <p className="text-gray-500 text-sm mt-1">Review requests forwarded to {data.profile.department}</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id
                            ? tab.color === 'yellow' ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-200' : 'bg-blue-500 text-white shadow-lg shadow-blue-200'
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
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Student</th>
                                <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Type</th>
                                <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Date</th>
                                <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Description</th>
                                <th className="p-4 font-semibold text-xs text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {queueRequests.filter(req => {
                                const stu = filteredData.students.find(s => s.id === req.student_id);
                                return matchesCascadeFilters(stu);
                            }).map(req => (
                                <tr key={req.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewModal(req)}>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-900">{req.student_name}</div>
                                        <div className="text-xs text-gray-400">{req.student_id}</div>
                                    </td>
                                    <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{req.support_type}</span></td>
                                    <td className="p-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <div className="text-sm text-gray-600 line-clamp-2 max-w-xs" title={req.description}>{req.description}</div>
                                        {req.documents_url && (() => {
                                            let count = 1;
                                            try { const p = JSON.parse(req.documents_url); if (Array.isArray(p)) count = p.length; } catch { }
                                            return <span className="text-xs text-blue-600 mt-1 block flex items-center gap-1" onClick={e => e.stopPropagation()}><Paperclip size={10} /> {count} attachment{count > 1 ? 's' : ''}</span>;
                                        })()}
                                    </td>
                                    <td className="p-4 flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => openViewModal(req)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200"><Eye size={12} className="inline mr-1" />View</button>
                                        <button onClick={() => { setApproveScheduleData({ id: req.id, date: '', time: '', notes: '' }); setShowApproveScheduleModal(true); }} className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200"><Calendar size={12} className="inline mr-1" />Approve & Schedule</button>
                                        <button onClick={() => { setRejectingId(req.id); setRejectNotes(''); }} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Reject</button>
                                    </td>
                                </tr>
                            ))}
                            {queueRequests.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400"><AlertTriangle size={32} className="mx-auto mb-2 opacity-30" />No pending support requests in queue.</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SCHEDULED TAB */}
            {activeTab === 'scheduled' && (
                <div className="space-y-4">
                    {scheduledRequests.filter(req => {
                        const stu = filteredData.students.find(s => s.id === req.student_id);
                        return matchesCascadeFilters(stu);
                    }).map(req => {
                        const visitDate = getScheduledDate(req);
                        return (
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
                                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{req.description}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => openViewModal(req)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition"><Eye size={14} className="inline mr-1" />View Details</button>
                                    <button onClick={() => { setResolveData({ id: req.id, notes: '' }); setShowResolveModal(true); }} className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-bold hover:bg-green-200 transition"><CheckCircle size={14} className="inline mr-1" />Mark Resolved</button>
                                    <button onClick={() => { setReferCareForm({ id: req.id, student_name: req.student_name, date_acted: '', actions_taken: '', comments: '' }); setShowReferCareModal(true); }} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-sm font-bold hover:bg-orange-200 transition"><Send size={14} className="inline mr-1" />Refer to CARE</button>
                                </div>
                            </div>
                        );
                    })}
                    {scheduledRequests.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-gray-100 border-dashed">
                            <Calendar size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">No scheduled visits.</p>
                        </div>
                    )}
                </div>
            )}

            {/* COMPLETED TAB */}
            {activeTab === 'completed' && (
                <div className="space-y-4">
                    {completedRequests.filter(req => {
                        const stu = filteredData.students.find(s => s.id === req.student_id);
                        return matchesCascadeFilters(stu);
                    }).map(req => {
                        const isResolved = req.status === 'Resolved by Dept';
                        return (
                            <div key={req.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow opacity-90">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{req.student_name}</h3>
                                        <p className="text-xs text-gray-400">{req.student_id}</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">{req.support_type}</span>
                                            <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${isResolved ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                                                {isResolved ? <CheckCircle size={12} /> : <Send size={12} />}
                                                {req.status}
                                            </span>
                                        </div>
                                    </div>
                                    <button onClick={() => { setMessageData({ student_id: req.student_id, student_name: req.student_name, message: '' }); setShowMessageModal(true); }} className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition flex items-center gap-2">
                                        <MessageSquare size={14} /> Contact Student
                                    </button>
                                </div>
                                <div className="flex gap-2 border-t border-gray-100 mt-4 pt-4">
                                    <button onClick={() => openViewModal(req)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition"><Eye size={14} className="inline mr-1" />View Archive Details</button>
                                </div>
                            </div>
                        );
                    })}
                    {completedRequests.length === 0 && (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-2xl border border-gray-100 border-dashed">
                            <CheckCircle size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-medium">No completed requests yet.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Reject Confirmation Inline */}
            {rejectingId && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">Reject Support Request</h3>
                        <textarea value={rejectNotes} onChange={e => setRejectNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mb-4" placeholder="Reason for rejection..." required />
                        <div className="flex gap-2">
                            <button onClick={() => { handleRejectSupport(rejectingId, rejectNotes); setRejectingId(null); }} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700">Confirm Reject</button>
                            <button onClick={() => setRejectingId(null)} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-300">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approve & Schedule Modal */}
            {showApproveScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Approve & Schedule Visit</h3>
                            <button onClick={() => setShowApproveScheduleModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Visit Date</label>
                                <input required type="date" value={approveScheduleData.date} onChange={(e) => setApproveScheduleData({ ...approveScheduleData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Visit Time</label>
                                <input required type="time" value={approveScheduleData.time} onChange={(e) => setApproveScheduleData({ ...approveScheduleData, time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Notes (Optional)</label>
                                <textarea value={approveScheduleData.notes} onChange={(e) => setApproveScheduleData({ ...approveScheduleData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Additional notes..." />
                            </div>
                            <button onClick={handleSupportApproveAndSchedule} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition">Approve & Schedule Visit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resolve Modal */}
            {showResolveModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Mark as Resolved</h3>
                            <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">This will mark the request as resolved and notify CARE Staff.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Resolution Notes <span className="text-red-400">*</span></label>
                                <textarea value={resolveData.notes} onChange={(e) => setResolveData({ ...resolveData, notes: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Describe how the issue was resolved..." required />
                            </div>
                            <button onClick={handleResolveSupport} className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"><CheckCircle size={16} className="inline mr-1" /> Mark Resolved & Send to CARE</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refer to CARE Modal */}
            {showReferCareModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold">Refer to CARE Staff</h3>
                                <p className="text-xs text-gray-400 mt-1">Student: {referCareForm.student_name}</p>
                            </div>
                            <button onClick={() => setShowReferCareModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <div className="space-y-5">
                            {/* Auto-filled referrer */}
                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Referred By</p><p className="text-sm font-semibold text-gray-900">{data.profile.name}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Student</p><p className="text-sm font-semibold text-gray-900">{referCareForm.student_name}</p></div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Date Acted / Visit Date <span className="text-red-400">*</span></label>
                                <input type="date" value={referCareForm.date_acted} onChange={e => setReferCareForm({ ...referCareForm, date_acted: e.target.value })} className="w-full px-4 py-2.5 border rounded-xl text-sm" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Actions Taken During Visit <span className="text-red-400">*</span></label>
                                <textarea value={referCareForm.actions_taken} onChange={e => setReferCareForm({ ...referCareForm, actions_taken: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-28" placeholder="Describe the actions taken during the personal meeting..." required />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Other Comments / Observations</label>
                                <textarea value={referCareForm.comments} onChange={e => setReferCareForm({ ...referCareForm, comments: e.target.value })} className="w-full px-4 py-3 border rounded-xl text-sm h-20" placeholder="Any additional observations or comments..." />
                            </div>

                            {/* Signature Pad */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Name and Signature <span className="text-red-400">*</span></label>
                                <p className="text-sm font-semibold text-gray-700 mb-2">{data.profile.name}</p>
                                <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-white">
                                    <SignatureCanvas
                                        ref={sigCanvasRefSupport}
                                        penColor="#1a1a2e"
                                        canvasProps={{ className: 'w-full', style: { width: '100%', height: '150px' } }}
                                    />
                                </div>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-[10px] text-gray-400">Draw your signature above</p>
                                    <button type="button" onClick={() => sigCanvasRefSupport.current?.clear()} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear Signature</button>
                                </div>
                            </div>

                            <button onClick={handleReferToCare} className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg shadow-orange-200/50 transition-all"><Send size={16} className="inline mr-1" /> Submit Referral to CARE Staff</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Detail Modal — same layout as before */}
            {showViewModal && viewReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
                    <div className="relative bg-white w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col animate-fade-in-up rounded-2xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-xl text-gray-900">Support Application</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {viewReq.status === 'Visit Scheduled' ? 'Visit scheduled — awaiting resolution' : 'Forwarded by CARE Staff for your review'}
                                </p>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Endorsement Letter Button */}
                            {viewReq.care_notes && (() => {
                                let letterUrl = null;
                                try { const parsed = JSON.parse(viewReq.care_notes); letterUrl = parsed?.letter_url; } catch { }
                                return letterUrl ? (
                                    <button onClick={() => setShowLetterModal(true)} className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 text-yellow-800 rounded-xl font-bold text-sm hover:from-yellow-100 hover:to-amber-100 hover:border-yellow-300 transition-all shadow-sm">
                                        <FileText size={16} /> View CARE Staff Endorsement Letter
                                    </button>
                                ) : null;
                            })()}

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

                            <section>
                                <h4 className="font-bold text-sm text-purple-600 mb-3 uppercase tracking-wider border-b pb-1">A. Your Studies</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">1st Priority:</span><span className="font-medium text-gray-900">{viewStudent?.priority_course || 'N/A'}</span></div>
                                    <div className="flex justify-between border-b border-gray-50 pb-1"><span className="text-gray-500">2nd Priority:</span><span className="font-medium text-gray-900">{viewStudent?.alt_course_1 || 'N/A'}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-500">3rd Priority:</span><span className="font-medium text-gray-900">{viewStudent?.alt_course_2 || 'N/A'}</span></div>
                                </div>
                            </section>

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
                                {viewReq.documents_url && (() => {
                                    let urls: string[] = [];
                                    try {
                                        const parsed = JSON.parse(viewReq.documents_url);
                                        urls = Array.isArray(parsed) ? parsed : [viewReq.documents_url];
                                    } catch { urls = [viewReq.documents_url]; }
                                    return urls.length > 0 ? (
                                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-2">
                                            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1"><Paperclip size={12} /> Supporting Documents ({urls.length})</p>
                                            {urls.map((url: string, idx: number) => (
                                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 hover:underline font-medium py-1">
                                                    <Eye size={14} className="flex-shrink-0" />
                                                    <span className="truncate">Document {idx + 1} — {decodeURIComponent(url.split('/').pop() || 'file')}</span>
                                                </a>
                                            ))}
                                        </div>
                                    ) : null;
                                })()}
                            </section>



                            {viewReq.status === 'Visit Scheduled' && (
                                <section className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                                    <h4 className="font-bold text-sm text-blue-700 mb-2 uppercase tracking-wider">Scheduled Visit</h4>
                                    <p className="text-sm font-bold text-blue-900">{getScheduledDate(viewReq) || 'Date pending'}</p>
                                </section>
                            )}
                        </div>

                        {/* Footer Actions — context-aware */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
                            {viewReq.status === 'Forwarded to Dept' && (
                                <>
                                    <button onClick={() => { setShowViewModal(false); setApproveScheduleData({ id: viewReq.id, student_id: viewReq.student_id, date: '', time: '', notes: '' }); setShowApproveScheduleModal(true); }} className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition">Approve & Schedule</button>
                                    <button onClick={() => { setShowViewModal(false); setRejectingId(viewReq.id); setRejectNotes(''); }} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition">Reject</button>
                                </>
                            )}
                            {viewReq.status === 'Visit Scheduled' && (
                                <>
                                    <button onClick={() => { setShowViewModal(false); setResolveData({ id: viewReq.id, student_id: viewReq.student_id, notes: '' }); setShowResolveModal(true); }} className="flex-1 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition"><CheckCircle size={14} className="inline mr-1" /> Mark Resolved</button>
                                    <button onClick={() => { setShowViewModal(false); setReferCareForm({ id: viewReq.id, student_id: viewReq.student_id, student_name: viewReq.student_name, date_acted: '', actions_taken: '', comments: '' }); setShowReferCareModal(true); }} className="flex-1 py-2.5 bg-orange-500 text-white font-bold text-sm rounded-xl hover:bg-orange-600 transition"><Send size={14} className="inline mr-1" /> Refer to CARE</button>
                                </>
                            )}
                            <button onClick={() => setShowViewModal(false)} className="px-6 py-2.5 bg-gray-200 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-300 transition">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Message Modal */}
            {showMessageModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Message Student</h3>
                            <button onClick={() => setShowMessageModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Sending a message to <strong>{messageData.student_name}</strong>. They will receive this in their portal notifications.</p>
                        <div className="space-y-4">
                            <textarea value={messageData.message} onChange={(e) => setMessageData({ ...messageData, message: e.target.value })} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" placeholder="Write your message here..." required />
                            <button onClick={handleSendMessage} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"><Send size={16} className="mr-2" /> Send Message</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Endorsement Letter Viewer Modal */}
            {showLetterModal && viewReq?.care_notes && (() => {
                let letterUrl = null;
                let notesText = '';
                try {
                    const parsed = JSON.parse(viewReq.care_notes);
                    letterUrl = parsed?.letter_url;
                    notesText = parsed?.notes || '';
                } catch { }
                if (!letterUrl) return null;
                return (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-yellow-50 to-amber-50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2"><FileText size={18} className="text-yellow-600" /> Endorsement Letter</h3>
                                    <p className="text-xs text-gray-500">From CARE Staff</p>
                                </div>
                                <button onClick={() => setShowLetterModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"><XCircle size={18} /></button>
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

                                {/* Download Link */}
                                <a href={letterUrl} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold text-sm rounded-xl hover:shadow-lg shadow-yellow-200/50 transition-all">
                                    <Download size={16} /> Download Original Letter
                                </a>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DeptSupportApprovalsPage;
