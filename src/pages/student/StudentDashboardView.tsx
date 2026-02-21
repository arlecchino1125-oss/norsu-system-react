
// StudentDashboardView — extracted from StudentPortal.tsx (dashboard section)
// ZERO-BEHAVIOR-CHANGE refactor. All JSX is identical to the original inline block.

const StudentDashboardView = ({
    personalInfo,
    activeVisit,
    handleOfficeTimeIn,
    handleOfficeTimeOut,
    notifications,
    colorMap,
    setActiveView,
    eventsList,
    attendanceMap,
    StudentHero,
}: any) => (
    <div className="space-y-8 page-transition">
        {/* Hero Banner (Optimized) */}
        <StudentHero firstName={personalInfo.firstName} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-blue-500 to-sky-400 text-white rounded-xl shadow-lg shadow-blue-500/20">🔔</span> Latest Announcements</h3>
                    {(() => {
                        const announcements = eventsList.filter((e: any) => e.type === 'Announcement').slice(0, 3);
                        if (announcements.length === 0) {
                            return <p className="text-sm text-gray-400 p-4 text-center">No recent announcements.</p>;
                        }
                        return announcements.map((ann: any) => (
                            <div key={ann.id} className="border border-purple-100 bg-purple-50/50 p-4 rounded-xl flex justify-between items-start mb-3 last:mb-0">
                                <div>
                                    <h4 className="font-bold text-purple-900 text-sm">{ann.title}</h4>
                                    <p className="text-xs text-purple-700/70 mt-1 line-clamp-2">{ann.description}</p>
                                </div>
                                <span className="text-[10px] font-bold text-purple-400/60 ml-4 shrink-0 whitespace-nowrap">
                                    {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                        ));
                    })()}
                </div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                    <h3 className="font-bold flex items-center gap-2 mb-4"><span className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl shadow-lg shadow-violet-500/20">🏢</span> Office Logbook</h3>
                    {activeVisit ? (<div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center"><p className="text-sm font-bold text-emerald-800 mb-1">You are currently at the office</p><p className="text-xs text-emerald-600 mb-3">Reason: {activeVisit.reason}</p><button onClick={handleOfficeTimeOut} className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs hover:from-red-400 hover:to-rose-500 shadow-lg shadow-red-500/20 transition-all">Time Out</button></div>) : <button onClick={handleOfficeTimeIn} className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3 rounded-xl font-bold text-sm hover:from-blue-400 hover:to-sky-300 shadow-lg shadow-blue-500/20 btn-press transition-all">Time In for Office Visit</button>}
                </div>
                {notifications.length > 0 && (<div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-orange-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '300ms' }}><h3 className="font-bold flex items-center gap-2 mb-4 text-orange-600"><span className="p-2 bg-gradient-to-br from-orange-400 to-amber-500 text-white rounded-xl shadow-lg shadow-orange-500/20">📢</span> Notifications</h3><div className="space-y-2">{notifications.map((n: any) => <div key={n.id} className="text-xs p-3 bg-orange-50 border border-orange-100 rounded-xl text-gray-700">{n.message}</div>)}</div></div>)}
            </div>
            <div className="space-y-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '200ms' }}><h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-emerald-400 to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-500/20">⚡</span> Quick Access</h3><div className="space-y-3">{[{ id: 'assessment', label: 'Needs Assessment', color: 'blue', desc: 'Submit your yearly assessment' }, { id: 'scholarship', label: 'Scholarship', color: 'green', desc: 'Check eligibility & apply' }, { id: 'counseling', label: 'Counseling', color: 'purple', desc: 'Request support or advice' }].map((item: any) => { const colors = (colorMap as any)[item.color]; return (<button key={item.label} onClick={() => setActiveView(item.id)} className="w-full text-left p-3 rounded-xl border border-purple-100/30 hover:border-blue-200 transition-all group flex items-center gap-3 hover:bg-purple-50/50"><div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${colors.bg} ${colors.text} ${colors.hoverBg} group-hover:text-white transition-colors shadow-sm`}>&gt;</div><div><div className="text-xs font-bold">{item.label}</div><div className="text-[10px] text-gray-400">{item.desc}</div></div></button>); })}</div></div>
                <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '350ms' }}><div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div><h4 className="font-bold text-sm mb-2 relative z-10">💡 Campus Tip</h4><p className="text-xs text-purple-200/60 leading-relaxed font-light relative z-10">"Always remember to time-in and time-out of events to ensure your attendance is credited."</p></div>
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-blue-100/50 p-6 shadow-sm card-hover animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                    <h3 className="font-bold mb-4 flex items-center gap-2"><span className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-xl shadow-lg shadow-indigo-500/20">📅</span> Events for You</h3>
                    {eventsList.length > 0 && eventsList[0].type === 'Event' ? (<div className="border border-purple-100/50 rounded-2xl p-5 bg-gradient-to-br from-white to-purple-50/50"><span className="bg-gradient-to-r from-slate-800 to-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase">{eventsList[0].location || 'Campus Event'}</span><h4 className="font-bold mt-3">{eventsList[0].title}</h4><p className="text-[11px] text-gray-500 mt-1">{eventsList[0].event_time}</p><p className="text-xs text-gray-600 mt-3 leading-relaxed line-clamp-2">{eventsList[0].description}</p><button onClick={() => setActiveView('events')} className={`w-full mt-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all btn-press ${attendanceMap[eventsList[0].id]?.time_in ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-gradient-to-r from-slate-800 to-slate-900 text-white shadow-lg shadow-slate-500/20'}`}>{attendanceMap[eventsList[0].id]?.time_in ? 'Checked In' : 'View Event'}</button></div>) : <p className="text-sm text-gray-400">No upcoming events.</p>}
                </div>
            </div>
        </div>
    </div>
);

export default StudentDashboardView;
