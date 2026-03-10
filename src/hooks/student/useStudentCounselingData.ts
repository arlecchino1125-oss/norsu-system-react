import { useCallback } from 'react';
import { getStudentCounselingRequestsPage } from '../../services/studentPortalService';

interface UseStudentCounselingDataArgs {
    studentId: string;
    setCounselingRequests: (rows: any[]) => void;
}

export const useStudentCounselingData = ({
    studentId,
    setCounselingRequests
}: UseStudentCounselingDataArgs) => {
    const refreshCounselingRequests = useCallback(async () => {
        if (!studentId) {
            setCounselingRequests([]);
            return;
        }
        const result = await getStudentCounselingRequestsPage(studentId, { page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
        setCounselingRequests(result.rows || []);
    }, [studentId, setCounselingRequests]);

    return { refreshCounselingRequests };
};

