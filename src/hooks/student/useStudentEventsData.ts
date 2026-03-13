import { useCallback } from 'react';
import { getEventsPage } from '../../services/studentPortalService';

interface UseStudentEventsDataArgs {
    setEventsList: (rows: any[]) => void;
}

/**
 * Returns true if the event's date (and optional end_time) have passed.
 */
function isEventExpired(event: any): boolean {
    if (!event.event_date) return false;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (event.event_date < todayStr) return true;
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

export const useStudentEventsData = ({ setEventsList }: UseStudentEventsDataArgs) => {
    const refreshEvents = useCallback(async () => {
        try {
            const result = await getEventsPage({ page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            // Filter out expired/archived events — students only see active ones
            const activeEvents = (result.rows || []).filter((ev: any) => !isEventExpired(ev));
            setEventsList(activeEvents);
        } catch (error) {
            console.error('Failed to load student events.', error);
            setEventsList([]);
        }
    }, [setEventsList]);

    return { refreshEvents };
};
