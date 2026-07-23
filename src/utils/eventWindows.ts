// Single source of truth for event attendance timing. The student portal, the
// staff/dept portals, and the record_student_event_attendance RPC must all agree
// on these windows — keep this file and that migration in lockstep.

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value?: string): Date | null => {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const parseTime = (value?: string) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
    return { hour, minute, second };
};

const combine = (dateValue?: string, timeValue?: string): Date | null => {
    const date = parseDate(dateValue);
    const time = parseTime(timeValue);
    if (!date || !time) return null;
    const combined = new Date(date);
    combined.setHours(time.hour, time.minute, time.second, 0);
    return combined;
};

export interface EventWindows {
    start: Date | null;
    end: Date | null;
    /** Time-in stays clickable until here. */
    checkInClose: Date | null;
    /** Time-out (check-out) stays available until here. */
    timeoutClose: Date | null;
    /** Event stays visible in the portal until here, then it archives. */
    visibleUntil: Date | null;
}

export function getEventWindows(event: any): EventWindows {
    const start = combine(event?.event_date, event?.event_time);
    if (!start) return { start: null, end: null, checkInClose: null, timeoutClose: null, visibleUntil: null };

    const end = combine(event?.event_date, event?.end_time)
        || new Date(start.getTime() + TWO_HOURS_MS);

    // Check-in stays open for at least 2h after the event starts (so short events
    // don't close the window minutes in), or until the event ends if that's later.
    const checkInClose = new Date(Math.max(end.getTime(), start.getTime() + TWO_HOURS_MS));
    // Time-outs stay open for 2h after the event ends.
    const timeoutClose = new Date(end.getTime() + TWO_HOURS_MS);
    // The event stays visible in the portal for a full day after it ends, then archives.
    const visibleUntil = new Date(end.getTime() + ONE_DAY_MS);
    return { start, end, checkInClose, timeoutClose, visibleUntil };
}

// Concluded = explicitly archived, or past its 2h time-out grace. Students stop
// seeing it and staff show it as "Archived" once this is true.
export function isEventConcluded(event: any): boolean {
    if (event?.is_archived) return true;
    const { visibleUntil } = getEventWindows(event);
    if (visibleUntil) return Date.now() > visibleUntil.getTime();
    // No parseable schedule (e.g. an announcement): fall back to a plain past-date check.
    return Boolean(event?.event_date) && event.event_date < new Date().toISOString().slice(0, 10);
}
