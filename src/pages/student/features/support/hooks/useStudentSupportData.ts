import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStudentSupportRequestsPage } from '../../../../../services/studentPortalService';

interface UseStudentSupportDataArgs {
    studentId: string;
    setSupportRequests: (rows: any[]) => void;
}

export const useStudentSupportData = ({
    studentId,
    setSupportRequests
}: UseStudentSupportDataArgs) => {
    // ponytail: React Query manages cache key studentId, caching it globally so tab navigation is instant.
    const { data, refetch } = useQuery({
        queryKey: ['student_support_data', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const result = await getStudentSupportRequestsPage(
                studentId,
                { page: 1, pageSize: 100 },
                { column: 'created_at', ascending: false }
            );
            return result.rows || [];
        },
        enabled: Boolean(studentId),
        staleTime: 2 * 60 * 1000
    });

    useEffect(() => {
        if (!studentId) {
            setSupportRequests([]);
        } else if (data) {
            setSupportRequests(data);
        }
    }, [data, studentId, setSupportRequests]);

    const refreshSupportRequests = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return { refreshSupportRequests };
};
