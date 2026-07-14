import { describe, expect, it } from 'vitest';
import { buildRateLimitIdentifier } from './rateLimitIdentifier.ts';

describe('rate-limit identifiers', () => {
    it('uses distinct IP buckets even when anonymous requests share one bearer token', async () => {
        const first = new Request('https://example.test', {
            headers: { Authorization: 'Bearer shared-anon-token', 'cf-connecting-ip': '203.0.113.10' }
        });
        const second = new Request('https://example.test', {
            headers: { Authorization: 'Bearer shared-anon-token', 'cf-connecting-ip': '203.0.113.11' }
        });

        await expect(buildRateLimitIdentifier(first, null, 'ip')).resolves.toBe('ip:203.0.113.10');
        await expect(buildRateLimitIdentifier(second, null, 'ip')).resolves.toBe('ip:203.0.113.11');
    });
});
