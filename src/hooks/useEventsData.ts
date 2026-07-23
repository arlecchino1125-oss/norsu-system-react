import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { SystemEvent } from '../types/models';
import { useQuery } from '@tanstack/react-query';
import { isEventConcluded } from '../utils/eventWindows';

const EVENT_COLUMNS = [
    'id',
    'created_at',
    'title',
    'description',
    'event_date',
    'event_time',
    'end_time',
    'location',
    'latitude',
    'longitude',
    'type',
    'participation_mode',
    'audience_type',
    'audience_departments',
    'audience_courses',
    'audience_year_levels',
    'audience_sections',
    'attendance_required',
    'allow_walk_ins',
    'capacity',
    'registration_deadline',
    'require_photo',
    'require_geolocation',
    'is_archived',
    'archived_at'
].join(', ');

/**
 * Exported so the department portal classifies events exactly as the Care Staff
 * portal does. An event counts as concluded when the archive flag is set OR it is
 * past its 2h time-out grace (see utils/eventWindows) -- staff and students must
 * tell the same story about the same event.
 */
export function isEventArchived(event: SystemEvent): boolean {
    return isEventConcluded(event);
}

export function useEventsData() {
    const { data: qData, isLoading: loading, error: qError, refetch: fetchEvents } = useQuery({
        queryKey: ['care-staff-events-enriched'],
        queryFn: async () => {
            const { data: evs, error: fetchError } = await supabase
                .from('events')
                .select(EVENT_COLUMNS)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const eventsData = (evs || []) as any[];
            if (eventsData.length === 0) return [];

            const eventIds = eventsData
                .map((event) => event.id)
                .filter((eventId) => eventId != null);

            // Fetch aggregate data in parallel
            const [
                { data: attData, error: attErr },
                { data: fbData, error: fbErr },
                { data: regData, error: regErr }
            ] = await Promise.all([
                supabase.from('event_attendance').select('event_id').in('event_id', eventIds),
                supabase.from('event_feedback').select('event_id, rating').in('event_id', eventIds),
                supabase.from('event_registrations').select('event_id, status').in('event_id', eventIds)
            ]);

            if (attErr) throw attErr;
            if (fbErr) throw fbErr;
            if (regErr && regErr.code !== '42P01') throw regErr;

            const attendanceCounts = new Map<string, number>();
            (attData || []).forEach((attendance: any) => {
                const eventId = String(attendance.event_id);
                attendanceCounts.set(eventId, (attendanceCounts.get(eventId) || 0) + 1);
            });

            const feedbackAggregates = new Map<string, { total: number; count: number }>();
            (fbData || []).forEach((feedback: any) => {
                const eventId = String(feedback.event_id);
                const current = feedbackAggregates.get(eventId) || { total: 0, count: 0 };
                feedbackAggregates.set(eventId, {
                    total: current.total + Number(feedback.rating || 0),
                    count: current.count + 1
                });
            });

            const registrationAggregates = new Map<string, {
                registered: number;
                cancelled: number;
                attended: number;
                absent: number;
            }>();
            (regData || []).forEach((registration: any) => {
                const eventId = String(registration.event_id);
                const current = registrationAggregates.get(eventId) || {
                    registered: 0,
                    cancelled: 0,
                    attended: 0,
                    absent: 0
                };
                const status = String(registration.status || 'Registered');
                if (status === 'Cancelled') current.cancelled += 1;
                else if (status === 'Attended') current.attended += 1;
                else if (status === 'Absent') current.absent += 1;
                else current.registered += 1;
                registrationAggregates.set(eventId, current);
            });

            return eventsData.map(ev => {
                const attendanceCount = attendanceCounts.get(String(ev.id)) || 0;
                const feedbackAggregate = feedbackAggregates.get(String(ev.id));
                const registrationAggregate = registrationAggregates.get(String(ev.id)) || {
                    registered: 0,
                    cancelled: 0,
                    attended: 0,
                    absent: 0
                };
                const feedbackCount = feedbackAggregate?.count || 0;
                const avgRating = feedbackCount > 0
                    ? (feedbackAggregate!.total / feedbackCount).toFixed(1)
                    : null;

                return {
                    ...ev,
                    attendees: attendanceCount,
                    avgRating,
                    feedbackCount,
                    registeredCount: registrationAggregate.registered + registrationAggregate.attended + registrationAggregate.absent,
                    cancelledRegistrationCount: registrationAggregate.cancelled,
                    attendedRegistrationCount: registrationAggregate.attended,
                    absentRegistrationCount: registrationAggregate.absent
                };
            });
        }
    });

    const allEvents = useMemo(() => (qData as SystemEvent[]) || [], [qData]);
    const error = qError ? qError.message : null;

    // Split into active (upcoming/ongoing) and archived (expired)
    const events = useMemo(() => allEvents.filter(ev => !isEventArchived(ev)), [allEvents]);
    const archivedEvents = useMemo(() => allEvents.filter(ev => isEventArchived(ev)), [allEvents]);

    return { events, archivedEvents, allEvents, loading, error, refetchEvents: fetchEvents };
}
