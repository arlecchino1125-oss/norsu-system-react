
// StudentDashboardView — extracted from StudentPortal.tsx (dashboard section)
import React from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

const SQD_LABELS = [
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

const SQD_COLUMNS = [
    { value: '1', label: 'Strongly Disagree', emoji: '😞' },
    { value: '2', label: 'Disagree', emoji: '🙁' },
    { value: '3', label: 'Neither', emoji: '😐' },
    { value: '4', label: 'Agree', emoji: '🙂' },
    { value: '5', label: 'Strongly Agree', emoji: '😊' },
    { value: '0', label: 'N/A', emoji: '' },
];

function TimeOutFeedbackModal({ personalInfo, timeOutVisitReason, onClose, showToast }: any) {
    const profileSex = personalInfo?.sex || personalInfo?.gender || '';
    const profileAge = personalInfo?.age || '';

    const [form, setForm] = React.useState<any>({
        client_type: '', sex: profileSex, age: String(profileAge), region: '', service_availed: timeOutVisitReason || '',
        cc1: '', cc2: '', cc3: '',
        sqd0: '', sqd1: '', sqd2: '', sqd3: '', sqd4: '', sqd5: '', sqd6: '', sqd7: '', sqd8: '',
        suggestions: '',
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);

    const updateForm = (field: string, value: any) => setForm((prev: any) => ({ ...prev, [field]: value }));
    const cc1IsAware = form.cc1 && ['1', '2', '3'].includes(form.cc1);

    const handleSubmit = async () => {
        if (!form.client_type || !form.cc1) { showToast('Please fill in at least Client Type and CC1.', 'error'); return; }
        const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];
        if (!sqdKeys.every(k => form[k] !== '')) { showToast('Please answer all SQD questions (0-8).', 'error'); return; }
        setSubmitting(true);
        try {
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                client_type: form.client_type,
                sex: form.sex || null,
                age: form.age ? parseInt(form.age) : null,
                region: form.region || null,
                service_availed: form.service_availed || null,
                cc1: parseInt(form.cc1), cc2: form.cc2 ? parseInt(form.cc2) : null, cc3: form.cc3 ? parseInt(form.cc3) : null,
                sqd0: parseInt(form.sqd0), sqd1: parseInt(form.sqd1), sqd2: parseInt(form.sqd2),
                sqd3: parseInt(form.sqd3), sqd4: parseInt(form.sqd4), sqd5: parseInt(form.sqd5),
                sqd6: parseInt(form.sqd6), sqd7: parseInt(form.sqd7), sqd8: parseInt(form.sqd8),
                suggestions: form.suggestions || null,
            };
            const { error } = await supabase.from('general_feedback').insert(payload);
            if (error) throw error;
            setSubmitted(true);
        } catch (err: any) {
            showToast('Error submitting feedback: ' + err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Success state
    if (submitted) {
        return createPortal(
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl text-center animate-fade-in-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400/20 to-emerald-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
                    <h3 className="font-extrabold text-lg mb-2 text-gray-900">Thank You!</h3>
                    <p className="text-sm text-gray-500 mb-6">Your feedback has been submitted successfully. Your response helps us improve our services.</p>
                    <button onClick={onClose} className="bg-gradient-to-r from-blue-500 to-sky-400 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 btn-press transition-all">Done</button>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="px-8 py-5 bg-gradient-to-r from-blue-600 to-blue-800 text-white flex-shrink-0">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-blue-200 mb-1">Office Visit Completed</p>
                            <h3 className="text-lg font-extrabold tracking-tight">Client Satisfaction Feedback</h3>
                            <p className="text-xs text-blue-200 mt-1 font-medium">
                                Visit reason: <span className="text-white font-bold">{timeOutVisitReason}</span>
                            </p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all flex-shrink-0 text-lg">✕</button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs text-blue-700 leading-relaxed">Your feedback on your <span className="font-bold">recently concluded office visit</span> will help us provide better service. You may also skip this form.</p>
                    </div>

                    {/* Client Info */}
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">1</span> Client Information</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Client Type *</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['Citizen', 'Business', 'Government'].map(t => (
                                        <button key={t} type="button" onClick={() => updateForm('client_type', t)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${form.client_type === t ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                                            {t === 'Government' ? 'Government (Employee)' : t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sex</label><div className="flex gap-2">{['Male', 'Female'].map(s => (<button key={s} type="button" onClick={() => updateForm('sex', s)} className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border transition-all ${form.sex === s ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200 text-gray-600'}`}>{s}</button>))}</div></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Age</label><input type="number" value={form.age} onChange={e => updateForm('age', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Age" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Region</label><input type="text" value={form.region} onChange={e => updateForm('region', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Region" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Service Availed</label><input type="text" value={form.service_availed} onChange={e => updateForm('service_availed', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-blue-50 font-bold text-blue-700" /></div>
                            </div>
                        </div>
                    </div>

                    {/* CC Questions */}
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-4 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">2</span> Citizen's Charter (CC) Questions</h4>
                        {/* CC1 */}
                        <div className="mb-4">
                            <p className="text-xs font-bold text-gray-800 mb-2">CC1. Which of the following best describes your awareness of a CC? *</p>
                            <div className="space-y-1.5 ml-2">
                                {[
                                    { v: '1', t: '1. I know what a CC is and I saw this office\'s CC.' },
                                    { v: '2', t: '2. I know what a CC is but I did NOT see this office\'s CC.' },
                                    { v: '3', t: '3. I learned of the CC only when I saw this office\'s CC.' },
                                    { v: '4', t: '4. I do not know what a CC is and I did not see one in this office.' },
                                ].map(opt => (
                                    <label key={opt.v} className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${form.cc1 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                        <input type="radio" name="to_cc1" value={opt.v} checked={form.cc1 === opt.v} onChange={() => { updateForm('cc1', opt.v); if (opt.v === '4') { updateForm('cc2', '5'); updateForm('cc3', '4'); } }} className="mt-0.5 accent-blue-500" />
                                        <span className="text-xs text-gray-700">{opt.t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* CC2 */}
                        <div className={`mb-4 ${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                            <p className="text-xs font-bold text-gray-800 mb-2">CC2. If aware of CC, would you say that the CC of this office was ...?</p>
                            <div className="space-y-1.5 ml-2">
                                {[{ v: '1', t: '1. Easy to see' }, { v: '2', t: '2. Somewhat easy to see' }, { v: '3', t: '3. Difficult to see' }, { v: '4', t: '4. Not visible at all' }, { v: '5', t: '5. N/A' }].map(opt => (
                                    <label key={opt.v} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${form.cc2 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                        <input type="radio" name="to_cc2" value={opt.v} checked={form.cc2 === opt.v} onChange={() => updateForm('cc2', opt.v)} className="accent-blue-500" />
                                        <span className="text-xs text-gray-700">{opt.t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        {/* CC3 */}
                        <div className={`${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                            <p className="text-xs font-bold text-gray-800 mb-2">CC3. If aware of CC, how much did the CC help you in your transaction?</p>
                            <div className="space-y-1.5 ml-2">
                                {[{ v: '1', t: '1. Helped very much' }, { v: '2', t: '2. Somewhat helped' }, { v: '3', t: '3. Did not help' }, { v: '4', t: '4. N/A' }].map(opt => (
                                    <label key={opt.v} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${form.cc3 === opt.v ? 'border-blue-400 bg-blue-50/50' : 'border-gray-100 hover:border-gray-200'}`}>
                                        <input type="radio" name="to_cc3" value={opt.v} checked={form.cc3 === opt.v} onChange={() => updateForm('cc3', opt.v)} className="accent-blue-500" />
                                        <span className="text-xs text-gray-700">{opt.t}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* SQD Section */}
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-2 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">3</span> Service Quality Dimensions (SQD)</h4>
                        <p className="text-[10px] text-gray-400 ml-8 mb-3">Please put a check mark on the column that best corresponds to your answer.</p>
                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-2.5 font-bold text-gray-500 uppercase text-[10px] w-[45%]"></th>
                                        {SQD_COLUMNS.map(col => (
                                            <th key={col.value} className="px-1 py-2.5 text-center w-[9%]">
                                                {col.emoji && <div className="text-lg mb-0.5">{col.emoji}</div>}
                                                <div className="text-[8px] font-bold text-gray-500 leading-tight">{col.label}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {SQD_LABELS.map((sqd, idx) => (
                                        <tr key={sqd.key} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-blue-50/30 transition-colors`}>
                                            <td className="px-4 py-2.5 text-xs text-gray-700 leading-relaxed">{sqd.text}</td>
                                            {SQD_COLUMNS.map(col => (
                                                <td key={col.value} className="text-center px-1 py-2.5">
                                                    <label className="flex items-center justify-center cursor-pointer">
                                                        <input type="radio" name={`to_${sqd.key}`} value={col.value} checked={form[sqd.key] === col.value} onChange={() => updateForm(sqd.key, col.value)} className="w-3.5 h-3.5 accent-blue-500 cursor-pointer" />
                                                    </label>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Suggestions */}
                    <div>
                        <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-extrabold">4</span> Additional Comments</h4>
                        <textarea value={form.suggestions} onChange={e => updateForm('suggestions', e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none" placeholder="Suggestions on how we can further improve our services (optional)" />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 flex gap-3">
                    <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50">
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button onClick={onClose} className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
                        Skip
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

const StudentDashboardView = ({
    personalInfo,
    activeVisit,
    handleOfficeTimeIn,
    handleOfficeTimeOut,
    notifications,
    colorMap,
    setActiveView,
    eventsList,
    attendanceMap,
    StudentHero,
    showTimeInModal,
    setShowTimeInModal,
    visitReasons,
    selectedReason,
    setSelectedReason,
    submitTimeIn,
    showTimeOutFeedback,
    setShowTimeOutFeedback,
    timeOutVisitReason,
    showToast,
}: any) => (
    <>
        <div className="space-y-8 page-transition">
            {/* Hero Banner (Optimized) */}
            <StudentHero firstName={personalInfo.firstName} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-xl shadow-lg shadow-blue-500/20">🔔</span> Latest Announcements</h3>
                        {(() => {
                            const announcements = eventsList.filter((e: any) => e.type === 'Announcement').slice(0, 3);
                            if (announcements.length === 0) {
                                return <p className="text-sm text-gray-400 p-4 text-center">No recent announcements.</p>;
                            }
                            return announcements.map((ann: any) => (
                                <div key={ann.id} className="border border-purple-100 bg-purple-50/50 p-4 rounded-xl flex justify-between items-start mb-3 last:mb-0">
                                    <div>
                                        <h4 className="font-bold text-purple-900 text-sm">{ann.title}</h4>
                                        <p className="text-xs text-purple-700/70 mt-1 line-clamp-2">{ann.description}</p>
                                    </div>
                                    <span className="text-[10px] font-bold text-purple-400/60 ml-4 shrink-0 whitespace-nowrap">
                                        {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            ));
                        })()}
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                        <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl shadow-lg shadow-violet-500/20">🏢</span> Office Logbook</h3>
                        {activeVisit ? (<div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center"><p className="text-sm font-bold text-emerald-800 mb-1">You are currently at the office</p><p className="text-xs text-emerald-600 mb-3">Reason: {activeVisit.reason}</p><button onClick={handleOfficeTimeOut} className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20 transition-all">Time Out</button></div>) : <button onClick={handleOfficeTimeIn} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20 btn-press transition-all">Time In for Office Visit</button>}
                    </div>
                    {notifications.length > 0 && (<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}><h3 className="font-bold flex items-center gap-2 mb-4 text-orange-600"><span className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/20">📢</span> Notifications</h3><div className="space-y-2">{notifications.map((n: any) => <div key={n.id} className="text-xs p-3 bg-orange-50 border border-orange-100 rounded-xl text-gray-700">{n.message}</div>)}</div></div>)}
                </div>
                <div className="space-y-6">
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}><h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">⚡</span> Quick Access</h3><div className="space-y-3">{[{ id: 'assessment', label: 'Needs Assessment', color: 'blue', desc: 'Submit your yearly assessment' }, { id: 'scholarship', label: 'Scholarship', color: 'green', desc: 'Check eligibility & apply' }, { id: 'counseling', label: 'Counseling', color: 'purple', desc: 'Request support or advice' }].map((item: any) => { const colors = (colorMap as any)[item.color]; return (<button key={item.label} onClick={() => setActiveView(item.id)} className="w-full text-left p-3 rounded-xl border border-purple-100/30 hover:border-blue-200 transition-all group flex items-center gap-3 hover:bg-purple-50/50"><div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${colors.bg} ${colors.text} ${colors.hoverBg} group-hover:text-white transition-colors shadow-sm`}>&gt;</div><div><div className="text-xs font-bold">{item.label}</div><div className="text-[10px] text-gray-400">{item.desc}</div></div></button>); })}</div></div>
                    <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '350ms' }}><div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div><h4 className="font-bold text-sm mb-2 relative z-10">💡 Campus Tip</h4><p className="text-xs text-purple-200/60 leading-relaxed font-light relative z-10">"Always remember to time-in and time-out of events to ensure your attendance is credited."</p></div>
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                        <h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">📅</span> Events for You</h3>
                        {eventsList.length > 0 && eventsList[0].type === 'Event' ? (<div className="border border-purple-100/50 rounded-2xl p-5 bg-gradient-to-br from-white to-purple-50/50"><span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">{eventsList[0].location || 'Campus Event'}</span><h4 className="font-bold mt-3">{eventsList[0].title}</h4><p className="text-[11px] text-gray-500 mt-1">{eventsList[0].event_time}</p><p className="text-xs text-gray-600 mt-3 leading-relaxed line-clamp-2">{eventsList[0].description}</p><button onClick={() => setActiveView('events')} className={`w-full mt-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all btn-press ${attendanceMap[eventsList[0].id]?.time_in ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-500/20'}`}>{attendanceMap[eventsList[0].id]?.time_in ? 'Checked In' : 'View Event'}</button></div>) : <p className="text-sm text-gray-400">No upcoming events.</p>}
                    </div>
                </div>
            </div>
        </div>

        {/* OFFICE VISIT TIME IN MODAL */}
        {showTimeInModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Office Visit</h3>
                        <button onClick={() => setShowTimeInModal(false)} className="text-gray-400 text-xl">✕</button>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Please select the reason for your visit:</p>
                    <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                        {visitReasons.map((r: any) => (
                            <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedReason === r.reason ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <input type="radio" name="reason" value={r.reason} onChange={(e: any) => setSelectedReason(e.target.value)} className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-gray-700">{r.reason}</span>
                            </label>
                        ))}
                    </div>
                    <button onClick={submitTimeIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700">Confirm Time In</button>
                </div>
            </div>
        )}

        {/* CC FEEDBACK MODAL — triggered after Time Out */}
        {showTimeOutFeedback && (
            <TimeOutFeedbackModal
                personalInfo={personalInfo}
                timeOutVisitReason={timeOutVisitReason}
                onClose={() => setShowTimeOutFeedback(false)}
                showToast={showToast}
            />
        )}
    </>
);

export default StudentDashboardView;
