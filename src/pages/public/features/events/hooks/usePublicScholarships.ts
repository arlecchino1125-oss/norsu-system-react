import { useQuery } from '@tanstack/react-query';
import { getPublicScholarships } from '../publicEventsService';

export const usePublicScholarshipsData = (options?: { enabled?: boolean }) => {
    const {
        data: scholarshipsList = [],
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['public-scholarships'],
        queryFn: getPublicScholarships,
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: options?.enabled ?? true,
    });

    return {
        scholarshipsList,
        isLoading,
        isError,
        refreshScholarships: refetch
    };
};
