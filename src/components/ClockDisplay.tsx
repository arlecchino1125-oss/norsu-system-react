import { useState, useEffect } from 'react';

// Standalone live clock — isolated re-renders so parent doesn't flicker
export const useLiveClock = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const hours = currentTime.getHours();
    const greeting = hours < 12 ? 'Good Morning' : hours < 18 ? 'Good Afternoon' : 'Good Evening';
    const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const [timePart, ampm] = timeString.split(' ');
    const [h, m, s] = timePart.split(':');

    return { greeting, h, m, s, ampm, dateString };
};

export const ClockDisplay = () => {
    const { h, m, s, ampm, dateString } = useLiveClock();
    return (
        <div className="relative">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-6 min-w-[260px]">
                <div className="flex items-baseline justify-center gap-1 mb-3">
                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{h}</span>
                    <span className="text-5xl md:text-6xl font-light text-purple-300 animate-pulse">:</span>
                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{m}</span>
                    <span className="text-5xl md:text-6xl font-light text-purple-300 animate-pulse">:</span>
                    <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-purple-300">{s}</span>
                    <span className="text-lg font-bold text-purple-400 ml-2 self-start mt-2">{ampm}</span>
                </div>
                <p className="text-purple-300/70 text-sm font-medium">{dateString}</p>
            </div>
            <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-3xl -z-10" />
        </div>
    );
};

export const GreetingText = () => {
    const { greeting } = useLiveClock();
    return <p className="text-purple-300/80 text-sm font-medium tracking-wide uppercase mb-2 animate-fade-in-up">{greeting}</p>;
};
