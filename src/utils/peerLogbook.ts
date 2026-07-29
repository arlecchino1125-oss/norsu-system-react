/** Month and display helpers for the peer support logbook (student + care staff views). */

const pad = (value: number) => String(value).padStart(2, '0');

/** 'YYYY-MM' for the local calendar month -- matches sessionDate's local-time rule. */
export const monthKeyOf = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** The `month` column value: every logbook month is stored as its first day. */
export const monthStartOf = (monthKey: string): string => `${monthKey}-01`;

export const monthLabelOf = (monthKey: string): string => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/** Local calendar day (YYYY-MM-DD) -- the default for a new entry's date. */
export const todayIso = (date: Date = new Date()): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Days remaining in the month, counting today. */
export const daysLeftInMonth = (now: Date): number => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate() + 1;
};

/** The paper sheet is a monthly hand-in, and nothing else would remind a peer. */
export const shouldPromptSubmit = (now: Date, status: string): boolean =>
    status === 'draft' && daysLeftInMonth(now) <= 5;

export const initialsFrom = (first?: string | null, last?: string | null): string =>
    [first, last]
        .filter(Boolean)
        .map((name) => `${String(name).trim().charAt(0).toUpperCase()}.`)
        .join('');

/** Typed initials win: the peer chose them deliberately over the linked record. */
export const entryInitials = (entry: {
    assisted_initials?: string | null;
    students?: { first_name?: string | null; last_name?: string | null } | null;
}): string =>
    entry.assisted_initials?.trim()
        || initialsFrom(entry.students?.first_name, entry.students?.last_name);
