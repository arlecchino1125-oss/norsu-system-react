import { describe, expect, it } from 'vitest';
import { canMarkNatPassed } from './utils';

describe('NAT result eligibility', () => {
    it('allows Pass only after both attendance timestamps exist', () => {
        expect(canMarkNatPassed({
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: '2026-07-14T02:00:00.000Z'
        })).toBe(true);

        expect(canMarkNatPassed({
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: null
        })).toBe(false);

        expect(canMarkNatPassed({
            time_in: null,
            time_out: '2026-07-14T02:00:00.000Z'
        })).toBe(false);
    });
});
