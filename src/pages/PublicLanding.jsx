import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, FileText, Users, Briefcase } from 'lucide-react';

export default function PublicLanding() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-white via-purple-100 to-blue-100 page-transition">
            {/* Background Effects */}
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-[-15%] left-[-15%] w-[45%] h-[45%] bg-purple-400/20 rounded-full blur-[100px] opacity-70 animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[150px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] bg-pink-400/20 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
            </div>

            <div className="text-center mb-16 max-w-5xl relative z-10">
                {/* Logo Container */}
                <div className="group relative inline-block mb-6 cursor-pointer">
                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-md opacity-20 group-hover:opacity-60 group-hover:blur-xl transition-all duration-500"></div>
                    <div className="relative w-32 h-32 md:w-40 md:h-40 bg-white rounded-full border border-slate-100 flex items-center justify-center overflow-hidden shadow-xl transition-all duration-500 group-hover:shadow-2xl group-hover:border-purple-200">
                        <img src="/carecenter.png" alt="Logo" className="w-full h-full object-cover scale-150 transition-all duration-700 ease-out group-hover:scale-[1.7] group-hover:rotate-3 group-hover:brightness-110" />
                    </div>
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 mb-2 tracking-tighter hover:scale-105 transition-transform duration-500 cursor-default drop-shadow-sm uppercase">
                    Welcome to Care Center
                </h1>

                <div className="flex flex-wrap justify-center gap-4 md:gap-12 text-sm md:text-xl font-bold text-slate-500 mb-10 tracking-[0.2em] uppercase">
                    <span className="hover:text-purple-600 hover:-translate-y-1 transition-all duration-300 cursor-default"><span className="text-purple-600 text-lg md:text-2xl">C</span>ounseling</span>
                    <span className="hover:text-blue-600 hover:-translate-y-1 transition-all duration-300 cursor-default"><span className="text-blue-600 text-lg md:text-2xl">A</span>ssessment</span>
                    <span className="hover:text-purple-600 hover:-translate-y-1 transition-all duration-300 cursor-default"><span className="text-purple-600 text-lg md:text-2xl">R</span>esource</span>
                    <span className="hover:text-blue-600 hover:-translate-y-1 transition-all duration-300 cursor-default"><span className="text-blue-600 text-lg md:text-2xl">E</span>nhancement</span>
                </div>

                <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-lg md:text-2xl font-light text-slate-600">
                    {["Our Pride", "Our Hope", "Our Future", "Our Present"].map((text, i) => (
                        <div key={i} className="flex items-center gap-3 md:gap-6">
                            <span className="hover:text-purple-600 hover:scale-110 transition-all duration-300 cursor-default">
                                {text}
                            </span>
                            {i < 3 && <span className="text-slate-300 text-sm">•</span>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl w-full">

                {/* NAT PORTAL CARD */}
                <div onClick={() => navigate('/nat')} className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-8 card-hover cursor-pointer group relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-100 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-orange-200"></div>
                    <div className="bg-orange-50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-orange-100"><FileText className="w-8 h-8 text-orange-500" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">NAT Portal</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Apply for admission test or check your application status.</p>
                    <div className="flex items-center text-orange-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">Apply Now <ArrowRight className="w-4 h-4 inline" /></div>
                </div>

                {/* STUDENT PORTAL CARD */}
                <div onClick={() => navigate('/student')} className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-8 card-hover cursor-pointer group relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-blue-200"></div>
                    <div className="bg-blue-50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-blue-100"><GraduationCap className="w-8 h-8 text-blue-600" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Student Portal</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Access your profile, courses, grades, and request counseling.</p>
                    <div className="flex items-center text-blue-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">Access Portal <ArrowRight className="w-4 h-4 inline" /></div>
                </div>

                {/* DEPT HEAD CARD */}
                <div onClick={() => navigate('/department/login')} className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-8 card-hover cursor-pointer group relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-200"></div>
                    <div className="bg-green-50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-green-100"><Users className="w-8 h-8 text-green-600" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Department Head</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">Manage department requests, approve counseling, and refer students.</p>
                    <div className="flex items-center text-green-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">Faculty Portal <ArrowRight className="w-4 h-4 inline" /></div>
                </div>

                {/* STAFF CARD (Added explicit link since it's in original file but wasn't in my guess list) */}
                <div onClick={() => navigate('/care-staff')} className="bg-white/60 backdrop-blur-md border border-white/50 rounded-3xl p-8 card-hover cursor-pointer group relative overflow-hidden shadow-lg">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-purple-200"></div>
                    <div className="bg-purple-50 rounded-2xl w-16 h-16 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-purple-100"><Briefcase className="w-8 h-8 text-purple-600" /></div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Care Staff</h3>
                    <p className="text-slate-500 text-sm mb-6 leading-relaxed">View applications, schedule counseling sessions, and manage referrals.</p>
                    <div className="flex items-center text-purple-600 font-semibold text-sm group-hover:gap-3 gap-2 transition-all">Staff Portal <ArrowRight className="w-4 h-4 inline" /></div>
                </div>
            </div>

            <div className="mt-16 text-slate-400 text-xs">
                &copy; 2026 NORSU Management System. All rights reserved.
            </div>
        </div>
    );
}
