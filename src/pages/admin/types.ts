import type { TrackedStaffAuditRole } from '../../lib/staffAudit';

export type AdminPanelKey =
    | 'staff_accounts'
    | 'staffAccounts'
    | 'colleges'
    | 'student_access'
    | 'studentOverview'
    | 'audit_monitor'
    | 'audit'
    | 'governance'
    | 'alerts';

export type AuditRoleFilter = 'All' | TrackedStaffAuditRole;

export interface AdminStats {
    accounts: any[];
    departmentsData: any[];
    coursesData: any[];
    studentsData: any[];
    applicationsCount: number;
    linkedStudentCount: number;
    authPendingStudentCount: number;
    unlinkedStaffAccountCount: number;
    staffAccountsMissingEmailCount: number;
    departmentHeadsMissingDepartmentCount: number;
    adminAlerts: any[];
    departments: string[];
}
