import { ClockDisplay, GreetingText } from '../../../../../components/ClockDisplay';
import {
    Search, Settings, BarChart2, Rocket,
    ClipboardCheck, CalendarCheck, Award
} from 'lucide-react';
import { Button } from '../../../../../components/ui/Button';
import type { CareStaffDashboardFunctions } from '../../../types';
import { motion } from 'framer-motion';

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

const HomeAdminTools = ({ functions }: HomeAdminToolsProps) => {
    const tools = [
        { title: 'Student Analytics', module: 'Student Analytics', desc: 'Monitor trends & tracking data', icon: <Search size={22} />, color: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/30' },
        { title: 'Form Management', module: 'Form Management', desc: 'Process and review user forms', icon: <ClipboardCheck size={22} />, color: 'from-purple-500 to-violet-600', shadow: 'shadow-purple-500/30' },
        { title: 'Event Broadcaster', module: 'Event Broadcaster', desc: 'Manage system announcements', icon: <CalendarCheck size={22} />, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-emerald-500/30' },
        { title: 'Manage Scholarships', module: 'Manage Scholarships', desc: 'Manage scholarship programs and applications', icon: <Award size={22} />, color: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/30' },
    ];

    return (
        <div className="relative z-10 mt-10 border-t border-white/10 pt-8">
            <div className="mb-6 flex items-center justify-between px-2">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <Settings size={20} className="text-purple-200" /> Quick Launch
                </h2>
            </div>
            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
                variants={STAGGER_CONTAINER}
                initial="hidden"
                animate="show"
            >
                {tools.map((tool, idx) => (
                    <motion.button
                        key={idx}
                        variants={ITEM_SPRING}
                        whileHover={{ scale: 1.04, y: -8, transition: { type: "spring", stiffness: 420, damping: 16 } }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => functions.handleLaunchModule(tool.module)}
                        className="group relative flex flex-col items-start overflow-hidden rounded-3xl border border-white/80 bg-white/95 p-6 text-left shadow-sm shadow-black/10 transition-[box-shadow,border-color,background-color] duration-500 will-change-transform hover:border-purple-200 hover:bg-white hover:shadow-2xl hover:shadow-purple-950/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B2E]"
                    >
                        {/* Animated background gradient accent */}
                        <div className={`absolute -right-12 -top-12 w-40 h-40 bg-gradient-to-br ${tool.color} rounded-full opacity-[0.04] transition-all duration-700 ease-out group-hover:scale-[2.25] group-hover:opacity-25`} />

                        <div className={`relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-gradient-to-br ${tool.color} text-white shadow-lg ${tool.shadow} transition-all duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-xl`}>
                            {tool.icon}
                        </div>
                        <h3 className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors text-base tracking-tight z-10">{tool.title}</h3>
                        <p className="text-[14px] text-slate-500 mt-2 font-medium leading-relaxed z-10">{tool.desc}</p>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
};

const CareStaffHomePage = ({ functions }: CareStaffHomePageProps) => {

    return (
        <div className="overflow-x-hidden pt-2">
            {/* Welcome Hero with Live Clock - Micro-Interactions Upgrade */}
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="group relative flex min-h-[calc(100vh-7.25rem)] flex-col overflow-hidden rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-[#241042] via-[#1A0B2E] to-[#120524] p-8 text-white shadow-[0_20px_50px_rgba(88,28,135,0.15)] md:min-h-[calc(100vh-8.25rem)] lg:p-14"
            >
                {/* Decorative Premium Glows with Mouse Reactivity */}
                <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 right-0 w-[800px] h-[800px] bg-purple-500/20 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none group-hover:bg-purple-500/30 transition-colors duration-1000"
                />
                <motion.div
                    initial={{ rotate: 0 }}
                    animate={{ rotate: -360 }}
                    transition={{ duration: 200, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/15 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none group-hover:bg-indigo-400/25 transition-colors duration-1000"
                />

                {/* Subtle grid pattern overlay */}
                <div className="absolute inset-0 opacity-[0.15] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNTQgNThoLTQ4YTYgNiAwIDAgMS02LTZWNmE2IDYgMCAwIDEgNi02aDQ4YTYgNiAwIDAgMSA2IDZ2NDhhNiA2IDAgMCAxLTYgNnoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+")` }} />

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                    {/* Left: Greeting */}
                    <div className="text-center lg:text-left flex-1 max-w-3xl">
                        <GreetingText />
                        <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-6 leading-[1.15]">
                            Welcome to the <br className="hidden lg:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-200 to-indigo-300">
                                CARE Staff Portal
                            </span>
                        </h1>
                        <p className="text-purple-200/70 text-[16px] lg:text-[17px] leading-relaxed mb-10 max-w-2xl font-medium mx-auto lg:mx-0">
                            Experience streamlined student care management. Access comprehensive analytics, administrative tools, and real-time insights—all from a single, unified command center.
                        </p>
                        <div className="flex flex-wrap gap-5 justify-center lg:justify-start">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={functions.handleGetStarted}
                                    className="bg-white !text-purple-900 border-none shadow-[0_0_40px_rgba(255,255,255,0.2)] font-bold px-8 h-14 rounded-2xl relative overflow-hidden group hover:!bg-purple-50"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-purple-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="relative z-10 flex items-center">
                                        <Rocket size={20} className="mr-3 text-purple-600 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" /> Start Session
                                    </div>
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={functions.handleOpenAnalytics}
                                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-white backdrop-blur-md rounded-2xl h-14 px-8"
                                >
                                    <BarChart2 size={20} className="mr-3 opacity-70" /> View Analytics
                                </Button>
                            </motion.div>
                        </div>
                    </div>

                    {/* Right: Live Clock */}
                    <motion.div
                        initial={{ opacity: 0, rotateX: 20, scale: 0.8 }}
                        animate={{ opacity: 1, rotateX: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 150, damping: 20, delay: 0.2 }}
                        whileHover={{ scale: 1.05, rotateY: -5, transition: { type: "spring", stiffness: 300 } }}
                        className="hidden lg:block flex-shrink-0 cursor-default perspective-1000"
                    >
                        <ClockDisplay />
                    </motion.div>
                </div>

                {/* Admin Tools Quick Launch */}
                <HomeAdminTools functions={functions} />
            </motion.div>
        </div>
    );
};

export default CareStaffHomePage;
