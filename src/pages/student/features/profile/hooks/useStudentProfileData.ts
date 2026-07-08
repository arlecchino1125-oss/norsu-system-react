import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    getActiveOfficeVisit,
    getOfficeVisitReasons,
    getStudentNotificationsPage
} from '../../../../../services/studentPortalService';

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
    // ponytail: Caching student visit state with React Query to suppress repeat hits on tab reload.
    const { data: activeVisit, refetch: refetchActiveVisit } = useQuery({
        queryKey: ['student_active_visit', studentId],
        queryFn: async () => {
            if (!studentId) return null;
            return (await getActiveOfficeVisit(studentId)) || null;
        },
        enabled: Boolean(studentId)
    });

    // Fixed office/visit-reason choices — reference data, cached for a day.
    // (React Query cache is in-memory, so in practice: once per page load.)
    const { data: visitReasons, refetch: refetchVisitReasons } = useQuery({
        queryKey: ['student_visit_reasons'],
        queryFn: async () => {
            return (await getOfficeVisitReasons()) || [];
        },
        staleTime: 24 * 60 * 60 * 1000
    });

    // ponytail: Limit notifications fetch to a small set, cache via React Query.
    const { data: notifications, refetch: refetchNotifications } = useQuery({
        queryKey: ['student_profile_notifications', studentId],
        queryFn: async () => {
            if (!studentId) return [];
            const result = await getStudentNotificationsPage(studentId, { page: 1, pageSize: 5 }, { column: 'created_at', ascending: false });
            return result.rows || [];
        },
        enabled: Boolean(studentId)
    });

    useEffect(() => {
        if (!studentId) {
            setActiveVisit(null);
        } else if (activeVisit !== undefined) {
            setActiveVisit(activeVisit);
        }
    }, [activeVisit, studentId, setActiveVisit]);

    useEffect(() => {
        if (visitReasons) {
            setVisitReasons(visitReasons);
        }
    }, [visitReasons, setVisitReasons]);

    useEffect(() => {
        if (!studentId) {
            setNotifications([]);
        } else if (notifications) {
            setNotifications(notifications);
        }
    }, [notifications, studentId, setNotifications]);

    const refreshActiveVisit = useCallback(async () => {
        await refetchActiveVisit();
    }, [refetchActiveVisit]);

    const refreshVisitReasons = useCallback(async () => {
        await refetchVisitReasons();
    }, [refetchVisitReasons]);

    const refreshNotifications = useCallback(async () => {
        await refetchNotifications();
    }, [refetchNotifications]);

    return {
        refreshActiveVisit,
        refreshVisitReasons,
        refreshNotifications
    };
};
