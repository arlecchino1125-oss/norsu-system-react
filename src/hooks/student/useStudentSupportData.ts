import { useCallback } from 'react';
import { getStudentSupportRequestsPage } from '../../services/studentPortalService';

interface UseStudentSupportDataArgs {
    studentId: string;
    setSupportRequests: (rows: any[]) => void;
}

export const useStudentSupportData = ({
    studentId,
    setSupportRequests
}: UseStudentSupportDataArgs) => {
    const refreshSupportRequests = useCallback(async () => {
        if (!studentId) {
            setSupportRequests([]);
            return;
        }
        try {
            const result = await getStudentSupportRequestsPage(studentId, { page: 1, pageSize: 100 }, { column: 'created_at', ascending: false });
            setSupportRequests(result.rows || []);
        } catch (error) {
            console.error('Failed to load student support requests.', error);
            setSupportRequests([]);
        }
    }, [studentId, setSupportRequests]);

    return { refreshSupportRequests };
};
