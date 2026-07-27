import { useMemo, useState } from 'react';
import { Archive, Calendar, ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react';

import { getAudienceLabel, isAttendanceActivityType } from '../../../../../utils/eventAudience';
import { isEventArchived } from '../../../../../hooks/useEventsData';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EVENTS_PER_PAGE = 8;

/** "2026-07-22" -> { day: "22", month: "Jul", year: "2026" }, parsed as a local
 *  date so a UTC shift cannot move an evening event onto the next day. */
const splitDate = (value?: string | null) => {
    if (!value) return null;
    const [year, month, day] = String(value).split('-').map(Number);
    if (!year || !month || !day) return null;
    return { day: String(day).padStart(2, '0'), month: MONTHS[month - 1] ?? '', year: String(year) };
};

/** "12:28:00" -> "12:28 PM". Trims the stray seconds the time column carries. */
const formatTime = (value?: string | null) => {
    if (!value) return '';
    const [rawHour, rawMinute] = String(value).split(':');
    const hour = Number(rawHour);
    if (Number.isNaN(hour)) return String(value);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:${rawMinute ?? '00'} ${suffix}`;
};

const formatTimeRange = (start?: string | null, end?: string | null) => {
    const from = formatTime(start);
    const to = formatTime(end);
    if (from && to) return `${from} – ${to}`;
    return from || to || '';
};

const EventRow = ({ event, attendeeCount, department, onViewAttendees }: any) => {
    const date = splitDate(event.event_date);
    const timeRange = formatTimeRange(event.event_time, event.end_time);
    const canShowAttendees = isAttendanceActivityType(event.type);

    return (
        <li className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-5">
            <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-50 py-2 text-center">
                {date ? (
                    <>
                        <span className="text-lg font-black leading-none text-gray-900">{date.day}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{date.month}</span>
                        <span className="text-[9px] font-semibold text-gray-400">{date.year}</span>
                    </>
                ) : (
                    <Calendar size={16} className="text-gray-300" />
                )}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold text-gray-900">{event.title}</h3>
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-100">
                        {event.type}
                    </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    {timeRange && <span>{timeRange}</span>}
                    {event.location && (
                        <span className="flex min-w-0 items-center gap-1"><MapPin size={11} /><span className="truncate">{event.location}</span></span>
                    )}
                    <span className="flex min-w-0 items-center gap-1"><Users size={11} /><span className="truncate">{getAudienceLabel(event)}</span></span>
                </div>
            </div>

            {canShowAttendees && (
                <div className="flex shrink-0 items-center gap-3 sm:justify-end">
                    <div className="text-right">
                        <p className="text-lg font-black leading-none text-gray-900">{attendeeCount}</p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">attended</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onViewAttendees(event)}
                        disabled={attendeeCount === 0}
                        className="rounded-lg bg-green-50 px-3 py-2 text-xs font-bold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        {attendeeCount === 0 ? `No ${department} attendees` : 'View attendees'}
                    </button>
                </div>
            )}
        </li>
    );
};

const DeptEventsPage = ({
    data,
    deptAttendanceEvents = [],
    deptAttendanceCounts,
    isLoadingDeptAttendanceEvents = false,
    handleViewDeptAttendees
}: any) => {
    const fullDepartment = data?.profile?.department || 'your department';
    // "CAS (College of Arts and Sciences)" -> "CAS" for inline use.
    const shortDepartment = fullDepartment.split(' ')[0];

    const [activeTab, setActiveTab] = useState<'events' | 'archived'>('events');
    const [page, setPage] = useState(1);

    const { upcoming: live, concluded: archived } = useMemo(() => {
        const events = [...(deptAttendanceEvents as any[])];
        // Same rule the Care Staff portal uses, so the two never disagree about
        // whether an event is done.
        const done = events.filter((event) => isEventArchived(event));
        const live = events.filter((event) => !isEventArchived(event));
        const byDate = (direction: number) => (a: any, b: any) =>
            direction * String(a.event_date ?? '').localeCompare(String(b.event_date ?? ''));
        return {
            upcoming: live.sort(byDate(1)),
            concluded: done.sort(byDate(-1))
        };
    }, [deptAttendanceEvents]);

    const countFor = (event: any) => deptAttendanceCounts?.get?.(event.id) ?? 0;

    // The counts map is already built from exactly the listed events, so summing
    // its values needs no second pass over the event array.
    const totalAttended = useMemo(
        () => [...(deptAttendanceCounts?.values?.() ?? [])].reduce((sum: number, n: number) => sum + n, 0),
        [deptAttendanceCounts]
    );

    const tabs = [
        { id: 'events' as const, label: 'Events', list: live },
        { id: 'archived' as const, label: 'Archived Events', list: archived }
    ];
    const visibleList = activeTab === 'archived' ? archived : live;

    // Page is derived, not corrected in an effect: switching tabs or losing rows
    // just clamps the number instead of leaving the list blank for a render.
    const totalPages = Math.max(1, Math.ceil(visibleList.length / EVENTS_PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const pageItems = visibleList.slice((safePage - 1) * EVENTS_PER_PAGE, safePage * EVENTS_PER_PAGE);

    const selectTab = (id: 'events' | 'archived') => {
        setActiveTab(id);
        setPage(1);
    };

    return (
        // Full height of the content region so the pager sits on the bottom edge
        // rather than floating under a short list.
        <div className="flex h-full flex-col gap-4 animate-fade-in">
            <header className="shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Department Events</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Attendance for {fullDepartment} — {totalAttended} record{totalAttended === 1 ? '' : 's'} across {deptAttendanceEvents.length} event{deptAttendanceEvents.length === 1 ? '' : 's'}.
                </p>
            </header>

            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="max-w-full overflow-x-auto rounded-full">
                    <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-gray-200/60 bg-white/60 p-1.5 shadow-sm backdrop-blur-xl">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() => selectTab(tab.id)}
                                    className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-500 hover:text-gray-800'}`}
                                >
                                    {tab.id === 'archived' && <Archive size={14} />}
                                    <span>{tab.label}</span>
                                    <span className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{tab.list.length}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <span className="self-start rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-400 sm:self-auto">
                    {activeTab === 'archived' ? `Archived: ${archived.length}` : `Events: ${live.length}`}
                </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="min-h-0 flex-1 overflow-y-auto">
                    {isLoadingDeptAttendanceEvents ? (
                        <p className="py-12 text-center text-sm text-gray-400">Loading events…</p>
                    ) : visibleList.length === 0 ? (
                        <div className="py-12 text-center">
                            <Calendar size={28} className="mx-auto text-gray-300" />
                            <p className="mt-3 text-sm font-bold text-gray-700">
                                {activeTab === 'archived' ? 'No archived events' : 'No events to show'}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                                Activities aimed at {shortDepartment}, and campus-wide ones, appear here once CARE staff create them.
                            </p>
                        </div>
                    ) : (
                        <ul>
                            {pageItems.map((event) => (
                                <EventRow
                                    key={event.id}
                                    event={event}
                                    attendeeCount={countFor(event)}
                                    department={shortDepartment}
                                    onViewAttendees={handleViewDeptAttendees}
                                />
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-gray-100 bg-gray-50/70 px-4 py-2 text-xs text-gray-500">
                    <span>{visibleList.length} event{visibleList.length === 1 ? '' : 's'} · Page {safePage} of {totalPages}</span>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            aria-label="Previous page"
                            disabled={safePage <= 1}
                            onClick={() => setPage(safePage - 1)}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <button
                            type="button"
                            aria-label="Next page"
                            disabled={safePage >= totalPages}
                            onClick={() => setPage(safePage + 1)}
                            className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeptEventsPage;
