import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { GraduationCap, Lock, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';

export default function StudentLogin() {
    const navigate = useNavigate();
    const { loginStudent, loading: authLoading } = useAuth();
    const [studentId, setStudentId] = useState('');
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

        const result = await loginStudent(studentId, password);

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/student'), 1000);
        } else {
            showToast(result.error, 'error');
        }

        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full bg-gradient-to-br from-blue-600 via-blue-700 to-sky-600 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
            <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-sky-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-20 w-96 h-96 bg-indigo-400 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

            {/* Left: Hero Branding */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center">
                <div className="relative z-10 text-white p-12 max-w-lg animate-fade-in-up">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-sky-300 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-blue-500/30 animate-float">
                        <GraduationCap size={32} />
                    </div>
                    <h2 className="text-5xl font-extrabold mb-4 leading-tight">Student Portal</h2>
                    <p className="text-blue-100/70 text-lg leading-relaxed">Access your profile, check your scholarship status, and manage your academic journey.</p>
                </div>
            </div>

            {/* Right: Login Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-8 relative z-10">
                <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '150ms' }}>
                    <div className="bg-white/15 backdrop-blur-2xl border border-white/25 rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/20">
                        <div className="mb-8">
                            <h1 className="text-3xl font-extrabold text-white">Welcome Student</h1>
                            <p className="text-blue-200/70 mt-2">Sign in with your Student ID.</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-blue-100/80 mb-2">Student ID</label>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300/50"><BookOpen size={18} /></div><input required className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/40 focus:bg-white/15 focus:border-blue-300/50 transition-all outline-none backdrop-blur-sm" placeholder="Enter Student ID" value={studentId} onChange={e => setStudentId(e.target.value)} /></div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-blue-100/80 mb-2">Password</label>
                                <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-300/50"><Lock size={18} /></div><input required type="password" className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200/40 focus:bg-white/15 focus:border-blue-300/50 transition-all outline-none backdrop-blur-sm" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} /></div>
                            </div>
                            <button disabled={loading || authLoading} type="submit" className="w-full bg-gradient-to-r from-blue-500 to-sky-400 text-white py-3.5 rounded-xl font-bold hover:from-blue-400 hover:to-sky-300 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 btn-press disabled:opacity-50">{loading ? 'Verifying...' : 'Sign In'}</button>
                            <a href="/" className="block text-center text-xs text-blue-200/40 mt-4 hover:text-white transition-colors">Back to Main Menu</a>
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
