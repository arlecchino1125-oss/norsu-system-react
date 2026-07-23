import { describe, expect, it, vi } from 'vitest';
import { handleAuthLogin, type AuthLoginDependencies } from './handler.ts';

const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: 'auth-user-1' }
};

const dependencies = (overrides: Partial<AuthLoginDependencies> = {}): AuthLoginDependencies => ({
    findStaff: vi.fn().mockResolvedValue({
        email: 'staff@example.edu',
        authUserId: 'auth-user-1',
        role: 'Care Staff',
        isArchived: false
    }),
    findStudent: vi.fn().mockResolvedValue({
        email: 'student@example.edu',
        authUserId: 'auth-user-1',
        status: 'Active'
    }),
    authenticate: vi.fn().mockResolvedValue({ session, user: session.user }),
    revokeSession: vi.fn().mockResolvedValue(undefined),
    dummyEmail: 'invalid-login@invalid.local',
    ...overrides
});

const post = (body: Record<string, unknown>) => new Request('http://localhost', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

describe('handleAuthLogin', () => {
    it('authenticates an unknown staff identifier with a dummy email and returns a generic failure', async () => {
        const deps = dependencies({ findStaff: vi.fn().mockResolvedValue(null) });

        const response = await handleAuthLogin(post({
            mode: 'authenticate-staff-login',
            username: 'unknown',
            password: 'wrong',
            requiredRole: 'Care Staff'
        }), deps);

        expect(deps.authenticate).toHaveBeenCalledWith('invalid-login@invalid.local', 'wrong');
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ success: false, error: 'Invalid login details.' });
    });

    it('never returns an email when a password is wrong', async () => {
        const deps = dependencies({ authenticate: vi.fn().mockResolvedValue(null) });

        const response = await handleAuthLogin(post({
            mode: 'authenticate-student-login',
            studentId: '2024-001',
            password: 'wrong'
        }), deps);
        const body = await response.text();

        expect(response.status).toBe(401);
        expect(body).toBe(JSON.stringify({ success: false, error: 'Invalid login details.' }));
        expect(body).not.toContain('student@example.edu');
    });

    it('revokes and rejects a session whose user does not match the linked staff account', async () => {
        const deps = dependencies({
            authenticate: vi.fn().mockResolvedValue({
                session,
                user: { id: 'different-auth-user' }
            })
        });

        const response = await handleAuthLogin(post({
            mode: 'authenticate-staff-login',
            username: 'care',
            password: 'correct',
            requiredRole: 'Care Staff'
        }), deps);

        expect(deps.revokeSession).toHaveBeenCalledOnce();
        expect(response.status).toBe(401);
    });

    it('revokes and rejects a staff account with the wrong requested role', async () => {
        const deps = dependencies();

        const response = await handleAuthLogin(post({
            mode: 'authenticate-staff-login',
            username: 'care',
            password: 'correct',
            requiredRole: 'Registrar Staff'
        }), deps);

        expect(deps.revokeSession).toHaveBeenCalledOnce();
        expect(response.status).toBe(401);
    });

    it('resolves a staff login by email and authenticates with the linked account', async () => {
        const findStaff = vi.fn().mockResolvedValue({
            email: 'staff@example.edu',
            authUserId: 'auth-user-1',
            role: 'Care Staff',
            isArchived: false
        });
        const deps = dependencies({ findStaff });

        const response = await handleAuthLogin(post({
            mode: 'authenticate-staff-login',
            email: 'Staff@Example.edu',
            password: 'correct',
            requiredRole: 'Care Staff'
        }), deps);

        expect(findStaff).toHaveBeenCalledWith({ username: '', email: 'staff@example.edu' });
        expect(deps.authenticate).toHaveBeenCalledWith('staff@example.edu', 'correct');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, session });
    });

    it('returns only the Supabase session after successful authentication', async () => {
        const deps = dependencies();

        const response = await handleAuthLogin(post({
            mode: 'authenticate-student-login',
            email: 'student@example.edu',
            password: 'correct'
        }), deps);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ success: true, session });
    });
});
