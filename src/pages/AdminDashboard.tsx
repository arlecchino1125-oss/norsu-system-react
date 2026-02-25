import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const [loading, setLoading] = useState<boolean>(false);
    const [form, setForm] = useState<any>({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
    const [toast, setToast] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [newDeptName, setNewDeptName] = useState<string>('');

    // Use custom hook for real-time data fetching
    const { data: accounts, refetch: refetchAccounts } = useSupabaseData({
        table: 'staff_accounts',
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });

    const { data: departmentsData, refetch: refetchDepartments } = useSupabaseData({
        table: 'departments',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const departments = departmentsData.map(d => d.name);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
        }
    }, [isAuthenticated, navigate]);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleCreate = async (e: any) => {
        e.preventDefault();
        const payload = { ...form };
        payload.username = payload.username.trim();
        if (payload.role !== 'Department Head') delete payload.department;

        const { error } = await supabase.from('staff_accounts').insert([payload]);
        if (error) showToast(error.message, 'error');
        else {
            showToast("Account created successfully!");
            setForm({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
            refetchAccounts();
        }
    };

    const handleDelete = async (id: any) => {
        if (!confirm("Delete this account?")) return;
        await supabase.from('staff_accounts').delete().eq('id', id);
        refetchAccounts();
    };

    const handleReset = async () => {
        setShowResetModal(false);
        setLoading(true);
        try {
            // === PHASE 1: Wipe all Storage Buckets ===
            const buckets = ['profile-pictures', 'attendance_proofs', 'support_documents'];
            for (const bucket of buckets) {
                try {
                    const { data: files } = await supabase.storage.from(bucket).list('', { limit: 10000 });
                    if (files && files.length > 0) {
                        const filePaths = files.map((f: any) => f.name);
                        await supabase.storage.from(bucket).remove(filePaths);
                    }
                } catch {
                    // Bucket may not exist yet, skip silently
                }
            }

            // === PHASE 2: Wipe all Database Tables (FK-safe order) ===
            // Child tables first (those with foreign keys), then parent tables
            const tables = [
                'answers',               // FK → submissions, questions
                'submissions',           // FK → forms, students
                'questions',             // FK → forms
                'forms',                 // Standalone (parent of questions/submissions)
                'general_feedback',      // FK → students
                'notifications',         // FK → students
                'office_visits',         // FK → students
                'support_requests',      // FK → students
                'counseling_requests',   // FK → students
                'event_feedback',        // FK → events
                'event_attendance',      // FK → events
                'applications',          // FK → students
                'scholarships',          // Standalone
                'events',               // Standalone (parent of event_feedback/attendance)
                'audit_logs',           // Standalone
                'needs_assessments',    // Standalone
            ];

            for (const table of tables) {
                await supabase.from(table).delete().not('id', 'is', null);
            }

            // Tables with non-standard PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            // Students table (cleared after all dependent tables)
            await supabase.from('students').delete().not('id', 'is', null);

            // === PHASE 3: Clean Staff Accounts (Keep current admin only) ===
            const { error: staffError } = await supabase
                .from('staff_accounts')
                .delete()
                .neq('id', session.id);

            if (staffError) throw staffError;

            showToast("Full system reset complete — all data, files, and accounts have been wiped.");
            refetchAccounts();
        } catch (err: any) {
            showToast("Error resetting: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDepartment = async () => {
        const name = newDeptName.trim();
        if (!name) return;
        if (departments.includes(name)) { showToast('College already exists.', 'error'); return; }
        const { error } = await supabase.from('departments').insert([{ name }]);
        if (error) showToast(error.message, 'error');
        else { showToast(`College "${name}" added.`); setNewDeptName(''); refetchDepartments(); }
    };

    const handleDeleteDepartment = async (dept: any) => {
        if (!confirm(`Remove college "${dept.name}"? This will NOT delete accounts or students linked to it.`)) return;
        const { error } = await supabase.from('departments').delete().eq('id', dept.id);
        if (error) showToast(error.message, 'error');
        else { showToast(`College "${dept.name}" removed.`); refetchDepartments(); }
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
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Role</label><select className="w-full border p-2 rounded" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="Department Head">Dean</option><option value="Care Staff">CARE Staff</option><option>Admin</option></select></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label><input required className="w-full border p-2 rounded" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Username</label><input required className="w-full border p-2 rounded" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Password</label><input required className="w-full border p-2 rounded" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Email (Optional)</label><input className="w-full border p-2 rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>

                            {form.role === 'Department Head' && (
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">College</label><select className="w-full border p-2 rounded" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">Select College</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
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
                                    {accounts.map((acc: any) => (
                                        <tr key={acc.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{acc.full_name}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs text-white ${acc.role === 'Admin' ? 'bg-red-500' : acc.role === 'Care Staff' ? 'bg-purple-500' : 'bg-green-500'}`}>{acc.role === 'Care Staff' ? 'CARE Staff' : acc.role}</span></td>
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

                {/* Department Management */}
                <div className="bg-white rounded-xl shadow-sm mt-8 overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="font-bold text-lg">Colleges ({departmentsData.length})</h2>
                        <div className="flex gap-2">
                            <input className="border p-2 rounded text-sm w-64" placeholder="New college name…" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()} />
                            <button onClick={handleAddDepartment} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-1 text-sm"><Plus className="w-4 h-4" /> Add</button>
                        </div>
                    </div>
                    <div className="p-6 flex flex-wrap gap-2">
                        {departmentsData.length === 0 && <p className="text-gray-400 text-sm">No colleges yet. Add one above.</p>}
                        {departmentsData.map((dept: any) => (
                            <span key={dept.id} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium">
                                {dept.name}
                                <button onClick={() => handleDeleteDepartment(dept)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </span>
                        ))}
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
                                <p className="text-gray-500 text-sm mb-6">This will wipe ALL data — Students, Events, Forms, Logs, uploaded files (profile pictures, attendance proofs, support documents) — and ALL other Staff Accounts. Only your Admin account will remain.</p>
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
