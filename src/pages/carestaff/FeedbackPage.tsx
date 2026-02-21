import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';

const FeedbackPage = ({ functions }: any) => {
    const [currentView, setCurrentView] = useState('Counseling');
    const [items, setItems] = useState<any[]>([]);
    const [rawEventData, setRawEventData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
    const [viewingEval, setViewingEval] = useState(null);
    const [rawGeneralData, setRawGeneralData] = useState<any[]>([]);
    const [viewingCSM, setViewingCSM] = useState<any>(null);
    const printRef = useRef(null);

    const criteriaLabels = [
        'Relevance of the activity to the needs/problems of the clientele',
        'Quality of the activity',
        'Timeliness',
        'Management of the activity',
        'Overall organization of the activity',
        'Overall assessment of the activity',
        'Skills/competence of the facilitator/s'
    ];

    const fetchData = async () => {
        setLoading(true);
        try {
            let rawData = [];
            if (currentView === 'Counseling') {
                const { data, error } = await supabase
                    .from('counseling_requests')
                    .select('*')
                    .not('rating', 'is', null)
                    .order('created_at', { ascending: false });
                if (error) throw error;
                rawData = data.map(d => ({
                    id: d.id,
                    student: d.student_name,
                    rating: d.rating,
                    comment: d.feedback,
                    date: d.created_at,
                    context: d.request_type
                }));
                setRawEventData([]);
            } else if (currentView === 'Events') {
                const { data, error } = await supabase
                    .from('event_feedback')
                    .select('*, events(title)')
                    .order('submitted_at', { ascending: false });
                if (error) throw error;
                setRawEventData(data || []);
                setRawGeneralData([]);
                rawData = (data || []).map(d => ({
                    id: d.id,
                    student: d.student_name,
                    rating: d.rating,
                    comment: d.feedback,
                    date: d.submitted_at,
                    context: d.events?.title || 'Event',
                    hasEvaluation: !!(d.q1_score || d.q2_score)
                }));
            } else {
                // General CSM feedback
                const { data, error } = await supabase
                    .from('general_feedback')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (error) throw error;
                setRawGeneralData(data || []);
                setRawEventData([]);
                rawData = (data || []).map(d => {
                    const sqdScores = [d.sqd0, d.sqd1, d.sqd2, d.sqd3, d.sqd4, d.sqd5, d.sqd6, d.sqd7, d.sqd8].filter(v => v != null && v > 0);
                    const avg = sqdScores.length > 0 ? Math.round(sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length) : 0;
                    return {
                        id: d.id,
                        student: d.student_name,
                        rating: avg,
                        comment: d.suggestions,
                        date: d.created_at,
                        context: d.service_availed || 'General'
                    };
                });
            }

            setItems(rawData);

            if (rawData.length > 0) {
                const total = rawData.length;
                const sum = rawData.reduce((acc, curr) => acc + (curr.rating || 0), 0);
                const dist = [0, 0, 0, 0, 0];
                rawData.forEach(r => {
                    if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++;
                });
                setStats({ avg: Number((sum / total).toFixed(1)), total, distribution: dist });
            } else {
                setStats({ avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] });
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentView]);

    const handleViewEvaluation = (itemId) => {
        const raw = rawEventData.find(d => d.id === itemId);
        if (raw) setViewingEval(raw);
    };

    const handlePrintEval = () => {
        if (!printRef.current) return;
        const printContent = printRef.current.innerHTML;
        const printWindow = window.open('', '_blank', 'width=800,height=900');
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Participant's Evaluation Form</title><style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; font-size: 14px; }
            .eval-header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
            .eval-header h1 { font-size: 18px; font-weight: 800; color: #1e40af; margin: 0; }
            .eval-header p { font-size: 11px; color: #6b7280; margin: 4px 0 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
            .info-item label { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 2px; }
            .info-item p { font-size: 13px; font-weight: 600; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background: #f9fafb; font-weight: 700; text-transform: uppercase; font-size: 10px; color: #6b7280; }
            .score { text-align: center; font-weight: 700; font-size: 14px; }
            .open-section { margin-bottom: 16px; }
            .open-section label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 4px; }
            .open-section p { background: #f0f9ff; padding: 8px 12px; border-radius: 6px; font-size: 12px; }
            @media print { body { padding: 20px; } }
        </style></head><body>${printContent}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    };

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback Center</h1>
                    <p className="text-gray-500 text-sm mt-1">Review student satisfaction and feedback.</p>
                </div>
                <button onClick={() => {
                    if (items.length === 0) return;
                    if (currentView === 'Events' && rawEventData.length > 0) {
                        const headers = ['Student', 'Sex', 'College', 'Event', 'Date of Activity', 'Avg Rating', 'Q1-Relevance', 'Q2-Quality', 'Q3-Timeliness', 'Q4-Management', 'Q5-Organization', 'Q6-Assessment', 'Q7-Facilitator', 'What They Liked Best', 'Suggestions', 'Other Comments', 'Submitted'];
                        const rows = rawEventData.map(d => [d.student_name, d.sex || '', d.college || '', d.events?.title || '', d.date_of_activity || '', d.rating || '', d.q1_score || '', d.q2_score || '', d.q3_score || '', d.q4_score || '', d.q5_score || '', d.q6_score || '', d.q7_score || '', d.open_best || '', d.open_suggestions || '', d.open_comments || '', d.submitted_at ? new Date(d.submitted_at).toLocaleString() : '']);
                        exportToExcel(headers, rows, 'event_evaluations');
                    } else if (currentView === 'General' && rawGeneralData.length > 0) {
                        const headers = ['Student', 'Client Type', 'Sex', 'Age', 'Region', 'Service Availed', 'CC1', 'CC2', 'CC3', 'SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8', 'Suggestions', 'Email', 'Date'];
                        const rows = rawGeneralData.map(d => [d.student_name, d.client_type || '', d.sex || '', d.age || '', d.region || '', d.service_availed || '', d.cc1 || '', d.cc2 || '', d.cc3 || '', d.sqd0 ?? '', d.sqd1 ?? '', d.sqd2 ?? '', d.sqd3 ?? '', d.sqd4 ?? '', d.sqd5 ?? '', d.sqd6 ?? '', d.sqd7 ?? '', d.sqd8 ?? '', d.suggestions || '', d.email || '', d.created_at ? new Date(d.created_at).toLocaleString() : '']);
                        exportToExcel(headers, rows, 'general_csm_feedback');
                    } else {
                        const headers = ['Student', 'Rating', 'Comment', 'Date', 'Request Type'];
                        const rows = items.map(i => [i.student, i.rating, i.comment || '', new Date(i.date).toLocaleString(), i.context]);
                        exportToExcel(headers, rows, 'counseling_feedback');
                    }
                }} disabled={items.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            <div className="flex gap-4 mb-8">
                <button onClick={() => setCurrentView('Counseling')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'Counseling' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Counseling Services</button>
                <button onClick={() => setCurrentView('Events')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'Events' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Events &amp; Activities</button>
                <button onClick={() => setCurrentView('General')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'General' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>General (CSM)</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-5xl font-bold text-gray-900 mb-2">{stats.avg}</h3>
                    <div className="flex text-yellow-400 text-sm mb-2">
                        {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-lg ${n <= Math.round(stats.avg) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                    </div>
                    <p className="text-xs text-gray-500 uppercase font-bold">Average Rating</p>
                </div>
                <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-end gap-4 h-40">
                    {stats.distribution.map((count, idx) => {
                        const pct = stats.total ? (count / stats.total) * 100 : 0;
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                <div className="w-full bg-blue-100 rounded-t-lg relative group transition-all duration-500" style={{ height: `${pct}%`, minHeight: '4px' }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">{count} reviews</div>
                                </div>
                                <span className="text-xs font-bold text-gray-600">{idx + 1} <span className="text-gray-400">★</span></span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {loading ? <div className="text-center py-12 text-gray-500">Loading feedback...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map(item => (
                        <div key={item.id} onClick={() => {
                            if (currentView === 'Events' && item.hasEvaluation) handleViewEvaluation(item.id);
                            if (currentView === 'General') { const raw = rawGeneralData.find(d => d.id === item.id); if (raw) setViewingCSM(raw); }
                        }} className={`bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition ${(currentView === 'Events' && item.hasEvaluation) || currentView === 'General' ? 'cursor-pointer' : ''}`}>
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">{item.student.charAt(0)}</div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-xs">{item.student}</h4>
                                        <p className="text-[10px] text-gray-400">{new Date(item.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex text-yellow-400">
                                    {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-xs ${n <= item.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <p className="text-[10px] font-bold text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded">{item.context}</p>
                            </div>
                            {item.comment && <p className="text-xs text-gray-600 italic">{item.comment}</p>}
                            {currentView === 'General' && <p className="text-[10px] text-blue-500 font-bold mt-2">Click to view full form →</p>}
                        </div>
                    ))}
                    {items.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No feedback found for this category.</div>}
                </div>
            )}

            {/* View Evaluation Form Modal */}
            {viewingEval && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
                        <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Negros Oriental State University — CARE Center</p>
                                    <h3 className="text-lg font-extrabold tracking-tight">PARTICIPANT'S EVALUATION FORM</h3>
                                    <p className="text-xs text-blue-200 mt-1 font-medium">{viewingEval.events?.title || 'Event'}</p>
                                </div>
                                <button onClick={() => setViewingEval(null)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all flex-shrink-0 text-lg">✕</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6" ref={printRef}>
                            <div style={{ display: 'none' }} className="eval-header">
                                <div className="eval-header"><h1>PARTICIPANT'S EVALUATION FORM</h1><p>Negros Oriental State University — CARE Center</p><p>{viewingEval.events?.title || 'Event'}</p></div>
                            </div>
                            <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                                <div className="info-item"><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '2px' }}>Name</label><p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{viewingEval.student_name}</p></div>
                                <div className="info-item"><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '2px' }}>Sex</label><p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{viewingEval.sex || '—'}</p></div>
                                <div className="info-item"><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '2px' }}>College / Course</label><p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{viewingEval.college || '—'}</p></div>
                                <div className="info-item"><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '2px' }}>Date of Activity</label><p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{viewingEval.date_of_activity ? new Date(viewingEval.date_of_activity).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p></div>
                            </div>

                            <div>
                                <h4 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e40af', marginBottom: '12px' }}>Evaluation Criteria</h4>
                                <div style={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                                        <div style={{ padding: '10px 16px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280' }}>Criteria</div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#6b7280' }}>Score</div>
                                    </div>
                                    {criteriaLabels.map((label, idx) => {
                                        const score = viewingEval[`q${idx + 1}_score`];
                                        const scoreColor = score >= 4 ? '#16a34a' : score >= 3 ? '#ca8a04' : '#ef4444';
                                        return (
                                            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px', background: idx % 2 === 0 ? '#fff' : '#fafafa', borderBottom: idx < 6 ? '1px solid #f3f4f6' : 'none' }}>
                                                <div style={{ padding: '10px 16px', fontSize: '12px', color: '#374151' }}><span style={{ fontWeight: 700, color: '#9ca3af', marginRight: '8px' }}>{idx + 1}.</span>{label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor }}>{score || '—'}</span></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {viewingEval.open_best && (
                                <div className="open-section"><label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>What they liked best about the activity</label><p style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', margin: 0 }}>{viewingEval.open_best}</p></div>
                            )}
                            {viewingEval.open_suggestions && (
                                <div className="open-section"><label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Suggestions to further improve</label><p style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', margin: 0 }}>{viewingEval.open_suggestions}</p></div>
                            )}
                            {viewingEval.open_comments && (
                                <div className="open-section"><label style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '4px' }}>Other comments</label><p style={{ background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', margin: 0 }}>{viewingEval.open_comments}</p></div>
                            )}
                        </div>

                        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex gap-3">
                            <button onClick={handlePrintEval} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all">
                                <Download size={16} /> Download PDF
                            </button>
                            <button onClick={() => setViewingEval(null)} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View CSM General Feedback Modal */}
            {viewingCSM && (() => {
                const sqdLabels = [
                    'SQD0. I am satisfied with the service that I availed.',
                    'SQD1. I spent a reasonable amount of time for my transaction.',
                    "SQD2. The office followed the transaction's requirements and steps based on the information provided.",
                    "SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.",
                    "SQD4. I easily found information about my transaction from the office's website.",
                    'SQD5. I paid a reasonable amount of fees for my transaction.',
                    "SQD6. I am confident my online transaction was secure.",
                    "SQD7. The office's online support was available, and (if asked questions) online support was quick to respond.",
                    'SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.',
                ];
                return (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
                            <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Client Satisfaction Measurement</p>
                                        <h3 className="text-xl font-extrabold">{viewingCSM.service_availed || 'General Feedback'}</h3>
                                        <p className="text-xs text-blue-200 mt-1">Submitted by {viewingCSM.student_name}</p>
                                    </div>
                                    <button onClick={() => setViewingCSM(null)} className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-lg transition">✕</button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1 p-8 space-y-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Client Type</p><p className="text-sm font-bold">{viewingCSM.client_type || '—'}</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Sex</p><p className="text-sm font-bold">{viewingCSM.sex || '—'}</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Age</p><p className="text-sm font-bold">{viewingCSM.age || '—'}</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Date</p><p className="text-sm font-bold">{viewingCSM.created_at ? new Date(viewingCSM.created_at).toLocaleDateString() : '—'}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Region</p><p className="text-sm font-bold">{viewingCSM.region || '—'}</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Service Availed</p><p className="text-sm font-bold">{viewingCSM.service_availed || '—'}</p></div>
                                </div>
                                {viewingCSM.email && <div><p className="text-[10px] font-bold text-gray-400 uppercase">Email</p><p className="text-sm font-bold text-blue-600">{viewingCSM.email}</p></div>}

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Citizen's Charter Questions</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC1 — Awareness</span><span className="text-xs font-bold">{viewingCSM.cc1 || '—'}</span></div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC2 — Visibility</span><span className="text-xs font-bold">{viewingCSM.cc2 === 5 ? 'N/A' : viewingCSM.cc2 || '—'}</span></div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC3 — Helpfulness</span><span className="text-xs font-bold">{viewingCSM.cc3 === 4 ? 'N/A' : viewingCSM.cc3 || '—'}</span></div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Service Quality Dimensions</p>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <div className="grid grid-cols-[1fr_80px] bg-gray-50 border-b border-gray-200">
                                            <div className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase">Question</div>
                                            <div className="flex items-center justify-center text-[10px] font-bold text-gray-500">Score</div>
                                        </div>
                                        {sqdLabels.map((label, idx) => {
                                            const score = viewingCSM[`sqd${idx}`];
                                            const scoreLabel = score === 0 ? 'N/A' : score;
                                            const scoreColor = score >= 4 ? '#16a34a' : score >= 3 ? '#ca8a04' : score > 0 ? '#ef4444' : '#9ca3af';
                                            return (
                                                <div key={idx} className={`grid grid-cols-[1fr_80px] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}>
                                                    <div className="px-4 py-2.5 text-xs text-gray-700">{label}</div>
                                                    <div className="flex items-center justify-center"><span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor }}>{scoreLabel}</span></div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {viewingCSM.suggestions && (
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Suggestions</p><p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">{viewingCSM.suggestions}</p></div>
                                )}
                            </div>
                            <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
                                <button onClick={() => setViewingCSM(null)} className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default FeedbackPage;
