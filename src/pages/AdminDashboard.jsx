import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
    const [toast, setToast] = useState(null);
    const [showResetModal, setShowResetModal] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
        } else {
            fetchAccounts();
        }
    }, [isAuthenticated, navigate]);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const departments = [
        'College of Arts and Sciences',
        'College of Engineering',
        'College of Education',
        'College of Agriculture and Forestry',
        'College of Criminal Justice Education',
        'College of Information Technology',
        'College of Nursing',
        'College of Business'
    ];

    const fetchAccounts = async () => {
        const { data } = await supabase.from('staff_accounts').select('*').order('created_at', { ascending: false });
        if (data) setAccounts(data);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const payload = { ...form };
        payload.username = payload.username.trim();
        if (payload.role !== 'Department Head') delete payload.department;

        const { error } = await supabase.from('staff_accounts').insert([payload]);
        if (error) showToast(error.message, 'error');
        else {
            showToast("Account created successfully!");
            setForm({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
            fetchAccounts();
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this account?")) return;
        await supabase.from('staff_accounts').delete().eq('id', id);
        fetchAccounts();
    };

    const handleReset = async () => {
        setShowResetModal(false);
        setLoading(true);
        try {
            // 1. Clean Staff Accounts (Keep current admin)
            const { error: staffError } = await supabase
                .from('staff_accounts')
                .delete()
                .neq('id', session.id);

            if (staffError) throw staffError;

            // 2. Clean Operational Data
            const tables = [
                'answers', 'submissions', 'notifications', 'office_visits', 'support_requests',
                'counseling_requests', 'event_feedback', 'event_attendance', 'applications',
                'scholarships', 'events', 'audit_logs', 'needs_assessments', 'students'
            ];

            for (const table of tables) {
                await supabase.from(table).delete().neq('id', 0);
            }

            // Delete from tables with specific PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            showToast("System data has been successfully reset. You can now create new accounts.");
            fetchAccounts();
        } catch (err) {
            showToast("Error resetting: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Account Management</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setShowResetModal(true)} className="text-red-600 font-bold hover:underline">Reset System</button>
                        <button onClick={handleLogout} className="text-gray-600 font-bold hover:underline">Logout</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create Form */}
                    <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                        <h2 className="font-bold text-lg mb-4">Create New Account</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Role</label><select className="w-full border p-2 rounded" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option>Department Head</option><option>Care Staff</option><option>Admin</option></select></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label><input required className="w-full border p-2 rounded" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Username</label><input required className="w-full border p-2 rounded" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Password</label><input required className="w-full border p-2 rounded" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Email (Optional)</label><input className="w-full border p-2 rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>

                            {form.role === 'Department Head' && (
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Department</label><select className="w-full border p-2 rounded" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">Select Department</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            )}

                            <button className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700">Create Account</button>
                        </form>
                    </div>

                    {/* Account List */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b"><h2 className="font-bold text-lg">Existing Accounts ({accounts.length})</h2></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Details</th><th className="p-4">Username</th><th className="p-4">Password</th><th className="p-4 text-right">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {accounts.map(acc => (
                                        <tr key={acc.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{acc.full_name}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs text-white ${acc.role === 'Admin' ? 'bg-red-500' : acc.role === 'Care Staff' ? 'bg-purple-500' : 'bg-green-500'}`}>{acc.role}</span></td>
                                            <td className="p-4 text-gray-500">{acc.department || '-'}</td>
                                            <td className="p-4 font-mono">{acc.username}</td>
                                            <td className="p-4 font-mono text-gray-500">{acc.password}</td>
                                            <td className="p-4 text-right"><button onClick={() => handleDelete(acc.id)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {toast && (
                    <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                    </div>
                )}

                {showResetModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-slide-in-up">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><AlertTriangle /></div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Danger Zone</h3>
                                <p className="text-gray-500 text-sm mb-6">This will wipe ALL data (Students, Events, Logs) and ALL other Staff Accounts. Only your Admin account will remain.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                                    <button onClick={handleReset} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200">Confirm Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
