export type StaffRoleKey = 'admin' | 'department' | 'careStaff';

export interface StaffLoginConfig {
    authRole: 'Admin' | 'Department Head' | 'Care Staff';
    successRedirect: string;
    successMessage: string;
    redirectDelayMs?: number;
}

export const STAFF_LOGIN_CONFIGS: Record<StaffRoleKey, StaffLoginConfig> = {
    admin: {
        authRole: 'Admin',
        successRedirect: '/admin/dashboard',
        successMessage: 'System Access Granted. Initializing...',
        redirectDelayMs: 800
    },
    department: {
        authRole: 'Department Head',
        successRedirect: '/department/dashboard',
        successMessage: 'Login Successful. Redirecting...',
        redirectDelayMs: 800
    },
    careStaff: {
        authRole: 'Care Staff',
        successRedirect: '/care-staff/dashboard',
        successMessage: 'Login Successful. Redirecting...',
        redirectDelayMs: 800
    }
};
