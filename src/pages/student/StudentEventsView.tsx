import { createPortal } from 'react-dom';

const parseDateValue = (value: string) => {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

const parseTimeValue = (value: string) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);

    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

    return { hour, minute, second };
};

const combineDateAndTime = (dateValue: string, timeValue: string) => {
    const date = parseDateValue(dateValue);
    const time = parseTimeValue(timeValue);
    if (!date || !time) return null;

    const combined = new Date(date);
    combined.setHours(time.hour, time.minute, time.second, 0);
    return combined;
};

const formatDateLabel = (value: string) => {
    const date = parseDateValue(value);
    if (!date) return value || 'To be announced';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

const formatTimeLabel = (value: string) => {
    const time = parseTimeValue(value);
    if (!time) return value || 'To be announced';

    const date = new Date();
    date.setHours(time.hour, time.minute, time.second, 0);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

const formatTimeRangeLabel = (startValue: string, endValue?: string) => {
    const startLabel = formatTimeLabel(startValue);
    if (!endValue) return startLabel;
    return `${startLabel} - ${formatTimeLabel(endValue)}`;
};

const formatAttendanceTimestamp = (value: string) => {
    const date = parseDateValue(value);
    if (!date) return value || 'Not recorded';
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

const getEventWindow = (item: any) => {
    if (item?.type !== 'Event') return { start: null, end: null };

    const start = combineDateAndTime(item.event_date, item.event_time);
    if (!start) return { start: null, end: null };

    const explicitEnd = combineDateAndTime(item.event_date, item.end_time);
    const end = explicitEnd || new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
};

const getDisplayDate = (item: any) => formatDateLabel(item?.event_date || item?.created_at || '');
const getDisplayTime = (item: any) => {
    if (item?.type !== 'Event') return `Posted ${formatDateLabel(item?.created_at || '')}`;
    return formatTimeRangeLabel(item?.event_time || '', item?.end_time || '');
};
const getDisplayLocation = (item: any) => item?.location || 'Location to be announced';

const StudentEventsView = ({
    eventsList,
    eventFilter,
    setEventFilter,
    attendanceMap,
    fetchHistory,
    handleTimeIn,
    handleTimeOut,
    handleRateEvent,
    ratedEvents,
    isTimingIn,
    timingOutEventId,
    isSubmittingEventRating,
    setProofFile,
    selectedEvent,
    setSelectedEvent,
    showRatingModal,
    setShowRatingModal,
    ratingForm,
    setRatingForm,
    submitRating,
    personalInfo,
    toast,
    Icons
}: any) => {
    const filteredEvents = (eventsList || []).filter((item: any) => {
        if (eventFilter === 'Events') return item.type === 'Event';
        if (eventFilter === 'Announcements') return item.type === 'Announcement';
        return true;
    });

    return (
        <>
            <div className="page-transition">
                <div className="mb-8 flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
                    <div>
                        <h2 className="mb-1 text-2xl font-extrabold text-gray-800">Events & Announcements</h2>
                        <p className="text-sm text-gray-400">Stay updated with campus activities and important news.</p>
                    </div>
                    <button
                        onClick={fetchHistory}
                        className="flex items-center gap-1 text-xs font-bold text-purple-600 transition-colors hover:text-purple-800"
                    >
                        <Icons.Clock />
                        Refresh
                    </button>
                    <div className="flex gap-1 rounded-xl border border-purple-100/50 bg-white/80 p-1 shadow-sm backdrop-blur-sm">
                        {['All', 'Events', 'Announcements'].map((filterName: string) => (
                            <button
                                key={filterName}
                                onClick={() => setEventFilter(filterName)}
                                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${eventFilter === filterName
                                    ? 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-500 hover:bg-purple-50 hover:text-gray-900'
                                    }`}
                            >
                                {filterName}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {filteredEvents.map((item: any, idx: number) => {
                        const record = attendanceMap[item.id];
                        const isTimedIn = Boolean(record?.time_in);
                        const isTimedOut = Boolean(record?.time_out);
                        const isTimingOut = timingOutEventId === String(item.id);
                        const { start, end } = getEventWindow(item);
                        const now = new Date();
                        const canTimeIn = item.type === 'Event' && Boolean(start) && now >= (start as Date) && !isTimedIn;
                        const canTimeOut = item.type === 'Event' && Boolean(end) && isTimedIn && !isTimedOut && now >= (end as Date);

                        return (
                            <div
                                key={item.id}
                                onClick={() => setSelectedEvent(item)}
                                className={`card-hover relative cursor-pointer rounded-2xl border-l-4 bg-white/80 p-8 shadow-sm backdrop-blur-sm animate-fade-in-up ${item.type === 'Event' ? 'border-l-purple-500' : 'border-l-indigo-400'}`}
                                style={{ animationDelay: `${idx * 100}ms` }}
                            >
                                <div className="mb-6 flex items-start justify-between">
                                    <span className="rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                                        {item.type}
                                    </span>
                                    {item.type === 'Event' && isTimedIn && (
                                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-600">
                                            <Icons.CheckCircle />
                                            Attended
                                        </span>
                                    )}
                                </div>

                                <h3 className="mb-4 text-xl font-bold text-gray-800">{item.title}</h3>
                                <p className="mb-8 line-clamp-3 text-sm leading-relaxed text-gray-500">{item.description || 'No additional details provided.'}</p>

                                <div className="mb-8 space-y-3">
                                    <p className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                        <Icons.Events />
                                        {getDisplayDate(item)}
                                    </p>
                                    <p className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                        <Icons.Clock />
                                        {getDisplayTime(item)}
                                    </p>
                                    {item.type === 'Event' && (
                                        <p className="flex items-center gap-3 text-xs font-medium text-gray-400">
                                            <Icons.Support />
                                            {getDisplayLocation(item)}
                                        </p>
                                    )}
                                </div>

                                {item.type === 'Event' && (
                                    <div className="flex flex-col gap-3" onClick={(event: any) => event.stopPropagation()}>
                                        {!isTimedIn && canTimeIn && (
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(event: any) => setProofFile(event.target.files?.[0] || null)}
                                                className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-purple-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
                                            />
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                disabled={!canTimeIn || isTimingIn || isTimedIn}
                                                onClick={() => handleTimeIn(item)}
                                                className={`flex-1 rounded-xl py-3 text-xs font-bold transition-all ${isTimedIn
                                                    ? 'cursor-default border border-emerald-200 bg-emerald-100 text-emerald-700'
                                                    : (!canTimeIn || isTimingIn
                                                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                        : 'bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-lg shadow-blue-500/20 hover:from-blue-400 hover:to-sky-300')
                                                    }`}
                                            >
                                                {isTimedIn ? 'Checked In' : (isTimingIn ? 'Processing...' : (start ? `Time In opens ${formatTimeLabel(item.event_time)}` : 'Time In unavailable'))}
                                            </button>
                                            <button
                                                disabled={!canTimeOut || isTimingOut}
                                                onClick={() => handleTimeOut(item)}
                                                className={`flex-1 rounded-xl py-3 text-xs font-bold transition-all ${isTimedOut
                                                    ? 'cursor-default bg-gray-100 text-gray-400'
                                                    : (!canTimeOut || isTimingOut
                                                        ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                                        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/20 hover:from-red-400 hover:to-rose-500')
                                                    }`}
                                            >
                                                {isTimedOut ? 'Completed' : (isTimingOut ? 'Processing...' : (end ? `Time Out after ${formatTimeLabel(item.end_time || '')}` : 'Time Out unavailable'))}
                                            </button>
                                        </div>

                                        {isTimedOut && !ratedEvents.includes(item.id) && (
                                            <button
                                                onClick={() => handleRateEvent(item)}
                                                className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3 text-xs font-bold text-amber-600 shadow-sm transition-all hover:bg-amber-100"
                                            >
                                                <Icons.Star filled={true} />
                                                Rate
                                            </button>
                                        )}
                                    </div>
                                )}

                                <p className="mt-4 text-right text-[10px] font-bold text-purple-500">Click for full details</p>
                            </div>
                        );
                    })}
                </div>

                {filteredEvents.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-sm text-slate-500">
                        No {eventFilter === 'All' ? 'items' : eventFilter.toLowerCase()} available right now.
                    </div>
                )}
            </div>

            {selectedEvent && createPortal((() => {
                const record = attendanceMap[selectedEvent.id];
                const isTimedIn = Boolean(record?.time_in);
                const isTimedOut = Boolean(record?.time_out);
                const isTimingOut = timingOutEventId === String(selectedEvent.id);
                const { start, end } = getEventWindow(selectedEvent);
                const now = new Date();
                const canTimeIn = selectedEvent.type === 'Event' && Boolean(start) && now >= (start as Date) && !isTimedIn;
                const canTimeOut = selectedEvent.type === 'Event' && Boolean(end) && isTimedIn && !isTimedOut && now >= (end as Date);

                return (
                    <div
                        className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm student-mobile-modal-overlay"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <div
                            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl student-mobile-modal-panel student-mobile-modal-scroll-panel"
                            onClick={(event: any) => event.stopPropagation()}
                        >
                            <div className={`h-2 w-full rounded-t-3xl ${selectedEvent.type === 'Event' ? 'bg-gradient-to-r from-blue-600 to-sky-500' : 'bg-gradient-to-r from-slate-800 to-slate-600'}`} />

                            <div className="p-8">
                                <div className="mb-6 flex items-start justify-between gap-4">
                                    <div>
                                        <div className="mb-3 flex items-center gap-3">
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                                                {selectedEvent.type}
                                            </span>
                                            {selectedEvent.type === 'Event' && isTimedIn && (
                                                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700">
                                                    <Icons.CheckCircle />
                                                    {isTimedOut ? 'Attendance completed' : 'Checked in'}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-extrabold text-slate-900">{selectedEvent.title}</h2>
                                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                                            {selectedEvent.description || 'No additional details provided.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="rounded-full border border-slate-200 p-3 text-slate-400 transition-colors hover:text-slate-700"
                                        aria-label="Close event details"
                                    >
                                        x
                                    </button>
                                </div>

                                <div className={`grid gap-4 ${selectedEvent.type === 'Event' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</p>
                                        <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <Icons.Events />
                                            {getDisplayDate(selectedEvent)}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                            {selectedEvent.type === 'Event' ? 'Time' : 'Posted'}
                                        </p>
                                        <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                            <Icons.Clock />
                                            {getDisplayTime(selectedEvent)}
                                        </p>
                                    </div>
                                    {selectedEvent.type === 'Event' && (
                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Location</p>
                                            <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                                                <Icons.Support />
                                                {getDisplayLocation(selectedEvent)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {selectedEvent.type === 'Event' && (
                                    <div className="mt-8 border-t border-slate-100 pt-8">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h4 className="text-base font-extrabold text-slate-900">Attendance</h4>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                {isTimedOut ? 'Completed' : isTimedIn ? 'Checked in' : 'Pending'}
                                            </span>
                                        </div>

                                        {(record?.time_in || record?.time_out) && (
                                            <div className="mb-4 grid gap-3 md:grid-cols-2">
                                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Time In</p>
                                                    <p className="mt-2 text-sm font-bold text-emerald-900">{formatAttendanceTimestamp(record?.time_in)}</p>
                                                </div>
                                                <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-sky-600">Time Out</p>
                                                    <p className="mt-2 text-sm font-bold text-sky-900">{formatAttendanceTimestamp(record?.time_out)}</p>
                                                </div>
                                            </div>
                                        )}

                                        {isTimedIn && isTimedOut ? (
                                            <div className="rounded-2xl border border-green-100 bg-green-50 p-5 text-center">
                                                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-green-600 shadow-sm">
                                                    <Icons.CheckCircle />
                                                </div>
                                                <p className="text-sm font-bold text-green-800">Attendance completed</p>
                                                <p className="mt-1 text-xs text-green-600">You have successfully checked in and checked out of this event.</p>
                                            </div>
                                        ) : isTimedIn ? (
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">
                                                    <Icons.CheckCircle />
                                                    You are already checked in for this event.
                                                </div>
                                                <button
                                                    disabled={!canTimeOut || isTimingOut}
                                                    onClick={() => handleTimeOut(selectedEvent)}
                                                    className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${!canTimeOut || isTimingOut
                                                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                        : 'bg-red-600 text-white hover:bg-red-700'
                                                        }`}
                                                >
                                                    {isTimingOut ? 'Processing...' : (canTimeOut ? 'Time Out' : `Time Out available after ${formatTimeLabel(selectedEvent.end_time || '')}`)}
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {canTimeIn && (
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event: any) => setProofFile(event.target.files?.[0] || null)}
                                                        className="block w-full text-xs text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                )}
                                                <button
                                                    disabled={!canTimeIn || isTimingIn}
                                                    onClick={() => handleTimeIn(selectedEvent)}
                                                    className={`w-full rounded-xl py-3 text-sm font-bold transition-all ${!canTimeIn || isTimingIn
                                                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-100 hover:bg-blue-700'
                                                        }`}
                                                >
                                                    {isTimingIn ? 'Processing...' : (canTimeIn ? 'Time In' : `Check-in opens at ${formatTimeLabel(selectedEvent.event_time)}`)}
                                                </button>
                                            </div>
                                        )}

                                        {isTimedOut && !ratedEvents.includes(selectedEvent.id) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedEvent(null);
                                                    handleRateEvent(selectedEvent);
                                                }}
                                                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-yellow-100 bg-yellow-50 py-3 text-sm font-bold text-yellow-700 transition-colors hover:bg-yellow-100"
                                            >
                                                <Icons.Star filled={true} />
                                                Rate this event
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })(), document.body)}

            {showRatingModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 student-mobile-modal-overlay">
                    <div className="absolute inset-0 animate-backdrop bg-black/60 backdrop-blur-sm" onClick={() => setShowRatingModal(false)} />
                    <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in student-mobile-modal-panel">
                        <div className="shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-5 text-white">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="mb-1 text-[10px] uppercase tracking-widest text-blue-200">Negros Oriental State University - CARE Center</p>
                                    <h3 className="text-lg font-extrabold tracking-tight">PARTICIPANT'S EVALUATION FORM</h3>
                                    <p className="mt-1 text-xs font-medium text-blue-200">{ratingForm.title}</p>
                                </div>
                                <button
                                    onClick={() => setShowRatingModal(false)}
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white transition-all hover:bg-white/25"
                                >
                                    x
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Name</label>
                                    <p className="text-sm font-bold text-gray-800">{personalInfo.firstName} {personalInfo.lastName}</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Sex</label>
                                    <p className="text-sm font-bold text-gray-800">{personalInfo.sex || '-'}</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">College / Campus</label>
                                    <p className="text-sm font-bold text-gray-800">{personalInfo.department || '-'}</p>
                                    <p className="text-[10px] text-gray-500">{personalInfo.course} - {personalInfo.year}</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">Date of Activity</label>
                                    <p className="text-sm font-bold text-gray-800">
                                        {ratingForm.date_of_activity
                                            ? new Date(ratingForm.date_of_activity).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                            : '-'}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-blue-800">Evaluation Criteria</h4>
                                <p className="mb-4 text-[10px] text-gray-500">
                                    Please rate each item: <span className="font-bold">1</span> = Poor, <span className="font-bold">2</span> = Below Average, <span className="font-bold">3</span> = Average, <span className="font-bold">4</span> = Above Average, <span className="font-bold">5</span> = Excellent
                                </p>
                                <div className="overflow-hidden rounded-xl border border-gray-200">
                                    <div className="grid grid-cols-[1fr_repeat(5,48px)] border-b border-gray-200 bg-gray-50">
                                        <div className="px-4 py-3 text-[10px] font-bold uppercase text-gray-500">Criteria</div>
                                        {['1', '2', '3', '4', '5'].map((value: string) => (
                                            <div key={value} className="flex items-center justify-center text-[10px] font-bold text-gray-500">{value}</div>
                                        ))}
                                    </div>
                                    {[
                                        { key: 'q1', label: 'Relevance of the activity to the needs/problems of the clientele' },
                                        { key: 'q2', label: 'Quality of the activity' },
                                        { key: 'q3', label: 'Timeliness' },
                                        { key: 'q4', label: 'Management of the activity' },
                                        { key: 'q5', label: 'Overall organization of the activity' },
                                        { key: 'q6', label: 'Overall assessment of the activity' },
                                        { key: 'q7', label: 'Skills/competence of the facilitator/s' }
                                    ].map((item: any, idx: number) => (
                                        <div key={item.key} className={`grid grid-cols-[1fr_repeat(5,48px)] border-b border-gray-100 transition-colors last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50 hover:bg-blue-50/30'}`}>
                                            <div className="flex items-center px-4 py-3 text-xs text-gray-700">
                                                <span className="mr-2 font-bold text-gray-500">{idx + 1}.</span>
                                                {item.label}
                                            </div>
                                            {[1, 2, 3, 4, 5].map((value: number) => (
                                                <div key={value} className="flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRatingForm({ ...ratingForm, [item.key]: value })}
                                                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 ${ratingForm[item.key] === value
                                                            ? 'scale-110 border-blue-600 bg-blue-600 shadow-lg shadow-blue-500/30'
                                                            : 'border-gray-300 hover:scale-105 hover:border-blue-400'
                                                            }`}
                                                    >
                                                        {ratingForm[item.key] === value && <div className="h-2 w-2 rounded-full bg-white" />}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-gray-700">What I like best about the activity:</label>
                                    <textarea
                                        rows={3}
                                        value={ratingForm.open_best}
                                        onChange={(event: any) => setRatingForm({ ...ratingForm, open_best: event.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Share what you enjoyed most..."
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-gray-700">My suggestions to further improve the activity:</label>
                                    <textarea
                                        rows={3}
                                        value={ratingForm.open_suggestions}
                                        onChange={(event: any) => setRatingForm({ ...ratingForm, open_suggestions: event.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="What could be improved..."
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-xs font-bold text-gray-700">Other comments:</label>
                                    <textarea
                                        rows={3}
                                        value={ratingForm.open_comments}
                                        onChange={(event: any) => setRatingForm({ ...ratingForm, open_comments: event.target.value })}
                                        className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-4 text-sm outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        placeholder="Any other feedback..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex shrink-0 gap-3 border-t border-gray-100 bg-gray-50/50 px-8 py-4">
                            <button
                                onClick={submitRating}
                                disabled={isSubmittingEventRating}
                                className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmittingEventRating ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                            <button
                                onClick={() => setShowRatingModal(false)}
                                className="rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-600 transition-all hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl px-6 py-4 text-white shadow-2xl backdrop-blur-sm animate-slide-in-right ${toast.type === 'error' ? 'bg-red-600/90' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? '!' : 'OK'}</div>
                    <div>
                        <p className="text-sm font-bold">{toast.type === 'error' ? 'Error' : 'Success'}</p>
                        <p className="text-xs opacity-90">{toast.message}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudentEventsView;
