import { Download } from 'lucide-react';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { formatDate, formatDateTime, generateExportFilename } from '../../../../../utils/formatters';
import type { CareStaffDashboardFunctions } from '../../../types';
import PaginationControls from '../../../../../components/PaginationControls';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card';
import { useCareStaffFeedback, FEEDBACK_PAGE_SIZE } from '../hooks/useCareStaffFeedback';
import type { CareStaffFeedbackPageProps } from '../hooks/useCareStaffFeedback';

const formatEventTime = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(`1970-01-01T${value}`);
    return isNaN(date.getTime()) ? null : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatEventSchedule = (event?: { event_date?: string | null; event_time?: string | null; end_time?: string | null } | null) => {
    if (!event) return null;
    const datePart = event.event_date ? formatDate(event.event_date) : null;
    const startPart = formatEventTime(event.event_time);
    const endPart = formatEventTime(event.end_time);
    const timePart = startPart && endPart ? `${startPart} – ${endPart}` : startPart;
    return [datePart, timePart].filter(Boolean).join(' · ') || null;
};

const CareStaffFeedbackPage = ({ functions }: CareStaffFeedbackPageProps) => {
    const {
        currentView,
        setCurrentView,
        eventFilter,
        setEventFilter,
        currentPage,
        setCurrentPage,
        feedbackTotal,
        items,
        rawEventData,
        loading,
        stats,
        viewingEval,
        setViewingEval,
        rawGeneralData,
        viewingCSM,
        setViewingCSM,
        printRef,
        criteriaLabels,
        ccQuestions,
        getCcAnswerText,
        getEventName,
        getEventRating,
        handleViewEvaluation,
        eventOptions,
        filteredEventRows,
        eventCriteriaStats,
        eventOpenText,
        handlePrintEval
    } = useCareStaffFeedback({ functions });

    return (
        <div className="space-y-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Feedback Center</h1>
                    <p className="text-gray-500 text-sm mt-1">Review student satisfaction and feedback.</p>
                </div>
                <Button
                    variant="secondary"
                    leftIcon={<Download size={16} />}
                    disabled={items.length === 0}
                    onClick={() => {
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
                    }}
                >
                    Export Excel
                </Button>
            </div>

            <div className="flex gap-4 mb-8">
                <Button
                    variant={currentView === 'Events' ? 'primary' : 'secondary'}
                    onClick={() => setCurrentView('Events')}
                    className={currentView === 'Events' ? '!bg-blue-600 hover:!bg-blue-700' : ''}
                >
                    Events &amp; Activities
                </Button>
                <Button
                    variant={currentView === 'General' ? 'primary' : 'secondary'}
                    onClick={() => setCurrentView('General')}
                    className={currentView === 'General' ? '!bg-blue-600 hover:!bg-blue-700' : ''}
                >
                    General (CSM)
                </Button>
            </div>

            {currentView === 'Events' && (
                <Card className="mb-6 p-4 !rounded-xl !border-gray-200">
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
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card className="!rounded-xl !border-gray-200 flex flex-col items-center justify-center text-center">
                    <CardContent className="flex flex-col items-center justify-center">
                        <h3 className="text-5xl font-bold text-gray-900 mb-2">{stats.avg}</h3>
                        <div className="flex text-yellow-400 text-sm mb-2">
                            {[1, 2, 3, 4, 5].map(n => <span key={n} className={`text-lg ${n <= Math.round(stats.avg) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                        </div>
                        <p className="text-xs text-gray-500 uppercase font-bold">Average Rating</p>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3 !rounded-xl !border-gray-200 flex items-end gap-4 h-40">
                    <CardContent className="flex items-end gap-4 w-full h-full p-6">
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
                    </CardContent>
                </Card>
            </div>

            {currentView === 'Events' && (
                <>
                    <Card className="mb-6 !rounded-xl !border-gray-200">
                        <CardHeader className="!border-gray-200">
                            <CardTitle className="text-sm">Likert Criteria Statistics {eventFilter !== 'All Events' ? `(${eventFilter})` : ''}</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                        <Card className="!rounded-xl !border-gray-200">
                            <CardContent className="space-y-2 max-h-44 overflow-y-auto">
                                <CardTitle className="text-xs mb-2">What they liked best</CardTitle>
                                {eventOpenText.best.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.best.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_best}</div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="!rounded-xl !border-gray-200">
                            <CardContent className="space-y-2 max-h-44 overflow-y-auto">
                                <CardTitle className="text-xs mb-2">Suggestions</CardTitle>
                                {eventOpenText.suggestions.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.suggestions.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_suggestions}</div>
                                ))}
                            </CardContent>
                        </Card>
                        <Card className="!rounded-xl !border-gray-200">
                            <CardContent className="space-y-2 max-h-44 overflow-y-auto">
                                <CardTitle className="text-xs mb-2">Other comments</CardTitle>
                                {eventOpenText.comments.length === 0 && <p className="text-xs text-gray-400">No responses.</p>}
                                {eventOpenText.comments.slice(0, 8).map((r: any) => (
                                    <div key={r.id} className="text-xs bg-blue-50 rounded-lg p-2 text-gray-700">{r.open_comments || r.feedback || r.comments}</div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}

            {loading ? <div className="text-center py-12 text-gray-500">Loading feedback...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {items.map(item => (
                        <Card
                            key={item.id}
                            hoverEffect={(currentView === 'Events' && item.hasEvaluation) || currentView === 'General'}
                            className={`!rounded-xl !border-gray-200 ${(currentView === 'Events' && item.hasEvaluation) || currentView === 'General' ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                                if (currentView === 'Events' && item.hasEvaluation) handleViewEvaluation(item.id);
                                if (currentView === 'General') { const raw = rawGeneralData.find(d => d.id === item.id); if (raw) setViewingCSM(raw); }
                            }}
                        >
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
                        </Card>
                    ))}
                    {items.length === 0 && <div className="col-span-full text-center py-12 text-gray-400">No feedback found for this category.</div>}
                </div>
            )}
            <Card>
                <PaginationControls
                    page={currentPage}
                    pageSize={FEEDBACK_PAGE_SIZE}
                    total={feedbackTotal}
                    isLoading={loading}
                    onPageChange={setCurrentPage}
                />
            </Card>

            {/* View Evaluation Form Modal */}
            {viewingEval && (
                <div className="fixed inset-x-0 bottom-3 top-3 z-[70] flex items-start justify-center overflow-visible bg-transparent px-3 md:top-[4.75rem]">
                    <div className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 text-white">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Negros Oriental State University — CARE Center</p>
                                    <h3 className="text-lg font-extrabold tracking-tight">PARTICIPANT'S EVALUATION FORM</h3>
                                    <div className="mt-3 inline-flex flex-col gap-0.5 rounded-lg bg-white/10 px-3 py-2">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-blue-300">Event</p>
                                        <p className="text-base font-extrabold text-white">{viewingEval.events?.title || 'Untitled event'}</p>
                                        {formatEventSchedule(viewingEval.events) && (
                                            <p className="text-[11px] font-semibold text-blue-200">{formatEventSchedule(viewingEval.events)}</p>
                                        )}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setViewingEval(null)} className="!bg-white/15 hover:!bg-white/25 !text-white !rounded-lg flex-shrink-0">✕</Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 space-y-5 lg:p-6" ref={printRef}>
                            <div style={{ display: 'none' }} className="eval-header">
                                <div className="eval-header">
                                    <h1>PARTICIPANT'S EVALUATION FORM</h1>
                                    <p>Negros Oriental State University — CARE Center</p>
                                    <p style={{ fontWeight: 700 }}>{viewingEval.events?.title || 'Untitled event'}</p>
                                    {formatEventSchedule(viewingEval.events) && <p>{formatEventSchedule(viewingEval.events)}</p>}
                                </div>
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

                        <div className="flex flex-shrink-0 gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-3">
                            <Button
                                variant="primary"
                                size="lg"
                                leftIcon={<Download size={16} />}
                                onClick={handlePrintEval}
                                className="flex-1 !bg-gradient-to-r !from-blue-600 !to-blue-700 !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/30"
                            >
                                Download PDF
                            </Button>
                            <Button variant="secondary" onClick={() => setViewingEval(null)}>Close</Button>
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
                    <div className="fixed inset-x-0 bottom-3 top-3 z-[70] flex items-start justify-center overflow-visible bg-transparent px-3 md:top-[4.75rem]">
                        <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                            <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 text-white sm:px-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Client Satisfaction Measurement</p>
                                        <h3 className="text-lg font-extrabold leading-tight">{viewingCSM.service_availed || 'General Feedback'}</h3>
                                        <p className="text-xs text-blue-200 mt-1">Submitted by {viewingCSM.student_name}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setViewingCSM(null)} className="!bg-white/15 hover:!bg-white/25 !text-white !rounded-xl">✕</Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.86fr_1.34fr]">
                                    <div className="space-y-4">
                                        <div className="rounded-xl border border-gray-200 bg-white p-4">
                                            <p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-gray-400">Respondent Details</p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Client Type</p><p className="text-sm font-bold">{viewingCSM.client_type || '-'}</p></div>
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Sex</p><p className="text-sm font-bold">{viewingCSM.sex || '-'}</p></div>
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Age</p><p className="text-sm font-bold">{viewingCSM.age || '-'}</p></div>
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Date</p><p className="text-sm font-bold">{formatDate(viewingCSM.created_at)}</p></div>
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Region</p><p className="text-sm font-bold">{viewingCSM.region || '-'}</p></div>
                                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Service Availed</p><p className="text-sm font-bold">{viewingCSM.service_availed || '-'}</p></div>
                                                {viewingCSM.email && (
                                                    <div className="col-span-2">
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Email</p>
                                                        <p className="break-all text-sm font-bold text-blue-600">{viewingCSM.email}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Citizen's Charter Questions</p>
                                            <div className="mt-3 space-y-2">
                                                {ccQuestions.map((item: any) => {
                                                    const rawValue = viewingCSM[item.key];
                                                    const code = Number(rawValue);
                                                    return (
                                                        <div key={item.key} className="rounded-lg border border-gray-100 bg-white p-2.5">
                                                            <p className="text-[11px] font-bold leading-snug text-gray-800">{item.question}</p>
                                                            <p className="mt-1 text-[11px] leading-snug text-gray-700">{getCcAnswerText(item, rawValue)}</p>
                                                            <p className="mt-1 text-[10px] text-gray-400">Response code: {Number.isFinite(code) && code > 0 ? code : 'N/A'}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Service Quality Dimensions</p>
                                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                                <div className="grid grid-cols-[1fr_4rem] border-b border-gray-200 bg-gray-50">
                                                    <div className="px-3 py-2 text-[10px] font-bold uppercase text-gray-500">Question</div>
                                                    <div className="flex items-center justify-center text-[10px] font-bold text-gray-500">Score</div>
                                                </div>
                                                {sqdLabels.map((label, idx) => {
                                                    const score = viewingCSM[`sqd${idx}`];
                                                    const scoreLabel = score === 0 ? 'N/A' : score;
                                                    const scoreColor = score >= 4 ? '#16a34a' : score >= 3 ? '#ca8a04' : score > 0 ? '#ef4444' : '#9ca3af';
                                                    return (
                                                        <div key={idx} className={`grid grid-cols-[1fr_4rem] ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}>
                                                            <div className="px-3 py-2 text-[11px] leading-snug text-gray-700">{label}</div>
                                                            <div className="flex items-center justify-center"><span style={{ fontSize: '15px', fontWeight: 700, color: scoreColor }}>{scoreLabel}</span></div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {viewingCSM.suggestions && (
                                            <div>
                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">Suggestions</p>
                                                <p className="rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-gray-700">{viewingCSM.suggestions}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="hidden">
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
                            </div>
                            <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/50 px-5 py-3 sm:px-6">
                                <Button variant="secondary" className="w-full" onClick={() => setViewingCSM(null)}>Close</Button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CareStaffFeedbackPage;





