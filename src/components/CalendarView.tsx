import { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { getCounselingScheduledDate, isCounselingCalendarVisible } from '../utils/workflow';

const getDaysInMonth = (date: any) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const getFirstDayOfMonth = (date: any) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Helper Component for Counseling Calendar
const CalendarView = ({ requests }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const weekCount = Math.ceil((firstDay + daysInMonth) / 7);
    const calendarLabel = `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()} counseling calendar`;

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day: any) => {
        return requests.filter(r => {
            const scheduledDate = getCounselingScheduledDate(r);
            if (!isCounselingCalendarVisible(r.status) || !scheduledDate) return false;
            const d = new Date(scheduledDate);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    return (
        <div role="region" aria-label={calendarLabel} className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm animate-fade-in">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-3 py-2">
                <h2 className="flex items-center gap-2 text-base font-bold text-gray-800"><Calendar size={18} className="text-purple-600" /> {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex gap-1">
                    <button type="button" onClick={handlePrevMonth} aria-label="Previous month" className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight className="rotate-180" size={16} /></button>
                    <button type="button" onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
                    <button type="button" onClick={handleNextMonth} aria-label="Next month" className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid shrink-0 grid-cols-7 border-b border-gray-100 bg-white text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{d}</div>))}
            </div>
            <div
                role="grid"
                aria-label={calendarLabel}
                className="grid min-h-0 flex-1 grid-cols-7 gap-px border-b border-gray-200 bg-gray-50"
                style={{ gridTemplateRows: `repeat(${weekCount}, minmax(0, 1fr))` }}
            >
                {[...Array(firstDay)].map((_, i) => (<div key={`empty-${i}`} className="min-h-0 bg-gray-50"></div>))}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                    return (
                        <div key={day} className={`flex min-h-0 flex-col bg-white p-1.5 transition hover:bg-purple-50/30 ${isToday ? 'bg-purple-50/20' : ''}`}>
                            <div className={`mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isToday ? 'bg-purple-600 text-white' : 'text-gray-700'}`}>{day}</div>
                            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
                                {events.map(ev => (
                                    (() => {
                                        const scheduledDate = getCounselingScheduledDate(ev);
                                        if (!scheduledDate) return null;
                                        return (
                                            <div key={ev.id} className="cursor-pointer truncate rounded border border-purple-100 bg-purple-50 p-1 text-[10px] text-purple-700 transition hover:bg-purple-100" title={`${ev.student_name} - ${new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                                <span className="font-bold block">{new Date(scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{ev.student_name}
                                            </div>
                                        );
                                    })()
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
