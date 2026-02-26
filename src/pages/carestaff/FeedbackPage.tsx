import { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/dashboardUtils';
import { formatDate, formatDateTime, generateExportFilename } from '../../utils/formatters';
import type { CareStaffDashboardFunctions } from './types';

interface FeedbackPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
}

const FeedbackPage = ({ functions }: FeedbackPageProps) => {
    const [currentView, setCurrentView] = useState('General');
    const [eventFilter, setEventFilter] = useState('All Events');
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

    const ccQuestions = [
        {
            key: 'cc1',
            question: "CC1. Which of the following best describes your awareness of a CC?",
            options: {
                1: "1. I know what a CC is and I saw this office's CC.",
                2: "2. I know what a CC is but I did NOT see this office's CC.",
                3: "3. I learned of the CC only when I saw this office's CC.",
                4: '4. I do not know what a CC is and I did not see one in this office.',
            } as Record<number, string>
        },
        {
            key: 'cc2',
            question: 'CC2. If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?',
            options: {
                1: '1. Easy to see',
                2: '2. Somewhat easy to see',
                3: '3. Difficult to see',
                4: '4. Not visible at all',
                5: '5. N/A',
            } as Record<number, string>
        },
        {
            key: 'cc3',
            question: 'CC3. If aware of CC (answered 1-3 in CC1), how much did the CC help you in your transaction?',
            options: {
                1: '1. Helped very much',
                2: '2. Somewhat helped',
                3: '3. Did not help',
                4: '4. N/A',
            } as Record<number, string>
        }
    ];

    const getCcAnswerText = (item: any, value: any) => {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) return 'No response';
        return item.options[parsed] || String(value);
    };

    const getEventName = (row: any) => row?.events?.title || 'Event';

    const getEventRating = (row: any) => {
        const direct = Number(row?.rating);
        if (Number.isFinite(direct) && direct >= 1 && direct <= 5) return direct;
        const scores = [1, 2, 3, 4, 5, 6, 7]
            .map(i => Number(row?.[`q${i}_score`]))
            .filter(v => Number.isFinite(v) && v >= 1 && v <= 5);
        if (scores.length === 0) return 0;
        return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    };

    const computeStats = (list: any[]) => {
        if (!list || list.length === 0) return { avg: 0, total: 0, distribution: [0, 0, 0, 0, 0] };
        const total = list.length;
        const sum = list.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0);
        const dist = [0, 0, 0, 0, 0];
        list.forEach(r => {
            const rounded = Math.round(Number(r.rating));
            if (rounded >= 1 && rounded <= 5) dist[rounded - 1]++;
        });
        return { avg: Number((sum / total).toFixed(1)), total, distribution: dist };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let rawData = [];
            if (currentView === 'Events') {
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
                    rating: getEventRating(d),
                    comment: d.open_comments || d.feedback || d.comments || '',
                    date: d.submitted_at,
                    context: getEventName(d),
                    hasEvaluation: !!(d.q1_score || d.q2_score)
                }));
                if (eventFilter !== 'All Events') {
                    rawData = rawData.filter(item => item.context === eventFilter);
                }
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
                setEventFilter('All Events');
            }

            setItems(rawData);
            setStats(computeStats(rawData));

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentView, eventFilter]);

    const handleViewEvaluation = (itemId) => {
        const raw = rawEventData.find(d => d.id === itemId);
        if (raw) setViewingEval(raw);
    };

    const eventOptions = ['All Events', ...Array.from(new Set((rawEventData || []).map(getEventName)))];
    const filteredEventRows = (rawEventData || []).filter(d => eventFilter === 'All Events' || getEventName(d) === eventFilter);

    const eventCriteriaStats = criteriaLabels.map((label, idx) => {
        const key = `q${idx + 1}_score`;
        const scores = filteredEventRows
            .map(row => Number(row?.[key]))
            .filter(score => Number.isFinite(score) && score >= 1 && score <= 5);
        const mean = scores.length > 0
            ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2))
            : null;
        return { label, mean, responses: scores.length };
    });

    const eventOpenText = {
        best: filteredEventRows.filter(r => r.open_best && String(r.open_best).trim()),
        suggestions: filteredEventRows.filter(r => r.open_suggestions && String(r.open_suggestions).trim()),
        comments: filteredEventRows.filter(r => (r.open_comments || r.feedback || r.comments) && String(r.open_comments || r.feedback || r.comments).trim())
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
                        const eventExportRows = filteredEventRows;
                        const headers = ['Student', 'Sex', 'College', 'Event', 'Date of Activity', 'Avg Rating', 'Q1-Relevance', 'Q2-Quality', 'Q3-Timeliness', 'Q4-Management', 'Q5-Organization', 'Q6-Assessment', 'Q7-Facilitator', 'What They Liked Best', 'Suggestions', 'Other Comments', 'Submitted'];
                        const rows = eventExportRows.map(d => [d.student_name, d.sex || '', d.college || '', getEventName(d), d.date_of_activity || '', getEventRating(d) || '', d.q1_score || '', d.q2_score || '', d.q3_score || '', d.q4_score || '', d.q5_score || '', d.q6_score || '', d.q7_score || '', d.open_best || '', d.open_suggestions || '', d.open_comments || d.feedback || d.comments || '', formatDateTime(d.submitted_at || d.created_at)]);
                        exportToExcel(headers, rows, generateExportFilename('event_evaluations', 'xlsx').replace('.xlsx', ''));
                    } else if (currentView === 'General' && rawGeneralData.length > 0) {
                        const headers = ['Student', 'Client Type', 'Sex', 'Age', 'Region', 'Service Availed', 'CC1', 'CC2', 'CC3', 'SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8', 'Suggestions', 'Email', 'Date'];
                        const rows = rawGeneralData.map(d => [d.student_name, d.client_type || '', d.sex || '', d.age || '', d.region || '', d.service_availed || '', d.cc1 || '', d.cc2 || '', d.cc3 || '', d.sqd0 ?? '', d.sqd1 ?? '', d.sqd2 ?? '', d.sqd3 ?? '', d.sqd4 ?? '', d.sqd5 ?? '', d.sqd6 ?? '', d.sqd7 ?? '', d.sqd8 ?? '', d.suggestions || '', d.email || '', formatDateTime(d.created_at)]);
                        exportToExcel(headers, rows, generateExportFilename('general_csm_feedback', 'xlsx').replace('.xlsx', ''));
                    } else {
                        const headers = ['Student', 'Client Type', 'Sex', 'Age', 'Region', 'Service Availed', 'CC1', 'CC2', 'CC3', 'SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8', 'Suggestions', 'Email', 'Date'];
                        const rows = rawGeneralData.map(d => [d.student_name, d.client_type || '', d.sex || '', d.age || '', d.region || '', d.service_availed || '', d.cc1 || '', d.cc2 || '', d.cc3 || '', d.sqd0 ?? '', d.sqd1 ?? '', d.sqd2 ?? '', d.sqd3 ?? '', d.sqd4 ?? '', d.sqd5 ?? '', d.sqd6 ?? '', d.sqd7 ?? '', d.sqd8 ?? '', d.suggestions || '', d.email || '', formatDateTime(d.created_at)]);
                        exportToExcel(headers, rows, generateExportFilename('general_csm_feedback', 'xlsx').replace('.xlsx', ''));
                    }
                }} disabled={items.length === 0} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Download size={16} /> Export Excel
                </button>
            </div>

            <div className="flex gap-4 mb-8">
                <button onClick={() => setCurrentView('Events')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'Events' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>Events &amp; Activities</button>
                <button onClick={() => setCurrentView('General')} className={`px-4 py-2 rounded-lg font-bold text-sm transition ${currentView === 'General' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>General (CSM)</button>
            </div>

            {currentView === 'Events' && (
                <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <label htmlFor="event-feedback-filter" className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2 block">
                        Filter by Event
                    </label>
                    <select
                        id="event-feedback-filter"
                        value={eventFilter}
                        onChange={(e) => setEventFilter(e.target.value)}
                        className="w-full md:w-96 px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    >
                        {eventOptions.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

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

            {currentView === 'Events' && (
                <>
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mb-6">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Likert Criteria Statistics {eventFilter !== 'All Events' ? `(${eventFilter})` : ''}</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-[10px] uppercase text-gray-500">
                                    <tr>
                                        <th className="text-left px-3 py-2">Criteria</th>
                                        <th className="text-left px-3 py-2">Mean</th>
                                        <th className="text-left px-3 py-2">Responses</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {eventCriteriaStats.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 text-xs text-gray-700">{row.label}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-900">{row.mean ?? '-'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-600">{row.responses}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-700 mb-2">What they liked best</p>
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {eventOpenText.best.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.best.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_best}</div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-700 mb-2">Suggestions</p>
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {eventOpenText.suggestions.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.suggestions.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_suggestions}</div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-xs font-bold text-gray-700 mb-2">Other comments</p>
                            <div className="space-y-2 max-h-44 overflow-y-auto">
                                {eventOpenText.comments.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.comments.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_comments || r.feedback || r.comments}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

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
                                        <p className="text-[10px] text-gray-400">{formatDate(item.date)}</p>
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
                                <div className="info-item"><label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: '2px' }}>Date of Activity</label><p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>{formatDate(viewingEval.date_of_activity)}</p></div>
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
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Date</p><p className="text-sm font-bold">{formatDate(viewingCSM.created_at)}</p></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Region</p><p className="text-sm font-bold">{viewingCSM.region || '—'}</p></div>
                                    <div><p className="text-[10px] font-bold text-gray-400 uppercase">Service Availed</p><p className="text-sm font-bold">{viewingCSM.service_availed || '—'}</p></div>
                                </div>
                                {viewingCSM.email && <div><p className="text-[10px] font-bold text-gray-400 uppercase">Email</p><p className="text-sm font-bold text-blue-600">{viewingCSM.email}</p></div>}

                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Citizen's Charter Questions</p>
                                    <p className="text-[10px] text-gray-500 mb-3">
                                        Full CC statements from the original form are shown below with the selected answer.
                                    </p>
                                    <div className="space-y-3">
                                        {ccQuestions.map((item: any) => {
                                            const rawValue = viewingCSM[item.key];
                                            const code = Number(rawValue);
                                            return (
                                                <div key={item.key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                    <p className="text-xs font-bold text-gray-800">{item.question}</p>
                                                    <p className="text-xs text-gray-700 mt-1">{getCcAnswerText(item, rawValue)}</p>
                                                    <p className="text-[10px] text-gray-400 mt-1">Response code: {Number.isFinite(code) && code > 0 ? code : 'N/A'}</p>
                                                </div>
                                            );
                                        })}
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




