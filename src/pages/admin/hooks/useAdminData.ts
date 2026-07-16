import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabaseData } from '../../../hooks/useSupabaseData';
import { supabase } from '../../../lib/supabase';
import type { AdminStats } from '../types';

const STAFF_ACCOUNT_SELECT = '*';

export function useAdminData(): AdminStats & {
    refetchAccounts: () => void;
    refetchDepartments: () => void;
    refetchCourses: () => void;
    refetchStudents: () => void;
    refetchApplications: () => void;
} {
    const { data: accountRows, refetch: refetchAccounts } = useSupabaseData({
        table: 'staff_accounts',
        select: STAFF_ACCOUNT_SELECT,
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });
    const accounts = accountRows.filter((account: any) => !account?.is_archived);

    const { data: departmentRows, refetch: refetchDepartments } = useSupabaseData({
        table: 'departments',
        select: '*',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const departmentsData = departmentRows.filter((department: any) => !department?.is_archived);

    const { data: coursesData, refetch: refetchCourses } = useSupabaseData({
        table: 'courses',
        select: 'id, name, department_id',
        order: { column: 'name', ascending: true },
        subscribe: true
    });

    const { data: studentsData, refetch: refetchStudents } = useSupabaseData({
        table: 'students',
        select: 'id, student_id, first_name, last_name, status, auth_user_id',
        subscribe: true,
        fetchAll: true
    });

    // Admin only ever needs the applications count (a summary stat, not a row listing),
    // so this fetches an exact count instead of every row -- avoids the default row cap
    // that a full-row fetch would eventually hit as applications grow.
    const queryClient = useQueryClient();
    const { data: applicationsCount = 0, refetch: refetchApplications } = useQuery({
        queryKey: ['applications_count'],
        queryFn: async () => {
            const { count, error } = await supabase
                .from('applications')
                .select('id', { count: 'exact', head: true });
            if (error) throw error;
            return count || 0;
        }
    });

    // False positive: cleanup below does call supabase.removeChannel(channel) —
    // the detector doesn't recognize Supabase's client.removeChannel() cleanup
    // convention (it looks for .unsubscribe() on the subscribed object itself).
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        const channel = supabase
            .channel('admin_applications_count')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
                queryClient.invalidateQueries({ queryKey: ['applications_count'] });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const departments = departmentsData.map((d: any) => d.name);
    const linkedStudentCount = studentsData.filter((student: any) => Boolean(student.auth_user_id)).length;
    const authPendingStudentCount = studentsData.length - linkedStudentCount;
    const unlinkedStaffAccountCount = accounts.filter((account: any) => !account.auth_user_id).length;
    const staffAccountsMissingEmailCount = accounts.filter((account: any) => !String(account.email || '').trim()).length;
    const departmentHeadsMissingDepartmentCount = accounts.filter((account: any) =>
        String(account.role || '').trim() === 'Department Head'
        && !String(account.department || '').trim()
    ).length;

    const adminAlerts = [
        {
            label: 'Unlinked staff accounts',
            value: unlinkedStaffAccountCount,
            hint: unlinkedStaffAccountCount > 0 ? 'Needs auth cleanup' : 'All staff accounts are linked',
            tone: 'border-sky-200 bg-sky-50 text-sky-700'
        },
        {
            label: 'Staff accounts missing email',
            value: staffAccountsMissingEmailCount,
            hint: staffAccountsMissingEmailCount > 0 ? 'Add a valid email to complete these records' : 'Email records look complete',
            tone: 'border-amber-200 bg-amber-50 text-amber-700'
        },
        {
            label: 'Students needing auth',
            value: authPendingStudentCount,
            hint: authPendingStudentCount > 0 ? 'Student access setup is still pending' : 'Student auth setup is current',
            tone: 'border-cyan-200 bg-cyan-50 text-cyan-700'
        },
        {
            label: 'Department heads without college',
            value: departmentHeadsMissingDepartmentCount,
            hint: departmentHeadsMissingDepartmentCount > 0 ? 'College assignment required' : 'Department heads are assigned',
            tone: 'border-rose-200 bg-rose-50 text-rose-700'
        }
    ];

    return {
        accounts,
        departmentsData,
        coursesData,
        studentsData,
        applicationsCount,
        departments,
        linkedStudentCount,
        authPendingStudentCount,
        unlinkedStaffAccountCount,
        staffAccountsMissingEmailCount,
        departmentHeadsMissingDepartmentCount,
        adminAlerts,
        refetchAccounts,
        refetchDepartments,
        refetchCourses,
        refetchStudents,
        refetchApplications
    };
}
