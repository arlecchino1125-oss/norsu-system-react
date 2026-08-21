import React from 'react';

export type PublicServiceKey = 'events' | 'counseling' | 'assessment' | 'feedback';

interface PublicServiceHubProps {
    identity: { student: { student_id: string } } | null;
    onSelect: (service: PublicServiceKey) => void;
    onRequireSignIn: () => void;
    onSignOut: () => void;
}

const SERVICES: Array<{
    key: PublicServiceKey;
    title: string;
    description: string;
    idRequirement: string;
    accent: string;
    icon: string;
}> = [
    {
        key: 'events',
        title: 'Events & Attendance',
        description: 'View events, time in/out for attendance activities, rate events, and answer evaluation forms.',
        idRequirement: 'Requires Student ID',
        accent: 'blue',
        icon: '🗓️',
    },
    {
        key: 'counseling',
        title: 'Counseling Evaluation',
        description: 'Submit confidential feedback for a guidance and counseling session.',
        idRequirement: 'Requires Student ID',
        accent: 'purple',
        icon: '💬',
    },
    {
        key: 'assessment',
        title: 'Needs Assessment',
        description: 'Complete diagnostic inventory forms to help us understand your needs and provide better support.',
        idRequirement: 'Requires Student ID',
        accent: 'indigo',
        icon: '📋',
    },
    {
        key: 'feedback',
        title: 'General Feedback',
        description: 'Citizen\u2019s Charter & service quality (SQD) feedback. Open to everyone.',
        idRequirement: 'Anonymous or Student ID',
        accent: 'emerald',
        icon: '⭐',
    },
];

const ACCENT_CLASSES: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
};

export default function PublicServiceHub({ identity, onSelect, onRequireSignIn, onSignOut }: PublicServiceHubProps) {
    return (
        <div className="mx-auto max-w-4xl py-8 animate-fade-in">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-6 py-8 text-white sm:px-8">
                    <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Choose a Service</h2>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-blue-100/90 sm:text-sm">
                        Pick the service you need. Most services identify you by your Student ID alone,
                        and nothing about you is exposed unless you act.
                    </p>
                </div>

                {identity ? (
                    <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-6 py-3">
                        <p className="min-w-0 truncate text-xs font-semibold text-blue-800">
                            Signed in as <strong className="font-black text-blue-900">{identity.student.student_id}</strong>
                        </p>
                        <button
                            type="button"
                            onClick={onSignOut}
                            className="shrink-0 text-xs font-black uppercase tracking-wider text-blue-600 underline transition-colors hover:text-blue-800"
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-6 py-3">
                        <p className="min-w-0 text-xs font-semibold text-amber-800">
                            Guest browsing. Some services need your Student ID to continue.
                        </p>
                        <button
                            type="button"
                            onClick={onRequireSignIn}
                            className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-amber-600"
                        >
                            Sign In
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SERVICES.map((service) => (
                    <button
                        key={service.key}
                        type="button"
                        onClick={() => onSelect(service.key)}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ACCENT_CLASSES[service.accent]}`}>
                                <span className="text-2xl" role="img" aria-hidden="true">{service.icon}</span>
                            </div>
                            <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                {service.idRequirement}
                            </span>
                        </div>
                        <h3 className="mt-4 text-base font-black text-slate-900 group-hover:text-blue-700">{service.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{service.description}</p>
                        <div className="mt-4 inline-flex items-center gap-1 text-xs font-black text-blue-700">
                            Open
                            <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}