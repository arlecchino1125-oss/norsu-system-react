const ADMIN_PANEL_ORDER = ['alerts', 'staffAccounts', 'studentOverview', 'governance', 'audit', 'colleges'] as const;

export type AdminPanelKey = typeof ADMIN_PANEL_ORDER[number];
const TRACKED_ADMIN_AUDIT_ROLES = ['Care Staff', 'Department Head', 'Admin', 'Registrar'] as const;
export type AuditRoleFilter = 'All' | (typeof TRACKED_ADMIN_AUDIT_ROLES)[number];

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
