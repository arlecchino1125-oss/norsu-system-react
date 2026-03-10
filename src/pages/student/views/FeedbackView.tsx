import React from 'react';
import { supabase } from '../../../lib/supabase';
import { createGeneralFeedback, getGeneralFeedbackHistory } from '../../../services/studentPortalService';
export function FeedbackView({ Icons, personalInfo, feedbackPrefill, setFeedbackPrefill }: { Icons: any; personalInfo: any; feedbackPrefill?: any; setFeedbackPrefill?: any }) {
    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [myFeedbacks, setMyFeedbacks] = React.useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = React.useState(true);
    const [viewingFeedback, setViewingFeedback] = React.useState<any>(null);
    const profileSex = personalInfo?.sex || personalInfo?.gender || '';
    const profileAge = personalInfo?.age || '';
    const profileEmail = personalInfo?.email || '';

    const [form, setForm] = React.useState<any>({
        client_type: '', sex: profileSex, age: String(profileAge), region: '', service_availed: '',
        cc1: '', cc2: '', cc3: '',
        sqd0: '', sqd1: '', sqd2: '', sqd3: '', sqd4: '', sqd5: '', sqd6: '', sqd7: '', sqd8: '',
        suggestions: '', email: ''
    });

    const updateForm = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));

    React.useEffect(() => {
        if (feedbackPrefill?.source === 'counseling') {
            setForm((prev: any) => ({
                ...prev,
                service_availed: feedbackPrefill.service_availed || prev.service_availed || 'Counseling Services',
            }));
        }
    }, [feedbackPrefill]);

    React.useEffect(() => {
        const fetchHistory = async () => {
            if (!personalInfo?.studentId) return;
            setLoadingHistory(true);
            const data = await getGeneralFeedbackHistory(personalInfo.studentId);
            setMyFeedbacks(data);
            setLoadingHistory(false);
        };
        fetchHistory();
    }, [personalInfo?.studentId, submitted]);

    const handleSubmit = async () => {
        // Validate required
        if (!form.client_type || !form.cc1) {
            alert('Please fill in at least Client Type and CC1.');
            return;
        }
        const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
        const allSqdFilled = sqdKeys.every(k => form[k] !== '');
        if (!allSqdFilled) {
            alert('Please answer all SQD questions (0-8).');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                student_id: personalInfo.studentId,
                student_name: personalInfo.fullName || personalInfo.name || 'Anonymous',
                client_type: form.client_type,
                sex: form.sex || null,
                age: form.age ? parseInt(form.age) : null,
                region: form.region || null,
                service_availed: form.service_availed || null,
                cc1: parseInt(form.cc1),
                cc2: form.cc2 ? parseInt(form.cc2) : null,
                cc3: form.cc3 ? parseInt(form.cc3) : null,
                sqd0: parseInt(form.sqd0), sqd1: parseInt(form.sqd1), sqd2: parseInt(form.sqd2),
                sqd3: parseInt(form.sqd3), sqd4: parseInt(form.sqd4), sqd5: parseInt(form.sqd5),
                sqd6: parseInt(form.sqd6), sqd7: parseInt(form.sqd7), sqd8: parseInt(form.sqd8),
                suggestions: form.suggestions || null,
                email: form.email || null,
            };
            await createGeneralFeedback(payload);

            // Link completed counseling requests to CSM feedback flow.
            if (feedbackPrefill?.source === 'counseling' && feedbackPrefill?.counselingRequestId) {
                const sqdScores = sqdKeys
                    .map(k => parseInt(form[k]))
                    .filter(v => Number.isFinite(v) && v > 0);
                const linkedRating = sqdScores.length > 0
                    ? Math.round(sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length)
                    : null;
                const linkedComment = `[CSM] ${form.suggestions?.trim() || 'Submitted via CSM feedback form.'}`;

                await supabase
                    .from('counseling_requests')
                    .update({ rating: linkedRating, feedback: linkedComment })
                    .eq('id', feedbackPrefill.counselingRequestId)
                    .eq('student_id', personalInfo.studentId);
            }

            setSubmitted(true);
            setForm({ client_type: '', sex: profileSex, age: String(profileAge), region: '', service_availed: '', cc1: '', cc2: '', cc3: '', sqd0: '', sqd1: '', sqd2: '', sqd3: '', sqd4: '', sqd5: '', sqd6: '', sqd7: '', sqd8: '', suggestions: '', email: '' });
            if (setFeedbackPrefill) setFeedbackPrefill(null);
        } catch (err: any) {
            alert('Error submitting feedback: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const sqdLabels = [
        { key: 'sqd0', text: 'SQD0. I am satisfied with the service that I availed.' },
        { key: 'sqd1', text: 'SQD1. I spent a reasonable amount of time for my transaction.' },
        { key: 'sqd2', text: 'SQD2. The office followed the transaction\'s requirements and steps based on the information provided.' },
        { key: 'sqd3', text: 'SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.' },
        { key: 'sqd4', text: 'SQD4. I easily found information about my transaction from the office\'s website.' },
        { key: 'sqd5', text: 'SQD5. I paid a reasonable amount of fees for my transaction. (If service was free, mark the \'N/A\' column)' },
        { key: 'sqd6', text: 'SQD6. I am confident my online transaction was secure.' },
        { key: 'sqd7', text: 'SQD7. The office\'s online support was available, and (if asked questions) online support was quick to respond.' },
        { key: 'sqd8', text: 'SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.' },
    ];

    const sqdColumns = [
        { value: '1', label: 'Strongly Disagree', emoji: '😞' },
        { value: '2', label: 'Disagree', emoji: '🙁' },
        { value: '3', label: 'Neither Agree nor Disagree', emoji: '😐' },
        { value: '4', label: 'Agree', emoji: '🙂' },
        { value: '5', label: 'Strongly Agree', emoji: '😊' },
        { value: '0', label: 'N/A', emoji: '' },
    ];

    const cc1IsAware = form.cc1 && ['1', '2', '3'].includes(form.cc1);

    // Success state
    if (submitted) {
        return (
            <div className="page-transition max-w-3xl mx-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-green-100/50 p-12 text-center shadow-sm animate-fade-in-up">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-400/20 to-emerald-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                    <h3 className="font-extrabold text-xl mb-2 text-gray-900">Thank You!</h3>
                    <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">Your feedback has been submitted successfully. Your response helps us improve our services.</p>
                    <button onClick={() => { setSubmitted(false); if (setFeedbackPrefill) setFeedbackPrefill(null); }} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Submit Another Feedback</button>
                </div>
            </div>
        );
    }

    return (
        <div className="page-transition max-w-4xl mx-auto space-y-6">
            {/* CSM Header */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm animate-fade-in-up overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-5">
                    <h2 className="text-lg font-extrabold">Client Satisfaction Measurement (CSM)</h2>
                    <p className="text-xs text-blue-200 mt-1">This CSM tracks the customer experience of government offices.</p>
                </div>
                <div className="px-8 py-5">
                    <p className="text-xs text-gray-600 leading-relaxed">Your feedback on your <span className="font-bold">recently concluded transaction</span> will help this office provide a better service. Personal information shared will be kept confidential and you always have the option not to answer this form.</p>
                    {feedbackPrefill?.source === 'counseling' && (
                        <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                            <p className="text-[11px] text-blue-700">
                                Counseling session detected. Please complete this CSM form to submit your counseling feedback.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Client Info Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up" style={{ animationDelay: '80ms' }}>
                <h3 className="font-bold text-sm text-gray-900 mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">1</span> Client Information</h3>
                <div className="space-y-5">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Client Type *</label>
                        <div className="flex gap-3 flex-wrap">
                            {['Citizen', 'Business', 'Government'].map(t => (
                                <button key={t} type="button" onClick={() => updateForm('client_type', t)} className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all ${form.client_type === t ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                                    {t === 'Government' ? 'Government (Employee or another agency)' : t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Date</label>
                            <input type="text" readOnly value={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs bg-gray-50 text-gray-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Sex</label>
                            <div className="flex gap-2">
                                {['Male', 'Female'].map(s => (
                                    <button key={s} type="button" onClick={() => updateForm('sex', s)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${form.sex === s ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Age</label>
                            <input type="number" value={form.age} onChange={e => updateForm('age', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Age" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Region</label>
                            <input type="text" value={form.region} onChange={e => updateForm('region', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Region of residence" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Service Availed</label>
                        <input type="text" value={form.service_availed} onChange={e => updateForm('service_availed', e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="e.g. Counseling, Scholarship, Assessment, etc." />
                    </div>
                </div>
            </div>

            {/* CC Questions Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up" style={{ animationDelay: '160ms' }}>
                <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">2</span> Citizen's Charter (CC) Questions</h3>
                <p className="text-[10px] text-gray-400 mb-6 ml-8">The Citizen's Charter (CC) is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.</p>

                {/* CC1 */}
                <div className="mb-6">
                    <p className="text-xs font-bold text-gray-800 mb-3">CC1. Which of the following best describes your awareness of a CC? *</p>
                    <div className="space-y-2 ml-4">
                        {[
                            { v: '1', t: '1. I know what a CC is and I saw this office\'s CC.' },
                            { v: '2', t: '2. I know what a CC is but I did NOT see this office\'s CC.' },
                            { v: '3', t: '3. I learned of the CC only when I saw this office\'s CC.' },
                            { v: '4', t: '4. I do not know what a CC is and I did not see one in this office. (Answer \'N/A\' on CC2 and CC3)' },
                        ].map(opt => (
                            <label key={opt.v} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.cc1 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                <input type="radio" name="cc1" value={opt.v} checked={form.cc1 === opt.v} onChange={() => { updateForm('cc1', opt.v); if (opt.v === '4') { updateForm('cc2', '5'); updateForm('cc3', '4'); } }} className="mt-0.5 accent-blue-500" />
                                <span className="text-xs text-gray-700">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* CC2 */}
                <div className={`mb-6 ${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="text-xs font-bold text-gray-800 mb-3">CC2. If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</p>
                    <div className="space-y-2 ml-4">
                        {[
                            { v: '1', t: '1. Easy to see' },
                            { v: '2', t: '2. Somewhat easy to see' },
                            { v: '3', t: '3. Difficult to see' },
                            { v: '4', t: '4. Not visible at all' },
                            { v: '5', t: '5. N/A' },
                        ].map(opt => (
                            <label key={opt.v} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${form.cc2 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                <input type="radio" name="cc2" value={opt.v} checked={form.cc2 === opt.v} onChange={() => updateForm('cc2', opt.v)} className="accent-blue-500" />
                                <span className="text-xs text-gray-700">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* CC3 */}
                <div className={`${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="text-xs font-bold text-gray-800 mb-3">CC3. If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?</p>
                    <div className="space-y-2 ml-4">
                        {[
                            { v: '1', t: '1. Helped very much' },
                            { v: '2', t: '2. Somewhat helped' },
                            { v: '3', t: '3. Did not help' },
                            { v: '4', t: '4. N/A' },
                        ].map(opt => (
                            <label key={opt.v} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${form.cc3 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                <input type="radio" name="cc3" value={opt.v} checked={form.cc3 === opt.v} onChange={() => updateForm('cc3', opt.v)} className="accent-blue-500" />
                                <span className="text-xs text-gray-700">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* SQD Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm animate-fade-in-up overflow-hidden" style={{ animationDelay: '240ms' }}>
                <div className="p-8 pb-4">
                    <h3 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">3</span> Service Quality Dimensions (SQD)</h3>
                    <p className="text-[10px] text-gray-400 ml-8">For SQD 0-8, please put a check mark (✓) on the column that best corresponds to your answer.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-y border-gray-200">
                                <th className="text-left px-6 py-3 font-bold text-gray-500 uppercase text-[10px] w-[45%]"></th>
                                {sqdColumns.map((col: any) => (
                                    <th key={col.value} className="px-2 py-3 text-center w-[9%]">
                                        {col.emoji && <div className="text-xl mb-1">{col.emoji}</div>}
                                        <div className="text-[9px] font-bold text-gray-500 leading-tight">{col.label}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sqdLabels.map((sqd: any, idx: number) => (
                                <tr key={sqd.key} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/30 transition-colors`}>
                                    <td className="px-6 py-3.5 text-xs text-gray-700 leading-relaxed">{sqd.text}</td>
                                    {sqdColumns.map((col: any) => (
                                        <td key={col.value} className="text-center px-2 py-3.5">
                                            <label className="flex items-center justify-center cursor-pointer">
                                                <input type="radio" name={sqd.key} value={col.value} checked={form[sqd.key] === col.value} onChange={() => updateForm(sqd.key, col.value)} className="w-4 h-4 accent-blue-500 cursor-pointer" />
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Open-ended Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-8 shadow-sm animate-fade-in-up" style={{ animationDelay: '320ms' }}>
                <h3 className="font-bold text-sm text-gray-900 mb-5 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">4</span> Additional Comments</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Suggestions on how we can further improve our services (optional)</label>
                        <textarea value={form.suggestions} onChange={e => updateForm('suggestions', e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none" placeholder="Your suggestions..." />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Email address (optional)</label>
                        <div className="flex gap-2">
                            <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="your.email@example.com" />
                            {profileEmail && !form.email && (
                                <button type="button" onClick={() => updateForm('email', profileEmail)} className="px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-all whitespace-nowrap flex items-center gap-1.5">
                                    <span>📧</span> Fill from profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-center animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <button onClick={handleSubmit} disabled={submitting} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-12 py-4 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all disabled:opacity-50 flex items-center gap-2">
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
            </div>

            {/* Submission History */}
            <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '480ms' }}>
                <h3 className="font-bold text-sm text-gray-900 mb-4">Your Previous Submissions</h3>
                {loadingHistory ? <p className="text-xs text-gray-400">Loading...</p> : myFeedbacks.length === 0 ? (
                    <p className="text-xs text-gray-400">No feedback submitted yet.</p>
                ) : (
                    <div className="space-y-3">
                        {myFeedbacks.map((fb: any, idx: number) => {
                            const sqdScores = [fb.sqd0, fb.sqd1, fb.sqd2, fb.sqd3, fb.sqd4, fb.sqd5, fb.sqd6, fb.sqd7, fb.sqd8].filter(v => v > 0);
                            const avg = sqdScores.length > 0 ? (sqdScores.reduce((a, b) => a + b, 0) / sqdScores.length).toFixed(1) : '—';
                            return (
                                <div key={fb.id} onClick={() => setViewingFeedback(fb)} className="bg-white/90 backdrop-blur-sm rounded-xl border border-blue-100/50 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all flex justify-between items-center" style={{ animationDelay: `${idx * 60}ms` }}>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">{fb.service_availed || 'General Feedback'}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(fb.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-full">
                                            <span className="text-yellow-500 text-sm">★</span>
                                            <span className="text-xs font-bold text-blue-700">{avg}</span>
                                        </div>
                                        <span className="text-[10px] text-blue-500 font-bold">View →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* View Detail Modal */}
            {viewingFeedback && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel">
                        <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white sticky top-0 z-10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Client Satisfaction Measurement</p>
                                    <h3 className="text-lg font-extrabold">{viewingFeedback.service_availed || 'General Feedback'}</h3>
                                </div>
                                <button onClick={() => setViewingFeedback(null)} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white text-lg">✕</button>
                            </div>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Client Type</p><p className="text-sm font-bold">{viewingFeedback.client_type || '—'}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Sex</p><p className="text-sm font-bold">{viewingFeedback.sex || '—'}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Age</p><p className="text-sm font-bold">{viewingFeedback.age || '—'}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Date</p><p className="text-sm font-bold">{new Date(viewingFeedback.created_at).toLocaleDateString()}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Region</p><p className="text-sm font-bold">{viewingFeedback.region || '—'}</p></div>
                                <div><p className="text-[10px] font-bold text-gray-400 uppercase">Service Availed</p><p className="text-sm font-bold">{viewingFeedback.service_availed || '—'}</p></div>
                            </div>
                            {/* CC Answers */}
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Citizen's Charter Questions</p>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC1 — Awareness</span><span className="text-xs font-bold">{viewingFeedback.cc1 || '—'}</span></div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC2 — Visibility</span><span className="text-xs font-bold">{viewingFeedback.cc2 === 5 ? 'N/A' : viewingFeedback.cc2 || '—'}</span></div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-xs text-gray-700">CC3 — Helpfulness</span><span className="text-xs font-bold">{viewingFeedback.cc3 === 4 ? 'N/A' : viewingFeedback.cc3 || '—'}</span></div>
                                </div>
                            </div>
                            {/* SQD Scores */}
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">Service Quality Dimensions</p>
                                <div className="border border-gray-200 rounded-xl overflow-hidden">
                                    {sqdLabels.map((sqd: any, idx: number) => {
                                        const score = viewingFeedback[sqd.key];
                                        const scoreLabel = score === 0 ? 'N/A' : score;
                                        return (
                                            <div key={idx} className={`flex justify-between items-center px-4 py-2.5 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} border-b border-gray-100 last:border-0`}>
                                                <span className="text-xs text-gray-700 flex-1">{sqd.text}</span>
                                                <span className={`text-sm font-bold ml-3 ${score >= 4 ? 'text-green-600' : score >= 3 ? 'text-yellow-600' : score > 0 ? 'text-red-500' : 'text-gray-400'}`}>{scoreLabel}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {viewingFeedback.suggestions && <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Suggestions</p><p className="text-sm text-gray-700 bg-blue-50/50 p-3 rounded-lg">{viewingFeedback.suggestions}</p></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
