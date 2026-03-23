import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getDepartmentInterviewQueue } from '../../services/deptService';
import { COUNSELING_STATUS, getCounselingScheduledDate } from '../../utils/workflow';

type StaffCalendarScope = 'department' | 'care';
type CalendarItemType = 'Interview' | 'Counseling' | 'Event';

interface StaffCalendarPageProps {
    scope: StaffCalendarScope;
    departmentName?: string;
    accent?: 'emerald' | 'purple';
}

interface CalendarItem {
    id: string;
    type: CalendarItemType;
    sortAt: string;
    dateLabel: string;
    timeLabel: string;
    title: string;
    details: string;
    location: string;
    status: string;
}

const normalizeDateInput = (value: unknown) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(raw)
        ? raw.replace(' ', 'T')
        : raw;
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateLabel = (value: unknown) => {
    const parsed = normalizeDateInput(value);
    if (!parsed) return 'Date pending';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTimeLabel = (value: unknown) => {
    const parsed = normalizeDateInput(value);
    if (!parsed) return 'Time pending';
    return parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const getTodayStart = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const getInterviewCourseName = (application: any) => {
    const currentChoice = Number(application?.current_choice || 1);
    if (currentChoice === 2) return String(application?.alt_course_1 || '').trim() || null;
    if (currentChoice === 3) return String(application?.alt_course_2 || '').trim() || null;
    return String(application?.priority_course || '').trim() || null;
};

const ACCENT_STYLES = {
    emerald: {
        icon: 'text-emerald-600',
        button: 'border-emerald-200 hover:border-emerald-300 hover:text-emerald-700',
        active: 'bg-emerald-600 text-white border-emerald-600',
        muted: 'bg-emerald-50 text-emerald-700 border-emerald-100'
    },
    purple: {
        icon: 'text-purple-600',
        button: 'border-purple-200 hover:border-purple-300 hover:text-purple-700',
        active: 'bg-purple-600 text-white border-purple-600',
        muted: 'bg-purple-50 text-purple-700 border-purple-100'
    }
} as const;

const StaffCalendarPage = ({
    scope,
    departmentName,
    accent = 'emerald'
}: StaffCalendarPageProps) => {
    const [items, setItems] = useState<CalendarItem[]>([]);
    const [selectedType, setSelectedType] = useState<'All' | CalendarItemType>('All');
    const [selectedDate, setSelectedDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const styles = ACCENT_STYLES[accent];

    const loadCalendarItems = useCallback(async () => {
        if (scope === 'department' && !String(departmentName || '').trim()) {
            setItems([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const todayStart = getTodayStart();

            const interviewsPromise = scope === 'department'
                ? getDepartmentInterviewQueue(String(departmentName || '').trim())
                : supabase
                    .from('applications')
                    .select('id, first_name, last_name, reference_id, priority_course, alt_course_1, alt_course_2, current_choice, status, interview_date, interview_venue, interview_panel, interview_queue_status')
                    .eq('status', 'Interview Scheduled')
                    .not('interview_date', 'is', null)
                    .order('interview_date', { ascending: true })
                    .then(({ data, error: queryError }) => {
                        if (queryError) throw queryError;
                        return (data || []).filter((row: any) => String(row?.interview_queue_status || '').trim() !== 'Absent');
                    });

            let counselingQuery: any = supabase
                .from('counseling_requests')
                .select('id, student_name, department, request_type, status, scheduled_date, created_at')
                .in('status', [COUNSELING_STATUS.SCHEDULED, COUNSELING_STATUS.STAFF_SCHEDULED])
                .order('scheduled_date', { ascending: true });

            if (scope === 'department') {
                counselingQuery = counselingQuery.eq('department', String(departmentName || '').trim());
            }

            const eventsQuery = supabase
                .from('events')
                .select('id, title, type, location, event_date, event_time, created_at')
                .not('event_date', 'is', null)
                .order('event_date', { ascending: true });

            const [
                interviewRows,
                { data: counselingRows, error: counselingError },
                { data: eventRows, error: eventError }
            ] = await Promise.all([
                interviewsPromise,
                counselingQuery,
                eventsQuery
            ]);

            if (counselingError) throw counselingError;
            if (eventError) throw eventError;

            const nextItems: CalendarItem[] = [
                ...(Array.isArray(interviewRows) ? interviewRows : [])
                    .filter((application: any) => String(application?.status || '').trim() === 'Interview Scheduled')
                    .map((application: any) => ({
                    id: `interview-${application.id}`,
                    type: 'Interview' as const,
                    sortAt: String(application?.interview_date || ''),
                    dateLabel: formatDateLabel(application?.interview_date),
                    timeLabel: formatTimeLabel(application?.interview_date),
                    title: [application?.first_name, application?.last_name].map((value: unknown) => String(value || '').trim()).filter(Boolean).join(' ') || 'Applicant',
                    details: [
                        String(application?.reference_id || '').trim() ? `Ref: ${application.reference_id}` : null,
                        getInterviewCourseName(application)
                    ].filter(Boolean).join(' • '),
                    location: [
                        String(application?.interview_venue || '').trim() || 'Venue pending',
                        String(application?.interview_panel || '').trim() ? `Panel: ${application.interview_panel}` : null
                    ].filter(Boolean).join(' • '),
                    status: 'Interview Scheduled'
                })),
                ...((counselingRows || []).map((request: any) => ({
                    id: `counseling-${request.id}`,
                    type: 'Counseling' as const,
                    sortAt: String(getCounselingScheduledDate(request) || ''),
                    dateLabel: formatDateLabel(getCounselingScheduledDate(request)),
                    timeLabel: formatTimeLabel(getCounselingScheduledDate(request)),
                    title: String(request?.student_name || '').trim() || 'Student',
                    details: [
                        String(request?.request_type || '').trim() || 'Counseling session',
                        scope === 'care' ? String(request?.department || '').trim() || null : null
                    ].filter(Boolean).join(' • '),
                    location: scope === 'department'
                        ? 'Department counseling schedule'
                        : 'CARE counseling schedule',
                    status: String(request?.status || '').trim() || 'Scheduled'
                })) || []),
                ...((eventRows || []).map((event: any) => ({
                    id: `event-${event.id}`,
                    type: 'Event' as const,
                    sortAt: [String(event?.event_date || '').trim(), String(event?.event_time || '').trim()].filter(Boolean).join(' ') || String(event?.created_at || ''),
                    dateLabel: formatDateLabel([String(event?.event_date || '').trim(), String(event?.event_time || '').trim()].filter(Boolean).join(' ')),
                    timeLabel: String(event?.event_time || '').trim() || 'All day',
                    title: String(event?.title || '').trim() || 'Event',
                    details: String(event?.type || '').trim() || 'Event',
                    location: String(event?.location || '').trim() || 'Location pending',
                    status: String(event?.type || '').trim() || 'Event'
                })) || [])
            ]
                .filter((item) => {
                    const parsed = normalizeDateInput(item.sortAt);
                    return Boolean(parsed && parsed >= todayStart);
                })
                .sort((left, right) => {
                    const leftTime = normalizeDateInput(left.sortAt)?.getTime() || 0;
                    const rightTime = normalizeDateInput(right.sortAt)?.getTime() || 0;
                    return leftTime - rightTime;
                });

            setItems(nextItems);
        } catch (nextError: any) {
            setError(nextError?.message || 'Failed to load calendar items.');
        } finally {
            setIsLoading(false);
        }
    }, [departmentName, scope]);

    useEffect(() => {
        void loadCalendarItems();
    }, [loadCalendarItems]);

    const filteredItems = useMemo(() => items.filter((item) => {
        if (selectedType !== 'All' && item.type !== selectedType) return false;
        if (selectedDate) {
            const parsed = normalizeDateInput(item.sortAt);
            const itemDate = parsed ? parsed.toISOString().slice(0, 10) : '';
            if (itemDate !== selectedDate) return false;
        }
        return true;
    }), [items, selectedDate, selectedType]);

    const summary = useMemo(() => ({
        interviews: items.filter((item) => item.type === 'Interview').length,
        counseling: items.filter((item) => item.type === 'Counseling').length,
        events: items.filter((item) => item.type === 'Event').length
    }), [items]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Simple upcoming list for interviews, counseling schedules, and events.
                    </p>
                </div>
                <button
                    onClick={() => void loadCalendarItems()}
                    disabled={isLoading}
                    className={`inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 border shadow-sm disabled:opacity-50 ${styles.button}`}
                >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                    <span>{isLoading ? 'Refreshing...' : 'Refresh Calendar'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Interviews', value: summary.interviews },
                    { label: 'Counseling', value: summary.counseling },
                    { label: 'Events', value: summary.events }
                ].map((card) => (
                    <div key={card.label} className={`rounded-2xl border p-5 bg-white/80 backdrop-blur-sm shadow-sm ${styles.muted}`}>
                        <p className="text-xs font-bold uppercase tracking-wide">{card.label}</p>
                        <p className="mt-3 text-3xl font-extrabold text-gray-900">{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <select
                        value={selectedType}
                        onChange={(event) => setSelectedType(event.target.value as 'All' | CalendarItemType)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
                    >
                        <option value="All">All Types</option>
                        <option value="Interview">Interviews</option>
                        <option value="Counseling">Counseling</option>
                        <option value="Event">Events</option>
                    </select>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
                    />
                    {(selectedType !== 'All' || selectedDate) && (
                        <button
                            onClick={() => {
                                setSelectedType('All');
                                setSelectedDate('');
                            }}
                            className="text-sm font-semibold text-red-600 hover:text-red-700"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="font-bold text-gray-900">Upcoming Schedule</h2>
                </div>

                {error ? (
                    <div className="px-5 py-10 text-sm text-red-600">{error}</div>
                ) : isLoading ? (
                    <div className="px-5 py-10 text-sm text-gray-500">Loading calendar items...</div>
                ) : filteredItems.length === 0 ? (
                    <div className="px-5 py-10 text-sm text-gray-500">No upcoming items found for the selected filters.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Date</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Type</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Item</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Location / Notes</th>
                                    <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70">
                                        <td className="px-5 py-4 align-top">
                                            <div className="flex items-start gap-2">
                                                <CalendarDays size={16} className={`mt-0.5 ${styles.icon}`} />
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.dateLabel}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                        <Clock size={12} />
                                                        {item.timeLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <p className="font-semibold text-gray-900">{item.title}</p>
                                            <p className="text-xs text-gray-500 mt-1">{item.details || 'No additional details'}</p>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <p className="text-sm text-gray-700 flex items-start gap-1">
                                                <MapPin size={14} className="mt-0.5 text-gray-400" />
                                                <span>{item.location}</span>
                                            </p>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                                                {item.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffCalendarPage;
