import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import { permissionService } from '../services/permissionService';
import {
    createResolvedPermissionState,
    isPermissionAccessible,
    isPermissionVisible,
    resolvePermissionDetails,
    resolvePermissionState,
    type PermissionRecord,
    type PermissionType,
    type ResolvedPermissionState,
    type Role,
    type RolePermission
} from '../types/permissions';

const isRole = (value: unknown): value is Role =>
    value === 'Admin'
    || value === 'Care Staff'
    || value === 'Department Head'
    || value === 'Student'
    || value === 'Public';

const resolveUntypedPermission = (permissions: PermissionRecord, permission: string) => {
    const normalizedPermission = String(permission || '').trim();
    if (!normalizedPermission) {
        return false;
    }

    const separatorIndex = normalizedPermission.indexOf(':');
    if (separatorIndex > 0) {
        const permissionType = normalizedPermission.slice(0, separatorIndex) as PermissionType;
        const permissionKey = normalizedPermission.slice(separatorIndex + 1);

        if (permissionType === 'table'
            || permissionType === 'function'
            || permissionType === 'feature'
            || permissionType === 'action') {
            return resolvePermissionState(permissions, permissionType, permissionKey);
        }
    }

    return (
        resolvePermissionState(permissions, 'table', normalizedPermission)
        || resolvePermissionState(permissions, 'function', normalizedPermission)
        || resolvePermissionState(permissions, 'feature', normalizedPermission)
        || resolvePermissionState(permissions, 'action', normalizedPermission)
    );
};

const useRolePermissionsState = (role: Role | null) => {
    const [permissions, setPermissions] = useState<PermissionRecord>({});
    const [loading, setLoading] = useState<boolean>(Boolean(role));
    const [error, setError] = useState<string | null>(null);

    const loadPermissions = useCallback(async (forceRefresh = false) => {
        if (!role) {
            setPermissions({});
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (forceRefresh) {
                permissionService.clearRoleCache(role);
            }

            const nextPermissions = await permissionService.getPermissionsForRole(role);
            setPermissions(nextPermissions);
        } catch (nextError: any) {
            setError(nextError?.message || 'Failed to load permissions.');
            setPermissions({});
        } finally {
            setLoading(false);
        }
    }, [role]);

    useEffect(() => {
        void loadPermissions();
    }, [loadPermissions]);

    const getPermissionAccessState = useCallback((permissionType: PermissionType, permissionKey: string): ResolvedPermissionState => {
        if (!role) {
            return createResolvedPermissionState({
                isAllowed: false,
                status: 'hidden'
            });
        }

        if (role === 'Admin') {
            return createResolvedPermissionState({
                isAllowed: true,
                status: 'enabled'
            });
        }

        return resolvePermissionDetails(permissions, permissionType, String(permissionKey || '').trim());
    }, [permissions, role]);

    const hasPermission = useCallback((permission: string) => {
        if (!role) return false;
        if (role === 'Admin') return true;
        return resolveUntypedPermission(permissions, permission);
    }, [permissions, role]);

    const canAccessTable = useCallback((table: string) => {
        return isPermissionAccessible(getPermissionAccessState('table', table));
    }, [getPermissionAccessState]);

    const canInvokeFunction = useCallback((functionName: string) => {
        return isPermissionAccessible(getPermissionAccessState('function', functionName));
    }, [getPermissionAccessState]);

    const canAccessFeature = useCallback((feature: string) => {
        return isPermissionAccessible(getPermissionAccessState('feature', feature));
    }, [getPermissionAccessState]);

    const canPerformAction = useCallback((action: string) => {
        return isPermissionAccessible(getPermissionAccessState('action', action));
    }, [getPermissionAccessState]);

    const isFeatureVisible = useCallback((feature: string) => {
        return isPermissionVisible(getPermissionAccessState('feature', feature));
    }, [getPermissionAccessState]);

    const getFeatureAccessState = useCallback((feature: string) => {
        return getPermissionAccessState('feature', feature);
    }, [getPermissionAccessState]);

    const refetch = useCallback(async () => {
        await loadPermissions(true);
    }, [loadPermissions]);

    return useMemo(() => ({
        permissions,
        loading,
        error,
        hasPermission,
        canAccessTable,
        canInvokeFunction,
        canAccessFeature,
        canPerformAction,
        getPermissionAccessState,
        getFeatureAccessState,
        isFeatureVisible,
        refetch
    }), [
        permissions,
        loading,
        error,
        hasPermission,
        canAccessTable,
        canInvokeFunction,
        canAccessFeature,
        canPerformAction,
        getPermissionAccessState,
        getFeatureAccessState,
        isFeatureVisible,
        refetch
    ]);
};

export const usePermissions = () => {
    const { session } = useAuth() as any;
    const role = isRole(session?.role) ? session.role as Role : null;
    return useRolePermissionsState(role);
};

export const usePermissionsForRole = (role: Role | null) => {
    return useRolePermissionsState(role);
};

export const usePermissionsByType = (permissionType: PermissionType, roleOverride?: Role | null) => {
    const { session } = useAuth() as any;
    const role = roleOverride ?? (isRole(session?.role) ? session.role as Role : null);
    const [permissions, setPermissions] = useState<RolePermission[]>([]);
    const [loading, setLoading] = useState<boolean>(Boolean(role));
    const [error, setError] = useState<string | null>(null);

    const loadPermissions = useCallback(async (forceRefresh = false) => {
        if (!role) {
            setPermissions([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (forceRefresh) {
                permissionService.clearRoleCache(role);
            }

            const nextPermissions = await permissionService.getPermissionsByType(role, permissionType);
            setPermissions(nextPermissions);
        } catch (nextError: any) {
            setError(nextError?.message || 'Failed to load permissions.');
            setPermissions([]);
        } finally {
            setLoading(false);
        }
    }, [permissionType, role]);

    useEffect(() => {
        void loadPermissions();
    }, [loadPermissions]);

    const refetch = useCallback(async () => {
        await loadPermissions(true);
    }, [loadPermissions]);

    return useMemo(() => ({
        permissions,
        loading,
        error,
        refetch
    }), [permissions, loading, error, refetch]);
};
