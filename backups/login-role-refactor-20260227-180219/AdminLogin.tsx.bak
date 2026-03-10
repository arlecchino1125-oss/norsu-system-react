import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Shield, AlertCircle, CheckCircle, Terminal, EyeOff, Eye, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLogin() {
    const { login, loading: authLoading } = useAuth() as any;
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [username, setUsername] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [toast, setToast] = useState<any>(null);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password, 'Admin');

        if (result.success) {
            showToast("System Access Granted. Initializing...", 'success');
            setTimeout(() => navigate('/admin/dashboard'), 800);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    const pageVariants = {
        initial: { opacity: 0, scale: 0.98 },
        in: { opacity: 1, scale: 1 },
        out: { opacity: 0, scale: 1.02 }
    };

    return (
        <div className="flex min-h-screen w-full bg-[#030712] relative overflow-hidden font-mono selection:bg-red-500/30">

            {/* Cyberpunk/Tech Background Elements */}
            <div
                className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(220, 38, 38, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(220, 38, 38, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px'
                }}
            />

            <motion.div
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#030712_100%)] pointer-events-none"
            />

            <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute -top-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-red-900/20 blur-[120px] pointer-events-none"
            />

            <motion.div
                animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }}
                className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-orange-900/10 blur-[150px] pointer-events-none"
            />

            <div className="flex w-full z-10 container mx-auto">
                {/* Left: Branding & Message (Hidden on mobile) */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative">
                    <motion.div
                        initial="initial" animate="in" variants={pageVariants} transition={{ duration: 0.6 }}
                        className="max-w-xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/30 relative"
                            >
                                <div className="absolute inset-2 border border-red-500/20 rounded-xl" />
                                <Cpu size={32} />
                            </motion.div>
                            <div className="h-[2px] w-24 bg-gradient-to-r from-red-500 to-transparent"></div>
                        </div>

                        <h2 className="text-5xl font-bold mb-4 leading-tight tracking-tighter text-white">
                            SYSTEM <br /> OVERRIDE
                        </h2>

                        <div className="text-red-400 font-bold mb-8 flex items-center gap-2 text-xl tracking-widest uppercase">
                            <Shield className="w-6 h-6" /> Admin Console
                        </div>

                        <p className="text-slate-400 text-lg leading-relaxed font-sans max-w-md border-l-2 border-red-500/30 pl-4 py-2">
                            Restricted access area. Comprehensive system management, database configuration, and master user control.
                        </p>
                    </motion.div>
                </div>

                {/* Right: Login Terminal */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-[440px]"
                    >
                        {/* Terminal Style Card */}
                        <div className="bg-[#0f172a]/90 backdrop-blur-xl rounded-xl shadow-2xl shadow-red-900/20 border border-slate-800 overflow-hidden">

                            {/* Terminal Header */}
                            <div className="h-10 bg-slate-900 flex items-center px-4 border-b border-slate-800 justify-between">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-orange-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                                </div>
                                <div className="text-xs text-slate-500 font-bold tracking-widest">AUTH_SERVER_V2</div>
                                <div className="w-10"></div> {/* Spacer */}
                            </div>

                            <div className="p-8 md:p-10">
                                <div className="mb-10 text-center">
                                    <div className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4 ring-1 ring-red-500/30">
                                        <Terminal className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-white tracking-widest uppercase mb-1">Root Login</h1>
                                    <p className="text-slate-500 text-xs tracking-widest uppercase">Awaiting credentials_</p>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-6">
                                    {/* Username Input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] block">Admin_ID</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-500 transition-colors">
                                                {'>'}
                                            </div>
                                            <input
                                                required
                                                className="w-full pl-10 pr-4 py-4 bg-[#030712] border border-slate-800 rounded-lg text-red-50 placeholder-slate-600 focus:bg-slate-900 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all outline-none"
                                                placeholder="sysadmin"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-[10px] font-bold text-red-400 uppercase tracking-[0.2em] block">Auth_Key</label>
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-red-500 transition-colors">
                                                {'>'}
                                            </div>
                                            <input
                                                required
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full pl-10 pr-12 py-4 bg-[#030712] border border-slate-800 rounded-lg text-red-50 placeholder-slate-600 focus:bg-slate-900 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all outline-none"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-red-500 transition-colors focus:outline-none"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-6">
                                        <motion.button
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading || authLoading}
                                            type="submit"
                                            className="w-full bg-red-600 text-white py-4 rounded-lg font-bold shadow-lg shadow-red-900/50 hover:bg-red-500 focus:ring-2 focus:ring-red-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-sm"
                                        >
                                            {loading ? (
                                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Executing...</>
                                            ) : 'Execute Login'}
                                        </motion.button>
                                    </div>

                                    <div className="text-center pt-4">
                                        <a href="/" className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest font-sans">
                                            [ Terminate Session ]
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Terminal Style Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 50, transition: { duration: 0.2 } }}
                        className={`fixed top-6 right-6 px-6 py-4 rounded-lg shadow-2xl border flex items-center gap-4 z-50 ${toast.type === 'error' ? 'bg-[#030712] border-red-500/50 text-red-500' : 'bg-[#030712] border-green-500/50 text-green-500'}`}
                    >
                        <div className="text-xl">
                            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="font-bold text-xs uppercase tracking-widest">{toast.type === 'error' ? 'ERR_AUTH_FAIL' : 'SYS_OK'}</h4>
                            <p className="text-xs font-medium opacity-80 mt-1">{toast.msg}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
