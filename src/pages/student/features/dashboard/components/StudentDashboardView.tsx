// StudentDashboardView — extracted from StudentPortal.tsx (dashboard section)
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Bell, Building2, CalendarDays, Lightbulb, Megaphone, X } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { useStudentEventsData } from '../../events/hooks/useStudentEventsData';
import { isAttendanceActivityType } from '../../../../../utils/eventAudience';
import { getTextInputLimitProps, validateTextInput } from '../../../../../utils/inputSecurity';

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
    const profileSex = personalInfo?.sex || '';
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
        const regionCheck = validateTextInput(form.region, 'shortText', { label: 'Region' });
        const serviceCheck = validateTextInput(form.service_availed, 'mediumText', { label: 'Service availed' });
        const suggestionsCheck = validateTextInput(form.suggestions, 'notes', { multiline: true, label: 'Suggestions' });
        const invalidText = [regionCheck, serviceCheck, suggestionsCheck].find((check) => !check.valid);
        if (invalidText?.error) {
            showToast(invalidText.error, 'error');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                student_id: personalInfo.studentId,
                student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                client_type: form.client_type,
                sex: form.sex || null,
                age: form.age ? parseInt(form.age) : null,
                region: regionCheck.value || null,
                service_availed: serviceCheck.value || null,
                cc1: parseInt(form.cc1), cc2: form.cc2 ? parseInt(form.cc2) : null, cc3: form.cc3 ? parseInt(form.cc3) : null,
                sqd0: parseInt(form.sqd0), sqd1: parseInt(form.sqd1), sqd2: parseInt(form.sqd2),
                sqd3: parseInt(form.sqd3), sqd4: parseInt(form.sqd4), sqd5: parseInt(form.sqd5),
                sqd6: parseInt(form.sqd6), sqd7: parseInt(form.sqd7), sqd8: parseInt(form.sqd8),
                suggestions: suggestionsCheck.value || null,
            };
            const { error } = await supabase.from('general_feedback').insert(payload);
            if (error) throw error;
            setSubmitted(true);
        } catch (err: any) {
            showToast("Couldn't submit feedback. ", 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Success state
    if (submitted) {
        return createPortal(
            <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4 student-mobile-modal-overlay">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl text-center animate-fade-in-up student-mobile-modal-panel student-mobile-modal-scroll-panel sm:p-8">
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
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[9999] p-4 student-mobile-modal-overlay">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fade-in-up student-mobile-modal-panel">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-5 py-4 text-white flex-shrink-0 sm:px-8 sm:py-5">
                    <div className="flex justify-between items-start gap-3">
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
                <div className="flex-1 overflow-y-auto p-4 space-y-5 sm:p-6 sm:space-y-6">
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
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sex</label><div className="flex gap-2">{['Male', 'Female'].map(s => (<button key={s} type="button" onClick={() => updateForm('sex', s)} className={`flex-1 px-2 py-2 rounded-xl text-xs font-bold border transition-all ${form.sex === s ? 'bg-blue-500 text-white border-blue-500' : 'bg-white border-gray-200 text-gray-600'}`}>{s}</button>))}</div></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Age</label><input type="number" min="0" max="150" value={form.age} onChange={e => updateForm('age', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Age" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Region</label><input type="text" {...getTextInputLimitProps('shortText')} value={form.region} onChange={e => updateForm('region', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition" placeholder="Region" /></div>
                                <div><label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Service Availed</label><input type="text" {...getTextInputLimitProps('mediumText')} value={form.service_availed} onChange={e => updateForm('service_availed', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition bg-blue-50 font-bold text-blue-700" /></div>
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
                        <textarea value={form.suggestions} {...getTextInputLimitProps('notes')} onChange={e => updateForm('suggestions', e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition resize-none" placeholder="Suggestions on how we can further improve our services (optional)" />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/50 px-4 py-4 flex-shrink-0 sm:flex-row sm:px-6">
                    <button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50">
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                    <button onClick={onClose} className="w-full px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all sm:w-auto">
                        Skip
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

const StudentDashboardView = ({
    setActiveView,
    personalInfo,
    activeVisit,
    handleOfficeTimeIn,
    handleOfficeTimeOut,
    notifications,
    StudentHero,
    showTimeInModal,
    setShowTimeInModal,
    visitReasons,
    selectedReason,
    setSelectedReason,
    submitTimeIn,
    isSubmittingOfficeTimeIn,
    isCompletingOfficeVisit,
    showTimeOutFeedback,
    setShowTimeOutFeedback,
    timeOutVisitReason,
    showProfileCompletionBanner,
    openProfileCompletionModal,
    showToast,
}: any) => {
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [showTipGuide, setShowTipGuide] = useState(false);

    // No mount-refetch: React Query fetches when the cache is empty and the
    // 2-minute staleness policy governs the rest. refetch() would bypass it.
    useStudentEventsData({
        setEventsList,
        personalInfo
    });

    const announcements = eventsList.filter((event: any) => event.type === 'Announcement').slice(0, 3);
    const nextActivity = (eventsList || []).find((item: any) => isAttendanceActivityType(item.type));
    const notificationItems = Array.isArray(notifications) ? notifications : [];

    return (
        <>
            <div className="student-dashboard-root space-y-5 page-transition sm:space-y-6">
                <StudentHero
                    firstName={personalInfo.firstName}
                    onVolunteerClick={() => setActiveView?.('volunteer')}
                />

                {showProfileCompletionBanner && (
                    <div className="student-action-banner rounded-2xl border border-rose-200 bg-white p-4 shadow-sm animate-fade-in-up sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-3xl">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600/80">Action Required</p>
                                <h3 className="mt-1 text-lg font-black text-slate-900 sm:text-xl">Please complete your student profile to unlock all campus services.</h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                    You can still browse announcements and your dashboard, but counseling, additional support, scholarship applications, and needs assessment stay locked until your required profile fields are completed.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openProfileCompletionModal}
                                className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto"
                            >
                                Complete Profile
                            </button>
                        </div>
                    </div>
                )}

                <section className="student-surface-card rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm animate-fade-in-up sm:p-5" style={{ animationDelay: '80ms' }}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Office Logbook</p>
                                <h3 className="mt-1 text-base font-black text-slate-950 sm:text-lg">
                                    {activeVisit ? 'Office visit in progress' : 'Log your CARE office visit'}
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                                    {activeVisit ? `Reason: ${activeVisit.reason}` : 'Use this when you visit the CARE Center so staff can keep your office log accurate.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {activeVisit ? (
                        <button
                            disabled={isCompletingOfficeVisit}
                            onClick={handleOfficeTimeOut}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {isCompletingOfficeVisit ? 'Timing Out...' : 'Time Out'}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleOfficeTimeIn}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 sm:w-auto"
                        >
                            Time In for Office Visit
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </section>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        { label: 'Announcements', value: announcements.length, detail: announcements.length ? 'Recent campus updates' : 'No recent posts', icon: Megaphone, tone: 'text-blue-600 bg-blue-50 border-blue-100' },
                        { label: 'Notifications', value: notificationItems.length, detail: notificationItems.length ? 'Items needing review' : 'All clear', icon: Bell, tone: 'text-orange-600 bg-orange-50 border-orange-100' },
                        { label: 'Next Activity', value: nextActivity ? '1' : '0', detail: nextActivity?.title || 'No upcoming events', icon: CalendarDays, tone: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <div key={item.label} className="student-surface-card rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                                        <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
                                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">{item.detail}</p>
                                    </div>
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            <button
                type="button"
                aria-label="Open student guide"
                title="Student guide"
                onClick={() => setShowTipGuide(true)}
                className="student-dashboard-tip-button fixed bottom-[4.75rem] right-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-white text-amber-600 shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:bottom-24 sm:right-6"
            >
                <Lightbulb className="h-4 w-4" />
            </button>

            {showTipGuide && createPortal(
                <div className="fixed inset-0 z-50 flex items-end justify-end bg-transparent p-4 student-mobile-modal-overlay" onClick={() => setShowTipGuide(false)}>
                    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl student-mobile-modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                                    <Lightbulb className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Student Guide</p>
                                    <h3 className="mt-1 text-base font-black text-slate-950">Keep attendance accurate</h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                aria-label="Close student guide"
                                onClick={() => setShowTipGuide(false)}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">Always remember to time in and time out of events to ensure your attendance is credited.</p>
                    </div>
                </div>,
                document.body
            )}

            {/* OFFICE VISIT TIME IN MODAL */}
            {showTimeInModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4 student-mobile-modal-overlay">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl student-mobile-modal-panel student-mobile-modal-scroll-panel sm:p-6">
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
                        <button disabled={isSubmittingOfficeTimeIn} onClick={submitTimeIn} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSubmittingOfficeTimeIn ? 'Submitting...' : 'Confirm Time In'}</button>
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
}; export default StudentDashboardView;
