// Single source of truth for event attendance timing. The student portal, the
// public events portal, the staff/dept portals, and the
// record_student_event_attendance / public_event_time_in RPCs must all agree on
// these windows — keep this file and those migrations in lockstep.

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const VISIBILITY_MS = 3 * 24 * 60 * 60 * 1000;

export const parseEventDate = (value?: string): Date | null => {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const parseEventTime = (value?: string) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
    return { hour, minute, second };
};

const combine = (dateValue?: string, timeValue?: string): Date | null => {
    const date = parseEventDate(dateValue);
    const time = parseEventTime(timeValue);
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
    /** Event stays visible in the portal until here, then it archives. */
    visibleUntil: Date | null;
}

// Time-out has no closing window on purpose. It opens when the event ends and
// stays open until the event archives itself out of view at visibleUntil, so a
// student who forgets to check out is not locked out by a separate grace timer.

export function getEventWindows(event: any): EventWindows {
    const start = combine(event?.event_date, event?.event_time);
    if (!start) return { start: null, end: null, checkInClose: null, visibleUntil: null };

    const end = combine(event?.event_date, event?.end_time)
        || new Date(start.getTime() + THREE_HOURS_MS);

    // Time-in closes at whichever comes FIRST: the event ending, or 3h after it
    // started. A 1h event stops accepting time-ins when it ends; a 13h event
    // stops 3h in, so nobody strolls in at hour twelve and is marked present.
    const checkInClose = new Date(Math.min(end.getTime(), start.getTime() + THREE_HOURS_MS));
    // The event stays visible in the portal for 3 days after it ends, then archives.
    // Time-out, rating and evaluation have no closing window of their own, so this
    // is in practice the deadline for all three.
    const visibleUntil = new Date(end.getTime() + VISIBILITY_MS);
    return { start, end, checkInClose, visibleUntil };
}

// Concluded = explicitly archived, or a full day past its end. Students stop
// seeing it and staff show it as "Archived" once this is true.
export function isEventConcluded(event: any): boolean {
    if (event?.is_archived) return true;
    const { visibleUntil } = getEventWindows(event);
    if (visibleUntil) return Date.now() > visibleUntil.getTime();
    // No parseable schedule (e.g. an announcement): fall back to a plain past-date check.
    return Boolean(event?.event_date) && event.event_date < new Date().toISOString().slice(0, 10);
}
