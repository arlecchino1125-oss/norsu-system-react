import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartHandshake, Download, Send, Clock, BookOpen, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { toTitleCase } from '../../../../../utils/formatters';
import {
    getPublicPeerAttendance,
    submitPublicPeerTimeIn,
    submitPublicPeerTimeOut,
    getPublicPeerLogbook,
    savePublicPeerLogEntry,
    deletePublicPeerLogEntry,
    submitPublicPeerLogbook,
    searchPublicStudentsForPeer,
    type PublicStudent
} from '../publicEventsService';

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

    const [activeTab, setActiveTab] = useState<'hours' | 'peer_support' | 'care_activities'>('hours');
    const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));

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
        <div className="mx-auto max-w-4xl space-y-5 page-transition">
            {/* 1. Header Banner */}
            <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-5 shadow-sm sm:p-6 backdrop-blur-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                            <HeartHandshake size={16} />
                        </span>
                        <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                            Active Peer Facilitator
                        </span>
                        {peerBadgeYear && (
                            <span className="text-[11px] font-black uppercase tracking-[0.12em] text-emerald-700">
                                {peerBadgeYear}
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                        ID: <span className="font-mono text-slate-700">{studentId}</span>
                    </span>
                </div>

                <h2 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">
                    {peerName}
                </h2>
                <p className="text-xs font-semibold text-slate-500">
                    {programYearSection}
                </p>
                <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-600">
                    Your volunteer hours and submitted monthly logbooks are synchronized in real-time with the CARE Center office.
                </p>
            </section>

            {/* 2. Navigation Tabs */}
            <div className="flex rounded-2xl bg-slate-200/80 p-1 text-xs font-bold text-slate-600">
                <button
                    type="button"
                    onClick={() => setActiveTab('hours')}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
                        activeTab === 'hours'
                            ? 'bg-white text-emerald-700 shadow-sm font-black'
                            : 'hover:text-slate-900'
                    }`}
                >
                    <Clock size={15} />
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
        </div>
    );
}
