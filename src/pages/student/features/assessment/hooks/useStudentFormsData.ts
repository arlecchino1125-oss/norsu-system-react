import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveFormsPage, getCompletedFormIds } from '../../../../../services/studentPortalService';

interface UseStudentFormsDataArgs {
    studentId: string;
}

export const useStudentFormsData = ({
    studentId
}: UseStudentFormsDataArgs) => {
    // ponytail: React Query manages cache key studentId, caching it globally so tab navigation is instant.
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['student_forms_data', studentId],
        queryFn: async () => {
            const formsResult = await getActiveFormsPage({ page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            let formIds: any[] = [];
            if (studentId) {
                formIds = await getCompletedFormIds(studentId);
            }
            return {
                rows: formsResult.rows || [],
                completedSet: new Set(formIds)
            };
        },
        staleTime: 2 * 60 * 1000
    });

    const refreshForms = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return {
        formsList: data?.rows ?? [],
        completedForms: data?.completedSet ?? new Set(),
        loadingForm: isLoading,
        refreshForms
    };
};


