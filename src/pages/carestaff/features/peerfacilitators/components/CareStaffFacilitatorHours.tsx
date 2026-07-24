import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users, XCircle } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import { Card } from '../../../../../components/ui/Card';
import { formatHours, sessionDate, sessionHours, splitAmPm, totalHours } from '../../../../../utils/volunteerHours';

const COLUMNS = `
    id, student_id, time_in, time_out,
    students:student_id ( first_name, last_name, course, year_level, department )
`;

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDayLabel = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

/** A DTR cell: first time in to last time out for that half of the day. */
const spanLabel = (sessions: any[]) => {
    if (sessions.length === 0) return '—';
    const last = sessions[sessions.length - 1];
    return `${formatClock(sessions[0].time_in)} – ${last.time_out ? formatClock(last.time_out) : 'ongoing'}`;
};

const DtrColumn = ({ label, sessions }: { label: string; sessions: any[] }) => (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-2">
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</h4>
            <span className="text-xs font-black text-slate-900">{formatHours(totalHours(sessions))}</span>
        </div>
        {sessions.length === 0 ? (
            <p className="py-4 text-center text-xs font-semibold text-slate-400">No time logged</p>
        ) : (
            <ul className="mt-2 space-y-1.5">
                {sessions.map((session) => (
                    <li key={session.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-600">
                            {formatClock(session.time_in)} – {session.time_out ? formatClock(session.time_out) : <span className="font-bold text-amber-600">ongoing</span>}
                        </span>
                        <span className="font-bold text-slate-900">
                            {session.time_out ? formatHours(sessionHours(session)) : '—'}
                        </span>
                    </li>
                ))}
            </ul>
        )}
    </div>
);

const FacilitatorDtrModal = ({ entry, day, onClose }: any) => {
    const { morning, afternoon } = splitAmPm(entry.sessions);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent p-4 care-modal-overlay">
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
                    <div className="min-w-0">
                        <h3 className="truncate text-lg font-bold text-gray-900">{entry.name}</h3>
                        <p className="text-xs text-gray-500">{entry.student_id} · {formatDayLabel(day)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><XCircle size={20} /></Button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <DtrColumn label="Morning" sessions={morning} />
                        <DtrColumn label="Afternoon" sessions={afternoon} />
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                        <span className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">Total for the day</span>
                        <span className="text-base font-black text-emerald-800">{formatHours(totalHours(entry.sessions))}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface CareStaffFacilitatorHoursProps {
    refreshSignal?: number;
}

export default function CareStaffFacilitatorHours({ refreshSignal = 0 }: CareStaffFacilitatorHoursProps) {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [openEntry, setOpenEntry] = useState<any>(null);

    const { data: sessions = [], isLoading } = useQuery({
        queryKey: ['care-staff-facilitator-hours', refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_attendance')
                .select(COLUMNS)
                .order('time_in', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const days = Array.from(new Set(sessions.map((s: any) => sessionDate(s.time_in))));
    const activeDay = selectedDay && days.includes(selectedDay) ? selectedDay : days[0];

    // One DTR line per facilitator for the selected day, not one per punch.
    const entries = Array.from(
        sessions
            .filter((s: any) => sessionDate(s.time_in) === activeDay)
            .reduce((acc: Map<string, any>, session: any) => {
                const entry = acc.get(session.student_id) ?? {
                    student_id: session.student_id,
                    name: [session.students?.first_name, session.students?.last_name].filter(Boolean).join(' ') || session.student_id,
                    course: [session.students?.course, session.students?.year_level].filter(Boolean).join(' - ') || session.students?.department || 'N/A',
                    sessions: []
                };
                entry.sessions.push(session);
                return acc.set(session.student_id, entry);
            }, new Map()).values()
    ).toSorted((a: any, b: any) => a.name.localeCompare(b.name));

    if (isLoading) {
        return <div className="py-12 text-center text-gray-500">Loading facilitator hours...</div>;
    }

    if (days.length === 0) {
        return (
            <Card className="p-12 text-center text-gray-500">
                No volunteer hours logged yet. Approved peer facilitators log their own time in and time out from the student portal.
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2">
                    <label htmlFor="facilitator-hours-day" className="text-xs font-bold whitespace-nowrap text-gray-500">Date</label>
                    <select
                        id="facilitator-hours-day"
                        value={activeDay}
                        onChange={(e) => setSelectedDay(e.target.value)}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                        {days.map((day) => (
                            <option key={day} value={day}>{formatDayLabel(day)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-bold text-gray-900">{entries.length}</span>
                        <span className="text-xs text-gray-500">facilitator{entries.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">
                            {formatHours(entries.reduce((sum: number, entry: any) => sum + totalHours(entry.sessions), 0))}
                        </span>
                        <span className="text-xs text-gray-500">volunteered</span>
                    </div>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4 font-bold">Facilitator</th>
                                <th className="px-6 py-4 font-bold">Course &amp; Year</th>
                                <th className="px-6 py-4 font-bold">Morning</th>
                                <th className="px-6 py-4 font-bold">Afternoon</th>
                                <th className="px-6 py-4 text-right font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {entries.map((entry: any) => {
                                const { morning, afternoon } = splitAmPm(entry.sessions);
                                return (
                                    <tr
                                        key={entry.student_id}
                                        onClick={() => setOpenEntry(entry)}
                                        className="cursor-pointer transition-colors hover:bg-blue-50/50"
                                    >
                                        <td className="px-6 py-4">
                                            <button type="button" className="text-left font-bold text-gray-900 hover:text-blue-700 hover:underline">
                                                {entry.name}
                                            </button>
                                            <div className="text-xs text-gray-500">{entry.student_id}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{entry.course}</td>
                                        <td className="px-6 py-4 text-gray-600">{spanLabel(morning)}</td>
                                        <td className="px-6 py-4 text-gray-600">{spanLabel(afternoon)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            {formatHours(totalHours(entry.sessions))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {openEntry && createPortal(
                <FacilitatorDtrModal entry={openEntry} day={activeDay} onClose={() => setOpenEntry(null)} />,
                document.body
            )}
        </div>
    );
}
