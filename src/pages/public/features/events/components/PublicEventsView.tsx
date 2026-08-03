import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import * as Icons from '../../../../student/components/StudentPortalIcons';
import { getAudienceLabel, isAttendanceActivityType } from '../../../../../utils/eventAudience';
import { getEventWindows } from '../../../../../utils/eventWindows';
import {
    formatAttendanceTimestamp,
    formatDateLabel,
    formatTimeLabel,
    formatTimeRangeLabel
} from '../../../../../utils/eventFormat';
import type { PublicEvent, PublicEventStatus } from '../publicEventsService';

const getEventWindow = (item: any) => {
    if (!isAttendanceActivityType(item?.type)) {
        return { start: null, end: null, closesAt: null };
    }
    return getEventWindows(item);
};

const getDisplayDate = (item: any) => formatDateLabel(item?.event_date || item?.created_at || '');
const getDisplayTime = (item: any) => {
    if (!isAttendanceActivityType(item?.type)) return `Posted ${formatDateLabel(item?.created_at || '')}`;
    return formatTimeRangeLabel(item?.event_time || '', item?.end_time || '');
};
const getDisplayLocation = (item: any) => item?.location || 'Location to be announced';

const needsRegistration = (item: any) =>
    item?.participation_mode === 'registration_required' && !item?.allow_walk_ins;

const CloseIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

/**
 * Everything the portal is allowed to compute about one event for one student.
 * The same rules run again inside the RPCs -- this only decides what to render.
 *
 * These are the same rules the student portal applies:
 *   - Time in opens at the start.
 *   - Time out opens when the event ends.
 *   - Rating and the evaluation form need the event to have ended, and nothing
 *     else -- neither is gated on attendance.
 *   - All four close at the event's single closing date, which is also when the
 *     card archives out of view.
 */
const getEventState = (item: PublicEvent, status: PublicEventStatus | undefined) => {
    const isAttendanceActivity = isAttendanceActivityType(item.type);
    const { start, end, closesAt } = getEventWindow(item);
    const now = new Date();

    const isTimedIn = Boolean(status?.time_in);
    const isTimedOut = Boolean(status?.time_out);
    const hasWindow = Boolean(start) && Boolean(closesAt);
    const isEventEnded = Boolean(end) && now >= (end as Date);
    const isTimeInClosed = isAttendanceActivity && Boolean(closesAt) && now > (closesAt as Date);

    return {
        isAttendanceActivity,
        start,
        end,
        isTimedIn,
        isTimedOut,
        isEventEnded,
        isTimeInClosed,
        canTimeIn: isAttendanceActivity && hasWindow && now >= (start as Date) && !isTimeInClosed && !isTimedIn,
        canTimeOut: isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut && !isTimeInClosed,
        canRate: isAttendanceActivity && isEventEnded && !isTimeInClosed && !status?.rated,
        canEvaluate: isAttendanceActivity && isEventEnded && !isTimeInClosed
            && Boolean(status?.has_evaluation_form) && !status?.evaluated
    };
};

interface PublicEventsViewProps {
    eventsList: PublicEvent[];
    statusMap: Record<number, PublicEventStatus>;
    isSignedIn: boolean;
    isLoading: boolean;
    isError: boolean;
    timingInEventId: number | null;
    timingOutEventId: number | null;
    onRefresh: () => void;
    onTimeIn: (event: PublicEvent) => void;
    onTimeOut: (event: PublicEvent) => void;
    onRate: (event: PublicEvent) => void;
    onEvaluate: (event: PublicEvent) => void;
}

const EventDetailModal = ({
    item, status, isSignedIn, timingInEventId, timingOutEventId, onClose, onTimeIn, onTimeOut, onRate, onEvaluate
}: any) => {
    const state = getEventState(item, status);
    const isTimingIn = timingInEventId === item.id;
    const isTimingOut = timingOutEventId === item.id;

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-end justify-center bg-transparent p-3 sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div
                className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-scale-in"
                onClick={(clickEvent: any) => clickEvent.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-4 py-4 text-white sm:px-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-300">Event Details</p>
                            <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight text-white sm:text-lg">{item.title}</h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-slate-100">
                                    {item.type}
                                </span>
                                {state.isAttendanceActivity && isSignedIn && (
                                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${state.isTimedOut
                                        ? 'border-emerald-300/20 bg-emerald-400/15 text-emerald-100'
                                        : state.isTimedIn
                                            ? 'border-blue-300/20 bg-blue-400/15 text-blue-100'
                                            : 'border-white/10 bg-white/10 text-slate-300'
                                        }`}>
                                        {state.isTimedOut ? 'Completed' : state.isTimedIn ? 'Checked in' : 'Pending'}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15"
                            aria-label="Close event details"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                    <div className="space-y-3">
                        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                            <h4 className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">Description</h4>
                            <p className="mt-2 text-[12px] leading-5 text-slate-700 sm:text-sm sm:leading-6">
                                {item.description || 'No additional details provided.'}
                            </p>
                        </section>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-600">Date</p>
                                <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-blue-950 sm:text-sm">
                                    <Icons.Events />
                                    <span className="min-w-0 break-words">{getDisplayDate(item)}</span>
                                </p>
                            </div>
                            <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                                <p className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-600">{state.isAttendanceActivity ? 'Time' : 'Posted'}</p>
                                <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-sky-950 sm:text-sm">
                                    <Icons.Clock />
                                    <span className="min-w-0 break-words">{getDisplayTime(item)}</span>
                                </p>
                            </div>
                            {state.isAttendanceActivity && (
                                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Location</p>
                                    <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-slate-900 sm:text-sm">
                                        <Icons.Support />
                                        <span className="min-w-0 break-words">{getDisplayLocation(item)}</span>
                                    </p>
                                </div>
                            )}
                            {state.isAttendanceActivity && (
                                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Audience</p>
                                    <p className="mt-1 flex min-w-0 items-center gap-2 text-xs font-black text-emerald-950 sm:text-sm">
                                        <Icons.CheckCircle />
                                        <span className="min-w-0 break-words">{getAudienceLabel(item)}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {state.isAttendanceActivity && (
                            <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h4 className="text-sm font-black text-slate-950 sm:text-base">Attendance</h4>
                                    {isSignedIn && (
                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-600">
                                            {state.isTimedOut ? 'Completed' : state.isTimedIn ? 'Checked in' : 'Pending'}
                                        </span>
                                    )}
                                </div>

                                {(status?.time_in || status?.time_out) && (
                                    <div className="mb-3 grid gap-2 sm:grid-cols-2">
                                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Time In</p>
                                            <p className="mt-1 text-xs font-black leading-5 text-emerald-950 sm:text-sm">{formatAttendanceTimestamp(status?.time_in || '')}</p>
                                        </div>
                                        <div className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2">
                                            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-sky-600">Time Out</p>
                                            <p className="mt-1 text-xs font-black leading-5 text-sky-950 sm:text-sm">{formatAttendanceTimestamp(status?.time_out || '')}</p>
                                        </div>
                                    </div>
                                )}

                                {needsRegistration(item) && (
                                    <p className="mb-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">
                                        This event requires registration. Register in the student portal before timing in.
                                    </p>
                                )}

                                {state.isTimedIn && state.isTimedOut ? (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center">
                                        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                                            <Icons.CheckCircle />
                                        </div>
                                        <p className="text-sm font-black text-emerald-900">Attendance completed</p>
                                        <p className="mt-1 text-[12px] leading-5 text-emerald-700">You have successfully timed in and timed out of this event.</p>
                                    </div>
                                ) : state.isTimedIn ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[12px] font-black leading-5 text-emerald-800 sm:text-sm">
                                            <Icons.CheckCircle />
                                            You are already timed in for this event.
                                        </div>
                                        <button
                                            type="button"
                                            disabled={!state.canTimeOut || isTimingOut}
                                            onClick={() => onTimeOut(item)}
                                            className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all ${!state.canTimeOut || isTimingOut
                                                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                                : 'bg-rose-600 text-white hover:bg-rose-500'
                                                }`}
                                        >
                                            {isTimingOut ? 'Processing...' : (state.canTimeOut ? 'Time Out' : `Time Out available after ${formatTimeLabel(item.end_time || '')}`)}
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={!state.canTimeIn || isTimingIn}
                                        onClick={() => onTimeIn(item)}
                                        className={`w-full rounded-xl px-4 py-3 text-sm font-black transition-all ${!state.canTimeIn || isTimingIn
                                            ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                            : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500'
                                            }`}
                                    >
                                        {isTimingIn
                                            ? 'Processing...'
                                            : state.isTimeInClosed
                                                ? 'Time In closed'
                                                : state.canTimeIn
                                                    ? 'Time In'
                                                    : `Time In opens ${formatTimeLabel(item.event_time || '')}`}
                                    </button>
                                )}

                                {state.canRate && (
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); onRate(item); }}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-3 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                                    >
                                        <Icons.Star filled={true} />
                                        Rate this event
                                    </button>
                                )}

                                {/* Separate from the rating above: staff may attach their own
                                evaluation form, and both are filled independently. */}
                                {state.canEvaluate && (
                                    <button
                                        type="button"
                                        onClick={() => { onClose(); onEvaluate(item); }}
                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 py-3 text-sm font-black text-purple-700 transition-colors hover:bg-purple-100"
                                    >
                                        Answer evaluation form
                                    </button>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const EVENTS_PAGE_SIZE = 5;

export default function PublicEventsView({
    eventsList,
    statusMap,
    isSignedIn,
    isLoading,
    isError,
    timingInEventId,
    timingOutEventId,
    onRefresh,
    onTimeIn,
    onTimeOut,
    onRate,
    onEvaluate
}: PublicEventsViewProps) {
    const [eventFilter, setEventFilter] = useState('All');
    const [eventsPage, setEventsPage] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

    const filteredEvents = eventsList.filter((item) => {
        if (eventFilter === 'Activities') return isAttendanceActivityType(item.type);
        if (eventFilter === 'Announcements') return item.type === 'Announcement';
        return true;
    });
    const activityCount = eventsList.filter((item) => isAttendanceActivityType(item.type)).length;
    const announcementCount = eventsList.filter((item) => item.type === 'Announcement').length;

    const totalEventPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PAGE_SIZE));
    const safeEventsPage = Math.min(eventsPage, totalEventPages);
    const pagedEvents = filteredEvents.slice((safeEventsPage - 1) * EVENTS_PAGE_SIZE, safeEventsPage * EVENTS_PAGE_SIZE);

    const selectEventFilter = (nextFilter: string) => {
        setEventFilter(nextFilter);
        setEventsPage(1);
    };

    return (
        <>
            <div className="mx-auto max-w-6xl space-y-3 page-transition sm:space-y-5">
                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500 sm:text-[10px] sm:tracking-[0.16em]">Student Services</p>
                            <h2 className="mt-1 text-lg font-black leading-tight text-slate-950 sm:text-2xl">Events &amp; Announcements</h2>
                            <p className="mt-1 max-w-xl text-[12px] leading-5 text-slate-500 sm:text-sm sm:leading-6">Stay updated with campus activities and important news.</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:w-80 sm:shrink-0">
                            <button
                                type="button"
                                onClick={() => selectEventFilter('All')}
                                className={`rounded-xl border px-3 py-2 text-left transition ${eventFilter === 'All' ? 'border-blue-300 bg-blue-100 shadow-sm' : 'border-blue-100 bg-blue-50 hover:bg-blue-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-blue-600 sm:text-[9px] sm:tracking-[0.12em]">All</p>
                                <p className="mt-1 text-lg font-black leading-none text-blue-950 sm:text-xl">{eventsList.length}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => selectEventFilter('Activities')}
                                className={`rounded-xl border px-3 py-2 text-left transition ${eventFilter === 'Activities' ? 'border-emerald-300 bg-emerald-100 shadow-sm' : 'border-emerald-100 bg-emerald-50 hover:bg-emerald-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-emerald-600 sm:text-[9px] sm:tracking-[0.12em]">Activities</p>
                                <p className="mt-1 text-lg font-black leading-none text-emerald-950 sm:text-xl">{activityCount}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => selectEventFilter('Announcements')}
                                className={`rounded-xl border px-3 py-2 text-left transition ${eventFilter === 'Announcements' ? 'border-sky-300 bg-sky-100 shadow-sm' : 'border-sky-100 bg-sky-50 hover:bg-sky-100'}`}
                            >
                                <p className="text-[8px] font-black uppercase tracking-[0.04em] text-sky-600 sm:text-[9px] sm:tracking-[0.08em]">News</p>
                                <p className="mt-1 text-lg font-black leading-none text-sky-950 sm:text-xl">{announcementCount}</p>
                            </button>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
                    <div className="mb-3 sm:mb-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400 sm:text-[10px] sm:tracking-[0.16em]">Campus Board</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-black text-slate-950 sm:text-base">Available updates</h3>
                            <button
                                type="button"
                                onClick={onRefresh}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 shadow-sm transition hover:bg-blue-100"
                                aria-label="Refresh events"
                                title="Refresh"
                            >
                                <Icons.Clock />
                            </button>
                        </div>
                    </div>

                    {isLoading ? (
                        <p className="py-10 text-center text-sm font-semibold text-slate-500">Loading events...</p>
                    ) : isError ? (
                        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                            Could not load events. Please try again.
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center shadow-sm animate-fade-in-up sm:mt-4 sm:rounded-2xl sm:p-8">
                            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                                <Icons.Events />
                            </div>
                            <h3 className="mt-3 text-sm font-black text-slate-950 sm:mt-4 sm:text-base">No items available</h3>
                            <p className="mx-auto mt-2 max-w-xs text-[12px] leading-5 text-slate-500 sm:max-w-sm sm:text-sm sm:leading-6">New activities and announcements from the care staff will appear here when they are ready for you.</p>
                        </div>
                    ) : (
                        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3 sm:mt-4">
                            {pagedEvents.map((item, index) => {
                                const status = statusMap[item.id];
                                const state = getEventState(item, status);
                                const isTimingIn = timingInEventId === item.id;
                                const isTimingOut = timingOutEventId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => setSelectedEvent(item)}
                                        className={`group flex min-h-[132px] cursor-pointer flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-all animate-fade-in-up hover:shadow-md sm:min-h-[164px] sm:rounded-2xl sm:p-4 ${state.isAttendanceActivity ? 'border-blue-100 hover:border-blue-200 hover:bg-blue-50/30' : 'border-slate-200 hover:border-sky-200 hover:bg-sky-50/20'}`}
                                        style={{ animationDelay: `${index * 70}ms` }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(keyEvent: any) => {
                                            if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                                                keyEvent.preventDefault();
                                                setSelectedEvent(item);
                                            }
                                        }}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-2.5">
                                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border sm:h-10 sm:w-10 sm:rounded-xl ${state.isAttendanceActivity ? 'border-blue-100 bg-blue-50 text-blue-600' : 'border-sky-100 bg-sky-50 text-sky-600'}`}>
                                                    <Icons.Events />
                                                </div>
                                                <div className="min-w-0">
                                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${state.isAttendanceActivity ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-sky-100 bg-sky-50 text-sky-700'}`}>
                                                        {item.type}
                                                    </span>
                                                    <h4 className="mt-2 line-clamp-2 text-[13px] font-black leading-5 text-slate-950 transition-colors group-hover:text-blue-700 sm:text-sm" title={item.title}>
                                                        {item.title || 'Untitled update'}
                                                    </h4>
                                                </div>
                                            </div>
                                            {state.isAttendanceActivity && state.isTimedIn && (
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
                                            {state.isAttendanceActivity && (
                                                <p className="flex min-w-0 items-center gap-2">
                                                    <Icons.Support />
                                                    <span className="truncate">{getDisplayLocation(item)}</span>
                                                </p>
                                            )}
                                            {state.isAttendanceActivity && (
                                                <p className="flex min-w-0 items-center gap-2">
                                                    <Icons.CheckCircle />
                                                    <span className="truncate">{getAudienceLabel(item)}</span>
                                                </p>
                                            )}
                                        </div>

                                        {state.isAttendanceActivity && (
                                            <div className="mt-3 flex flex-col gap-2" onClick={(clickEvent: any) => clickEvent.stopPropagation()}>
                                                {needsRegistration(item) && (
                                                    <p className="text-[10px] font-bold text-amber-600">Registration required — register in the student portal first.</p>
                                                )}

                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <button
                                                        type="button"
                                                        disabled={isTimingIn || !state.canTimeIn}
                                                        onClick={() => onTimeIn(item)}
                                                        className={`flex-1 rounded-xl px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${state.isTimedIn
                                                            ? 'cursor-default border border-emerald-200 bg-emerald-100 text-emerald-700'
                                                            : (isTimingIn || !state.canTimeIn
                                                                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                                                                : 'bg-blue-600 text-white shadow-sm hover:bg-blue-500')
                                                            }`}
                                                    >
                                                        {state.isTimedIn
                                                            ? 'Timed In'
                                                            : isTimingIn
                                                                ? 'Processing...'
                                                                : state.isTimeInClosed
                                                                    ? 'Time In closed'
                                                                    : state.canTimeIn
                                                                        ? 'Time In'
                                                                        : (state.start ? `Time In opens ${formatTimeLabel(item.event_time || '')}` : 'Time In unavailable')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!state.canTimeOut || isTimingOut}
                                                        onClick={() => onTimeOut(item)}
                                                        className={`flex-1 rounded-xl px-3 py-2.5 text-[11px] font-black transition-all sm:text-xs ${state.isTimedOut
                                                            ? 'cursor-default bg-slate-100 text-slate-400'
                                                            : (!state.canTimeOut || isTimingOut
                                                                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                                                                : 'bg-rose-600 text-white shadow-sm hover:bg-rose-500')
                                                            }`}
                                                    >
                                                        {state.isTimedOut
                                                            ? 'Completed'
                                                            : isTimingOut
                                                                ? 'Processing...'
                                                                : state.canTimeOut
                                                                    ? 'Time Out'
                                                                    : (state.end ? `Time Out after ${formatTimeLabel(item.end_time || '')}` : 'Time Out unavailable')}
                                                    </button>
                                                </div>

                                                {state.canRate && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onRate(item)}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[11px] font-black text-amber-700 shadow-sm transition-all hover:bg-amber-100 sm:text-xs"
                                                    >
                                                        <Icons.Star filled={true} />
                                                        Rate
                                                    </button>
                                                )}

                                                {state.canEvaluate && (
                                                    <button
                                                        type="button"
                                                        onClick={() => onEvaluate(item)}
                                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 py-2.5 text-[11px] font-black text-purple-700 shadow-sm transition-all hover:bg-purple-100 sm:text-xs"
                                                    >
                                                        Evaluation Form
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

            {selectedEvent && createPortal(
                <EventDetailModal
                    item={selectedEvent}
                    status={statusMap[selectedEvent.id]}
                    isSignedIn={isSignedIn}
                    timingInEventId={timingInEventId}
                    timingOutEventId={timingOutEventId}
                    onClose={() => setSelectedEvent(null)}
                    onTimeIn={onTimeIn}
                    onTimeOut={onTimeOut}
                    onRate={onRate}
                    onEvaluate={onEvaluate}
                />,
                document.body
            )}
        </>
    );
}
