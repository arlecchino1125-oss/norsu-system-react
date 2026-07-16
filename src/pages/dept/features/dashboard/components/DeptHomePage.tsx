import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Bell,
    CalendarCheck2,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    FileText,
    Info,
    Settings,
    UserPlus,
    Users
} from 'lucide-react';
import {
    COUNSELING_STATUS,
    getCounselingScheduledDate,
    isCounselingAwaitingDept,
    isWithCareStaffCounseling
} from '../../../../../utils/workflow';
import { useLiveClock } from '../../../../../components/ClockDisplay';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const getDateKey = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return '';

    const matchedIsoDate = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matchedIsoDate) return matchedIsoDate[1];

    const parsedDate = new Date(text);
    if (Number.isNaN(parsedDate.getTime())) return '';

    const year = parsedDate.getFullYear();
    const month = `${parsedDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsedDate.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTimeLabel = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return 'Time pending';

    const matchedIsoDate = text.match(/^\d{4}-\d{2}-\d{2}[ T](.+)$/);
    if (matchedIsoDate) return matchedIsoDate[1].trim();

    const parsedDate = new Date(text);
    if (Number.isNaN(parsedDate.getTime())) return text;

    return parsedDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getRecentCounselingTone = (status: string) => {
    if (isCounselingAwaitingDept(status)) {
        return { label: 'Pending Review', tone: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Info size={12} /> };
    }

    if (status === COUNSELING_STATUS.SCHEDULED) {
        return { label: 'Scheduled', tone: 'bg-blue-100 text-blue-700 border-blue-200', icon: <CalendarClock size={12} /> };
    }

    if (status === COUNSELING_STATUS.STAFF_SCHEDULED) {
        return { label: 'With CARE Staff', tone: 'bg-indigo-100 text-indigo-700 border-indigo-200', icon: <Users size={12} /> };
    }

    if (status === COUNSELING_STATUS.COMPLETED) {
        return { label: 'Completed', tone: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> };
    }

    if (status === COUNSELING_STATUS.REJECTED) {
        return { label: 'Rejected', tone: 'bg-rose-100 text-rose-700 border-rose-200', icon: <AlertTriangle size={12} /> };
    }

    return { label: status || 'Recorded', tone: 'bg-slate-100 text-slate-700 border-slate-200', icon: <FileText size={12} /> };
};

const DEPT_HOME_ALERT_ICONS: Record<string, React.ReactNode> = {
    'admissions-ready': <CalendarClock size={16} />,
    'admissions-absent': <AlertTriangle size={16} />,
    'counseling-review': <ClipboardList size={16} />,
    'support-forwarded': <Bell size={16} />
};

const EMPTY_ROWS: readonly any[] = [];

const DeptHomePage = ({
    filteredData,
    dashboardStats,
    todayCounselingSessions = EMPTY_ROWS,
    counselingRequests,
    admissionsDashboardCounts,
    departmentAlertItems,
    setActiveModule,
    setForwardingToStaff,
    setReferralForm,
    setShowReferralModal,
    setSelectedCounselingReq,
    setShowCounselingViewModal,
    interviewQueueRows = EMPTY_ROWS,
    eventsList = EMPTY_ROWS
}: any) => {
    const clock = useLiveClock();
    const [secondaryView, setSecondaryView] = useState<'population' | 'actions'>('population');
    const [showRecentCounseling, setShowRecentCounseling] = useState(false);

    const todayKey = useMemo(() => getDateKey(new Date()), []);

    const todayInterviews = useMemo(
        () => (Array.isArray(interviewQueueRows) ? interviewQueueRows : []).filter((app: any) => getDateKey(app?.interview_date) === todayKey),
        [interviewQueueRows, todayKey]
    );

    const todayEvents = useMemo(
        () => (Array.isArray(eventsList) ? eventsList : []).filter((event: any) => getDateKey(event?.event_date) === todayKey),
        [eventsList, todayKey]
    );

    const recentCounseling = useMemo(
        () => (Array.isArray(filteredData?.requests) ? filteredData.requests : []).slice(0, 8),
        [filteredData?.requests]
    );

    const counselingStats = dashboardStats?.counseling;
    const populationByYear = dashboardStats?.populationByYear || filteredData.populationStats || {};
    const totalStudents = dashboardStats?.populationTotal
        ?? filteredData.populationTotal
        ?? Object.values(populationByYear).reduce((sum: number, value: any) => sum + Number(value || 0), 0);
    const totalCounselingRequests = counselingStats
        ? ['awaiting', 'scheduled', 'withCare', 'completed', 'rejected'].reduce((sum, key) => sum + Number(counselingStats?.[key] || 0), 0)
        : filteredData.requests.length;
    const pendingReviewCount = counselingStats?.awaiting ?? filteredData.requests.filter((request: any) => isCounselingAwaitingDept(request.status)).length;
    const withCareCount = counselingStats?.withCare ?? filteredData.requests.filter((request: any) => isWithCareStaffCounseling(request.status)).length;

    const primaryStats = [
        { label: 'Total Requests', value: totalCounselingRequests, icon: <FileText size={20} />, gradient: 'from-blue-400 to-indigo-500' },
        { label: 'Pending Approval', value: pendingReviewCount, icon: <Info size={20} />, gradient: 'from-amber-400 to-orange-500' },
        { label: 'With CARE Staff', value: withCareCount, icon: <CheckCircle2 size={20} />, gradient: 'from-emerald-400 to-teal-500' },
        { label: 'Total Students', value: totalStudents, icon: <Users size={20} />, gradient: 'from-violet-400 to-purple-500' }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-8 md:p-10 text-white shadow-2xl shadow-emerald-900/20">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl -ml-16 -mb-16" />

                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 text-center lg:text-left">
                        <p className="text-emerald-300/80 text-sm font-medium tracking-wide uppercase mb-2">{clock.greeting}</p>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
                            Welcome to <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-green-300 bg-clip-text text-transparent">Dept. Head Portal</span>
                        </h1>
                        <p className="text-emerald-200/75 text-base mb-6 max-w-2xl">
                            Prioritize today&apos;s interviews and counseling workload, then drill into secondary student and referral tools only when you need them.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                            <button type="button"
                                onClick={() => setActiveModule('admissions')}
                                className={`inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-400 hover:scale-[1.02] transition-all duration-200 shadow-lg shadow-emerald-500/20 ${FOCUS_RING}`}
                            >
                                <CalendarClock size={18} />
                                Today&apos;s Interviews
                            </button>
                            <button type="button"
                                onClick={() => setActiveModule('counseling_queue')}
                                className={`inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:scale-[1.02] transition-all duration-200 ${FOCUS_RING}`}
                            >
                                <ClipboardList size={18} />
                                Counseling Queue
                            </button>
                        </div>
                    </div>

                    <div className="text-center flex-shrink-0">
                        <div className="relative">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-6 min-w-[260px]">
                                <div className="flex items-baseline justify-center gap-1 mb-3">
                                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{clock.h}</span>
                                    <span className="text-5xl md:text-6xl font-light text-emerald-300 animate-pulse">:</span>
                                    <span className="text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums">{clock.m}</span>
                                    <span className="text-5xl md:text-6xl font-light text-emerald-300 animate-pulse">:</span>
                                    <span className="text-4xl md:text-5xl font-bold tracking-tight tabular-nums text-emerald-300">{clock.s}</span>
                                    <span className="text-lg font-bold text-emerald-400 ml-2 self-start mt-2">{clock.ampm}</span>
                                </div>
                                <p className="text-emerald-300/70 text-sm font-medium">{clock.dateString}</p>
                            </div>
                            <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-3xl -z-10" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 stagger-children">
                {primaryStats.map((card) => (
                    <div key={card.label} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100/80 flex flex-col justify-between h-32">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium text-sm">{card.label}</span>
                            <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl text-white shadow-lg`}>{card.icon}</div>
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between mb-6">
                        <div className="flex items-start gap-4">
                            <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                                <CalendarCheck2 size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">Today&apos;s Schedule</h3>
                                <p className="text-sm text-gray-500 mt-1">A quick inline view of today&apos;s interviews, counseling sessions, and department events.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActiveModule('calendar')}
                            className={`inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition ${FOCUS_RING}`}
                        >
                            <CalendarDays size={16} />
                            Open Calendar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <button
                            type="button"
                            onClick={() => setActiveModule('admissions')}
                            className={`rounded-2xl border border-blue-100 bg-blue-50 p-4 text-left transition hover:border-blue-200 hover:bg-white ${FOCUS_RING}`}
                        >
                            <div className="inline-flex rounded-xl bg-blue-500 p-2 text-white shadow-lg shadow-blue-200/60">
                                <CalendarClock size={18} />
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-blue-700">Interviews</p>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900">{todayInterviews.length}</p>
                            <p className="mt-1 text-xs text-gray-500">
                                {todayInterviews.length > 0 ? 'Scheduled for today' : `${admissionsDashboardCounts?.scheduled || 0} total scheduled`}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveModule('counseling_queue')}
                            className={`rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left transition hover:border-emerald-200 hover:bg-white ${FOCUS_RING}`}
                        >
                            <div className="inline-flex rounded-xl bg-emerald-500 p-2 text-white shadow-lg shadow-emerald-200/60">
                                <ClipboardList size={18} />
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-emerald-700">Counseling</p>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900">{todayCounselingSessions.length}</p>
                            <p className="mt-1 text-xs text-gray-500">Sessions visible on today&apos;s queue</p>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveModule('events')}
                            className={`rounded-2xl border border-amber-100 bg-amber-50 p-4 text-left transition hover:border-amber-200 hover:bg-white ${FOCUS_RING}`}
                        >
                            <div className="inline-flex rounded-xl bg-amber-500 p-2 text-white shadow-lg shadow-amber-200/60">
                                <Bell size={18} />
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700">Events</p>
                            <p className="mt-2 text-3xl font-extrabold text-gray-900">{todayEvents.length}</p>
                            <p className="mt-1 text-xs text-gray-500">Department activities for today</p>
                        </button>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Date</p>
                            <p className="mt-3 text-lg font-extrabold text-gray-900">{new Date().toLocaleDateString([], { weekday: 'long' })}</p>
                            <p className="mt-1 text-sm text-slate-500">{new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-bold text-blue-900 flex items-center gap-2"><CalendarClock size={16} /> Interviews</h4>
                                <button type="button" onClick={() => setActiveModule('admissions')} className={`text-xs font-bold text-blue-700 hover:text-blue-800 ${FOCUS_RING}`}>
                                    View All
                                </button>
                            </div>
                            {todayInterviews.length === 0 ? (
                                <p className="text-sm text-blue-700/80">No interviews scheduled for today.</p>
                            ) : (
                                <div className="space-y-2">
                                    {todayInterviews.slice(0, 3).map((app: any) => (
                                        <button
                                            key={String(app?.id || app?.reference_id)}
                                            type="button"
                                            onClick={() => setActiveModule('admissions')}
                                            className={`w-full rounded-xl border border-blue-200 bg-white px-3 py-3 text-left hover:border-blue-300 transition ${FOCUS_RING}`}
                                        >
                                            <p className="text-sm font-bold text-gray-900">{[app?.first_name, app?.last_name].filter(Boolean).join(' ') || 'Applicant'}</p>
                                            <p className="mt-1 text-xs text-blue-700">{getTimeLabel(app?.interview_date)}</p>
                                            <p className="mt-1 text-xs text-gray-500">{app?.interview_venue || app?.priority_course || 'Interview details available in admissions'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-bold text-emerald-900 flex items-center gap-2"><ClipboardList size={16} /> Counseling</h4>
                                <button type="button" onClick={() => setActiveModule('counseling_queue')} className={`text-xs font-bold text-emerald-700 hover:text-emerald-800 ${FOCUS_RING}`}>
                                    View All
                                </button>
                            </div>
                            {todayCounselingSessions.length === 0 ? (
                                <p className="text-sm text-emerald-700/80">No counseling sessions scheduled today.</p>
                            ) : (
                                <div className="space-y-2">
                                    {todayCounselingSessions.slice(0, 3).map((request: any) => (
                                        <button
                                            key={String(request?.id || request?.student_id)}
                                            type="button"
                                            onClick={() => {
                                                setActiveModule('counseling_queue');
                                                setSelectedCounselingReq(request);
                                                setShowCounselingViewModal(true);
                                            }}
                                            className={`w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-left hover:border-emerald-300 transition ${FOCUS_RING}`}
                                        >
                                            <p className="text-sm font-bold text-gray-900">{request?.student_name || 'Student'}</p>
                                            <p className="mt-1 text-xs text-emerald-700">{getTimeLabel(getCounselingScheduledDate(request))}</p>
                                            <p className="mt-1 text-xs text-gray-500">{request?.request_type || 'Counseling request'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <h4 className="font-bold text-amber-900 flex items-center gap-2"><Bell size={16} /> Events</h4>
                                <button type="button" onClick={() => setActiveModule('events')} className={`text-xs font-bold text-amber-700 hover:text-amber-800 ${FOCUS_RING}`}>
                                    View All
                                </button>
                            </div>
                            {todayEvents.length === 0 ? (
                                <p className="text-sm text-amber-700/80">No department events scheduled today.</p>
                            ) : (
                                <div className="space-y-2">
                                    {todayEvents.slice(0, 3).map((event: any) => (
                                        <button
                                            key={String(event?.id || event?.title)}
                                            type="button"
                                            onClick={() => setActiveModule('events')}
                                            className={`w-full rounded-xl border border-amber-200 bg-white px-3 py-3 text-left hover:border-amber-300 transition ${FOCUS_RING}`}
                                        >
                                            <p className="text-sm font-bold text-gray-900">{event?.title || 'Department event'}</p>
                                            <p className="mt-1 text-xs text-amber-700">{event?.type || 'Event'}</p>
                                            <p className="mt-1 text-xs text-gray-500 line-clamp-2">{event?.description || 'Open the events page for the full agenda.'}</p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Bell size={18} className="text-emerald-500" /> Role-Based Alerts</h3>
                    <div className="space-y-3">
                        {(departmentAlertItems || []).filter((item: any) => Number(item?.count || 0) > 0).length === 0 ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                                No urgent department alerts right now.
                            </div>
                        ) : (
                            (departmentAlertItems || [])
                                .filter((item: any) => Number(item?.count || 0) > 0)
                                .map((item: any) => (
                                    <button type="button"
                                        key={item.key}
                                        onClick={() => setActiveModule(item.module)}
                                        className={`w-full rounded-xl border px-4 py-3 text-left transition hover:bg-white ${item.tone} ${FOCUS_RING}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <span className="mt-0.5">{DEPT_HOME_ALERT_ICONS[item.key] || <Bell size={16} />}</span>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                                                    <p className="mt-1 text-xs opacity-80">Open the related module</p>
                                                </div>
                                            </div>
                                            <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-gray-800">
                                                {item.count}
                                            </span>
                                        </div>
                                    </button>
                                ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-5">
                        <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500" /> Admissions Snapshot</h3>
                            <p className="text-sm text-gray-500 mt-1">Keep interview and decision counts visible without letting secondary widgets take over the page.</p>
                        </div>
                        <button type="button" onClick={() => setActiveModule('admissions')} className={`inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 ${FOCUS_RING}`}>
                            Open Admissions
                            <ArrowRight size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { label: 'Ready for Interview', value: admissionsDashboardCounts?.readyForInterview || 0, tone: 'border-blue-100 bg-blue-50 text-blue-700', icon: <CalendarClock size={16} /> },
                            { label: 'Interview Scheduled', value: admissionsDashboardCounts?.scheduled || 0, tone: 'border-emerald-100 bg-emerald-50 text-emerald-700', icon: <CalendarCheck2 size={16} /> },
                            { label: 'Approved', value: admissionsDashboardCounts?.approved || 0, tone: 'border-teal-100 bg-teal-50 text-teal-700', icon: <CheckCircle2 size={16} /> },
                            { label: 'Unsuccessful', value: admissionsDashboardCounts?.unsuccessful || 0, tone: 'border-rose-100 bg-rose-50 text-rose-700', icon: <AlertTriangle size={16} /> }
                        ].map((item) => (
                            <div key={item.label} className={`rounded-xl border p-4 ${item.tone}`}>
                                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                                    {item.icon}
                                    {item.label}
                                </div>
                                <p className="mt-3 text-3xl font-extrabold text-gray-900">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-5 card-hover">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Settings size={16} className="text-emerald-500" /> Secondary Content</h3>
                            <p className="text-xs text-gray-500 mt-1">Switch between population and faculty shortcuts.</p>
                        </div>
                    </div>

                    <div className="inline-flex rounded-2xl bg-emerald-50 p-1 mb-4">
                        <button type="button" onClick={() => setSecondaryView('population')} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${secondaryView === 'population' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-700/80 hover:text-emerald-800'} ${FOCUS_RING}`}>
                            Population
                        </button>
                        <button type="button" onClick={() => setSecondaryView('actions')} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${secondaryView === 'actions' ? 'bg-white text-emerald-700 shadow-sm' : 'text-emerald-700/80 hover:text-emerald-800'} ${FOCUS_RING}`}>
                            Quick Actions
                        </button>
                    </div>

                    {secondaryView === 'population' ? (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(populationByYear)
                                .filter(([year, count]) => year !== '5th Year' || Number(count || 0) > 0)
                                .map(([year, count]) => (
                                    <div key={year} className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                        <p className="text-[11px] text-gray-500 uppercase font-bold mb-1">{year}</p>
                                        <p className="text-2xl font-extrabold text-emerald-700">{Number(count || 0)}</p>
                                    </div>
                                ))}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <button type="button" onClick={() => setActiveModule('counseling_queue')} className={`card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 flex items-start gap-4 group ${FOCUS_RING}`}>
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform"><ClipboardList size={18} /></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">Counseling Queue</h4>
                                    <p className="text-xs text-gray-500">{pendingReviewCount} pending review</p>
                                </div>
                            </button>
                            <button type="button"
                                onClick={() => {
                                    setForwardingToStaff(false);
                                    setReferralForm({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
                                    setShowReferralModal(true);
                                }}
                                className={`card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 flex items-start gap-4 group ${FOCUS_RING}`}
                            >
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:scale-105 transition-transform"><UserPlus size={18} /></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">Refer Student</h4>
                                    <p className="text-xs text-gray-500">Open the faculty referral workflow</p>
                                </div>
                            </button>
                            <button type="button" onClick={() => setActiveModule('reports')} className={`card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-200 flex items-start gap-4 group ${FOCUS_RING}`}>
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-105 transition-transform"><BarChart3 size={18} /></div>
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">View Reports</h4>
                                    <p className="text-xs text-gray-500">Review charts, trends, and department exports</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                <div className="flex flex-col gap-4 border-b border-gray-100 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Recent Counseling</h3>
                        <p className="text-sm text-gray-500 mt-1">Hidden by default to keep the home page focused on today&apos;s priorities.</p>
                    </div>
                    <button type="button" onClick={() => setShowRecentCounseling((previous) => !previous)} className={`inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition ${FOCUS_RING}`}>
                        {showRecentCounseling ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {showRecentCounseling ? 'Hide Recent Counseling' : 'View More Recent Counseling'}
                    </button>
                </div>

                {showRecentCounseling && (
                    <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
                        {recentCounseling.length === 0 ? (
                            <p className="text-center text-gray-400 py-4">No counseling requests found.</p>
                        ) : (
                            recentCounseling.map((request: any) => {
                                const tone = getRecentCounselingTone(String(request?.status || '').trim());

                                return (
                                    <button
                                        key={request.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCounselingReq(request);
                                            setShowCounselingViewModal(true);
                                            setActiveModule('counseling_queue');
                                        }}
                                        className={`w-full flex items-center justify-between gap-4 p-4 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-white transition text-left ${FOCUS_RING}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
                                                {(request?.student_name || 'S').charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{request?.student_name || 'Student'}</p>
                                                <p className="text-xs text-gray-500">{request?.request_type || 'Counseling request'}</p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${tone.tone}`}>
                                            {tone.icon}
                                            {tone.label}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeptHomePage;

