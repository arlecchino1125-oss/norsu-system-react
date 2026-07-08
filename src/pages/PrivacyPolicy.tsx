import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Database,
    FileText,
    Info,
    Mail,
    Moon,
    Shield,
    SunMedium,
    Users
} from 'lucide-react';

import usePublicTheme from '../hooks/usePublicTheme';

const policySections = [
    {
        title: 'Information we collect',
        body: 'We may collect the information you submit through the CARE Center portals, such as names, contact details, application records, support requests, and related service notes.',
        accent: 'bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300',
        icon: FileText
    },
    {
        title: 'How we use it',
        body: 'The CARE Center uses this information to process admissions, student services, counseling, coordination with university offices, reporting, and portal operations.',
        accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
        icon: Database
    },
    {
        title: 'Who may access it',
        body: 'Access is limited to authorized university personnel and service providers acting on our behalf, subject to assigned roles and applicable rules.',
        accent: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
        icon: Users
    },
    {
        title: 'How we protect it',
        body: 'We use administrative, technical, and physical safeguards intended to reduce unauthorized access, disclosure, alteration, or loss.',
        accent: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
        icon: Shield
    },
] as const;

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

                <div className="mx-auto max-w-6xl relative z-10">
                    <header className="mb-6 flex flex-col gap-3 rounded-[1.75rem] border border-white/40 bg-white/70 px-4 py-3 shadow-xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/65 dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200/70 bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Back to home
                        </Link>

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

                    <main className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <section className="rounded-[2rem] border border-white/50 bg-white/80 p-6 shadow-2xl shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/75 dark:shadow-black/20 sm:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                                Temporary version
                            </div>

                            <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
                                Privacy Policy
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
                                This is a temporary privacy policy summary for the CARE Center public landing page.
                                The final policy will be published once it is reviewed and approved.
                            </p>

                            <div className="mt-8 grid gap-4 md:grid-cols-2">
                                {policySections.map(({ icon: Icon, title, body, accent }) => (
                                    <article
                                        key={title}
                                        className="rounded-3xl border border-slate-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-700/70 dark:bg-slate-800/80"
                                    >
                                        <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${accent}`}>
                                            <Icon className="h-5 w-5" aria-hidden="true" />
                                        </div>
                                        <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                                            {title}
                                        </h2>
                                        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                            {body}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <aside className="space-y-4">
                            <div className="rounded-[1.75rem] border border-amber-200/70 bg-amber-50/90 p-5 shadow-lg shadow-amber-900/5 backdrop-blur-xl dark:border-amber-400/20 dark:bg-amber-500/10 dark:shadow-black/10">
                                <div className="flex items-start gap-3">
                                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-600 shadow-sm dark:bg-slate-800 dark:text-amber-300">
                                        <Info className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700/80 dark:text-amber-200/80">
                                            Temporary notice
                                        </p>
                                        <h2 className="mt-1 text-lg font-bold text-amber-950 dark:text-amber-100">
                                            Working summary only
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-7 text-amber-900/85 dark:text-amber-100/85">
                                    This page summarizes how the CARE Center handles information on the public portals until the
                                    final policy text is published.
                                </p>
                            </div>

                            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-black/10">
                                <div className="flex items-start gap-3">
                                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm dark:bg-sky-500/15 dark:text-sky-300">
                                        <Mail className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            Questions or requests
                                        </p>
                                        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                            Need access or clarification?
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                    For access, correction, or clarification, contact the CARE Center through the official university
                                    channels.
                                </p>
                            </div>

                            <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-5 shadow-lg shadow-slate-950/5 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-black/10">
                                <div className="flex items-start gap-3">
                                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
                                        <Shield className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            Current scope
                                        </p>
                                        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                                            Public landing only
                                        </h2>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">
                                    This placeholder is meant for the public landing page while the formal policy page is being prepared.
                                </p>
                            </div>
                        </aside>
                    </main>

                    <footer className="mt-8 flex flex-col items-center gap-3 pb-4 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
