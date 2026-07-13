import { describe, expect, it, vi } from 'vitest';
import { authenticateLogin } from './authLogin';

describe('authenticateLogin', () => {
    it('sends identifier and password together and installs the returned session', async () => {
        const invoke = vi.fn().mockResolvedValue({
            data: { success: true, session: { access_token: 'access', refresh_token: 'refresh' } },
            error: null,
            response: { status: 200 }
        });
        const setSession = vi.fn().mockResolvedValue({
            data: { session: { access_token: 'access' }, user: { id: 'user-1' } },
            error: null
        });

        const result = await authenticateLogin({ invoke, setSession }, {
            mode: 'authenticate-staff-login',
            username: 'care',
            password: 'secret',
            requiredRole: 'Care Staff'
        });

        expect(invoke).toHaveBeenCalledWith({
            mode: 'authenticate-staff-login',
            username: 'care',
            password: 'secret',
            requiredRole: 'Care Staff'
        });
        expect(setSession).toHaveBeenCalledWith({ access_token: 'access', refresh_token: 'refresh' });
        expect(result.user).toEqual({ id: 'user-1' });
    });

    it('does not install a session after a generic authentication failure', async () => {
        const setSession = vi.fn();

        await expect(authenticateLogin({
            invoke: vi.fn().mockResolvedValue({
                data: { success: false, error: 'Invalid login details.' },
                error: null,
                response: { status: 401 }
            }),
            setSession
        }, {
            mode: 'authenticate-student-login',
            studentId: '2024-001',
            password: 'wrong'
        })).rejects.toMatchObject({ message: 'Invalid login details.', status: 401 });

        expect(setSession).not.toHaveBeenCalled();
    });
});
