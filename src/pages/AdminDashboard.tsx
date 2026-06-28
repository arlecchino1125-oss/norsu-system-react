import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { formatAuditDetails, isTrackedStaffAuditRole, type StaffAuditLogRow } from '../lib/staffAudit';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { Archive, AlertTriangle, AlertCircle, CheckCircle, Plus, RefreshCw, Shield, LogOut, UserPlus, Building2, Users, Activity, Search, KeyRound, Maximize2, X, User } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { getValidProfileImageUrl } from '../utils/formatters';
import { getSafeErrorMessage } from '../utils/errorMasking';

const STAFF_ACCOUNT_SELECT = '*';
const ADMIN_PANEL_ORDER = ['alerts', 'staffAccounts', 'studentOverview', 'governance', 'audit', 'colleges'] as const;
const STAFF_ACCOUNT_PAGE_SIZE = 10;
const AUDIT_PAGE_SIZE = 25;
const AUDIT_SEARCH_DEBOUNCE_MS = 280;
const TRACKED_ADMIN_AUDIT_ROLES = ['Care Staff', 'Department Head'] as const;

type AdminPanelKey = typeof ADMIN_PANEL_ORDER[number];
type AuditRoleFilter = 'All' | (typeof TRACKED_ADMIN_AUDIT_ROLES)[number];

const sanitizeAuditSearchTerm = (value: string) =>
    String(value || '').replace(/[%(),'"]/g, ' ').trim();

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const [loading, setLoading] = useState<boolean>(false);
    const [isCreatingAccount, setIsCreatingAccount] = useState<boolean>(false);
    const [form, setForm] = useState<any>({ username: '', password: '', full_name: '', role: 'Department Head', department: '', email: '' });
    const [toast, setToast] = useState<any>(null);
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [newDeptName, setNewDeptName] = useState<string>('');
    const [isRefreshingData, setIsRefreshingData] = useState<boolean>(false);
    const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
    const [savingAccountEmailId, setSavingAccountEmailId] = useState<string | null>(null);
    const [archivingAccountId, setArchivingAccountId] = useState<string | null>(null);
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [archivingDepartmentId, setArchivingDepartmentId] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<StaffAuditLogRow[]>([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditRoleFilter, setAuditRoleFilter] = useState<AuditRoleFilter>('All');
    const [auditSearch, setAuditSearch] = useState('');
    const [debouncedAuditSearch, setDebouncedAuditSearch] = useState('');
    const [auditTotalCount, setAuditTotalCount] = useState(0);
    const [auditPage, setAuditPage] = useState(1);
    const [staffAccountsPage, setStaffAccountsPage] = useState(1);
    const [activePanelModal, setActivePanelModal] = useState<AdminPanelKey | null>(null);
    const [showIdSwapModal, setShowIdSwapModal] = useState<boolean>(false);
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [isSwappingIds, setIsSwappingIds] = useState<boolean>(false);
    const [sourceStudent, setSourceStudent] = useState<any | null>(null);
    const [targetStudent, setTargetStudent] = useState<any | null>(null);
    const [sourceLoading, setSourceLoading] = useState<boolean>(false);
    const [targetLoading, setTargetLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!showIdSwapModal) {
            setSourceStudent(null);
            setTargetStudent(null);
            setSourceLoading(false);
            setTargetLoading(false);
            return;
        }

        const fetchSource = async () => {
            const trimmed = sourceId.trim();
            if (!trimmed) {
                setSourceStudent(null);
                return;
            }
            setSourceLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setSourceStudent(data);
            } catch (err) {
                console.error(err);
                setSourceStudent(null);
            } finally {
                setSourceLoading(false);
            }
        };

        const timer = setTimeout(fetchSource, 250);
        return () => clearTimeout(timer);
    }, [sourceId, showIdSwapModal]);

    useEffect(() => {
        if (!showIdSwapModal) {
            setSourceStudent(null);
            setTargetStudent(null);
            setSourceLoading(false);
            setTargetLoading(false);
            return;
        }

        const fetchTarget = async () => {
            const trimmed = targetId.trim();
            if (!trimmed) {
                setTargetStudent(null);
                return;
            }
            setTargetLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setTargetStudent(data);
            } catch (err) {
                console.error(err);
                setTargetStudent(null);
            } finally {
                setTargetLoading(false);
            }
        };

        const timer = setTimeout(fetchTarget, 250);
        return () => clearTimeout(timer);
    }, [targetId, showIdSwapModal]);

    // Use custom hook for real-time data fetching
    const { data: accountRows, refetch: refetchAccounts } = useSupabaseData({
        table: 'staff_accounts',
        select: STAFF_ACCOUNT_SELECT,
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });
    const accounts = accountRows.filter((account: any) => !account?.is_archived);

    const { data: departmentRows, refetch: refetchDepartments } = useSupabaseData({
        table: 'departments',
        select: '*',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const departmentsData = departmentRows.filter((department: any) => !department?.is_archived);
    const { data: coursesData, refetch: refetchCourses } = useSupabaseData({
        table: 'courses',
        select: 'id, name, department_id',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const { data: studentsData, refetch: refetchStudents } = useSupabaseData({
        table: 'students',
        select: 'id, student_id, first_name, last_name, status, auth_user_id',
        subscribe: true,
        fetchAll: true
    });
    const { data: applicationsData, refetch: refetchApplications } = useSupabaseData({
        table: 'applications',
        select: 'id, first_name, last_name, status',
        subscribe: true
    });
    const departments = departmentsData.map(d => d.name);
    const linkedStudentCount = studentsData.filter((student: any) => Boolean(student.auth_user_id)).length;
    const authPendingStudentCount = studentsData.length - linkedStudentCount;
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
            hint: staffAccountsMissingEmailCount > 0 ? 'Add a valid email to complete these records' : 'Email records look complete',
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
    const getAccountEmailDraft = (account: any) =>
        emailDrafts[String(account.id)] ?? String(account.email || '');

    const getDepartmentCourses = (departmentId: number | string) => {
        const normalizedDepartmentId = Number(departmentId);
        return coursesData.filter((course: any) => Number(course.department_id) === normalizedDepartmentId);
    };

    const showToast = React.useCallback((msg: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(msg) : msg;
        setToast({ msg: safeMessage, type });
        window.setTimeout(() => setToast(null), 3000);
    }, []);

    const fetchAuditLogs = React.useCallback(async () => {
        setAuditLoading(true);

        try {
            const normalizedSearch = sanitizeAuditSearchTerm(debouncedAuditSearch);
            const from = (auditPage - 1) * AUDIT_PAGE_SIZE;
            const to = from + AUDIT_PAGE_SIZE - 1;

            let query: any = supabase
                .from('audit_logs')
                .select('id, created_at, user_name, action, details, actor_role, actor_department, entity_table, entity_id', { count: 'exact' });

            if (auditRoleFilter === 'All') {
                query = query.in('actor_role', [...TRACKED_ADMIN_AUDIT_ROLES]);
            } else {
                query = query.eq('actor_role', auditRoleFilter);
            }

            if (normalizedSearch) {
                const safeSearch = normalizedSearch.replace(/\s+/g, ' ');
                query = query.or([
                    `user_name.ilike.%${safeSearch}%`,
                    `action.ilike.%${safeSearch}%`,
                    `actor_department.ilike.%${safeSearch}%`,
                    `entity_table.ilike.%${safeSearch}%`,
                    `entity_id.ilike.%${safeSearch}%`,
                    `details->>summary.ilike.%${safeSearch}%`
                ].join(','));
            }

            const { data, error, count } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            setAuditLogs((data || []) as StaffAuditLogRow[]);
            setAuditTotalCount(count || 0);
        } catch (error: any) {
            console.error('Failed to load staff audit logs:', error);
            showToast('Failed to load staff audit logs.', 'error');
            setAuditLogs([]);
            setAuditTotalCount(0);
        } finally {
            setAuditLoading(false);
        }
    }, [auditPage, auditRoleFilter, debouncedAuditSearch, showToast]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/admin');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedAuditSearch(auditSearch);
        }, AUDIT_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [auditSearch]);

    useEffect(() => {
        setAuditPage(1);
    }, [auditRoleFilter, debouncedAuditSearch]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(accounts.length / STAFF_ACCOUNT_PAGE_SIZE));
        if (staffAccountsPage > totalPages) {
            setStaffAccountsPage(totalPages);
        }
    }, [accounts.length, staffAccountsPage]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(auditTotalCount / AUDIT_PAGE_SIZE));
        if (auditPage > totalPages) {
            setAuditPage(totalPages);
        }
    }, [auditPage, auditTotalCount]);

    useEffect(() => {
        if (!isAuthenticated) {
            setAuditLogs([]);
            setAuditLoading(false);
            setAuditTotalCount(0);
            return;
        }

        let isMounted = true;
        void fetchAuditLogs();

        const channel = supabase
            .channel('admin_staff_audit_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
                const nextLog = payload.new as StaffAuditLogRow;
                if (!isMounted || !isTrackedStaffAuditRole(nextLog?.actor_role)) return;
                void fetchAuditLogs();
            })
            .subscribe();

        return () => {
            isMounted = false;
            void supabase.removeChannel(channel);
        };
    }, [fetchAuditLogs, isAuthenticated]);

    useEffect(() => {
        if (!activePanelModal || typeof window === 'undefined') {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setActivePanelModal(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [activePanelModal]);

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

    const getArchiveSchemaErrorMessage = (error: any, fallback: string) => {
        const message = String(error || '');
        const normalized = message.toLowerCase();
        const mentionsArchiveColumn = normalized.includes('is_archived')
            || normalized.includes('archived_at')
            || normalized.includes('archive_note');
        const looksLikeMissingColumn = normalized.includes('schema cache')
            || normalized.includes('column')
            || normalized.includes('does not exist');

        if (mentionsArchiveColumn && looksLikeMissingColumn) {
            return "This feature isn't available yet.";
        }

        return message || fallback;
    };

    const invokeManagedStaffFunction = async (body: any) => {
        return invokeEdgeFunction('manage-staff-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage staff account.'
        });
    };

    const invokeManagedStudentFunction = async (body: any) => {
        return invokeEdgeFunction('manage-student-accounts', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your admin session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage student accounts.'
        });
    };

    const handleSwapIds = async (e: React.FormEvent) => {
        e.preventDefault();
        const src = sourceId.trim();
        const dest = targetId.trim();
        if (!src || !dest) {
            showToast('Both Source and Target Student IDs are required.', 'error');
            return;
        }
        if (src === dest) {
            showToast('Source and Target Student IDs must be different.', 'error');
            return;
        }

        setIsSwappingIds(true);
        try {
            const result = await invokeManagedStudentFunction({
                mode: 'swap-student-ids',
                sourceStudentId: src,
                targetStudentId: dest
            });
            showToast(result?.message || 'Student IDs updated successfully.');
            setShowIdSwapModal(false);
            setSourceId('');
            setTargetId('');
            setSourceStudent(null);
            setTargetStudent(null);
            void handleRefreshData();
        } catch (error: any) {
            showToast('Failed to update student IDs.', 'error');
        } finally {
            setIsSwappingIds(false);
        }
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
                non2xxMessage: 'Your admin session could not be verified. Sign in again.',
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
            if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                showToast(error.message || 'Failed to create account.', 'error');
                setIsCreatingAccount(false);
                return;
            }

            showToast(
                "We couldn't create the account. This feature isn't available yet.",
                'error'
            );
        } finally {
            setIsCreatingAccount(false);
        }
    };

    const handleArchiveAccount = async (account: any) => {
        const nextAccountId = String(account?.id || '').trim();
        if (!nextAccountId || archivingAccountId === nextAccountId) return;

        const currentSessionId = String(session?.id || '').trim();
        const currentAuthUserId = String(session?.auth_user_id || session?.user?.id || '').trim();
        if (
            (currentSessionId && String(account.id) === currentSessionId)
            || (currentAuthUserId && String(account.auth_user_id || '') === currentAuthUserId)
        ) {
            showToast('You cannot archive the account you are currently using.', 'error');
            return;
        }

        const accountLabel = String(account.full_name || account.username || 'this staff account').trim();
        if (!confirm(`Archive ${accountLabel}? The record stays saved, but it will be removed from active staff account lists and blocked from login.`)) return;
        setArchivingAccountId(nextAccountId);

        try {
            const { error } = await supabase
                .from('staff_accounts')
                .update({
                    is_archived: true,
                    archived_at: new Date().toISOString(),
                    archive_note: 'Archived from the admin dashboard.'
                })
                .eq('id', nextAccountId);

            if (error) throw error;

            showToast(`Staff account "${accountLabel}" archived.`);
            await refetchAccounts();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, 'Failed to archive staff account.'), 'error');
        } finally {
            setArchivingAccountId(null);
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
                    if (isFunctionUnavailableError('', error?.status, error?.errorName)) {
                        showToast("Couldn't reset the system. This feature isn't available yet.", 'error');
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
                    if (isFunctionUnavailableError('', error?.status, error?.errorName)) {
                        showToast("Couldn't reset the system. This feature isn't available yet.", 'error');
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
                if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                    throw error;
                }

                if ((linkedStudentCount || 0) > 0) {
                    throw new Error("Reset blocked: This feature isn't available yet linked students.");
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
                if (!isFunctionUnavailableError('', error?.status, error?.errorName)) {
                    throw error;
                }

                const { error: staffError } = await supabase
                    .from('staff_accounts')
                    .delete()
                    .neq('id', session.id);

                if (staffError) throw staffError;
            }

            showToast("System reset. All data wiped.");
            refetchAccounts();
        } catch (err: any) {
            showToast("Couldn't reset system. ", 'error');
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
            const { data: existingDepartment, error: existingLookupError } = await supabase
                .from('departments')
                .select('*')
                .eq('name', name)
                .maybeSingle();

            if (existingLookupError) throw existingLookupError;

            if (existingDepartment?.id && existingDepartment?.is_archived) {
                const { error: restoreError } = await supabase
                    .from('departments')
                    .update({
                        is_archived: false,
                        archived_at: null,
                        archive_note: null
                    })
                    .eq('id', existingDepartment.id);

                if (restoreError) throw restoreError;

                showToast(`College "${name}" restored from archives.`);
                setNewDeptName('');
                refetchDepartments();
                return;
            }

            if (existingDepartment?.id) {
                showToast('College already exists.', 'error');
                return;
            }

            const { error } = await supabase.from('departments').insert([{ name }]);
            if (error) throw error;

            showToast(`College "${name}" added.`);
            setNewDeptName('');
            refetchDepartments();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, "Couldn't save college."), 'error');
        } finally {
            setIsAddingDepartment(false);
        }
    };

    const handleArchiveDepartment = async (dept: any) => {
        const nextDepartmentId = String(dept?.id || '').trim();
        if (!nextDepartmentId || archivingDepartmentId === nextDepartmentId) return;
        const linkedCourses = getDepartmentCourses(dept.id);
        const linkedCourseText = linkedCourses.length > 0
            ? ` ${linkedCourses.length} mapped course(s) will stay saved with this college for history.`
            : '';

        if (!confirm(`Archive college "${dept.name}"? It will be hidden from active college lists, but no accounts, students, or courses will be deleted.${linkedCourseText}`)) return;
        setArchivingDepartmentId(nextDepartmentId);
        try {
            const { error } = await supabase
                .from('departments')
                .update({
                    is_archived: true,
                    archived_at: new Date().toISOString(),
                    archive_note: 'Archived from the admin dashboard.'
                })
                .eq('id', nextDepartmentId);

            if (error) throw error;

            showToast(`College "${dept.name}" archived.`);
            await refetchDepartments();
        } catch (error: any) {
            showToast(getArchiveSchemaErrorMessage(error, "Couldn't archive college."), 'error');
        } finally {
            setArchivingDepartmentId(null);
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
            showToast("Couldn't refresh admin data.", 'error');
        } finally {
            setIsRefreshingData(false);
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
            showToast("Couldn't save email.", 'error');
        } finally {
            setSavingAccountEmailId(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/admin');
    };

    const staffAccountPageCount = Math.max(1, Math.ceil(accounts.length / STAFF_ACCOUNT_PAGE_SIZE));
    const visibleStaffAccountStart = accounts.length === 0
        ? 0
        : ((staffAccountsPage - 1) * STAFF_ACCOUNT_PAGE_SIZE) + 1;
    const visibleStaffAccountEnd = Math.min(accounts.length, staffAccountsPage * STAFF_ACCOUNT_PAGE_SIZE);
    const paginatedAccounts = accounts.slice(
        (staffAccountsPage - 1) * STAFF_ACCOUNT_PAGE_SIZE,
        staffAccountsPage * STAFF_ACCOUNT_PAGE_SIZE
    );

    const auditPageCount = Math.max(1, Math.ceil(auditTotalCount / AUDIT_PAGE_SIZE));
    const visibleAuditStart = auditTotalCount === 0 ? 0 : ((auditPage - 1) * AUDIT_PAGE_SIZE) + 1;
    const visibleAuditEnd = Math.min(auditTotalCount, auditPage * AUDIT_PAGE_SIZE);
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
    const registrarCount = accounts.filter((account: any) => String(account.role || '').trim() === 'Registrar').length;
    const totalCourseCount = coursesData.length;
    const heroStats = [
        { label: 'Staff Accounts', value: accounts.length, hint: `${linkedStaffAccountCount} linked to auth` },
        { label: 'Colleges', value: departmentsData.length, hint: `${totalCourseCount} courses assigned` },
        { label: 'Student Records', value: studentsData.length, hint: `${applicationsData.length} applications tracked` },
        { label: 'Tracked Staff Logs', value: auditTotalCount, hint: `${activeAuditDepartments} colleges visible on this page` }
    ];
    const accountOverviewStats = [
        { label: 'Admins', value: adminAccountCount },
        { label: 'Department Heads', value: departmentHeadCount },
        { label: 'CARE Staff', value: careStaffCount },
        { label: 'Registrars', value: registrarCount },
        { label: 'Unlinked', value: unlinkedStaffAccountCount }
    ];
    const activeStudentCount = studentsData.filter((student: any) => String(student.status || '').trim() === 'Active').length;
    const probationStudentCount = studentsData.filter((student: any) => String(student.status || '').trim() === 'Probation').length;
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
        if (role === 'Registrar') return 'bg-teal-50 text-teal-700 ring-teal-200';
        return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    };
    const renderExpandablePanel = ({
        panelKey,
        title,
        description,
        icon,
        badge,
        children,
        className = '',
        bodyClassName,
        headerActions
    }: {
        panelKey: AdminPanelKey;
        title: string;
        description: string;
        icon: React.ReactNode;
        badge?: string;
        children: React.ReactNode;
        className?: string;
        bodyClassName?: string;
        headerActions?: React.ReactNode;
    }) => {
        const isOpen = activePanelModal === panelKey;
        const modalBodyClassName = bodyClassName === undefined ? 'p-6 sm:p-7' : bodyClassName;

        return (
            <>
                <div className={`${panelClass} ${className}`.trim()}>
                    <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <button
                                type="button"
                                onClick={() => setActivePanelModal(panelKey)}
                                className="flex min-w-0 flex-1 items-start gap-4 text-left"
                            >
                                <div className={`${sectionHeaderIconClass} transition-transform duration-200 ${isOpen ? 'scale-100 border-teal-200 bg-teal-50 text-teal-700' : 'scale-95'}`}>
                                    {icon}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                                        {badge && (
                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                {badge}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                                </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-3">
                                {headerActions}
                                <button
                                    type="button"
                                    onClick={() => setActivePanelModal(panelKey)}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                >
                                    <Maximize2 className="h-4 w-4" />
                                    <span>Open</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isOpen && typeof document !== 'undefined' && createPortal(
                    <div
                        className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl shadow-slate-300/60"
                        style={{
                            top: 'clamp(1rem, 7vh, 5.5rem)',
                            width: 'min(94vw, 1280px)',
                            height: 'min(82vh, 820px)'
                        }}
                        role="dialog"
                        aria-labelledby={`${panelKey}-modal-title`}
                    >
                            <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="flex min-w-0 items-start gap-4">
                                        <div className={`${sectionHeaderIconClass} border-teal-200 bg-teal-50 text-teal-700`}>
                                            {icon}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h2 id={`${panelKey}-modal-title`} className="text-xl font-semibold text-slate-900">{title}</h2>
                                                {badge && (
                                                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                                        {badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setActivePanelModal(null)}
                                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 lg:shrink-0"
                                        aria-label={`Close ${title}`}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            <div className={`min-h-0 flex-1 overflow-y-auto ${modalBodyClassName}`.trim()}>
                                {children}
                            </div>
                    </div>,
                    document.body
                )}
            </>
        );
    };

    if (!session) return null;

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-gradient-to-b from-teal-50 via-sky-50 to-transparent" />
                <div className="pointer-events-none absolute -left-16 top-8 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />

                <div className="page-transition relative mx-auto w-full max-w-[1760px] px-4 py-5 sm:px-6 xl:px-8 2xl:px-10">
                    <div className="overflow-hidden rounded-[24px] border border-slate-900/10 bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                        <div className="bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#0f172a_0%,#134e4a_50%,#0f172a_100%)] p-4 sm:p-5">
                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.85fr)_290px]">
                                <div>
                                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                        <div className="min-w-0 max-w-xl">
                                            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">
                                                <Shield className="h-3.5 w-3.5" />
                                                Admin Control Room
                                            </div>
                                            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">Account Management</h1>
                                            <p className="mt-1.5 text-sm leading-6 text-slate-200">
                                                Manage staff access, monitor cross-role activity, and keep institution-wide setup healthy from one admin workspace.
                                            </p>
                                        </div>

                                        <div className="w-full rounded-[20px] border border-white/10 bg-white/10 p-3 backdrop-blur xl:max-w-[340px]">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Section Modals</p>
                                                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                                                        Open each admin section in a floating workspace.
                                                    </p>
                                                </div>
                                                <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                                                    {activePanelModal ? '1 open' : 'Ready'}
                                                </span>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-300">
                                                <span>Page stays compact while details open on top.</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setActivePanelModal(null)}
                                                    disabled={!activePanelModal}
                                                    className="font-semibold text-white transition hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Close Modal
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                                        {heroStats.map((stat) => (
                                            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">{stat.label}</p>
                                                <p className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">{stat.value}</p>
                                                <p className="mt-1 text-[11px] text-slate-300">{stat.hint}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-[22px] border border-white/10 bg-white/10 p-3.5 backdrop-blur">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">Operational Controls</p>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                                        <button
                                            onClick={handleRefreshData}
                                            disabled={isRefreshingData}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />
                                            <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                                        </button>
                                        <button
                                            onClick={() => navigate('/admin/permissions')}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                                        >
                                            <KeyRound size={16} />
                                            <span>Role Permissions</span>
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 sm:col-span-2 xl:col-span-1"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>

                    <div className="mt-6 mb-8">
                        {renderExpandablePanel({
                            panelKey: 'alerts',
                            title: 'Role-Based Alerts',
                            description: 'Quick admin-only signals for access setup, linking, and cleanup.',
                            icon: <AlertCircle className="h-5 w-5" />,
                            badge: `${adminAlerts.length} cards`,
                            bodyClassName: 'p-6 sm:p-7',
                            children: (
                                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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
                            )
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-8">
                        {renderExpandablePanel({
                            panelKey: 'staffAccounts',
                            title: `Staff Accounts (${accounts.length})`,
                            description: 'Create staff logins and manage existing accounts in one place.',
                            icon: <UserPlus className="h-5 w-5" />,
                            badge: `${accounts.length} accounts`,
                            className: 'min-w-0',
                            bodyClassName: 'p-5 sm:p-6',
                            headerActions: (
                                <div className="flex flex-wrap gap-2">
                                    {accountOverviewStats.map((stat) => (
                                        <div key={stat.label} className="min-w-[92px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{stat.label}</p>
                                            <p className="mt-0.5 text-xl font-semibold text-slate-900">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            ),
                            children: (
                                <div className="space-y-5">
                                    <form onSubmit={handleCreate} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <div>
                                                <label className={labelClass}>Role</label>
                                                <select className={inputClass} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                                    <option value="Department Head">Department Head (Dean)</option>
                                                    <option value="Care Staff">CARE Staff</option>
                                                    <option value="Registrar">Registrar</option>
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
                                        </div>
                                        <button
                                            disabled={isCreatingAccount}
                                            className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isCreatingAccount ? 'Creating...' : 'Create Staff Account'}
                                        </button>
                                    </form>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Existing Accounts</h3>
                                            <span className="text-sm font-semibold text-slate-700">{accounts.length} total</span>
                                        </div>

                                        {accounts.length === 0 ? (
                                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                                                No staff accounts found.
                                            </div>
                                        ) : paginatedAccounts.map((acc: any) => (
                                            <div key={acc.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h4 className="font-semibold text-slate-900">{acc.full_name || 'Unnamed Staff'}</h4>
                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getStaffRoleBadgeClass(acc.role)}`}>
                                                                {acc.role === 'Care Staff' ? 'CARE Staff' : acc.role}
                                                            </span>
                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${acc.auth_user_id ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}>
                                                                {acc.auth_user_id ? 'Linked' : 'Unlinked'}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {acc.username || 'No username'} - {acc.department || 'No college'}
                                                        </p>
                                                        {acc.email ? (
                                                            <p className="mt-1 break-all text-xs text-slate-400">{acc.email}</p>
                                                        ) : (
                                                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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
                                                                    className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                                >
                                                                    {savingAccountEmailId === String(acc.id) ? 'Saving...' : 'Save Email'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button
                                                        disabled={archivingAccountId === String(acc.id)}
                                                        onClick={() => handleArchiveAccount(acc)}
                                                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200 text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        title={`Archive ${acc.full_name || acc.username || 'staff account'}`}
                                                    >
                                                        <Archive className={`h-4 w-4 ${archivingAccountId === String(acc.id) ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {accounts.length > 0 && (
                                        <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 text-sm text-slate-500 xl:flex-row xl:items-center xl:justify-between">
                                            <p>
                                                Showing <span className="font-semibold text-slate-700">{visibleStaffAccountStart}</span> to <span className="font-semibold text-slate-700">{visibleStaffAccountEnd}</span> of <span className="font-semibold text-slate-700">{accounts.length}</span> staff accounts
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffAccountsPage((prev) => Math.max(1, prev - 1))}
                                                    disabled={staffAccountsPage === 1}
                                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Previous
                                                </button>
                                                <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                                                    Page {staffAccountsPage} of {staffAccountPageCount}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffAccountsPage((prev) => Math.min(staffAccountPageCount, prev + 1))}
                                                    disabled={staffAccountsPage >= staffAccountPageCount}
                                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
                        {renderExpandablePanel({
                            panelKey: 'studentOverview',
                            title: 'Student Access Overview',
                            description: 'Read-only student totals stay visible here for global health checks. Row-level student work and destructive student-data controls now live with CARE Staff.',
                            icon: <Users className="h-5 w-5" />,
                            badge: `${studentsData.length} records`,
                            className: 'h-fit',
                            bodyClassName: 'p-6',
                            children: (
                                <div className="space-y-6">
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

                                    <button
                                        type="button"
                                        onClick={() => setShowIdSwapModal(true)}
                                        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                        <span>Rename / Swap Student IDs</span>
                                    </button>
                                </div>
                            )
                        })}

                        {renderExpandablePanel({
                            panelKey: 'governance',
                            title: 'Governance Boundaries',
                            description: 'Admin stays responsible for institution-wide governance. Operational student workflows stay with the roles that own those domains day to day.',
                            icon: <Shield className="h-5 w-5" />,
                            badge: 'Role map',
                            className: 'lg:col-span-2',
                            bodyClassName: '',
                            children: (
                                <>
                                    <div className="grid gap-4 p-6 md:grid-cols-3">
                                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Admin Owns</p>
                                            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                                                <li>Staff account creation, archiving, and role assignment</li>
                                                <li>College and department master-data setup</li>
                                                <li>Email record cleanup and institution-wide maintenance tasks</li>
                                                <li>Cross-role audit monitoring and institution-wide alerts</li>
                                            </ul>
                                        </div>
                                        <div className="rounded-3xl border border-sky-200 bg-sky-50 p-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">CARE Staff Owns</p>
                                            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                                                <li>Student population, NAT, activation policy, and student-service workflows</li>
                                                <li>Restricted student-data reset controls inside advanced settings</li>
                                                <li>OTP-protected destructive actions with reason capture and audit logs</li>
                                                <li>Operational case handling instead of institution-wide governance</li>
                                            </ul>
                                        </div>
                                        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Department Heads Own</p>
                                            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                                                <li>Admissions and department-level student follow-up</li>
                                                <li>First-line counseling and support workflows inside their college</li>
                                                <li>Operational reporting for their assigned programs</li>
                                                <li>Not the institution-wide list of colleges or admin maintenance tools</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-200/80 bg-slate-50/70 px-6 py-5 text-sm leading-6 text-slate-600">
                                        Student reset controls have moved out of admin and into CARE Staff advanced controls, where they are hidden behind OTP verification, typed confirmation, a written reason, and staff audit logging.
                                    </div>
                                </>
                            )
                        })}
                    </div>

                    <div className="mt-8">
                        {renderExpandablePanel({
                            panelKey: 'audit',
                            title: 'Staff Audit Monitor',
                            description: 'Recent admin-facing activity from CARE Staff and Department Heads only. Student actions are excluded from this monitor.',
                            icon: <Activity className="h-5 w-5" />,
                            badge: `${auditTotalCount} logs`,
                            bodyClassName: '',
                            headerActions: (
                                <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                                    <select
                                        value={auditRoleFilter}
                                        onChange={(e) => setAuditRoleFilter(e.target.value as AuditRoleFilter)}
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
                            ),
                            children: (
                                <>
                                    <div className="grid gap-4 p-6 md:grid-cols-3">
                                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Visible CARE Actions</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{careAuditCount}</p>
                                        </div>
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Visible Department Actions</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{departmentAuditCount}</p>
                                        </div>
                                        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Colleges On Page</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{activeAuditDepartments}</p>
                                        </div>
                                    </div>

                                    <div className="max-h-[560px] overflow-auto border-t border-slate-200/80">
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
                                                ) : auditLogs.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">No matching staff audit activity found.</td>
                                                    </tr>
                                                ) : (
                                                    auditLogs.map((log) => (
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

                                    <div className="flex flex-col gap-4 border-t border-slate-200/80 bg-slate-50/70 px-6 py-4 text-sm text-slate-500 xl:flex-row xl:items-center xl:justify-between">
                                        <div className="space-y-1">
                                            <p>
                                                Showing <span className="font-semibold text-slate-700">{visibleAuditStart}</span> to <span className="font-semibold text-slate-700">{visibleAuditEnd}</span> of <span className="font-semibold text-slate-700">{auditTotalCount}</span> matching audit logs
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                Search and role filters now run on the server, so older matches are included even when the table grows past 100 records.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                                            <button
                                                type="button"
                                                onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                                                disabled={auditPage === 1 || auditLoading}
                                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            <span className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700">
                                                Page {auditPage} of {auditPageCount}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setAuditPage((prev) => Math.min(auditPageCount, prev + 1))}
                                                disabled={auditPage >= auditPageCount || auditLoading}
                                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )
                        })}
                    </div>

                    <div className="mt-8">
                        {renderExpandablePanel({
                            panelKey: 'colleges',
                            title: `Colleges (${departmentsData.length})`,
                            description: 'Maintain department names and monitor whether each college still has active course mappings.',
                            icon: <Building2 className="h-5 w-5" />,
                            badge: `${departmentsData.length} colleges`,
                            bodyClassName: 'space-y-6 p-6 sm:p-7',
                            headerActions: (
                                <div className="grid w-full gap-3 lg:w-[360px]">
                                    <input disabled={isAddingDepartment} className={inputClass} placeholder="New college name..." value={newDeptName} onChange={e => setNewDeptName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddDepartment()} />
                                    <button disabled={isAddingDepartment} onClick={handleAddDepartment} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"><Plus className={`h-4 w-4 ${isAddingDepartment ? 'animate-spin' : ''}`} /> {isAddingDepartment ? 'Adding...' : 'Add College'}</button>
                                </div>
                            ),
                            children: (
                                <>
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
                                                        onClick={() => handleArchiveDepartment(dept)}
                                                        disabled={archivingDepartmentId === String(dept.id)}
                                                        className="text-amber-500 transition hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                                                        title={`Archive ${dept.name}${linkedCourseCount > 0 ? ` (${linkedCourseCount} mapped course${linkedCourseCount === 1 ? '' : 's'} stay saved)` : ''}`}
                                                    >
                                                        <Archive className={`h-3.5 w-3.5 ${archivingDepartmentId === String(dept.id) ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                </>
                            )
                        })}
                    </div>

                {toast && (
                    <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl text-white flex items-center gap-3 animate-slide-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                        <div className="text-xl">{toast.type === 'error' ? <AlertCircle /> : <CheckCircle />}</div>
                        <div><h4 className="font-bold text-sm">{toast.type === 'error' ? 'Error' : 'Success'}</h4><p className="text-xs opacity-90">{toast.msg}</p></div>
                    </div>
                )}

                {showResetModal && (
                    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
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

                {showIdSwapModal && (
                    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-slide-in-up border border-slate-200/80">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5 text-teal-600" />
                                    Rename or Swap Student ID
                                </h3>
                                <button type="button" onClick={() => { setShowIdSwapModal(false); setSourceId(''); setTargetId(''); setSourceStudent(null); setTargetStudent(null); }} className="text-slate-400 hover:text-slate-600">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mb-4">
                                This will safely update or swap student IDs. If the Target ID is occupied, their IDs will be swapped. All referencing tables and auth metadata will cascade and update.
                            </p>
                            <form onSubmit={handleSwapIds} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Source Student ID</label>
                                        <input
                                            required
                                            type="text"
                                            value={sourceId}
                                            onChange={(e) => setSourceId(e.target.value)}
                                            placeholder="e.g. 420133463"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Student ID</label>
                                        <input
                                            required
                                            type="text"
                                            value={targetId}
                                            onChange={(e) => setTargetId(e.target.value)}
                                            placeholder="e.g. 420133462"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                        />
                                    </div>
                                </div>

                                {/* Review Preview Comparison */}
                                {(sourceId || targetId) && (
                                    <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <span>Review Operation Preview</span>
                                            {sourceStudent && targetStudent ? (
                                                <span className="text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <RefreshCw size={10} className="animate-spin" /> Swap IDs
                                                </span>
                                            ) : sourceStudent && !targetStudent && targetId.trim() ? (
                                                <span className="text-teal-600 font-semibold bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                                    Rename ID
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Source Student Preview */}
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Student (From)</span>
                                                {sourceLoading ? (
                                                    <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                        Loading student details...
                                                    </div>
                                                ) : sourceStudent ? (
                                                    <div className="p-3 rounded-xl border border-teal-100 bg-teal-50/30 flex items-start gap-3 min-h-[100px]">
                                                        {sourceStudent.profile_picture_url ? (
                                                            <img
                                                                src={getValidProfileImageUrl(sourceStudent.profile_picture_url)}
                                                                alt="Profile"
                                                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-teal-100/80 flex items-center justify-center text-teal-700 font-bold shrink-0">
                                                                <User size={20} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 truncate">
                                                                {[sourceStudent.first_name, sourceStudent.middle_name, sourceStudent.last_name, sourceStudent.suffix].filter(Boolean).join(' ')}
                                                            </p>
                                                            <p className="text-[11px] font-mono text-teal-600 font-semibold mt-0.5">{sourceStudent.student_id}</p>
                                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{sourceStudent.course || 'No course assigned'}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sourceStudent.year_level || 'No year level'}</p>
                                                            {sourceStudent.is_archived && (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                                    Archived
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : sourceId.trim() ? (
                                                    <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-center text-center text-xs text-rose-600 min-h-[100px] border-dashed">
                                                        Student ID not found
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                        Enter a Source Student ID
                                                    </div>
                                                )}
                                            </div>

                                            {/* Target Student Preview */}
                                            <div>
                                                <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Student (To)</span>
                                                {targetLoading ? (
                                                    <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                        Loading student details...
                                                    </div>
                                                ) : targetStudent ? (
                                                    <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-start gap-3 min-h-[100px]">
                                                        {targetStudent.profile_picture_url ? (
                                                            <img
                                                                src={getValidProfileImageUrl(targetStudent.profile_picture_url)}
                                                                alt="Profile"
                                                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700 font-bold shrink-0">
                                                                <User size={20} />
                                                            </div>
                                                        )}
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-bold text-slate-800 truncate">
                                                                {[targetStudent.first_name, targetStudent.middle_name, targetStudent.last_name, targetStudent.suffix].filter(Boolean).join(' ')}
                                                            </p>
                                                            <p className="text-[11px] font-mono text-amber-600 font-semibold mt-0.5">{targetStudent.student_id}</p>
                                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{targetStudent.course || 'No course assigned'}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{targetStudent.year_level || 'No year level'}</p>
                                                            {targetStudent.is_archived && (
                                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                                    Archived
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : targetId.trim() ? (
                                                    <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-center items-center text-center min-h-[100px] border-dashed">
                                                        <p className="text-xs font-bold text-emerald-700">ID is Vacant</p>
                                                        <p className="text-[10px] text-emerald-600/80 mt-1">This will rename the source student's ID.</p>
                                                    </div>
                                                ) : (
                                                    <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                        Enter a Target Student ID
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        disabled={isSwappingIds}
                                        onClick={() => { setShowIdSwapModal(false); setSourceId(''); setTargetId(''); setSourceStudent(null); setTargetStudent(null); }}
                                        className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSwappingIds || !sourceStudent}
                                        className="flex-1 px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 shadow-lg disabled:opacity-60"
                                    >
                                        {isSwappingIds ? 'Updating...' : (sourceStudent && targetStudent ? 'Swap Student IDs' : (sourceStudent && !targetStudent && targetId.trim() ? 'Rename Student ID' : 'Update / Swap'))}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                </div>
            </div>
        </div>
    );
}
