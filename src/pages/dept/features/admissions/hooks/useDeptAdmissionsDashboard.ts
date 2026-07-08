import { useCallback, useEffect, useState } from 'react';
import { getDepartmentApplicationsPage, getDepartmentInterviewQueue } from '../../../../../services/deptService';
import { READY_FOR_INTERVIEW_STATUSES } from '../../../utils';

const getLocalDateKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export function useDeptAdmissionsDashboard(data: any) {
    const [interviewQueueDate, setInterviewQueueDate] = useState<string>(() => getLocalDateKey());
    const [interviewQueueRows, setInterviewQueueRows] = useState<any[]>([]);
    const [isInterviewQueueLoading, setIsInterviewQueueLoading] = useState(false);
    const [interviewQueueError, setInterviewQueueError] = useState<string | null>(null);

    const [admissionsDashboardCounts, setAdmissionsDashboardCounts] = useState({ readyForInterview: 0, scheduled: 0, approved: 0, unsuccessful: 0, absent: 0 });

    const refreshInterviewQueue = useCallback(async () => {
        const departmentName = String(data?.profile?.department || '').trim();
        if (!departmentName) return;

        setIsInterviewQueueLoading(true);
        setInterviewQueueError(null);
        try {
            const rows = await getDepartmentInterviewQueue(departmentName, interviewQueueDate);
            setInterviewQueueRows(rows);
        } catch (error: any) {
            setInterviewQueueError('Failed to load interview queue.');
        } finally {
            setIsInterviewQueueLoading(false);
        }
    }, [data?.profile?.department, interviewQueueDate]);

    const refreshAdmissionsDashboardCounts = useCallback(async () => {
        const departmentName = String(data?.profile?.department || '').trim();
        if (!departmentName) return;

        try {
            const [
                readyResult,
                scheduledResult,
                approvedResult,
                unsuccessfulResult,
                scheduledRowsResult
            ] = await Promise.all([
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: READY_FOR_INTERVIEW_STATUSES },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Interview Scheduled'] },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Approved for Enrollment'] },
                    { page: 1, pageSize: 1 }
                ),
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Application Unsuccessful'] },
                    { page: 1, pageSize: 1 }
                ),
                // ponytail: absent has no server filter — count within the first 200 scheduled interviews
                getDepartmentApplicationsPage(
                    departmentName,
                    { status: ['Interview Scheduled'] },
                    { page: 1, pageSize: 200 }
                )
            ]);

            setAdmissionsDashboardCounts({
                readyForInterview: Number(readyResult?.total || 0),
                scheduled: Number(scheduledResult?.total || 0),
                approved: Number(approvedResult?.total || 0),
                unsuccessful: Number(unsuccessfulResult?.total || 0),
                absent: (scheduledRowsResult?.rows || []).filter((row: any) =>
                    String(row?.interview_queue_status || '').trim() === 'Absent'
                ).length
            });
        } catch (error) {
            console.error('Failed to load department admissions dashboard counts:', error);
        }
    }, [data?.profile?.department]);

    // Load on mount / department change; the queue also refetches when its date changes
    useEffect(() => {
        void refreshAdmissionsDashboardCounts();
    }, [refreshAdmissionsDashboardCounts]);

    useEffect(() => {
        void refreshInterviewQueue();
    }, [refreshInterviewQueue]);

    return {
        interviewQueueDate,
        setInterviewQueueDate,
        interviewQueueRows,
        setInterviewQueueRows,
        isInterviewQueueLoading,
        interviewQueueError,
        admissionsDashboardCounts,
        refreshInterviewQueue,
        refreshAdmissionsDashboardCounts
    };
}
