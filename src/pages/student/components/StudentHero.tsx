import { useEffect, useState } from 'react';
import { CalendarDays, Clock3, HeartHandshake } from 'lucide-react';

const formatFullDate = (date: any) => {
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatTimeParts = (date: any) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    const parts = formatter.formatToParts(new Date(date));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
        time: `${values.hour || '--'}:${values.minute || '--'}`,
        period: String(values.dayPeriod || '').toUpperCase()
    };
};

// Isolated Hero Component to prevent full page re-renders
export const StudentHero = ({ firstName, onVolunteerClick }: any) => {
    const [time, setTime] = useState(new Date());
    const [isCompactHeroLayout, setIsCompactHeroLayout] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth < 640 : false
    ));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let intervalId: number | null = null;
        let startDelayId: number | null = null;
        let minuteSyncId: number | null = null;
        const syncTime = () => setTime(new Date());
        const startLiveClock = () => {
            syncTime();
            const now = new Date();
            const msUntilNextMinute = Math.max((((59 - now.getSeconds()) * 1000) + (1000 - now.getMilliseconds())), 250);

            minuteSyncId = window.setTimeout(() => {
                syncTime();
                intervalId = window.setInterval(syncTime, 60 * 1000);
            }, msUntilNextMinute);
        };

        const startClockWithDelay = () => {
            startDelayId = window.setTimeout(() => {
                startLiveClock();
            }, 1800);
        };

        if (isCompactHeroLayout) {
            startClockWithDelay();
        } else {
            setTime(new Date());
            startLiveClock();
        }

        return () => {
            if (startDelayId !== null) {
                window.clearTimeout(startDelayId);
            }

            if (minuteSyncId !== null) {
                window.clearTimeout(minuteSyncId);
            }

            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
        };
    }, [isCompactHeroLayout]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const syncCompactLayout = () => {
            setIsCompactHeroLayout(window.innerWidth < 640);
        };

        syncCompactLayout();
        window.addEventListener('resize', syncCompactLayout);

        return () => {
            window.removeEventListener('resize', syncCompactLayout);
        };
    }, []);

    const { time: formattedTime, period } = formatTimeParts(time);

    return (
        <section className={`student-dashboard-hero rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-200/70 sm:p-5 ${isCompactHeroLayout ? '' : 'animate-fade-in-up'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-sky-700 sm:text-[11px]">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Student dashboard
                    </div>
                    <h2 className="mt-2 text-xl font-black leading-tight text-slate-950 sm:mt-3 sm:text-3xl">
                        Welcome back, {firstName}.
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{formatFullDate(time)}</p>
                </div>
                <div className="flex items-center gap-2 lg:flex-col lg:items-end lg:gap-2">
                    <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 shadow-sm lg:self-start">
                        <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="hidden uppercase tracking-[0.12em] text-slate-400 sm:inline">System time</span>
                        <span className="tabular-nums text-slate-950">{formattedTime}</span>
                        <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{period}</span>
                    </div>
                    {onVolunteerClick && (
                        <button
                            type="button"
                            onClick={onVolunteerClick}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
                        >
                            <HeartHandshake className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Join</span> Peer Facilitators
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};
