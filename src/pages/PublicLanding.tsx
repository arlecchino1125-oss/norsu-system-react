import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, FileText, Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PublicLanding() {
    const navigate = useNavigate();

    // -- Animation Variants --
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15, delayChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        show: {
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 300, damping: 24 }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 20 },
        show: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 200, damping: 20 }
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-[#f8fafc] via-[#f3e8ff] to-[#e0f2fe] selection:bg-purple-500/30">

            {/* Atmospheric Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                {/* Flowing Gradient Mesh */}
                <div className="absolute top-[-15%] left-[-15%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[120px] mix-blend-multiply animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[150px] mix-blend-multiply animate-blob animation-delay-2000"></div>
                <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-pink-400/15 rounded-full blur-[140px] mix-blend-multiply animate-blob animation-delay-4000"></div>

                {/* Slow Drifting Particles */}
                <motion.div
                    animate={{ y: [0, -40, 0], x: [0, 20, 0], opacity: [0.1, 0.3, 0.1] }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/4 left-1/4 w-32 h-32 bg-white rounded-full blur-3xl opacity-20"
                />
                <motion.div
                    animate={{ y: [0, 50, 0], x: [0, -30, 0], opacity: [0.1, 0.2, 0.1] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear", delay: 2 }}
                    className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-white rounded-full blur-3xl opacity-20"
                />

                {/* Subtle Grid Overlay */}
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{ backgroundImage: `linear-gradient(to right, #64748b 1px, transparent 1px), linear-gradient(to bottom, #64748b 1px, transparent 1px)`, backgroundSize: '64px 64px' }}
                />
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="text-center mb-16 max-w-5xl relative z-10"
            >
                {/* Logo Container */}
                <motion.div
                    variants={itemVariants}
                    className="group relative inline-block mb-6 cursor-pointer"
                >
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-xl opacity-20 group-hover:opacity-50 transition-all duration-700"></div>
                    <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white/90 backdrop-blur-xl rounded-full border border-white flex items-center justify-center overflow-hidden shadow-2xl shadow-purple-900/10 transition-transform duration-700 ease-out group-hover:scale-[1.05]">
                        <img src="/carecenter.png" alt="Logo" className="w-full h-full object-cover scale-[1.35] transition-all duration-700 ease-out group-hover:scale-[1.5] group-hover:rotate-3 group-hover:brightness-110 drop-shadow-md" />
                    </div>
                </motion.div>

                {/* Main Title */}
                <motion.h1
                    variants={itemVariants}
                    className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 via-blue-600 to-indigo-700 mb-2 tracking-tighter"
                >
                    Welcome to CARE Center
                </motion.h1>

                {/* Acronym */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-wrap justify-center gap-4 md:gap-12 text-sm md:text-xl font-bold text-slate-500/80 mb-10 tracking-[0.2em] uppercase"
                >
                    <span className="hover:text-purple-600 transition-colors duration-300 cursor-default"><span className="text-purple-600 font-extrabold text-lg md:text-2xl">C</span>ounseling</span>
                    <span className="hover:text-blue-600 transition-colors duration-300 cursor-default"><span className="text-blue-600 font-extrabold text-lg md:text-2xl">A</span>ssessment</span>
                    <span className="hover:text-purple-600 transition-colors duration-300 cursor-default"><span className="text-purple-600 font-extrabold text-lg md:text-2xl">R</span>esource</span>
                    <span className="hover:text-blue-600 transition-colors duration-300 cursor-default"><span className="text-blue-600 font-extrabold text-lg md:text-2xl">E</span>nhancement</span>
                </motion.div>

                {/* Subtitle Words */}
                <motion.div
                    variants={itemVariants}
                    className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-lg md:text-2xl font-light text-slate-600"
                >
                    {["Our Pride", "Our Hope", "Our Future", "Our Present"].map((text, i) => (
                        <div key={i} className="flex items-center gap-3 md:gap-6">
                            <span className="hover:text-purple-700 transition-colors duration-300 cursor-default font-medium">
                                {text}
                            </span>
                            {i < 3 && <span className="text-slate-300/60 text-sm">•</span>}
                        </div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Portal Cards Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full z-10"
            >

                {/* NAT PORTAL CARD */}
                <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/nat')}
                    className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 cursor-pointer group relative overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/20 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-orange-400/40 transition-colors duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 border border-orange-200/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <FileText className="w-8 h-8 text-orange-600 drop-shadow-sm group-hover:text-orange-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2 relative">NAT Portal</h3>
                    <p className="text-slate-600/90 text-sm mb-6 leading-relaxed relative font-medium">Apply for admission test or check your application status.</p>
                    <div className="flex items-center text-orange-600 font-bold text-sm tracking-wide group-hover:gap-3 gap-2 transition-all relative">
                        Apply Now <ArrowRight className="w-4 h-4 inline" />
                    </div>
                </motion.div>

                {/* STUDENT PORTAL CARD */}
                <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/student/login')}
                    className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 cursor-pointer group relative overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-blue-400/40 transition-colors duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 border border-blue-200/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <GraduationCap className="w-8 h-8 text-blue-600 drop-shadow-sm group-hover:text-blue-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2 relative">Student Portal</h3>
                    <p className="text-slate-600/90 text-sm mb-6 leading-relaxed relative font-medium">Access your profile, courses, grades, and request counseling.</p>
                    <div className="flex items-center text-blue-600 font-bold text-sm tracking-wide group-hover:gap-3 gap-2 transition-all relative">
                        Access Portal <ArrowRight className="w-4 h-4 inline" />
                    </div>
                </motion.div>

                {/* DEPT HEAD CARD */}
                <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/department/login')}
                    className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 cursor-pointer group relative overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/20 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-emerald-400/40 transition-colors duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 border border-emerald-200/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Users className="w-8 h-8 text-emerald-600 drop-shadow-sm group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2 relative">Department Head</h3>
                    <p className="text-slate-600/90 text-sm mb-6 leading-relaxed relative font-medium">Manage department requests, approve counseling, and refer students.</p>
                    <div className="flex items-center text-emerald-600 font-bold text-sm tracking-wide group-hover:gap-3 gap-2 transition-all relative">
                        Faculty Portal <ArrowRight className="w-4 h-4 inline" />
                    </div>
                </motion.div>

                {/* STAFF CARD */}
                <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, y: -8 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/care-staff')}
                    className="bg-white/40 backdrop-blur-3xl border border-white/60 rounded-[2rem] p-8 cursor-pointer group relative overflow-hidden shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-400/20 rounded-full blur-[40px] -mr-16 -mt-16 group-hover:bg-purple-400/40 transition-colors duration-500"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                    <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 border border-purple-200/50 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Briefcase className="w-8 h-8 text-purple-600 drop-shadow-sm group-hover:text-purple-500 transition-colors" />
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-800 mb-2 relative">CARE Staff</h3>
                    <p className="text-slate-600/90 text-sm mb-6 leading-relaxed relative font-medium">View applications, schedule counseling sessions, and manage referrals.</p>
                    <div className="flex items-center text-purple-600 font-bold text-sm tracking-wide group-hover:gap-3 gap-2 transition-all relative">
                        Staff Portal <ArrowRight className="w-4 h-4 inline" />
                    </div>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="mt-16 text-slate-400/80 font-medium text-xs tracking-wider uppercase z-10"
            >
                &copy; 2026 NORSU Management System. All rights reserved.
            </motion.div>
        </div>
    );
}
