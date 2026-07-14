type NatAttendanceAction = 'time-in' | 'time-out';
type NatApplication = {
    status?: unknown;
    test_date?: unknown;
    test_time?: unknown;
    time_in?: unknown;
    time_out?: unknown;
};

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const parseTimeToMinutes = (value: unknown) => {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return -1;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return -1;
    return (hour * 60) + minute;
};

const getManilaDateAndMinutes = (now: Date) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(now).map((part) => [part.type, part.value]));

    return {
        date: `${parts.year}-${parts.month}-${parts.day}`,
        minutes: (Number(parts.hour) * 60) + Number(parts.minute)
    };
};

const isTimeInWindow = (timeWindow: unknown, minutes: number) => {
    const normalizedWindow = String(timeWindow || '').trim();
    const isLegacyDaytime = () => (minutes >= 8 * 60 && minutes < 12 * 60)
        || (minutes >= 13 * 60 && minutes < 17 * 60);

    if (!normalizedWindow) return isLegacyDaytime();

    const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(normalizedWindow);
    if (!match) return false;

    const [, startValue, endValue] = match;
    const start = parseTimeToMinutes(startValue);
    const end = parseTimeToMinutes(endValue);

    if (start >= 0 && end > start) return minutes >= start && minutes < end;
    return false;
};

export const buildNatAttendanceUpdate = (
    application: NatApplication,
    action: NatAttendanceAction,
    now: Date
) => {
    const timestamp = now.toISOString();

    if (action === 'time-out') {
        if (String(application.status || '') !== 'Ongoing') {
            throw withStatus('Time Out is available only after Time In.', 409);
        }
        if (!application.time_in) {
            throw withStatus('Record Time In before recording Time Out.', 409);
        }
        if (application.time_out) {
            throw withStatus('Time Out has already been recorded.', 409);
        }
        return { time_out: timestamp, status: 'Test Taken' };
    }

    if (String(application.status || '') !== 'Submitted') {
        throw withStatus('Time In is available only for submitted applications.', 409);
    }
    if (application.time_in) {
        throw withStatus('Time In has already been recorded.', 409);
    }
    if (application.time_out) {
        throw withStatus('Time Out has already been recorded.', 409);
    }

    const manila = getManilaDateAndMinutes(now);
    if (String(application.test_date || '') !== manila.date) {
        throw withStatus('Time In is available only on your assigned test date.', 403);
    }
    if (!isTimeInWindow(application.test_time, manila.minutes)) {
        throw withStatus('Time In is not available during this time window.', 403);
    }

    return { time_in: timestamp, status: 'Ongoing' };
};
