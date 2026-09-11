import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, MapPin, ClipboardCheck, CheckCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { formatDate } from '../../../../../utils/formatters';
import StudentEvaluationModal from '../../events/components/StudentEvaluationModal';
import { getPublicPeerEvents, type PublicPeerEvent } from '../../../../public/features/events/publicEventsService';

interface PeerEventsSectionProps {
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
}

export default function PeerEventsSection({
    personalInfo,
    showToast
}: PeerEventsSectionProps) {
    const queryClient = useQueryClient();
    const studentId = personalInfo?.studentId;

    const [evaluatingEvent, setEvaluatingEvent] = useState<{ id: number; title: string } | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // 1. Fetch Peer Events
    const {
        data: events = [],
        isLoading,
        refetch
    } = useQuery({
        queryKey: ['student-peer-events', studentId],
        queryFn: () => getPublicPeerEvents(studentId),
        enabled: Boolean(studentId)
    });

    // Time In Mutation
    const handleTimeIn = async (eventId: number) => {
        setActionLoadingId(eventId);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase.from('event_attendance').insert({
                event_id: eventId,
                student_id: studentId,
                checked_in_at: now,
                time_in: now,
                department: personalInfo?.department || null
            });
            if (error) throw error;
            showToast('Timed in successfully for peer event!', 'success');
            await refetch();
        } catch (err: any) {
            showToast(err.message || 'Failed to time in.', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    // Time Out Mutation
    const handleTimeOut = async (eventId: number) => {
        setActionLoadingId(eventId);
        try {
            const now = new Date().toISOString();
            const { error } = await supabase
                .from('event_attendance')
                .update({ time_out: now })
                .eq('event_id', eventId)
                .eq('student_id', studentId);
            if (error) throw error;
            showToast('Timed out successfully. Thank you for your peer dedication!', 'success');
            await refetch();
        } catch (err: any) {
            showToast(err.message || 'Failed to time out.', 'error');
        } finally {
            setActionLoadingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm text-center text-xs text-slate-400 font-medium">
                Loading peer events and activities...
            </div>
        );
    }

    if (events.length === 0) {
        return null; // Don't clutter UI if there are no peer facilitator events
    }

    return (
        <section className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            Dedicated
                        </span>
                        <h3 className="text-base font-black text-slate-900">Peer Facilitator Events &amp; Evaluations</h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Activities organized specifically for CARE Peer Facilitators. Time in, time out, and evaluate completed sessions.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {events.map((event: PublicPeerEvent) => {
                    const isTimedIn = Boolean(event.time_in && !event.time_out);
                    const isCompletedAttendance = Boolean(event.time_in && event.time_out);
                    const isLoadingAction = actionLoadingId === event.id;

                    return (
                        <div
                            key={event.id}
                            className="rounded-xl border border-slate-200/80 p-4 transition hover:border-emerald-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                            <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h4 className="font-bold text-sm text-slate-900">{event.title}</h4>
                                    {isTimedIn && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                            Currently Timed In
                                        </span>
                                    )}
                                    {isCompletedAttendance && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                            <CheckCircle size={10} className="text-emerald-600" />
                                            Attendance Recorded
                                        </span>
                                    )}
                                </div>

                                {event.description && (
                                    <p className="text-xs text-slate-500 line-clamp-1">{event.description}</p>
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

                            {/* Actions on right */}
                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {/* Attendance Actions */}
                                {!event.time_in ? (
                                    <button
                                        type="button"
                                        disabled={isLoadingAction}
                                        onClick={() => handleTimeIn(event.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Clock size={13} />
                                        <span>{isLoadingAction ? 'Processing...' : 'Time In'}</span>
                                    </button>
                                ) : isTimedIn ? (
                                    <button
                                        type="button"
                                        disabled={isLoadingAction}
                                        onClick={() => handleTimeOut(event.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
                                    >
                                        <Clock size={13} />
                                        <span>{isLoadingAction ? 'Processing...' : 'Time Out'}</span>
                                    </button>
                                ) : null}

                                {/* Evaluation Action */}
                                {event.form_id && event.form_is_active && (
                                    event.has_evaluated ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-700 text-xs font-bold">
                                            <CheckCircle size={13} className="text-purple-600" />
                                            Evaluated
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setEvaluatingEvent({ id: event.id, title: event.title })}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
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

            {/* Evaluation Modal */}
            {evaluatingEvent && (
                <StudentEvaluationModal
                    open={Boolean(evaluatingEvent)}
                    eventId={evaluatingEvent.id}
                    eventTitle={evaluatingEvent.title}
                    personalInfo={personalInfo}
                    onClose={() => setEvaluatingEvent(null)}
                    onSubmitted={async () => {
                        showToast('Thank you! Your evaluation has been recorded.', 'success');
                        setEvaluatingEvent(null);
                        await refetch();
                    }}
                    showToast={showToast}
                />
            )}
        </section>
    );
}
