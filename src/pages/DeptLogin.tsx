import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { User, Lock, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DeptLogin() {
    const { login, loading: authLoading } = useAuth() as any;
    const navigate = useNavigate();
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [toast, setToast] = useState<any>(null);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password, 'Department Head');

        if (result.success) {
            showToast("Login Successful. Redirecting...", 'success');
            setTimeout(() => navigate('/department/dashboard'), 800);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -15 }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#f8fafc] relative overflow-hidden font-inter selection:bg-emerald-500/30">

            {/* Subtle Tech Grid Background */}
            <div
                className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            {/* Glowing Accent Orbs (Subtle for Professional Theme) */}
            <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.15, 0.1] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-32 -left-32 w-[40rem] h-[40rem] bg-emerald-500/20 rounded-full blur-[100px] pointer-events-none"
            />
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.05, 0.1, 0.05] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] bg-teal-500/20 rounded-full blur-[100px] pointer-events-none"
            />

            <div className="flex w-full z-10 container mx-auto">
                {/* Left: Branding & Message */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative">
                    <motion.div
                        initial="initial" animate="in" variants={pageVariants} transition={{ duration: 0.8 }}
                        className="max-w-xl"
                    >
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-emerald-600 mb-8 shadow-xl shadow-emerald-900/5 border border-slate-100"
                        >
                            <ShieldCheck size={32} />
                        </motion.div>

                        <h2 className="text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tight text-slate-800">
                            Department <br /> Administration
                        </h2>

                        <div className="h-1.5 w-20 bg-emerald-500 mb-8 rounded-full"></div>

                        <p className="text-slate-500 text-lg leading-relaxed font-medium">
                            Secure access for department heads. Manage student welfare, approve counseling requests, and monitor academic performance within your jurisdiction.
                        </p>

                        <div className="mt-12 flex items-center gap-4 text-sm font-bold text-slate-400 uppercase tracking-widest">
                            <Lock size={16} /> Secure Portal Access
                        </div>
                    </motion.div>
                </div>

                {/* Right: Login Card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full max-w-[440px]"
                    >
                        {/* Sharp, Solid Card Design */}
                        <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">

                            {/* Accent Header Line */}
                            <div className="h-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>

                            <div className="p-10">
                                <div className="mb-10">
                                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Sign In</h1>
                                    <p className="text-slate-500 text-sm font-medium">Enter your administrative credentials</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {/* Username Input */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Username</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                required
                                                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                                placeholder="e.g. dept_head_cs"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Password</label>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                required
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <motion.button
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading || authLoading}
                                            type="submit"
                                            className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-xl shadow-slate-900/20 hover:bg-slate-800 focus:ring-4 focus:ring-slate-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                        >
                                            {loading ? (
                                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
                                            ) : 'Access Dashboard'}
                                        </motion.button>
                                    </div>

                                    <div className="text-center pt-4">
                                        <a href="/" className="text-sm font-bold text-slate-400 hover:text-emerald-600 transition-colors">
                                            &larr; Return to Main Portal
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Custom Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border text-white flex items-center gap-4 z-50 ${toast.type === 'error' ? 'bg-rose-500/95 border-rose-400/50' : 'bg-emerald-600/95 border-emerald-500/50'}`}
                    >
                        <div className="text-2xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div>
                            <h4 className="font-bold text-sm">{toast.type === 'error' ? 'Authentication Error' : 'Success'}</h4>
                            <p className="text-xs font-medium opacity-90">{toast.msg}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
