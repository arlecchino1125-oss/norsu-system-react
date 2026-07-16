import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Database,
    KeyRound,
    LayoutGrid,
    Loader2,
    RefreshCw,
    RotateCcw,
    Search,
    Shield,
    ShieldCheck,
    Workflow
} from 'lucide-react';
import { useAuth } from '../../../../../lib/auth';
import { permissionService } from '../../../../../services/permissionService';
import {
    getKnownPermissionKeysByType,
    getPermissionNotice,
    PERMISSION_STATUS_LABELS,
    humanizePermissionKey,
    ROLE_DISPLAY_LABELS,
    resolvePermissionDetails,
    ROLES,
    type PermissionRecord,
    type PermissionStatus,
    type PermissionType,
    type Role,
    type RolePermission
} from '../../../../../types/permissions';
import { getSafeErrorMessage } from '../../../../../utils/errorMasking';
import { AsyncButton } from '../../../../../components/ui/Button';

type ToastState = {
    type: 'success' | 'error';
    message: string;
} | null;

const TAB_CONFIG: Array<{
    key: PermissionType;
    label: string;
    icon: typeof Database;
}> = [
        { key: 'table', label: 'Tables', icon: Database },
        { key: 'function', label: 'Functions', icon: Workflow },
        { key: 'feature', label: 'Pages', icon: LayoutGrid },
        { key: 'action', label: 'Actions', icon: KeyRound }
    ];

const SELECTABLE_ROLES = ROLES as readonly Role[];
const PERMISSION_STATUS_OPTIONS = ['enabled', 'hidden', 'maintenance', 'coming_soon'] as const;

export default function RolePermissionsPage() {
    const navigate = useNavigate();
    const { session } = useAuth() as any;
    const queryClient = useQueryClient();
    const [selectedRole, setSelectedRole] = useState<Role>('Care Staff');
    const [activeTab, setActiveTab] = useState<PermissionType>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [localPermissionRecord, setLocalPermissionRecord] = useState<PermissionRecord>({});
    const [toast, setToast] = useState<ToastState>(null);
    const [savingKeys, setSavingKeys] = useState<string[]>([]);
    const [noticeDrafts, setNoticeDrafts] = useState<Record<string, string>>({});
    const [expandedPermissionKeys, setExpandedPermissionKeys] = useState<string[]>([]);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    const isAdminView = selectedRole === 'Admin';
    // Registrar's access is intentionally narrow (view/correct student info only) and has
    // no seeded "defaults" to reset to -- the reset RPC only supports Care Staff, Department
    // Head, Student, and Public. Keep the button disabled here instead of letting it fail.
    const isResetToDefaultsSupported = selectedRole !== 'Admin' && selectedRole !== 'Registrar';
    const isPageTab = activeTab === 'feature';
    const selectedRoleLabel = ROLE_DISPLAY_LABELS[selectedRole];
    const visibleTabs = selectedRole === 'Public'
        ? TAB_CONFIG.filter((tab) => tab.key === 'feature')
        : TAB_CONFIG;

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(message) : message;
        setToast({ message: safeMessage, type });
    }, []);

    useEffect(() => {
        if (!toast) return undefined;

        const timeoutId = window.setTimeout(() => {
            setToast(null);
        }, 3200);

        return () => window.clearTimeout(timeoutId);
    }, [toast]);

    // TanStack Query for RBAC permissions
    const { data: permissionsData, isLoading: qLoading, error: qError } = useQuery({
        queryKey: ['role_permissions', selectedRole, activeTab],
        queryFn: async () => {
            const [nextPermissionRecord, nextPermissionsByType] = await Promise.all([
                permissionService.getPermissionsForRole(selectedRole),
                permissionService.getPermissionsByType(selectedRole, activeTab)
            ]);
            return {
                permissionRecord: nextPermissionRecord,
                activeTypePermissions: nextPermissionsByType
            };
        }
    });

    const activeTypePermissions = useMemo(() => permissionsData?.activeTypePermissions || [], [permissionsData]);
    const loading = qLoading;
    const error = qError ? (qError as any).message || 'Failed to load role permissions.' : null;

    // Derived permissions record, overlaying instant local state changes
    const permissionRecord = useMemo(() => {
        return {
            ...(permissionsData?.permissionRecord || {}),
            ...localPermissionRecord
        };
    }, [permissionsData?.permissionRecord, localPermissionRecord]);

    const loadPermissions = useCallback(async (forceRefresh = false) => {
        if (forceRefresh) {
            permissionService.clearRoleCache(selectedRole);
        }
        await queryClient.invalidateQueries({ queryKey: ['role_permissions', selectedRole] });
    }, [queryClient, selectedRole]);

    // Reset per-role/per-tab local UI state right where the selection actually changes,
    // instead of reacting to it afterward in separate effects.
    const handleSelectRole = useCallback((role: Role) => {
        setSelectedRole(role);
        setLocalPermissionRecord({});
        setExpandedPermissionKeys([]);
        if (role === 'Public') {
            setActiveTab('feature');
        }
    }, []);

    const handleSelectTab = useCallback((tab: PermissionType) => {
        setActiveTab(tab);
        setLocalPermissionRecord({});
        setExpandedPermissionKeys([]);
    }, []);

    const activePermissionDefinitions = useMemo(() => {
        const knownKeys = getKnownPermissionKeysByType(activeTab, selectedRole);
        const customKeys = activeTypePermissions
            .map((permission) => String(permission.permission_key || '').trim())
            .filter((permissionKey) => permissionKey && permissionKey !== '*');

        const mergedKeys = Array.from(new Set([...knownKeys, ...customKeys]));
        const normalizedSearch = searchTerm.trim().toLowerCase();

        return mergedKeys
            .map((permissionKey) => {
                const databaseDefinition = activeTypePermissions.find((permission) => permission.permission_key === permissionKey);
                const description = String(
                    databaseDefinition?.description
                    || permissionService.getPermissionDescription(activeTab, permissionKey)
                ).trim();
                const resolvedPermission = isAdminView
                    ? resolvePermissionDetails({
                        [`${activeTab}:${permissionKey}`]: {
                            isAllowed: true,
                            status: 'enabled',
                            noticeText: null,
                            description
                        }
                    }, activeTab, permissionKey)
                    : resolvePermissionDetails(permissionRecord, activeTab, permissionKey);

                return {
                    permissionKey,
                    title: humanizePermissionKey(permissionKey),
                    description,
                    isAllowed: resolvedPermission.isAllowed,
                    status: resolvedPermission.status,
                    noticeText: resolvedPermission.noticeText
                };
            })
            .filter((permission) => {
                if (!normalizedSearch) return true;

                return permission.permissionKey.toLowerCase().includes(normalizedSearch)
                    || permission.title.toLowerCase().includes(normalizedSearch)
                    || permission.description.toLowerCase().includes(normalizedSearch);
            })
            .sort((left, right) => left.title.localeCompare(right.title));
    }, [activeTab, activeTypePermissions, isAdminView, permissionRecord, searchTerm, selectedRole]);

    const enabledCount = activePermissionDefinitions.filter((permission) =>
        isPageTab
            ? permission.isAllowed && permission.status === 'enabled'
            : permission.isAllowed
    ).length;
    const disabledCount = activePermissionDefinitions.length - enabledCount;
    const visibleLookupKeys = useMemo(
        () => activePermissionDefinitions.map((permission) => `${selectedRole}:${activeTab}:${permission.permissionKey}`),
        [activePermissionDefinitions, activeTab, selectedRole]
    );
    const expandedVisibleCount = useMemo(
        () => visibleLookupKeys.filter((lookupKey) => expandedPermissionKeys.includes(lookupKey)).length,
        [expandedPermissionKeys, visibleLookupKeys]
    );
    const listingsHelperText = isPageTab
        ? 'Use the toggle for quick access changes. Expand a page when you need to set it as hidden, under maintenance, or coming soon.'
        : 'Use the toggle for quick allow or deny changes. Expand an item when you want to review what that permission covers.';
    const modeLabel = isAdminView
        ? 'Admin access is fixed'
        : isPageTab
            ? 'Page availability controls'
            : 'Access controls';
    const modeHelperText = isAdminView
        ? 'The Admin role always keeps full access and cannot be limited from this screen.'
        : isPageTab
            ? `Use this tab to open, hide, or temporarily pause an entire page for ${selectedRoleLabel}. Add a notice when users should see a message instead of the page itself.`
            : `Use this tab to allow or deny this type of access for ${selectedRoleLabel}. For maintenance, coming soon, or locked page messages, switch to Pages.`;

    const setLocalPermissionState = useCallback((
        permissionKey: string,
        nextState: {
            isAllowed: boolean;
            status: PermissionStatus;
            noticeText?: string | null;
            description: string;
        }
    ) => {
        setLocalPermissionRecord((prev) => ({
            ...prev,
            [`${activeTab}:${permissionKey}`]: {
                isAllowed: nextState.isAllowed,
                status: nextState.status,
                noticeText: nextState.noticeText ?? null,
                description: nextState.description
            }
        }));
    }, [activeTab]);

    const persistPermission = useCallback(async (
        permissionKey: string,
        payload: {
            isAllowed: boolean;
            status: PermissionStatus;
            noticeText?: string | null;
            description: string;
        },
        successMessage: string
    ) => {
        if (isAdminView) {
            showToast('Admin access cannot be changed.', 'error');
            return false;
        }

        const savingLookupKey = `${selectedRole}:${activeTab}:${permissionKey}`;
        setSavingKeys((prev) => [...prev, savingLookupKey]);
        setLocalPermissionState(permissionKey, payload);

        const success = await permissionService.updatePermission({
            role: selectedRole,
            permissionType: activeTab,
            permissionKey,
            isAllowed: payload.isAllowed,
            status: payload.status,
            noticeText: payload.noticeText ?? null,
            description: payload.description
        }, session);

        setSavingKeys((prev) => prev.filter((entry) => entry !== savingLookupKey));

        if (!success) {
            await loadPermissions(true);
            setLocalPermissionRecord({});
            showToast(`Couldn't update ${humanizePermissionKey(permissionKey)}.`, 'error');
            return false;
        }

        await loadPermissions();
        setLocalPermissionRecord((prev) => {
            const nextLocal = { ...prev };
            delete nextLocal[`${activeTab}:${permissionKey}`];
            return nextLocal;
        });
        showToast(successMessage);
        return true;
    }, [activeTab, isAdminView, loadPermissions, selectedRole, session, setLocalPermissionState, showToast]);

    const handleTogglePermission = useCallback(async (
        permissionKey: string,
        currentValue: boolean,
        currentStatus: PermissionStatus,
        currentNoticeText: string | null,
        description: string
    ) => {
        const nextValue = !currentValue;
        await persistPermission(
            permissionKey,
            {
                isAllowed: isPageTab ? nextValue : nextValue,
                status: isPageTab
                    ? (nextValue ? 'enabled' : 'hidden')
                    : (nextValue ? (currentStatus === 'hidden' ? 'enabled' : currentStatus) : 'hidden'),
                noticeText: currentNoticeText,
                description
            },
            `${humanizePermissionKey(permissionKey)} ${nextValue ? 'enabled' : 'disabled'} for ${selectedRoleLabel}.`
        );
    }, [isPageTab, persistPermission, selectedRoleLabel]);

    const handleStatusChange = useCallback(async (
        permissionKey: string,
        nextStatus: PermissionStatus,
        currentNoticeText: string | null,
        description: string
    ) => {
        await persistPermission(
            permissionKey,
            {
                isAllowed: nextStatus !== 'hidden',
                status: nextStatus,
                noticeText: currentNoticeText,
                description
            },
            `${humanizePermissionKey(permissionKey)} is now ${PERMISSION_STATUS_LABELS[nextStatus].toLowerCase()} for ${selectedRoleLabel}.`
        );
    }, [persistPermission, selectedRoleLabel]);

    const handleSaveNotice = useCallback(async (
        permissionKey: string,
        currentPermission: {
            isAllowed: boolean;
            status: PermissionStatus;
            description: string;
            noticeText: string | null;
        }
    ) => {
        const savingLookupKey = `${selectedRole}:${activeTab}:${permissionKey}`;
        const nextNoticeText = noticeDrafts[savingLookupKey] ?? currentPermission.noticeText ?? '';

        const success = await persistPermission(
            permissionKey,
            {
                isAllowed: currentPermission.isAllowed,
                status: currentPermission.status,
                noticeText: nextNoticeText,
                description: currentPermission.description
            },
            `Saved the page notice for ${humanizePermissionKey(permissionKey)}.`
        );

        if (success) {
            setNoticeDrafts((prev) => {
                const nextDrafts = { ...prev };
                delete nextDrafts[savingLookupKey];
                return nextDrafts;
            });
        }
    }, [activeTab, noticeDrafts, persistPermission, selectedRole]);

    const handleResetToDefaults = useCallback(async () => {
        if (isAdminView) {
            setIsResetModalOpen(false);
            showToast('Admin access cannot be changed.', 'error');
            return;
        }

        if (!isResetToDefaultsSupported) {
            setIsResetModalOpen(false);
            showToast(`${selectedRoleLabel} has no default permission set to reset to.`, 'error');
            return;
        }

        setIsResetting(true);
        const success = await permissionService.resetRoleToDefaults(selectedRole, session);
        setIsResetting(false);
        setIsResetModalOpen(false);

        if (!success) {
            showToast(`Couldn't reset ${selectedRoleLabel} permissions.`, 'error');
            return;
        }

        await loadPermissions(true);
        setLocalPermissionRecord({});
        showToast(`${selectedRoleLabel} permissions have been reset.`);
    }, [isAdminView, isResetToDefaultsSupported, loadPermissions, selectedRole, selectedRoleLabel, session, showToast]);

    const togglePermissionExpansion = useCallback((lookupKey: string) => {
        setExpandedPermissionKeys((prev) =>
            prev.includes(lookupKey)
                ? prev.filter((entry) => entry !== lookupKey)
                : [...prev, lookupKey]
        );
    }, []);

    const expandVisiblePermissions = useCallback(() => {
        setExpandedPermissionKeys(visibleLookupKeys);
    }, [visibleLookupKeys]);

    const collapseVisiblePermissions = useCallback(() => {
        setExpandedPermissionKeys([]);
    }, []);

    if (session?.role !== 'Admin') {
        return (
            <div className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
                <div className="mx-auto max-w-3xl rounded-[28px] border border-rose-200 bg-white p-8 text-center shadow-lg shadow-slate-200/70">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
                        <Shield className="h-7 w-7" />
                    </div>
                    <h1 className="mt-5 text-2xl font-semibold text-slate-900">Admin Access Required</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Role permission controls are only available to the Admin portal.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/admin/dashboard')}
                        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-gradient-to-b from-teal-50 via-sky-50 to-transparent" />
                <div className="pointer-events-none absolute -left-14 top-10 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-sky-200/35 blur-3xl" />

                <div className="relative mx-auto w-full max-w-[1660px] px-4 py-4 sm:px-6 xl:px-8">
                    <div className="overflow-hidden rounded-[32px] border border-slate-900/10 bg-slate-900 text-white shadow-2xl shadow-slate-300/40">
                        <div className="bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.24),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.18),transparent_24%),linear-gradient(135deg,#0f172a_0%,#134e4a_52%,#0f172a_100%)] p-4 sm:p-5">
                            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_340px] xl:items-start">
                                <div>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-100">
                                        <Shield className="h-3 w-3" />
                                        Role Permissions
                                    </div>
                                    <h1 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
                                        RBAC Control Center
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-200">
                                        Manage what each role can access across the system. Use Pages for whole portal sections, and use Tables, Functions, and Actions for the supporting permissions behind them.
                                    </p>

                                    <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Role</p>
                                            <p className="mt-1.5 text-xl font-semibold text-white">{selectedRoleLabel}</p>
                                            <p className="mt-1 text-xs text-slate-300">Currently selected for permission updates.</p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Enabled</p>
                                            <p className="mt-1.5 text-xl font-semibold text-white">{enabledCount}</p>
                                            <p className="mt-1 text-xs text-slate-300">
                                                {isPageTab ? 'Pages currently available to this role.' : 'Permissions currently allowed in this tab.'}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Blocked</p>
                                            <p className="mt-1.5 text-xl font-semibold text-white">{disabledCount}</p>
                                            <p className="mt-1 text-xs text-slate-300">
                                                {isPageTab ? 'Pages that are hidden or temporarily unavailable.' : 'Permissions currently turned off in this tab.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[26px] border border-white/10 bg-white/10 p-3.5 backdrop-blur">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100">Admin Controls</p>
                                    <div className="mt-3 grid gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate('/admin/dashboard')}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                            Back to Dashboard
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void loadPermissions(true)}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-200/20 bg-teal-400/15 px-4 py-2.5 text-sm font-semibold text-teal-50 transition hover:bg-teal-400/25"
                                        >
                                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                            Refresh Permissions
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!isResetToDefaultsSupported}
                                            onClick={() => setIsResetModalOpen(true)}
                                            title={isResetToDefaultsSupported ? undefined : `${selectedRoleLabel} has no default permission set to reset to.`}
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Reset to Defaults
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/70 sm:p-6">
                        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_auto]">
                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Role</span>
                                <select
                                    value={selectedRole}
                                    onChange={(event) => handleSelectRole(event.target.value as Role)}
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                                >
                                    {SELECTABLE_ROLES.map((role) => (
                                        <option key={role} value={role}>
                                            {ROLE_DISPLAY_LABELS[role]}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search</span>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder={`Search ${TAB_CONFIG.find((tab) => tab.key === activeTab)?.label.toLowerCase()}...`}
                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white"
                                    />
                                </div>
                            </label>

                            <div className="flex items-end">
                                <div className={`w-full rounded-2xl border px-4 py-3 ${isAdminView
                                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                    }`}>
                                    <p className="text-sm font-semibold">
                                        {modeLabel}
                                    </p>
                                    <p className="mt-1 text-xs leading-5">
                                        {modeHelperText}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            {visibleTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.key;

                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => handleSelectTab(tab.key)}
                                        className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive
                                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-5 rounded-[26px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-sm">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5" />
                                <div>
                                    <p className="font-semibold">Unable to load permissions</p>
                                    <p className="mt-1 text-rose-600">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-5">
                        {loading ? (
                            <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-16 text-center shadow-lg shadow-slate-200/70">
                                <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
                                <p className="mt-4 text-sm font-medium text-slate-600">Loading role permissions...</p>
                            </div>
                        ) : activePermissionDefinitions.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
                                <Search className="mx-auto h-10 w-10 text-slate-300" />
                                <p className="mt-4 text-lg font-semibold text-slate-900">No permissions matched your search.</p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Try a broader term or switch to another permission tab.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-4 flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {activePermissionDefinitions.length} {TAB_CONFIG.find((tab) => tab.key === activeTab)?.label.toLowerCase()} listed
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {listingsHelperText}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={expandVisiblePermissions}
                                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                        >
                                            Expand All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={collapseVisiblePermissions}
                                            disabled={expandedVisibleCount === 0}
                                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Collapse All
                                        </button>
                                    </div>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                                    {activePermissionDefinitions.map((permission) => {
                                        const lookupKey = `${selectedRole}:${activeTab}:${permission.permissionKey}`;
                                        const isSaving = savingKeys.includes(lookupKey);
                                        const isExpanded = expandedPermissionKeys.includes(lookupKey);
                                        const isToggleEnabled = isPageTab
                                            ? permission.isAllowed && permission.status === 'enabled'
                                            : permission.isAllowed;

                                        return (
                                            <div
                                                key={lookupKey}
                                                className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.34)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-24px_rgba(15,23,42,0.42)]"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="text-[1.05rem] font-semibold text-slate-900">{permission.title}</h3>
                                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${isPageTab
                                                                ? permission.isAllowed && permission.status === 'enabled'
                                                                    ? 'bg-teal-50 text-teal-700'
                                                                    : permission.status === 'maintenance'
                                                                        ? 'bg-amber-50 text-amber-700'
                                                                        : permission.status === 'coming_soon'
                                                                            ? 'bg-sky-50 text-sky-700'
                                                                            : 'bg-slate-100 text-slate-500'
                                                                : permission.isAllowed
                                                                    ? 'bg-teal-50 text-teal-700'
                                                                    : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                {isPageTab
                                                                    ? (permission.isAllowed && permission.status === 'enabled'
                                                                        ? 'Enabled'
                                                                        : PERMISSION_STATUS_LABELS[permission.status])
                                                                    : (permission.isAllowed ? 'Allowed' : 'Denied')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-shrink-0 items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isAdminView || isSaving}
                                                            onClick={() => void handleTogglePermission(
                                                                permission.permissionKey,
                                                                isToggleEnabled,
                                                                permission.status,
                                                                permission.noticeText,
                                                                permission.description
                                                            )}
                                                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${isToggleEnabled ? 'bg-[#14b8a6]' : 'bg-[#cbd5e1]'
                                                                } ${isAdminView || isSaving ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                                                                }`}
                                                            aria-label={`Toggle ${permission.title}`}
                                                            aria-pressed={isToggleEnabled}
                                                        >
                                                            <span
                                                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition ${isToggleEnabled ? 'translate-x-7' : 'translate-x-1'
                                                                    }`}
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                                                                ) : isToggleEnabled ? (
                                                                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                                                                ) : null}
                                                            </span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePermissionExpansion(lookupKey)}
                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700"
                                                            aria-expanded={isExpanded}
                                                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${permission.title}`}
                                                        >
                                                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded ? (
                                                    <>
                                                        <p className="mt-4 text-sm leading-6 text-slate-500">
                                                            {permission.description}
                                                        </p>

                                                        {isPageTab ? (
                                                            <div className="mt-5 space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                                                                <div className="grid gap-3 xl:grid-cols-[minmax(0,190px)_1fr]">
                                                                    <label className="block">
                                                                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Page Status</span>
                                                                        <select
                                                                            value={permission.status}
                                                                            disabled={isAdminView || isSaving}
                                                                            onChange={(event) => void handleStatusChange(
                                                                                permission.permissionKey,
                                                                                event.target.value as PermissionStatus,
                                                                                permission.noticeText,
                                                                                permission.description
                                                                            )}
                                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                                                        >
                                                                            {PERMISSION_STATUS_OPTIONS.map((status) => (
                                                                                <option key={status} value={status}>
                                                                                    {PERMISSION_STATUS_LABELS[status]}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </label>
                                                                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-500">
                                                                        Hidden removes this page from side navigation. Maintenance and Coming Soon keep the page visible, but replace the page with the notice below.
                                                                    </div>
                                                                </div>

                                                                <label className="block">
                                                                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Locked Page Notice</span>
                                                                    <textarea
                                                                        rows={4}
                                                                        value={noticeDrafts[lookupKey] ?? permission.noticeText ?? ''}
                                                                        disabled={isAdminView || isSaving}
                                                                        onChange={(event) => setNoticeDrafts((prev) => ({
                                                                            ...prev,
                                                                            [lookupKey]: event.target.value
                                                                        }))}
                                                                        placeholder={getPermissionNotice({
                                                                            isAllowed: permission.isAllowed,
                                                                            status: permission.status,
                                                                            noticeText: permission.noticeText,
                                                                            description: permission.description
                                                                        }, permission.title)}
                                                                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-teal-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                                                                    />
                                                                </label>

                                                                <div className="flex flex-wrap gap-3">
                                                                    <AsyncButton
                                                                        type="button"
                                                                        disabled={isAdminView || isSaving}
                                                                        onClick={() => handleSaveNotice(permission.permissionKey, permission)}
                                                                        className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        Save Notice
                                                                    </AsyncButton>
                                                                    <button
                                                                        type="button"
                                                                        disabled={isAdminView || isSaving}
                                                                        onClick={() => {
                                                                            const clearedLookupKey = `${selectedRole}:${activeTab}:${permission.permissionKey}`;
                                                                            setNoticeDrafts((prev) => ({
                                                                                ...prev,
                                                                                [clearedLookupKey]: ''
                                                                            }));
                                                                        }}
                                                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                                    >
                                                                        Clear Draft
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 text-sm leading-6 text-slate-500">
                                                                <p className="font-semibold text-slate-700">Status controls are only available for Pages (portal pages).</p>
                                                                <p className="mt-2">
                                                                    {activeTab === 'table'
                                                                        ? 'This is a backend data permission. Turn it off to stop this role from accessing the related table, even if a page is still visible.'
                                                                        : activeTab === 'function'
                                                                            ? 'This is an edge-function permission. Turn it off to block this role from invoking the related server function.'
                                                                            : 'This is an action permission. Turn it off to block this role from performing the related workflow action.'}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {toast && (
                <div className="fixed right-4 top-4 z-50 w-full max-w-sm">
                    <div className={`rounded-2xl border px-4 py-3 shadow-xl ${toast.type === 'success'
                        ? 'border-teal-200 bg-white text-slate-700'
                        : 'border-rose-200 bg-white text-slate-700'
                        }`}>
                        <div className="flex items-start gap-3">
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-600" />
                            ) : (
                                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                            )}
                            <p className="text-sm font-medium">{toast.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {isResetModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-transparent px-4">
                    <div className="w-full max-w-lg rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                                <RotateCcw className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-900">Reset to default permissions?</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    This will replace the current {selectedRoleLabel} permission set with the seeded defaults from the database migration. Custom overrides for this role will be removed.
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setIsResetModalOpen(false)}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={isResetting}
                                onClick={() => void handleResetToDefaults()}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isResetting && <Loader2 className="h-4 w-4 animate-spin" />}
                                <span>{isResetting ? 'Resetting...' : 'Confirm Reset'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
