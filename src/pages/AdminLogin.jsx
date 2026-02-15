import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        const result = await login(username, password, 'Admin');

        if (result.success) {
            showToast("Login Successful", 'success');
            setTimeout(() => navigate('/admin/dashboard'), 1000);
        } else {
            showToast(result.error, 'error');
        }
        setLoading(false);
    };

    return (
        <div className="flex h-screen w-full bg-white overflow-hidden">
            {/* Left Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-red-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-orange-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 opacity-90"></div>

                <div className="relative z-10 text-white p-12 max-w-lg">
                    <div className="mb-6 inline-block p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                        <Shield className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-4xl font-bold mb-6">System Administration</h2>
                    <p className="text-slate-300 text-lg leading-relaxed">Secure access for system maintenance, user management, and global configuration.</p>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 relative">
                {/* Mobile Background Blobs */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob lg:hidden"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000 lg:hidden"></div>

                <div className="w-full max-w-md relative z-10 page-transition">
                    <div className="mb-10">
                        <h1 className="text-3xl font-bold text-gray-900">Admin Sign In</h1>
                        <p className="text-gray-500 mt-2">Enter your credentials to access the admin console.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Username</label>
                            <input
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all outline-none"
                                placeholder="Enter admin username"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
                            <input
                                required
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:bg-white transition-all outline-none"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
                        >
                            {loading ? 'Authenticating...' : 'Sign In'}
                        </button>
                        <a href="/" className="block text-center text-sm text-gray-400 hover:text-red-600 font-medium transition-colors">Back to Main Menu</a>
                    </form>
                </div>
            </div>

            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                    <div>
                        <h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4>
                        <p className="text-xs opacity-90">{toast.msg}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
