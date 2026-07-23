import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEventsPage } from '../../../../../services/studentPortalService';
import { isStudentEligibleForEvent } from '../../../../../utils/eventAudience';
import { isEventConcluded } from '../../../../../utils/eventWindows';

interface UseStudentEventsDataArgs {
    personalInfo?: any;
}

export const useStudentEventsData = ({ personalInfo }: UseStudentEventsDataArgs) => {
    // ponytail: React Query caches the raw query so it doesn't slam the network.
    // Local memory filtering handles the audience profile matching.
    const { data: rawEvents, refetch } = useQuery({
        queryKey: ['student_events_data_raw'],
        queryFn: async () => {
            const result = await getEventsPage({ page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            return result.rows || [];
        },
        staleTime: 2 * 60 * 1000
    });

    const eventsList = useMemo(() => {
        if (!rawEvents) return [];
        try {
            const studentAudienceProfile = {
                department: personalInfo?.department,
                course: personalInfo?.course,
                year: personalInfo?.year,
                year_level: personalInfo?.year_level,
                section: personalInfo?.section,
                status: personalInfo?.status
            };
            const activeEvents = rawEvents.filter((ev: any) => (
                !isEventConcluded(ev) && isStudentEligibleForEvent(ev, studentAudienceProfile)
            ));
            return activeEvents;
        } catch (error) {
            console.error('Failed to load student events.', error);
            return [];
        }
    }, [
        rawEvents,
        personalInfo?.course,
        personalInfo?.department,
        personalInfo?.section,
        personalInfo?.status,
        personalInfo?.year,
        personalInfo?.year_level
    ]);

    const refreshEvents = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return { eventsList, refreshEvents };
};
