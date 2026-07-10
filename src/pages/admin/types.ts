import type { TrackedStaffAuditRole } from '../../lib/staffAudit';

const ADMIN_PANEL_ORDER = ['alerts', 'staffAccounts', 'studentOverview', 'governance', 'audit', 'colleges'] as const;

export type AdminPanelKey = typeof ADMIN_PANEL_ORDER[number];
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
