import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { createGeneralFeedback } from '../../../../../services/studentPortalService';
import { getTextInputLimitProps, validateTextInput } from '../../../../../utils/inputSecurity';
import type { StudentRemainingFlatViewProps } from '../../../types';

export function FeedbackView({
    personalInfo,
    feedbackPrefill,
    setFeedbackPrefill
}: StudentRemainingFlatViewProps) {
    const queryClient = useQueryClient();
    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [formNotice, setFormNotice] = React.useState<{ type: 'error' | 'success'; message: string } | null>(null);
    const [activeStep, setActiveStep] = React.useState(0);
    const profileSex = personalInfo?.sex || '';
    const profileAge = personalInfo?.age || '';
    const profileEmail = personalInfo?.email || '';

    const [form, setForm] = React.useState<any>({
        client_type: '', sex: profileSex, age: String(profileAge), region: '', service_availed: '',
        cc1: '', cc2: '', cc3: '',
        sqd0: '', sqd1: '', sqd2: '', sqd3: '', sqd4: '', sqd5: '', sqd6: '', sqd7: '', sqd8: '',
        suggestions: '', email: ''
    });

    const updateForm = (field: string, value: any) => {
        setFormNotice(null);
        setForm((prev: any) => ({ ...prev, [field]: value }));
    };

    React.useEffect(() => {
        if (feedbackPrefill?.source === 'counseling') {
            setForm((prev: any) => ({
                ...prev,
                service_availed: feedbackPrefill.service_availed || prev.service_availed || 'Counseling Services',
            }));
        }
    }, [feedbackPrefill]);

    const sqdKeys = ['sqd0', 'sqd1', 'sqd2', 'sqd3', 'sqd4', 'sqd5', 'sqd6', 'sqd7', 'sqd8'];

    const handleSubmit = async () => {
        // Validate required
        if (!form.client_type) {
            setActiveStep(0);
            setFormNotice({ type: 'error', message: 'Please choose a client type before submitting.' });
            return;
        }
        if (!form.cc1) {
            setActiveStep(1);
            setFormNotice({ type: 'error', message: 'Please answer CC1 before submitting.' });
            return;
        }
        if (['1', '2', '3'].includes(form.cc1) && (!form.cc2 || !form.cc3)) {
            setActiveStep(1);
            setFormNotice({ type: 'error', message: 'Please answer CC2 and CC3 before submitting.' });
            return;
        }
        const allSqdFilled = sqdKeys.every(k => form[k] !== '');
        if (!allSqdFilled) {
            setActiveStep(2);
            setFormNotice({ type: 'error', message: 'Please answer all SQD questions (0-8).' });
            return;
        }
        const suggestionsCheck = validateTextInput(form.suggestions, 'notes', {
            multiline: true,
            label: 'Suggestions'
        });
        if (!suggestionsCheck.valid) {
            setActiveStep(3);
            setFormNotice({ type: 'error', message: suggestionsCheck.error || 'Suggestions are invalid.' });
            return;
        }
        const emailCheck = validateTextInput(form.email, 'email', { label: 'Email address' });
        if (form.email && !emailCheck.valid) {
            setActiveStep(3);
            setFormNotice({ type: 'error', message: emailCheck.error || 'Email address is invalid.' });
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
                suggestions: suggestionsCheck.value || null,
                email: emailCheck.value || null,
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
                const linkedComment = `[CSM] ${suggestionsCheck.value || 'Submitted via CSM feedback form.'}`;

                await supabase
                    .from('counseling_requests')
                    .update({ rating: linkedRating, feedback: linkedComment })
                    .eq('id', feedbackPrefill.counselingRequestId)
                    .eq('student_id', personalInfo.studentId);
                void queryClient.invalidateQueries({ queryKey: ['student_counseling_data'] });
            }

            setSubmitted(true);
            setActiveStep(0);
            setForm({ client_type: '', sex: profileSex, age: String(profileAge), region: '', service_availed: '', cc1: '', cc2: '', cc3: '', sqd0: '', sqd1: '', sqd2: '', sqd3: '', sqd4: '', sqd5: '', sqd6: '', sqd7: '', sqd8: '', suggestions: '', email: '' });
            if (setFeedbackPrefill) setFeedbackPrefill(null);
        } catch {
            setFormNotice({ type: 'error', message: `Couldn't submit feedback..` });
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
        { key: 'sqd5', text: 'SQD5. I paid a reasonable amount of fees for my transaction.' },
        { key: 'sqd6', text: 'SQD6. I am confident my online transaction was secure.' },
        { key: 'sqd7', text: 'SQD7. The office\'s online support was available, and (if asked questions) online support was quick to respond.' },
        { key: 'sqd8', text: 'SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.' },
    ];

    const sqdColumns = [
        { value: '1', label: 'Strongly Disagree', shortLabel: 'SD', emoji: '😞' },
        { value: '2', label: 'Disagree', shortLabel: 'D', emoji: '🙁' },
        { value: '3', label: 'Neither Agree nor Disagree', shortLabel: 'N', emoji: '😐' },
        { value: '4', label: 'Agree', shortLabel: 'A', emoji: '🙂' },
        { value: '5', label: 'Strongly Agree', shortLabel: 'SA', emoji: '😊' },
    ];

    const cc1IsAware = form.cc1 && ['1', '2', '3'].includes(form.cc1);
    const sectionCardClass = 'student-surface-card rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-5';
    const sectionTitleClass = 'flex items-center gap-2 text-[13px] font-black text-slate-950 sm:text-sm';
    const sectionNumberClass = 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-black text-blue-600 sm:h-6 sm:w-6 sm:text-xs';
    const fieldLabelClass = 'mb-1.5 block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 sm:text-[10px]';
    const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm';
    const readonlyInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] text-slate-500 sm:text-sm';
    const radioCardBaseClass = 'flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-all';
    const feedbackSteps = [
        { label: 'Client Information', shortLabel: 'Info' },
        { label: "Citizen's Charter", shortLabel: 'CC' },
        { label: 'Service Quality', shortLabel: 'SQD' },
        { label: 'Comments', shortLabel: 'Notes' },
        { label: 'Review & Submit', shortLabel: 'Submit' },
    ];
    const currentStep = feedbackSteps[activeStep];
    const answeredSqdCount = sqdKeys.filter(key => form[key] !== '').length;
    const progressPercent = ((activeStep + 1) / feedbackSteps.length) * 100;
    const ccStepComplete = Boolean(form.cc1) && (!cc1IsAware || Boolean(form.cc2 && form.cc3));

    const handleCc1Change = (value: string) => {
        setFormNotice(null);
        setForm((prev: any) => ({
            ...prev,
            cc1: value,
            ...(value === '4' ? { cc2: '5', cc3: '4' } : prev.cc1 === '4' ? { cc2: '', cc3: '' } : {}),
        }));
    };

    const validateStep = (stepIndex: number) => {
        if (stepIndex === 0 && !form.client_type) {
            setActiveStep(0);
            setFormNotice({ type: 'error', message: 'Choose a client type to continue.' });
            return false;
        }
        if (stepIndex === 1) {
            if (!form.cc1) {
                setActiveStep(1);
                setFormNotice({ type: 'error', message: 'Answer CC1 to continue.' });
                return false;
            }
            if (cc1IsAware && (!form.cc2 || !form.cc3)) {
                setActiveStep(1);
                setFormNotice({ type: 'error', message: 'Answer CC2 and CC3 to continue.' });
                return false;
            }
        }
        if (stepIndex === 2 && answeredSqdCount !== sqdKeys.length) {
            setActiveStep(2);
            setFormNotice({ type: 'error', message: `Answer all SQD questions to continue. ${answeredSqdCount}/${sqdKeys.length} answered.` });
            return false;
        }
        if (stepIndex === 3) {
            const suggestionsCheck = validateTextInput(form.suggestions, 'notes', {
                multiline: true,
                label: 'Suggestions'
            });
            if (!suggestionsCheck.valid) {
                setActiveStep(3);
                setFormNotice({ type: 'error', message: suggestionsCheck.error || 'Suggestions are invalid.' });
                return false;
            }
            const emailCheck = validateTextInput(form.email, 'email', { label: 'Email address' });
            if (form.email && !emailCheck.valid) {
                setActiveStep(3);
                setFormNotice({ type: 'error', message: emailCheck.error || 'Email address is invalid.' });
                return false;
            }
        }
        return true;
    };

    const goToStep = (targetStep: number) => {
        if (targetStep <= activeStep) {
            setFormNotice(null);
            setActiveStep(targetStep);
            return;
        }
        for (let step = activeStep; step < targetStep; step += 1) {
            if (!validateStep(step)) return;
        }
        setFormNotice(null);
        setActiveStep(targetStep);
    };

    const goNextStep = () => {
        if (validateStep(activeStep)) {
            setFormNotice(null);
            setActiveStep(step => Math.min(step + 1, feedbackSteps.length - 1));
        }
    };

    // Success state
    if (submitted) {
        return (
            <div className="page-transition mx-auto max-w-3xl">
                <div className="student-surface-card rounded-xl border border-emerald-100 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-8">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-3xl font-black text-white shadow-lg shadow-emerald-500/20">✓</div>
                    <h3 className="mb-2 text-base font-black text-slate-950 sm:text-lg">Thank you</h3>
                    <p className="mx-auto mb-5 max-w-md text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">Your feedback has been submitted successfully. Your response helps us improve our services.</p>
                    <button onClick={() => { setSubmitted(false); setActiveStep(0); if (setFeedbackPrefill) setFeedbackPrefill(null); }} className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press sm:w-auto">Submit Another Feedback</button>
                </div>
            </div>
        );
    }

    return (
        <div className="student-feedback-root mx-auto max-w-5xl space-y-3 page-transition sm:space-y-5">
            {/* CSM Header */}
            <div className="student-surface-card rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-4">
                <div className="rounded-lg bg-blue-600 px-3 py-2.5 text-white sm:px-4 sm:py-3">
                    <p className="text-[7px] font-black uppercase tracking-[0.16em] text-blue-100 sm:text-[8px]">Client Satisfaction</p>
                    <h2 className="mt-0.5 text-[13px] font-black leading-4 sm:text-base sm:leading-5">Client Satisfaction Measurement (CSM)</h2>
                    <p className="mt-0.5 text-[10px] leading-3.5 text-blue-100 sm:text-[11px] sm:leading-4">Share how your recent student service experience went.</p>
                </div>
                <div className="pt-2">
                    <p className="text-[10px] leading-4 text-slate-600 sm:text-[11px] sm:leading-5">Your feedback on your <span className="font-black text-slate-800">recently concluded transaction</span> helps improve service. Personal information stays confidential.</p>
                    {formNotice && (
                        <div className={`mt-2 rounded-lg border px-3 py-1.5 text-[10px] font-bold leading-4 ${formNotice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            {formNotice.message}
                        </div>
                    )}
                    {feedbackPrefill?.source === 'counseling' && (
                        <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5">
                            <p className="text-[10px] font-semibold leading-4 text-blue-700">
                                Counseling session detected. Please complete this CSM form to submit your counseling feedback.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="student-surface-card rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm animate-fade-in-up sm:rounded-2xl sm:p-4" style={{ animationDelay: '60ms' }}>
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">Step {activeStep + 1} of {feedbackSteps.length}</p>
                        <h3 className="mt-0.5 truncate text-[13px] font-black text-slate-950 sm:text-sm">{currentStep.label}</h3>
                    </div>
                    <div className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                        {activeStep === 2 ? `${answeredSqdCount}/${sqdKeys.length} SQD` : `${Math.round(progressPercent)}%`}
                    </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progressPercent}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-5 gap-1.5">
                    {feedbackSteps.map((step, index) => {
                        const isActive = activeStep === index;
                        const isComplete =
                            index < activeStep ||
                            (index === 0 && Boolean(form.client_type)) ||
                            (index === 1 && ccStepComplete) ||
                            (index === 2 && answeredSqdCount === sqdKeys.length);
                        return (
                            <button
                                key={step.shortLabel}
                                type="button"
                                onClick={() => goToStep(index)}
                                aria-current={isActive ? 'step' : undefined}
                                className={`min-w-0 rounded-lg border px-1.5 py-2 text-center text-[8px] font-black uppercase leading-3 tracking-[0.08em] transition sm:text-[10px] ${isActive ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : isComplete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-blue-200 hover:bg-blue-50'}`}
                            >
                                {step.shortLabel}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Client Info Section */}
            {activeStep === 0 && <div className={sectionCardClass} style={{ animationDelay: '80ms' }}>
                <h3 className={`${sectionTitleClass} mb-4`}><span className={sectionNumberClass}>1</span> Client Information</h3>
                <div className="space-y-4">
                    <div>
                        <label className={fieldLabelClass}>Client Type *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['Citizen', 'Business', 'Government'].map(t => (
                                <button key={t} type="button" onClick={() => updateForm('client_type', t)} className={`rounded-xl border px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${t === 'Government' ? 'col-span-2' : ''} ${form.client_type === t ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'}`}>
                                    {t === 'Government' ? 'Government (Employee or another agency)' : t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                        <div>
                            <label className={fieldLabelClass}>Date</label>
                            <input type="text" readOnly value={new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} className={readonlyInputClass} />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Sex</label>
                            <div className="flex gap-2">
                                {['Male', 'Female'].map(s => (
                                    <button key={s} type="button" onClick={() => updateForm('sex', s)} className={`flex-1 rounded-xl border px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${form.sex === s ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Age</label>
                            <input type="number" min="0" max="150" value={form.age} onChange={e => updateForm('age', e.target.value)} className={inputClass} placeholder="Age" />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Region</label>
                            <input type="text" {...getTextInputLimitProps('mediumText')} value={form.region} onChange={e => updateForm('region', e.target.value)} className={inputClass} placeholder="Region of residence" />
                        </div>
                    </div>
                    <div>
                        <label className={fieldLabelClass}>Service Availed</label>
                        <input type="text" {...getTextInputLimitProps('mediumText')} value={form.service_availed} onChange={e => updateForm('service_availed', e.target.value)} className={inputClass} placeholder="e.g. Counseling, Scholarship, Assessment, etc." />
                    </div>
                </div>
            </div>}

            {/* CC Questions Section */}
            {activeStep === 1 && <div className={sectionCardClass} style={{ animationDelay: '80ms' }}>
                <h3 className={`${sectionTitleClass} mb-2`}><span className={sectionNumberClass}>2</span> Citizen's Charter (CC) Questions</h3>
                <p className="mb-4 pl-8 text-[11px] leading-5 text-slate-500 sm:text-xs sm:leading-5">The Citizen's Charter (CC) is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.</p>

                {/* CC1 */}
                <div className="mb-4">
                    <p className="mb-2 text-[12px] font-black leading-5 text-slate-800 sm:text-sm">CC1. Which of the following best describes your awareness of a CC? *</p>
                    <div className="space-y-2">
                        {[
                            { v: '1', t: '1. I know what a CC is and I saw this office\'s CC.' },
                            { v: '2', t: '2. I know what a CC is but I did NOT see this office\'s CC.' },
                            { v: '3', t: '3. I learned of the CC only when I saw this office\'s CC.' },
                            { v: '4', t: '4. I do not know what a CC is and I did not see one in this office. (Answer \'N/A\' on CC2 and CC3)' },
                        ].map(opt => (
                            <label key={opt.v} className={`${radioCardBaseClass} ${form.cc1 === opt.v ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}`}>
                                <input type="radio" name="cc1" value={opt.v} checked={form.cc1 === opt.v} onChange={() => handleCc1Change(opt.v)} className="mt-0.5 accent-blue-500" />
                                <span className="text-[12px] leading-5 text-slate-700 sm:text-sm">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* CC2 */}
                <div className={`mb-4 ${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="mb-2 text-[12px] font-black leading-5 text-slate-800 sm:text-sm">CC2. If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</p>
                    <div className="space-y-2">
                        {[
                            { v: '1', t: '1. Easy to see' },
                            { v: '2', t: '2. Somewhat easy to see' },
                            { v: '3', t: '3. Difficult to see' },
                            { v: '4', t: '4. Not visible at all' },
                            { v: '5', t: '5. N/A' },
                        ].map(opt => (
                            <label key={opt.v} className={`${radioCardBaseClass} ${form.cc2 === opt.v ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}`}>
                                <input type="radio" name="cc2" value={opt.v} checked={form.cc2 === opt.v} onChange={() => updateForm('cc2', opt.v)} className="accent-blue-500" />
                                <span className="text-[12px] leading-5 text-slate-700 sm:text-sm">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* CC3 */}
                <div className={`${!cc1IsAware ? 'opacity-40 pointer-events-none' : ''}`}>
                    <p className="mb-2 text-[12px] font-black leading-5 text-slate-800 sm:text-sm">CC3. If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?</p>
                    <div className="space-y-2">
                        {[
                            { v: '1', t: '1. Helped very much' },
                            { v: '2', t: '2. Somewhat helped' },
                            { v: '3', t: '3. Did not help' },
                            { v: '4', t: '4. N/A' },
                        ].map(opt => (
                            <label key={opt.v} className={`${radioCardBaseClass} ${form.cc3 === opt.v ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/30'}`}>
                                <input type="radio" name="cc3" value={opt.v} checked={form.cc3 === opt.v} onChange={() => updateForm('cc3', opt.v)} className="accent-blue-500" />
                                <span className="text-[12px] leading-5 text-slate-700 sm:text-sm">{opt.t}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>}

            {/* SQD Section */}
            {activeStep === 2 && <div className="student-surface-card overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm animate-fade-in-up sm:rounded-2xl" style={{ animationDelay: '80ms' }}>
                <div className="p-3 pb-3 sm:p-5 sm:pb-4">
                    <h3 className={`${sectionTitleClass} mb-2`}><span className={sectionNumberClass}>3</span> Service Quality Dimensions (SQD)</h3>
                    <p className="pl-8 text-[11px] leading-5 text-slate-500 sm:text-xs">Choose one answer for each SQD statement.</p>
                    <p className="mt-1.5 pl-8 text-[10px] leading-4 text-slate-500 sm:text-[11px]">
                        Scale: 😞 <span className="font-black text-slate-700">SD</span> = Strongly Disagree; 🙁 <span className="font-black text-slate-700">D</span> = Disagree; 😐 <span className="font-black text-slate-700">N</span> = Neither; 🙂 <span className="font-black text-slate-700">A</span> = Agree; 😊 <span className="font-black text-slate-700">SA</span> = Strongly Agree.
                    </p>
                </div>
                <div className="space-y-2 border-t border-slate-100 p-3 sm:hidden">
                    {sqdLabels.map((sqd: any) => (
                        <div key={sqd.key} className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold leading-5 text-slate-700">{sqd.text}</p>
                            <div className="mt-2 grid grid-cols-3 gap-1.5">
                                {sqdColumns.map((col: any) => {
                                    const isSelected = form[sqd.key] === col.value;
                                    return (
                                        <button
                                            key={col.value}
                                            type="button"
                                            role="radio"
                                            aria-checked={isSelected}
                                            aria-label={`${sqd.text} ${col.label}`}
                                            onClick={() => updateForm(sqd.key, col.value)}
                                            className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-2 text-left transition ${isSelected ? 'border-blue-400 bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                                        >
                                            <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-blue-500' : 'border-slate-400 bg-white'}`} aria-hidden="true">
                                                {isSelected && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                                            </span>
                                            {col.emoji && <span className="text-base leading-none">{col.emoji}</span>}
                                            <span className="text-[11px] font-black leading-3">{col.shortLabel}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="hidden overflow-x-auto border-t border-slate-100 sm:block">
                    <table className="min-w-[720px] w-full border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="w-[42%] px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.1em] text-slate-500"></th>
                                {sqdColumns.map((col: any) => (
                                    <th key={col.value} className="w-[9.5%] px-2 py-3 text-center">
                                        {col.emoji && <div className="mb-1 text-lg leading-none">{col.emoji}</div>}
                                        <div className="text-[9px] font-black leading-tight text-slate-500">{col.label}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sqdLabels.map((sqd: any, idx: number) => (
                                <tr key={sqd.key} className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30`}>
                                    <td className="px-4 py-3 text-[12px] leading-5 text-slate-700">{sqd.text}</td>
                                    {sqdColumns.map((col: any) => (
                                        <td key={col.value} className="px-2 py-3 text-center">
                                            <label className="flex cursor-pointer items-center justify-center">
                                                <input type="radio" name={sqd.key} value={col.value} checked={form[sqd.key] === col.value} onChange={() => updateForm(sqd.key, col.value)} className="h-4 w-4 cursor-pointer accent-blue-500" />
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>}

            {/* Open-ended Section */}
            {activeStep === 3 && <div className={sectionCardClass} style={{ animationDelay: '80ms' }}>
                <h3 className={`${sectionTitleClass} mb-4`}><span className={sectionNumberClass}>4</span> Additional Comments</h3>
                <div className="space-y-3">
                    <div>
                        <label className={fieldLabelClass}>Suggestions on how we can further improve our services (optional)</label>
                        <textarea value={form.suggestions} {...getTextInputLimitProps('notes')} onChange={e => updateForm('suggestions', e.target.value)} rows={3} className={`${inputClass} resize-none leading-5`} placeholder="Your suggestions..." />
                    </div>
                    <div>
                        <label className={fieldLabelClass}>Email address (optional)</label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <input type="email" {...getTextInputLimitProps('email')} value={form.email} onChange={e => updateForm('email', e.target.value)} className={`${inputClass} flex-1`} placeholder="your.email@example.com" />
                            {profileEmail && !form.email && (
                                <button type="button" onClick={() => updateForm('email', profileEmail)} className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[12px] font-black text-blue-700 transition-all hover:bg-blue-100 sm:justify-start">
                                    <span>📧</span> Fill from profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>}

            {/* Review Section */}
            {activeStep === 4 && <div className={sectionCardClass} style={{ animationDelay: '80ms' }}>
                <h3 className={`${sectionTitleClass} mb-4`}><span className={sectionNumberClass}>5</span> Review &amp; Submit</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Client Type</p>
                        <p className="mt-1 text-[12px] font-black text-slate-900">{form.client_type || 'Missing'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Service</p>
                        <p className="mt-1 truncate text-[12px] font-black text-slate-900">{form.service_availed || 'General Feedback'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">CC Answers</p>
                        <p className="mt-1 text-[12px] font-black text-slate-900">{ccStepComplete ? 'Complete' : 'Incomplete'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">SQD Answers</p>
                        <p className="mt-1 text-[12px] font-black text-slate-900">{answeredSqdCount}/{sqdKeys.length}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Email</p>
                        <p className="mt-1 truncate text-[12px] font-black text-slate-900">{form.email || 'Not provided'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Profile</p>
                        <p className="mt-1 text-[12px] font-black text-slate-900">{form.sex || 'No sex'}, {form.age || 'No age'}</p>
                    </div>
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Suggestions</p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-700">{form.suggestions || 'No additional comments.'}</p>
                </div>
            </div>}

            {/* Step actions */}
            <div className="student-surface-card flex gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm animate-fade-in-up sm:rounded-2xl sm:justify-end sm:p-3" style={{ animationDelay: '120ms' }}>
                <button
                    type="button"
                    onClick={() => { setFormNotice(null); setActiveStep(step => Math.max(step - 1, 0)); }}
                    disabled={activeStep === 0 || submitting}
                    className="flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:px-7"
                >
                    Back
                </button>
                {activeStep < feedbackSteps.length - 1 ? (
                    <button
                        type="button"
                        onClick={goNextStep}
                        disabled={submitting}
                        className="flex min-h-11 flex-[1.4] items-center justify-center rounded-xl bg-blue-600 px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 btn-press sm:flex-none sm:px-9"
                    >
                        Continue
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex min-h-11 flex-[1.4] items-center justify-center rounded-xl bg-blue-600 px-4 text-[12px] font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 btn-press sm:flex-none sm:px-9"
                    >
                        {submitting ? 'Submitting...' : 'Submit Feedback'}
                    </button>
                )}
            </div>

        </div>
    );
}
