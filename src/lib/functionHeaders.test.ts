import { afterEach, describe, expect, it, vi } from 'vitest';

const loadHeaders = async () => {
    vi.resetModules();
    return import('./functionHeaders');
};

describe('buildEdgeFunctionHeaders', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('uses the user token as Authorization for authenticated function calls', async () => {
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');

        const { buildEdgeFunctionHeaders } = await loadHeaders();

        expect(buildEdgeFunctionHeaders('user-token')).toEqual({
            apikey: 'anon-key',
            Authorization: 'Bearer user-token'
        });
    });
});
