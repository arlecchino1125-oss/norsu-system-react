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
    it('closes check-in when a short event ends, before the 3h cap', () => {
        const { end, checkInClose } = getEventWindows(shortEvent);
        // 10:00-10:02: the end comes first, so time-in shuts at 10:02, not 13:00.
        expect(checkInClose!.getTime()).toBe(end!.getTime());
    });

    it('caps check-in at 3h for a long event, well before it ends', () => {
        const { start, end, checkInClose } = getEventWindows(longEvent);
        // 08:00-12:30: the 3h cap comes first, so time-in shuts at 11:00.
        expect(checkInClose!.getTime() - start!.getTime()).toBe(3 * HOUR);
        expect(checkInClose!.getTime()).toBeLessThan(end!.getTime());
    });

    it('leaves time-out open with no closing window', () => {
        expect(getEventWindows(shortEvent)).not.toHaveProperty('timeoutClose');
    });

    it('keeps the event visible for 3 days after it ends', () => {
        const { end, visibleUntil } = getEventWindows(shortEvent);
        expect(visibleUntil!.getTime() - end!.getTime()).toBe(3 * 24 * HOUR);
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
});
