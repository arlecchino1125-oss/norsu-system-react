import { useCallback } from 'react';
import { getEventsPage } from '../../services/studentPortalService';

interface UseStudentEventsDataArgs {
    setEventsList: (rows: any[]) => void;
}

export const useStudentEventsData = ({ setEventsList }: UseStudentEventsDataArgs) => {
    const refreshEvents = useCallback(async () => {
        try {
            const result = await getEventsPage({ page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            setEventsList(result.rows || []);
        } catch (error) {
            console.error('Failed to load student events.', error);
            setEventsList([]);
        }
    }, [setEventsList]);

    return { refreshEvents };
};
