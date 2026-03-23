import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Briefcase,
    FileText,
    GraduationCap,
    Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import NorsuBrand from '../components/NorsuBrand';

export default function PublicLandingV2() {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.14, delayChildren: 0.08 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 26 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring' as const, stiffness: 280, damping: 24 }
        }
    };

    const portals = [
        {
            title: 'NAT Portal',
            description: 'Apply for admission testing, review schedules, and check application progress.',
            cta: 'Apply now',
            icon: FileText,
            accent: 'orange',
            route: '/nat'
        },
        {
            title: 'Student Portal',
            description: 'Manage your profile, counseling, scholarships, support requests, and activities.',
            cta: 'Open student space',
            icon: GraduationCap,
            accent: 'blue',
            route: '/student/login'
        },
        {
            title: 'Department Portal',
            description: 'Handle approvals, admissions screening, college events, and student coordination.',
            cta: 'Open department space',
            icon: Users,
            accent: 'emerald',
            route: '/department/login'
        },
        {
            title: 'CARE Staff',
            description: 'Coordinate interventions, counseling sessions, support services, and monitoring.',
            cta: 'Open care staff space',
            icon: Briefcase,
            accent: 'purple',
            route: '/care-staff'
        }
    ] as const;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(134,239,172,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(96,165,250,0.18),_transparent_32%),linear-gradient(135deg,_#eff8f1_0%,_#f8fbff_48%,_#ffffff_100%)] px-4 py-6 text-slate-800 md:px-8">
            <div className="mx-auto max-w-7xl">
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 flex items-center justify-between rounded-full border border-white/80 bg-white/90 px-4 py-3 shadow-xl shadow-slate-200/60 backdrop-blur md:px-6"
                >
                    <NorsuBrand
                        title="NORSU-G"
                        subtitle="CARE Center Management System"
                        accent="gold"
                        size="sm"
                        className="min-w-0"
                    />
                </motion.header>

                <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="grid items-center gap-10 rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-[0_30px_80px_rgba(148,163,184,0.18)] backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-10"
                >
                    <div className="space-y-8">
                        <motion.div variants={itemVariants} className="space-y-5">
                            <h1 className="max-w-2xl text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
                                Care for students with a calmer, clearer, more connected portal experience.
                            </h1>
                            <p className="max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                                A unified digital front door for admissions support, student services, department coordination, and CARE Center operations at NORSU-G.
                            </p>
                        </motion.div>

                        <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={() => navigate('/student/login')}
                                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700"
                            >
                                Enter Student Portal
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/nat')}
                                className="inline-flex items-center gap-2 px-1 py-3 text-sm font-bold text-slate-700 transition-all hover:text-blue-600"
                            >
                                Admissions and NAT
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </motion.div>
                    </div>

                    <motion.div variants={itemVariants} className="relative">
                        <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(34,197,94,0.12),_transparent_30%)]" />
                        <div className="relative p-4 md:p-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                {portals.map((portal) => {
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
                                            className="group p-5 text-left transition-all hover:-translate-y-1"
                                        >
                                            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accentClass}`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">{portal.title}</h3>
                                            <p className="mt-2 text-sm leading-7 text-slate-600">{portal.description}</p>
                                            <div className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-900 transition-all group-hover:gap-3">
                                                {portal.cta}
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.section>

                <motion.section
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="mt-10 grid gap-6 md:grid-cols-4"
                >
                    {[
                        { title: 'Counseling', text: 'Counseling and intervention workflows' },
                        { title: 'Assessment', text: 'Student needs, follow-ups, and response tracking' },
                        { title: 'Resource', text: 'Department and staff collaboration for support actions' },
                        { title: 'Enhancement', text: 'Events, guidance, and academic coordination in one place' }
                    ].map((item) => (
                        <motion.div
                            key={item.title}
                            variants={itemVariants}
                            className="rounded-[1.8rem] border border-white/80 bg-white/80 p-6 shadow-lg shadow-slate-100"
                        >
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">{item.title}</p>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
                        </motion.div>
                    ))}
                </motion.section>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.8 }}
                    className="pb-4 pt-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"
                >
                    2026 NORSU-G CARE Center Management System
                </motion.div>
            </div>
        </div>
    );
}
