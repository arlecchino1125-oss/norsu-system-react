import { supabase } from '../lib/supabase';
import { recordStaffAuditAction, type StaffAuditSessionLike } from '../lib/staffAudit';
import {
    buildPermissionRecord,
    createResolvedPermissionState,
    PERMISSION_DESCRIPTIONS,
    resolvePermissionDetails,
    resolvePermissionState,
    ROLES,
    type PermissionRecord,
    type PermissionStatus,
    type PermissionType,
    type ResolvedPermissionState,
    type Role,
    type RolePermission
} from '../types/permissions';

type PermissionCacheEntry = {
    expiresAt: number;
    rows: RolePermission[];
};

export type PermissionUpdate = {
    // `role` selects which role a permission row applies to, not the caller's own role.
    // Writes to role_permissions are gated by the role_permissions_admin_manage RLS policy
    // (WITH CHECK is_admin(), derived server-side from auth.uid()), so a non-admin caller's
    // write is rejected regardless of the payload.
    // react-doctor-disable-next-line react-doctor/supabase-client-owned-authz-field
    role: Role;
    permissionType: PermissionType;
    permissionKey: string;
    isAllowed: boolean;
    status?: PermissionStatus;
    noticeText?: string | null;
    description?: string;
};

class PermissionService {
    private readonly cacheTtlMs = 5 * 60 * 1000;
    private readonly cachePrefix = 'norsu_role_permissions_cache_v2';
    private readonly memoryCache = new Map<Role, PermissionCacheEntry>();

    private getCacheKey(role: Role) {
        return `${this.cachePrefix}:${role}`;
    }

    private canUseLocalStorage() {
        return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    }

    private sanitizeNoticeText(value: string | null | undefined) {
        const normalizedValue = String(value || '').trim();
        return normalizedValue || null;
    }

    private getAdminFallbackRows(): RolePermission[] {
        return (['table', 'function', 'feature', 'action'] as PermissionType[]).map((permissionType) => ({
            role: 'Admin',
            permission_type: permissionType,
            permission_key: '*',
            is_allowed: true,
            status: 'enabled',
            notice_text: null,
            description: `Wildcard ${permissionType} access for Admin.`
        }));
    }

    private readLocalCache(role: Role) {
        if (!this.canUseLocalStorage()) {
            return null;
        }

        try {
            const storedValue = window.localStorage.getItem(this.getCacheKey(role));
            if (!storedValue) {
                return null;
            }

            const parsed = JSON.parse(storedValue) as PermissionCacheEntry | null;
            if (!parsed?.expiresAt || parsed.expiresAt <= Date.now() || !Array.isArray(parsed.rows)) {
                window.localStorage.removeItem(this.getCacheKey(role));
                return null;
            }

            return parsed;
        } catch {
            window.localStorage.removeItem(this.getCacheKey(role));
            return null;
        }
    }

    private writeCache(role: Role, rows: RolePermission[]) {
        const cacheEntry: PermissionCacheEntry = {
            expiresAt: Date.now() + this.cacheTtlMs,
            rows
        };

        this.memoryCache.set(role, cacheEntry);

        if (!this.canUseLocalStorage()) {
            return;
        }

        try {
            window.localStorage.setItem(this.getCacheKey(role), JSON.stringify(cacheEntry));
        } catch {
            // Ignore storage quota or serialization issues and keep memory cache only.
        }
    }

    private invalidateRoleCache(role: Role) {
        this.memoryCache.delete(role);

        if (!this.canUseLocalStorage()) {
            return;
        }

        window.localStorage.removeItem(this.getCacheKey(role));
    }

    private async getRolePermissionRows(role: Role, forceRefresh = false): Promise<RolePermission[]> {
        if (!forceRefresh) {
            const memoryCached = this.memoryCache.get(role);
            if (memoryCached && memoryCached.expiresAt > Date.now()) {
                return memoryCached.rows;
            }

            const localCached = this.readLocalCache(role);
            if (localCached) {
                this.memoryCache.set(role, localCached);
                return localCached.rows;
            }
        }

        const { data, error } = await supabase
            .from('role_permissions')
            .select('id, role, permission_type, permission_key, is_allowed, status, notice_text, description, created_at, created_by, updated_at')
            .eq('role', role)
            .order('permission_type', { ascending: true })
            .order('permission_key', { ascending: true });

        if (error) {
            throw error;
        }

        const rows = ((data || []) as RolePermission[]).length > 0
            ? (data || []) as RolePermission[]
            : (role === 'Admin' ? this.getAdminFallbackRows() : []);

        this.writeCache(role, rows);
        return rows;
    }

    private async resolvePermission(role: Role, permissionType: PermissionType, permissionKey: string) {
        if (role === 'Admin') {
            return true;
        }

        const permissionRecord = await this.getPermissionsForRole(role);
        return resolvePermissionState(permissionRecord, permissionType, permissionKey);
    }

    getPermissionDescription(permissionType: PermissionType, permissionKey: string) {
        return PERMISSION_DESCRIPTIONS[permissionType]?.[permissionKey]
            || `Custom ${permissionType} permission for ${permissionKey}.`;
    }

    async getPermissionsForRole(role: Role): Promise<PermissionRecord> {
        const rows = await this.getRolePermissionRows(role);
        return buildPermissionRecord(rows);
    }

    async getPermissionsByType(role: Role, permissionType: PermissionType): Promise<RolePermission[]> {
        const rows = await this.getRolePermissionRows(role);
        return rows.filter((permission) => permission.permission_type === permissionType);
    }

    async getPermissionAccess(role: Role, permissionType: PermissionType, permissionKey: string): Promise<ResolvedPermissionState> {
        if (role === 'Admin') {
            return createResolvedPermissionState({
                isAllowed: true,
                status: 'enabled',
                description: `Wildcard ${permissionType} access for Admin.`
            });
        }

        const permissionRecord = await this.getPermissionsForRole(role);
        return resolvePermissionDetails(permissionRecord, permissionType, String(permissionKey || '').trim());
    }

    async hasPermission(role: Role, permission: string): Promise<boolean> {
        const normalizedPermission = String(permission || '').trim();
        if (!normalizedPermission) {
            return false;
        }

        const separatorIndex = normalizedPermission.indexOf(':');
        if (separatorIndex > 0) {
            const rawPermissionType = normalizedPermission.slice(0, separatorIndex) as PermissionType;
            const permissionKey = normalizedPermission.slice(separatorIndex + 1);
            if (['table', 'function', 'feature', 'action'].includes(rawPermissionType)) {
                return this.resolvePermission(role, rawPermissionType, permissionKey);
            }
        }

        const permissionTypes: PermissionType[] = ['table', 'function', 'feature', 'action'];
        for (const permissionType of permissionTypes) {
            if (await this.resolvePermission(role, permissionType, normalizedPermission)) {
                return true;
            }
        }

        return false;
    }

    async canAccessTable(role: Role, table: string): Promise<boolean> {
        return this.resolvePermission(role, 'table', String(table || '').trim());
    }

    async canInvokeFunction(role: Role, functionName: string): Promise<boolean> {
        return this.resolvePermission(role, 'function', String(functionName || '').trim());
    }

    async canAccessFeature(role: Role, feature: string): Promise<boolean> {
        return this.resolvePermission(role, 'feature', String(feature || '').trim());
    }

    async canPerformAction(role: Role, action: string): Promise<boolean> {
        return this.resolvePermission(role, 'action', String(action || '').trim());
    }

    async updatePermission({
        role,
        permissionType,
        permissionKey,
        isAllowed,
        status,
        noticeText,
        description
    }: PermissionUpdate, actor?: StaffAuditSessionLike | null): Promise<boolean> {
        const normalizedPermissionKey = String(permissionKey || '').trim();
        if (!normalizedPermissionKey || role === 'Admin') {
            return false;
        }

        const nextStatus = status ?? (isAllowed ? 'enabled' : 'hidden');
        const { error } = await supabase
            .from('role_permissions')
            .upsert([{
                role,
                permission_type: permissionType,
                permission_key: normalizedPermissionKey,
                is_allowed: Boolean(isAllowed),
                status: nextStatus,
                notice_text: this.sanitizeNoticeText(noticeText),
                description: description ?? this.getPermissionDescription(permissionType, normalizedPermissionKey)
            }], {
                onConflict: 'role,permission_type,permission_key'
            });

        if (error) {
            console.error('Failed to update role permission:', error);
            return false;
        }

        this.invalidateRoleCache(role);
        await this.getRolePermissionRows(role, true);

        void recordStaffAuditAction(actor, {
            action: 'Updated role permission',
            entityTable: 'role_permissions',
            entityId: `${role}:${permissionType}:${normalizedPermissionKey}`,
            details: {
                summary: `${actor?.full_name || actor?.username || 'Admin'} set ${role} -> ${permissionType}:${normalizedPermissionKey} to ${isAllowed ? 'allowed' : 'denied'} (${nextStatus}).`,
                role,
                permission_type: permissionType,
                permission_key: normalizedPermissionKey,
                is_allowed: Boolean(isAllowed),
                status: nextStatus
            }
        }).catch((auditError) => {
            console.error('Failed to record role permission audit log:', auditError);
        });

        return true;
    }

    async bulkUpdatePermissions(updates: PermissionUpdate[], actor?: StaffAuditSessionLike | null): Promise<boolean> {
        if (!Array.isArray(updates) || updates.length === 0) {
            return true;
        }

        const sanitizedUpdates = updates.flatMap((update) => {
            if (!update || update.role === 'Admin') return [];
            const sanitizedUpdate = {
                role: update.role,
                permission_type: update.permissionType,
                permission_key: String(update.permissionKey || '').trim(),
                is_allowed: Boolean(update.isAllowed),
                status: update.status ?? (update.isAllowed ? 'enabled' : 'hidden'),
                notice_text: this.sanitizeNoticeText(update.noticeText),
                description: update.description ?? this.getPermissionDescription(update.permissionType, update.permissionKey)
            };
            return sanitizedUpdate.permission_key ? [sanitizedUpdate] : [];
        });

        if (sanitizedUpdates.length === 0) {
            return false;
        }

        const { error } = await supabase
            .from('role_permissions')
            .upsert(sanitizedUpdates, {
                onConflict: 'role,permission_type,permission_key'
            });

        if (error) {
            console.error('Failed to bulk update role permissions:', error);
            return false;
        }

        const affectedRoles = Array.from(new Set(sanitizedUpdates.map((update) => update.role as Role)));
        await Promise.all(affectedRoles.map(async (role) => {
            this.invalidateRoleCache(role);
            await this.getRolePermissionRows(role, true);
        }));

        void recordStaffAuditAction(actor, {
            action: 'Bulk updated role permissions',
            entityTable: 'role_permissions',
            details: {
                summary: `${actor?.full_name || actor?.username || 'Admin'} bulk-updated ${sanitizedUpdates.length} permission(s) for ${affectedRoles.join(', ')}.`,
                count: sanitizedUpdates.length,
                roles: affectedRoles
            }
        }).catch((auditError) => {
            console.error('Failed to record bulk role permission audit log:', auditError);
        });

        return true;
    }

    async resetRoleToDefaults(role: Role, actor?: StaffAuditSessionLike | null): Promise<boolean> {
        if (role === 'Admin') {
            return false;
        }

        const { error } = await supabase.rpc('reset_role_permissions_to_defaults', {
            target_role: role
        });

        if (error) {
            console.error('Failed to reset role permissions:', error);
            return false;
        }

        this.invalidateRoleCache(role);
        await this.getRolePermissionRows(role, true);

        void recordStaffAuditAction(actor, {
            action: 'Reset role permissions to defaults',
            entityTable: 'role_permissions',
            entityId: role,
            details: {
                summary: `${actor?.full_name || actor?.username || 'Admin'} reset ${role} permissions to the seeded defaults.`,
                role
            }
        }).catch((auditError) => {
            console.error('Failed to record permission reset audit log:', auditError);
        });

        return true;
    }

    clearRoleCache(role?: Role) {
        if (role) {
            this.invalidateRoleCache(role);
            return;
        }

        this.memoryCache.clear();

        if (!this.canUseLocalStorage()) {
            return;
        }

        (ROLES as readonly Role[]).forEach((nextRole) => {
            window.localStorage.removeItem(this.getCacheKey(nextRole));
        });
    }
}

export const permissionService = new PermissionService();
