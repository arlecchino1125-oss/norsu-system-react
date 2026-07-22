/** Shared time math for peer facilitator volunteer logs (student + care staff views). */

export interface VolunteerSession {
    time_in: string;
    time_out?: string | null;
}

/** Hours for one session; 0 while it is still open. */
export const sessionHours = (session: VolunteerSession): number => {
    if (!session.time_out) return 0;
    const ms = new Date(session.time_out).getTime() - new Date(session.time_in).getTime();
    return ms > 0 ? ms / 3600000 : 0;
};

export const totalHours = (sessions: VolunteerSession[]): number =>
    sessions.reduce((sum, session) => sum + sessionHours(session), 0);

/** "2h 30m" — hours read better than a 2.5 decimal on a timesheet. */
export const formatHours = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

/** Local calendar day (YYYY-MM-DD) of a timestamp — the staff dropdown key. */
export const sessionDate = (timestamp: string): string => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
