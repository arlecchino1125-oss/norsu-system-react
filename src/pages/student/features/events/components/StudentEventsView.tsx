import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStudentEventsData } from '../hooks/useStudentEventsData';
import { getAudienceLabel, isAttendanceActivityType } from '../../../../../utils/eventAudience';
import { getTextInputLimitProps } from '../../../../../utils/inputSecurity';
import { AttendanceProofButton } from '../../../../../components/AttendanceProofButton';

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
    if (!isAttendanceActivityType(item?.type)) return { start: null, end: null };

    const start = combineDateAndTime(item.event_date, item.event_time);
    if (!start) return { start: null, end: null };

    const explicitEnd = combineDateAndTime(item.event_date, item.end_time);
    const end = explicitEnd || new Date(start.getTime() + 2 * 60 * 60 * 1000);
    return { start, end };
};

const getDisplayDate = (item: any) => formatDateLabel(item?.event_date || item?.created_at || '');
const getDisplayTime = (item: any) => {
    if (!isAttendanceActivityType(item?.type)) return `Posted ${formatDateLabel(item?.created_at || '')}`;
    return formatTimeRangeLabel(item?.event_time || '', item?.end_time || '');
};
const getDisplayLocation = (item: any) => item?.location || 'Location to be announced';

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

const StudentEventsView = ({
    eventFilter,
    setEventFilter,
    attendanceMap,
    registrationMap,
    fetchHistory,
    handleRegisterEvent,
    handleCancelRegistration,
    handleTimeIn,
    handleTimeOut,
    handleRateEvent,
    ratedEvents,
    isTimingIn,
    timingOutEventId,
    registeringEventId,
    cancellingRegistrationEventId,
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
    showToast,
    Icons
}: any) => {
    const [eventsList, setEventsList] = useState<any[]>([]);
    const [eventsPage, setEventsPage] = useState(1);

    // No mount-refetch: React Query fetches when the cache is empty and the
    // 2-minute staleness policy governs the rest. refetch() would bypass it.
    useStudentEventsData({
        setEventsList,
        personalInfo
    });

    useEffect(() => {
        setEventsPage(1);
    }, [eventFilter]);

    const filteredEvents = (eventsList || []).filter((item: any) => {
        if (eventFilter === 'Activities') return isAttendanceActivityType(item.type);
        if (eventFilter === 'Announcements') return item.type === 'Announcement';
        return true;
    });
    const totalEventsCount = eventsList.length;
    const activityCount = eventsList.filter((item: any) => isAttendanceActivityType(item.type)).length;
    const announcementCount = eventsList.filter((item: any) => item.type === 'Announcement').length;

    const EVENTS_PAGE_SIZE = 5;
    const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
    const safeEventsPage = Math.min(eventsPage, totalEventPages);
    const pagedEvents = filteredEvents.slice((safeEventsPage - 1) * EVENTS_PAGE_SIZE, safeEventsPage * EVENTS_PAGE_SIZE);

    const isRegistrationEvent = (item: any) => item?.participation_mode === 'registration_required';
    const getRegistrationRecord = (item: any) => registrationMap?.[String(item?.id)] || registrationMap?.[item?.id];
    const isRegistrationDeadlinePassed = (item: any) => {
        if (!item?.registration_deadline) return false;
        const deadline = new Date(item.registration_deadline);
        return !Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime();
    };
    const formatRegistrationDeadline = (value: string) => {
        if (!value) return 'No deadline';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };
    const getRegistrationStatus = (item: any, isTimedIn = false) => {
        const registration = getRegistrationRecord(item);
        if (isTimedIn) return 'Attended';
        return registration?.status || 'Not registered';
    };
    const getRegistrationStatusClass = (status: string) => {
        if (status === 'Attended') return 'bg-emerald-100 text-emerald-700';
        if (status === 'Registered') return 'bg-blue-100 text-blue-700';
        if (status === 'Cancelled') return 'bg-slate-100 text-slate-500';
        return 'bg-amber-100 text-amber-700';
    };
    const hasActiveRegistration = (item: any, isTimedIn = false) => {
        const status = getRegistrationStatus(item, isTimedIn);
        return status === 'Registered' || status === 'Attended';
    };
    const renderRegistrationPanel = (item: any, isTimedIn = false, compact = false) => {
        if (!isRegistrationEvent(item)) return null;

        const eventId = String(item?.id || '');
        const status = getRegistrationStatus(item, isTimedIn);
        const canRegister = !isTimedIn && !['Registered', 'Attended'].includes(status) && !isRegistrationDeadlinePassed(item);
        const canCancel = !isTimedIn && status === 'Registered';
        const isRegistering = registeringEventId === eventId;
        const isCancelling = cancellingRegistrationEventId === eventId;
        const capacityLabel = item.capacity ? `${item.capacity} slots` : 'Unlimited slots';

        return (
            <div className={`rounded-xl border border-emerald-100 bg-emerald-50/70 ${compact ? 'p-2.5' : 'p-3 sm:p-4'} text-[11px] text-emerald-900 sm:text-xs`} onClick={(event: any) => event.stopPropagation()}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-black">Student registration</span>
                    <span className={`rounded-full px-2.5 py-1 font-bold ${getRegistrationStatusClass(status)}`}>
                        {status}
                    </span>
                </div>
                <div className="mb-3 grid gap-1 text-[11px] font-semibold text-emerald-800 sm:grid-cols-2">
                    <span>{capacityLabel}</span>
                    <span>Deadline: {formatRegistrationDeadline(item.registration_deadline)}</span>
                    <span>{item.allow_walk_ins ? 'Walk-ins allowed' : 'Registration required before time in'}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    {canRegister && (
                        <button
                            onClick={() => handleRegisterEvent(item)}
                            disabled={isRegistering}
                            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRegistering ? 'Registering...' : 'Register'}
                        </button>
                    )}
                    {canCancel && (
                        <button
                            onClick={() => handleCancelRegistration(item)}
                            disabled={isCancelling}
                            className="flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 font-black text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isCancelling ? 'Cancelling...' : 'Cancel Registration'}
                        </button>
                    )}
                    {!canRegister && !canCancel && status === 'Not registered' && (
                        <span className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-center font-black text-amber-700">
                            Registration closed
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="student-events-root mx-auto max-w-6xl space-y-3 page-transition sm:space-y-5">
                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500 sm:text-[10px] sm:tracking-[0.16em]">Student Services</p>
                            <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-2xl">Events & Announcements</h2>
                            <p className="mt-1 max-w-xl text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">Stay updated with campus activities and important news.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:w-80 sm:shrink-0">
                            <button
                                type="button"
                                onClick={() => setEventFilter('All')}
                                className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${eventFilter === 'All' ? 'border-blue-300 bg-blue-100 shadow-sm' : 'border-blue-100 bg-blue-50 hover:bg-blue-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-blue-600 sm:text-[9px] sm:tracking-[0.12em]">All</p>
                                <p className="mt-1 text-lg font-black leading-none text-blue-950 sm:text-xl">{totalEventsCount}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEventFilter('Activities')}
                                className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${eventFilter === 'Activities' ? 'border-emerald-300 bg-emerald-100 shadow-sm' : 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-emerald-600 sm:text-[9px] sm:tracking-[0.12em]">Activities</p>
                                <p className="mt-1 text-lg font-black leading-none text-emerald-950 sm:text-xl">{activityCount}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setEventFilter('Announcements')}
                                className={`rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${eventFilter === 'Announcements' ? 'border-sky-300 bg-sky-100 shadow-sm' : 'border-sky-100 bg-sky-50 hover:bg-sky-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.04em] text-sky-600 sm:text-[9px] sm:tracking-[0.08em]">News</p>
                                <p className="mt-1 text-lg font-black leading-none text-sky-950 sm:text-xl">{announcementCount}</p>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="mb-3 sm:mb-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">Campus Board</p>
                            <div className="mt-1 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-black text-slate-950 sm:text-base">Available updates</h3>
                                <button
                                    type="button"
                                    onClick={fetchHistory}
                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                    aria-label="Refresh events"
                                    title="Refresh"
                                >
                                    <Icons.Clock />
                                </button>
                            </div>
                        </div>
                    </div>

                    {filteredEvents.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:mt-4 sm:rounded-2xl sm:p-8">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                                <Icons.Events />
                            </div>
                            <h3 className="mt-3 text-sm font-black text-slate-950 sm:mt-4 sm:text-base">No items available</h3>
                            <p className="mx-auto mt-2 max-w-xs text-[12px] leading-5 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-6">New activities and announcements from the care staff will appear here when they are ready for you.</p>
                        </div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 sm:mt-4">
                            {pagedEvents.map((item: any, idx: number) => {
                                const record = attendanceMap[item.id];
                                const isTimedIn = Boolean(record?.time_in);
                                const isTimedOut = Boolean(record?.time_out);
                                const isTimingOut = timingOutEventId === String(item.id);
                                const isAttendanceActivity = isAttendanceActivityType(item.type);
                                const { start, end } = getEventWindow(item);
                                const now = new Date();
                                const canTimeIn = isAttendanceActivity && Boolean(start) && now >= (start as Date) && !isTimedIn;
                                const canTimeOut = isAttendanceActivity && Boolean(end) && isTimedIn && !isTimedOut && now >= (end as Date);
                                const mustRegisterForTimeIn = isRegistrationEvent(item) && !item.allow_walk_ins;
                                const canUseTimeIn = canTimeIn && (!mustRegisterForTimeIn || hasActiveRegistration(item, isTimedIn));
                                const timeInLabel = isTimedIn
                                    ? 'Checked In'
                                    : isTimingIn
                                        ? 'Processing...'
                                        : mustRegisterForTimeIn && !hasActiveRegistration(item, isTimedIn)
                                            ? 'Register before Time In'
                                            : (start ? `Time In opens ${formatTimeLabel(item.event_time)}` : 'Time In unavailable');

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedEvent(item)}
                                        className={`student-events-card group flex min-h-[132px] cursor-pointer flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-all animate-fade-in-up hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:min-h-[164px] sm:rounded-2xl sm:p-4 ${isAttendanceActivity ? 'border-blue-100 hover:border-blue-200 hover:bg-blue-50/30' : 'border-slate-200 hover:border-sky-200 hover:bg-sky-50/20'}`}
                                        style={{ animationDelay: `${idx * 70}ms` }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(event: any) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                setSelectedEvent(item);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${isAttendanceActivity ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-sky-100 bg-sky-50 text-sky-600'}`}>
                                                    <Icons.Events />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${isAttendanceActivity ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-sky-100 bg-sky-50 text-sky-700'}`}>
                                                        {item.type}
                                                    </span>
                                                    <h4 className="mt-2 line-clamp-2 text-[13px] font-black leading-5 text-slate-950 transition-colors group-hover:text-blue-700 sm:text-sm" title={item.title}>
                                                        {item.title || 'Untitled update'}
                                                    </h4>
                                                </div>
                                            </div>
                                            {isAttendanceActivity && isTimedIn && (
                                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">
                                                    <Icons.CheckCircle />
                                                    In
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-3 grid gap-1.5 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs">
                                            <p className="flex min-w-0 items-center gap-2">
                                                <Icons.Events />
                                                <span className="truncate">{getDisplayDate(item)}</span>
                                            </p>
                                            <p className="flex min-w-0 items-center gap-2">
                                                <Icons.Clock />
                                                <span className="truncate">{getDisplayTime(item)}</span>
                                            </p>
                                            {isAttendanceActivity && (
                                                <p className="flex min-w-0 items-center gap-2">
                                                    <Icons.Support />
                                                    <span className="truncate">{getDisplayLocation(item)}</span>
                                                </p>
                                            )}
                                            {isAttendanceActivity && (
                                                <p className="flex min-w-0 items-center gap-2">
                                                    <Icons.CheckCircle />
                                                    <span className="truncate">{getAudienceLabel(item)}</span>
                                                </p>
                                            )}
                                        </div>

                                        {isRegistrationEvent(item) && (
                                            <div className="mt-3">
                                                {renderRegistrationPanel(item, isTimedIn, true)}
                                            </div>
                                        )}

                                        {isAttendanceActivity && (
                                            <div className="mt-3 flex flex-col gap-2" onClick={(event: any) => event.stopPropagation()}>
                                                {!isTimedIn && canUseTimeIn && (
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event: any) => setProofFile(event.target.files?.[0] || null)}
                                                        className="block w-full text-[11px] text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-[11px] file:font-black file:text-blue-700 hover:file:bg-blue-100"
                                                    />
                                                )}

                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <button
                                                        disabled={!canUseTimeIn || isTimingIn || isTimedIn}
                                                        onClick={() => handleTimeIn(item)}
                                                        className={`flex-1 rounded-xl px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${isTimedIn
                                                            ? 'cursor-default border border-emerald-200 bg-emerald-100 text-emerald-700'
                                                            : (!canUseTimeIn || isTimingIn
                                                                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                                                : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500')
                                                            }`}
                                                    >
                                                        {timeInLabel}
                                                    </button>
                                                    <button
                                                        disabled={!canTimeOut || isTimingOut}
                                                        onClick={() => handleTimeOut(item)}
                                                        className={`flex-1 rounded-xl px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${isTimedOut
                                                            ? 'cursor-default bg-slate-100 text-slate-400'
                                                            : (!canTimeOut || isTimingOut
                                                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                                                : 'bg-rose-600 text-white shadow-sm hover:bg-rose-500')
                                                            }`}
                                                    >
                                                        {isTimedOut ? 'Completed' : (isTimingOut ? 'Processing...' : (end ? `Time Out after ${formatTimeLabel(item.end_time || '')}` : 'Time Out unavailable'))}
                                                    </button>
                                                </div>

                                                {isTimedOut && !ratedEvents.includes(item.id) && (
                                                    <button
                                                        onClick={() => handleRateEvent(item)}
                                                        className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[11px] font-black text-amber-700 shadow-sm transition-all hover:bg-amber-100 sm:text-xs"
                                                    >
                                                        <Icons.Star filled={true} />
                                                        Rate
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-auto flex justify-end pt-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-blue-600">View details</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalEventPages > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2 sm:mt-5">
                            <button
                                type="button"
                                onClick={() => setEventsPage((prev) => Math.max(1, prev - 1))}
                                disabled={safeEventsPage <= 1}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs"
                            >
                                Previous
                            </button>
                            <span className="text-[11px] font-black text-slate-500 sm:text-xs">
                                Page {safeEventsPage} of {totalEventPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setEventsPage((prev) => Math.min(totalEventPages, prev + 1))}
                                disabled={safeEventsPage >= totalEventPages}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-xs"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </section>
            </div>

            {selectedEvent && createPortal((() => {
                const record = attendanceMap[selectedEvent.id];
                const isTimedIn = Boolean(record?.time_in);
                const isTimedOut = Boolean(record?.time_out);
                const isTimingOut = timingOutEventId === String(selectedEvent.id);
                const isAttendanceActivity = isAttendanceActivityType(selectedEvent.type);
                const { start, end } = getEventWindow(selectedEvent);
                const now = new Date();
                const canTimeIn = isAttendanceActivity && Boolean(start) && now >= (start as Date) && !isTimedIn;
                const canTimeOut = isAttendanceActivity && Boolean(end) && isTimedIn && !isTimedOut && now >= (end as Date);
                const mustRegisterForTimeIn = isRegistrationEvent(selectedEvent) && !selectedEvent.allow_walk_ins;
                const canUseTimeIn = canTimeIn && (!mustRegisterForTimeIn || hasActiveRegistration(selectedEvent, isTimedIn));
                const timeInLabel = isTimingIn
                    ? 'Processing...'
                    : mustRegisterForTimeIn && !hasActiveRegistration(selectedEvent, isTimedIn)
                        ? 'Register before Time In'
                        : (canTimeIn ? 'Time In' : `Check-in opens at ${formatTimeLabel(selectedEvent.event_time)}`);

                return (
                    <div
                        className="fixed inset-0 z-[9998] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <div
                            className="student-detail-modal-panel flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel"
                            onClick={(event: any) => event.stopPropagation()}
                        >
                            <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Event Details</p>
                                        <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight text-white sm:text-lg">{selectedEvent.title}</h3>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-slate-100">
                                                {selectedEvent.type}
                                            </span>
                                            {isAttendanceActivity && (
                                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${isTimedOut
                                                    ? 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100'
                                                    : isTimedIn
                                                        ? 'border-blue-300/20 bg-blue-400/15 text-blue-100'
                                                        : 'border-white/10 bg-white/10 text-slate-300'
                                                    }`}>
                                                    {isTimedOut ? 'Completed' : isTimedIn ? 'Checked in' : 'Pending'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedEvent(null)}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                        aria-label="Close event details"
                                    >
                                        <CloseIcon />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 student-mobile-modal-scroll-panel sm:p-5">
                                <div className="space-y-3">
                                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Description</h4>
                                        <p className="mt-2 text-[12px] leading-5 text-slate-700 sm:text-sm sm:leading-6">
                                            {selectedEvent.description || 'No additional details provided.'}
                                        </p>
                                    </section>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">Date</p>
                                            <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-blue-950 sm:text-sm">
                                                <Icons.Events />
                                                <span className="min-w-0 break-words">{getDisplayDate(selectedEvent)}</span>
                                            </p>
                                        </div>
                                        <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-600">{isAttendanceActivity ? 'Time' : 'Posted'}</p>
                                            <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-sky-950 sm:text-sm">
                                                <Icons.Clock />
                                                <span className="min-w-0 break-words">{getDisplayTime(selectedEvent)}</span>
                                            </p>
                                        </div>
                                        {isAttendanceActivity && (
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Location</p>
                                                <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-slate-900 sm:text-sm">
                                                    <Icons.Support />
                                                    <span className="min-w-0 break-words">{getDisplayLocation(selectedEvent)}</span>
                                                </p>
                                            </div>
                                        )}
                                        {isAttendanceActivity && (
                                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Audience</p>
                                                <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-emerald-950 sm:text-sm">
                                                    <Icons.CheckCircle />
                                                    <span className="min-w-0 break-words">{getAudienceLabel(selectedEvent)}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {isAttendanceActivity && (
                                        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <h4 className="text-sm font-black text-slate-950 sm:text-base">Attendance</h4>
                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
                                                    {isTimedOut ? 'Completed' : isTimedIn ? 'Checked in' : 'Pending'}
                                                </span>
                                            </div>

                                            {(record?.time_in || record?.time_out) && (
                                                <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Time In</p>
                                                        <p className="mt-1 text-xs font-black leading-5 text-emerald-950 sm:text-sm">{formatAttendanceTimestamp(record?.time_in)}</p>
                                                    </div>
                                                    <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-600">Time Out</p>
                                                        <p className="mt-1 text-xs font-black leading-5 text-sky-950 sm:text-sm">{formatAttendanceTimestamp(record?.time_out)}</p>
                                                    </div>
                                                </div>
                                            )}

                                            {record?.proof_url && record?.id && (
                                                <AttendanceProofButton
                                                    storedReference={record.proof_url}
                                                    attendanceId={Number(record.id)}
                                                    className="mb-3 text-xs font-black text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-50"
                                                    onError={(message) => showToast(message, 'error')}
                                                />
                                            )}

                                            {isRegistrationEvent(selectedEvent) && (
                                                <div className="mb-3">
                                                    {renderRegistrationPanel(selectedEvent, isTimedIn)}
                                                </div>
                                            )}

                                            {isTimedIn && isTimedOut ? (
                                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                                                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                                        <Icons.CheckCircle />
                                                    </div>
                                                    <p className="text-sm font-black text-emerald-900">Attendance completed</p>
                                                    <p className="mt-1 text-[12px] leading-5 text-emerald-700">You have successfully checked in and checked out of this event.</p>
                                                </div>
                                            ) : isTimedIn ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-black leading-5 text-emerald-800 sm:text-sm">
                                                        <Icons.CheckCircle />
                                                        You are already checked in for this event.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={!canTimeOut || isTimingOut}
                                                        onClick={() => handleTimeOut(selectedEvent)}
                                                        className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all ${!canTimeOut || isTimingOut
                                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                                            : 'bg-rose-600 text-white hover:bg-rose-500'
                                                            }`}
                                                    >
                                                        {isTimingOut ? 'Processing...' : (canTimeOut ? 'Time Out' : `Time Out available after ${formatTimeLabel(selectedEvent.end_time || '')}`)}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {canUseTimeIn && (
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(event: any) => setProofFile(event.target.files?.[0] || null)}
                                                            className="block w-full text-[11px] text-slate-500 file:mr-3 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-[11px] file:font-black file:text-blue-700 hover:file:bg-blue-100"
                                                        />
                                                    )}
                                                    <button
                                                        type="button"
                                                        disabled={!canUseTimeIn || isTimingIn}
                                                        onClick={() => handleTimeIn(selectedEvent)}
                                                        className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all ${!canUseTimeIn || isTimingIn
                                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                                            : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                                                            }`}
                                                    >
                                                        {timeInLabel}
                                                    </button>
                                                </div>
                                            )}

                                            {isTimedOut && !ratedEvents.includes(selectedEvent.id) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedEvent(null);
                                                        handleRateEvent(selectedEvent);
                                                    }}
                                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                                                >
                                                    <Icons.Star filled={true} />
                                                    Rate this event
                                                </button>
                                            )}
                                        </section>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })(), document.body)}

            {showRatingModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-transparent p-3 student-mobile-modal-overlay sm:items-center sm:p-4">
                    <div className="absolute inset-0 bg-transparent" onClick={() => setShowRatingModal(false)} />
                    <div className="student-rating-modal-panel relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in student-mobile-modal-panel">
                        <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Event Evaluation</p>
                                    <h3 className="mt-1 text-[15px] font-black leading-tight text-white sm:text-lg">Participant Evaluation</h3>
                                    <p className="mt-1 line-clamp-2 text-[12px] font-semibold leading-5 text-slate-300 sm:text-xs">{ratingForm.title}</p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close evaluation form"
                                    onClick={() => setShowRatingModal(false)}
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                                >
                                    <CloseIcon />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-slate-50 p-4 student-mobile-modal-scroll-panel sm:p-5">
                            <div className="space-y-3">
                                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        <div className="min-w-0">
                                            <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Name</label>
                                            <p className="truncate text-[12px] font-black text-slate-900 sm:text-sm">{personalInfo.firstName} {personalInfo.lastName}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Sex</label>
                                            <p className="truncate text-[12px] font-black text-slate-900 sm:text-sm">{personalInfo.sex || '-'}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">College</label>
                                            <p className="truncate text-[12px] font-black text-slate-900 sm:text-sm">{personalInfo.department || '-'}</p>
                                            <p className="truncate text-[10px] font-semibold text-slate-500">{personalInfo.course} - {personalInfo.year}</p>
                                        </div>
                                        <div className="min-w-0">
                                            <label className="mb-1 block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Activity Date</label>
                                            <p className="text-[12px] font-black leading-5 text-slate-900 sm:text-sm">
                                                {ratingForm.date_of_activity
                                                    ? new Date(ratingForm.date_of_activity).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                    : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Evaluation Criteria</h4>
                                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                                        Rate each item from <span className="font-black text-slate-700">1</span> poor to <span className="font-black text-slate-700">5</span> excellent.
                                    </p>
                                    <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                                        <div className="grid grid-cols-[1fr_repeat(5,2rem)] border-b border-slate-200 bg-slate-50 sm:grid-cols-[1fr_repeat(5,2.75rem)]">
                                            <div className="px-3 py-2.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">Criteria</div>
                                            {['1', '2', '3', '4', '5'].map((value: string) => (
                                                <div key={value} className="flex items-center justify-center text-[10px] font-black text-slate-500">{value}</div>
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
                                            <div key={item.key} className={`grid grid-cols-[1fr_repeat(5,2rem)] border-b border-slate-100 transition-colors last:border-0 sm:grid-cols-[1fr_repeat(5,2.75rem)] ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                                                <div className="flex items-center px-3 py-2.5 text-[11px] leading-4 text-slate-700 sm:text-xs">
                                                    <span className="mr-2 font-black text-slate-500">{idx + 1}.</span>
                                                    {item.label}
                                                </div>
                                                {[1, 2, 3, 4, 5].map((value: number) => (
                                                    <div key={value} className="flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRatingForm({ ...ratingForm, [item.key]: value })}
                                                            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${ratingForm[item.key] === value
                                                                ? 'border-blue-600 bg-blue-600 shadow-sm'
                                                                : 'border-slate-300 hover:border-blue-400'
                                                                }`}
                                                        >
                                                            {ratingForm[item.key] === value && <div className="h-2 w-2 rounded-full bg-white" />}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="mb-1.5 block text-[12px] font-black text-slate-700">What I like best about the activity:</label>
                                            <textarea
                                                {...getTextInputLimitProps('notes')}
                                                rows={3}
                                                value={ratingForm.open_best}
                                                onChange={(event: any) => setRatingForm({ ...ratingForm, open_best: event.target.value })}
                                                className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                                placeholder="Share what you enjoyed most..."
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-[12px] font-black text-slate-700">My suggestions to further improve the activity:</label>
                                            <textarea
                                                {...getTextInputLimitProps('notes')}
                                                rows={3}
                                                value={ratingForm.open_suggestions}
                                                onChange={(event: any) => setRatingForm({ ...ratingForm, open_suggestions: event.target.value })}
                                                className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                                placeholder="What could be improved..."
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1.5 block text-[12px] font-black text-slate-700">Other comments:</label>
                                            <textarea
                                                {...getTextInputLimitProps('notes')}
                                                rows={3}
                                                value={ratingForm.open_comments}
                                                onChange={(event: any) => setRatingForm({ ...ratingForm, open_comments: event.target.value })}
                                                className="w-full resize-none rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[12px] leading-5 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:text-sm"
                                                placeholder="Any other feedback..."
                                            />
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:px-5">
                            <button
                                type="button"
                                onClick={submitRating}
                                disabled={isSubmittingEventRating}
                                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 btn-press"
                            >
                                {isSubmittingEventRating ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowRatingModal(false)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition-all hover:bg-slate-50 sm:w-auto"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {toast && (
                <div className={`fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-2xl backdrop-blur-sm animate-slide-in-right sm:bottom-6 sm:left-auto sm:right-6 sm:px-6 sm:py-4 ${toast.type === 'error' ? 'bg-red-600/90' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
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
