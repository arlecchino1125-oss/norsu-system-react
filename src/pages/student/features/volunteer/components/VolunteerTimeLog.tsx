import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import { formatHours, sessionHours, totalHours } from '../../../../../utils/volunteerHours';

const COLUMNS = 'id, student_id, time_in, time_out';

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

interface VolunteerTimeLogProps {
    studentId: string;
    showToast?: (message: string, type?: string) => void;
    timeInEnabled?: boolean;
}

export default function VolunteerTimeLog({ studentId, showToast, timeInEnabled = true }: VolunteerTimeLogProps) {
    const { data: sessions = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['student-facilitator-hours', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_attendance')
                .select(COLUMNS)
                .eq('student_id', studentId)
                .order('time_in', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const fetchSessions = () => refetch();
    const openSession = sessions.find((session) => !session.time_out);

    const handleTimeIn = async () => {
        // ponytail: the partial unique index rejects a second open session, so no pre-check here.
        const { error } = await supabase
            .from('peer_facilitator_attendance')
            .insert([{ student_id: studentId }]);
        if (error) {
            showToast?.(error.code === '23505'
                ? 'You are already timed in. Time out first.'
                : 'Unable to time in. Please try again.', 'error');
            await fetchSessions();
            return;
        }
        showToast?.('Timed in. Your volunteer hours are now running.');
        await fetchSessions();
    };

    const handleTimeOut = async () => {
        if (!openSession) return;
        const { error } = await supabase
            .from('peer_facilitator_attendance')
            .update({ time_out: new Date().toISOString() })
            .eq('id', openSession.id);
        if (error) {
            showToast?.('Unable to time out. Please try again.', 'error');
            return;
        }
        showToast?.('Timed out. Thank you for volunteering.');
        await fetchSessions();
    };

    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-500">Facilitator Hours</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">Volunteer Time Log</h3>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Total logged: {formatHours(totalHours(sessions))}
                        {openSession ? ` · Timed in at ${formatClock(openSession.time_in)}` : ''}
                    </p>
                </div>
                {openSession ? (
                    <Button variant="danger" onClick={handleTimeOut} className="shrink-0">Time Out</Button>
                ) : timeInEnabled ? (
                    <Button variant="primary" onClick={handleTimeIn} className="shrink-0">Time In</Button>
                ) : (
                    <div className="shrink-0 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-center">
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-600">Paused</p>
                        <p className="text-[11px] font-semibold text-amber-700">Hours logging is off right now.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-3">
                {isLoading ? (
                    <p className="py-4 text-center text-[11px] font-semibold text-slate-400">Loading your hours...</p>
                ) : isError ? (
                    <p className="py-4 text-center text-[11px] font-semibold text-rose-500">Unable to load your volunteer hours.</p>
                ) : sessions.length === 0 ? (
                    <p className="py-4 text-center text-[11px] font-semibold text-slate-400">No volunteer hours logged yet.</p>
                ) : (
                    <ul className="space-y-1.5">
                        {sessions.slice(0, 10).map((session) => (
                            <li key={session.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                                <span className="text-[11px] font-bold text-slate-700">
                                    {new Date(session.time_in).toLocaleDateString()}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500">
                                    {formatClock(session.time_in)} – {session.time_out ? formatClock(session.time_out) : 'ongoing'}
                                </span>
                                <span className="text-[11px] font-black text-slate-900">
                                    {session.time_out ? formatHours(sessionHours(session)) : '—'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
