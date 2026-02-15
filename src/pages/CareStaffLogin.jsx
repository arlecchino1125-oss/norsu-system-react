import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { User, Lock, CheckCircle, AlertCircle, Heart } from 'lucide-react';

export default function CareStaffLogin() {
    const navigate = useNavigate();
    const { login, loading: authLoading } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password, 'Care Staff');

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/care-staff/dashboard'), 1000);
        } else {
            showToast(result.error, 'error');
        }

        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-purple-700 via-indigo-800 to-violet-700 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-80 h-80 bg-violet-300 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-float"></div>

            {/* Left: Hero Branding */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center">
                <div className="relative z-10 text-white p-12 max-w-lg animate-fade-in-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-400 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-purple-500/30 animate-float">
                        <Heart size={32} />
                    </div>
                    <h2 className="text-5xl font-extrabold mb-4 leading-tight">CARE</h2>
                    <p className="text-purple-100/70 text-lg leading-relaxed">Manage student welfare, counseling services, support requests, and campus events — all in one secure environment.</p>
                    <div className="mt-8 flex gap-3">
                        <div className="h-1.5 w-12 bg-gradient-to-r from-violet-300 to-purple-400 rounded-full"></div>
                        <div className="h-1.5 w-8 bg-violet-300/30 rounded-full"></div>
                        <div className="h-1.5 w-4 bg-violet-300/20 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Right: Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 relative z-10">
                <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <div className="bg-white/15 backdrop-blur-2xl border border-white/25 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/20">
                        <div className="mb-8">
                            <div className="lg:hidden w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-400 rounded-xl flex items-center justify-center text-white text-xl mb-4 shadow-lg shadow-purple-500/30"><Heart size={24} /></div>
                            <h1 className="text-3xl font-extrabold text-white">Welcome Back</h1>
                            <p className="text-violet-200/70 mt-2">Sign in to continue to your dashboard.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-purple-100/80 mb-2">Username</label>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-violet-300/50"><User size={18} /></div><input required className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-violet-200/40 focus:bg-white/15 focus:border-violet-300/50 transition-all outline-none backdrop-blur-sm" placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-purple-100/80 mb-2">Password</label>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-violet-300/50"><Lock size={18} /></div><input required type="password" className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-violet-200/40 focus:bg-white/15 focus:border-violet-300/50 transition-all outline-none backdrop-blur-sm" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
                            </div>
                            <button disabled={loading || authLoading} type="submit" className="w-full bg-gradient-to-r from-purple-500 to-violet-400 text-white py-3.5 rounded-xl font-bold hover:from-purple-400 hover:to-violet-300 transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5 btn-press disabled:opacity-50">{loading ? 'Verifying...' : 'Sign In'}</button>
                            <a href="/" className="block text-center text-xs text-violet-200/40 mt-4 hover:text-white transition-colors">Back to Main Menu</a>
                        </form>
                    </div>
                </div>
            </div>

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-right z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-gradient-to-r from-emerald-500 to-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                    <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                </div>
            )}
        </div>
    );
}
