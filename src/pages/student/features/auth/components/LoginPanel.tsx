import type React from 'react';
import { Eye, EyeOff, Loader2, Mail, Sparkles, User, UserPlus } from 'lucide-react';
import { m } from 'framer-motion';
import type { StudentLoginMethod } from '../../../types';

type LoginPanelProps = {
    loginMethod: StudentLoginMethod;
    loginFieldLabel: string;
    loginFieldHelpText: string;
    loginId: string;
    loginPassword: string;
    showPassword: boolean;
    loading: boolean;
    authLoading: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onLoginMethodChange: (method: StudentLoginMethod) => void;
    onLoginIdChange: (value: string) => void;
    onLoginPasswordChange: (value: string) => void;
    onTogglePassword: () => void;
    onForgotPassword: () => void;
    onCreateAccount: () => void;
};

export function LoginPanel({
    loginMethod,
    loginFieldLabel,
    loginFieldHelpText,
    loginId,
    loginPassword,
    showPassword,
    loading,
    authLoading,
    onSubmit,
    onLoginMethodChange,
    onLoginIdChange,
    onLoginPasswordChange,
    onTogglePassword,
    onForgotPassword,
    onCreateAccount
}: LoginPanelProps) {
    return (
        <div className="w-full lg:w-1/2 flex items-center justify-center lg:justify-end relative">
            <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="w-full max-w-[400px] px-1 sm:px-0"
            >
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-sky-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

                    <div className="relative bg-[#0d1527]/90 backdrop-blur-3xl border border-indigo-500/30 rounded-[2rem] p-6 shadow-2xl sm:rounded-[2.5rem] sm:p-8 overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

                        <div className="flex justify-between items-end mb-8">
                            <div className="w-full">
                                <div className="flex lg:hidden items-center gap-2 mb-4">
                                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-400/20 shadow-sm">
                                        <img src="/norsu.png" alt="NORSU" className="w-4 h-4 rounded-full border border-indigo-900/50 shadow-[0_0_8px_rgba(255,255,255,0.1)] object-cover bg-white" />
                                        <span className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">
                                            NORSU-G
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 rounded bg-sky-500/10 border border-sky-400/20 shadow-sm">
                                        <img src="/carecenter.png" alt="CARE Center" className="w-4 h-4 rounded-full border border-sky-900/50 shadow-[0_0_8px_rgba(255,255,255,0.1)] object-cover bg-white" />
                                        <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">
                                            CARE CENTER
                                        </span>
                                    </div>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                                    Welcome <Sparkles className="w-5 h-5 text-sky-400" />
                                </h1>
                                <p className="text-indigo-200/50 text-xs font-medium">Log in to enter your dashboard</p>
                            </div>
                        </div>

                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-2 rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-1">
                                    <button
                                        type="button"
                                        onClick={() => onLoginMethodChange('studentId')}
                                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${loginMethod === 'studentId'
                                            ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-indigo-200/50 hover:text-white'
                                            }`}
                                    >
                                        Student ID
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onLoginMethodChange('email')}
                                        className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${loginMethod === 'email'
                                            ? 'bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'text-indigo-200/50 hover:text-white'
                                            }`}
                                    >
                                        Email
                                    </button>
                                </div>

                                <div className="relative">
                                    <input
                                        required
                                        id="studentLoginIdentifier"
                                        type={loginMethod === 'email' ? 'email' : 'text'}
                                        inputMode={loginMethod === 'email' ? 'email' : 'text'}
                                        autoCapitalize="none"
                                        autoCorrect="off"
                                        autoComplete={loginMethod === 'email' ? 'email' : 'username'}
                                        className="peer w-full bg-indigo-950/20 border border-indigo-800/40 rounded-xl px-5 py-3.5 pt-5 text-white text-sm outline-none transition-all placeholder-transparent focus:bg-indigo-900/30 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10"
                                        placeholder={loginFieldLabel}
                                        value={loginId}
                                        onChange={(event) => onLoginIdChange(event.target.value)}
                                    />
                                    <label
                                        htmlFor="studentLoginIdentifier"
                                        className="absolute left-5 top-2 text-[10px] font-bold text-indigo-300/40 uppercase tracking-wide transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:text-sky-400 pointer-events-none"
                                    >
                                        {loginFieldLabel}
                                    </label>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/40 peer-focus:text-sky-400 transition-colors pointer-events-none">
                                        {loginMethod === 'email' ? <Mail size={18} /> : <User size={18} />}
                                    </div>
                                </div>

                                <p className="px-1 text-[10px] text-indigo-200/40">
                                    {loginFieldHelpText}
                                </p>
                            </div>

                            <div className="relative">
                                <input
                                    required
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    className="peer w-full bg-indigo-950/20 border border-indigo-800/40 rounded-xl px-5 py-3.5 pt-5 text-white text-sm outline-none transition-all placeholder-transparent focus:bg-indigo-900/30 focus:border-indigo-500/40 focus:ring-4 focus:ring-indigo-500/10 pr-12"
                                    placeholder="Password"
                                    value={loginPassword}
                                    onChange={(event) => onLoginPasswordChange(event.target.value)}
                                />
                                <label
                                    htmlFor="password"
                                    className="absolute left-5 top-2 text-[10px] font-bold text-indigo-300/40 uppercase tracking-wide transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-3.5 peer-placeholder-shown:normal-case peer-placeholder-shown:font-medium peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:text-sky-400 pointer-events-none"
                                >
                                    Password
                                </label>
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={onTogglePassword}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400/40 hover:text-sky-400 transition-colors focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={onForgotPassword}
                                    className="text-xs font-bold text-sky-400/80 transition-colors hover:text-sky-300"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="pt-2 flex flex-col gap-3.5">
                                <m.button
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    disabled={loading || authLoading}
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-indigo-500 to-sky-500 text-white py-3.5 rounded-xl text-sm font-bold shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-70 border border-t-white/10"
                                >
                                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : 'Log In'}
                                </m.button>

                                <div className="relative flex items-center justify-center py-1">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-indigo-800/30"></div></div>
                                    <div className="relative px-3 bg-[#0d1527] text-[10px] text-indigo-300/30 font-bold uppercase tracking-[0.2em]">New Student?</div>
                                </div>

                                <m.button
                                    type="button"
                                    whileHover={{ y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={onCreateAccount}
                                    className="w-full bg-indigo-900/20 hover:bg-indigo-800/30 text-sky-400/90 py-3 rounded-xl text-sm font-bold border border-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserPlus size={16} /> Create Account
                                </m.button>
                            </div>
                        </form>
                    </div>
                </div>
            </m.div>
        </div>
    );
}
