import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Activity, Bell, Calendar, CheckCircle, ClipboardList,
    Users, GraduationCap, Rocket, BarChart2, Send, ChevronRight
} from 'lucide-react';

interface CareStaffDashboardViewProps {
    setActiveTab: (tab: string) => void;
}

const CareStaffDashboardView: React.FC<CareStaffDashboardViewProps> = ({ setActiveTab }) => {
    const [counts, setCounts] = useState({
        students: 0,
        counseling: 0,
        support: 0,
        events: 0
    });
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchDashboardData = async () => {
            try {
                // Fetch Counts
                const [
                    { count: studentsCount },
                    { count: counselingCount },
                    { count: supportCount },
                    { count: eventsCount }
                ] = await Promise.all([
                    supabase.from('students').select('*', { count: 'exact', head: true }),
                    supabase.from('counseling_requests').select('*', { count: 'exact', head: true }).in('status', ['Scheduled', 'Pending']),
                    supabase.from('support_requests').select('*', { count: 'exact', head: true }).in('status', ['Pending', 'Forwarded to Dept']),
                    supabase.from('events').select('*', { count: 'exact', head: true })
                ]);

                if (!isMounted) return;
                setCounts({
                    students: studentsCount || 0,
                    counseling: counselingCount || 0,
                    support: supportCount || 0,
                    events: eventsCount || 0
                });

                // Fetch Recent Activity (top 10 from each table)
                const [
                    { data: recentEvents },
                    { data: recentCounseling },
                    { data: recentSupport },
                    { data: recentApps }
                ] = await Promise.all([
                    supabase.from('events').select('id, title, type, created_at').order('created_at', { ascending: false }).limit(10),
                    supabase.from('counseling_requests').select('id, student_name, status, updated_at, created_at').in('status', ['Scheduled', 'Completed']).order('created_at', { ascending: false }).limit(10),
                    supabase.from('support_requests').select('id, student_name, status, updated_at, created_at').order('created_at', { ascending: false }).limit(10),
                    supabase.from('scholarship_applications').select('id, first_name, last_name, status, updated_at, created_at').neq('status', 'Pending').order('created_at', { ascending: false }).limit(10)
                ]);

                if (!isMounted) return;

                const combinedActivities = [
                    ...(recentEvents || []).map((e: any) => ({
                        id: `evt-${e.id}`,
                        type: e.type === 'Announcement' ? 'Announcement' : 'Event',
                        icon: e.type === 'Announcement' ? <Bell size={16} /> : <Calendar size={16} />,
                        color: e.type === 'Announcement' ? 'from-purple-400 to-indigo-500' : 'from-blue-400 to-indigo-500',
                        title: e.type === 'Announcement' ? 'Announcement posted' : 'Event scheduled',
                        detail: e.title,
                        date: new Date(e.created_at)
                    })),
                    ...(recentCounseling || []).map((c: any) => ({
                        id: `coun-${c.id}`,
                        type: 'Counseling',
                        icon: <Users size={16} />,
                        color: c.status === 'Completed' ? 'from-green-400 to-emerald-500' : 'from-blue-400 to-cyan-500',
                        title: c.status === 'Completed' ? 'Counseling completed' : 'Counseling scheduled',
                        detail: c.student_name,
                        date: new Date(c.updated_at || c.created_at)
                    })),
                    ...(recentSupport || []).map((s: any) => ({
                        id: `sup-${s.id}`,
                        type: 'Support',
                        icon: <CheckCircle size={16} />,
                        color: s.status === 'Completed' ? 'from-green-400 to-emerald-500' : s.status === 'Forwarded to Dept' ? 'from-orange-400 to-amber-500' : 'from-amber-400 to-yellow-500',
                        title: s.status === 'Completed' ? 'Support resolved' : s.status === 'Forwarded to Dept' ? 'Support forwarded' : 'Support request received',
                        detail: s.student_name,
                        date: new Date(s.updated_at || s.created_at)
                    })),
                    ...(recentApps || []).map((a: any) => ({
                        id: `app-${a.id}`,
                        type: 'Application',
                        icon: <ClipboardList size={16} />,
                        color: a.status === 'Approved' ? 'from-green-400 to-emerald-500' : 'from-red-400 to-rose-500',
                        title: `Application ${a.status?.toLowerCase() || ''}`,
                        detail: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
                        date: new Date(a.updated_at || a.created_at)
                    }))
                ].sort((a: any, b: any) => b.date.getTime() - a.date.getTime()).slice(0, 10);

                setActivities(combinedActivities);
            } catch (err) {
                console.error("Error fetching dashboard view data", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchDashboardData();

        return () => { isMounted = false; };
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                {[
                    { label: 'Active Students', value: counts.students, icon: <GraduationCap size={20} />, gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
                    { label: 'Counselings (Active)', value: counts.counseling, icon: <Users size={20} />, gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
                    { label: 'Support Reqs (Pending)', value: counts.support, icon: <CheckCircle size={20} />, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
                    { label: 'Total Events', value: counts.events, icon: <Calendar size={20} />, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' },
                ].map((card, idx) => (
                    <div key={idx} className="card-hover bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-sm border border-gray-100/80 flex flex-col justify-between h-32 animate-fade-in-up">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-medium text-sm">{card.label}</span>
                            <div className={`p-2.5 bg-gradient-to-br ${card.gradient} rounded-xl text-white shadow-lg`}>{card.icon}</div>
                        </div>
                        <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Activity size={18} className="text-purple-500" /> Recent Activity</h3>
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                        {activities.length === 0 ? (
                            <p className="text-center text-gray-400 py-8 text-sm">No recent activity yet.</p>
                        ) : (
                            activities.map((act, idx) => (
                                <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50/80 transition-colors group animate-fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${act.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                                        {act.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800">{act.title}</p>
                                        <p className="text-xs text-gray-500 truncate">{act.detail}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${act.type === 'Event' ? 'bg-blue-50 text-blue-600' :
                                            act.type === 'Announcement' ? 'bg-purple-50 text-purple-600' :
                                                act.type === 'Counseling' ? 'bg-teal-50 text-teal-600' :
                                                    act.type === 'Support' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-gray-50 text-gray-600'
                                            }`}>{act.type}</span>
                                        <p className="text-[10px] text-gray-400 mt-1">{act.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm flex flex-col card-hover">
                    <h3 className="font-bold text-gray-900 mb-5 flex items-center gap-2"><Rocket size={18} className="text-purple-500" /> Quick Actions</h3>
                    <div className="space-y-3 flex-1">
                        <button
                            onClick={() => setActiveTab('events')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-200/50 group-hover:scale-105 transition-transform">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Schedule Event</p>
                                <p className="text-xs text-gray-400">Create a new campus event</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        <button
                            onClick={() => setActiveTab('events')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-violet-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-200/50 group-hover:scale-105 transition-transform">
                                <Send size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Send Announcement</p>
                                <p className="text-xs text-gray-400">Broadcast an official notice</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                        </button>

                        <button
                            onClick={() => setActiveTab('analytics')}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition-all duration-200 group text-left"
                        >
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md shadow-emerald-200/50 group-hover:scale-105 transition-transform">
                                <BarChart2 size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 group-hover:text-purple-700 transition-colors">View Reports</p>
                                <p className="text-xs text-gray-400">Student analytics & insights</p>
                            </div>
                            <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                        </button>
                    </div>

                    {/* Mini summary */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Today</span>
                            <span className="font-bold text-gray-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CareStaffDashboardView;
