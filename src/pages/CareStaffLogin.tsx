import React from 'react';
import { User, Lock, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoleLogin } from '../hooks/auth/useRoleLogin';
import { STAFF_LOGIN_CONFIGS } from './auth/staffLoginConfigs';

export default function CareStaffLogin() {
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
    } = useRoleLogin(STAFF_LOGIN_CONFIGS.careStaff);

    const pageVariants = {
        initial: { opacity: 0, y: 15 },
        in: { opacity: 1, y: 0 },
        out: { opacity: 0, y: -15 }
    };

    return (
        <div className="relative flex min-h-screen w-full overflow-hidden bg-[#eef6ff] font-inter selection:bg-purple-500/30">
            {/* Layered background accents */}
            <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#eef7ff_0%,#f5f0ff_52%,#eefbf7_100%)]" />
            <div
                className="absolute inset-x-0 top-0 z-0 h-[42vh] bg-[linear-gradient(120deg,rgba(14,165,233,0.18),rgba(139,92,246,0.20),rgba(236,72,153,0.12))]"
                style={{ clipPath: 'polygon(0 0, 100% 0, 100% 68%, 0 100%)' }}
            />
            <div
                className="absolute inset-x-[-8%] bottom-[-9rem] z-0 h-80 bg-[linear-gradient(95deg,rgba(255,255,255,0.78),rgba(186,230,253,0.54),rgba(221,214,254,0.62))]"
                style={{ clipPath: 'ellipse(72% 48% at 50% 48%)' }}
            />
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.08]"
                style={{
                    backgroundImage: 'linear-gradient(to right, #0f172a 1px, transparent 1px), linear-gradient(to bottom, #0f172a 1px, transparent 1px)',
                    backgroundSize: '44px 44px'
                }}
            />

            <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
                <div className="grid w-full max-w-6xl items-center gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.85fr)] xl:gap-14">
                    {/* Left: Branding & Message */}
                    <div className="flex flex-col justify-center">
                        <motion.div
                            initial="initial"
                            animate="in"
                            variants={pageVariants}
                            transition={{ duration: 0.8 }}
                            className="mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-xl"
                        >
                            <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:gap-5">
                                <div className="flex shrink-0 items-center -space-x-3">
                                    <motion.img
                                        whileHover={{ y: -2 }}
                                        src="/norsu.png"
                                        alt="NORSU-G Seal"
                                        className="h-16 w-16 rounded-full border-[3px] border-white bg-white object-cover p-1 shadow-xl shadow-sky-900/10 ring-1 ring-sky-200/80 sm:h-24 sm:w-24"
                                    />
                                    <motion.img
                                        whileHover={{ y: -2 }}
                                        src="/carecenter.png"
                                        alt="CARE Center Logo"
                                        className="h-16 w-16 rounded-full border-[3px] border-white bg-white object-cover shadow-xl shadow-purple-900/20 ring-1 ring-purple-200/80 sm:h-24 sm:w-24"
                                    />
                                </div>

                                <div className="min-w-0">
                                    <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.22em] text-sky-700">
                                        NORSU-G CARE
                                    </p>
                                    <h2 className="text-4xl font-black leading-none tracking-tight text-slate-900 sm:text-6xl">
                                        CARE Center
                                    </h2>
                                </div>
                            </div>

                            <div className="mb-5 h-1.5 w-24 rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-purple-500/20 sm:mb-6" />

                            <p className="max-w-xl text-base font-medium leading-7 text-slate-600 sm:text-xl sm:leading-8">
                                Welcome back. Manage student welfare, schedule counseling services, and support our campus community in one calm, secure environment.
                            </p>

                            <div className="mt-8 hidden max-w-xl gap-3 sm:grid sm:grid-cols-3">
                                {[
                                    ['Student care', 'Guided support'],
                                    ['Counseling', 'Clear schedules'],
                                    ['Records', 'Protected access']
                                ].map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="rounded-2xl border border-white/70 bg-white/60 px-4 py-3 shadow-sm shadow-slate-900/5 backdrop-blur"
                                    >
                                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                                        <p className="mt-1 text-sm font-extrabold text-slate-800">{value}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: Login Card */}
                    <div className="flex w-full items-center justify-center lg:justify-end">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="w-full max-w-[430px]"
                        >
                            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_34px_90px_-35px_rgba(30,41,59,0.58)] backdrop-blur-3xl sm:p-9">
                                <div className="absolute left-0 top-0 h-1.5 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" />

                                <div className="mb-8 text-center">
                                    <h1 className="mb-2 text-3xl font-extrabold text-slate-900">Welcome Back</h1>
                                    <p className="text-sm font-semibold text-slate-600">Log in to view your CARE dashboard</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="space-y-2 text-left">
                                        <label htmlFor="care-staff-username" className="block pl-1 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">
                                            Username
                                        </label>
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 transition-colors group-focus-within:text-violet-600">
                                                <User size={18} />
                                            </div>
                                            <input
                                                id="care-staff-username"
                                                required
                                                autoComplete="username"
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-4 pl-12 pr-5 font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                                                placeholder="CARE Staff ID"
                                                value={username}
                                                onChange={e => setUsername(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-left">
                                        <label htmlFor="care-staff-password" className="block pl-1 text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">
                                            Password
                                        </label>
                                        <div className="relative group">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400 transition-colors group-focus-within:text-violet-600">
                                                <Lock size={18} />
                                            </div>
                                            <input
                                                id="care-staff-password"
                                                required
                                                type={showPassword ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-4 pl-12 pr-12 font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10"
                                                placeholder="Enter password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full text-slate-400 transition-colors hover:text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <motion.button
                                            whileHover={{ y: -2 }}
                                            whileTap={{ scale: 0.98 }}
                                            disabled={loading || authLoading}
                                            type="submit"
                                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5b21b6] via-[#7c3aed] to-[#db2777] py-4 font-extrabold text-white shadow-[0_20px_40px_-16px_rgba(124,58,237,0.82)] transition-all hover:shadow-[0_24px_46px_-14px_rgba(124,58,237,0.9)] focus:ring-4 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {loading ? (
                                                <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Authenticating...</>
                                            ) : 'Sign In'}
                                        </motion.button>
                                    </div>

                                    <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-left">
                                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
                                        <p className="text-xs font-semibold leading-5 text-slate-600">
                                            <span className="font-extrabold text-slate-800">Protected staff access.</span> Use your assigned CARE credentials only.
                                        </p>
                                    </div>

                                    <div className="text-center pt-1">
                                        <a href="/" className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-slate-500 transition-colors hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-500/20">
                                            <ArrowLeft size={16} />
                                            Back to Main Portal
                                        </a>
                                    </div>
                                </form>
                            </div>
                        </motion.div>
                    </div>
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
