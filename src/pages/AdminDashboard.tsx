import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { formatAuditDetails, isTrackedStaffAuditRole, type StaffAuditLogRow } from '../lib/staffAudit';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle, Plus, RefreshCw, Shield, LogOut, UserPlus, Building2, Users, Activity, Search } from 'lucide-react';
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
    const [auditLogs, setAuditLogs] = useState<StaffAuditLogRow[]>([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditRoleFilter, setAuditRoleFilter] = useState<'All' | 'Care Staff' | 'Department Head'>('All');
    const [auditSearch, setAuditSearch] = useState('');

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
        {
            label: 'Unlinked staff accounts',
            value: unlinkedStaffAccountCount,
            hint: unlinkedStaffAccountCount > 0 ? 'Needs auth cleanup' : 'All staff accounts are linked',
            tone: 'border-sky-200 bg-sky-50 text-sky-700'
        },
        {
            label: 'Staff accounts missing email',
            value: staffAccountsMissingEmailCount,
            hint: staffAccountsMissingEmailCount > 0 ? 'Add real email before migration' : 'Email records look complete',
            tone: 'border-amber-200 bg-amber-50 text-amber-700'
        },
        {
            label: 'Students needing auth',
            value: authPendingStudentCount,
            hint: authPendingStudentCount > 0 ? 'Student access setup is still pending' : 'Student auth setup is current',
            tone: 'border-cyan-200 bg-cyan-50 text-cyan-700'
        },
        {
            label: 'Department heads without college',
            value: departmentHeadsMissingDepartmentCount,
            hint: departmentHeadsMissingDepartmentCount > 0 ? 'College assignment required' : 'Department heads are assigned',
            tone: 'border-rose-200 bg-rose-50 text-rose-700'
        }
    ];
    const formatStudentName = (student: any) =>
        [student?.first_name, student?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed Student';
    const getAccountEmailDraft = (account: any) =>
        emailDrafts[String(account.id)] ?? String(account.email || '');

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedDepartmentId = Number(departmentId);
        return coursesData.filter((course: any) => Number(course.department_id) === normalizedDepartmentId);
    };

    const fetchAuditLogs = async () => {
        setAuditLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('id, created_at, user_name, action, details, actor_role, actor_department, entity_table, entity_id')
                .in('actor_role', ['Care Staff', 'Department Head'])
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setAuditLogs((data || []) as StaffAuditLogRow[]);
        } catch (error: any) {
            console.error('Failed to load staff audit logs:', error);
            showToast(error?.message || 'Failed to load staff audit logs.', 'error');
        } finally {
            setAuditLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        if (!isAuthenticated) {
            setAuditLogs([]);
            setAuditLoading(false);
            return;
        }

        let isMounted = true;
        void fetchAuditLogs();

        const channel = supabase
            .channel('admin_staff_audit_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                const nextLog = payload.new as StaffAuditLogRow;
                if (!isMounted || !isTrackedStaffAuditRole(nextLog?.actor_role)) return;
                setAuditLogs((prev) => [nextLog, ...prev].slice(0, 100));
            })
            .subscribe();

        return () => {
            isMounted = false;
            void supabase.removeChannel(channel);
        };
    }, [isAuthenticated]);

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
                refetchApplications(),
                fetchAuditLogs()
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

    const normalizedAuditSearch = auditSearch.trim().toLowerCase();
    const filteredAuditLogs = auditLogs.filter((log) => {
        const roleMatches = auditRoleFilter === 'All' || log.actor_role === auditRoleFilter;
        if (!roleMatches) return false;
        if (!normalizedAuditSearch) return true;

        const haystack = [
            log.user_name,
            log.action,
            log.actor_role,
            log.actor_department,
            formatAuditDetails(log.details),
            log.entity_table,
            log.entity_id
        ].join(' ').toLowerCase();

        return haystack.includes(normalizedAuditSearch);
    });

    const careAuditCount = auditLogs.filter((log) => log.actor_role === 'Care Staff').length;
    const departmentAuditCount = auditLogs.filter((log) => log.actor_role === 'Department Head').length;
    const activeAuditDepartments = new Set(
        auditLogs
            .map((log) => String(log.actor_department || '').trim())
            .filter(Boolean)
    ).size;
    const linkedStaffAccountCount = accounts.filter((account: any) => Boolean(account.auth_user_id)).length;
    const adminAccountCount = accounts.filter((account: any) => String(account.role || '').trim() === 'Admin').length;
    const departmentHeadCount = accounts.filter((account: any) => String(account.role || '').trim() === 'Department Head').length;
    const careStaffCount = accounts.filter((account: any) => String(account.role || '').trim() === 'Care Staff').length;
    const totalCourseCount = coursesData.length;
    const heroStats = [
        { label: 'Staff Accounts', value: accounts.length, hint: `${linkedStaffAccountCount} linked to auth` },
        { label: 'Colleges', value: departmentsData.length, hint: `${totalCourseCount} courses assigned` },
        { label: 'Student Records', value: studentsData.length, hint: `${applicationsData.length} applications tracked` },
        { label: 'Tracked Staff Logs', value: auditLogs.length, hint: `${activeAuditDepartments} colleges active in audit` }
    ];
    const accountOverviewStats = [
        { label: 'Admins', value: adminAccountCount },
        { label: 'Department Heads', value: departmentHeadCount },
        { label: 'CARE Staff', value: careStaffCount },
        { label: 'Unlinked', value: unlinkedStaffAccountCount }
    ];
    const studentOverviewStats = [
        { label: 'Students', value: studentsData.length, tone: 'border-sky-200 bg-sky-50 text-sky-700' },
        { label: 'Linked Auth', value: linkedStudentCount, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
        { label: 'Needs Auth', value: authPendingStudentCount, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
        { label: 'Applications', value: applicationsData.length, tone: 'border-violet-200 bg-violet-50 text-violet-700' }
    ];
    const panelClass = 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur';
    const sectionHeaderIconClass = 'flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700';
    const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100';
    const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';
    const getStaffRoleBadgeClass = (role: string | null | undefined) => {
        if (role === 'Admin') return 'bg-rose-50 text-rose-700 ring-rose-200';
        if (role === 'Care Staff') return 'bg-sky-50 text-sky-700 ring-sky-200';
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    };
    const getStudentStatusBadgeClass = (status: string | null | undefined) => {
        if (status === 'Active') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
        if (status === 'Probation') return 'bg-amber-50 text-amber-700 ring-amber-200';
        return 'bg-slate-100 text-slate-600 ring-slate-200';
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b from-teal-50 via-sky-50 to-transparent" />
                <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

                <div className="page-transition relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                        <div className="bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#0f172a_0%,#134e4a_50%,#0f172a_100%)] p-6 sm:p-8">
                            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.25fr)_360px]">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                                        <Shield className="h-3.5 w-3.5" />
                                        Admin Control Room
                                    </div>
                                    <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Account Management</h1>
                                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">
                                        Manage staff accounts, monitor staff-only audit activity, and keep student access data clean from one admin workspace.
                                    </p>

                                    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {heroStats.map((stat) => (
                                            <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{stat.label}</p>
                                                <p className="mt-3 text-3xl font-semibold text-white">{stat.value}</p>
                                                <p className="mt-2 text-xs text-slate-300">{stat.hint}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">Operational Controls</p>
                                    <div className="mt-4 grid gap-3">
                                        <button
                                            onClick={handleRefreshData}
                                            disabled={isRefreshingData}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                                        </button>
                                        <button
                                            onClick={handleMigrateAuthEmails}
                                            disabled={isMigratingAuthEmails}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200/20 bg-teal-400/15 px-4 py-3 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/25 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <RefreshCw size={16} className={isMigratingAuthEmails ? 'animate-spin' : ''} />
                                            <span>{isMigratingAuthEmails ? 'Migrating Auth...' : 'Migrate Auth Emails'}</span>
                                        </button>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                        <button
                                            onClick={() => setShowResetModal(true)}
                                            disabled={loading}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                            {loading ? 'Working...' : 'Reset System'}
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>

                                    <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/20 p-4">
                                        <p className="text-sm font-semibold text-white">Keep this page for admin work only.</p>
                                        <p className="mt-2 text-xs leading-5 text-slate-300">
                                            The audit monitor below only tracks CARE Staff and Department Head activity. Student actions stay out of this feed.
                                        </p>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>

                    <div className="mt-6 mb-8">
                        <div className="mb-3 px-1">
                            <h2 className="text-lg font-semibold text-slate-900">Role-Based Alerts</h2>
                            <p className="mt-1 text-sm text-slate-500">Quick admin-only signals for access setup, linking, and cleanup.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            {adminAlerts.map((alert) => (
                                <div key={alert.label} className={`rounded-[24px] border p-5 shadow-sm shadow-slate-200/60 ${alert.tone}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{alert.label}</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{alert.value}</p>
                                        </div>
                                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-current opacity-70" />
                                    </div>
                                    <p className="mt-4 text-xs leading-5 opacity-90">{alert.hint}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[360px_minmax(0,1fr)]">
                        <div className={`${panelClass} h-fit`}>
                            <div className="border-b border-slate-200/80 p-6 sm:p-7">
                                <div className="flex items-start gap-4">
                                    <div className={sectionHeaderIconClass}>
                                        <UserPlus className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Create Staff Account</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            Provision a new admin-side login and link it directly to Supabase Auth.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-4 p-6 sm:p-7">
                                <div>
                                    <label className={labelClass}>Role</label>
                                    <select className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="Department Head">Department Head (Dean)</option>
                                        <option value="Care Staff">CARE Staff</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Full Name</label>
                                    <input required className={inputClass} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Username</label>
                                    <input required className={inputClass} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Password</label>
                                    <input required type="password" autoComplete="new-password" className={inputClass} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input required type="email" className={inputClass} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                </div>

                                {form.role === 'Department Head' && (
                                    <div>
                                        <label className={labelClass}>College</label>
                                        <select className={inputClass} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}>
                                            <option value="">Select College</option>
                                            {departments.map((departmentName) => (
                                                <option key={departmentName} value={departmentName}>{departmentName}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                                    New accounts are created as linked auth users immediately. Department Heads should always have a college assigned.
                                </div>

                                <button
                                    disabled={isCreatingAccount}
                                    className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isCreatingAccount ? 'Creating...' : 'Create Account'}
                                </button>
                            </form>
                        </div>

                        <div className={panelClass}>
                            <div className="border-b border-slate-200/80 p-6 sm:p-7">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="flex items-start gap-4">
                                            <div className={sectionHeaderIconClass}>
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold text-slate-900">Existing Accounts ({accounts.length})</h2>
                                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                                    If an account has no real email yet, add it here first, then run `Migrate Auth Emails` again.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {accountOverviewStats.map((stat) => (
                                            <div key={stat.label} className="min-w-[108px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                                                <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-[920px] w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Name</th>
                                            <th className="px-6 py-4 font-semibold">Role</th>
                                            <th className="px-6 py-4 font-semibold">Details</th>
                                            <th className="px-6 py-4 font-semibold">Username</th>
                                            <th className="px-6 py-4 font-semibold">Auth</th>
                                            <th className="px-6 py-4 text-right font-semibold">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-400">
                                                    No staff accounts found.
                                                </td>
                                            </tr>
                                        ) : accounts.map((acc: any) => (
                                            <tr key={acc.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                                                <td className="px-6 py-5">
                                                    <div className="font-semibold text-slate-900">{acc.full_name || 'Unnamed Staff'}</div>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {acc.created_at ? `Created ${new Date(acc.created_at).toLocaleDateString()}` : 'No creation date'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStaffRoleBadgeClass(acc.role)}`}>
                                                        {acc.role === 'Care Staff' ? 'CARE Staff' : acc.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-slate-500">
                                                    <div className="text-sm text-slate-600">{acc.department || 'No college assigned'}</div>
                                                    {acc.email ? (
                                                        <div className="mt-1 break-all text-xs text-slate-400">{acc.email}</div>
                                                    ) : (
                                                        <div className="mt-3 flex min-w-[260px] flex-col gap-2">
                                                            <input
                                                                type="email"
                                                                value={getAccountEmailDraft(acc)}
                                                                onChange={(e) => setEmailDrafts((prev) => ({
                                                                    ...prev,
                                                                    [String(acc.id)]: e.target.value
                                                                }))}
                                                                placeholder="Add real email"
                                                                className="w-full rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:border-teal-400 focus:bg-white focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveAccountEmail(acc)}
                                                                disabled={savingAccountEmailId === String(acc.id)}
                                                                className="inline-flex w-fit items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {savingAccountEmailId === String(acc.id) ? 'Saving...' : 'Save Email'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 font-mono text-xs text-slate-600">{acc.username || '-'}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${acc.auth_user_id ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                                                        {acc.auth_user_id ? 'Linked' : 'Unlinked'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        disabled={deletingAccountId === String(acc.id)}
                                                        onClick={() => handleDelete(acc)}
                                                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Trash2 className={`h-4 w-4 ${deletingAccountId === String(acc.id) ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        <div className={`${panelClass} h-fit`}>
                            <div className="border-b border-slate-200/80 p-6">
                                <div className="flex items-start gap-4">
                                    <div className={sectionHeaderIconClass}>
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Student Data</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">Prototype reset controls for student-facing records only.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowStudentResetModal(true)}
                                    disabled={loading}
                                    className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? 'Working...' : 'Reset Student Data'}
                                </button>
                            </div>

                            <div className="space-y-6 p-6">
                                <div className="grid grid-cols-2 gap-3">
                                    {studentOverviewStats.map((stat) => (
                                        <div key={stat.label} className={`rounded-2xl border p-4 ${stat.tone}`}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{stat.label}</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                                    <div className="flex items-center justify-between gap-4">
                                        <span>Active students</span>
                                        <span className="font-semibold text-slate-900">{activeStudentCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span>Probation students</span>
                                        <span className="font-semibold text-slate-900">{probationStudentCount}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <span>Linked auth cleanup required</span>
                                        <span className={`font-semibold ${linkedStudentCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                                            {linkedStudentCount > 0 ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={`lg:col-span-2 ${panelClass}`}>
                            <div className="border-b border-slate-200/80 p-6">
                                <div className="flex items-start gap-4">
                                    <div className={sectionHeaderIconClass}>
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Student Snapshot</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">Quick preview of current student records before a student-only reset.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[640px] text-left text-sm">
                                    <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Student</th>
                                            <th className="px-6 py-4 font-semibold">Student ID</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Auth</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentStudents.map((student: any) => (
                                            <tr key={student.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                                                <td className="px-6 py-5 font-medium text-slate-900">{formatStudentName(student)}</td>
                                                <td className="px-6 py-5 font-mono text-xs text-slate-600">{student.student_id || '-'}</td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStudentStatusBadgeClass(student.status)}`}>
                                                        {student.status || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${student.auth_user_id ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                                                        {student.auth_user_id ? 'Linked' : 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {recentStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                                                    No student records found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={`${panelClass} mt-8`}>
                        <div className="border-b border-slate-200/80 p-6 sm:p-7">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <div className="flex items-start gap-4">
                                        <div className={sectionHeaderIconClass}>
                                            <Activity className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-slate-900">Staff Audit Monitor</h2>
                                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                                Recent admin-facing activity from CARE Staff and Department Heads only. Student actions are excluded from this monitor.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                                <select
                                    value={auditRoleFilter}
                                    onChange={(e) => setAuditRoleFilter(e.target.value as 'All' | 'Care Staff' | 'Department Head')}
                                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                >
                                    <option value="All">All Staff Roles</option>
                                    <option value="Care Staff">CARE Staff</option>
                                    <option value="Department Head">Department Head</option>
                                </select>
                                <div className="relative sm:w-80">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={auditSearch}
                                        onChange={(e) => setAuditSearch(e.target.value)}
                                        placeholder="Search user, action, department..."
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">CARE Staff Actions</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{careAuditCount}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Department Actions</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{departmentAuditCount}</p>
                            </div>
                            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Active Colleges</p>
                                <p className="mt-3 text-3xl font-semibold text-slate-900">{activeAuditDepartments}</p>
                            </div>
                        </div>
                    </div>

                    <div className="max-h-[560px] overflow-auto">
                        <table className="min-w-[880px] w-full text-left text-sm">
                            <thead className="sticky top-0 border-b border-slate-200 bg-slate-50/95 text-[11px] uppercase tracking-[0.18em] text-slate-500 backdrop-blur">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Timestamp</th>
                                    <th className="px-6 py-4 font-semibold">Staff</th>
                                    <th className="px-6 py-4 font-semibold">Role</th>
                                    <th className="px-6 py-4 font-semibold">Action</th>
                                    <th className="px-6 py-4 font-semibold">Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">Loading staff audit logs...</td>
                                    </tr>
                                ) : filteredAuditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">No matching staff audit activity found.</td>
                                    </tr>
                                ) : (
                                    filteredAuditLogs.map((log) => (
                                        <tr key={log.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/70">
                                            <td className="px-6 py-5 font-mono text-xs text-slate-500">
                                                {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-semibold text-slate-900">{log.user_name || '-'}</div>
                                                <div className="mt-1 text-xs text-slate-400">{log.actor_department || 'No college assigned'}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                                                    log.actor_role === 'Care Staff'
                                                        ? 'bg-sky-50 text-sky-700 ring-sky-200'
                                                        : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                }`}>
                                                    {log.actor_role || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="font-medium text-slate-800">{log.action || '-'}</div>
                                                {(log.entity_table || log.entity_id) && (
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {String(log.entity_table || '').trim() || 'record'}
                                                        {log.entity_id ? ` - ${log.entity_id}` : ''}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 leading-6 text-slate-600">{formatAuditDetails(log.details)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Department Management */}
                    <div className={`${panelClass} mt-8`}>
                        <div className="border-b border-slate-200/80 p-6 sm:p-7">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="flex items-start gap-4">
                                    <div className={sectionHeaderIconClass}>
                                        <Building2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-semibold text-slate-900">Colleges ({departmentsData.length})</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-500">
                                            Maintain department names and monitor whether each college still has active course mappings.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid w-full gap-3 lg:w-[360px]">
                                    <input disabled={isAddingDepartment} className={inputClass} placeholder="New college name..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()} />
                                    <button disabled={isAddingDepartment} onClick={handleAddDepartment} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><Plus className={`h-4 w-4 ${isAddingDepartment ? 'animate-spin' : ''}`} /> {isAddingDepartment ? 'Adding...' : 'Add College'}</button>
                                </div>
                            </div>
                    </div>
                        <div className="space-y-6 p-6 sm:p-7">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Total Colleges</p>
                                    <p className="mt-3 text-3xl font-semibold text-slate-900">{departmentsData.length}</p>
                                </div>
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Mapped Courses</p>
                                    <p className="mt-3 text-3xl font-semibold text-slate-900">{totalCourseCount}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {departmentsData.length === 0 && <p className="text-sm text-slate-400">No colleges yet. Add one above.</p>}
                                {departmentsData.map((dept: any) => {
                                    const linkedCourseCount = getDepartmentCourses(dept.id).length;

                                    return (
                                        <span key={dept.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
                                            {dept.name}
                                            {linkedCourseCount > 0 && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                    {linkedCourseCount} course{linkedCourseCount === 1 ? '' : 's'}
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleDeleteDepartment(dept)}
                                                disabled={deletingDepartmentId === String(dept.id)}
                                                className="text-rose-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                title={linkedCourseCount > 0
                                                    ? `Delete blocked: ${linkedCourseCount} course(s) still assigned`
                                                    : `Delete ${dept.name}`
                                                }
                                            >
                                                <Trash2 className={`h-3.5 w-3.5 ${deletingDepartmentId === String(dept.id) ? 'animate-spin' : ''}`} />
                                            </button>
                                        </span>
                                    );
                                })}
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
        </div>
    );
}
