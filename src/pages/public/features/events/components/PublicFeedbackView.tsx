import React, { useState } from 'react';
import { submitPublicGeneralFeedback } from '../publicEventsService';
import { validateTextInput } from '../../../../../utils/inputSecurity';
import type { PublicIdentity } from '../hooks/usePublicEvents';

interface PublicFeedbackViewProps {
    identity: PublicIdentity | null;
    onRequireSignIn: () => void;
    showToast: (message: string, type?: string) => void;
}

const SQD_ITEMS = [
    { key: 'sqd0', text: 'SQD0. I am satisfied with the service that I availed.' },
    { key: 'sqd1', text: 'SQD1. I spent a reasonable amount of time for my transaction.' },
    { key: 'sqd2', text: 'SQD2. The office followed the transaction requirements and steps based on the information provided.' },
    { key: 'sqd3', text: 'SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.' },
    { key: 'sqd4', text: 'SQD4. I easily found information about my transaction from the website.' },
    { key: 'sqd5', text: 'SQD5. I paid a reasonable amount of fees for my transaction.' },
    { key: 'sqd6', text: 'SQD6. I am confident my online transaction was secure.' },
    { key: 'sqd7', text: 'SQD7. The online support was available, and if I asked questions, online support was quick to respond.' },
    { key: 'sqd8', text: 'SQD8. I got what I needed from the office, or (if denied) my denial was sufficiently explained.' },
];

const SQD_LABELS = ['1', '2', '3', '4', '5'];
const CLIENT_TYPES = ['Student', 'Alumni', 'Faculty / Staff', 'Parent / Guardian', 'Visitor / Other'];

const CC1_OPTIONS = [
    { v: '1', t: 'I know what a Citizen\'s Charter (CC) is and I saw this office\'s CC.' },
    { v: '2', t: 'I know what a CC is but I did NOT see this office\'s CC.' },
    { v: '3', t: 'I learned of the CC only when I saw this office\'s CC.' },
    { v: '4', t: 'I do not know what a CC is and I did not see one. (Answer "N/A" on CC2 and CC3)' },
];

interface PublicFeedbackForm {
    client_type: string;
    sex: string;
    age: string;
    region: string;
    service_availed: string;
    email: string;
    cc1: string;
    cc2: string;
    cc3: string;
    sqd: Record<string, string>;
    suggestions: string;
}

const EMPTY_FORM: PublicFeedbackForm = {
    client_type: 'Student',
    sex: '',
    age: '',
    region: 'Region VII - Central Visayas',
    service_availed: '',
    email: '',
    cc1: '',
    cc2: '',
    cc3: '',
    sqd: {},
    suggestions: '',
};

const sectionCardClass = 'rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:rounded-2xl sm:p-5';
const fieldLabelClass = 'mb-1 block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 sm:mb-1.5 sm:text-[10px]';
const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 sm:py-2.5 sm:text-sm';

export default function PublicFeedbackView({ identity, onRequireSignIn, showToast }: PublicFeedbackViewProps) {
    const [form, setForm] = useState<PublicFeedbackForm>(EMPTY_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const set = (patch: Partial<PublicFeedbackForm>) => setForm((prev) => ({ ...prev, ...patch }));

    const setSqd = (key: string, value: string) =>
        setForm((prev) => ({ ...prev, sqd: { ...prev.sqd, [key]: value } }));

    const handleSubmit = async () => {
        if (!form.service_availed.trim()) {
            showToast('Tell us which service you availed.', 'error');
            return;
        }
        if (!form.client_type) {
            showToast('Select your client type.', 'error');
            return;
        }
        if (form.email && !validateTextInput(form.email, 'email', { label: 'Email' }).valid) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        const suggestions = validateTextInput(form.suggestions, 'notes', { multiline: true, label: 'Comments' });
        if (suggestions.error) {
            showToast(suggestions.error, 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // Student ID is optional: attributed when supplied, anonymous otherwise.
            const data = {
                client_type: form.client_type,
                sex: form.sex || undefined,
                age: form.age || undefined,
                region: form.region || undefined,
                service_availed: form.service_availed.trim(),
                email: form.email?.trim() || undefined,
                cc1: form.cc1 || undefined,
                cc2: form.cc2 || undefined,
                cc3: form.cc3 || undefined,
                sqd0: form.sqd.sqd0 ? Number(form.sqd.sqd0) : undefined,
                sqd1: form.sqd.sqd1 ? Number(form.sqd.sqd1) : undefined,
                sqd2: form.sqd.sqd2 ? Number(form.sqd.sqd2) : undefined,
                sqd3: form.sqd.sqd3 ? Number(form.sqd.sqd3) : undefined,
                sqd4: form.sqd.sqd4 ? Number(form.sqd.sqd4) : undefined,
                sqd5: form.sqd.sqd5 ? Number(form.sqd.sqd5) : undefined,
                sqd6: form.sqd.sqd6 ? Number(form.sqd.sqd6) : undefined,
                sqd7: form.sqd.sqd7 ? Number(form.sqd.sqd7) : undefined,
                sqd8: form.sqd.sqd8 ? Number(form.sqd.sqd8) : undefined,
                suggestions: suggestions.value || undefined,
            };
            await submitPublicGeneralFeedback(data, identity?.student.student_id);
            showToast('Thank you for your feedback.');
            setForm(EMPTY_FORM);
        } catch (err: any) {
            showToast(err.message || 'Something went wrong.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mx-auto max-w-lg px-3.5 pt-3.5 pb-10 animate-fade-in space-y-3 sm:px-4 sm:pt-5 sm:pb-12 sm:space-y-4">
            <div className="flex items-center justify-between gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 shadow-sm sm:rounded-2xl sm:gap-3 sm:px-4 sm:py-3">
                <p className="min-w-0 text-[11px] font-semibold text-amber-800 sm:text-xs">
                    {identity
                        ? <>Signed in as <strong className="font-black text-amber-900">{identity.student.student_id}</strong> — your feedback will be attributed to your record.</>
                        : 'You are submitting anonymously. Your Student ID is optional but helps the office follow up.'}
                </p>
                {!identity && (
                    <button
                        type="button"
                        onClick={onRequireSignIn}
                        className="shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-amber-600 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs"
                    >
                        Sign In (optional)
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* Section 1: Client information */}
                <section className={sectionCardClass}>
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">1</span>
                        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Client Information</h3>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className={fieldLabelClass}>Client Type</label>
                            <select value={form.client_type} onChange={(e) => set({ client_type: e.target.value })} className={inputClass}>
                                {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Service Availed *</label>
                            <input value={form.service_availed} onChange={(e) => set({ service_availed: e.target.value })} className={inputClass} placeholder="e.g. Counseling, Registrar…" />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Sex (optional)</label>
                            <select value={form.sex} onChange={(e) => set({ sex: e.target.value })} className={inputClass}>
                                <option value="">Prefer not to say</option>
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                            </select>
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Age (optional)</label>
                            <input type="number" min={1} max={120} value={form.age} onChange={(e) => set({ age: e.target.value })} className={inputClass} placeholder="e.g. 20" />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Region</label>
                            <input value={form.region} onChange={(e) => set({ region: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                            <label className={fieldLabelClass}>Email (optional)</label>
                            <input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} className={inputClass} placeholder="you@example.com" />
                        </div>
                    </div>
                </section>

                {/* Section 2: Citizen's Charter */}
                <section className={sectionCardClass}>
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">2</span>
                        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Citizen&apos;s Charter</h3>
                    </div>
                    <div className="mt-4 space-y-4">
                        {CC1_OPTIONS.map((o) => (
                            <label key={o.v} className="flex items-start gap-2 text-sm text-slate-700">
                                <input type="radio" name="cc1" checked={form.cc1 === o.v} onChange={() => set({ cc1: o.v })} className="mt-0.5 h-4 w-4 text-emerald-600" />
                                <span>{o.t}</span>
                            </label>
                        ))}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={fieldLabelClass}>CC2: How visible was the Charter?</label>
                                <select value={form.cc2} onChange={(e) => set({ cc2: e.target.value })} className={inputClass}>
                                    <option value="">Select…</option>
                                    <option value="1">Easy to see</option>
                                    <option value="2">Somewhat easy to see</option>
                                    <option value="3">Difficult to see</option>
                                    <option value="4">Not visible at all</option>
                                    <option value="5">N/A</option>
                                </select>
                            </div>
                            <div>
                                <label className={fieldLabelClass}>CC3: Did the Charter help you?</label>
                                <select value={form.cc3} onChange={(e) => set({ cc3: e.target.value })} className={inputClass}>
                                    <option value="">Select…</option>
                                    <option value="1">Helped very much</option>
                                    <option value="2">Somewhat helped</option>
                                    <option value="3">Did not help</option>
                                    <option value="4">N/A</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section 3: Service Quality (SQD) */}
                <section className={sectionCardClass}>
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">3</span>
                        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Service Quality</h3>
                    </div>
                    <div className="mt-4 space-y-2">
                        <div className="mb-1 grid grid-cols-[1fr_repeat(5,2rem)] items-center gap-1 px-1 text-center text-[9px] font-black uppercase tracking-wide text-slate-400">
                            <span />
                            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
                        </div>
                        {SQD_ITEMS.map((item) => (
                            <div key={item.key} className="grid grid-cols-[1fr_repeat(5,2rem)] items-center gap-1 border-b border-slate-100 py-2">
                                <p className="px-1 text-[12px] font-semibold leading-4 text-slate-700">{item.text}</p>
                                {SQD_LABELS.map((label) => {
                                    const selected = form.sqd[item.key] === label;
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => setSqd(item.key, label)}
                                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-black transition ${selected ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-300 hover:bg-emerald-50'}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                        <div className="mt-2 flex items-start justify-between px-1 text-[10px] font-semibold text-slate-400">
                            <span>Strongly Disagree</span>
                            <span>Strongly Agree</span>
                        </div>
                    </div>
                </section>

                {/* Section 4: Comments */}
                <section className={sectionCardClass}>
                    <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">4</span>
                        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-700">Comments &amp; Suggestions</h3>
                    </div>
                    <textarea
                        rows={4}
                        value={form.suggestions}
                        onChange={(e) => set({ suggestions: e.target.value })}
                        className={`mt-4 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100 ${inputClass}`}
                        placeholder="Anything you'd like us to know…"
                    />
                </section>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isSubmitting ? (
                        <>
                            <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            Submitting…
                        </>
                    ) : (
                        'Submit Feedback'
                    )}
                </button>
            </div>
        </div>
    );
}

