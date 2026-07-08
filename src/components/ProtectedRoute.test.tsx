import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuth } from '../lib/auth';

vi.mock('../lib/auth', () => ({
    useAuth: vi.fn()
}));

const mockedUseAuth = vi.mocked(useAuth);

const renderProtected = (allowedRoles: string[]) =>
    render(
        <MemoryRouter initialEntries={['/protected']}>
            <Routes>
                <Route path="/" element={<div>Public Home</div>} />
                <Route
                    path="/protected"
                    element={
                        <ProtectedRoute allowedRoles={allowedRoles}>
                            <div>Secret Content</div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </MemoryRouter>
    );

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a loading state while auth is resolving', () => {
        mockedUseAuth.mockReturnValue({
            session: null,
            loading: true,
            isAuthenticated: false,
            logout: vi.fn()
        });

        renderProtected(['Admin']);

        expect(screen.getByText(/verifying access/i)).toBeInTheDocument();
        expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });

    it('redirects unauthenticated users to the public landing page', () => {
        mockedUseAuth.mockReturnValue({
            session: null,
            loading: false,
            isAuthenticated: false,
            logout: vi.fn()
        });

        renderProtected(['Admin']);

        expect(screen.getByText('Public Home')).toBeInTheDocument();
        expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });

    it('blocks authenticated users whose role is not allowed', () => {
        mockedUseAuth.mockReturnValue({
            session: { role: 'Student' },
            loading: false,
            isAuthenticated: true,
            logout: vi.fn()
        });

        renderProtected(['Admin']);

        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
        expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
    });

    it('renders children for authenticated users with an allowed role', () => {
        mockedUseAuth.mockReturnValue({
            session: { role: 'Admin' },
            loading: false,
            isAuthenticated: true,
            logout: vi.fn()
        });

        renderProtected(['Admin']);

        expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });

    it('allows any authenticated user when no roles are specified', () => {
        mockedUseAuth.mockReturnValue({
            session: { role: 'Student' },
            loading: false,
            isAuthenticated: true,
            logout: vi.fn()
        });

        renderProtected([]);

        expect(screen.getByText('Secret Content')).toBeInTheDocument();
    });
});
