import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionMock, invokeMock, buildHeadersMock } = vi.hoisted(() => ({
    getSessionMock: vi.fn(),
    invokeMock: vi.fn(),
    buildHeadersMock: vi.fn()
}));

vi.mock('./supabase', () => ({
    supabase: {
        auth: {
            getSession: getSessionMock
        },
        functions: {
            invoke: invokeMock
        }
    }
}));

vi.mock('./functionHeaders', () => ({
    buildEdgeFunctionHeaders: buildHeadersMock
}));

import { invokeEdgeFunction } from './invokeEdgeFunction';

describe('invokeEdgeFunction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        buildHeadersMock.mockImplementation((token?: string | null) => ({
            Authorization: token ? `Bearer ${token}` : 'Bearer public'
        }));
        getSessionMock.mockResolvedValue({ data: { session: { access_token: 'user-token' } } });
        invokeMock.mockResolvedValue({ data: { success: true, value: 1 }, error: null, response: null });
    });

    it('supports public function calls without loading a user session', async () => {
        const result = await invokeEdgeFunction('send-email', {
            body: { type: 'TEST' },
            fallbackMessage: 'Failed to send.'
        });

        expect(getSessionMock).not.toHaveBeenCalled();
        expect(buildHeadersMock).toHaveBeenCalledWith(null);
        expect(invokeMock).toHaveBeenCalledWith('send-email', {
            body: { type: 'TEST' },
            headers: { Authorization: 'Bearer public' }
        });
        expect(result).toEqual({ success: true, value: 1 });
    });

    it('loads a session token for protected function calls', async () => {
        await invokeEdgeFunction('manage-student-accounts', {
            body: { mode: 'save' },
            requireAuth: true
        });

        expect(getSessionMock).toHaveBeenCalledTimes(1);
        expect(buildHeadersMock).toHaveBeenCalledWith('user-token');
        expect(invokeMock).toHaveBeenCalledWith('manage-student-accounts', {
            body: { mode: 'save' },
            headers: { Authorization: 'Bearer user-token' }
        });
    });

    it('surfaces detailed error payloads from non-2xx responses', async () => {
        const response = {
            status: 401,
            clone: () => ({
                json: async () => ({ error: 'Detailed function error.' }),
                text: async () => 'Detailed function error.'
            })
        };

        invokeMock.mockResolvedValue({
            data: null,
            error: { message: 'non-2xx status code', name: 'FunctionsHttpError', context: { status: 401 } },
            response
        });

        await expect(invokeEdgeFunction('manage-care-services', {
            body: { mode: 'test' },
            requireAuth: true,
            non2xxMessage: 'Fallback auth error.'
        })).rejects.toMatchObject({
            message: 'Detailed function error.',
            status: 401,
            errorName: 'FunctionsHttpError'
        });
    });

    it('treats success=false payloads as failures', async () => {
        invokeMock.mockResolvedValue({
            data: { success: false, error: 'Function reported failure.' },
            error: null,
            response: { status: 400 }
        });

        await expect(invokeEdgeFunction('send-email', {
            body: { type: 'TEST' },
            fallbackMessage: 'Fallback failure.'
        })).rejects.toMatchObject({
            message: 'Function reported failure.',
            status: 400
        });
    });
});
