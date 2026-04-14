import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Briefcase,
    ChevronDown,
    FileText,
    GraduationCap,
    HelpCircle,
    Moon,
    SunMedium,
    Users
} from 'lucide-react';
import NorsuBrand from '../components/NorsuBrand';
import usePublicTheme from '../hooks/usePublicTheme';

export default function PublicLandingV2() {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = usePublicTheme();
    const getAnimationDelayStyle = (delayMs: number) => ({ animationDelay: `${delayMs}ms` });

    const portals = [
        {
            title: 'NAT Portal',
            description: 'Apply for admission testing, review schedules, and check application progress.',
            audience: 'Applicants and prospective students',
            bestFor: 'Choose this if you are applying for admission, checking a NAT schedule, or reviewing your application progress.',
            cta: 'Apply now',
            icon: FileText,
            accent: 'orange',
            route: '/nat'
        },
        {
            title: 'Student Portal',
            description: 'Manage your profile, counseling, scholarships, support requests, and activities.',
            audience: 'Currently enrolled students',
            bestFor: 'Choose this if you already have a student account and need services, forms, events, or support requests.',
            cta: 'Open student space',
            icon: GraduationCap,
            accent: 'blue',
            route: '/student/login'
        },
        {
            title: 'Department Portal',
            description: 'Review counseling and support cases, manage admissions interviews, and monitor students, events, and reports.',
            audience: 'Department heads and academic reviewers',
            bestFor: 'Choose this if you handle department-level reviews, admissions interviews, or student case decisions.',
            cta: 'Open department space',
            icon: Users,
            accent: 'emerald',
            route: '/department/login'
        },
        {
            title: 'CARE Staff',
            description: 'Coordinate interventions, counseling sessions, support services, and monitoring.',
            audience: 'CARE staff members',
            bestFor: 'Choose this if you manage counseling workflows, interventions, referrals, and operational follow-up.',
            cta: 'Open care staff space',
            icon: Briefcase,
            accent: 'purple',
            route: '/care-staff'
        }
    ] as const;

    return (
        <div className={isDark ? 'dark' : ''}>
            <div
                className={`min-h-screen px-4 py-6 text-slate-800 md:px-8 ${
                    isDark
                        ? 'bg-[radial-gradient(circle_at_top_left,_rgba(30,64,175,0.34),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.92),_transparent_40%),linear-gradient(135deg,_#020617_0%,_#0f172a_54%,_#111827_100%)] text-slate-100 [color-scheme:dark]'
                        : 'bg-[radial-gradient(circle_at_top_left,_rgba(134,239,172,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_32%),linear-gradient(135deg,_#eff8f1_0%,_#f8fbff_48%,_#ffffff_100%)]'
                }`}
            >
            <div className="mx-auto max-w-7xl">
                <header
                    className="animate-fade-in mb-8 flex items-center justify-between rounded-full border border-white/80 bg-white/90 px-4 py-3 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/80 dark:shadow-slate-950/30 md:px-6"
                    style={getAnimationDelayStyle(40)}
                >
                    <NorsuBrand
                        title="NORSU-G"
                        subtitle="CARE Center Management System"
                        accent={isDark ? 'blue' : 'gold'}
                        size="sm"
                        className="min-w-0"
                    />
                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-pressed={isDark}
                        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-300"
                    >
                        {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                        {isDark ? 'Light mode' : 'Dark mode'}
                    </button>
                </header>

                <section
                    className="grid items-center gap-10 rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-[0_30px_80px_rgba(148,163,184,0.18)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/70 dark:shadow-[0_30px_80px_rgba(2,6,23,0.45)] md:grid-cols-[1.05fr_0.95fr] md:p-10"
                >
                    <div className="space-y-8">
                        <div className="animate-fade-in-up space-y-5" style={getAnimationDelayStyle(80)}>
                            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-900 dark:text-white md:text-6xl">
                                Care for students with a calmer, clearer, more connected portal experience.
                            </h1>
                            <p className="max-w-xl text-base leading-8 text-slate-700 dark:text-slate-300 md:text-lg">
                                A unified digital front door for admissions support, student services, department coordination, and CARE Center operations at NORSU-G.
                            </p>
                        </div>

                        <div className="animate-fade-in-up flex flex-wrap gap-3" style={getAnimationDelayStyle(150)} aria-label="Quick access portals">
                            <button
                                type="button"
                                onClick={() => navigate('/student/login')}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
                            >
                                Enter Student Portal
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/nat')}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/75 px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition-all hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-400 dark:hover:text-sky-300"
                            >
                                Admissions and NAT
                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </div>

                        <details
                            className="animate-fade-in-up group rounded-[2rem] border border-blue-100/80 bg-white/80 p-5 shadow-lg shadow-slate-200/40 backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-slate-950/30"
                            style={getAnimationDelayStyle(220)}
                        >
                            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left marker:hidden focus-visible:outline-none">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300">
                                        <HelpCircle className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700 dark:text-sky-300">Need help choosing?</p>
                                        <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Which portal should I use?</h2>
                                        <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">
                                            Choose based on your role first. If you are applying to NORSU, start with the NAT Portal. If you already have a student account, use the Student Portal.
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className="mt-1 h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180 dark:text-slate-400" aria-hidden="true" />
                            </summary>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Portal guidance">
                                {portals.map((portal) => (
                                    <div key={`${portal.title}-guide`} className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/90">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{portal.title}</p>
                                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{portal.audience}</p>
                                        <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">{portal.bestFor}</p>
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>

                    <div className="animate-fade-in-up relative" style={getAnimationDelayStyle(290)} role="navigation" aria-labelledby="portal-directory-heading">
                        <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_30%)]" />
                        <div className="relative p-4 md:p-6">
                            <h2 id="portal-directory-heading" className="sr-only">Portal directory</h2>
                            <div className="grid gap-6 md:grid-cols-2">
                                {portals.map((portal, index) => {
                                    const Icon = portal.icon;
                                    const accentClass = {
                                        orange: 'bg-orange-50 text-orange-600',
                                        blue: 'bg-blue-50 text-blue-600',
                                        emerald: 'bg-emerald-50 text-emerald-600',
                                        purple: 'bg-purple-50 text-purple-600'
                                    }[portal.accent];

                                    return (
                                        <button
                                            key={portal.title}
                                            type="button"
                                            onClick={() => navigate(portal.route)}
                                            aria-describedby={`${portal.route.replaceAll('/', '-')}-description`}
                                            className="animate-fade-in-up group rounded-[2rem] border border-transparent bg-white/70 p-5 text-left shadow-lg shadow-slate-200/40 transition-all duration-200 hover:-translate-y-1 hover:border-slate-200/80 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:bg-slate-900/70 dark:shadow-slate-950/30 dark:hover:border-slate-600 dark:hover:bg-slate-900/90"
                                            style={getAnimationDelayStyle(350 + (index * 70))}
                                        >
                                            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass} dark:bg-slate-800`}>
                                                <Icon className="h-6 w-6" aria-hidden="true" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{portal.title}</h3>
                                            <p id={`${portal.route.replaceAll('/', '-')}-description`} className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-300">{portal.description}</p>
                                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900 transition-all group-hover:gap-3 dark:text-slate-100">
                                                {portal.cta}
                                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-10 grid gap-6 md:grid-cols-4">
                    {[
                        { title: 'Counseling', text: 'Counseling and intervention workflows' },
                        { title: 'Assessment', text: 'Student needs, follow-ups, and response tracking' },
                        { title: 'Resource', text: 'Department and staff collaboration for support actions' },
                        { title: 'Enhancement', text: 'Events, guidance, and academic coordination in one place' }
                    ].map((item, index) => (
                        <div
                            key={item.title}
                            className="animate-fade-in-up rounded-[1.8rem] border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-100 dark:border-slate-700/70 dark:bg-slate-900/75 dark:shadow-slate-950/20"
                            style={getAnimationDelayStyle(460 + (index * 70))}
                        >
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600 dark:text-sky-300">{item.title}</p>
                            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">{item.text}</p>
                        </div>
                    ))}
                </section>

                <div
                    className="animate-fade-in pb-4 pt-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
                    style={getAnimationDelayStyle(720)}
                >
                    2026 NORSU-G CARE Center Management System
                </div>
            </div>
            </div>
        </div>
    );
}
