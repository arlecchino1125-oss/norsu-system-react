import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getActiveFormsPage, getCompletedFormIds } from '../../../../../services/studentPortalService';

interface UseStudentFormsDataArgs {
    studentId: string;
    setFormsList: (rows: any[]) => void;
    setCompletedForms: (value: Set<any>) => void;
    setLoadingForm: (value: boolean) => void;
}

export const useStudentFormsData = ({
    studentId,
    setFormsList,
    setCompletedForms,
    setLoadingForm
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

    useEffect(() => {
        setLoadingForm(isLoading);
    }, [isLoading, setLoadingForm]);

    useEffect(() => {
        if (data) {
            setFormsList(data.rows);
            setCompletedForms(data.completedSet);
        }
    }, [data, setFormsList, setCompletedForms]);

    const refreshForms = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return { refreshForms };
};


