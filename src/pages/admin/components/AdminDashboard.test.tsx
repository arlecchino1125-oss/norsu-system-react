import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from '../../AdminDashboard';

// Mock useAuth
vi.mock('../../../lib/useAuth', () => ({
    useAuth: () => ({
        session: { user: { id: 'admin-1' } },
        isAuthenticated: true,
        logout: vi.fn()
    })
}));

// Mock useToast
vi.mock('../../../components/ui/toast/useToast', () => ({
    useToast: () => ({
        showToast: vi.fn()
    })
}));

// Mock useAdminData
vi.mock('../hooks/useAdminData', () => ({
    useAdminData: () => ({
        accounts: [
            { id: 1, full_name: 'Dr. Elena M. Magbanua', role: 'Department Head', username: 'dean.cted', email: 'elena@institution.edu.ph', department: 'CTED', auth_user_id: 'auth-1' },
            { id: 2, full_name: 'Inee R. Cañete', role: 'Care Staff', username: 'care.staff', email: 'inee@institution.edu.ph', department: null, auth_user_id: 'auth-2' },
            { id: 3, full_name: 'System Administrator', role: 'Admin', username: 'admin', email: 'admin@institution.edu.ph', department: null, auth_user_id: 'auth-3' }
        ],
        departmentsData: [
            { id: 1, name: 'College of Teacher Education' },
            { id: 2, name: 'College of Criminal Justice Education' }
        ],
        coursesData: [
            { id: 101, name: 'Bachelor of Elementary Education', department_id: 1 },
            { id: 102, name: 'Bachelor of Science in Criminology', department_id: 2 }
        ],
        studentsData: [
            { id: 1, student_id: '420134648', status: 'Active', auth_user_id: 'auth-s1' },
            { id: 2, student_id: '420134699', status: 'Active', auth_user_id: null }
        ],
        applicationsCount: 5,
        departments: ['College of Teacher Education', 'College of Criminal Justice Education'],
        linkedStudentCount: 1,
        authPendingStudentCount: 1,
        refetchAccounts: vi.fn(),
        refetchDepartments: vi.fn(),
        refetchCourses: vi.fn(),
        refetchStudents: vi.fn(),
        refetchApplications: vi.fn()
    })
}));

// Mock useAdminActions
vi.mock('../hooks/useAdminActions', () => ({
    useAdminActions: () => ({
        invokeManagedStaffFunction: vi.fn(),
        invokeManagedStudentFunction: vi.fn(),
        handleArchiveAccount: vi.fn()
    })
}));

// Mock useAdminAuditLogs
vi.mock('../hooks/useAdminAuditLogs', () => ({
    useAdminAuditLogs: () => ({
        auditLogs: [
            { id: 1, user_name: 'Cejie Bustamante', action: 'Archived student record', actor_role: 'Care Staff', created_at: new Date().toISOString() }
        ],
        auditLoading: false,
        auditTotalCount: 15,
        auditRoleFilter: 'All',
        setAuditRoleFilter: vi.fn(),
        auditSearch: '',
        setAuditSearch: vi.fn(),
        auditPage: 1,
        setAuditPage: vi.fn(),
        fetchAuditLogs: vi.fn()
    })
}));

describe('AdminDashboard Redesign', () => {
    it('renders the Executive Hero Header with single-source-of-truth KPI strip', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Header titles
        expect(screen.getAllByText('Account Management').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Admin Control Room').length).toBeGreaterThan(0);

        // 4 KPI Cards
        expect(screen.getAllByText('Staff Accounts').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Colleges').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Student Records').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Tracked Staff Logs').length).toBeGreaterThan(0);

        // KPI Counts
        expect(screen.getAllByText('3').length).toBeGreaterThan(0); // 3 staff accounts
        expect(screen.getAllByText('2').length).toBeGreaterThan(0); // 2 colleges
        expect(screen.getAllByText('15').length).toBeGreaterThan(0); // 15 tracked staff logs
    });

    it('renders role breakdown filters and filters the staff roster list', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Role breakdown pills
        expect(screen.getAllByText('All Roles').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Deans').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Care Staff').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Admins').length).toBeGreaterThan(0);

        // Initial accounts present
        expect(screen.getAllByText('Dr. Elena M. Magbanua').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Inee R. Cañete').length).toBeGreaterThan(0);
        expect(screen.getAllByText('System Administrator').length).toBeGreaterThan(0);
    });

    it('opens and closes the Staff Provisioning modal', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Click Staff Accounts KPI card
        const staffKpi = screen.getAllByText('Staff Accounts')[0].closest('button');
        if (staffKpi) fireEvent.click(staffKpi);

        // Modal should open with title "Staff Provisioning & Directory"
        expect(screen.getByRole('dialog', { name: /staff provisioning/i })).toBeInTheDocument();

        // Close modal
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        fireEvent.click(closeBtn);

        // Modal closed
        expect(screen.queryByRole('dialog', { name: /staff provisioning/i })).not.toBeInTheDocument();
    });

    it('opens and closes the Student Auth Health & ID Maintenance modal from Student Records KPI', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Click Student Records KPI card
        const studentKpi = screen.getAllByText('Student Records')[0].closest('button');
        if (studentKpi) fireEvent.click(studentKpi);

        // Modal should open
        expect(screen.getByRole('dialog', { name: /student auth health/i })).toBeInTheDocument();
        expect(screen.getByText('Auth Sync Coverage')).toBeInTheDocument();
        expect(screen.getByText('Rename / Swap Student IDs')).toBeInTheDocument();

        // Close modal
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByRole('dialog', { name: /student auth health/i })).not.toBeInTheDocument();
    });

    it('opens and closes the Institutional Colleges modal and displays assigned courses', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Click Colleges KPI card
        const collegesKpi = screen.getAllByText('Colleges')[0].closest('button');
        if (collegesKpi) fireEvent.click(collegesKpi);

        expect(screen.getByRole('dialog', { name: /institutional colleges/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/new college name \(e\.g\./i)).toBeInTheDocument();

        // Close modal
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByRole('dialog', { name: /institutional colleges/i })).not.toBeInTheDocument();
    });

    it('opens and closes the Staff Audit Monitor modal from Tracked Staff Logs KPI', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Click Tracked Staff Logs KPI card
        const logsKpi = screen.getAllByText('Tracked Staff Logs')[0].closest('button');
        if (logsKpi) fireEvent.click(logsKpi);

        expect(screen.getByRole('dialog', { name: /staff audit monitor/i })).toBeInTheDocument();
        expect(screen.getByText('Showing 1 events')).toBeInTheDocument();

        // Close modal
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByRole('dialog', { name: /staff audit monitor/i })).not.toBeInTheDocument();
    });

    it('opens and closes the Governance Boundaries modal', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        // Click Role Map button in the Governance card
        const roleMapButtons = screen.getAllByRole('button', { name: /role map/i });
        fireEvent.click(roleMapButtons[0]);

        expect(screen.getByRole('dialog', { name: /governance boundaries/i })).toBeInTheDocument();
        expect(screen.getAllByText('Admin Owns').length).toBeGreaterThan(0);
        expect(screen.getAllByText('CARE Staff Owns').length).toBeGreaterThan(0);
        expect(screen.getAllByText('College Designates Own').length).toBeGreaterThan(0);

        // Close modal
        const closeBtn = screen.getByRole('button', { name: /close dialog/i });
        fireEvent.click(closeBtn);

        expect(screen.queryByRole('dialog', { name: /governance boundaries/i })).not.toBeInTheDocument();
    });

    it('toggles the quick provision form drawer in the staff accounts workspace', () => {
        render(
            <BrowserRouter>
                <AdminDashboard />
            </BrowserRouter>
        );

        const newStaffBtn = screen.getAllByRole('button', { name: /\+ new staff/i })[0];
        fireEvent.click(newStaffBtn);

        expect(screen.getByText('Quick Provision Staff Login')).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/full name/i)).toBeInTheDocument();

        // Close drawer with cancel
        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);

        expect(screen.queryByText('Quick Provision Staff Login')).not.toBeInTheDocument();
    });
});
