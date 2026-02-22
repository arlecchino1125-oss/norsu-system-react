import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SystemEvent } from '../types/models';

export function useEventsData() {
    const [events, setEvents] = useState<SystemEvent[]>([]);
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

                setEvents(enrichedEvents);
            } else {
                setEvents([]);
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

    return { events, loading, error, refetchEvents: fetchEvents };
}
