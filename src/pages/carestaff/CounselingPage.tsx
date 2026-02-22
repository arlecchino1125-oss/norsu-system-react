import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../../utils/dashboardUtils';
import { formatDate, formatDateTime, generateExportFilename } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';
import CalendarView from '../../components/CalendarView';
import { jsPDF } from 'jspdf';
import {
    Users, FileText, Clock, CheckCircle, Calendar,
    User, Eye, Send, Download, XCircle
} from 'lucide-react';

const CounselingPage = ({ functions }: any) => {
    const { handleViewProfile, showToastMessage } = functions;

    // Data State
    const [counselingReqs, setCounselingReqs] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [counselingTab, setCounselingTab] = useState<string>('Referred');

    // Modals & form state
    const [viewFormReq, setViewFormReq] = useState<any>(null);
    const [showCounselingFormModal, setShowCounselingFormModal] = useState<boolean>(false);
    const [formModalView, setFormModalView] = useState<string>('referral');

    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [scheduleData, setScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [selectedApp, setSelectedApp] = useState<any>(null);

    const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
    const [completionForm, setCompletionForm] = useState<any>({ id: null, student_id: null, publicNotes: '', privateNotes: '' });

    // Fetch counseling requests
    const fetchCounseling = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('counseling_requests').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setCounselingReqs(data || []);
        } catch (error: any) {
            console.error('Error fetching counseling requests:', error);
            showToastMessage('Failed to load counseling requests', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCounseling();

        // Realtime subscription
        const counselingChannel = supabase.channel('care_counseling_isolated')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'counseling_requests' }, () => {
                fetchCounseling();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(counselingChannel);
        };
    }, []);

    // Handlers
    const handleScheduleSubmit = async (e: any) => {
        e.preventDefault();
        if (!selectedApp) return;

        try {
            const newStatus = selectedApp.status === 'Referred' ? 'Staff_Scheduled' : 'Scheduled';
            const { error } = await supabase.from('counseling_requests').update({
                status: newStatus,
                scheduled_date: `${scheduleData.date} ${scheduleData.time}`,
                resolution_notes: scheduleData.notes
            }).eq('id', selectedApp.id);

            if (error) throw error;

            await supabase.from('notifications').insert([{
                student_id: selectedApp.student_id,
                message: `Your counseling session with CARE Staff is scheduled for ${scheduleData.date} at ${scheduleData.time}.`
            }]);

            showToastMessage('Session Scheduled Successfully', 'success');
            setShowScheduleModal(false);
            setScheduleData({ date: '', time: '', notes: '' });
            fetchCounseling();
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        }
    };

    const handleCompleteSession = async (e: any) => {
        e.preventDefault();
        try {
            await supabase.from('counseling_requests').update({
                status: 'Completed',
                resolution_notes: completionForm.publicNotes,
                confidential_notes: completionForm.privateNotes
            }).eq('id', completionForm.id);

            await supabase.from('notifications').insert([{
                student_id: completionForm.student_id,
                message: `Your counseling session has been marked as Completed. You can now view the advice.`
            }]);

            showToastMessage('Session marked as complete.', 'success');
            setShowCompleteModal(false);
            fetchCounseling();
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        }
    };

    const handleDownloadReferralForm = (req: any) => {
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('DEPARTMENT HEAD REFERRAL FOR COUNSELING', 105, y, { align: 'center' });
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Office of the Director, Counseling, Assessment, Resources, and Enhancement Center', 105, y, { align: 'center' });
        y += 15;

        const marginLeft = 15;
        const halfW = 80;

        // Form Fields Helper
        const drawFieldRow = (label: string, value: string, x: number, lineLength: number, currentY: number) => {
            doc.setFont('helvetica', 'bold');
            doc.text(label, x, currentY);
            const labelW = doc.getTextWidth(label) + 2;
            doc.setFont('helvetica', 'normal');
            doc.text(value || '', x + labelW, currentY);
            doc.setDrawColor(0, 0, 0);
            doc.line(x + labelW, currentY + 1, x + labelW + lineLength, currentY + 1);
        };

        const rightX = marginLeft + halfW + 8;

        drawFieldRow('Full Name:', req.student_name || '', marginLeft, halfW, y);
        drawFieldRow('Date Filed:', formatDate(req.created_at), rightX, halfW, y);
        y += 10;

        drawFieldRow('Course & Yr:', req.course_year || '', marginLeft, halfW, y);
        y += 15;

        // Long text helper
        const drawLongText = (title: string, content: string, startY: number, lineCount: number = 4) => {
            doc.setFont('helvetica', 'bold');
            doc.text(title, 15, startY);
            let nextY = startY + 5;
            doc.setFont('helvetica', 'normal');
            doc.setDrawColor(200, 200, 200);

            for (let i = 0; i < lineCount; i++) {
                doc.line(15, nextY + (i * 7), 195, nextY + (i * 7));
            }

            if (content) {
                const lines = doc.splitTextToSize(content, 180);
                for (let i = 0; i < Math.min(lines.length, lineCount * 2); i++) {
                    doc.text(lines[i], 15, nextY + (i * 7) - 1);
                }
            }
            return nextY + (lineCount * 7) + 5;
        };

        y = drawLongText('Reason/s for Referral:', req.reason_for_referral || req.description, y, 4);
        y = drawLongText('Actions Made before referral:', req.actions_made, y, 3);
        y = drawLongText('Date / Duration of Observations:', req.date_duration_of_observations, y, 2);

        y += 10;
        drawFieldRow('Name and Signature of Ref. Person:', req.referred_by || '', 15, 70, y);
        drawFieldRow('Contact No:', req.referrer_contact_number || '', 130, 30, y);
        y += 10;
        drawFieldRow('Relationship with Student:', req.relationship_with_student || '', 15, 60, y);
        y += 20;

        if (req.referrer_signature) {
            try {
                doc.addImage(req.referrer_signature, 'PNG', 70, y - 15, 60, 20);
            } catch (err) {
                console.log('Error adding signature', err);
            }
        }

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('Note: This is a system-generated document based on the submitted referral.', 105, 280, { align: 'center' });

        doc.save(generateExportFilename(`Counseling_Referral_${(req.student_name || 'unknown').replace(/\s+/g, '_')}`, 'pdf'));
        showToastMessage('Referral form downloaded', 'success');
    };

    return (
        <>
            <div>
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Counseling Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Review applications, manage referrals, and schedule sessions</p>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Total Requests', value: counselingReqs.length, icon: <FileText size={20} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                        { label: 'Awaiting Dept', value: counselingReqs.filter(r => r.status === 'Submitted').length, icon: <Clock size={20} />, color: 'text-yellow-500', bg: 'bg-yellow-50' },
                        { label: 'Referred', value: counselingReqs.filter(r => r.status === 'Referred').length, icon: <Send size={20} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                        { label: 'Scheduled', value: counselingReqs.filter(r => r.status === 'Scheduled' || r.status === 'Staff_Scheduled').length, icon: <Calendar size={20} />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                        { label: 'Completed', value: counselingReqs.filter(r => r.status === 'Completed').length, icon: <CheckCircle size={20} />, color: 'text-green-500', bg: 'bg-green-50' },
                    ].map((stat, idx) => (
                        <div key={idx} className="card-hover bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100/80 shadow-sm animate-fade-in-up" style={{ animationDelay: `${idx * 80}ms` }}>
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3 ${stat.color} shadow-sm`}>{stat.icon}</div>
                            <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
                            <p className="text-xl font-extrabold text-gray-900">{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* Tab Bar */}
                <div className="flex flex-wrap items-center gap-2 mb-8">
                    {['Referred', 'Staff_Scheduled', 'Submitted', 'Scheduled', 'Completed', 'Calendar'].map(tabId => {
                        let label = tabId;
                        if (tabId === 'Referred') label = `Forwarded (${counselingReqs.filter(r => r.status === tabId).length})`;
                        if (tabId === 'Staff_Scheduled') label = `Staff Scheduled (${counselingReqs.filter(r => r.status === tabId).length})`;
                        if (tabId === 'Submitted') label = `Awaiting Dept (${counselingReqs.filter(r => r.status === tabId).length})`;
                        if (tabId === 'Scheduled') label = `Dept Scheduled (${counselingReqs.filter(r => r.status === tabId).length})`;
                        if (tabId === 'Completed') label = `Completed (${counselingReqs.filter(r => r.status === tabId).length})`;
                        if (tabId === 'Calendar') label = 'Calendar View';

                        return (
                            <button key={tabId} onClick={() => setCounselingTab(tabId)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${counselingTab === tabId ? 'bg-white text-purple-700 shadow-md shadow-purple-100 border border-purple-200' : 'bg-gray-100 text-gray-600 hover:text-purple-600 hover:bg-white/80 border border-transparent'}`}>
                                {label}
                            </button>
                        );
                    })}
                </div>

                {counselingTab === 'Calendar' ? (
                    <CalendarView requests={counselingReqs} />
                ) : loading ? (
                    <div className="text-center py-8 text-gray-500">Loading requests...</div>
                ) : counselingReqs.filter(r => r.status === counselingTab).length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No requests in this category.</div>
                ) : (
                    <div className="space-y-4">
                        {counselingReqs.filter(r => r.status === counselingTab).map(req => (
                            <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${req.status === 'Referred' ? 'bg-purple-100 text-purple-600' : req.status === 'Completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {req.status === 'Completed' ? <CheckCircle size={18} /> : <Users size={18} />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{req.student_name}</h3>
                                            <p className="text-xs text-gray-500">{req.request_type} • {formatDate(req.created_at)}{req.scheduled_date ? ` • Scheduled: ${formatDate(req.scheduled_date)}` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleViewProfile?.(req.student_id)} className="px-3 py-2 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition flex items-center gap-1">
                                            <User size={12} /> Profile
                                        </button>
                                        <button onClick={() => { setViewFormReq(req); setShowCounselingFormModal(true); setFormModalView('referral'); }} className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-200 transition flex items-center gap-1">
                                            <Eye size={12} /> View Form
                                        </button>
                                        {(req.status === 'Referred' || req.status === 'Pending') && (
                                            <button onClick={() => { setSelectedApp(req); setShowScheduleModal(true); }} className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition flex items-center gap-1">
                                                <Calendar size={12} /> Schedule
                                            </button>
                                        )}
                                        {(req.status === 'Scheduled' || req.status === 'Staff_Scheduled') && (
                                            <button onClick={() => { setCompletionForm({ id: req.id, student_id: req.student_id, publicNotes: '', privateNotes: '' }); setShowCompleteModal(true); }} className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition flex items-center gap-1">
                                                <CheckCircle size={12} /> Complete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Read-only Form Modal */}
            {showCounselingFormModal && viewFormReq && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-100/50 animate-fade-in-up">
                        <div className="p-8">
                            {viewFormReq.referred_by && formModalView === 'referral' ? (
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-extrabold text-lg">DEPARTMENT HEAD REFERRAL</h3>
                                            <p className="text-xs text-gray-400 mt-1">Submitted: {formatDateTime(viewFormReq.created_at)}</p>
                                        </div>
                                        <button onClick={() => setShowCounselingFormModal(false)} className="text-gray-400 hover:text-gray-600 text-xl"><XCircle /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Student</label><input readOnly value={viewFormReq.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Referred By</label><input readOnly value={viewFormReq.referred_by || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-gray-700" /></div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Reason for Referral</label>
                                        <textarea readOnly rows={4} value={viewFormReq.reason_for_referral || viewFormReq.description || ''} className="w-full bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-gray-700"></textarea>
                                    </div>
                                    <div className="flex gap-3 mt-4">
                                        <button onClick={() => handleDownloadReferralForm(viewFormReq)} className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl font-bold text-sm hover:bg-green-100 flex justify-center items-center gap-2"><Download size={16} /> PDF Form</button>
                                        <button onClick={() => setFormModalView('student')} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-sm hover:bg-indigo-100 flex justify-center items-center gap-2"><FileText size={16} /> Student Form</button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="font-extrabold text-lg">STUDENT SELF-REFERRAL</h3>
                                            <p className="text-xs text-gray-400 mt-1">Submitted: {formatDateTime(viewFormReq.created_at)}</p>
                                        </div>
                                        <button onClick={() => setShowCounselingFormModal(false)} className="text-gray-400 hover:text-gray-600 text-xl"><XCircle /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Student</label><input readOnly value={viewFormReq.student_name || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Course & Year</label><input readOnly value={viewFormReq.course_year || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-3 text-sm text-gray-700" /></div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Reason for Requesting Counseling</label>
                                        <textarea readOnly rows={4} value={viewFormReq.reason_for_referral || viewFormReq.description || ''} className="w-full bg-gray-100 border border-gray-200 rounded-xl p-4 text-sm text-gray-700"></textarea>
                                    </div>
                                    {viewFormReq.referred_by && (
                                        <button onClick={() => setFormModalView('referral')} className="w-full mt-2 py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-bold text-sm hover:bg-purple-100 flex justify-center items-center gap-2"><FileText size={16} /> View Referral Form</button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule Counseling Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="p-6 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Schedule Session</h3>
                            <button onClick={() => setShowScheduleModal(false)}><XCircle className="text-gray-400 hover:text-gray-600" /></button>
                        </div>
                        <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Date</label><input type="date" required className="w-full border rounded-lg p-2 text-sm" value={scheduleData.date} onChange={e => setScheduleData({ ...scheduleData, date: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Time</label><input type="time" required className="w-full border rounded-lg p-2 text-sm" value={scheduleData.time} onChange={e => setScheduleData({ ...scheduleData, time: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Location</label><input className="w-full border rounded-lg p-2 text-sm" value={scheduleData.location} onChange={e => setScheduleData({ ...scheduleData, location: e.target.value })} placeholder="e.g. Guidance Office" /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Notes for Student</label><textarea rows={3} className="w-full border rounded-lg p-2 text-sm" value={scheduleData.notes} onChange={e => setScheduleData({ ...scheduleData, notes: e.target.value })} placeholder="Optional notes..." /></div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowScheduleModal(false)} className="flex-1 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Confirm Schedule</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Complete Counseling Session Modal */}
            {showCompleteModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
                        <h3 className="font-bold text-lg mb-4 text-gray-900">Complete Counseling Session</h3>
                        <form onSubmit={handleCompleteSession} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Public Resolution Notes</label>
                                <textarea required rows={4} className="w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Provide advice, recommendations, or next steps..." value={completionForm.publicNotes} onChange={e => setCompletionForm({ ...completionForm, publicNotes: e.target.value })}></textarea>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Confidential Notes</label>
                                <textarea className="w-full border rounded-lg p-2 text-sm bg-red-50" rows={3} placeholder="Private notes for staff only..." value={completionForm.privateNotes} onChange={e => setCompletionForm({ ...completionForm, privateNotes: e.target.value })}></textarea>
                                <p className="text-[10px] text-red-500 mt-1">* Only visible to Guidance Staff</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setShowCompleteModal(false)} className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">Complete Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default CounselingPage;
