import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCounselingScheduledDate, isCounselingCalendarVisible } from '../utils/workflow';
import { toTitleCase } from '../utils/formatters';

const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper Component for Counseling Calendar
const CalendarView = ({ requests }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const weekCount = Math.ceil((firstDay + daysInMonth) / 7);
    const calendarLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()} counseling calendar`;

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day: number) => {
        return requests.filter((r: any) => {
            const scheduledDate = getCounselingScheduledDate(r);
            if (!isCounselingCalendarVisible(r.status) || !scheduledDate) return false;
            const d = new Date(scheduledDate);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    return (
        <div role="region" aria-label={calendarLabel} className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl md:rounded-3xl border border-slate-200/80 bg-white shadow-sm">
            {/* Calendar Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="flex items-center gap-2.5 text-base md:text-lg font-bold text-slate-800">
                    <Calendar size={20} className="text-purple-600" />
                    <span>{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                </h2>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        aria-label="Previous month"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-purple-600"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setCurrentDate(new Date())}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-purple-600"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        aria-label="Next month"
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-purple-600"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Day Labels Row (SUN - SAT, uppercase 10px) */}
            <div className="grid shrink-0 grid-cols-7 border-b border-slate-100 bg-white text-center">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                    <div key={d} className="py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {d}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div
                role="grid"
                aria-label={calendarLabel}
                className="grid min-h-0 flex-1 grid-cols-7 border-b border-slate-100 bg-slate-100/60 gap-[1px]"
                style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
                {[...Array(firstDay)].map((_, i) => (
                    <div key={`empty-${i}`} className="min-h-0 bg-white/70"></div>
                ))}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                    return (
                        <div
                            key={day}
                            className={`flex min-h-0 flex-col bg-white p-2.5 transition hover:bg-purple-50/30 ${
                                isToday ? 'bg-purple-50/10' : ''
                            }`}
                        >
                            <div className="mb-1 flex shrink-0 items-center justify-between">
                                <div
                                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
                                        isToday
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                    {day}
                                </div>
                            </div>
                            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                {events.map((ev: any) => {
                                    const scheduledDate = getCounselingScheduledDate(ev);
                                    if (!scheduledDate) return null;
                                    return (
                                        <div
                                            key={ev.id}
                                            className="cursor-pointer truncate rounded-lg border border-purple-100 bg-purple-50 p-1 text-[10px] text-purple-700 transition hover:bg-purple-100"
                                            title={`${toTitleCase(ev.student_name)} - ${new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        >
                                            <span className="block font-bold">
                                                {new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="block truncate font-medium">
                                                {toTitleCase(ev.student_name)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
