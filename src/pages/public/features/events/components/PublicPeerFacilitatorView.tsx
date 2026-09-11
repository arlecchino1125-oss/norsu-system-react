import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartHandshake, Download, Send, Clock, BookOpen, Calendar, ChevronLeft, ChevronRight, ClipboardCheck, MapPin, CheckCircle } from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import CareActivitiesLogbookMonth from '../../../../../components/careActivitiesLogbook/CareActivitiesLogbookMonth';
import type { PeerLogEntry, PeerLogEntryDraft } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import type { CareActivityLogEntry, CareActivityLogEntryDraft } from '../../../../../utils/careActivitiesLogbook';
import { formatHours, totalHours } from '../../../../../utils/volunteerHours';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { exportCareActivitiesLogbookPdf } from '../../../../../utils/careActivitiesLogbookPdf';
import {
    LOGBOOK_STATUS_TONE,
    monthKeyOf,
    monthLabelOf,
    monthStartOf,
    shouldPromptSubmit
} from '../../../../../utils/peerLogbook';
import { formatDate, toTitleCase } from '../../../../../utils/formatters';
import { supabase } from '../../../../../lib/supabase';
import {
    getPublicPeerAttendance,
    submitPublicPeerTimeIn,
    submitPublicPeerTimeOut,
    getPublicPeerLogbook,
    savePublicPeerLogEntry,
    deletePublicPeerLogEntry,
    submitPublicPeerLogbook,
    searchPublicStudentsForPeer,
    timeInPublicEvent,
    timeOutPublicEvent,
    getPublicPeerEvents,
    type PublicPeerEvent,
    type PublicStudent
} from '../publicEventsService';
import PublicEvaluationModal from './PublicEvaluationModal';

interface PublicPeerFacilitatorViewProps {
    identity: { student: PublicStudent };
    onRequireSignIn: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
}

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatSessionDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

export default function PublicPeerFacilitatorView({
    identity,
    onRequireSignIn,
    showToast
}: PublicPeerFacilitatorViewProps) {
    const queryClient = useQueryClient();
    const studentId = identity.student.student_id;

    const [activeTab, setActiveTab] = useState<'hours' | 'peer_support' | 'care_activities' | 'events_evaluations'>('hours');
    const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));
    const [evaluatingEvent, setEvaluatingEvent] = useState<{ id: number; title: string } | null>(null);
    const [eventActionLoadingId, setEventActionLoadingId] = useState<number | null>(null);

    // 0. Peer Facilitator Events Query
    const {
        data: peerEvents = [],
        isLoading: isPeerEventsLoading,
        refetch: refetchPeerEvents
    } = useQuery({
        queryKey: ['public-peer-events', studentId],
        queryFn: () => getPublicPeerEvents(studentId),
        enabled: Boolean(studentId)
    });

    const handlePeerEventTimeIn = async (eventId: number) => {
        setEventActionLoadingId(eventId);
        try {
            const res = await timeInPublicEvent(eventId, studentId, true);
            showToast(res.message || 'Timed in successfully!', 'success');
            await refetchPeerEvents();
        } catch (err: any) {
            showToast(err.message || 'Failed to time in.', 'error');
        } finally {
            setEventActionLoadingId(null);
        }
    };

    const handlePeerEventTimeOut = async (eventId: number) => {
        setEventActionLoadingId(eventId);
        try {
            const res = await timeOutPublicEvent(eventId, studentId);
            showToast(res.message || 'Timed out successfully!', 'success');
            await refetchPeerEvents();
        } catch (err: any) {
            showToast(err.message || 'Failed to time out.', 'error');
        } finally {
            setEventActionLoadingId(null);
        }
    };

    // 1. Volunteer Hours Attendance Query
    const {
        data: attendanceData,
        isLoading: isAttendanceLoading,
        isError: isAttendanceError,
        refetch: refetchAttendance
    } = useQuery({
        queryKey: ['public-peer-attendance', studentId],
        queryFn: () => getPublicPeerAttendance(studentId),
        staleTime: 10000,
        enabled: Boolean(studentId)
    });

    const peerName = toTitleCase([attendanceData?.first_name || identity.student.first_name, attendanceData?.last_name || identity.student.last_name].filter(Boolean).join(' ')) || 'CARE Peer Facilitator';
    const programYearSection = [attendanceData?.course || identity.student.course, attendanceData?.year_level || identity.student.year_level, attendanceData?.section || identity.student.section].filter(Boolean).join(' / ') || 'NORSU Student';
    const peerBadgeYear = attendanceData?.peer_year || identity.student.peer_year || 'Active';

    const sessions = attendanceData?.sessions || [];
    const openSession = attendanceData?.open_session || null;
    const timeInEnabled = attendanceData?.time_in_enabled ?? true;

    // 2. Time In Mutation
    const timeInMutation = useMutation({
        mutationFn: () => submitPublicPeerTimeIn(studentId),
        onSuccess: (res: any) => {
            showToast(res.message || 'Timed in. Your volunteer hours are now running.', 'success');
            void refetchAttendance();
        },
        onError: (err: any) => {
            showToast(err.message || 'Unable to time in. Please try again.', 'error');
            void refetchAttendance();
        }
    });

    // 3. Time Out Mutation
    const timeOutMutation = useMutation({
        mutationFn: () => submitPublicPeerTimeOut(studentId),
        onSuccess: (res: any) => {
            showToast(res.message || 'Timed out. Thank you for volunteering!', 'success');
            void refetchAttendance();
        },
        onError: (err: any) => {
            showToast(err.message || 'Unable to time out. Please try again.', 'error');
            void refetchAttendance();
        }
    });

    // 4. Peer Support Logbook Query
    const peerBookQueryKey = ['public-peer-support-logbook', studentId, monthKey];
    const {
        data: peerLogbookData,
        isLoading: isPeerBookLoading,
        refetch: refetchPeerLogbook
    } = useQuery({
        queryKey: peerBookQueryKey,
        queryFn: () => getPublicPeerLogbook(studentId, 'peer_support', monthStartOf(monthKey)),
        staleTime: 30000,
        enabled: activeTab === 'peer_support' && Boolean(studentId)
    });

    const peerLogbook = peerLogbookData?.logbook || null;
    const peerEntries = (peerLogbookData?.entries || []) as PeerLogEntry[];
    const peerStatus = peerLogbook?.status || 'draft';
    const isPeerBookLocked = peerStatus !== 'draft';

    // 5. CARE Activities Logbook Query
    const careBookQueryKey = ['public-care-activities-logbook', studentId, monthKey];
    const {
        data: careLogbookData,
        isLoading: isCareBookLoading,
        refetch: refetchCareLogbook
    } = useQuery({
        queryKey: careBookQueryKey,
        queryFn: () => getPublicPeerLogbook(studentId, 'care_activities', monthStartOf(monthKey)),
        staleTime: 30000,
        enabled: activeTab === 'care_activities' && Boolean(studentId)
    });

    const careLogbook = careLogbookData?.logbook || null;
    const careEntries = (careLogbookData?.entries || []) as CareActivityLogEntry[];
    const careStatus = careLogbook?.status || 'draft';
    const isCareBookLocked = careStatus !== 'draft';

    // Month Navigation Helpers
    const changeMonth = (offset: number) => {
        const [y, m] = monthKey.split('-').map(Number);
        const nextDate = new Date(y, m - 1 + offset, 1);
        setMonthKey(monthKeyOf(nextDate));
    };

    // Peer Support Logbook Actions
    const handleSavePeerEntry = async (draft: PeerLogEntryDraft, entryId: string | null) => {
        try {
            await savePublicPeerLogEntry(studentId, 'peer_support', monthStartOf(monthKey), entryId, draft);
            showToast(entryId ? 'Log entry updated.' : 'Log entry added.', 'success');
            await refetchPeerLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to save entry.', 'error');
            throw err;
        }
    };

    const handleDeletePeerEntry = async (entryId: string) => {
        try {
            await deletePublicPeerLogEntry(studentId, 'peer_support', entryId);
            showToast('Log entry removed.', 'success');
            await refetchPeerLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete entry.', 'error');
            throw err;
        }
    };

    const handleSubmitPeerLogbook = async () => {
        if (!shouldPromptSubmit(new Date(), peerStatus)) {
            const confirmed = window.confirm(
                'This month has not ended yet. Once submitted, you cannot add or edit entries for this month unless Care Staff unlocks it. Proceed?'
            );
            if (!confirmed) return;
        } else {
            const confirmed = window.confirm('Submit this month’s peer support logbook for CARE review?');
            if (!confirmed) return;
        }

        try {
            await submitPublicPeerLogbook(studentId, 'peer_support', monthStartOf(monthKey));
            showToast('Peer logbook submitted for review.', 'success');
            await refetchPeerLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to submit logbook.', 'error');
        }
    };

    const handleExportPeerPdf = async () => {
        try {
            await exportLogbookPdf({
                peerName,
                programYearSection,
                monthKey,
                entries: peerEntries
            });
            showToast('PDF downloaded.', 'success');
        } catch {
            showToast('Failed to export PDF.', 'error');
        }
    };

    // CARE Activities Logbook Actions
    const handleSaveCareEntry = async (draft: CareActivityLogEntryDraft, entryId: string | null) => {
        try {
            await savePublicPeerLogEntry(studentId, 'care_activities', monthStartOf(monthKey), entryId, draft);
            showToast(entryId ? 'Activity updated.' : 'Activity added.', 'success');
            await refetchCareLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to save activity.', 'error');
            throw err;
        }
    };

    const handleDeleteCareEntry = async (entryId: string) => {
        try {
            await deletePublicPeerLogEntry(studentId, 'care_activities', entryId);
            showToast('Activity removed.', 'success');
            await refetchCareLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to delete activity.', 'error');
            throw err;
        }
    };

    const handleSubmitCareLogbook = async () => {
        if (!shouldPromptSubmit(new Date(), careStatus)) {
            const confirmed = window.confirm(
                'This month has not ended yet. Once submitted, you cannot add or edit activities for this month unless Care Staff unlocks it. Proceed?'
            );
            if (!confirmed) return;
        } else {
            const confirmed = window.confirm('Submit this month’s CARE activities logbook for review?');
            if (!confirmed) return;
        }

        try {
            await submitPublicPeerLogbook(studentId, 'care_activities', monthStartOf(monthKey));
            showToast('CARE activities logbook submitted for review.', 'success');
            await refetchCareLogbook();
        } catch (err: any) {
            showToast(err.message || 'Failed to submit logbook.', 'error');
        }
    };

    const handleExportCarePdf = async () => {
        try {
            await exportCareActivitiesLogbookPdf({
                peerName,
                programYearSection,
                monthKey,
                entries: careEntries
            });
            showToast('PDF downloaded.', 'success');
        } catch {
            showToast('Failed to export PDF.', 'error');
        }
    };

    return (
        <div className="mx-auto max-w-4xl px-3.5 pt-3.5 pb-12 space-y-3.5 sm:px-4 sm:pt-5 sm:pb-16 sm:space-y-5 page-transition">
            {/* 1. Header Banner */}
            <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-4 shadow-sm sm:rounded-3xl sm:p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-600 text-white shadow-sm">
                            <HeartHandshake size={14} className="sm:w-4 sm:h-4" />
                        </span>
                        <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white sm:px-3 sm:text-[10px]">
                            Active Peer Facilitator
                        </span>
                        {peerBadgeYear && (
                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 sm:text-[11px]">
                                {peerBadgeYear}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 sm:text-[11px]">
                        ID: <span className="font-mono text-slate-700">{studentId}</span>
                    </span>
                </div>

                <h2 className="mt-1.5 text-lg font-black text-slate-900 sm:mt-2 sm:text-2xl">
                    {peerName}
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                    {programYearSection}
                </p>
                <p className="mt-1.5 max-w-xl text-[11px] leading-relaxed text-slate-600 sm:mt-2 sm:text-xs">
                    Your volunteer hours and submitted monthly logbooks are synchronized in real-time with the CARE Center office.
                </p>
            </section>

            {/* 2. Navigation Tabs */}
            <div className="flex rounded-xl bg-slate-200/80 p-1 text-[11px] font-bold text-slate-600 sm:rounded-2xl sm:text-xs">
                <button
                    type="button"
                    onClick={() => setActiveTab('hours')}
                    className={`flex flex-1 items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 transition-all sm:rounded-xl sm:py-2.5 ${
                        activeTab === 'hours'
                            ? 'bg-white text-emerald-700 shadow-sm font-black'
                            : 'hover:text-slate-900'
                    }`}
                >
                    <Clock size={14} />
                    <span>Volunteer Hours</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('peer_support')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
                        activeTab === 'peer_support'
                            ? 'bg-white text-emerald-700 shadow-sm font-black'
                            : 'hover:text-slate-900'
                    }`}
                >
                    <BookOpen size={15} />
                    <span>Peer Support Logs</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('care_activities')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
                        activeTab === 'care_activities'
                            ? 'bg-white text-emerald-700 shadow-sm font-black'
                            : 'hover:text-slate-900'
                    }`}
                >
                    <Calendar size={15} />
                    <span>CARE Activities</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('events_evaluations')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
                        activeTab === 'events_evaluations'
                            ? 'bg-white text-emerald-700 shadow-sm font-black'
                            : 'hover:text-slate-900'
                    }`}
                >
                    <ClipboardCheck size={15} />
                    <span>Events &amp; Evaluations</span>
                </button>
            </div>

            {/* 3. Tab Content: Volunteer Hours */}
            {activeTab === 'hours' && (
                <section className="space-y-4 animate-fade-in">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Volunteer Time Log</p>
                                <h3 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">
                                    Total Logged: <span className="text-emerald-700">{formatHours(totalHours(sessions))}</span>
                                </h3>
                                <p className="mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500">
                                    {openSession ? (
                                        <>
                                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-emerald-700 font-bold">Currently Timed In ({formatClock(openSession.time_in)})</span>
                                        </>
                                    ) : (
                                        <span>Not timed in right now</span>
                                    )}
                                </p>
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                                {openSession ? (
                                    <Button
                                        variant="danger"
                                        size="lg"
                                        disabled={timeOutMutation.isPending}
                                        onClick={() => timeOutMutation.mutate()}
                                        className="w-full sm:w-auto shadow-md btn-press"
                                    >
                                        {timeOutMutation.isPending ? 'Timing out...' : 'Time Out'}
                                    </Button>
                                ) : timeInEnabled ? (
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        disabled={timeInMutation.isPending}
                                        onClick={() => timeInMutation.mutate()}
                                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 shadow-md btn-press"
                                    >
                                        {timeInMutation.isPending ? 'Timing in...' : 'Time In'}
                                    </Button>
                                ) : (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
                                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Paused</p>
                                        <p className="text-xs font-semibold text-amber-700">Hours logging is currently off.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Session History */}
                        <div className="mt-5 border-t border-slate-100 pt-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 mb-3">
                                Recent Sessions ({sessions.length})
                            </p>

                            {isAttendanceLoading ? (
                                <p className="py-6 text-center text-xs font-semibold text-slate-400">Loading hours history...</p>
                            ) : isAttendanceError ? (
                                <p className="py-6 text-center text-xs font-semibold text-rose-500">Unable to load hours.</p>
                            ) : sessions.length === 0 ? (
                                <p className="py-6 text-center text-xs font-semibold text-slate-400">No volunteer sessions logged yet.</p>
                            ) : (
                                <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                                    {sessions.slice(0, 15).map((s) => (
                                        <li key={s.id} className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-slate-50">
                                            <div>
                                                <p className="font-bold text-slate-800">{formatSessionDate(s.time_in)}</p>
                                                <p className="text-slate-400 text-[11px]">
                                                    {formatClock(s.time_in)} – {s.time_out ? formatClock(s.time_out) : 'Ongoing'}
                                                </p>
                                            </div>
                                            <span className={`font-black ${s.time_out ? 'text-slate-700' : 'text-emerald-600 animate-pulse'}`}>
                                                {s.time_out ? formatHours(totalHours([s])) : 'Running...'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* 4. Tab Content: Peer Support Logbook */}
            {activeTab === 'peer_support' && (
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 space-y-4 animate-fade-in">
                    {/* Month Picker & Status Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="Previous Month"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="font-black text-slate-900 text-sm sm:text-base min-w-[140px] text-center">
                                {monthLabelOf(monthKey)}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="Next Month"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${LOGBOOK_STATUS_TONE[peerStatus] || LOGBOOK_STATUS_TONE.draft}`}>
                                {peerStatus}
                            </span>

                            {peerEntries.length > 0 && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleExportPeerPdf}
                                        leftIcon={<Download size={14} />}
                                    >
                                        PDF
                                    </Button>

                                    {!isPeerBookLocked && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSubmitPeerLogbook}
                                            leftIcon={<Send size={14} />}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            Submit Month
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {isPeerBookLocked && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-semibold text-blue-800">
                            This month’s peer support logbook is submitted for review and locked from direct edits.
                        </div>
                    )}

                    {/* Month's Entries List & Modal */}
                    <PeerLogbookMonth
                        entries={peerEntries}
                        monthKey={monthKey}
                        readOnly={isPeerBookLocked}
                        isSaving={false}
                        isLoading={isPeerBookLoading}
                        onSaveEntry={handleSavePeerEntry}
                        onDeleteEntry={handleDeletePeerEntry}
                        searchStudentsFn={(term) => searchPublicStudentsForPeer(studentId, term)}
                    />
                </section>
            )}

            {/* 5. Tab Content: CARE Activities Logbook */}
            {activeTab === 'care_activities' && (
                <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 space-y-4 animate-fade-in">
                    {/* Month Picker & Status Controls */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => changeMonth(-1)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="Previous Month"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <span className="font-black text-slate-900 text-sm sm:text-base min-w-[140px] text-center">
                                {monthLabelOf(monthKey)}
                            </span>
                            <button
                                type="button"
                                onClick={() => changeMonth(1)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                                title="Next Month"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${LOGBOOK_STATUS_TONE[careStatus] || LOGBOOK_STATUS_TONE.draft}`}>
                                {careStatus}
                            </span>

                            {careEntries.length > 0 && (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleExportCarePdf}
                                        leftIcon={<Download size={14} />}
                                    >
                                        PDF
                                    </Button>

                                    {!isCareBookLocked && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSubmitCareLogbook}
                                            leftIcon={<Send size={14} />}
                                            className="bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            Submit Month
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {isCareBookLocked && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-semibold text-blue-800">
                            This month’s CARE activities logbook is submitted for review and locked from direct edits.
                        </div>
                    )}

                    {/* Month's Activities List & Modal */}
                    <CareActivitiesLogbookMonth
                        entries={careEntries}
                        monthKey={monthKey}
                        readOnly={isCareBookLocked}
                        isSaving={false}
                        isLoading={isCareBookLoading}
                        onSaveEntry={handleSaveCareEntry}
                        onDeleteEntry={handleDeleteCareEntry}
                    />
                </section>
            )}

            {/* 6. Tab Content: Peer Events & Evaluations */}
            {activeTab === 'events_evaluations' && (
                <section className="space-y-4 animate-fade-in">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Activities &amp; Evaluations</p>
                                <h3 className="mt-1 text-lg font-black text-slate-950 sm:text-xl">Peer Facilitator Dedicated Events</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Record your attendance for peer-specific trainings or seminars, and complete the evaluation form.
                                </p>
                            </div>
                        </div>

                        {isPeerEventsLoading ? (
                            <div className="py-12 text-center text-xs text-slate-400 font-medium">
                                Loading peer facilitator events...
                            </div>
                        ) : peerEvents.length === 0 ? (
                            <div className="py-12 text-center">
                                <ClipboardCheck size={36} className="mx-auto text-slate-300 mb-2" />
                                <h4 className="text-sm font-bold text-slate-700">No Peer Events Scheduled</h4>
                                <p className="text-xs text-slate-400 mt-1">
                                    Any events organized specifically for Peer Facilitators will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {peerEvents.map((event: PublicPeerEvent) => {
                                    const isTimedIn = Boolean(event.time_in && !event.time_out);
                                    const isCompletedAttendance = Boolean(event.time_in && event.time_out);
                                    const isActionLoading = eventActionLoadingId === event.id;

                                    return (
                                        <div
                                            key={event.id}
                                            className="rounded-2xl border border-slate-200/80 p-4 sm:p-5 transition hover:border-emerald-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                        >
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-bold text-sm text-slate-900">{event.title}</h4>
                                                    {isTimedIn && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                            Timed In
                                                        </span>
                                                    )}
                                                    {isCompletedAttendance && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                                            <CheckCircle size={10} className="text-emerald-600" />
                                                            Attendance Completed
                                                        </span>
                                                    )}
                                                </div>

                                                {event.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2">{event.description}</p>
                                                )}

                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        {formatDate(event.event_date)}
                                                    </span>
                                                    {event.event_time && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <Clock size={12} className="text-slate-400" />
                                                            {event.event_time}
                                                        </span>
                                                    )}
                                                    {event.location && (
                                                        <span className="inline-flex items-center gap-1">
                                                            <MapPin size={12} className="text-slate-400" />
                                                            {event.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                {!event.time_in ? (
                                                    <button
                                                        type="button"
                                                        disabled={isActionLoading}
                                                        onClick={() => handlePeerEventTimeIn(event.id)}
                                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Clock size={13} />
                                                        <span>{isActionLoading ? 'Processing...' : 'Time In'}</span>
                                                    </button>
                                                ) : isTimedIn ? (
                                                    <button
                                                        type="button"
                                                        disabled={isActionLoading}
                                                        onClick={() => handlePeerEventTimeOut(event.id)}
                                                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                                                    >
                                                        <Clock size={13} />
                                                        <span>{isActionLoading ? 'Processing...' : 'Time Out'}</span>
                                                    </button>
                                                ) : null}

                                                {event.form_id && event.form_is_active && (
                                                    event.has_evaluated ? (
                                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold">
                                                            <CheckCircle size={13} className="text-purple-600" />
                                                            Evaluation Submitted
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => setEvaluatingEvent({ id: event.id, title: event.title })}
                                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                                                        >
                                                            <ClipboardCheck size={13} />
                                                            <span>Evaluate Event</span>
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {evaluatingEvent && (
                <PublicEvaluationModal
                    open={Boolean(evaluatingEvent)}
                    eventId={evaluatingEvent.id}
                    eventTitle={evaluatingEvent.title}
                    studentId={studentId}
                    onClose={() => setEvaluatingEvent(null)}
                    onSubmitted={() => {
                        showToast('Thank you! Your evaluation has been submitted.', 'success');
                        setEvaluatingEvent(null);
                        void refetchPeerEvents();
                    }}
                    showToast={(msg, type) => showToast(msg, type as 'success' | 'error' | undefined)}
                />
            )}
        </div>
    );
}
