import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Clock,
    Database,
    FileText,
    Lock,
    Moon,
    Scale,
    Shield,
    ShieldCheck,
    SunMedium,
    UserCheck,
    Users,
    Printer,
    CheckCircle2,
    ChevronRight,
    Sparkles,
    BookOpen,
    Eye,
    SlidersHorizontal
} from 'lucide-react';

import usePublicTheme from '../hooks/usePublicTheme';

const LAST_UPDATED = 'July 8, 2026';
const POLICY_VERSION = '1.0';
const READING_TIME = '4 min read';

interface SectionDef {
    id: string;
    num: string;
    title: string;
    shortTitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    badgeBg: string;
    takeaway: string;
}

const SECTIONS: SectionDef[] = [
    {
        id: 'section-01',
        num: '01',
        title: 'Information We Collect',
        shortTitle: 'Collected Info',
        icon: FileText,
        accentColor: 'text-blue-600 dark:text-sky-400',
        badgeBg: 'bg-blue-50 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300 border-blue-200/60 dark:border-sky-500/30',
        takeaway: 'We only collect adequate and necessary identifiers, NAT application records, student profiles, counseling records, and security audit logs.'
    },
    {
        id: 'section-02',
        num: '02',
        title: 'How We Use Your Information',
        shortTitle: 'Data Usage',
        icon: Database,
        accentColor: 'text-emerald-600 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/30',
        takeaway: 'Your data is strictly used for admissions evaluations, guidance counseling, student support, and university services. We NEVER sell your data or use it for advertising.'
    },
    {
        id: 'section-03',
        num: '03',
        title: 'Lawful Basis for Processing',
        shortTitle: 'Legal Basis',
        icon: Scale,
        accentColor: 'text-indigo-600 dark:text-indigo-400',
        badgeBg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/30',
        takeaway: 'Processing relies on your explicit consent, service fulfillment, legal obligations, and official university functions under the Data Privacy Act.'
    },
    {
        id: 'section-04',
        num: '04',
        title: 'Who May Access or Receive Your Information',
        shortTitle: 'Access & Sharing',
        icon: Users,
        accentColor: 'text-amber-600 dark:text-amber-400',
        badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/30',
        takeaway: 'Access is limited to authorized CARE Center personnel and university offices via strict role-based controls and confidentiality-bound technology providers.'
    },
    {
        id: 'section-05',
        num: '05',
        title: 'How We Protect Your Information',
        shortTitle: 'Data Protection',
        icon: Lock,
        accentColor: 'text-violet-600 dark:text-violet-400',
        badgeBg: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border-violet-200/60 dark:border-violet-500/30',
        takeaway: 'We enforce authenticated portal access, end-to-end transit encryption, role-based restrictions, and proactive system activity monitoring.'
    },
    {
        id: 'section-06',
        num: '06',
        title: 'Data Retention and Disposal',
        shortTitle: 'Retention & Disposal',
        icon: Clock,
        accentColor: 'text-rose-600 dark:text-rose-400',
        badgeBg: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/30',
        takeaway: 'Records are retained only as long as necessary for academic and records policies, followed by secure destruction or irreversible anonymization.'
    },
    {
        id: 'section-rights',
        num: '07',
        title: 'Your Data Privacy Rights',
        shortTitle: 'Your Rights',
        icon: UserCheck,
        accentColor: 'text-teal-600 dark:text-teal-400',
        badgeBg: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300 border-teal-200/60 dark:border-teal-500/30',
        takeaway: 'You hold full legal rights under RA 10173 to be informed, access, rectify, object, withdraw consent, and file complaints with the NPC.'
    },
    {
        id: 'section-updates',
        num: '08',
        title: 'Changes to This Privacy Notice',
        shortTitle: 'Policy Updates',
        icon: FileText,
        accentColor: 'text-purple-600 dark:text-purple-400',
        badgeBg: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/30',
        takeaway: 'Material updates are published on this page with clear version history and revision dates.'
    }
];

export default function PrivacyPolicy() {
    const { isDark, toggleTheme } = usePublicTheme();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState<string>('section-01');

    // Handle smart back navigation
    const handleSmartBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    // ScrollSpy to highlight active section in TOC
    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.scrollY + 200;
            for (const section of SECTIONS) {
                const el = document.getElementById(section.id);
                if (el) {
                    const top = el.offsetTop;
                    const height = el.offsetHeight;
                    if (scrollPosition >= top && scrollPosition < top + height) {
                        setActiveSection(section.id);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            const offset = 80;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
            setActiveSection(id);
        }
    };

    return (
        <div className={isDark ? 'dark' : ''}>
            <div
                className={`min-h-screen relative font-sans transition-colors duration-200 ${isDark
                    ? 'bg-slate-950 text-slate-100 [color-scheme:dark]'
                    : 'bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/40 text-slate-900'
                    }`}
            >
                {/* Background Ambient Glows */}
                <div
                    className={`fixed inset-0 pointer-events-none ${isDark
                        ? 'bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_36%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_36%)]'
                        : 'bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.08),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.06),_transparent_32%)]'
                        }`}
                    aria-hidden="true"
                />
                <div
                    className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40 dark:opacity-20"
                    aria-hidden="true"
                />

                {/* Sticky Header */}
                <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-slate-900/80 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={handleSmartBack}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-700 sm:text-sm"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                <span>Back</span>
                            </button>

                            <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

                            <div className="flex items-center gap-2.5">
                                <div className="flex -space-x-1.5 shrink-0">
                                    <img
                                        src="/norsu.png"
                                        alt="NORSU seal"
                                        className="h-8 w-8 rounded-full border border-slate-200 bg-white object-cover p-0.5 shadow-sm dark:border-slate-700"
                                    />
                                    <img
                                        src="/carecenter.png"
                                        alt="CARE Center"
                                        className="h-8 w-8 rounded-full border border-slate-200 bg-white object-cover shadow-sm dark:border-slate-700"
                                    />
                                </div>
                                <div className="leading-tight">
                                    <span className="block text-xs font-black text-slate-900 dark:text-white sm:text-sm">NORSU-G CARE</span>
                                    <span className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400">Privacy Notice</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => window.print()}
                                title="Print or save as PDF"
                                aria-label="Print or save as PDF"
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white sm:px-3.5"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Print</span>
                            </button>

                            <button
                                type="button"
                                onClick={toggleTheme}
                                aria-pressed={isDark}
                                aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                                title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-3 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white"
                            >
                                {isDark ? <SunMedium className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-600" />}
                                <span className="hidden md:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
                            </button>
                        </div>
                    </div>
                </header>

                <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                    {/* Hero Header Card */}
                    <div className="relative mb-8 overflow-hidden rounded-[2rem] border border-white/60 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-10">
                        <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-gradient-to-br from-blue-500/10 via-emerald-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex flex-wrap items-center gap-2.5 mb-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Data Privacy Notice
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    <Scale className="h-3.5 w-3.5" />
                                    RA 10173 Compliant
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                    <Clock className="h-3.5 w-3.5" />
                                    {READING_TIME}
                                </span>
                            </div>

                            <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
                                Privacy Policy
                            </h1>

                            <p className="mt-4 max-w-4xl text-base font-normal leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">
                                This Privacy Notice explains how the <strong className="font-semibold text-slate-900 dark:text-white">NORSU-G CARE Center</strong> collects, uses, stores, protects, and discloses personal data through its public applicant portal and its student, staff, and administrator systems. We process personal data in accordance with Republic Act No. 10173, or the{' '}
                                <strong className="font-semibold text-slate-900 dark:text-white">Data Privacy Act of 2012</strong>, its implementing rules and regulations, and applicable issuances of the National Privacy Commission (NPC).
                            </p>

                            <div className="mt-6 flex flex-wrap items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                <span>Version {POLICY_VERSION}</span>
                                <span>•</span>
                                <span>Last updated {LAST_UPDATED}</span>
                                <span>•</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Active University Standard</span>
                            </div>
                        </div>

                        {/* Quick Jump Bar on Mobile/Tablet */}
                        <div className="mt-6 flex flex-wrap gap-2 lg:hidden pt-4 border-t border-slate-100 dark:border-slate-800">
                            <span className="w-full text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Jump to section:</span>
                            {SECTIONS.map((sec) => (
                                <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => scrollToSection(sec.id)}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${activeSection === sec.id
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {sec.num}. {sec.shortTitle}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main 2-Column Reader Layout */}
                    <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]">
                        {/* Sticky Desktop Navigation Sidebar */}
                        <aside className="hidden lg:block">
                            <div className="sticky top-24 space-y-5 rounded-3xl border border-white/60 bg-white/80 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
                                <div>
                                    <div className="flex items-center justify-between mb-3 px-2">
                                        <h2 className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                            Table of Contents
                                        </h2>
                                        <span className="text-[10px] font-bold text-blue-600 dark:text-sky-400">8 Sections</span>
                                    </div>
                                    <nav className="space-y-1" aria-label="Privacy notice sections">
                                        {SECTIONS.map((sec) => {
                                            const isActive = activeSection === sec.id;
                                            const Icon = sec.icon;
                                            return (
                                                <button
                                                    key={sec.id}
                                                    type="button"
                                                    onClick={() => scrollToSection(sec.id)}
                                                    className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold transition-all ${isActive
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-100'
                                                        }`}
                                                >
                                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                        {sec.num}
                                                    </span>
                                                    <span className="truncate flex-1">{sec.title}</span>
                                                    {isActive && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                {/* Key Highlights Summary Card */}
                                <div className="rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50 to-blue-50/50 p-4 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/20">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        <span>Key Commitments</span>
                                    </div>
                                    <ul className="space-y-2 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                            <span>No advertising or selling of personal data</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                            <span>Strict role-based access across all campus portals</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                                            <span>Full exercise of rights under RA 10173</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </aside>

                        {/* Main Articles Stream */}
                        <div className="space-y-8">
                            {/* 01 — Information We Collect */}
                            <section id="section-01" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-sky-500/15 dark:text-sky-300">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-sky-400">Section 01</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Information We Collect</h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Takeaway Box */}
                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/60 p-4 text-xs leading-relaxed text-blue-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                                    <Eye className="h-4 w-4 shrink-0 text-blue-600 dark:text-sky-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[0].takeaway}
                                    </div>
                                </div>

                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Depending on the service you use, we may collect personal data that you provide directly or that is generated through your use of our systems, including:
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        'Name, contact information, and other personal identifiers',
                                        'National Admission Test (NAT) application and admission records',
                                        'Student profile information and photographs',
                                        'Guidance, counseling, needs-assessment, and student-support information',
                                        'Service requests, submissions, feedback, surveys, and related records',
                                        'Attendance, log-in, and basic system activity necessary to operate and secure our services'
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-sky-500/20 dark:text-sky-300">
                                                {idx + 1}
                                            </span>
                                            <span className="text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    <p className="font-bold mb-1">Sensitive Personal Information Protection</p>
                                    <p>
                                        Some information collected through CARE Center services may constitute <strong className="font-bold">sensitive personal information</strong> under the Data Privacy Act. Such information is subject to additional access restrictions and appropriate safeguards. We collect only information that is adequate, relevant, and necessary for the stated purposes.
                                    </p>
                                </div>
                            </section>

                            {/* 02 — How We Use Your Information */}
                            <section id="section-02" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <Database className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Section 02</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">How We Use Your Information</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-xs leading-relaxed text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[1].takeaway}
                                    </div>
                                </div>

                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    We process personal data only for specified and legitimate purposes, including to:
                                </p>

                                <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 text-xs leading-5 font-semibold text-slate-700 dark:text-slate-200">
                                    {[
                                        'Process and evaluate admission applications',
                                        'Administer National Admission Test-related services',
                                        'Provide guidance, counseling, and student-support services',
                                        'Manage student records and service requests',
                                        'Coordinate necessary services with authorized university offices',
                                        'Monitor and document attendance and service utilization',
                                        'Conduct surveys, feedback activities, and program evaluation',
                                        'Generate administrative, statistical, and aggregate reports',
                                        'Maintain, secure, troubleshoot, and improve the CARE Center systems'
                                    ].map((purpose, i) => (
                                        <li key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/30">
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />
                                            <span>{purpose}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="mt-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs leading-relaxed text-emerald-950 dark:text-emerald-200">
                                    <p className="font-bold mb-1">Strict Prohibition Against Commercial Use</p>
                                    <p>
                                        We do not sell personal data or use it for advertising. Where information is used for statistical or research purposes, we apply appropriate safeguards and, where practicable, use aggregated or de-identified information.
                                    </p>
                                </div>
                            </section>

                            {/* 03 — Lawful Basis for Processing */}
                            <section id="section-03" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                            <Scale className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">Section 03</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Lawful Basis for Processing</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-indigo-200/70 bg-indigo-50/60 p-4 text-xs leading-relaxed text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-100">
                                    <Scale className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[2].takeaway}
                                    </div>
                                </div>

                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Depending on the specific processing activity, personal data may be processed on the basis of:
                                </p>

                                <div className="mt-4 space-y-2.5">
                                    {[
                                        { title: 'Your Consent', desc: 'When explicit consent is requested and given for admissions or voluntary services' },
                                        { title: 'Performance of Service or Agreement', desc: 'Carrying out educational administration and requested student support' },
                                        { title: 'Compliance with Legal/Regulatory Obligations', desc: 'Adhering to CHED mandates, state university policies, and Philippine laws' },
                                        { title: 'Official University Functions', desc: 'Exercising official guidance, admissions, and academic functions under the Data Privacy Act' },
                                        { title: 'Other Permitted Lawful Bases', desc: 'Any other legitimate bases recognized under applicable Philippine data-protection regulations' }
                                    ].map((basis, idx) => (
                                        <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500 dark:bg-indigo-400" />
                                            <div className="text-xs leading-5">
                                                <strong className="font-bold text-slate-900 dark:text-white">{basis.title}: </strong>
                                                <span className="text-slate-600 dark:text-slate-300">{basis.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                                    <p className="font-semibold text-slate-900 dark:text-white mb-1">Withdrawal of Consent</p>
                                    <p>
                                        When processing is based on consent, you may withdraw your consent where applicable. Withdrawal of consent does not affect processing that was lawfully carried out before the withdrawal or processing that may otherwise be permitted by law.
                                    </p>
                                </div>
                            </section>

                            {/* 04 — Who May Access or Receive Your Information */}
                            <section id="section-04" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">Section 04</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Who May Access Your Information</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                                    <Users className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[3].takeaway}
                                    </div>
                                </div>

                                <div className="space-y-4 text-sm leading-7 text-slate-600 dark:text-slate-300 font-normal">
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Authorized University Personnel</h3>
                                        <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                                            Access to personal data is strictly restricted to authorized CARE Center personnel and appropriate university offices whose official functions require access to the information. Access is controlled through role-based permissions and other security measures.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Trusted Third-Party Service Providers</h3>
                                        <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                                            We may engage trusted third-party service providers, such as hosting, database storage, authentication, or technology providers, to process personal data on behalf of the University. These providers are required to implement appropriate safeguards and process personal data only for authorized purposes under strict confidentiality obligations.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                        <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Legal Disclosures</h3>
                                        <p className="text-xs leading-6 text-slate-600 dark:text-slate-300">
                                            Personal data may also be disclosed when required or permitted by applicable law, regulation, legal process, or authorized government request.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* 05 — How We Protect Your Information */}
                            <section id="section-05" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">Section 05</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">How We Protect Your Information</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-violet-200/70 bg-violet-50/60 p-4 text-xs leading-relaxed text-violet-950 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-100">
                                    <Lock className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[4].takeaway}
                                    </div>
                                </div>

                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    We implement reasonable and appropriate organizational, physical, and technical safeguards designed to protect personal data against unauthorized access, disclosure, alteration, destruction, loss, or other unlawful processing:
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { title: 'Role-Based Access Controls', desc: 'Granular permissions restricting access to necessary staff roles only' },
                                        { title: 'Authenticated Portal Access', desc: 'Verified secure logins for students, applicants, and staff' },
                                        { title: 'Secure Data Transmission', desc: 'Encrypted network protocols (HTTPS/TLS) across all client-server traffic' },
                                        { title: 'Personnel Responsibility Bounds', desc: 'Enforced authorization based on designated academic responsibilities' },
                                        { title: 'System Activity Monitoring & Logging', desc: 'Audit trails and real-time security tracking of administrative actions' },
                                        { title: 'Secure Storage & Management', desc: 'Encrypted storage databases with automated backup protocols' },
                                        { title: 'Administrative Privacy Policies', desc: 'Regular review of institutional guidelines and staff compliance procedures' }
                                    ].map((guard, i) => (
                                        <div key={i} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                                            <ShieldCheck className="h-4 w-4 shrink-0 text-violet-500 dark:text-violet-400 mt-0.5" />
                                            <div className="text-xs leading-5">
                                                <strong className="font-bold text-slate-900 dark:text-white">{guard.title}: </strong>
                                                <span className="text-slate-600 dark:text-slate-300">{guard.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 italic">
                                    No security measure can guarantee absolute protection against every possible threat. We continuously review and improve our safeguards as necessary.
                                </p>
                            </section>

                            {/* 06 — Data Retention and Disposal */}
                            <section id="section-06" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-600 dark:text-rose-400">Section 06</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Data Retention and Disposal</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/60 p-4 text-xs leading-relaxed text-rose-950 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                                    <Clock className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[5].takeaway}
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    <p>
                                        Personal data is retained only for as long as necessary to fulfill the purposes for which it was collected, comply with applicable laws and university records-retention requirements, and establish, exercise, or defend legitimate legal or administrative claims where applicable.
                                    </p>
                                    <p>
                                        Different categories of records may have distinct retention periods established by official university records management policies.
                                    </p>
                                    <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 dark:border-rose-900/30 dark:bg-rose-950/20 text-rose-950 dark:text-rose-200">
                                        <p className="font-bold text-xs mb-1">Disposal &amp; Anonymization</p>
                                        <p className="text-xs leading-relaxed">
                                            When personal data is no longer required, it will be securely deleted, destroyed, or anonymized in accordance with applicable university policies and legal requirements.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* 07 — Your Data Privacy Rights */}
                            <section id="section-rights" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300">
                                            <UserCheck className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">Section 07</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Your Data Privacy Rights</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-teal-200/70 bg-teal-50/60 p-4 text-xs leading-relaxed text-teal-950 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-100">
                                    <UserCheck className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[6].takeaway}
                                    </div>
                                </div>

                                <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                    Subject to the conditions and limitations provided by law, you may have the right to:
                                </p>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        { right: 'Be informed', desc: 'about how your personal data is collected, stored, and processed;' },
                                        { right: 'Access', desc: 'personal data being processed about you;' },
                                        { right: 'Correct or rectify', desc: 'inaccurate or incomplete personal data;' },
                                        { right: 'Object', desc: 'to certain processing activities where permitted by law;' },
                                        { right: 'Withdraw consent', desc: 'where processing is based on consent;' },
                                        { right: 'Request erasure or blocking', desc: 'of personal data where legally applicable;' },
                                        { right: 'Request data portability', desc: 'where applicable under NPC rules; and' },
                                        { right: 'File a complaint', desc: 'with the National Privacy Commission if you believe your data privacy rights have been violated.' }
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 text-xs font-bold">
                                                ✓
                                            </div>
                                            <div className="text-xs leading-5">
                                                <strong className="font-bold text-slate-900 dark:text-white block text-sm">{item.right}</strong>
                                                <span className="text-slate-600 dark:text-slate-300">{item.desc}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                    You may also have the right to seek compensation for damages resulting from unlawful or unauthorized processing, subject to applicable law.
                                </p>
                            </section>

                            {/* 08 — Changes to This Privacy Notice */}
                            <section id="section-updates" className="scroll-mt-24 rounded-3xl border border-white/70 bg-white/90 p-6 shadow-xl shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:bg-slate-900/90 sm:p-8">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300">
                                            <FileText className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-600 dark:text-purple-400">Section 08</span>
                                            <h2 className="text-xl font-black text-slate-950 dark:text-white sm:text-2xl">Changes to This Privacy Notice</h2>
                                        </div>
                                    </div>
                                </div>

                                <div className="my-5 flex items-start gap-3 rounded-2xl border border-purple-200/70 bg-purple-50/60 p-4 text-xs leading-relaxed text-purple-950 dark:border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-100">
                                    <FileText className="h-4 w-4 shrink-0 text-purple-600 dark:text-purple-400 mt-0.5" />
                                    <div>
                                        <strong className="font-bold">Quick Takeaway: </strong>
                                        {SECTIONS[7].takeaway}
                                    </div>
                                </div>

                                <div className="space-y-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                    <p>
                                        We may update this Privacy Notice when our services, systems, processing activities, or applicable privacy requirements change.
                                    </p>
                                    <p>
                                        The latest version and its effective or last-updated date will be displayed on this page. Where required, we will provide additional notice regarding material changes to our processing activities.
                                    </p>
                                </div>

                                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-[10px]">Document Version</span>
                                        <span className="font-bold text-slate-900 dark:text-white">Privacy Notice version {POLICY_VERSION}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider block text-[10px]">Effective Date</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{LAST_UPDATED}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="mt-14 border-t border-slate-200/80 pt-8 pb-10 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400 flex flex-col items-center gap-4">
                        <p className="font-bold uppercase tracking-wider">2026 NORSU-G CARE Center Management System</p>
                        <div className="flex flex-wrap items-center justify-center gap-4">
                            <Link
                                to="/"
                                className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:border-slate-400 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                                Back to home
                            </Link>
                            <button
                                type="button"
                                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                                ↑ Top of page
                            </button>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
