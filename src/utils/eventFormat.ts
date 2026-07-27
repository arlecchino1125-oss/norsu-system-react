// Date/time labels for event cards. Shared by the student portal and the public
// events portal so the two read identically -- they are the same board.

import { parseEventDate, parseEventTime } from './eventWindows';

export const formatDateLabel = (value?: string) => {
    const date = parseEventDate(value);
    if (!date) return value || 'To be announced';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatTimeLabel = (value?: string) => {
    const time = parseEventTime(value);
    if (!time) return value || 'To be announced';

    const date = new Date();
    date.setHours(time.hour, time.minute, time.second, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatTimeRangeLabel = (startValue?: string, endValue?: string) => {
    const startLabel = formatTimeLabel(startValue);
    if (!endValue) return startLabel;
    return `${startLabel} - ${formatTimeLabel(endValue)}`;
};

export const formatAttendanceTimestamp = (value?: string) => {
    const date = parseEventDate(value);
    if (!date) return value || 'Not recorded';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};
