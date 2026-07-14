import { describe, expect, it, vi } from 'vitest';
import { requireValidTurnstile } from './turnstile.ts';

describe('requireValidTurnstile', () => {
    it('does nothing when Turnstile is not configured', async () => {
        const fetcher = vi.fn();

        await expect(requireValidTurnstile('', '', fetcher)).resolves.toBeUndefined();
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('rejects a missing token when Turnstile is configured', async () => {
        await expect(requireValidTurnstile('', 'secret', vi.fn())).rejects.toMatchObject({
            message: 'Please complete the security check to continue.',
            status: 403
        });
    });

    it('accepts only a successful server verification', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

        await expect(requireValidTurnstile('token', 'secret', fetcher)).resolves.toBeUndefined();
        expect(fetcher).toHaveBeenCalledOnce();
    });

    it('rejects a failed server verification', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(
            JSON.stringify({ success: false }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

        await expect(requireValidTurnstile('bad-token', 'secret', fetcher)).rejects.toMatchObject({
            status: 403
        });
    });
});
