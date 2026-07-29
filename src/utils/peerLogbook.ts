/** Shared pieces for the peer support logbook (student + care staff views). */

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The entry select both portals use -- they render the same component, so they
 * read the same shape. Deliberately no join to students: the assisted student's
 * initials are stored on the entry at pick time, so displaying a logbook never
 * depends on permission to read another student's record. A peer does not have
 * that permission, and the form only ever wanted initials anyway.
 */
export const LOG_ENTRY_COLUMNS = `
    id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
    assisted_student_id, assisted_initials, concern, action_taken, remarks, referred
`;

export const LOGBOOK_STATUS_TONE: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-600',
    submitted: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

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

/**
 * The paper sheet is a monthly hand-in, and nothing else here would remind a
 * peer that theirs is due. Fires in the last five days, counting today.
 */
export const shouldPromptSubmit = (now: Date, status: string): boolean => {
    if (status !== 'draft') return false;
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate() + 1 <= 5;
};

export const initialsFrom = (first?: string | null, last?: string | null): string =>
    [first, last]
        .filter(Boolean)
        .map((name) => `${String(name).trim().charAt(0).toUpperCase()}.`)
        .join('');

/** Roster display name: first, middle initial, last, suffix. */
export const facilitatorName = (s: any): string =>
    [s?.first_name, s?.middle_name ? `${String(s.middle_name).charAt(0)}.` : '', s?.last_name, s?.suffix]
        .filter(Boolean).join(' ') || '—';

/**
 * What a logbook shows for the student assisted. Always initials, whether the
 * peer picked a student or typed them freehand -- the entry carries them either
 * way, so this never reaches for a record it may not be allowed to read.
 */
export const entryInitials = (entry: { assisted_initials?: string | null }): string =>
    entry.assisted_initials?.trim() || '';
