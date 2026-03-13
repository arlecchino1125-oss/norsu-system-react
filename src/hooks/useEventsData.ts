import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { SystemEvent } from '../types/models';

/**
 * Returns true if the event's date (and optional end_time) have passed.
 * An event is "expired" when:
 *  - event_date is before today, OR
 *  - event_date is today AND end_time has passed (if set), OR
 *  - event_date is today AND no end_time is set AND the day is over (23:59)
 */
function isEventExpired(event: SystemEvent): boolean {
    if (!event.event_date) return false;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // Past date → expired
    if (event.event_date < todayStr) return true;

    // Future date → not expired
    if (event.event_date > todayStr) return false;

    // Same day — check end_time
    if (event.end_time) {
        const [h, m] = event.end_time.split(':').map(Number);
        if (now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)) {
            return true;
        }
    }

    return false;
}

export function useEventsData() {
    const [allEvents, setAllEvents] = useState<SystemEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: evs, error: fetchError } = await supabase
                .from('events')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;

            const eventsData = evs || [];
            if (eventsData.length > 0) {
                // Fetch aggregate data in parallel
                const [
                    { data: attData, error: attErr },
                    { data: fbData, error: fbErr }
                ] = await Promise.all([
                    supabase.from('event_attendance').select('event_id'),
                    supabase.from('event_feedback').select('event_id, rating')
                ]);

                if (attErr) throw attErr;
                if (fbErr) throw fbErr;

                const enrichedEvents = eventsData.map(ev => {
                    const evAtts = (attData || []).filter(a => a.event_id === ev.id);
                    const evFbs = (fbData || []).filter(f => f.event_id === ev.id);
                    const avgRating = evFbs.length > 0
                        ? (evFbs.reduce((acc, curr) => acc + curr.rating, 0) / evFbs.length).toFixed(1)
                        : null;

                    return {
                        ...ev,
                        attendees: evAtts.length,
                        avgRating,
                        feedbackCount: evFbs.length
                    };
                });

                setAllEvents(enrichedEvents);
            } else {
                setAllEvents([]);
            }
        } catch (err: any) {
            console.error("Error fetching events:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();

        // Listen to events table for real-time changes
        const eventChannel = supabase.channel('events_aggregate_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_attendance' }, () => fetchEvents())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_feedback' }, () => fetchEvents())
            .subscribe();

        return () => {
            supabase.removeChannel(eventChannel);
        };
    }, []);

    // Split into active (upcoming/ongoing) and archived (expired)
    const events = useMemo(() => allEvents.filter(ev => !isEventExpired(ev)), [allEvents]);
    const archivedEvents = useMemo(() => allEvents.filter(ev => isEventExpired(ev)), [allEvents]);

    return { events, archivedEvents, allEvents, loading, error, refetchEvents: fetchEvents };
}
