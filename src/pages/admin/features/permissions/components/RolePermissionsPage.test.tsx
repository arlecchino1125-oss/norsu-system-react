import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RolePermissionsPage from './RolePermissionsPage';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

vi.mock('../../../../../lib/useAuth', () => ({
    useAuth: () => ({
        session: { role: 'Admin', user: { id: 'admin-1', email: 'admin@institution.edu.ph' } }
    })
}));

vi.mock('../../../../../services/permissionService', () => ({
    permissionService: {
        getPermissionsForRole: vi.fn().mockResolvedValue({}),
        updatePermission: vi.fn().mockResolvedValue(true),
        resetRoleToDefaults: vi.fn().mockResolvedValue(true),
        clearRoleCache: vi.fn()
    }
}));

describe('RolePermissionsPage (RBAC Control Center)', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <RolePermissionsPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    it('renders the executive hero header with title, badge, and operational controls', async () => {
        renderComponent();

        expect(screen.getByText('RBAC Control Center')).toBeInTheDocument();
        expect(screen.getByText('ROLE PERMISSIONS')).toBeInTheDocument();
        expect(screen.getByText(/Manage database table & column policies/i)).toBeInTheDocument();

        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Refresh Permissions')).toBeInTheDocument();
        expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders the 6 roles in the role selector bar with ratio pills', async () => {
        renderComponent();

        expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Care Staff')).toBeInTheDocument();
        expect(screen.getByText('College Designate')).toBeInTheDocument();
        expect(screen.getByText('Registrar')).toBeInTheDocument();
        expect(screen.getByText('Student')).toBeInTheDocument();
        expect(screen.getByText('Public NAT Portal')).toBeInTheDocument();

        // Admin defaults to 25/28
        expect(screen.getByText('25/28')).toBeInTheDocument();
        // Care Staff defaults to 49/50
        expect(screen.getByText('49/50')).toBeInTheDocument();
    });

    it('renders the 4 category tabs with count badges', async () => {
        renderComponent();

        expect(screen.getByText('Tables & Columns')).toBeInTheDocument();
        expect(screen.getByText('11/13')).toBeInTheDocument();

        expect(screen.getByText('Functions (RPC)')).toBeInTheDocument();
        expect(screen.getByText('4/4')).toBeInTheDocument();

        expect(screen.getByText('Portal Pages')).toBeInTheDocument();
        expect(screen.getByText('6/6')).toBeInTheDocument();

        expect(screen.getByText('Actions')).toBeInTheDocument();
        expect(screen.getByText('4/5')).toBeInTheDocument();
    });

    it('displays the status filter buttons with correct counts', async () => {
        renderComponent();

        expect(screen.getByText('All (13)')).toBeInTheDocument();
        expect(screen.getByText('Enabled (11)')).toBeInTheDocument();
        expect(screen.getByText('Blocked (2)')).toBeInTheDocument();
    });

    it('renders table cards with column counts and handles status filtering', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Staff Accounts')).toBeInTheDocument();
        });

        expect(screen.getByText(/public\.staff_accounts · 6\/6 cols/i)).toBeInTheDocument();
        expect(screen.getByText('Counseling Evaluation Answers')).toBeInTheDocument();

        // Filter by Blocked
        fireEvent.click(screen.getByText('Blocked (2)'));
        expect(screen.getByText('Counseling Evaluation Answers')).toBeInTheDocument();
        expect(screen.queryByText('Staff Accounts')).not.toBeInTheDocument();

        // Filter by Enabled
        fireEvent.click(screen.getByText('Enabled (11)'));
        expect(screen.getByText('Staff Accounts')).toBeInTheDocument();
        expect(screen.queryByText('Counseling Evaluation Answers')).not.toBeInTheDocument();
    });

    it('switches tabs and displays corresponding items', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Staff Accounts')).toBeInTheDocument();
        });

        // Switch to Functions (RPC) tab
        fireEvent.click(screen.getByText('Functions (RPC)'));
        expect(screen.getByText('Provision Staff Account')).toBeInTheDocument();
        expect(screen.getByText('rpc.provision_staff_account')).toBeInTheDocument();
        expect(screen.getByText('Update Role Permissions')).toBeInTheDocument();

        // Switch to Portal Pages tab
        fireEvent.click(screen.getByText('Portal Pages'));
        expect(screen.getByText('Account Management')).toBeInTheDocument();
        expect(screen.getByText('/account-management')).toBeInTheDocument();
        expect(screen.getAllByText('RBAC Control Center').length).toBeGreaterThanOrEqual(2);

        // Switch to Actions tab
        fireEvent.click(screen.getByText('Actions'));
        expect(screen.getByText('Create & Revoke Staff Logins')).toBeInTheDocument();
        expect(screen.getByText('action.create_&_revoke_staff_logins')).toBeInTheDocument();
        expect(screen.getByText('Bulk Reset Student Data')).toBeInTheDocument();
    });

    it('allows expanding cards to inspect CRUD operations and columns', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Staff Accounts')).toBeInTheDocument();
        });

        // Find the expand button for Staff Accounts
        const expandButton = screen.getByRole('button', { name: /Expand Staff Accounts/i });
        fireEvent.click(expandButton);

        expect(screen.getByText('CRUD Operations')).toBeInTheDocument();
        expect(screen.getByText('SELECT')).toBeInTheDocument();
        expect(screen.getByText('INSERT')).toBeInTheDocument();
        expect(screen.getByText(/Column-Level Policies/i)).toBeInTheDocument();
        expect(screen.getByText('username')).toBeInTheDocument();
    });

    it('opens and closes the Reset Defaults modal', async () => {
        renderComponent();

        fireEvent.click(screen.getByText('Reset to Defaults'));
        expect(screen.getByText('Reset to default permissions?')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByText('Reset to default permissions?')).not.toBeInTheDocument();
    });

    it('navigates back to dashboard when clicking Back button', async () => {
        renderComponent();

        fireEvent.click(screen.getByText('Back to Dashboard'));
        expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard');
    });
});
