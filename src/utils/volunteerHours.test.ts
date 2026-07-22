import { describe, expect, it } from 'vitest';
import { formatHours, sessionDate, sessionHours, totalHours } from './volunteerHours';

describe('volunteerHours', () => {
    it('counts a closed session and ignores an open one', () => {
        expect(sessionHours({ time_in: '2026-07-22T01:00:00Z', time_out: '2026-07-22T03:30:00Z' })).toBe(2.5);
        expect(sessionHours({ time_in: '2026-07-22T01:00:00Z', time_out: null })).toBe(0);
    });

    it('never returns negative hours for a reversed pair', () => {
        expect(sessionHours({ time_in: '2026-07-22T05:00:00Z', time_out: '2026-07-22T01:00:00Z' })).toBe(0);
    });

    it('sums a mixed list', () => {
        expect(totalHours([
            { time_in: '2026-07-22T01:00:00Z', time_out: '2026-07-22T02:00:00Z' },
            { time_in: '2026-07-22T03:00:00Z', time_out: null },
            { time_in: '2026-07-22T04:00:00Z', time_out: '2026-07-22T04:45:00Z' }
        ])).toBe(1.75);
    });

    it('formats hours and minutes', () => {
        expect(formatHours(2.5)).toBe('2h 30m');
        expect(formatHours(0)).toBe('0h 0m');
    });

    it('keys sessions by local calendar day', () => {
        const local = new Date(2026, 6, 22, 9, 0, 0);
        expect(sessionDate(local.toISOString())).toBe('2026-07-22');
    });
});
