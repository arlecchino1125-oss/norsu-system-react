import { useState } from 'react';
import { Calendar, ChevronRight } from 'lucide-react';

// Helper Component for Counseling Calendar
const CalendarView = ({ requests }: any) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: any) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date: any) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const getEventsForDay = (day: any) => {
        return requests.filter(r => {
            if (r.status !== 'Scheduled' || !r.schedule_date) return false;
            const d = new Date(r.schedule_date);
            return d.getDate() === day && d.getMonth() === currentDate.getMonth() && d.getFullYear() === currentDate.getFullYear();
        });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Calendar size={20} className="text-purple-600" /> {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight className="rotate-180" size={16} /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Today</button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition"><ChevronRight size={16} /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center bg-white border-b border-gray-100">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (<div key={d} className="py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 bg-gray-50 gap-px border-b border-gray-200">
                {[...Array(firstDay)].map((_, i) => (<div key={`empty-${i}`} className="h-32 bg-gray-50"></div>))}
                {[...Array(daysInMonth)].map((_, i) => {
                    const day = i + 1;
                    const events = getEventsForDay(day);
                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                    return (
                        <div key={day} className={`h-32 bg-white p-2 transition hover:bg-purple-50/30 flex flex-col ${isToday ? 'bg-purple-50/20' : ''}`}>
                            <div className={`text-xs font-bold mb-2 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-purple-600 text-white' : 'text-gray-700'}`}>{day}</div>
                            <div className="flex-1 overflow-y-auto space-y-1">
                                {events.map(ev => (
                                    <div key={ev.id} className="text-[10px] bg-purple-50 text-purple-700 p-1.5 rounded border border-purple-100 truncate cursor-pointer hover:bg-purple-100 transition" title={`${ev.student_name} - ${new Date(ev.schedule_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                        <span className="font-bold block">{new Date(ev.schedule_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{ev.student_name}
                                    </div>
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
