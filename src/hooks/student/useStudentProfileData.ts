import { useCallback } from 'react';
import {
    getActiveOfficeVisit,
    getOfficeVisitReasons,
    getStudentNotificationsPage
} from '../../services/studentPortalService';

interface UseStudentProfileDataArgs {
    studentId: string;
    setActiveVisit: (visit: any) => void;
    setVisitReasons: (rows: any[]) => void;
    setNotifications: (rows: any[]) => void;
}

export const useStudentProfileData = ({
    studentId,
    setActiveVisit,
    setVisitReasons,
    setNotifications
}: UseStudentProfileDataArgs) => {
    const refreshActiveVisit = useCallback(async () => {
        if (!studentId) {
            setActiveVisit(null);
            return;
        }
        const data = await getActiveOfficeVisit(studentId);
        setActiveVisit(data || null);
    }, [studentId, setActiveVisit]);

    const refreshVisitReasons = useCallback(async () => {
        const data = await getOfficeVisitReasons();
        setVisitReasons(data || []);
    }, [setVisitReasons]);

    const refreshNotifications = useCallback(async () => {
        if (!studentId) {
            setNotifications([]);
            return;
        }
        const result = await getStudentNotificationsPage(studentId, { page: 1, pageSize: 5 }, { column: 'created_at', ascending: false });
        setNotifications(result.rows || []);
    }, [studentId, setNotifications]);

    return {
        refreshActiveVisit,
        refreshVisitReasons,
        refreshNotifications
    };
};

