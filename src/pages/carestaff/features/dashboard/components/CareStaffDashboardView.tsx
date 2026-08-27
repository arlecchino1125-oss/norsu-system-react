import React, { useEffect, useMemo } from 'react';
import { m } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { supabase } from '../../../../../lib/supabase';
import {
    Activity, Bell, Calendar, CheckCircle, ClipboardList,
    Users, GraduationCap, HelpCircle, Send, BarChart2, ChevronRight
} from 'lucide-react';
import LoadingSkeleton from '../../../../../components/ui/LoadingSkeleton';
import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    CARE_STAFF_ACTIVE_SUPPORT_STATUSES,
    CARE_STAFF_COUNSELING_ACTIVITY_STATUSES,
    COUNSELING_STATUS,
    SUPPORT_STATUS,
    isCounselingAwaitingDept
} from '../../../../../utils/workflow';
import { toTitleCase } from '../../../../../utils/formatters';

interface CareStaffDashboardViewProps {
    setActiveTab: (tab: string) => void;
    refreshSignal?: number;
}

const PROFILE_ACTIVITY_ACTIONS = [
    'Student Profile Updated',
    'Student Profile Completed',
    'Student Profile Picture Updated'
];

interface DashboardActivityItem {
    id: string;
    type: string;
    icon: React.ReactNode;
    title: string;
    detail: string;
    date: Date;
}

const mapProfileLogToActivity = (log: any): DashboardActivityItem => ({
    id: `profile-${log.id}`,
    type: 'Profile',
    icon: <Users size={16} />,
    title:
        log.action === 'Student Profile Completed'
            ? 'Student profile completed'
            : log.action === 'Student Profile Picture Updated'
                ? 'Student profile picture updated'
                : 'Student profile updated',
    detail: log.details || log.user_name || 'Student modified profile information',
    date: new Date(log.created_at)
});

const mapProfileNotificationToActivity = (notification: any): DashboardActivityItem => {
    const rawMessage = String(notification?.message || '');
    const cleanedMessage = rawMessage.replace(/^\[PROFILE UPDATE\]\s*/i, '');
    return {
        id: `profile-notif-${notification.id}`,
        type: 'Profile',
        icon: <Users size={16} />,
        title: 'Student profile updated',
        detail: cleanedMessage || 'Student modified profile information',
        date: new Date(notification.created_at)
    };
};

const buildStudentNameMap = async (studentIds: string[]) => {
    if (studentIds.length === 0) return new Map<string, string>();
    const { data, error } = await supabase
        .from('students')
        .select('student_id, first_name, middle_name, last_name, suffix')
        .in('student_id', studentIds);
    if (error) throw error;

    const nameMap = new Map<string, string>();
    (data || []).forEach((student: any) => {
        const fullName = [
            student.first_name,
            student.middle_name,
            student.last_name,
            student.suffix
        ].filter(Boolean).join(' ');
        nameMap.set(student.student_id, fullName || student.student_id);
    });
    return nameMap;
};

const fetchCareStaffDashboardData = async () => {
    const [
        { count: studentsCount },
        { count: counselingActiveCount },
        { count: counselingCasesCount },
        { count: supportCount },
        { count: eventsCount },
        { count: profileUpdateCount },
        { data: recentEvents },
        { data: recentCounseling },
        { data: recentSupport },
        { data: recentApps },
        { data: recentProfileUpdates },
        { data: recentProfileNotifications }
    ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('counseling_requests').select('id', { count: 'exact', head: true }).in('status', [...CARE_STAFF_ACTIVE_COUNSELING_STATUSES]),
        supabase.from('counseling_requests').select('id', { count: 'exact', head: true }),
        supabase.from('support_requests').select('id', { count: 'exact', head: true }).in('status', [...CARE_STAFF_ACTIVE_SUPPORT_STATUSES]),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).like('message', '[PROFILE UPDATE]%'),
        supabase.from('events').select('id, title, type, created_at').eq('is_archived', false).order('created_at', { ascending: false }).limit(10),
        supabase.from('counseling_requests').select('id, student_name, status, created_at').in('status', [...CARE_STAFF_COUNSELING_ACTIVITY_STATUSES]).order('created_at', { ascending: false }).limit(10),
        supabase.from('support_requests').select('id, student_name, status, created_at').order('created_at', { ascending: false }).limit(10),
        supabase.from('scholarship_applications').select('id, student_id, status, created_at').neq('status', 'Pending').order('created_at', { ascending: false }).limit(10),
        supabase
            .from('audit_logs')
            .select('id, user_name, action, details, created_at')
            .in('action', PROFILE_ACTIVITY_ACTIONS)
            .order('created_at', { ascending: false })
            .limit(15),
        supabase
            .from('notifications')
            .select('id, message, created_at')
            .like('message', '[PROFILE UPDATE]%')
            .order('created_at', { ascending: false })
            .limit(15)
    ]);

    const scholarshipApplicantNameMap = await buildStudentNameMap(
        [...new Set((recentApps || []).flatMap((app: any) => app.student_id ? [app.student_id] : []))]
    );

    const rawActivities: DashboardActivityItem[] = [
        ...(recentEvents || []).map((e: any) => ({
            id: `evt-${e.id}`,
            type: e.type === 'Announcement' ? 'Announcement' : (e.type || 'Event'),
            icon: e.type === 'Announcement' ? <Bell size={16} /> : <Calendar size={16} />,
            title: e.type === 'Announcement' ? 'Announcement posted' : `${e.type || 'Event'} scheduled`,
            detail: e.title,
            date: new Date(e.created_at)
        })),
        ...(recentCounseling || []).map((c: any) => ({
            id: `coun-${c.id}`,
            type: 'Counseling',
            icon: <Users size={16} />,
            title:
                c.status === COUNSELING_STATUS.COMPLETED ? 'Counseling completed'
                    : c.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'CARE counseling scheduled'
                        : c.status === COUNSELING_STATUS.SCHEDULED ? 'College counseling scheduled'
                            : c.status === COUNSELING_STATUS.REFERRED ? 'Counseling forwarded to CARE Staff'
                                : c.status === COUNSELING_STATUS.REJECTED ? 'Counseling request rejected'
                                    : isCounselingAwaitingDept(c.status) ? 'Counseling request submitted'
                                        : 'Counseling updated',
            detail: c.student_name,
            date: new Date(c.created_at)
        })),
        ...(recentSupport || []).map((s: any) => ({
            id: `sup-${s.id}`,
            type: 'Support',
            icon: <CheckCircle size={16} />,
            title:
                s.status === SUPPORT_STATUS.COMPLETED ? 'Support resolved'
                    : s.status === SUPPORT_STATUS.FORWARDED_TO_DEPT ? 'Support forwarded to college'
                        : s.status === SUPPORT_STATUS.VISIT_SCHEDULED ? 'College visit scheduled'
                            : s.status === SUPPORT_STATUS.RESOLVED_BY_DEPT ? 'College resolved support request'
                                : s.status === SUPPORT_STATUS.REFERRED_TO_CARE ? 'Support referred back to CARE Staff'
                                    : s.status === SUPPORT_STATUS.REJECTED ? 'Support request rejected'
                                        : 'Support request received',
            detail: s.student_name,
            date: new Date(s.created_at)
        })),
        ...(recentApps || []).map((a: any) => ({
            id: `app-${a.id}`,
            type: 'Application',
            icon: <ClipboardList size={16} />,
            title: `Application ${a.status?.toLowerCase() || ''}`,
            detail: scholarshipApplicantNameMap.get(a.student_id) || a.student_id || 'Unknown Applicant',
            date: new Date(a.created_at)
        })),
        ...(recentProfileUpdates || []).map((log: any) => mapProfileLogToActivity(log)),
        ...(recentProfileNotifications || []).map((notif: any) => mapProfileNotificationToActivity(notif))
    ];

    // Deduplicate activities that share the same message within a short timeframe
    const deduplicatedActivities = rawActivities.reduce((acc: DashboardActivityItem[], current) => {
        const isDuplicate = acc.some(item =>
            item.id === current.id ||
            (item.detail === current.detail && Math.abs(item.date.getTime() - current.date.getTime()) < 10000)
        );
        if (!isDuplicate) {
            acc.push(current);
        }
        return acc;
    }, []);

    const sortedActivities = deduplicatedActivities
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 15);

    return {
        counts: {
            students: studentsCount || 0,
            counselingActive: counselingActiveCount || 0,
            counselingCases: counselingCasesCount || 0,
            support: supportCount || 0,
            events: eventsCount || 0
        },
        roleAlerts: {
            profileUpdates: profileUpdateCount || 0
        },
        activities: sortedActivities
    };
};

const isDateInThisWeek = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
};

const renderActivityDetail = (detail: string, type: string) => {
    if (!detail) return null;
    // Pattern: "Student Name (StudentID) modified: XYZ"
    const studentWithIdMatch = detail.match(/^([^(]+?)(\s*\([^)]+\))\s*(.*)$/);
    if (studentWithIdMatch) {
        return (
            <>
                <span className="font-bold text-slate-800">{toTitleCase(studentWithIdMatch[1])}{studentWithIdMatch[2]}</span>
                {studentWithIdMatch[3] ? ` ${studentWithIdMatch[3]}` : ''}
            </>
        );
    }
    if (type === 'Counseling' || type === 'Support' || type === 'Profile' || type === 'Application') {
        return <span className="font-bold text-slate-800">{toTitleCase(detail)}</span>;
    }
    return <span className="font-medium text-slate-600">{detail}</span>;
};

const CareStaffDashboardView: React.FC<CareStaffDashboardViewProps> = ({ setActiveTab, refreshSignal = 0 }) => {
    const queryClient = useQueryClient();

    const { data: dashboardData, isLoading: qLoading } = useQuery({
        queryKey: ['care_staff_dashboard_data', refreshSignal],
        queryFn: fetchCareStaffDashboardData
    });

    const counts = dashboardData?.counts || { students: 0, counselingActive: 0, counselingCases: 0, support: 0, events: 0 };
    const roleAlerts = dashboardData?.roleAlerts || { profileUpdates: 0 };
    const activities = dashboardData?.activities || [];
    const loading = qLoading;

    useEffect(() => {
        let isMounted = true;

        const removeProfileActivityChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_activity')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload: any) => {
                    if (!isMounted) return;
                    const action = payload?.new?.action;
                    if (!PROFILE_ACTIVITY_ACTIONS.includes(action)) return;
                    queryClient.invalidateQueries({ queryKey: ['care_staff_dashboard_data'] });
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        const removeProfileNotificationChannel = createDeferredChannelCleanup(
            () => supabase
                .channel('care_staff_profile_notification_activity')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload: any) => {
                    if (!isMounted) return;
                    const message = String(payload?.new?.message || '');
                    if (!message.startsWith('[PROFILE UPDATE]')) return;
                    queryClient.invalidateQueries({ queryKey: ['care_staff_dashboard_data'] });
                })
                .subscribe(),
            (channel) => supabase.removeChannel(channel)
        );

        return () => {
            isMounted = false;
            removeProfileActivityChannel();
            removeProfileNotificationChannel();
        };
    }, [queryClient]);

    const { thisWeekActivities, earlierActivities } = useMemo(() => {
        const thisWeek: DashboardActivityItem[] = [];
        const earlier: DashboardActivityItem[] = [];

        activities.forEach((act) => {
            if (isDateInThisWeek(act.date)) {
                thisWeek.push(act);
            } else {
                earlier.push(act);
            }
        });

        return { thisWeekActivities: thisWeek, earlierActivities: earlier };
    }, [activities]);

    if (loading) {
        return (
            <div className="space-y-4">
                <LoadingSkeleton type="stats" count={4} />
                <LoadingSkeleton type="card" count={2} />
            </div>
        );
    }

    const cardVariants = {
        hidden: { opacity: 0, y: -10, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } }
    };

    return (
        <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col min-h-0 gap-4 lg:gap-5 h-full overflow-hidden"
        >
            {/* Top Stat Cards */}
            <m.div
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0, y: -8 },
                    show: {
                        opacity: 1,
                        y: 0,
                        transition: { staggerChildren: 0.06, duration: 0.35, ease: 'easeOut' }
                    }
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0"
            >
                {/* 1. Active Students */}
                <m.div
                    variants={cardVariants}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200/60 border-t-[3.5px] border-t-[#10B981] shadow-2xs hover:shadow-md transition-all duration-200"
                >
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            ACTIVE STUDENTS
                        </span>
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                            {counts.students.toLocaleString()}
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#10B981] text-white flex items-center justify-center shadow-xs shrink-0">
                        <GraduationCap size={22} />
                    </div>
                </m.div>

                {/* 2. Counseling (Active / Cases) */}
                <m.div
                    variants={cardVariants}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200/60 border-t-[3.5px] border-t-[#8B5CF6] shadow-2xs hover:shadow-md transition-all duration-200"
                >
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            COUNSELING
                        </span>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-2xl font-extrabold text-slate-900 leading-none">
                                    {counts.counselingActive.toLocaleString()}
                                </span>
                                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                    ACTIVE
                                </span>
                            </div>
                            <div className="w-[1px] h-8 bg-slate-200" />
                            <div className="flex flex-col">
                                <span className="text-2xl font-extrabold text-slate-900 leading-none">
                                    {counts.counselingCases.toLocaleString()}
                                </span>
                                <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 mt-1">
                                    CASES
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6] text-white flex items-center justify-center shadow-xs shrink-0">
                        <Users size={22} />
                    </div>
                </m.div>

                {/* 3. Support Cases */}
                <m.div
                    variants={cardVariants}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200/60 border-t-[3.5px] border-t-[#F59E0B] shadow-2xs hover:shadow-md transition-all duration-200"
                >
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            SUPPORT CASES
                        </span>
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                            {counts.support.toLocaleString()}
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#F59E0B] text-white flex items-center justify-center shadow-xs shrink-0">
                        <HelpCircle size={22} />
                    </div>
                </m.div>

                {/* 4. Total Events */}
                <m.div
                    variants={cardVariants}
                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                    className="flex items-center justify-between rounded-2xl bg-white p-5 border border-slate-200/60 border-t-[3.5px] border-t-[#6366F1] shadow-2xs hover:shadow-md transition-all duration-200"
                >
                    <div className="flex flex-col">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            TOTAL EVENTS
                        </span>
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
                            {counts.events.toLocaleString()}
                        </span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#6366F1] text-white flex items-center justify-center shadow-xs shrink-0">
                        <Calendar size={22} />
                    </div>
                </m.div>
            </m.div>

            {/* Main Content Area */}
            <m.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.18, ease: 'easeOut' }}
                className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5"
            >
                {/* Left: Recent Activity List */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-2xs p-5 lg:p-6 flex flex-col min-h-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                <Activity size={16} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">Recent Activity</h2>
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100/90 px-3 py-1 rounded-full">
                            {activities.length} updates
                        </span>
                    </div>

                    {/* Scrollable Timeline */}
                    <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 custom-scrollbar space-y-4">
                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 opacity-60">
                                <Activity size={32} className="text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium text-sm">No recent activity yet.</p>
                            </div>
                        ) : (
                            <>
                                {/* This Week Group */}
                                {thisWeekActivities.length > 0 && (
                                    <div className="space-y-2.5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                THIS WEEK
                                            </span>
                                            <div className="h-[1px] flex-1 bg-slate-100" />
                                        </div>

                                        <div className="space-y-2.5">
                                            {thisWeekActivities.map((act) => (
                                                <div
                                                    key={act.id}
                                                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/60 border-l-[3.5px] border-l-[#8B5CF6] hover:bg-purple-50/20 hover:border-purple-200 transition-all duration-200 group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                                                            {act.icon}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[13.5px] font-bold text-slate-900 tracking-tight leading-tight">
                                                                {act.title}
                                                            </p>
                                                            <p className="text-[12px] text-slate-500 leading-snug mt-0.5 truncate">
                                                                {renderActivityDetail(act.detail, act.type)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">
                                                            {act.type === 'Profile' ? 'PROFILE' : act.type.toUpperCase()}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-slate-400">
                                                            {act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Earlier Group */}
                                {earlierActivities.length > 0 && (
                                    <div className="space-y-2.5 pt-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                EARLIER
                                            </span>
                                            <div className="h-[1px] flex-1 bg-slate-100" />
                                        </div>

                                        <div className="space-y-2.5">
                                            {earlierActivities.map((act) => (
                                                <div
                                                    key={act.id}
                                                    className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/60 border-l-[3.5px] border-l-[#8B5CF6] hover:bg-purple-50/20 hover:border-purple-200 transition-all duration-200 group"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-105 transition-transform">
                                                            {act.icon}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-[13.5px] font-bold text-slate-900 tracking-tight leading-tight">
                                                                {act.title}
                                                            </p>
                                                            <p className="text-[12px] text-slate-500 leading-snug mt-0.5 truncate">
                                                                {renderActivityDetail(act.detail, act.type)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                                                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">
                                                            {act.type === 'Profile' ? 'PROFILE' : act.type.toUpperCase()}
                                                        </span>
                                                        <span className="text-[11px] font-medium text-slate-400">
                                                            {act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Priority Alerts & Quick Actions */}
                <div className="flex flex-col gap-4 lg:gap-5 min-h-0">
                    {/* Priority Alerts */}
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xs p-5 shrink-0">
                        <div className="flex items-center gap-2.5 mb-3.5">
                            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                                <Bell size={16} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight">Priority Alerts</h2>
                        </div>

                        <m.button
                            whileHover={{ scale: 1.01, x: 2 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setActiveTab('population')}
                            className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-purple-200/70 border-l-[3.5px] border-l-[#8B5CF6] bg-purple-50/50 hover:bg-purple-100/50 transition-all text-left group"
                        >
                            <div>
                                <p className="text-[14px] font-bold text-purple-900 group-hover:text-purple-950 transition-colors">
                                    Profile Updates
                                </p>
                                <p className="text-[12px] font-medium text-slate-500 mt-0.5">
                                    Pending system review
                                </p>
                            </div>
                            <div className="px-3 py-1 rounded-lg bg-[#8B5CF6] text-white font-bold text-xs shadow-xs">
                                {roleAlerts.profileUpdates.toLocaleString()}
                            </div>
                        </m.button>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-white rounded-3xl border border-slate-200/60 shadow-2xs p-5 flex flex-col justify-between flex-1 min-h-0">
                        <div>
                            <div className="flex items-center gap-2.5 mb-3.5">
                                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                                    <Activity size={16} />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">Quick Actions</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-3.5">
                                <m.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setActiveTab('events')}
                                    className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 hover:shadow-xs transition-all group cursor-pointer"
                                >
                                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#6366F1] shadow-2xs group-hover:scale-110 group-hover:text-purple-600 transition-all duration-200">
                                        <Calendar size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 group-hover:text-purple-900 transition-colors text-center">
                                        Schedule Event
                                    </span>
                                </m.button>

                                <m.button
                                    whileHover={{ y: -2 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setActiveTab('events')}
                                    className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-purple-200 hover:bg-purple-50/40 hover:shadow-xs transition-all group cursor-pointer"
                                >
                                    <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center text-[#8B5CF6] shadow-2xs group-hover:scale-110 group-hover:text-purple-600 transition-all duration-200">
                                        <Send size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 group-hover:text-purple-900 transition-colors text-center">
                                        Send Notice
                                    </span>
                                </m.button>
                            </div>
                        </div>

                        {/* Open System Analytics CTA Button */}
                        <m.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTab('analytics')}
                            className="w-full mt-3.5 flex items-center justify-between px-4 py-3 rounded-2xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-[13.5px] shadow-2xs hover:shadow-md transition-all group cursor-pointer"
                        >
                            <div className="flex items-center gap-2.5">
                                <BarChart2 size={18} />
                                <span>Open System Analytics</span>
                            </div>
                            <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                        </m.button>
                    </div>
                </div>
            </m.div>
        </m.div>
    );
};

export default CareStaffDashboardView;
