import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './auth';

const authMocks = vi.hoisted(() => ({
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    unsubscribe: vi.fn()
}));

vi.mock('./supabase', () => ({
    SUPABASE_AUTH_STORAGE_KEY: 'sb-test-auth-token',
    supabase: {
        auth: {
            getSession: authMocks.getSession,
            onAuthStateChange: authMocks.onAuthStateChange
        }
    }
}));

const SessionEditor = () => {
    const { session, updateSession } = useAuth() as any;

    return (
        <button onClick={() => updateSession((previous: any) => ({ ...previous, full_name: 'After' }))}>
            {session?.full_name || 'No session'}
        </button>
    );
};

describe('AuthProvider session updates', () => {
    beforeEach(() => {
        localStorage.clear();
        authMocks.getSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
        authMocks.unsubscribe.mockReset();
        authMocks.onAuthStateChange.mockReset().mockReturnValue({
            data: { subscription: { unsubscribe: authMocks.unsubscribe } }
        });
    });

    it('persists one functional session update once in Strict Mode', async () => {
        localStorage.setItem('norsu_session', JSON.stringify({ full_name: 'Before' }));
        const setItem = vi.spyOn(Storage.prototype, 'setItem');

        render(
            <StrictMode>
                <AuthProvider>
                    <SessionEditor />
                </AuthProvider>
            </StrictMode>
        );

        await screen.findByRole('button', { name: 'Before' });
        const writesBeforeUpdate = setItem.mock.calls.filter(([key]) => key === 'norsu_session').length;

        fireEvent.click(screen.getByRole('button', { name: 'Before' }));

        await screen.findByRole('button', { name: 'After' });
        await waitFor(() => {
            const writesAfterUpdate = setItem.mock.calls.filter(([key]) => key === 'norsu_session').length;
            expect(writesAfterUpdate - writesBeforeUpdate).toBe(1);
        });
        expect(JSON.parse(localStorage.getItem('norsu_session') || 'null')).toMatchObject({ full_name: 'After' });
    });
});
