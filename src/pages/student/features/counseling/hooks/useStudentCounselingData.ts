import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentCounselingRequestsPage } from '../../../../../services/studentPortalService';

interface UseStudentCounselingDataArgs {
    studentId: string;
}

export const useStudentCounselingData = ({
    studentId
}: UseStudentCounselingDataArgs) => {
    // ponytail: React Query manages cache key studentId, caching it globally so tab navigation is instant.
    const { data: counselingRequests = [], refetch } = useQuery({
        queryKey: ['student_counseling_data', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const result = await getStudentCounselingRequestsPage(
                studentId,
                { page: 1, pageSize: 100 },
                { column: 'created_at', ascending: false }
            );
            return result.rows || [];
        },
        enabled: Boolean(studentId),
        staleTime: 2 * 60 * 1000
    });

    const refreshCounselingRequests = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return { counselingRequests, refreshCounselingRequests };
};


