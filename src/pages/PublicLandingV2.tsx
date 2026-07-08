import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Briefcase,
    FileText,
    GraduationCap,
    HelpCircle,
    Moon,
    SunMedium,
    Users,
    X
} from 'lucide-react';
import NorsuBrand from '../components/NorsuBrand';
import usePublicTheme from '../hooks/usePublicTheme';

export default function PublicLandingV2() {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = usePublicTheme();
    const [isGuideOpen, setIsGuideOpen] = React.useState(false);
    const getAnimationDelayStyle = (delayMs: number) => ({ animationDelay: `${delayMs}ms` });

    React.useEffect(() => {
        if (!isGuideOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsGuideOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isGuideOpen]);

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
                className={`min-h-screen relative px-2.5 py-3 sm:px-4 sm:py-5 md:px-8 md:py-6 overflow-hidden ${isDark
                    ? 'text-slate-100 [color-scheme:dark]'
                    : 'text-slate-800'
                    }`}
            >
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 h-full w-full object-cover"
                    src="/new_bgVid.mp4"
                />
                <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/50'}`} aria-hidden="true" />

                <div className="mx-auto max-w-7xl relative z-10">
                    <header
                        className="animate-fade-in mb-4 flex items-center justify-between gap-3 rounded-3xl border border-white/30 bg-white/40 px-3 py-2.5 shadow-xl shadow-black/5 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/50 dark:shadow-black/20 sm:mb-6 sm:rounded-full sm:px-4 sm:py-3 md:mb-8 md:px-6"
                        style={getAnimationDelayStyle(40)}
                    >
                        <NorsuBrand
                            title="NORSU-G"
                            subtitle="CARE Center Management System"
                            accent="blue"
                            size="sm"
                            className="min-w-0"
                        />
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-pressed={isDark}
                            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/20 backdrop-blur-md px-3 text-xs font-bold text-white shadow-sm transition-all hover:border-white/60 hover:bg-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:h-auto sm:px-4 sm:py-2 sm:text-sm"
                        >
                            {isDark ? <SunMedium className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
                            <span className="hidden sm:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
                        </button>
                    </header>

                    <section
                        className="grid items-center gap-5 rounded-[1.5rem] border border-white/20 bg-white/30 p-3.5 shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-900/40 dark:shadow-black/40 sm:gap-7 sm:rounded-[2rem] sm:p-5 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:rounded-[2.5rem] md:p-10"
                    >
                        <div className="space-y-5 sm:space-y-7 md:space-y-8">
                            <div className="animate-fade-in-up space-y-3 sm:space-y-5" style={getAnimationDelayStyle(80)}>
                                <p className="text-[3.25rem] font-black leading-none tracking-normal text-blue-700 dark:text-sky-300 sm:text-7xl md:text-[6.5rem]">
                                    C.A.R.E
                                </p>
                                <h1 className="max-w-2xl text-[2rem] font-black leading-[1.08] tracking-normal text-white sm:text-4xl sm:leading-tight md:text-6xl">
                                    Student support, made simpler.
                                </h1>
                                <p className="max-w-xl text-sm leading-6 text-slate-200 sm:text-base sm:leading-8 md:text-lg">
                                    Access admissions, counseling, scholarships, student services, and campus support in one organized CARE Center space.
                                </p>
                            </div>

                            <div className="animate-fade-in-up grid gap-2 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-3" style={getAnimationDelayStyle(150)} aria-label="Quick access portals">
                                <button
                                    type="button"
                                    onClick={() => navigate('/student/login')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-3 py-2.5 text-[0.75rem] font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/25 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:w-auto sm:px-6 sm:py-3 sm:text-sm"
                                >
                                    Enter Student Portal
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/nat')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/50 bg-white/30 backdrop-blur-md px-3 py-2.5 text-[0.75rem] font-bold text-white shadow-sm transition-all hover:bg-white/50 hover:border-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent sm:w-auto sm:px-5 sm:py-3 sm:text-sm"
                                >
                                    Admissions and NAT
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>

                        </div>

                        <div className="animate-fade-in-up relative" style={getAnimationDelayStyle(290)} role="navigation" aria-labelledby="portal-directory-heading">
                            <div className="absolute inset-0 rounded-[1.5rem] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_30%)] sm:rounded-[2rem] md:rounded-[2.5rem]" />
                            <div className="relative p-1 sm:p-3 md:p-6">
                                <h2 id="portal-directory-heading" className="sr-only">Portal directory</h2>
                                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:gap-6">
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
                                                className="animate-fade-in-up group rounded-2xl border border-white/20 bg-white/30 p-3 text-left shadow-md shadow-black/5 transition-all duration-200 hover:-translate-y-1 hover:border-white/60 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-700/30 dark:bg-slate-900/40 dark:shadow-black/20 dark:hover:border-slate-600/50 dark:hover:bg-slate-900/60 sm:rounded-[1.5rem] sm:p-4 md:rounded-[2rem] md:p-5"
                                                style={getAnimationDelayStyle(350 + (index * 70))}
                                            >
                                                <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${accentClass} dark:bg-slate-800 sm:mb-4 sm:h-12 sm:w-12 sm:rounded-2xl`}>
                                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                                                </div>
                                                <h3 className="text-sm font-bold text-white sm:text-lg">{portal.title}</h3>
                                                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-white transition-all group-hover:gap-2 sm:mt-4 sm:gap-2 sm:text-sm sm:group-hover:gap-3">
                                                    {portal.cta}
                                                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsGuideOpen(true)}
                                    aria-haspopup="dialog"
                                    aria-controls="portal-guide-modal"
                                    className="animate-fade-in-up group mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/30 backdrop-blur-md px-3 py-2.5 text-left shadow-sm shadow-black/5 transition-all hover:border-white/50 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent dark:border-slate-700/30 dark:bg-slate-900/40 dark:shadow-black/20 dark:hover:border-slate-600/50 dark:hover:bg-slate-900/60 sm:mt-4 sm:px-4 sm:py-3"
                                    style={getAnimationDelayStyle(640)}
                                >
                                    <span className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300 sm:h-9 sm:w-9">
                                            <HelpCircle className="h-4 w-4" aria-hidden="true" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-[10px] font-black uppercase tracking-normal text-blue-700 dark:text-sky-300 sm:text-[11px]">Need help choosing?</span>
                                            <span className="block truncate text-xs font-bold text-white sm:text-sm">Which portal should I use?</span>
                                        </span>
                                    </span>
                                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-100/50 bg-blue-50/20 text-white transition-all group-hover:border-blue-200 group-hover:bg-blue-100/20">
                                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <section className="mt-5 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-4 md:mt-10 md:grid-cols-4 md:gap-6">
                        {[
                            { title: 'Counseling', text: 'Counseling and intervention workflows' },
                            { title: 'Assessment', text: 'Student needs, follow-ups, and response tracking' },
                            { title: 'Resource', text: 'Department and staff collaboration for support actions' },
                            { title: 'Enhancement', text: 'Events, guidance, and academic coordination in one place' }
                        ].map((item, index) => (
                            <div
                                key={item.title}
                                className="animate-fade-in-up rounded-2xl border border-white/20 bg-white/30 backdrop-blur-xl p-3 shadow-lg shadow-black/5 dark:border-slate-700/40 dark:bg-slate-900/40 dark:shadow-black/20 sm:rounded-[1.8rem] sm:p-5 md:p-6"
                                style={getAnimationDelayStyle(460 + (index * 70))}
                            >
                                <p className="text-[10px] font-black uppercase tracking-normal text-blue-300/80 sm:text-xs">{item.title}</p>
                                <p className="mt-2 text-xs leading-5 text-slate-200 sm:mt-3 sm:text-sm sm:leading-7">{item.text}</p>
                            </div>
                        ))}
                    </section>

                    <div
                        className="animate-fade-in flex flex-col items-center gap-3 pb-3 pt-6 text-center text-[10px] font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400 sm:pb-4 sm:pt-10 sm:text-xs"
                        style={getAnimationDelayStyle(720)}
                    >
                        <p>2026 NORSU-G CARE Center Management System</p>
                        <Link
                            to="/privacy-policy"
                            className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/90 underline decoration-white/30 underline-offset-4 transition hover:text-white hover:decoration-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent dark:text-slate-100 dark:decoration-slate-400/40"
                        >
                            Privacy Policy
                        </Link>
                    </div>
                </div>
            </div>

            {isGuideOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-3 sm:p-4"
                    onClick={() => setIsGuideOpen(false)}
                >
                    <div
                        id="portal-guide-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="portal-guide-title"
                        className="animate-scale-in w-full max-w-3xl overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-sky-500 px-5 py-5 text-white dark:border-slate-700 sm:px-6">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/25">
                                    <HelpCircle className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-normal text-white/80 sm:text-xs">Portal guide</p>
                                    <h2 id="portal-guide-title" className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">Which portal should I use?</h2>
                                    <p className="mt-2 text-sm leading-6 text-white/85">
                                        Choose based on your role and the task you need to complete.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsGuideOpen(false)}
                                aria-label="Close portal guide"
                                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-all hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="max-h-[calc(100dvh-11rem)] overflow-y-auto p-4 sm:p-6">
                            <div className="grid gap-3 sm:grid-cols-2" aria-label="Portal guidance">
                                {portals.map((portal) => {
                                    const Icon = portal.icon;
                                    const accentClass = {
                                        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
                                        blue: 'bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300',
                                        emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
                                        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300'
                                    }[portal.accent];

                                    return (
                                        <button
                                            key={`${portal.title}-modal-guide`}
                                            type="button"
                                            onClick={() => {
                                                setIsGuideOpen(false);
                                                navigate(portal.route);
                                            }}
                                            className="group rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/90 dark:hover:border-sky-500/40"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accentClass}`}>
                                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{portal.title}</h3>
                                                    <p className="mt-1 text-xs font-semibold uppercase tracking-normal text-slate-500 dark:text-slate-400">{portal.audience}</p>
                                                </div>
                                            </div>
                                            <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-300">{portal.bestFor}</p>
                                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition-all group-hover:gap-3 dark:text-sky-300">
                                                {portal.cta}
                                                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
