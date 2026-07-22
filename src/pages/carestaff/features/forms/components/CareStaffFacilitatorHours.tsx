import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Users } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Card } from '../../../../../components/ui/Card';
import { formatHours, sessionDate, sessionHours, totalHours } from '../../../../../utils/volunteerHours';

const COLUMNS = `
    id, student_id, time_in, time_out,
    students:student_id ( first_name, last_name, course, year_level, department )
`;

const formatClock = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const formatDayLabel = (day: string) =>
    new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });

interface CareStaffFacilitatorHoursProps {
    refreshSignal?: number;
}

export default function CareStaffFacilitatorHours({ refreshSignal = 0 }: CareStaffFacilitatorHoursProps) {
    const [selectedDay, setSelectedDay] = useState<string | null>(null);

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
    const dayRows = sessions.filter((s: any) => sessionDate(s.time_in) === activeDay);
    const facilitatorCount = new Set(dayRows.map((s: any) => s.student_id)).size;

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
                        <span className="text-sm font-bold text-gray-900">{facilitatorCount}</span>
                        <span className="text-xs text-gray-500">facilitator{facilitatorCount === 1 ? '' : 's'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-bold text-gray-900">{formatHours(totalHours(dayRows))}</span>
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
                                <th className="px-6 py-4 font-bold">Time In</th>
                                <th className="px-6 py-4 font-bold">Time Out</th>
                                <th className="px-6 py-4 text-right font-bold">Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {dayRows.map((row: any) => (
                                <tr key={row.id} className="transition-colors hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{row.students?.first_name} {row.students?.last_name}</div>
                                        <div className="text-xs text-gray-500">{row.student_id}</div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {[row.students?.course, row.students?.year_level].filter(Boolean).join(' - ') || row.students?.department || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{formatClock(row.time_in)}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {row.time_out ? formatClock(row.time_out) : <span className="font-bold text-amber-600">Still timed in</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        {row.time_out ? formatHours(sessionHours(row)) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
