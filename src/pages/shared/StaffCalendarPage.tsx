import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CalendarDays, Clock, Filter, MapPin, MessageSquare, RefreshCw, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { getDepartmentInterviewQueue } from '../../services/deptService';
import { COUNSELING_STATUS, getCounselingScheduledDate } from '../../utils/workflow';
import { toTitleCase } from '../../utils/formatters';

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
    const [selectedType, setSelectedType] = useState<'All' | CalendarItemType>('All');
    const [selectedDate, setSelectedDate] = useState('');
    const styles = ACCENT_STYLES[accent];

    const isDeptScope = scope === 'department';
    const deptNameTrim = String(departmentName || '').trim();

    // ponytail: cache interviews to prevent redundant API sweeps on tab switch
    const { data: interviewRows, isLoading: loadingInterviews, error: interviewsError, refetch: refetchInterviews } = useQuery({
        queryKey: ['calendar-interviews', scope, departmentName],
        queryFn: async () => {
            if (isDeptScope) {
                if (!deptNameTrim) return [];
                return getDepartmentInterviewQueue(deptNameTrim);
            } else {
                const { data, error } = await supabase
                    .from('applications')
                    .select('id, first_name, last_name, reference_id, priority_course, alt_course_1, alt_course_2, current_choice, status, interview_date, interview_venue, interview_panel, interview_queue_status')
                    .eq('status', 'Interview Scheduled')
                    .not('interview_date', 'is', null)
                    .order('interview_date', { ascending: true });
                if (error) throw error;
                return (data || []).filter((row: any) => String(row?.interview_queue_status || '').trim() !== 'Absent');
            }
        },
        staleTime: 60000
    });

    // ponytail: cache counseling requests to prevent redundant API sweeps on tab switch
    const { data: counselingRows, isLoading: loadingCounseling, error: counselingError, refetch: refetchCounseling } = useQuery({
        queryKey: ['calendar-counseling', scope, departmentName],
        queryFn: async () => {
            let query = supabase
                .from('counseling_requests')
                .select('id, student_name, department, request_type, status, scheduled_date, created_at')
                .in('status', [COUNSELING_STATUS.SCHEDULED, COUNSELING_STATUS.STAFF_SCHEDULED])
                .order('scheduled_date', { ascending: true });

            if (isDeptScope) {
                if (!deptNameTrim) return [];
                query = query.eq('department', deptNameTrim);
            }
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        staleTime: 60000
    });

    // ponytail: cache events to prevent redundant API sweeps on tab switch
    const { data: eventRows, isLoading: loadingEvents, error: eventsError, refetch: refetchEvents } = useQuery({
        queryKey: ['calendar-events'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('events')
                .select('id, title, type, location, event_date, event_time, created_at')
                .eq('is_archived', false)
                .not('event_date', 'is', null)
                .order('event_date', { ascending: true });
            if (error) throw error;
            return data || [];
        },
        staleTime: 60000
    });

    const isLoading = loadingInterviews || loadingCounseling || loadingEvents;
    const error = (interviewsError || counselingError || eventsError)
        ? [interviewsError, counselingError, eventsError].map((e: any) => e?.message).filter(Boolean).join('; ')
        : null;

    const loadCalendarItems = useCallback(async () => {
        await Promise.all([
            refetchInterviews(),
            refetchCounseling(),
            refetchEvents()
        ]);
    }, [refetchInterviews, refetchCounseling, refetchEvents]);

    const items = useMemo(() => {
        const todayStart = getTodayStart();
        const nextItems: CalendarItem[] = [
            ...(Array.isArray(interviewRows) ? interviewRows : []).flatMap((application: any) => (
                String(application?.status || '').trim() === 'Interview Scheduled' ? [{
                    id: `interview-${application.id}`,
                    type: 'Interview' as const,
                    sortAt: String(application?.interview_date || ''),
                    dateLabel: formatDateLabel(application?.interview_date),
                    timeLabel: formatTimeLabel(application?.interview_date),
                    title: toTitleCase([application?.first_name, application?.last_name].map((value: unknown) => String(value || '').trim()).filter(Boolean).join(' ')) || 'Applicant',
                    details: [
                        String(application?.reference_id || '').trim() ? `Ref: ${application.reference_id}` : null,
                        getInterviewCourseName(application)
                    ].filter(Boolean).join(' • '),
                    location: [
                        String(application?.interview_venue || '').trim() || 'Venue pending',
                        String(application?.interview_panel || '').trim() ? `Panel: ${application.interview_panel}` : null
                    ].filter(Boolean).join(' • '),
                    status: 'Interview Scheduled'
                }] : []
            )),
            ...((counselingRows || []).map((request: any) => ({
                id: `counseling-${request.id}`,
                type: 'Counseling' as const,
                sortAt: String(getCounselingScheduledDate(request) || ''),
                dateLabel: formatDateLabel(getCounselingScheduledDate(request)),
                timeLabel: formatTimeLabel(getCounselingScheduledDate(request)),
                title: toTitleCase(String(request?.student_name || '').trim()) || 'Student',
                details: [
                    String(request?.request_type || '').trim() || 'Counseling session',
                    scope === 'care' ? String(request?.department || '').trim() || null : null
                ].filter(Boolean).join(' • '),
                location: scope === 'department'
                    ? 'College counseling schedule'
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

        return nextItems;
    }, [interviewRows, counselingRows, eventRows, scope]);

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

    const kpiCards = [
        {
            label: 'INTERVIEWS',
            value: summary.interviews,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            iconColor: 'text-purple-400',
            icon: Users
        },
        {
            label: 'COUNSELING',
            value: summary.counseling,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            iconColor: 'text-blue-400',
            icon: MessageSquare
        },
        {
            label: 'EVENTS',
            value: summary.events,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            iconColor: 'text-emerald-400',
            icon: Calendar
        }
    ];

    return (
        <div className="flex h-full min-h-0 flex-col gap-4 animate-fade-in">
            {/* Header Banner (Dark Gradient) */}
            <div
                style={{
                    background: accent === 'emerald'
                        ? 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)'
                        : 'linear-gradient(135deg, #1e0f40 0%, #2d1b69 100%)'
                }}
                className={`rounded-2xl md:rounded-3xl p-5 md:p-6 text-white shadow-md border flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 ${
                    accent === 'emerald' ? 'border-emerald-900/40' : 'border-purple-900/40'
                }`}
            >
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Calendar View</h1>
                    <p className={`mt-1 text-xs md:text-sm font-medium ${
                        accent === 'emerald' ? 'text-emerald-200/70' : 'text-purple-300/70'
                    }`}>
                        Simple upcoming list for interviews, counseling schedules, and events.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadCalendarItems()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all duration-200 hover:shadow-sm disabled:opacity-50 cursor-pointer self-start md:self-auto"
                >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    <span>{isLoading ? 'Refreshing...' : 'Refresh Calendar'}</span>
                </button>
            </div>

            {/* KPI / Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpiCards.map((card) => {
                    const IconComponent = card.icon;
                    return (
                        <div
                            key={card.label}
                            className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-xs flex items-center justify-between"
                        >
                            <div>
                                <p className={`text-[11px] font-bold tracking-wider uppercase ${card.color}`}>
                                    {card.label}
                                </p>
                                <p className="mt-1 text-3xl md:text-4xl font-extrabold text-gray-900">
                                    {card.value}
                                </p>
                                <p className="mt-1 text-xs text-gray-400 font-medium">
                                    upcoming
                                </p>
                            </div>
                            <div className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center ${card.bgColor} ${card.iconColor}`}>
                                <IconComponent size={20} className="stroke-[1.75]" />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 px-5 md:px-6 py-3.5 shadow-xs flex items-center gap-3.5 flex-wrap">
                <Filter size={18} className="text-gray-400 shrink-0" />
                <select
                    aria-label="Filter calendar items by type"
                    value={selectedType}
                    onChange={(event) => setSelectedType(event.target.value as 'All' | CalendarItemType)}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs md:text-sm text-gray-700 font-medium hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                >
                    <option value="All">All Types</option>
                    <option value="Interview">Interviews</option>
                    <option value="Counseling">Counseling</option>
                    <option value="Event">Events</option>
                </select>
                <input
                    aria-label="Filter calendar items by date"
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs md:text-sm text-gray-700 font-medium hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 cursor-pointer"
                />
                {(selectedType !== 'All' || selectedDate) && (
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedType('All');
                            setSelectedDate('');
                        }}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline ml-auto md:ml-2"
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {/* Upcoming Schedule Section Header */}
            <div className="flex items-center gap-2 px-1 pt-1">
                <Clock size={18} className={accent === 'emerald' ? 'text-emerald-600' : 'text-purple-600'} />
                <h2 className="text-base font-bold text-gray-900">Upcoming Schedule</h2>
            </div>

            {/* Upcoming Schedule Card */}
            <div className="bg-white rounded-2xl md:rounded-3xl border border-slate-200/80 shadow-xs min-h-[340px] flex flex-col justify-center overflow-hidden">
                {error ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-red-600">
                        <p className="text-sm font-semibold">{error}</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
                        <RefreshCw size={24} className="animate-spin text-purple-500 mb-2" />
                        <p className="text-sm font-medium">Loading calendar items...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 md:p-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300 mb-3 shadow-xs">
                            <Calendar size={22} className="text-gray-300 stroke-[1.5]" />
                        </div>
                        <p className="text-sm font-bold text-gray-800">
                            No upcoming items found for the selected filters.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Try changing the type or clearing the date filter.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-gray-50/80 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-3.5">Date</th>
                                    <th className="px-6 py-3.5">Type</th>
                                    <th className="px-6 py-3.5">Item</th>
                                    <th className="px-6 py-3.5">Location / Notes</th>
                                    <th className="px-6 py-3.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-6 py-4 align-top">
                                            <div className="flex items-start gap-2.5">
                                                <CalendarDays size={16} className={`mt-0.5 shrink-0 ${styles.icon}`} />
                                                <div>
                                                    <p className="font-semibold text-gray-900">{item.dateLabel}</p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={12} className="shrink-0" />
                                                        {item.timeLabel}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                                                item.type === 'Interview'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200/60'
                                                    : item.type === 'Counseling'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200/60'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <p className="font-semibold text-gray-900">{item.title}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.details || 'No additional details'}</p>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <p className="text-sm text-gray-700 flex items-start gap-1.5">
                                                <MapPin size={14} className="mt-0.5 text-gray-400 shrink-0" />
                                                <span>{item.location}</span>
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
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
