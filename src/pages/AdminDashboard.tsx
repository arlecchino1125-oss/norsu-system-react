import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle, Plus, RefreshCw } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';

const STAFF_ACCOUNT_SELECT = 'id, username, full_name, role, department, email, created_at, auth_user_id';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const [loading, setLoading] = useState<boolean>(false);
    const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
    const [form, setForm] = useState<any>({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
    const [toast, setToast] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [showStudentResetModal, setShowStudentResetModal] = useState<boolean>(false);
    const [newDeptName, setNewDeptName] = useState<string>('');
    const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
    const [isMigratingAuthEmails, setIsMigratingAuthEmails] = useState<boolean>(false);
    const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
    const [savingAccountEmailId, setSavingAccountEmailId] = useState<string | null>(null);
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);

    // Use custom hook for real-time data fetching
    const { data: accounts, refetch: refetchAccounts } = useSupabaseData({
        table: 'staff_accounts',
        select: STAFF_ACCOUNT_SELECT,
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });

    const { data: departmentsData, refetch: refetchDepartments } = useSupabaseData({
        table: 'departments',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const { data: coursesData, refetch: refetchCourses } = useSupabaseData({
        table: 'courses',
        select: 'id, name, department_id',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const { data: studentsData, refetch: refetchStudents } = useSupabaseData({
        table: 'students',
        select: 'id, student_id, first_name, last_name, status, auth_user_id',
        subscribe: true
    });
    const { data: applicationsData, refetch: refetchApplications } = useSupabaseData({
        table: 'applications',
        select: 'id, student_id, first_name, last_name, status',
        subscribe: true
    });
    const departments = departmentsData.map(d => d.name);
    const linkedStudentCount = studentsData.filter((student: any) => Boolean(student.auth_user_id)).length;
    const authPendingStudentCount = studentsData.length - linkedStudentCount;
    const activeStudentCount = studentsData.filter((student: any) => student.status === 'Active').length;
    const probationStudentCount = studentsData.filter((student: any) => student.status === 'Probation').length;
    const recentStudents = studentsData.slice(0, 8);
    const unlinkedStaffAccountCount = accounts.filter((account: any) => !account.auth_user_id).length;
    const staffAccountsMissingEmailCount = accounts.filter((account: any) => !String(account.email || '').trim()).length;
    const departmentHeadsMissingDepartmentCount = accounts.filter((account: any) =>
        String(account.role || '').trim() === 'Department Head'
        && !String(account.department || '').trim()
    ).length;
    const adminAlerts = [
        { label: 'Unlinked staff accounts', value: unlinkedStaffAccountCount, tone: 'border-blue-100 bg-blue-50 text-blue-700' },
        { label: 'Staff accounts missing email', value: staffAccountsMissingEmailCount, tone: 'border-amber-100 bg-amber-50 text-amber-700' },
        { label: 'Students needing auth', value: authPendingStudentCount, tone: 'border-purple-100 bg-purple-50 text-purple-700' },
        { label: 'Department heads without college', value: departmentHeadsMissingDepartmentCount, tone: 'border-rose-100 bg-rose-50 text-rose-700' }
    ];
    const formatStudentName = (student: any) =>
        [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed Student';
    const getAccountEmailDraft = (account: any) =>
        emailDrafts[String(account.id)] ?? String(account.email || '');

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedDepartmentId = Number(departmentId);
        return coursesData.filter((course: any) => Number(course.department_id) === normalizedDepartmentId);
    };

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
        }
    }, [isAuthenticated, navigate]);

    const showToast = (msg: string, type: string = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const isFunctionUnavailableError = (message: string, status?: number | null, errorName?: string | null) => {
        const normalized = String(message || '').toLowerCase();
        if (status === 404) return true;
        if (errorName === 'FunctionsFetchError' || errorName === 'FunctionsRelayError') return true;
        return normalized.includes('failed to send a request to the edge function')
            || normalized.includes('failed to fetch')
            || normalized.includes('fetch failed')
            || normalized.includes('cors')
            || normalized.includes('not found');
    };

    const invokeManagedStaffFunction = async (body: any) => {
        return invokeEdgeFunction('manage-staff-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to manage staff account.'
        });
    };

    const invokeManagedStudentFunction = async (body: any) => {
        return invokeEdgeFunction('manage-student-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Please sign in again.',
            fallbackMessage: 'Failed to manage student accounts.'
        });
    };

    const handleCreate = async (e: any) => {
        e.preventDefault();
        const payload = { ...form };
        payload.username = payload.username.trim();
        payload.email = String(payload.email || '').trim().toLowerCase();
        if (payload.role !== 'Department Head') delete payload.department;
        setIsCreatingAccount(true);

        try {
            const result = await invokeEdgeFunction('provision-staff-account', {
                body: payload,
                requireAuth: true,
                non2xxMessage: 'Your admin session could not be verified. Please sign in again.',
                fallbackMessage: 'Failed to provision staff account.'
            });

            showToast('Account created and linked to Supabase Auth.');
            void sendTransactionalEmailNotification(result?.emailPayload, 'Failed to send credential email.').then((emailResult) => {
                if (emailResult.emailSent === false) {
                    showToast(`Account created, but credential email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
            setForm({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
            refetchAccounts();
        } catch (error: any) {
            if (!isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to create account.', 'error');
                setIsCreatingAccount(false);
                return;
            }

            showToast(
                'Account creation blocked: deploy the latest provision-staff-account function. New staff accounts must be created as linked Supabase Auth accounts.',
                'error'
            );
        } finally {
            setIsCreatingAccount(false);
        }
    };

    const handleDelete = async (account: any) => {
        const nextAccountId = String(account?.id || '').trim();
        if (!nextAccountId || deletingAccountId === nextAccountId) return;
        if (account.id === session.id) {
            showToast('You cannot delete the account you are currently using.', 'error');
            return;
        }

        const confirmMessage = account.auth_user_id
            ? 'Delete this linked account? Its Supabase Auth login will also be removed.'
            : 'Delete this account?';
        if (!confirm(confirmMessage)) return;
        setDeletingAccountId(nextAccountId);

        try {
            const result = await invokeManagedStaffFunction({
                mode: 'delete-account',
                staffAccountId: nextAccountId
            });

            if (result?.authCleanupWarning) {
                showToast(`Staff account deleted. Auth cleanup warning: ${result.authCleanupWarning}`, 'error');
            } else {
                showToast(account.auth_user_id ? 'Linked staff account deleted.' : 'Staff account deleted.');
            }
            refetchAccounts();
        } catch (error: any) {
            if (!isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to delete account.', 'error');
                return;
            }

            if (account.auth_user_id) {
                showToast('Delete blocked: deploy manage-staff-accounts before removing linked staff accounts.', 'error');
                return;
            }

            const { error: legacyError } = await supabase
                .from('staff_accounts')
                .delete()
                .eq('id', account.id);

            if (legacyError) {
                showToast(legacyError.message, 'error');
                return;
            }

            showToast('Legacy staff account deleted.');
            refetchAccounts();
        } finally {
            setDeletingAccountId(null);
        }
    };

    const handleReset = async () => {
        setShowResetModal(false);
        setLoading(true);
        try {
            const linkedAccountsToDelete = accounts.filter((account: any) =>
                account.id !== session.id && account.auth_user_id
            );
            const { count: linkedStudentCount, error: linkedStudentCountError } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .not('auth_user_id', 'is', null);

            if (linkedStudentCountError) throw linkedStudentCountError;

            if (linkedAccountsToDelete.length > 0) {
                try {
                    await invokeManagedStaffFunction({ mode: 'ping' });
                } catch (error: any) {
                    if (isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                        showToast('Reset blocked: deploy manage-staff-accounts before resetting while linked staff accounts exist.', 'error');
                        return;
                    }

                    showToast(error.message || 'Unable to verify linked staff cleanup.', 'error');
                    return;
                }
            }

            if ((linkedStudentCount || 0) > 0) {
                try {
                    await invokeManagedStudentFunction({ mode: 'ping' });
                } catch (error: any) {
                    if (isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                        showToast('Reset blocked: deploy manage-student-accounts before resetting while linked students exist.', 'error');
                        return;
                    }

                    showToast(error.message || 'Unable to verify linked student cleanup.', 'error');
                    return;
                }
            }

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
            ];

            for (const table of tables) {
                await supabase.from(table).delete().not('id', 'is', null);
            }

            // Tables with non-standard PKs
            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            // Students table (cleared after all dependent tables)
            try {
                await invokeManagedStudentFunction({ mode: 'delete-all-students' });
            } catch (error: any) {
                if (!isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                    throw error;
                }

                if ((linkedStudentCount || 0) > 0) {
                    throw new Error('Reset blocked: deploy manage-student-accounts before resetting linked students.');
                }

                await supabase.from('students').delete().not('id', 'is', null);
            }

            // === PHASE 3: Clean Staff Accounts (Keep current admin only) ===
            try {
                await invokeManagedStaffFunction({
                    mode: 'delete-all-except',
                    preserveStaffAccountId: session.id
                });
            } catch (error: any) {
                if (!isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                    throw error;
                }

                const { error: staffError } = await supabase
                    .from('staff_accounts')
                    .delete()
                    .neq('id', session.id);

                if (staffError) throw staffError;
            }

            showToast("Full system reset complete — all data, files, and accounts have been wiped.");
            refetchAccounts();
        } catch (err: any) {
            showToast("Error resetting: " + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleResetStudents = async () => {
        setShowStudentResetModal(false);
        setLoading(true);
        try {
            if (linkedStudentCount > 0) {
                try {
                    await invokeManagedStudentFunction({ mode: 'ping' });
                } catch (error: any) {
                    if (isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                        showToast('Student reset blocked: deploy manage-student-accounts before resetting linked students.', 'error');
                        return;
                    }

                    showToast(error.message || 'Unable to verify linked student cleanup.', 'error');
                    return;
                }
            }

            const studentTables = [
                'answers',
                'submissions',
                'general_feedback',
                'notifications',
                'office_visits',
                'support_requests',
                'counseling_requests',
                'event_attendance',
                'applications'
            ];

            for (const table of studentTables) {
                await supabase.from(table).delete().not('id', 'is', null);
            }

            await supabase.from('enrolled_students').delete().neq('student_id', '0');

            try {
                await invokeManagedStudentFunction({ mode: 'delete-all-students' });
            } catch (error: any) {
                if (!isFunctionUnavailableError(error?.message || '', error?.status, error?.errorName)) {
                    throw error;
                }

                if (linkedStudentCount > 0) {
                    throw new Error('Student reset blocked: deploy manage-student-accounts before resetting linked students.');
                }

                await supabase.from('students').delete().not('id', 'is', null);
            }

            await Promise.all([
                refetchStudents(),
                refetchApplications()
            ]);
            showToast('Student data reset complete.');
        } catch (err: any) {
            showToast('Error resetting student data: ' + err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDepartment = async () => {
        const name = newDeptName.trim();
        if (isAddingDepartment) return;
        if (!name) return;
        if (departments.includes(name)) { showToast('College already exists.', 'error'); return; }
        setIsAddingDepartment(true);
        try {
            const { error } = await supabase.from('departments').insert([{ name }]);
            if (error) showToast(error.message, 'error');
            else { showToast(`College "${name}" added.`); setNewDeptName(''); refetchDepartments(); }
        } finally {
            setIsAddingDepartment(false);
        }
    };

    const handleDeleteDepartment = async (dept: any) => {
        const nextDepartmentId = String(dept?.id || '').trim();
        if (!nextDepartmentId || deletingDepartmentId === nextDepartmentId) return;
        const linkedCourses = getDepartmentCourses(dept.id);

        if (linkedCourses.length > 0) {
            const coursePreview = linkedCourses
                .slice(0, 3)
                .map((course: any) => course.name)
                .join(', ');
            const remainingCount = linkedCourses.length - Math.min(linkedCourses.length, 3);
            const previewSuffix = remainingCount > 0 ? `, and ${remainingCount} more` : '';
            showToast(
                `Cannot delete college "${dept.name}" because ${linkedCourses.length} course(s) are still assigned to it: ${coursePreview}${previewSuffix}. Delete or reassign those courses first.`,
                'error'
            );
            return;
        }

        if (!confirm(`Remove college "${dept.name}"? This will NOT delete accounts or students linked to it.`)) return;
        setDeletingDepartmentId(nextDepartmentId);
        try {
            const { error } = await supabase.from('departments').delete().eq('id', nextDepartmentId);
            if (error) {
                if (String(error.message || '').includes('courses_department_id_fkey')) {
                    showToast(`Cannot delete college "${dept.name}" because it still has linked courses. Delete or reassign those courses first.`, 'error');
                    refetchCourses();
                    return;
                }
                showToast(error.message, 'error');
            }
            else {
                showToast(`College "${dept.name}" removed.`);
                refetchDepartments();
            }
        } finally {
            setDeletingDepartmentId(null);
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await Promise.all([
                refetchAccounts(),
                refetchDepartments(),
                refetchCourses(),
                refetchStudents(),
                refetchApplications()
            ]);
            showToast('Admin data refreshed.');
        } catch (error: any) {
            showToast(error?.message || 'Failed to refresh admin data.', 'error');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const handleMigrateAuthEmails = async () => {
        setIsMigratingAuthEmails(true);
        try {
            const staffResult = await invokeManagedStaffFunction({ mode: 'sync-all-auth-emails' });
            const studentResult = await invokeManagedStudentFunction({ mode: 'sync-all-auth-emails' });

            await Promise.all([
                refetchAccounts(),
                refetchStudents()
            ]);

            const staffWarnings = Array.isArray(staffResult?.warnings) ? staffResult.warnings.length : 0;
            const studentWarnings = Array.isArray(studentResult?.warnings) ? studentResult.warnings.length : 0;

            showToast(
                `Auth migration complete. Staff updated: ${staffResult?.updatedCount || 0}, already synced: ${staffResult?.alreadySyncedCount || 0}. Students updated: ${studentResult?.updatedCount || 0}, already synced: ${studentResult?.alreadySyncedCount || 0}.${staffWarnings || studentWarnings ? ` Warnings: ${staffWarnings + studentWarnings}.` : ''}`,
                staffWarnings || studentWarnings ? 'error' : 'success'
            );

            if (staffWarnings || studentWarnings) {
                console.warn('Auth migration warnings', {
                    staffWarnings: staffResult?.warnings || [],
                    studentWarnings: studentResult?.warnings || []
                });
            }
        } catch (error: any) {
            showToast(error?.message || 'Failed to migrate linked auth emails.', 'error');
        } finally {
            setIsMigratingAuthEmails(false);
        }
    };

    const handleSaveAccountEmail = async (account: any) => {
        const normalizedEmail = getAccountEmailDraft(account).trim().toLowerCase();
        if (!normalizedEmail) {
            showToast('Enter a real email before saving.', 'error');
            return;
        }

        setSavingAccountEmailId(String(account.id));
        try {
            const result = await invokeManagedStaffFunction({
                mode: 'update-account-email',
                staffAccountId: account.id,
                email: normalizedEmail
            });

            await refetchAccounts();
            setEmailDrafts((prev) => {
                const next = { ...prev };
                delete next[String(account.id)];
                return next;
            });

            showToast(
                result?.warning
                    ? `Saved ${account.username}'s email. ${result.warning}`
                    : `Saved ${account.username}'s email.`,
                result?.warning ? 'error' : 'success'
            );
        } catch (error: any) {
            showToast(error?.message || 'Failed to save the account email.', 'error');
        } finally {
            setSavingAccountEmailId(null);
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
                        <button
                            onClick={handleRefreshData}
                            disabled={isRefreshingData}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>
                        <button
                            onClick={handleMigrateAuthEmails}
                            disabled={isMigratingAuthEmails}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isMigratingAuthEmails ? 'animate-spin' : ''} />
                            <span>{isMigratingAuthEmails ? 'Migrating Auth...' : 'Migrate Auth Emails'}</span>
                        </button>
                        <button onClick={() => setShowResetModal(true)} disabled={loading} className="text-red-600 font-bold hover:underline disabled:opacity-60">Reset System</button>
                        <button onClick={handleLogout} className="text-gray-600 font-bold hover:underline">Logout</button>
                    </div>
                </div>

                <div className="mb-8">
                    <div className="mb-3">
                        <h2 className="text-lg font-bold text-gray-900">Role-Based Alerts</h2>
                        <p className="text-sm text-gray-500">Simple admin-only counts for account setup and access cleanup.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {adminAlerts.map((alert) => (
                            <div key={alert.label} className={`rounded-xl border p-4 ${alert.tone}`}>
                                <p className="text-xs font-bold uppercase tracking-wide">{alert.label}</p>
                                <p className="mt-3 text-3xl font-bold text-gray-900">{alert.value}</p>
                            </div>
                        ))}
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
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Password</label><input required type="password" autoComplete="new-password" className="w-full border p-2 rounded" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">Email</label><input required type="email" className="w-full border p-2 rounded" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>

                            {form.role === 'Department Head' && (
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">College</label><select className="w-full border p-2 rounded" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}><option value="">Select College</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            )}

                            <button disabled={isCreatingAccount} className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-60">
                                {isCreatingAccount ? 'Creating...' : 'Create Account'}
                            </button>
                        </form>
                    </div>

                    {/* Account List */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="font-bold text-lg">Existing Accounts ({accounts.length})</h2>
                            <p className="mt-1 text-sm text-gray-500">If an account has no real email yet, add it here first, then run `Migrate Auth Emails` again.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b"><tr><th className="p-4">Name</th><th className="p-4">Role</th><th className="p-4">Details</th><th className="p-4">Username</th><th className="p-4">Auth</th><th className="p-4 text-right">Action</th></tr></thead>
                                <tbody className="divide-y">
                                    {accounts.map((acc: any) => (
                                        <tr key={acc.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-bold">{acc.full_name}</td>
                                            <td className="p-4"><span className={`px-2 py-1 rounded text-xs text-white ${acc.role === 'Admin' ? 'bg-red-500' : acc.role === 'Care Staff' ? 'bg-purple-500' : 'bg-green-500'}`}>{acc.role === 'Care Staff' ? 'CARE Staff' : acc.role}</span></td>
                                            <td className="p-4 text-gray-500">
                                                <div>{acc.department || '-'}</div>
                                                {acc.email ? (
                                                    <div className="text-xs text-gray-400 break-all">{acc.email}</div>
                                                ) : (
                                                    <div className="mt-2 flex min-w-[260px] flex-col gap-2">
                                                        <input
                                                            type="email"
                                                            value={getAccountEmailDraft(acc)}
                                                            onChange={(e) => setEmailDrafts((prev) => ({
                                                                ...prev,
                                                                [String(acc.id)]: e.target.value
                                                            }))}
                                                            placeholder="Add real email"
                                                            className="w-full rounded border border-amber-200 px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSaveAccountEmail(acc)}
                                                            disabled={savingAccountEmailId === String(acc.id)}
                                                            className="inline-flex w-fit items-center rounded bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                                                        >
                                                            {savingAccountEmailId === String(acc.id) ? 'Saving...' : 'Save Email'}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-mono">{acc.username}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${acc.auth_user_id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {acc.auth_user_id ? 'Linked' : 'Unlinked'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="inline-flex items-center gap-3">
                                                    <button disabled={deletingAccountId === String(acc.id)} onClick={() => handleDelete(acc)} className="text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className={`w-4 h-4 ${deletingAccountId === String(acc.id) ? 'animate-spin' : ''}`} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm h-fit">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="font-bold text-lg">Student Data</h2>
                                <p className="text-sm text-gray-500 mt-1">Prototype reset controls for student-facing records only.</p>
                            </div>
                            <button
                                onClick={() => setShowStudentResetModal(true)}
                                disabled={loading}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-60"
                            >
                                {loading ? 'Working...' : 'Reset Student Data'}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Students</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{studentsData.length}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Linked Auth</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{linkedStudentCount}</p>
                            </div>
                            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Needs Auth</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{authPendingStudentCount}</p>
                            </div>
                            <div className="rounded-xl border border-purple-100 bg-purple-50 p-4">
                                <p className="text-xs font-bold uppercase tracking-wide text-purple-700">Applications</p>
                                <p className="mt-2 text-2xl font-bold text-gray-900">{applicationsData.length}</p>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                                <span>Active students</span>
                                <span className="font-bold text-gray-900">{activeStudentCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Probation students</span>
                                <span className="font-bold text-gray-900">{probationStudentCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>Linked auth cleanup required</span>
                                <span className={`font-bold ${linkedStudentCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                    {linkedStudentCount > 0 ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="font-bold text-lg">Student Snapshot</h2>
                            <p className="text-sm text-gray-500 mt-1">Quick preview of current student records before a student-only reset.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-4">Student</th>
                                        <th className="p-4">Student ID</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Auth</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {recentStudents.map((student: any) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="p-4 font-medium text-gray-900">{formatStudentName(student)}</td>
                                            <td className="p-4 font-mono text-gray-600">{student.student_id || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    student.status === 'Active'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : student.status === 'Probation'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {student.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    student.auth_user_id
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {student.auth_user_id ? 'Linked' : 'Pending'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentStudents.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-6 text-center text-sm text-gray-400">
                                                No student records found.
                                            </td>
                                        </tr>
                                    )}
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
                            <input disabled={isAddingDepartment} className="border p-2 rounded text-sm w-64 disabled:opacity-60" placeholder="New college name…" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()} />
                            <button disabled={isAddingDepartment} onClick={handleAddDepartment} className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-1 text-sm disabled:cursor-not-allowed disabled:opacity-60"><Plus className={`w-4 h-4 ${isAddingDepartment ? 'animate-spin' : ''}`} /> {isAddingDepartment ? 'Adding...' : 'Add'}</button>
                        </div>
                    </div>
                    <div className="p-6 flex flex-wrap gap-2">
                        {departmentsData.length === 0 && <p className="text-gray-400 text-sm">No colleges yet. Add one above.</p>}
                        {departmentsData.map((dept: any) => {
                            const linkedCourseCount = getDepartmentCourses(dept.id).length;

                            return (
                                <span key={dept.id} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium">
                                    {dept.name}
                                    {linkedCourseCount > 0 && (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                            {linkedCourseCount} course{linkedCourseCount === 1 ? '' : 's'}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDeleteDepartment(dept)}
                                        disabled={deletingDepartmentId === String(dept.id)}
                                        className="text-red-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                                        title={linkedCourseCount > 0
                                            ? `Delete blocked: ${linkedCourseCount} course(s) still assigned`
                                            : `Delete ${dept.name}`
                                        }
                                    >
                                        <Trash2 className={`w-3.5 h-3.5 ${deletingDepartmentId === String(dept.id) ? 'animate-spin' : ''}`} />
                                    </button>
                                </span>
                            );
                        })}
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
                                    <button disabled={loading} onClick={() => setShowResetModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 disabled:opacity-60">Cancel</button>
                                    <button disabled={loading} onClick={handleReset} className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-200 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Resetting...' : 'Confirm Reset'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showStudentResetModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-slide-in-up">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><AlertTriangle /></div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Reset Student Data</h3>
                                <p className="text-gray-500 text-sm mb-6">This prototype clears student-facing data only: students, applications, enrolled students, student requests, notifications, attendance, form submissions, and linked student auth accounts. Staff, colleges, courses, forms, and events will stay.</p>
                                <div className="flex gap-3">
                                    <button disabled={loading} onClick={() => setShowStudentResetModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 disabled:opacity-60">Cancel</button>
                                    <button disabled={loading} onClick={handleResetStudents} className="flex-1 px-4 py-2.5 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 shadow-lg shadow-amber-200 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Resetting...' : 'Confirm Student Reset'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
