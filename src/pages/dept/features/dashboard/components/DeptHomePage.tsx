import React, { useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3,
    Bell,
    CalendarCheck2,
    CalendarClock,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    FileText,
    Info,
    Settings,
    UserPlus,
    Users
} from 'lucide-react';
import {
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

const DEPT_HOME_ALERT_ICONS: Record<string, React.ReactNode> = {
    'admissions-ready': <CalendarClock size={16} />,
    'admissions-absent': <AlertTriangle size={16} />,
    'counseling-review': <ClipboardList size={16} />,
    'support-forwarded': <Bell size={16} />
};

const EMPTY_ROWS: readonly any[] = [];

/** Inline view of today's interviews, counseling sessions, and department events. */
const TodaySchedulePanel = ({
    todayInterviews, todayEvents, todayCounselingSessions, admissionsDashboardCounts,
    setActiveModule, onOpenCounselingRequest
}: any) => (
        <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                        <CalendarCheck2 size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">Today&apos;s Schedule</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2"><CalendarClock size={16} /> Interviews <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{todayInterviews.length}</span></h4>
                        <button type="button" onClick={() => setActiveModule('admissions')} className={`text-xs font-bold text-blue-700 hover:text-blue-800 ${FOCUS_RING}`}>
                            View All
                        </button>
                    </div>
                    {todayInterviews.length === 0 ? (
                        <p className="text-sm text-blue-700/80">None today · {admissionsDashboardCounts?.scheduled || 0} in the interview queue.</p>
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
                        <h4 className="font-bold text-emerald-900 flex items-center gap-2"><ClipboardList size={16} /> Counseling <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{todayCounselingSessions.length}</span></h4>
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
                                    onClick={() => onOpenCounselingRequest(request)}
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
                        <h4 className="font-bold text-amber-900 flex items-center gap-2"><Bell size={16} /> Events <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{todayEvents.length}</span></h4>
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
);


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

    const openCounselingRequest = (request: any) => {
        setActiveModule('counseling_queue');
        setSelectedCounselingReq(request);
        setShowCounselingViewModal(true);
    };

    const todayKey = useMemo(() => getDateKey(new Date()), []);

    const todayInterviews = useMemo(
        () => (Array.isArray(interviewQueueRows) ? interviewQueueRows : []).filter((app: any) => getDateKey(app?.interview_date) === todayKey),
        [interviewQueueRows, todayKey]
    );

    const todayEvents = useMemo(
        () => (Array.isArray(eventsList) ? eventsList : []).filter((event: any) => getDateKey(event?.event_date) === todayKey),
        [eventsList, todayKey]
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
        { label: 'Total Requests', value: totalCounselingRequests, icon: <FileText size={16} />, gradient: 'from-blue-400 to-indigo-500' },
        { label: 'Pending Approval', value: pendingReviewCount, icon: <Info size={16} />, gradient: 'from-amber-400 to-orange-500' },
        { label: 'With CARE Staff', value: withCareCount, icon: <CheckCircle2 size={16} />, gradient: 'from-emerald-400 to-teal-500' },
        { label: 'Total Students', value: totalStudents, icon: <Users size={16} />, gradient: 'from-violet-400 to-purple-500' }
    ];
    const visibleDepartmentAlertItems = (departmentAlertItems || []).filter((item: any) => Number(item?.count || 0) > 0);
    const visiblePopulationByYearEntries = Object.entries(populationByYear).filter(
        ([year, count]) => year !== '5th Year' || Number(count || 0) > 0
    );

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6 md:p-8 text-white shadow-2xl shadow-emerald-900/20">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl -ml-16 -mb-16" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 text-center lg:text-left">
                        <p className="text-emerald-300/80 text-sm font-medium tracking-wide uppercase mb-2">{clock.greeting}</p>
                        <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
                            Welcome to <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-green-300 bg-clip-text text-transparent">Dept. Head Portal</span>
                        </h1>
                        <p className="text-emerald-200/75 text-base max-w-2xl">
                            Prioritize today&apos;s interviews and counseling workload, then drill into secondary student and referral tools only when you need them.
                        </p>
                    </div>

                    <div className="text-center flex-shrink-0">
                        <div className="relative">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-5 min-w-[240px]">
                                <div className="flex items-baseline justify-center gap-1 mb-2">
                                    <span className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums">{clock.h}</span>
                                    <span className="text-4xl md:text-5xl font-light text-emerald-300 animate-pulse">:</span>
                                    <span className="text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums">{clock.m}</span>
                                    <span className="text-4xl md:text-5xl font-light text-emerald-300 animate-pulse">:</span>
                                    <span className="text-3xl md:text-4xl font-bold tracking-tight tabular-nums text-emerald-300">{clock.s}</span>
                                    <span className="text-lg font-bold text-emerald-400 ml-2 self-start mt-1">{clock.ampm}</span>
                                </div>
                                <p className="text-emerald-300/70 text-sm font-medium">{clock.dateString}</p>
                            </div>
                            <div className="absolute inset-0 bg-emerald-500/10 blur-2xl rounded-3xl -z-10" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 stagger-children">
                {primaryStats.map((card) => (
                    <div key={card.label} className="card-hover bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-gray-100/80 flex flex-col justify-between h-20">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-500 font-medium text-xs truncate">{card.label}</span>
                            <div className={`p-1.5 bg-gradient-to-br ${card.gradient} rounded-lg text-white shadow-md shrink-0`}>{card.icon}</div>
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900">{card.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <TodaySchedulePanel
                    todayInterviews={todayInterviews}
                    todayEvents={todayEvents}
                    todayCounselingSessions={todayCounselingSessions}
                    admissionsDashboardCounts={admissionsDashboardCounts}
                    setActiveModule={setActiveModule}
                    onOpenCounselingRequest={openCounselingRequest}
                />

                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Bell size={18} className="text-emerald-500" /> Role-Based Alerts</h3>
                    <div className="space-y-3">
                        {visibleDepartmentAlertItems.length === 0 ? (
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-5 text-sm text-emerald-700">
                                No urgent department alerts right now.
                            </div>
                        ) : (
                            visibleDepartmentAlertItems.map((item: any) => (
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

            <div className="grid grid-cols-1 gap-8">
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
                            {visiblePopulationByYearEntries.map(([year, count]) => (
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
        </div>
    );
};

export default DeptHomePage;

