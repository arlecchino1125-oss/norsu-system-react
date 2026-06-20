import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
    value: string;            // ISO date string yyyy-mm-dd
    onChange: (value: string) => void;
    name?: string;
    required?: boolean;
    className?: string;
    placeholder?: string;
    minYear?: number;
    maxYear?: number;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const DatePicker: React.FC<DatePickerProps> = ({
    value,
    onChange,
    name,
    required,
    className = '',
    placeholder = 'Select date',
    minYear = 1950,
    maxYear = new Date().getFullYear(),
}) => {
    const parsed = value ? new Date(value + 'T00:00:00') : null;
    const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : new Date().getMonth());
    const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : 2000);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Sync view when value changes externally
    useEffect(() => {
        if (parsed) {
            setViewMonth(parsed.getMonth());
            setViewYear(parsed.getFullYear());
        }
    }, [value]);

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();

    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();
    const totalSlots = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    const handleSelect = (day: number) => {
        const m = String(viewMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        onChange(`${viewYear}-${m}-${d}`);
        setOpen(false);
    };

    const navigateMonth = (dir: number) => {
        let newMonth = viewMonth + dir;
        let newYear = viewYear;
        if (newMonth < 0) { newMonth = 11; newYear--; }
        if (newMonth > 11) { newMonth = 0; newYear++; }
        if (newYear >= minYear && newYear <= maxYear) {
            setViewMonth(newMonth);
            setViewYear(newYear);
        }
    };

    const displayValue = parsed
        ? `${MONTHS[parsed.getMonth()]} ${parsed.getDate()}, ${parsed.getFullYear()}`
        : '';

    const yearOptions: number[] = [];
    for (let y = maxYear; y >= minYear; y--) yearOptions.push(y);

    const isSelected = (day: number) =>
        parsed && parsed.getDate() === day && parsed.getMonth() === viewMonth && parsed.getFullYear() === viewYear;

    const isToday = (day: number) => {
        const now = new Date();
        return now.getDate() === day && now.getMonth() === viewMonth && now.getFullYear() === viewYear;
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden input for form compatibility */}
            {name && <input type="hidden" name={name} value={value || ''} />}

            {/* Trigger button */}
            <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left text-sm transition-all hover:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none ${!displayValue ? 'text-slate-400' : 'text-slate-800 font-medium'
                    } ${required && !value ? 'border-red-300' : ''}`}
            >
                <span>{displayValue || placeholder}</span>
                <Calendar size={16} className="text-slate-400 shrink-0" />
            </button>

            {/* Dropdown calendar */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {open && (
                        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }}
                            />
                        <motion.div
                            ref={modalRef}
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, type: 'spring', bounce: 0.25 }}
                            className="relative bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-[320px] max-w-full"
                        >
                            {/* Month/Year header */}
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <button type="button" onClick={() => navigateMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                    <ChevronLeft size={16} className="text-slate-600" />
                                </button>
                                <div className="flex items-center gap-1.5">
                                    <select
                                        value={viewMonth}
                                        onChange={e => setViewMonth(Number(e.target.value))}
                                        className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg border-0 outline-none cursor-pointer hover:bg-indigo-100 transition-colors appearance-auto"
                                    >
                                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                    <select
                                        value={viewYear}
                                        onChange={e => setViewYear(Number(e.target.value))}
                                        className="px-2 py-1 bg-slate-100 text-slate-700 font-bold text-sm rounded-lg border-0 outline-none cursor-pointer hover:bg-slate-200 transition-colors appearance-auto"
                                    >
                                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <button type="button" onClick={() => navigateMonth(1)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                                    <ChevronRight size={16} className="text-slate-600" />
                                </button>
                            </div>

                            {/* Day labels */}
                            <div className="grid grid-cols-7 mb-1">
                                {DAY_LABELS.map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>
                                ))}
                            </div>

                            {/* Day grid */}
                            <div className="grid grid-cols-7 gap-y-1">
                                {Array.from({ length: totalSlots }, (_, i) => {
                                    const dayNum = i - firstDay + 1;
                                    const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;

                                    if (!isCurrentMonth) {
                                        // Show prev/next month day (greyed out)
                                        const displayDay = dayNum < 1
                                            ? prevMonthDays + dayNum
                                            : dayNum - daysInMonth;
                                        return (
                                            <div key={i} className="text-center py-2 text-xs text-slate-300 select-none">
                                                {displayDay}
                                            </div>
                                        );
                                    }

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSelect(dayNum)}
                                            className={`text-center py-2 text-[15px] sm:text-sm rounded-lg transition-all ${isSelected(dayNum)
                                                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200'
                                                    : isToday(dayNum)
                                                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                                        : 'text-slate-700 hover:bg-slate-100 font-medium'
                                                }`}
                                        >
                                            {dayNum}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Clear button */}
                            {value && (
                                <div className="mt-3 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(''); setOpen(false); }}
                                        className="w-full text-center text-xs text-slate-400 hover:text-red-500 font-bold transition-colors py-1"
                                    >
                                        Clear date
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default DatePicker;
