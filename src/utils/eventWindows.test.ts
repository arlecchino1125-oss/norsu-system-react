import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEventWindows, isEventConcluded } from './eventWindows';

const HOUR = 60 * 60 * 1000;

// A 2-minute event starting at a fixed local time.
const shortEvent = { type: 'event', event_date: '2026-07-23', event_time: '10:00', end_time: '10:02' };
// A 4.5-hour orientation.
const longEvent = { type: 'orientation', event_date: '2026-07-23', event_time: '08:00', end_time: '12:30' };

const at = (iso: string) => vi.setSystemTime(new Date(iso));

afterEach(() => vi.useRealTimers());

describe('getEventWindows', () => {
    it('keeps time-in open long after a short event has ended', () => {
        const { end, closesAt } = getEventWindows(shortEvent);
        // The old rule shut time-in at 10:02. Now it runs to the close date.
        expect(closesAt!.getTime()).toBeGreaterThan(end!.getTime());
    });

    it('defaults the close to 3 days after the end', () => {
        const { end, closesAt } = getEventWindows(shortEvent);
        expect(closesAt!.getTime() - end!.getTime()).toBe(3 * 24 * HOUR);
    });

    it('applies no 3h cap to a long event', () => {
        const { start, closesAt } = getEventWindows(longEvent);
        expect(closesAt!.getTime() - start!.getTime()).toBeGreaterThan(3 * HOUR);
    });

    it('honours an explicit attendance_closes_at', () => {
        const { closesAt } = getEventWindows({
            ...shortEvent,
            attendance_closes_at: '2026-08-01T02:00:00.000Z'
        });
        expect(closesAt!.toISOString()).toBe('2026-08-01T02:00:00.000Z');
    });

    it('falls back when attendance_closes_at is unparseable', () => {
        const { end, closesAt } = getEventWindows({ ...shortEvent, attendance_closes_at: 'not-a-date' });
        expect(closesAt!.getTime() - end!.getTime()).toBe(3 * 24 * HOUR);
    });

    it('no longer exposes separate check-in, timeout or visibility windows', () => {
        const windows = getEventWindows(longEvent);
        expect(windows).not.toHaveProperty('checkInClose');
        expect(windows).not.toHaveProperty('timeoutClose');
        expect(windows).not.toHaveProperty('visibleUntil');
    });
});

describe('isEventConcluded', () => {
    it('stays visible long after the end (visibility is 3 days)', () => {
        at('2026-07-23T14:00:00'); // ~4h after the 10:02 end, still well inside the window
        expect(isEventConcluded(shortEvent)).toBe(false);
    });

    it('is not concluded until 3 days after end', () => {
        at('2026-07-26T08:00:00'); // third morning, still before 10:02 + 3 days
        expect(isEventConcluded(shortEvent)).toBe(false);
    });

    it('concludes once past end + 3 days', () => {
        at('2026-07-26T10:05:00'); // just past 10:02 + 3 days
        expect(isEventConcluded(shortEvent)).toBe(true);
    });

    it('is always concluded when archived', () => {
        at('2026-07-23T10:01:00');
        expect(isEventConcluded({ ...shortEvent, is_archived: true })).toBe(true);
    });

    it('concludes at an explicit attendance_closes_at instead of the default', () => {
        at('2026-07-23T12:00:00'); // hours after the 10:02 end, days before the default close
        expect(isEventConcluded({
            ...shortEvent,
            attendance_closes_at: new Date('2026-07-23T11:00:00').toISOString()
        })).toBe(true);
    });
});
