import { ClockDisplay, GreetingText } from '../../../../../components/ClockDisplay';
import {
    Search, Settings, BarChart2, Rocket,
    ClipboardCheck, CalendarCheck, Award
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import type { CareStaffDashboardFunctions } from '../../../types';
import { m } from 'framer-motion';

type HomePageFunctions = Pick<
    CareStaffDashboardFunctions,
    'handleLaunchModule' | 'handleGetStarted' | 'handleOpenAnalytics'
>;

interface HomeAdminToolsProps {
    functions: HomePageFunctions;
}

interface CareStaffHomePageProps {
    functions: HomePageFunctions;
}

const STAGGER_CONTAINER = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.2
        }
    }
};

const ITEM_SPRING = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
};

const HOME_ADMIN_TOOLS = [
    { title: 'Student Analytics', module: 'Student Analytics', desc: 'Monitor trends & tracking data', icon: <Search size={22} />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
    { title: 'Form Management', module: 'Form Management', desc: 'Process and review user forms', icon: <ClipboardCheck size={22} />, color: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
    { title: 'Event Broadcaster', module: 'Event Broadcaster', desc: 'Manage system announcements', icon: <CalendarCheck size={22} />, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/30' },
    { title: 'Manage Scholarships', module: 'Manage Scholarships', desc: 'Manage scholarship programs and applications', icon: <Award size={22} />, color: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
];

const HomeAdminTools = ({ functions }: HomeAdminToolsProps) => {
    return (
        <div className="relative z-10 mt-6 sm:mt-10 border-t border-white/10 pt-5 sm:pt-8">
            <div className="mb-4 sm:mb-6 flex items-center justify-between px-1 sm:px-2">
                <h2 className="flex items-center gap-2 text-base sm:text-lg font-bold text-white">
                    <Settings size={18} className="text-purple-200" /> Quick Launch
                </h2>
            </div>
            <m.div
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5"
                variants={STAGGER_CONTAINER}
                initial="hidden"
                animate="show"
            >
                {HOME_ADMIN_TOOLS.map((tool) => (
                    <m.button
                        key={tool.module}
                        variants={ITEM_SPRING}
                        whileHover={{ scale: 1.04, y: -8, transition: { type: "spring", stiffness: 420, damping: 16 } }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => functions.handleLaunchModule(tool.module)}
                        className="group relative flex flex-col items-start overflow-hidden rounded-2xl sm:rounded-3xl border border-white/80 bg-white/95 p-4 sm:p-6 text-left shadow-sm shadow-black/10 transition-[box-shadow,border-color,background-color] duration-500 will-change-transform hover:border-purple-200 hover:bg-white hover:shadow-2xl hover:shadow-purple-950/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B2E]"
                    >
                        {/* Animated background gradient accent */}
                        <div className={`absolute -right-8 sm:-right-12 -top-8 sm:-top-12 w-28 sm:w-40 h-28 sm:h-40 bg-gradient-to-br ${tool.color} rounded-full opacity-[0.04] transition-all duration-700 ease-out group-hover:scale-[2.25] group-hover:opacity-25`} />

                        <div className={`relative z-10 mb-3 sm:mb-5 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-[1.25rem] bg-gradient-to-br ${tool.color} text-white shadow-lg ${tool.shadow} transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-[22px] sm:[&>svg]:h-[22px]`}>
                            {tool.icon}
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-sm sm:text-base tracking-tight z-10">{tool.title}</h3>
                        <p className="text-xs sm:text-[14px] text-slate-500 mt-1 sm:mt-2 font-medium leading-relaxed z-10">{tool.desc}</p>
                    </m.button>
                ))}
            </m.div>
        </div>
    );
};

const CareStaffHomePage = ({ functions }: CareStaffHomePageProps) => {

    return (
        <div className="overflow-x-hidden pt-2">
            {/* Welcome Hero with Live Clock - Micro-Interactions Upgrade */}
            <m.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-[#241042] via-[#1A0B2E] to-[#120524] p-5 sm:p-8 lg:p-14 text-white shadow-[0_20px_50px_rgba(88,28,135,0.15)] sm:min-h-[calc(100vh-7.25rem)] md:min-h-[calc(100vh-8.25rem)]"
            >
                {/* Decorative Premium Glows with Mouse Reactivity */}
                <m.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-purple-500/20 rounded-full blur-[80px] sm:blur-[120px] -mr-40 sm:-mr-64 -mt-40 sm:-mt-64 pointer-events-none group-hover:bg-purple-500/30 transition-colors duration-1000"
                />
                <m.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-indigo-500/15 rounded-full blur-[60px] sm:blur-[100px] -ml-24 sm:-ml-40 -mb-24 sm:-mb-40 pointer-events-none group-hover:bg-indigo-400/25 transition-colors duration-1000"
                />

                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTQgNThoLTQ4YTYgNiAwIDAgMS02LTZWNmE2IDYgMCAwIDEgNi02aDQ4YTYgNiAwIDAgMSA2IDZ2NDhhNiA2IDAgMCAxLTYgNnoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+")` }} />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-12">
                    {/* Left: Greeting */}
                    <div className="text-center lg:text-left flex-1 max-w-3xl">
                        <GreetingText />
                        <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-3 sm:mb-6 leading-[1.15]">
                            Welcome to the <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-indigo-300">
                                CARE Staff Portal
                            </span>
                        </h1>
                        <p className="text-purple-200/70 text-sm sm:text-[16px] lg:text-[17px] leading-relaxed mb-6 sm:mb-10 max-w-2xl font-medium mx-auto lg:mx-0">
                            Experience streamlined student care management. Access comprehensive analytics, administrative tools, and real-time insights—all from a single, unified command center.
                        </p>
                        <div className="flex flex-wrap gap-3 sm:gap-5 justify-center lg:justify-start">
                            <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={functions.handleGetStarted}
                                    className="bg-white !text-purple-900 border-none shadow-[0_0_40px_rgba(255,255,255,0.2)] font-bold px-5 sm:px-8 h-11 sm:h-14 rounded-xl sm:rounded-2xl relative overflow-hidden group hover:!bg-purple-50 text-sm sm:text-base"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10 flex items-center">
                                        <Rocket size={18} className="mr-2 sm:mr-3 text-purple-600 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" /> Start Session
                                    </div>
                                </Button>
                            </m.div>
                            <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={functions.handleOpenAnalytics}
                                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white backdrop-blur-md rounded-xl sm:rounded-2xl h-11 sm:h-14 px-5 sm:px-8 text-sm sm:text-base"
                                >
                                    <BarChart2 size={18} className="mr-2 sm:mr-3 opacity-70" /> View Analytics
                                </Button>
                            </m.div>
                        </div>
                    </div>

                    {/* Right: Live Clock */}
                    <m.div
                        initial={{ opacity: 0, rotateX: 20, scale: 0.8 }}
                        animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.2 }}
                        whileHover={{ scale: 1.05, rotateY: -5, transition: { type: "spring", stiffness: 300 } }}
                        className="hidden lg:block flex-shrink-0 cursor-default perspective-1000"
                    >
                        <ClockDisplay />
                    </m.div>
                </div>

                {/* Admin Tools Quick Launch */}
                <HomeAdminTools functions={functions} />
            </m.div>
        </div>
    );
};

export default CareStaffHomePage;
