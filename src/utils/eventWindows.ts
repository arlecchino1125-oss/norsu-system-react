// Single source of truth for event attendance timing. The student portal, the
// public events portal, the staff/dept portals, and the
// record_student_event_attendance / public_event_time_in RPCs must all agree on
// these windows — keep this file and those migrations in lockstep.

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

// How long an event stays actionable past its end when staff has not set a
// date of its own. Matches `interval '3 days'` in the migrations. Exported so
// the staff form suggests the same default rather than restating the number.
export const DEFAULT_CLOSE_MS = 3 * 24 * 60 * 60 * 1000;

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
    /**
     * The one deadline. Time-in, time-out, rating and evaluation all close here,
     * and the card archives at the same moment. Staff sets it per event through
     * events.attendance_closes_at; NULL lands it at end + 3 days.
     */
    closesAt: Date | null;
}

// Time-in opens at the start and time-out opens at the end, exactly as before.
// Neither has a closing window of its own any more: students who had no internet
// during the event can still record attendance right up to closesAt.

export function getEventWindows(event: any): EventWindows {
    const start = combine(event?.event_date, event?.event_time);
    if (!start) return { start: null, end: null, closesAt: null };

    const end = combine(event?.event_date, event?.end_time)
        || new Date(start.getTime() + THREE_HOURS_MS);

    const explicit = event?.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
    const closesAt = explicit && !Number.isNaN(explicit.getTime())
        ? explicit
        : new Date(end.getTime() + DEFAULT_CLOSE_MS);

    return { start, end, closesAt };
}

// Concluded = explicitly archived, or past its closing date. Students stop
// seeing it and staff show it as "Archived" once this is true.
export function isEventConcluded(event: any): boolean {
    if (event?.is_archived) return true;
    const { closesAt } = getEventWindows(event);
    if (closesAt) return Date.now() > closesAt.getTime();
    // No parseable schedule (e.g. an announcement): fall back to a plain past-date check.
    return Boolean(event?.event_date) && event.event_date < new Date().toISOString().slice(0, 10);
}
