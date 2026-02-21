import { ClockDisplay, GreetingText } from '../../components/ClockDisplay';
import {
    Search, Settings, BarChart2, Rocket,
    ClipboardCheck, CalendarCheck, Award
} from 'lucide-react';

const HomeAdminTools = ({ functions }: any) => {
    const tools = [
        { title: 'Student Analytics', desc: 'Deep dive into student population trends and wellness metrics.', icon: <Search />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-200/50' },
        { title: 'Form Management', desc: 'Build and analyze Needs Assessment forms with real-time feedback.', icon: <ClipboardCheck />, color: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-200/50' },
        { title: 'Event Broadcasting', desc: 'Schedule campus events and monitor live attendance check-ins.', icon: <CalendarCheck />, color: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-200/50' },
        { title: 'Scholarship Tracking', desc: 'Manage grant applications and review student eligibility.', icon: <Award />, color: 'from-amber-500 to-orange-600', shadow: 'shadow-amber-200/50' },
    ];

    return (
        <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings size={18} className="text-purple-500" /> Quick Launch</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tools.map((tool, idx) => (
                    <button
                        key={idx}
                        onClick={() => functions.handleLaunchModule(tool.title)}
                        className="card-hover bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/80 text-left group animate-fade-in-up"
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.color} text-white flex items-center justify-center mb-3 shadow-lg ${tool.shadow} group-hover:scale-105 transition-transform`}>
                            {tool.icon}
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1 group-hover:text-purple-700 transition-colors">{tool.title}</h3>
                        <p className="text-xs text-gray-500 leading-relaxed">{tool.desc}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

const HomePage = ({ functions }: any) => {

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome Hero with Live Clock */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 p-8 md:p-10 text-white shadow-2xl shadow-purple-900/20">
                {/* Decorative blobs */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -mr-20 -mt-20 animate-float" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl -ml-16 -mb-16" />
                <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-violet-400/10 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
                    {/* Left: Greeting */}
                    <div className="text-center lg:text-left flex-1">
                        <GreetingText />
                        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            Welcome to <span className="bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 bg-clip-text text-transparent">CARE Staff Portal</span>
                        </h1>
                        <p className="text-purple-200/70 text-base mb-6 max-w-md animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            Streamlined student care management and comprehensive analytics at your fingertips.
                        </p>
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            <button onClick={functions.handleGetStarted} className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 hover:scale-[1.02] transition-all duration-200">
                                <Rocket size={18} /> Get Started
                            </button>
                            <button onClick={functions.handleOpenAnalytics} className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.02] transition-all duration-200">
                                <BarChart2 size={18} /> Analytics
                            </button>
                        </div>
                    </div>

                    {/* Right: Live Clock */}
                    <div className="text-center flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                        <ClockDisplay />
                    </div>
                </div>
            </div>

            {/* Admin Tools */}
            <HomeAdminTools functions={functions} />

            {/* Pro Tip Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between text-white relative overflow-hidden shadow-xl shadow-indigo-200/30">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
                <div className="flex-1 relative z-10">
                    <h3 className="text-lg font-bold mb-1">ðŸ’¡ Pro Tip: Deep Analytics</h3>
                    <p className="text-sm text-indigo-100/80">Use the Student Analytics dashboard to identify at-risk students early and deploy targeted interventions.</p>
                </div>
                <button
                    onClick={functions.handleOpenAnalytics}
                    className="mt-4 md:mt-0 ml-0 md:ml-6 px-6 py-2.5 bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded-xl font-semibold hover:bg-white/25 transition-all whitespace-nowrap"
                >
                    Launch Analytics
                </button>
            </div>
        </div>
    );
};

export default HomePage;
