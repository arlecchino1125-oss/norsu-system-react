import {
    Users, CalendarDays, ClipboardList, UserPlus, BarChart3, FileText,
    Info, CheckCircle, GraduationCap, Settings, Bell
} from 'lucide-react';
import {
    COUNSELING_STATUS,
    isCounselingAwaitingDept,
    isWithCareStaffCounseling
} from '../../utils/workflow';
import { useLiveClock } from '../../components/ClockDisplay';

const DeptHomePage = ({
    filteredData,
    counselingRequests,
    admissionsDashboardCounts,
    departmentAlertItems,
    setActiveModule,
    setForwardingToStaff,
    setReferralForm,
    setShowReferralModal,
    setSelectedCounselingReq,
    setShowCounselingViewModal
}: any) => {
    const clock = useLiveClock();

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Hero with Live Clock */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-8 md:p-10 text-white shadow-2xl shadow-emerald-900/20">
                <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl -ml-16 -mb-16" />
                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-green-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                    <div className="text-center lg:text-left flex-1">
                        <p className="text-emerald-300/80 text-sm font-medium tracking-wide uppercase mb-2 animate-fade-in-up">{clock.greeting}</p>
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            Welcome to <span className="bg-gradient-to-r from-emerald-300 via-teal-300 to-green-300 bg-clip-text text-transparent">Dept. Head Portal</span>
                        </h1>
                        <p className="text-emerald-200/70 text-base mb-6 max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            Manage your department's student welfare, approve requests, and monitor academic performance.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <button onClick={() => setActiveModule('students')} className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:scale-[1.02] transition-all duration-200">
                                <Users size={18} /> View Students
                            </button>
                            <button onClick={() => setActiveModule('events')} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-emerald-500/30 hover:scale-[1.02] transition-all duration-200">
                                <CalendarDays size={18} /> Events
                            </button>
                        </div>
                    </div>

                    {/* Live Clock */}
                    <div className="text-center flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
                {[
                    { label: 'Total Requests', value: filteredData.requests.length, icon: <FileText size={20} />, gradient: 'from-blue-400 to-indigo-500', bg: 'bg-blue-50' },
                    { label: 'Pending Approval', value: filteredData.requests.filter((r: any) => isCounselingAwaitingDept(r.status)).length, icon: <Info size={20} />, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
                    { label: 'With CARE Staff', value: filteredData.requests.filter((r: any) => isWithCareStaffCounseling(r.status)).length, icon: <CheckCircle size={20} />, gradient: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50' },
                    { label: 'Total Students', value: filteredData.students.length, icon: <Users size={20} />, gradient: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' }
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

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <div className="flex items-center justify-between gap-4 mb-5">
                        <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><BarChart3 size={18} className="text-emerald-500" /> Admissions Snapshot</h3>
                            <p className="text-sm text-gray-500 mt-1">Simple department admissions counts and funnel summary.</p>
                        </div>
                        <button onClick={() => setActiveModule('admissions')} className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">Open Admissions</button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {[
                            { label: 'Ready for Interview', value: admissionsDashboardCounts?.readyForInterview || 0, tone: 'border-blue-100 bg-blue-50 text-blue-700' },
                            { label: 'Interview Scheduled', value: admissionsDashboardCounts?.scheduled || 0, tone: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
                            { label: 'Approved', value: admissionsDashboardCounts?.approved || 0, tone: 'border-teal-100 bg-teal-50 text-teal-700' },
                            { label: 'Unsuccessful', value: admissionsDashboardCounts?.unsuccessful || 0, tone: 'border-rose-100 bg-rose-50 text-rose-700' }
                        ].map((item) => (
                            <div key={item.label} className={`rounded-xl border p-4 ${item.tone}`}>
                                <p className="text-xs font-bold uppercase tracking-wide">{item.label}</p>
                                <p className="mt-3 text-3xl font-extrabold text-gray-900">{item.value}</p>
                            </div>
                        ))}
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
                                    <button
                                        key={item.key}
                                        onClick={() => setActiveModule(item.module)}
                                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors hover:bg-white ${item.tone}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-gray-900">{item.label}</p>
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

            {/* Population + Quick Launch */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Population by Year */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><GraduationCap size={18} className="text-emerald-500" /> Live Student Population (Active)</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                        {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(year => (
                            <div key={year} className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">{year}</p>
                                <p className="text-2xl font-extrabold text-emerald-700">{filteredData.populationStats?.[year] || 0}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-5 space-y-3 card-hover">
                    <h3 className="font-bold text-gray-900 px-1 flex items-center gap-2"><Settings size={16} className="text-emerald-500" /> Quick Actions</h3>
                    <button onClick={() => setActiveModule('counseling_queue')} className="card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 flex items-start gap-4 group">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200/50 group-hover:scale-105 transition-transform"><ClipboardList size={18} /></div>
                        <div><h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-700 transition-colors">Counseling Requests</h4><p className="text-xs text-gray-500">{counselingRequests.filter((r: any) => isCounselingAwaitingDept(r.status)).length} pending review</p></div>
                    </button>
                    <button onClick={() => { setForwardingToStaff(false); setReferralForm({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' }); setShowReferralModal(true); }} className="card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-emerald-200 flex items-start gap-4 group">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-200/50 group-hover:scale-105 transition-transform"><UserPlus size={18} /></div>
                        <div><h4 className="font-bold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">Refer Student</h4><p className="text-xs text-gray-500">Direct referral to CARE Staff</p></div>
                    </button>
                    <button onClick={() => setActiveModule('reports')} className="card-hover w-full text-left p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-200 flex items-start gap-4 group">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-200/50 group-hover:scale-105 transition-transform"><BarChart3 size={18} /></div>
                        <div><h4 className="font-bold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">View Reports</h4><p className="text-xs text-gray-500">Statistics & charts</p></div>
                    </button>
                </div>
            </div>

            {/* Recent Requests */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm card-hover">
                <div className="p-6 border-b border-gray-100"><h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-emerald-500" /> Recent Counseling Requests</h3></div>
                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredData.requests.length === 0 ? <p className="text-center text-gray-400 py-4">No requests found.</p> : filteredData.requests.slice(0, 8).map(req => (
                        <div key={req.id} onClick={() => { setSelectedCounselingReq(req); setShowCounselingViewModal(true); }} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-xl border border-gray-100 hover:bg-white transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-xs font-bold shadow-sm">{req.student_name.charAt(0)}</div>
                                <div><p className="text-sm font-bold text-gray-900">{req.student_name}</p><p className="text-xs text-gray-500 line-clamp-1">{req.reason_for_referral || req.description || req.request_type}</p></div>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isCounselingAwaitingDept(req.status) ? 'bg-amber-100 text-amber-700' : req.status === COUNSELING_STATUS.SCHEDULED ? 'bg-blue-100 text-blue-700' : req.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'bg-indigo-100 text-indigo-700' : req.status === COUNSELING_STATUS.REFERRED ? 'bg-purple-100 text-purple-700' : req.status === COUNSELING_STATUS.COMPLETED ? 'bg-green-100 text-green-700' : req.status === COUNSELING_STATUS.REJECTED ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{isCounselingAwaitingDept(req.status) ? 'Pending Review' : req.status === COUNSELING_STATUS.STAFF_SCHEDULED ? 'With CARE Staff' : req.status}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pro Tip */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden shadow-xl shadow-emerald-200/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold mb-1">💡 Counseling Queue</h3>
                    <p className="text-sm text-emerald-100/80">Review student counseling requests, schedule sessions, or refer students to CARE Staff.</p>
                </div>
                <button onClick={() => setActiveModule('counseling_queue')} className="mt-4 md:mt-0 ml-0 md:ml-6 px-6 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/25 transition-all whitespace-nowrap">View Queue</button>
            </div>
        </div>
    );
};

export default DeptHomePage;
