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
    it('keeps check-in open at least 2h after start for short events', () => {
        const { start, checkInClose } = getEventWindows(shortEvent);
        // ends 10:02 but check-in must stay open until 12:00 (start + 2h).
        expect(checkInClose!.getTime() - start!.getTime()).toBe(2 * HOUR);
    });

    it('keeps check-in open until the event ends for long events', () => {
        const { end, checkInClose } = getEventWindows(longEvent);
        // end 12:30 is later than start+2h (10:00), so check-in closes at end.
        expect(checkInClose!.getTime()).toBe(end!.getTime());
    });

    it('gives a 2h time-out grace after the end', () => {
        const { end, timeoutClose } = getEventWindows(shortEvent);
        expect(timeoutClose!.getTime() - end!.getTime()).toBe(2 * HOUR);
    });

    it('keeps the event visible for a full day after it ends', () => {
        const { end, visibleUntil } = getEventWindows(shortEvent);
        expect(visibleUntil!.getTime() - end!.getTime()).toBe(24 * HOUR);
    });
});

describe('isEventConcluded', () => {
    it('stays visible well past the 2h time-out grace (visibility is a full day)', () => {
        at('2026-07-23T13:00:00'); // ~3h after the 10:02 end, past time-out but still visible
        expect(isEventConcluded(shortEvent)).toBe(false);
    });

    it('is not concluded until a day after end', () => {
        at('2026-07-24T08:00:00'); // next morning, still before 10:02 + 24h
        expect(isEventConcluded(shortEvent)).toBe(false);
    });

    it('concludes once past end + 1 day', () => {
        at('2026-07-24T10:05:00'); // just past 10:02 + 24h
        expect(isEventConcluded(shortEvent)).toBe(true);
    });

    it('is always concluded when archived', () => {
        at('2026-07-23T10:01:00');
        expect(isEventConcluded({ ...shortEvent, is_archived: true })).toBe(true);
    });
});
