import React, { lazy, Suspense, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import type { StudentRemainingFlatViewProps } from '../../../types';

const StudentVolunteerForm = lazy(() => import('./StudentVolunteerForm'));
const VolunteerTimeLog = lazy(() => import('./VolunteerTimeLog'));

const VolunteerGuidelines = [
    {
        title: 'Data Privacy Notice (RA 10173)',
        paragraphs: [
            "As part of NORSU G's effort in improving further its services to its stakeholders, the Campus may ask for personal information. The Campus hereby declares its commitment to the protection of privacy of its stakeholders in accordance with the Data Privacy Act of 2012 (RA 10173).",
            'We collect your personal information to register you in our orientation program for attendance purposes. The Campus shall also use the information for administrative and academic purposes and for whatever purpose deemed essential, keep all information strictly confidential, and shall not reveal to any person or entity or use any information at any time unless expressly directed by government or required by law, and with the express consent of the data subject.',
            'For further questions and/or clarifications, please coordinate with NORSU GUIHULNGAN CARE Office via Facebook at NORSU GUIHULNGAN CARE Center.'
        ]
    }
];

const getStatusTone = (status: string) => {
    if (status === 'approved') return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    if (status === 'rejected') return 'border-rose-100 bg-rose-50 text-rose-700';
    return 'border-amber-100 bg-amber-50 text-amber-700';
};

export default function VolunteerView({
    formatFullDate,
    personalInfo,
    showToast,
    Icons
}: StudentRemainingFlatViewProps) {
    const [showFormModal, setShowFormModal] = useState(false);
    const [showReadFirstGuide, setShowReadFirstGuide] = useState(false);
    const [hasReadFirstAcknowledged, setHasReadFirstAcknowledged] = useState(false);

    // Standing comes from the active-facilitator roster, never from the year --
    // that decoupling is what stops a year change from hiding a whole cohort.
    // Roster membership, the student's latest application (any year), and the
    // office toggles all load together in one cached query.
    const { data, isError, refetch } = useQuery({
        queryKey: ['student-volunteer-status', personalInfo.studentId],
        queryFn: async () => {
            const [settingsRes, rosterRes, appRes] = await Promise.all([
                supabase
                    .from('peer_facilitator_settings')
                    .select('school_year, applications_open, time_in_enabled')
                    .eq('id', 1)
                    .maybeSingle(),
                supabase
                    .from('peer_facilitators')
                    .select('peer_year')
                    .eq('student_id', personalInfo.studentId)
                    .is('archived_at', null)
                    .maybeSingle(),
                supabase
                    .from('peer_facilitator_applications')
                    .select('*')
                    .eq('student_id', personalInfo.studentId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()
            ]);
            if (settingsRes.error) throw settingsRes.error;
            if (rosterRes.error) throw rosterRes.error;
            if (appRes.error) throw appRes.error;
            return {
                schoolYear: settingsRes.data?.school_year || '',
                applicationsOpen: settingsRes.data?.applications_open ?? true,
                timeInEnabled: settingsRes.data?.time_in_enabled ?? true,
                isFacilitator: !!rosterRes.data,
                facilitatorYear: rosterRes.data?.peer_year || '',
                latestApplication: appRes.data || null
            };
        },
        staleTime: 60000
    });

    const schoolYear = data?.schoolYear || '';
    const applicationsOpen = data?.applicationsOpen ?? true;
    const timeInEnabled = data?.timeInEnabled ?? true;
    const isFacilitator = data?.isFacilitator ?? false;
    const facilitatorYear = data?.facilitatorYear || '';
    const latestApplication = data?.latestApplication || null;

    const openForm = () => setShowFormModal(true);

    const onSubmitted = useCallback(async () => {
        setShowFormModal(false);
        await refetch();
    }, [refetch]);

    // Without this the load failure looks identical to "you never applied".
    if (isError) {
        return (
            <div className="mx-auto max-w-6xl page-transition">
                <section className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4 text-center shadow-sm sm:p-5">
                    <p className="text-sm font-bold text-rose-700">Unable to load volunteer applications.</p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-rose-500 underline transition hover:text-rose-700"
                    >
                        Try again
                    </button>
                </section>
            </div>
        );
    }

    // Active facilitators lead with their standing and time log. Membership is
    // the roster, so a manually-added facilitator (no application) lands here too.
    if (isFacilitator) {
        const facilitatorBadgeYear = facilitatorYear || schoolYear;
        return (
            <div className="mx-auto max-w-6xl space-y-4 page-transition sm:space-y-5">
                <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                            Peer Facilitator
                        </span>
                        {facilitatorBadgeYear && (
                            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">{facilitatorBadgeYear}</span>
                        )}
                    </div>
                    <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                        {[personalInfo.firstName, personalInfo.lastName].filter(Boolean).join(' ') || 'CARE Peer Facilitator'}
                    </h2>
                    <p className="mt-1 max-w-xl text-sm font-semibold leading-6 text-slate-500">
                        You are an active CARE Peer Facilitator. Time in and out below whenever you dedicate your time as a peer facilitator, and your hours are recorded for the CARE Office.
                    </p>
                </section>

                <Suspense fallback={null}>
                    <VolunteerTimeLog studentId={personalInfo.studentId} showToast={showToast} timeInEnabled={timeInEnabled} />
                </Suspense>

                {latestApplication && (
                    /* ponytail: native <details>, no disclosure state to manage */
                    <details className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm sm:px-5">
                        <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-600">
                            Your application
                        </summary>
                        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Submitted</p>
                                <p className="mt-1 text-sm text-slate-700">{formatFullDate(new Date(latestApplication.created_at))}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Organizations</p>
                                <p className="mt-1 text-sm text-slate-700">{latestApplication.organizations || 'None provided'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Motivation</p>
                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{latestApplication.motivation || 'None provided'}</p>
                            </div>
                        </div>
                    </details>
                )}
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-4 page-transition sm:space-y-5">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Student Services</p>
                        <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">CARE Peer Facilitator{schoolYear ? ` ${schoolYear}` : ''}</h2>
                        <div className="mt-1 max-w-xl space-y-1.5 text-sm leading-6 text-slate-500">
                            <p>Hello students of NORSU Guihulngan. Be one of us! Join the empowered CARE Peer Facilitators of the campus. While supporting the learning of your fellow students, you are also learning about yourself.</p>
                            <p className="font-bold text-slate-600">So, ARAT NA!</p>
                        </div>
                    </div>
                </div>
            </section>

            {!latestApplication ? (applicationsOpen ? (
                <section className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-500">Read First</p>
                            <h3 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">Review the Data Privacy Notice before applying.</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowReadFirstGuide((isOpen) => !isOpen)}
                            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                            {showReadFirstGuide ? 'Hide' : 'Read'}
                        </button>
                    </div>

                    {showReadFirstGuide && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                            <div className="mt-3 space-y-2.5">
                                {VolunteerGuidelines.map((section) => (
                                    <article key={section.title} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        <h4 className="text-[12px] font-black leading-5 text-slate-950">{section.title}</h4>
                                        <div className="mt-1.5 space-y-1.5">
                                            {section.paragraphs.map((paragraph) => (
                                                <p key={paragraph} className="text-[11px] font-medium leading-5 text-slate-600">{paragraph}</p>
                                            ))}
                                        </div>
                                    </article>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={() => setHasReadFirstAcknowledged(true)}
                                className={`mt-3 flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${hasReadFirstAcknowledged ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-blue-100 bg-blue-50 text-blue-900 hover:bg-blue-100'}`}
                            >
                                <span className="min-w-0">
                                    <span className="block text-[11px] font-black leading-4">Agree — I have read the Data Privacy Notice</span>
                                </span>
                                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${hasReadFirstAcknowledged ? 'border-emerald-200 bg-emerald-500 text-white' : 'border-blue-200 bg-white text-transparent'}`}>
                                    ✓
                                </span>
                            </button>
                        </div>
                    )}

                    {hasReadFirstAcknowledged && (
                        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
                            <div className="flex items-start gap-2">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">✓</span>
                                <p className="text-[11px] font-semibold leading-5 text-blue-900">Agreement recorded. You can now apply.</p>
                            </div>
                            <button
                                type="button"
                                onClick={openForm}
                                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-500 sm:mt-0 sm:w-auto sm:shrink-0"
                            >
                                Start Application
                            </button>
                        </div>
                    )}
                </section>
            ) : (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm sm:p-5">
                    <p className="text-sm font-black text-slate-700">Applications are currently closed.</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Please check back later — the CARE Office opens the Peer Facilitator form each recruitment period.</p>
                </section>
            )) : (
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Current Status</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">Your Application</h3>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">Peer Facilitator Application</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Submitted: {formatFullDate(new Date(latestApplication.created_at))}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase ${getStatusTone(latestApplication.status)}`}>
                                {latestApplication.status}
                            </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Organizations</p>
                                <p className="mt-1 text-sm text-slate-700">{latestApplication.organizations || 'None provided'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Motivation</p>
                                <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{latestApplication.motivation || 'None provided'}</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {showFormModal && (
                <Suspense fallback={null}>
                    <StudentVolunteerForm
                        isOpen={showFormModal}
                        onClose={() => setShowFormModal(false)}
                        personalInfo={personalInfo}
                        showToast={showToast}
                        onSubmitted={onSubmitted}
                    />
                </Suspense>
            )}
        </div>
    );
}
