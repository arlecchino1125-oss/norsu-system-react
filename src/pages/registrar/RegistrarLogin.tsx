import React from 'react';
import { Shield, AlertCircle, CheckCircle, Terminal, EyeOff, Eye, Users } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { useRoleLogin } from '../../hooks/auth/useRoleLogin';
import { STAFF_LOGIN_CONFIGS } from '../auth/staffLoginConfigs';

const PAGE_VARIANTS = {
    initial: { opacity: 0, scale: 0.98 },
    in: { opacity: 1, scale: 1 },
    out: { opacity: 0, scale: 1.02 }
};

export default function RegistrarLogin() {
    const {
        username,
        setUsername,
        password,
        setPassword,
        showPassword,
        setShowPassword,
        loading,
        authLoading,
        toast,
        handleSubmit
    } = useRoleLogin(STAFF_LOGIN_CONFIGS.registrar);

    return (
        <div className="flex min-h-screen w-full bg-slate-50 relative overflow-hidden font-sans selection:bg-teal-500/30">

            {/* Background Elements */}
            <div
                className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(rgba(20, 184, 166, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(20, 184, 166, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />

            <m.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 5, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"
            />

            <m.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, -5, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 5 }}
                className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none"
            />

            <div className="flex w-full z-10 container mx-auto">
                {/* Left: Branding & Message (Hidden on mobile) */}
                <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 relative">
                    <m.div
                        initial="initial" animate="in" variants={PAGE_VARIANTS} transition={{ duration: 0.6 }}
                        className="max-w-xl"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <m.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shadow-inner relative"
                            >
                                <Users size={32} />
                            </m.div>
                            <div className="h-[2px] w-24 bg-gradient-to-r from-teal-500 to-transparent"></div>
                        </div>

                        <h2 className="text-5xl font-bold mb-4 leading-tight tracking-tight text-slate-900">
                            Registrar <br /> Portal
                        </h2>

                        <div className="text-teal-600 font-bold mb-8 flex items-center gap-2 text-xl tracking-wide">
                            <Shield className="w-6 h-6" /> Access Terminal
                        </div>

                        <p className="text-slate-600 text-lg leading-relaxed max-w-md border-l-4 border-teal-500 pl-4 py-2 bg-white/50 rounded-r-lg shadow-sm">
                            Restricted access area. Comprehensive student profile checking and directory management.
                        </p>
                    </m.div>
                </div>

                {/* Right: Login Card */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
                    <m.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-[440px]"
                    >
                        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl shadow-teal-900/5 border border-slate-200 overflow-hidden">

                            <div className="p-8 md:p-10">
                                <div className="mb-8 text-center">
                                    <div className="inline-flex items-center justify-center p-4 bg-teal-50 rounded-full mb-4 ring-4 ring-white shadow-sm">
                                        <Users className="w-8 h-8 text-teal-600" />
                                    </div>
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Registrar Login</h1>
                                    <p className="text-slate-500 text-sm">Sign in to access student records</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Username Input */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="registrar-username" className="text-sm font-semibold text-slate-700 block">Username</label>
                                        <div className="relative group">
                                            <input
                                                id="registrar-username"
                                                required
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                                                placeholder="Enter registrar ID"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Password Input */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="registrar-password" className="text-sm font-semibold text-slate-700 block">Password</label>
                                        <div className="relative group">
                                            <input
                                                id="registrar-password"
                                                required
                                                type={showPassword ? 'text' : 'password'}
                                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
                                                placeholder="••••••••"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-teal-600 transition-colors focus:outline-none"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Submit Button */}
                                    <div className="pt-4">
                                        <m.button
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading || authLoading}
                                            type="submit"
                                            className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold shadow-md shadow-teal-600/20 hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/50 transition-all flex items-center justify-center gap-2 disabled:opacity-70 text-base"
                                        >
                                            {loading ? (
                                                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing In...</>
                                            ) : 'Sign In'}
                                        </m.button>
                                    </div>

                                    <div className="text-center pt-4">
                                        <a href="/" className="text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
                                            Return to Homepage
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </m.div>
                </div>
            </div>

            {/* Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <m.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50, transition: { duration: 0.2 } }}
                        className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-lg border flex items-center gap-3 z-50 ${toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-teal-50 border-teal-100 text-teal-700'}`}
                    >
                        <div className="text-xl">
                            {toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="text-sm font-semibold">{toast.msg}</p>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
