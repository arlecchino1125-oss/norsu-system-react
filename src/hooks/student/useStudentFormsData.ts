import { useCallback } from 'react';
import { getActiveFormsPage, getCompletedFormIds } from '../../services/studentPortalService';

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
    const refreshForms = useCallback(async () => {
        setLoadingForm(true);
        try {
            const formsResult = await getActiveFormsPage({ page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            setFormsList(formsResult.rows || []);

            if (studentId) {
                const formIds = await getCompletedFormIds(studentId);
                setCompletedForms(new Set(formIds));
            } else {
                setCompletedForms(new Set());
            }
        } finally {
            setLoadingForm(false);
        }
    }, [setLoadingForm, setFormsList, setCompletedForms, studentId]);

    return { refreshForms };
};

