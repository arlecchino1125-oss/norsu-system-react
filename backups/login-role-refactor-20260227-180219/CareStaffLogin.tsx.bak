import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { User, Lock, CheckCircle, AlertCircle, Heart, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CareStaffLogin() {
    const navigate = useNavigate();
    const { login, loading: authLoading } = useAuth() as any;
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

        const result = await login(username, password, 'Care Staff');

        if (result.success) {
            showToast("Login Successful. Redirecting...", 'success');
            setTimeout(() => navigate('/care-staff/dashboard'), 800);
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
        <div className="flex min-h-screen w-full bg-[#fdfafb] relative overflow-hidden font-inter selection:bg-purple-500/30">

            {/* Background Blob Animations (Empathy / Calmness Theme) */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none filter blur-[120px] opacity-60">
                <motion.div
                    animate={{
                        x: [0, 100, 0],
                        y: [0, 50, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-300/40 mix-blend-multiply"
                />
                <motion.div
                    animate={{
                        x: [0, -100, 0],
                        y: [0, 100, 0],
                        scale: [1, 1.5, 1]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    className="absolute top-[20%] right-[10%] w-[45vw] h-[45vw] rounded-full bg-pink-300/40 mix-blend-multiply"
                />
                <motion.div
                    animate={{
                        x: [0, 50, 0],
                        y: [0, -50, 0],
                        scale: [1, 1.3, 1]
                    }}
                    transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                    className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-indigo-300/30 mix-blend-multiply"
                />
            </div>

            <div className="flex w-full z-10 container mx-auto">
                {/* Left: Branding & Message */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative">
                    <motion.div
                        initial="initial" animate="in" variants={pageVariants} transition={{ duration: 0.8 }}
                        className="max-w-xl"
                    >
                        <motion.div
                            whileHover={{ scale: 1.05, rotate: -5 }}
                            className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-xl shadow-purple-500/20"
                        >
                            <Heart size={40} className="drop-shadow-sm" fill="currentColor" />
                        </motion.div>

                        <h2 className="text-6xl font-black mb-6 leading-tight tracking-tight text-slate-800">
                            CARE <br /> Center
                        </h2>

                        <p className="text-slate-500 text-xl leading-relaxed font-normal max-w-md">
                            Welcome back. Manage student welfare, schedule counseling services, and support our campus community in one calm, secure environment.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Login Card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="w-full max-w-[420px]"
                    >
                        {/* Soft, Friendly Card Design */}
                        <div className="bg-white/80 backdrop-blur-3xl rounded-[2.5rem] shadow-2xl shadow-purple-900/10 border border-white p-10 overflow-hidden relative">

                            {/* Inner Top Highlight */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 opacity-50"></div>

                            <div className="mb-10 text-center">
                                <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Welcome Back</h1>
                                <p className="text-slate-500 text-sm font-medium">Log in to view your care dashboard</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                {/* Username Input */}
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                                            <User size={18} />
                                        </div>
                                        <input
                                            required
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-3xl text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                            placeholder="CARE Staff ID"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div className="space-y-2 text-left">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-2">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-purple-500 transition-colors">
                                            <Lock size={18} />
                                        </div>
                                        <input
                                            required
                                            type={showPassword ? 'text' : 'password'}
                                            className="w-full pl-12 pr-12 py-4 bg-slate-50/50 border border-slate-200 rounded-3xl text-slate-800 font-medium placeholder-slate-400 focus:bg-white focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 transition-colors focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-6">
                                    <motion.button
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        disabled={loading || authLoading}
                                        type="submit"
                                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 rounded-3xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 focus:ring-4 focus:ring-purple-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                                    >
                                        {loading ? (
                                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Authenticating...</>
                                        ) : 'Sign In'}
                                    </motion.button>
                                </div>

                                <div className="text-center pt-2">
                                    <a href="/" className="inline-block text-sm font-bold text-slate-400 hover:text-purple-600 transition-colors py-2 px-4 rounded-full hover:bg-purple-50">
                                        &larr; Back to Main Portal
                                    </a>
                                </div>
                            </form>
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
                        className={`fixed bottom-6 right-6 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border text-white flex items-center gap-4 z-50 ${toast.type === 'error' ? 'bg-rose-500/95 border-rose-400/50' : 'bg-emerald-600/95 border-emerald-500/50'}`}
                    >
                        <div className="text-2xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div>
                            <h4 className="font-bold text-sm tracking-wide">{toast.type === 'error' ? 'Login Failed' : 'Welcome'}</h4>
                            <p className="text-xs font-medium opacity-90">{toast.msg}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
