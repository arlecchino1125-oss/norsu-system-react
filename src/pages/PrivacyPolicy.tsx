import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    Database,
    FileText,
    Lock,
    Mail,
    Moon,
    Scale,
    Shield,
    SunMedium,
    UserCheck,
    Users
} from 'lucide-react';

import usePublicTheme from '../hooks/usePublicTheme';

const LAST_UPDATED = 'July 8, 2026';

const policySections = [
    {
        title: 'Information we collect',
        body: 'The information you provide directly — name, contact details, and personal identifiers; National Admission Test (NAT) application records; student profile details and photos; and guidance, counseling, and support notes. We also record basic sign-in activity needed to run the portals securely.',
        accent: 'bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300',
        icon: FileText
    },
    {
        title: 'How we use it',
        body: 'To evaluate admission applications, deliver guidance and counseling, manage student records and volunteer programs, coordinate with university offices, and produce reports and aggregate research. We do not sell your data or use it for advertising.',
        accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        icon: Database
    },
    {
        title: 'Legal basis for processing',
        body: 'We process personal data under the Data Privacy Act of 2012 (Republic Act No. 10173) — relying on the consent you give when submitting an application and on our legitimate need to carry out the CARE Center’s admissions, guidance, and student-service functions.',
        accent: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
        icon: Scale
    },
    {
        title: 'Who may access it',
        body: 'Only authorized CARE Center personnel and university offices whose roles require it, enforced by role-based access across the applicant, student, staff, and administrator portals. Trusted providers that host our platform and store files process data on our behalf under confidentiality obligations.',
        accent: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        icon: Users
    },
    {
        title: 'How we protect it',
        body: 'Administrative, technical, and physical safeguards: role-based permissions, authenticated access to every portal, encryption of data in transit, and monitoring for unauthorized activity — to reduce the risk of unauthorized access, disclosure, alteration, or loss.',
        accent: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        icon: Lock
    },
    {
        title: 'Data retention',
        body: 'We keep personal data only as long as needed to fulfil these purposes and to comply with university records policies and applicable law. When it is no longer required, it is securely deleted or anonymized.',
        accent: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
        icon: Clock
    },
] as const;

const rights = [
    'Be informed about how your data is collected and used',
    'Access and obtain a copy of your personal data',
    'Correct inaccurate or outdated information',
    'Object to or withdraw consent for certain processing',
    'File a complaint if your data-privacy rights are violated',
] as const;

const cardBase =
    'flex h-full flex-col rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg shadow-slate-950/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700/60 dark:bg-slate-900/75 dark:shadow-black/20 sm:p-6';

export default function PrivacyPolicy() {
    const { isDark, toggleTheme } = usePublicTheme();

    return (
        <div className={isDark ? 'dark' : ''}>
            <div
                className={`min-h-screen relative overflow-hidden px-4 py-5 sm:px-6 sm:py-6 ${isDark
                    ? 'bg-slate-950 text-slate-100 [color-scheme:dark]'
                    : 'bg-gradient-to-br from-slate-50 via-blue-50 to-emerald-50 text-slate-900'
                    }`}
            >
                <div
                    className={`absolute inset-0 ${isDark ? 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_32%)]' : 'bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.08),_transparent_30%)]'}`}
                    aria-hidden="true"
                />
                <div
                    className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20 dark:opacity-10"
                    aria-hidden="true"
                />

                <div className="w-full relative z-10">
                    <header className="mb-6 flex flex-col gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 px-4 py-3 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/65 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to home
                        </Link>

                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-1.5">
                                <img
                                    src="/norsu.png"
                                    alt="NORSU-G seal"
                                    className="h-9 w-9 rounded-full border border-slate-200 bg-white object-cover p-0.5 shadow-sm dark:border-slate-700"
                                />
                                <img
                                    src="/carecenter.png"
                                    alt="CARE Center logo"
                                    className="h-9 w-9 rounded-full border border-slate-200 bg-white object-cover shadow-sm dark:border-slate-700"
                                />
                            </div>
                            <div className="leading-tight">
                                <p className="text-sm font-black text-slate-900 dark:text-white">NORSU-G CARE Center</p>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Management System</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-pressed={isDark}
                            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-full border border-white/40 bg-white/40 px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-white/60 hover:bg-white/70 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-700/50 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-800 sm:self-auto sm:px-4 sm:py-2 sm:text-sm"
                        >
                            {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                            <span className="hidden sm:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
                        </button>
                    </header>

                    {/* Hero */}
                    <section className="mb-6 flex flex-col gap-6 overflow-hidden rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/75 dark:shadow-black/20 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/70 bg-blue-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200">
                                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                                Data Privacy
                            </div>

                            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                                Privacy Policy
                            </h1>
                            <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                                How the NORSU-G CARE Center collects, uses, protects, and shares personal information across
                                its public applicant portal and its student, staff, and administrator systems — written to
                                comply with the Data Privacy Act of 2012.
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold lg:flex-col lg:items-end">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-slate-700 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                                Last updated {LAST_UPDATED}
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-slate-700 dark:border-slate-700/70 dark:bg-slate-800/70 dark:text-slate-200">
                                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                                RA 10173 compliant
                            </span>
                        </div>
                    </section>

                    {/* All cards in one equal-height grid — fills the row with no empty column */}
                    <main className="grid auto-rows-fr gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {policySections.map(({ icon: Icon, title, body, accent }, index) => (
                            <article key={title} className={cardBase}>
                                <div className="flex items-center justify-between">
                                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
                                        <Icon className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <span className="text-xs font-black tabular-nums text-slate-300 dark:text-slate-600">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </div>
                                <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{title}</h2>
                                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{body}</p>
                            </article>
                        ))}

                        {/* Your rights */}
                        <article className={cardBase}>
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                                <UserCheck className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Your rights</h2>
                            <ul className="mt-3 space-y-2.5">
                                {rights.map((right) => (
                                    <li key={right} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden="true" />
                                        {right}
                                    </li>
                                ))}
                            </ul>
                        </article>

                        {/* Contact */}
                        <article className={cardBase}>
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300">
                                <Mail className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Contact the CARE Center</h2>
                            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                To exercise your rights, or to request access, correction, or clarification about your data,
                                contact the NORSU-G CARE Center through the official university channels. We respond in line
                                with the Data Privacy Act of 2012.
                            </p>
                        </article>

                        {/* Updates */}
                        <article className={cardBase}>
                            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                <FileText className="h-5 w-5" aria-hidden="true" />
                            </div>
                            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Changes to this policy</h2>
                            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                We may update this policy as the CARE Center’s services evolve. The current version and its
                                last-updated date are always shown on this page.
                            </p>
                        </article>
                    </main>

                    <footer className="mt-10 flex flex-col items-center gap-3 pb-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <p>2026 NORSU-G CARE Center Management System</p>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                            Back to home
                        </Link>
                    </footer>
                </div>
            </div>
        </div>
    );
}
