import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { invokeEdgeFunction } from '../lib/invokeEdgeFunction';
import { formatAuditDetails, isTrackedStaffAuditRole, type StaffAuditLogRow } from '../lib/staffAudit';
import { sendTransactionalEmailNotification } from '../lib/transactionalEmail';
import { Trash2, AlertTriangle, AlertCircle, CheckCircle, Plus, RefreshCw, Shield, LogOut, UserPlus, Building2, Users, Activity, Search, ChevronDown, KeyRound, Lock, LockOpen, Globe2, Settings2, Clock3, EyeOff } from 'lucide-react';
import { useSupabaseData } from '../hooks/useSupabaseData';
import { permissionService } from '../services/permissionService';
import { PERMISSION_STATUS_LABELS, resolvePermissionDetails, type PermissionRecord, type PermissionStatus, type Role } from '../types/permissions';

const STAFF_ACCOUNT_SELECT = 'id, username, full_name, role, department, email, created_at, auth_user_id';
const ADMIN_PANEL_ORDER = ['alerts', 'portalLocks', 'createStaff', 'existingAccounts', 'studentOverview', 'governance', 'audit', 'colleges'] as const;
const PANEL_LIMIT_OPTIONS = [1, 2, 3, 'all'] as const;
const PANEL_PREFERENCES_STORAGE_KEY = 'norsu_admin_dashboard_panel_preferences_v1';
const STAFF_ACCOUNT_PAGE_SIZE = 10;
const AUDIT_PAGE_SIZE = 25;
const AUDIT_SEARCH_DEBOUNCE_MS = 280;
const TRACKED_ADMIN_AUDIT_ROLES = ['Care Staff', 'Department Head'] as const;

const PORTAL_LOCK_GROUPS: Array<{
    role: Role;
    title: string;
    description: string;
    features: Array<{ key: string; label: string }>;
}> = [
    {
        role: 'Care Staff',
        title: 'CARE Staff Pages',
        description: 'Operational pages inside the CARE Staff portal.',
        features: [
            { key: 'student_population', label: 'Student Population' },
            { key: 'student_analytics', label: 'Student Analytics' },
            { key: 'nat_management', label: 'NAT Management' },
            { key: 'counseling', label: 'Counseling' },
            { key: 'support_requests', label: 'Support Portal' },
            { key: 'events', label: 'Events Portal' },
            { key: 'scholarships', label: 'Scholarship Portal' },
            { key: 'forms', label: 'Forms Portal' },
            { key: 'feedback', label: 'Feedback Portal' },
            { key: 'audit_logs', label: 'Audit Logs' },
            { key: 'office_logbook', label: 'Office Logbook' },
            { key: 'calendar', label: 'Calendar View' },
            { key: 'export_center', label: 'Export Center' },
            { key: 'settings', label: 'Settings' }
        ]
    },
    {
        role: 'Department Head',
        title: 'Department Head Pages',
        description: 'Department-facing pages used by Deans and heads.',
        features: [
            { key: 'admissions', label: 'Department Admissions' },
            { key: 'interview_queue', label: 'Interview Queue' },
            { key: 'counseling_queue', label: 'Counseling Queue' },
            { key: 'support_approvals', label: 'Support Approvals' },
            { key: 'students', label: 'Students' },
            { key: 'counseled', label: 'Counseled Students' },
            { key: 'events', label: 'Events Portal' },
            { key: 'reports', label: 'Reports' },
            { key: 'calendar', label: 'Calendar View' },
            { key: 'export_center', label: 'Export Center' },
            { key: 'settings', label: 'Settings' }
        ]
    },
    {
        role: 'Student',
        title: 'Student Pages',
        description: 'Student portal pages outside the dashboard home.',
        features: [
            { key: 'profile', label: 'Profile' },
            { key: 'assessment', label: 'Needs Assessment' },
            { key: 'counseling', label: 'Counseling Portal' },
            { key: 'support', label: 'Support Portal' },
            { key: 'scholarship', label: 'Scholarship Portal' },
            { key: 'events', label: 'Events Portal' },
            { key: 'feedback', label: 'Feedback Portal' }
        ]
    },
    {
        role: 'Public',
        title: 'Public Pages',
        description: 'Public-facing admission pages outside authenticated portals.',
        features: [
            { key: 'nat_portal', label: 'NAT Portal' }
        ]
    }
] as const;

type AdminPanelKey = typeof ADMIN_PANEL_ORDER[number];
type PanelLimit = typeof PANEL_LIMIT_OPTIONS[number];
type AuditRoleFilter = 'All' | (typeof TRACKED_ADMIN_AUDIT_ROLES)[number];
type PortalLockModalState = {
    role: Role;
    roleTitle: string;
    featureKey: string;
    featureLabel: string;
    description: string;
    nextStatus: PermissionStatus;
    noticeText: string;
};

const sortAdminPanelKeys = (keys: AdminPanelKey[]) => {
    const uniqueKeys = Array.from(new Set(keys));
    return ADMIN_PANEL_ORDER.filter((panelKey) => uniqueKeys.includes(panelKey));
};

const sanitizeAuditSearchTerm = (value: string) =>
    String(value || '').replace(/[%(),'"]/g, ' ').trim();

const readStoredPanelPreferences = (): {
    expandedPanels: AdminPanelKey[];
    expandedPanelLimit: PanelLimit;
} => {
    const defaultState = {
        expandedPanels: [...ADMIN_PANEL_ORDER],
        expandedPanelLimit: 'all' as PanelLimit
    };

    if (typeof window === 'undefined') {
        return defaultState;
    }

    try {
        const rawValue = window.localStorage.getItem(PANEL_PREFERENCES_STORAGE_KEY);
        if (!rawValue) {
            return defaultState;
        }

        const parsed = JSON.parse(rawValue) as {
            expandedPanels?: unknown;
            expandedPanelLimit?: unknown;
        } | null;

        const expandedPanelLimit = PANEL_LIMIT_OPTIONS.includes(parsed?.expandedPanelLimit as PanelLimit)
            ? parsed?.expandedPanelLimit as PanelLimit
            : defaultState.expandedPanelLimit;
        const expandedPanels = Array.isArray(parsed?.expandedPanels)
            ? sortAdminPanelKeys(parsed?.expandedPanels.filter((panelKey): panelKey is AdminPanelKey =>
                ADMIN_PANEL_ORDER.includes(panelKey as AdminPanelKey)
            ))
            : defaultState.expandedPanels;

        if (expandedPanelLimit === 'all' || expandedPanels.length <= expandedPanelLimit) {
            return { expandedPanels, expandedPanelLimit };
        }

        return {
            expandedPanels: expandedPanels.slice(0, expandedPanelLimit),
            expandedPanelLimit
        };
    } catch {
        return defaultState;
    }
};

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
    const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
    const [isAddingDepartment, setIsAddingDepartment] = useState(false);
    const [deletingDepartmentId, setDeletingDepartmentId] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<StaffAuditLogRow[]>([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditRoleFilter, setAuditRoleFilter] = useState<AuditRoleFilter>('All');
    const [auditSearch, setAuditSearch] = useState('');
    const [debouncedAuditSearch, setDebouncedAuditSearch] = useState('');
    const [auditTotalCount, setAuditTotalCount] = useState(0);
    const [auditPage, setAuditPage] = useState(1);
    const [staffAccountsPage, setStaffAccountsPage] = useState(1);
    const [portalLockRecords, setPortalLockRecords] = useState<Partial<Record<Role, PermissionRecord>>>({});
    const [portalLockLoading, setPortalLockLoading] = useState(true);
    const [portalLockSavingKey, setPortalLockSavingKey] = useState<string | null>(null);
    const [portalLockModal, setPortalLockModal] = useState<PortalLockModalState | null>(null);
    const initialPanelPreferences = React.useMemo(() => readStoredPanelPreferences(), []);
    const [expandedPanelLimit, setExpandedPanelLimit] = useState<PanelLimit>(initialPanelPreferences.expandedPanelLimit);
    const [expandedPanels, setExpandedPanels] = useState<AdminPanelKey[]>(initialPanelPreferences.expandedPanels);

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

    const sortPanelKeys = React.useCallback((keys: AdminPanelKey[]) => {
        return sortAdminPanelKeys(keys);
    }, []);

    const isPanelExpanded = React.useCallback((panelKey: AdminPanelKey) => {
        return expandedPanels.includes(panelKey);
    }, [expandedPanels]);

    const togglePanel = React.useCallback((panelKey: AdminPanelKey) => {
        setExpandedPanels((prev) => {
            if (prev.includes(panelKey)) {
                return prev.filter((key) => key !== panelKey);
            }

            const next = [...prev.filter((key) => key !== panelKey), panelKey];
            if (expandedPanelLimit === 'all' || next.length <= expandedPanelLimit) {
                return next;
            }

            return next.slice(next.length - expandedPanelLimit);
        });
    }, [expandedPanelLimit]);

    const setPanelLimit = React.useCallback((limit: PanelLimit) => {
        setExpandedPanelLimit(limit);
        setExpandedPanels((prev) => {
            const orderedPanels = sortPanelKeys(prev);
            if (limit === 'all' || orderedPanels.length <= limit) {
                return orderedPanels;
            }

            return orderedPanels.slice(0, limit);
        });
    }, [sortPanelKeys]);

    const collapseAllPanels = React.useCallback(() => {
        setExpandedPanels([]);
    }, []);

    const showToast = React.useCallback((msg: string, type: string = 'success') => {
        setToast({ msg, type });
        window.setTimeout(() => setToast(null), 3000);
    }, []);

    const loadPortalLockRecords = React.useCallback(async (forceRefresh = false) => {
        setPortalLockLoading(true);

        try {
            if (forceRefresh) {
                PORTAL_LOCK_GROUPS.forEach((group) => permissionService.clearRoleCache(group.role));
            }

            const entries = await Promise.all(
                PORTAL_LOCK_GROUPS.map(async (group) => [group.role, await permissionService.getPermissionsForRole(group.role)] as const)
            );

            setPortalLockRecords(Object.fromEntries(entries) as Partial<Record<Role, PermissionRecord>>);
        } catch (error: any) {
            console.error('Failed to load portal locks:', error);
            showToast(error?.message || 'Failed to load portal locks.', 'error');
            setPortalLockRecords({});
        } finally {
            setPortalLockLoading(false);
        }
    }, [showToast]);

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
            showToast(error?.message || 'Failed to load staff audit logs.', 'error');
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
        if (!isAuthenticated) {
            setPortalLockRecords({});
            setPortalLockLoading(false);
            return;
        }

        void loadPortalLockRecords();
    }, [isAuthenticated, loadPortalLockRecords]);

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
        if (typeof window === 'undefined') {
            return;
        }

        try {
            window.localStorage.setItem(PANEL_PREFERENCES_STORAGE_KEY, JSON.stringify({
                expandedPanels,
                expandedPanelLimit
            }));
        } catch {
            // Ignore storage write issues and keep the current layout in memory.
        }
    }, [expandedPanelLimit, expandedPanels]);

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
                fetchAuditLogs(),
                loadPortalLockRecords(true)
            ]);
            showToast('Admin data refreshed.');
        } catch (error: any) {
            showToast(error?.message || 'Failed to refresh admin data.', 'error');
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
            showToast(error?.message || 'Failed to save the account email.', 'error');
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
    const getPortalLockRoleMeta = (role: Role) => {
        if (role === 'Care Staff') {
            return {
                icon: <Shield className="h-4 w-4" />,
                iconClass: 'border-sky-200 bg-sky-50 text-sky-700',
                badgeClass: 'border-sky-200 bg-sky-50 text-sky-700'
            };
        }

        if (role === 'Department Head') {
            return {
                icon: <Building2 className="h-4 w-4" />,
                iconClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700'
            };
        }

        if (role === 'Student') {
            return {
                icon: <Users className="h-4 w-4" />,
                iconClass: 'border-violet-200 bg-violet-50 text-violet-700',
                badgeClass: 'border-violet-200 bg-violet-50 text-violet-700'
            };
        }

        return {
            icon: <Globe2 className="h-4 w-4" />,
            iconClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
            badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700'
        };
    };
    const getPortalLockStatusClass = (status: PermissionStatus) => {
        if (status === 'enabled') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
        if (status === 'maintenance') return 'border-amber-200 bg-amber-50 text-amber-700';
        if (status === 'coming_soon') return 'border-sky-200 bg-sky-50 text-sky-700';
        return 'border-rose-200 bg-rose-50 text-rose-700';
    };
    const getPortalLockStatusIcon = (status: PermissionStatus) => {
        if (status === 'enabled') return <LockOpen className="h-3.5 w-3.5" />;
        if (status === 'maintenance') return <Settings2 className="h-3.5 w-3.5" />;
        if (status === 'coming_soon') return <Clock3 className="h-3.5 w-3.5" />;
        return <EyeOff className="h-3.5 w-3.5" />;
    };
    const portalLockGroups = React.useMemo(() => {
        return PORTAL_LOCK_GROUPS.map((group) => {
            const rolePermissions = (portalLockRecords[group.role] || {}) as PermissionRecord;
            const features = group.features.map((feature) => {
                const permission = resolvePermissionDetails(rolePermissions, 'feature', feature.key);
                const currentStatus = !permission.isAllowed && permission.status === 'enabled'
                    ? 'hidden'
                    : permission.status;

                return {
                    ...feature,
                    description: String(permission.description || permissionService.getPermissionDescription('feature', feature.key)).trim(),
                    permission,
                    currentStatus,
                    isUnlocked: permission.isAllowed && currentStatus === 'enabled',
                    savingKey: `${group.role}:${feature.key}`
                };
            });

            return {
                ...group,
                features,
                lockedCount: features.filter((feature) => feature.currentStatus !== 'enabled').length
            };
        });
    }, [portalLockRecords]);
    const totalPortalPageCount = portalLockGroups.reduce((total, group) => total + group.features.length, 0);
    const enabledPortalPageCount = portalLockGroups.reduce((total, group) =>
        total + group.features.filter((feature) => feature.currentStatus === 'enabled').length,
    0);
    const lockedPortalPageCount = totalPortalPageCount - enabledPortalPageCount;
    const openPortalLockModal = React.useCallback((params: {
        role: Role;
        roleTitle: string;
        featureKey: string;
        featureLabel: string;
        description: string;
        currentStatus: PermissionStatus;
        currentNoticeText: string | null;
    }) => {
        setPortalLockModal({
            role: params.role,
            roleTitle: params.roleTitle,
            featureKey: params.featureKey,
            featureLabel: params.featureLabel,
            description: params.description,
            nextStatus: params.currentStatus === 'enabled' ? 'hidden' : 'enabled',
            noticeText: params.currentNoticeText || ''
        });
    }, []);
    const handleConfirmPortalLock = React.useCallback(async () => {
        if (!portalLockModal) {
            return;
        }

        const savingKey = `${portalLockModal.role}:${portalLockModal.featureKey}`;
        setPortalLockSavingKey(savingKey);

        const success = await permissionService.updatePermission({
            role: portalLockModal.role,
            permissionType: 'feature',
            permissionKey: portalLockModal.featureKey,
            isAllowed: portalLockModal.nextStatus !== 'hidden',
            status: portalLockModal.nextStatus,
            noticeText: portalLockModal.noticeText,
            description: portalLockModal.description
        });

        setPortalLockSavingKey(null);

        if (!success) {
            showToast(`Unable to update ${portalLockModal.featureLabel}.`, 'error');
            return;
        }

        await loadPortalLockRecords(true);
        showToast(`${portalLockModal.featureLabel} is now ${PERMISSION_STATUS_LABELS[portalLockModal.nextStatus].toLowerCase()}.`);
        setPortalLockModal(null);
    }, [loadPortalLockRecords, portalLockModal, showToast]);
    const panelClass = 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur';
    const sectionHeaderIconClass = 'flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700';
    const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 shadow-sm outline-none transition-all focus:border-teal-400 focus:bg-white focus:ring-4 focus:ring-teal-100';
    const labelClass = 'mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500';
    const getStaffRoleBadgeClass = (role: string | null | undefined) => {
        if (role === 'Admin') return 'bg-rose-50 text-rose-700 ring-rose-200';
        if (role === 'Care Staff') return 'bg-sky-50 text-sky-700 ring-sky-200';
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
        const expanded = isPanelExpanded(panelKey);

        return (
            <div className={`${panelClass} ${className}`.trim()}>
                <div className="border-b border-slate-200/80 p-6 sm:p-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <button
                            type="button"
                            onClick={() => togglePanel(panelKey)}
                            className="flex min-w-0 flex-1 items-start gap-4 text-left"
                            aria-expanded={expanded}
                        >
                            <div className={`${sectionHeaderIconClass} transition-transform duration-200 ${expanded ? 'scale-100' : 'scale-95'}`}>
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
                                onClick={() => togglePanel(panelKey)}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                aria-expanded={expanded}
                            >
                                <span>{expanded ? 'Collapse' : 'Expand'}</span>
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {expanded && (
                    <div className={bodyClassName ?? 'p-6 sm:p-7'}>
                        {children}
                    </div>
                )}
            </div>
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
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Dashboard Layout</p>
                                                    <p className="mt-1 text-[11px] leading-5 text-slate-300">
                                                        Set how many sections stay open at once.
                                                    </p>
                                                </div>
                                                <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100">
                                                    {expandedPanels.length} open
                                                </span>
                                            </div>

                                            <div className="mt-2.5 flex flex-wrap gap-2">
                                                {PANEL_LIMIT_OPTIONS.map((limitOption) => {
                                                    const active = expandedPanelLimit === limitOption;
                                                    const label = limitOption === 'all' ? 'All' : `${limitOption}`;
                                                    return (
                                                        <button
                                                            key={String(limitOption)}
                                                            type="button"
                                                            onClick={() => setPanelLimit(limitOption)}
                                                            className={`inline-flex items-center justify-center rounded-2xl px-3 py-1.5 text-[11px] font-semibold transition ${
                                                                active
                                                                    ? 'bg-white text-slate-900 shadow-lg shadow-slate-950/20'
                                                                    : 'border border-white/15 bg-white/5 text-slate-100 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {label} Open
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-slate-300">
                                                <span>Saved automatically after refresh.</span>
                                                <button
                                                    type="button"
                                                    onClick={collapseAllPanels}
                                                    className="font-semibold text-white transition hover:text-rose-200"
                                                >
                                                    Collapse All
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

                    <div className="mt-8">
                        {renderExpandablePanel({
                            panelKey: 'portalLocks',
                            title: 'Portal Locks',
                            description: 'Manage availability of actual portal pages only. Tables, functions, and actions stay in Role Permissions as backend security controls.',
                            icon: <Lock className="h-5 w-5" />,
                            badge: `${lockedPortalPageCount} locked`,
                            bodyClassName: '',
                            headerActions: (
                                <button
                                    type="button"
                                    onClick={() => navigate('/admin/permissions')}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                >
                                    <KeyRound className="h-4 w-4" />
                                    Open Full RBAC
                                </button>
                            ),
                            children: (
                                <>
                                    <div className="grid gap-4 p-6 md:grid-cols-3">
                                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">Enabled Pages</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{enabledPortalPageCount}</p>
                                        </div>
                                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-700">Locked Pages</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{lockedPortalPageCount}</p>
                                        </div>
                                        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700">Tracked Pages</p>
                                            <p className="mt-3 text-3xl font-semibold text-slate-900">{totalPortalPageCount}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-200/80 px-6 py-5 text-sm leading-6 text-slate-500">
                                        This panel is for whole-page availability only. Hidden removes a page from navigation, while Maintenance and Coming Soon keep the page visible and replace it with a notice screen.
                                    </div>

                                    {portalLockLoading ? (
                                        <div className="border-t border-slate-200/80 px-6 py-16 text-center text-sm text-slate-500">
                                            Loading portal locks...
                                        </div>
                                    ) : (
                                        <div className="grid gap-5 border-t border-slate-200/80 p-6 xl:grid-cols-2">
                                            {portalLockGroups.map((group) => {
                                                const roleMeta = getPortalLockRoleMeta(group.role);

                                                return (
                                                    <div key={group.role} className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-5 shadow-sm shadow-slate-200/60">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex min-w-0 items-start gap-3">
                                                                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${roleMeta.iconClass}`}>
                                                                    {roleMeta.icon}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <h3 className="text-lg font-semibold text-slate-900">{group.title}</h3>
                                                                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${roleMeta.badgeClass}`}>
                                                                            {group.lockedCount} locked
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-5 space-y-3">
                                                            {group.features.map((feature) => {
                                                                const isSaving = portalLockSavingKey === feature.savingKey;

                                                                return (
                                                                    <div key={`${group.role}:${feature.key}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                                                                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                                                            <div className="min-w-0">
                                                                                <p className="font-semibold text-slate-900">{feature.label}</p>
                                                                                <p className="mt-1 text-xs text-slate-400">{feature.key}</p>
                                                                                <p className="mt-2 text-sm leading-6 text-slate-500">{feature.description}</p>
                                                                                {String(feature.permission.noticeText || '').trim() && feature.currentStatus !== 'enabled' && (
                                                                                    <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                                                                                        Notice: {String(feature.permission.noticeText || '').trim()}
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                                                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getPortalLockStatusClass(feature.currentStatus)}`}>
                                                                                    {getPortalLockStatusIcon(feature.currentStatus)}
                                                                                    {PERMISSION_STATUS_LABELS[feature.currentStatus]}
                                                                                </span>
                                                                                <button
                                                                                    type="button"
                                                                                    disabled={isSaving}
                                                                                    onClick={() => openPortalLockModal({
                                                                                        role: group.role,
                                                                                        roleTitle: group.title,
                                                                                        featureKey: feature.key,
                                                                                        featureLabel: feature.label,
                                                                                        description: feature.description,
                                                                                        currentStatus: feature.currentStatus,
                                                                                        currentNoticeText: feature.permission.noticeText
                                                                                    })}
                                                                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${feature.isUnlocked ? 'bg-[#14b8a6]' : 'bg-[#cbd5e1]'} ${isSaving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                                                                    aria-label={`Manage ${feature.label}`}
                                                                                    aria-pressed={feature.isUnlocked}
                                                                                >
                                                                                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition ${feature.isUnlocked ? 'translate-x-7' : 'translate-x-1'}`}>
                                                                                        {isSaving ? (
                                                                                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-500" />
                                                                                        ) : feature.isUnlocked ? (
                                                                                            <LockOpen className="h-3.5 w-3.5 text-emerald-600" />
                                                                                        ) : (
                                                                                            <Lock className="h-3.5 w-3.5 text-slate-500" />
                                                                                        )}
                                                                                    </span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )
                        })}
                    </div>

                    <div className="grid grid-cols-1 gap-8 2xl:grid-cols-[420px_minmax(0,1fr)]">
                        {renderExpandablePanel({
                            panelKey: 'createStaff',
                            title: 'Create Staff Account',
                            description: 'Provision a new admin-side login and link it directly to Supabase Auth.',
                            icon: <UserPlus className="h-5 w-5" />,
                            badge: 'Provisioning',
                            className: 'h-fit',
                            bodyClassName: '',
                            children: (
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
                            )
                        })}

                        {renderExpandablePanel({
                            panelKey: 'existingAccounts',
                            title: `Existing Accounts (${accounts.length})`,
                            description: 'Review staff records, update missing email addresses, and keep account details complete.',
                            icon: <Shield className="h-5 w-5" />,
                            badge: `${accounts.length} accounts`,
                            className: 'min-w-0',
                            bodyClassName: '',
                            headerActions: (
                                <div className="flex flex-wrap gap-2">
                                    {accountOverviewStats.map((stat) => (
                                        <div key={stat.label} className="min-w-[108px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{stat.label}</p>
                                            <p className="mt-1 text-2xl font-semibold text-slate-900">{stat.value}</p>
                                        </div>
                                    ))}
                                </div>
                            ),
                            children: (
                                <div>
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
                                                ) : paginatedAccounts.map((acc: any) => (
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
                                                <li>Staff account creation, deletion, and role assignment</li>
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
                                </>
                            )
                        })}
                    </div>

                {portalLockModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4">
                        <div className="w-full max-w-xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-2xl">
                            <div className="flex items-start gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{portalLockModal.roleTitle}</p>
                                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Manage {portalLockModal.featureLabel}</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        Choose whether this page stays open, hidden, under maintenance, or marked as coming soon.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-4">
                                <label className="block">
                                    <span className={labelClass}>Page Status</span>
                                    <select
                                        value={portalLockModal.nextStatus}
                                        onChange={(event) => setPortalLockModal((prev) => prev ? {
                                            ...prev,
                                            nextStatus: event.target.value as PermissionStatus
                                        } : prev)}
                                        className={inputClass}
                                    >
                                        {(['enabled', 'hidden', 'maintenance', 'coming_soon'] as PermissionStatus[]).map((status) => (
                                            <option key={status} value={status}>
                                                {PERMISSION_STATUS_LABELS[status]}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">
                                    Status controls are only available for Pages (portal pages). Hidden removes the page from navigation, while Maintenance and Coming Soon show a locked-page screen instead of the real page.
                                </div>

                                <label className="block">
                                    <span className={labelClass}>Locked Page Notice</span>
                                    <textarea
                                        rows={4}
                                        value={portalLockModal.noticeText}
                                        onChange={(event) => setPortalLockModal((prev) => prev ? {
                                            ...prev,
                                            noticeText: event.target.value
                                        } : prev)}
                                        placeholder={`${portalLockModal.featureLabel} is currently unavailable.`}
                                        className={inputClass}
                                    />
                                </label>
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setPortalLockModal(null)}
                                    disabled={Boolean(portalLockSavingKey)}
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmPortalLock()}
                                    disabled={Boolean(portalLockSavingKey)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {portalLockSavingKey && <RefreshCw className="h-4 w-4 animate-spin" />}
                                    <span>Save Portal Status</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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

                </div>
            </div>
        </div>
    );
}
