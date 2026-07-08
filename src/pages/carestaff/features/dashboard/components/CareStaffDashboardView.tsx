import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createDeferredChannelCleanup } from '../../../../../lib/realtime';
import { supabase } from '../../../../../lib/supabase';
import {
    Activity, Bell, Calendar, CheckCircle, ClipboardList,
    Users, GraduationCap, Rocket, BarChart2, Send, ChevronRight
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card';
import {
    CARE_STAFF_ACTIVE_COUNSELING_STATUSES,
    CARE_STAFF_ACTIVE_SUPPORT_STATUSES,
    CARE_STAFF_COUNSELING_ACTIVITY_STATUSES,
    COUNSELING_STATUS,
    SUPPORT_STATUS,
    isCounselingAwaitingDept
} from '../../../../../utils/workflow';
import { isAttendanceActivityType } from '../../../../../utils/eventAudience';

interface CareStaffDashboardViewProps {
    setActiveTab: (tab: string) => void;
    refreshSignal?: number;
}

const CareStaffDashboardView: React.FC<CareStaffDashboardViewProps> = ({ setActiveTab, refreshSignal = 0 }) => {
    const PROFILE_ACTIVITY_ACTIONS = [
        'Student Profile Updated',
        'Student Profile Completed',
        'Student Profile Picture Updated'
    ];

    const queryClient = useQueryClient();

    const mapProfileLogToActivity = (log: any) => ({
        id: `profile-${log.id}`,
        type: 'Profile',
        icon: <Users size={16} />,
        color: 'from-fuchsia-400 to-purple-500',
        title:
            log.action === 'Student Profile Completed'
                ? 'Student profile completed'
                : log.action === 'Student Profile Picture Updated'
                    ? 'Student profile picture updated'
                    : 'Student profile updated',
        detail: log.details || log.user_name || 'Student modified profile information',
        date: new Date(log.created_at)
    });

    const mapProfileNotificationToActivity = (notification: any) => {
        const rawMessage = String(notification?.message || '');
        const cleanedMessage = rawMessage.replace(/^\[PROFILE UPDATE\]\s*/i, '');
        return {
            id: `profile-notif-${notification.id}`,
            type: 'Profile',
            icon: <Users size={16} />,
            color: 'from-fuchsia-400 to-purple-500',
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

    // Refactor fetching to React Query to enable client-side caching & request deduplication
    const { data: dashboardData, isLoading: qLoading } = useQuery({
        queryKey: ['care_staff_dashboard_data', refreshSignal],
        queryFn: async () => {
            const [
                { count: studentsCount },
                { count: counselingCount },
                { count: supportCount },
                { count: eventsCount },
                { count: counselingForCareCount },
                { count: supportForCareCount },
                { count: profileUpdateCount }
            ] = await Promise.all([
                supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_archived', false),
                supabase.from('counseling_requests').select('id', { count: 'exact', head: true }).in('status', [...CARE_STAFF_ACTIVE_COUNSELING_STATUSES]),
                supabase.from('support_requests').select('id', { count: 'exact', head: true }).in('status', [...CARE_STAFF_ACTIVE_SUPPORT_STATUSES]),
                supabase.from('events').select('id', { count: 'exact', head: true }).eq('is_archived', false),
                supabase.from('counseling_requests').select('id', { count: 'exact', head: true }).in('status', [COUNSELING_STATUS.REFERRED, COUNSELING_STATUS.STAFF_SCHEDULED]),
                supabase.from('support_requests').select('id', { count: 'exact', head: true }).in('status', [SUPPORT_STATUS.SUBMITTED, SUPPORT_STATUS.REFERRED_TO_CARE]),
                supabase.from('notifications').select('id', { count: 'exact', head: true }).like('message', '[PROFILE UPDATE]%')
            ]);

            const [
                { data: recentEvents },
                { data: recentCounseling },
                { data: recentSupport },
                { data: recentApps },
                { data: recentProfileUpdates },
                { data: recentProfileNotifications }
            ] = await Promise.all([
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
                [...new Set((recentApps || []).map((app: any) => app.student_id).filter(Boolean))]
            );

            const combinedActivities = [
                ...(recentEvents || []).map((e: any) => ({
                    id: `evt-${e.id}`,
                    type: e.type === 'Announcement' ? 'Announcement' : e.type,
                    icon: e.type === 'Announcement' ? <Bell size={16} /> : <Calendar size={16} />,
                    color: e.type === 'Announcement' ? 'from-purple-400 to-indigo-500' : 'from-blue-400 to-indigo-500',
                    title: e.type === 'Announcement' ? 'Announcement posted' : `${e.type || 'Event'} scheduled`,
                    detail: e.title,
                    date: new Date(e.created_at)
                })),
                ...(recentCounseling || []).map((c: any) => ({
                    id: `coun-${c.id}`,
                    type: 'Counseling',
                    icon: <Users size={16} />,
                    color:
                        c.status === COUNSELING_STATUS.COMPLETED ? 'from-green-400 to-emerald-500'
                            : c.status === COUNSELING_STATUS.REFERRED ? 'from-purple-400 to-violet-500'
                                : c.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'from-indigo-400 to-blue-500'
                                    : c.status === COUNSELING_STATUS.REJECTED ? 'from-rose-400 to-red-500'
                                        : 'from-blue-400 to-cyan-500',
                    title:
                        c.status === COUNSELING_STATUS.COMPLETED ? 'Counseling completed'
                            : c.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'CARE counseling scheduled'
                                : c.status === COUNSELING_STATUS.SCHEDULED ? 'Department counseling scheduled'
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
                    color:
                        s.status === SUPPORT_STATUS.COMPLETED ? 'from-green-400 to-emerald-500'
                            : s.status === SUPPORT_STATUS.FORWARDED_TO_DEPT ? 'from-orange-400 to-amber-500'
                                : s.status === SUPPORT_STATUS.VISIT_SCHEDULED ? 'from-blue-400 to-cyan-500'
                                    : s.status === SUPPORT_STATUS.RESOLVED_BY_DEPT ? 'from-emerald-400 to-teal-500'
                                        : s.status === SUPPORT_STATUS.REFERRED_TO_CARE ? 'from-orange-400 to-yellow-500'
                                            : s.status === SUPPORT_STATUS.REJECTED ? 'from-rose-400 to-red-500'
                                                : 'from-amber-400 to-yellow-500',
                    title:
                        s.status === SUPPORT_STATUS.COMPLETED ? 'Support resolved'
                            : s.status === SUPPORT_STATUS.FORWARDED_TO_DEPT ? 'Support forwarded to department'
                                : s.status === SUPPORT_STATUS.VISIT_SCHEDULED ? 'Department visit scheduled'
                                    : s.status === SUPPORT_STATUS.RESOLVED_BY_DEPT ? 'Department resolved support request'
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
                    color: a.status === 'Approved' ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500',
                    title: `Application ${a.status?.toLowerCase() || ''}`,
                    detail: scholarshipApplicantNameMap.get(a.student_id) || a.student_id || 'Unknown Applicant',
                    date: new Date(a.created_at)
                })),
                ...(recentProfileUpdates || []).map((log: any) => mapProfileLogToActivity(log)),
                ...(recentProfileNotifications || []).map((notif: any) => mapProfileNotificationToActivity(notif))
            ].sort((a: any, b: any) => b.date.getTime() - a.date.getTime()).slice(0, 10);

            return {
                counts: {
                    students: studentsCount || 0,
                    counseling: counselingCount || 0,
                    support: supportCount || 0,
                    events: eventsCount || 0
                },
                roleAlerts: {
                    counselingForCare: counselingForCareCount || 0,
                    supportForCare: supportForCareCount || 0,
                    profileUpdates: profileUpdateCount || 0
                },
                activities: combinedActivities
            };
        }
    });

    const counts = dashboardData?.counts || { students: 0, counseling: 0, support: 0, events: 0 };
    const roleAlerts = dashboardData?.roleAlerts || { counselingForCare: 0, supportForCare: 0, profileUpdates: 0 };
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
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-8 pb-10 overflow-x-hidden"
        >
            {/* Stat Cards - Kinetic Upgrade */}
            <motion.div
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {[
                    { label: 'Active Students', value: counts.students, icon: <GraduationCap size={22} />, gradient: 'from-emerald-400 to-teal-600', shadow: 'shadow-emerald-500/30' },
                    { label: 'Counselings (Active)', value: counts.counseling, icon: <Users size={22} />, gradient: 'from-blue-400 to-indigo-600', shadow: 'shadow-blue-500/30' },
                    { label: 'Support Cases (Active)', value: counts.support, icon: <CheckCircle size={22} />, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
                    { label: 'Total Events', value: counts.events, icon: <Calendar size={22} />, gradient: 'from-purple-400 to-violet-600', shadow: 'shadow-purple-500/30' },
                ].map((card, idx) => (
                    <motion.div
                        key={idx}
                        variants={{
                            hidden: { y: 20, opacity: 0, scale: 0.95 },
                            show: { y: 0, opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
                        }}
                        whileHover={{ y: -6, scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                        className="group relative flex flex-col justify-between h-36 bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-2xl hover:border-purple-200/60 transition-all duration-500 overflow-hidden p-6"
                    >
                        {/* Hover Ambient Glow */}
                        <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${card.gradient} rounded-full opacity-0 group-hover:opacity-10 group-hover:scale-[2] transition-all duration-700 ease-out`} />

                        <div className="flex items-center justify-between relative z-10 w-full mb-2">
                            <span className="text-slate-500 font-semibold text-[13px] uppercase tracking-wider">{card.label}</span>
                            <motion.div
                                whileHover={{ scale: 1.15, rotate: 5 }}
                                className={`w-12 h-12 flex items-center justify-center bg-gradient-to-br ${card.gradient} rounded-2xl text-white shadow-lg ${card.shadow} transition-transform`}
                            >
                                {card.icon}
                            </motion.div>
                        </div>
                        <h3 className="text-4xl font-extrabold text-slate-800 tracking-tight relative z-10 group-hover:text-purple-900 transition-colors">{card.value}</h3>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed - Floating Timeline UI */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.2 }}
                    className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-7 flex flex-col"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
                            <Activity size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 tracking-tight">Recent Activity</h2>
                    </div>

                    <div className="flex-1 space-y-3 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
                        {activities.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 opacity-60">
                                <Activity size={32} className="text-slate-300 mb-3" />
                                <p className="text-slate-500 font-medium">No recent activity yet.</p>
                            </div>
                        ) : (
                            activities.map((act, idx) => (
                                <motion.div
                                    key={act.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + (idx * 0.05) }}
                                    whileHover={{ x: 6, scale: 1.01, backgroundColor: "rgb(250, 245, 255)", transition: { type: "spring", stiffness: 400, damping: 25 } }}
                                    className="flex items-start gap-4 p-4 rounded-2xl border border-transparent hover:border-purple-100 transition-colors group cursor-default"
                                >
                                    <div className={`w-10 h-10 rounded-[14px] bg-gradient-to-br ${act.color} flex items-center justify-center text-white flex-shrink-0 shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                                        {act.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <p className="text-[15px] font-bold text-slate-800 tracking-tight group-hover:text-purple-900 transition-colors">{act.title}</p>
                                        <p className="text-[13.5px] text-slate-500 leading-snug mt-1">{act.detail}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5 pt-0.5">
                                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${isAttendanceActivityType(act.type) ? 'bg-blue-50 text-blue-600' :
                                            act.type === 'Announcement' ? 'bg-purple-50 text-purple-600' :
                                                act.type === 'Counseling' ? 'bg-teal-50 text-teal-600' :
                                                    act.type === 'Support' ? 'bg-amber-50 text-amber-600' :
                                                        act.type === 'Profile' ? 'bg-fuchsia-50 text-fuchsia-700' :
                                                            'bg-slate-100 text-slate-600'
                                            }`}>
                                            {act.type}
                                        </span>
                                        <p className="text-[11px] font-semibold text-slate-400">{act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                <div className="space-y-8 flex flex-col">
                    {/* Role-Based Alerts Bento */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.3 }}
                        className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-7"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-red-50 rounded-xl text-red-500">
                                <Bell size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Priority Alerts</h2>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Counseling Cases', desc: 'Assigned to CARE Staff', value: roleAlerts.counselingForCare, tab: 'counseling', tone: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
                                { label: 'Support Cases', desc: 'Waiting for resolution', value: roleAlerts.supportForCare, tab: 'support', tone: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/20', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
                                { label: 'Profile Updates', desc: 'Pending system review', value: roleAlerts.profileUpdates, tab: 'population', tone: 'from-fuchsia-400 to-purple-500', shadow: 'shadow-fuchsia-500/20', bg: 'bg-fuchsia-50 border-fuchsia-100', text: 'text-fuchsia-700' }
                            ].map((item, idx) => (
                                <motion.button
                                    key={idx}
                                    whileHover={{ scale: 1.02, x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveTab(item.tab)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all hover:shadow-md ${item.bg}`}
                                >
                                    <div className="text-left">
                                        <p className={`text-[14px] font-bold ${item.text}`}>{item.label}</p>
                                        <p className="text-[12px] font-medium text-slate-500 mt-0.5">{item.desc}</p>
                                    </div>
                                    <div className={`px-4 py-1.5 rounded-xl bg-gradient-to-br ${item.tone} ${item.shadow} text-white font-bold text-sm shadow-md`}>
                                        {item.value}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>

                    {/* Quick Actions Grid Bento */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.4 }}
                        className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-7 flex-1 flex flex-col"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600">
                                <Rocket size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Quick Actions</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <motion.button
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveTab('events')}
                                className="flex flex-col items-center justify-center gap-3 p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:border-purple-200 hover:bg-purple-50 hover:shadow-lg transition-colors group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300">
                                    <Calendar size={22} />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 text-center tracking-tight group-hover:text-purple-800 transition-colors">Schedule<br />Event</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05, y: -4 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setActiveTab('events')}
                                className="flex flex-col items-center justify-center gap-3 p-5 rounded-[1.5rem] bg-slate-50 border border-slate-100 hover:border-purple-200 hover:bg-purple-50 hover:shadow-lg transition-colors group"
                            >
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-purple-500 shadow-sm group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300">
                                    <Send size={22} />
                                </div>
                                <span className="text-[13px] font-bold text-slate-700 text-center tracking-tight group-hover:text-purple-800 transition-colors">Send<br />Notice</span>
                            </motion.button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTab('analytics')}
                            className="w-full mt-4 flex items-center justify-between p-4 rounded-[1.5rem] bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:shadow-xl transition-shadow group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                                    <BarChart2 size={20} />
                                </div>
                                <span className="font-bold text-[15px] tracking-tight">Open System Analytics</span>
                            </div>
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

export default CareStaffDashboardView;
