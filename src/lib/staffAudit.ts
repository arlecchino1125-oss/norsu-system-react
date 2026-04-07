import { supabase } from './supabase';

export const TRACKED_STAFF_AUDIT_ROLES = ['Care Staff', 'Department Head'] as const;

export type TrackedStaffAuditRole = (typeof TRACKED_STAFF_AUDIT_ROLES)[number];

export type StaffAuditSessionLike = {
    id?: string | number | null;
    full_name?: string | null;
    username?: string | null;
    role?: string | null;
    department?: string | null;
};

export type StaffAuditEntry = {
    action: string;
    details?: unknown;
    entityTable?: string | null;
    entityId?: string | number | null;
};

export type StaffAuditLogRow = {
    id?: string | number;
    created_at?: string | null;
    user_name?: string | null;
    action?: string | null;
    details?: unknown;
    actor_role?: string | null;
    actor_id?: string | null;
    actor_department?: string | null;
    entity_table?: string | null;
    entity_id?: string | null;
};

const TRACKED_ROLE_SET = new Set<string>(TRACKED_STAFF_AUDIT_ROLES);

export const isTrackedStaffAuditRole = (role: unknown): role is TrackedStaffAuditRole =>
    TRACKED_ROLE_SET.has(String(role || '').trim());

export const parseAuditDetails = (details: unknown): Record<string, unknown> | null => {
    if (!details) return null;
    if (typeof details === 'object' && !Array.isArray(details)) {
        return details as Record<string, unknown>;
    }
    if (typeof details !== 'string') return null;

    try {
        const parsed = JSON.parse(details);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
};

const formatKeyLabel = (value: string) =>
    value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatAuditDetails = (details: unknown) => {
    if (!details) return '-';
    if (typeof details === 'string') return details.trim() || '-';

    const parsed = parseAuditDetails(details);
    if (!parsed) return String(details);

    const summary = String(parsed.summary || '').trim();
    if (summary) return summary;

    const visibleEntries = Object.entries(parsed)
        .filter(([key, value]) =>
            key !== 'source'
            && key !== 'operation'
            && value !== null
            && value !== undefined
            && String(value).trim() !== ''
        )
        .slice(0, 5);

    if (visibleEntries.length === 0) return '-';

    return visibleEntries
        .map(([key, value]) => `${formatKeyLabel(key)}: ${String(value)}`)
        .join(' | ');
};

export const recordStaffAuditAction = async (
    session: StaffAuditSessionLike | null | undefined,
    entry: StaffAuditEntry
) => {
    const normalizedRole = String(session?.role || '').trim();
    if (!isTrackedStaffAuditRole(normalizedRole)) {
        return false;
    }

    const payload = {
        user_name: String(session?.full_name || session?.username || normalizedRole).trim() || normalizedRole,
        action: String(entry.action || '').trim(),
        details: entry.details ?? null,
        actor_role: normalizedRole,
        actor_id: session?.id ? String(session.id) : null,
        actor_department: String(session?.department || '').trim() || null,
        entity_table: entry.entityTable ? String(entry.entityTable).trim() : null,
        entity_id: entry.entityId !== undefined && entry.entityId !== null
            ? String(entry.entityId).trim()
            : null
    };

    if (!payload.action) {
        return false;
    }

    const { error } = await supabase.from('audit_logs').insert([payload]);
    if (error) {
        throw error;
    }

    return true;
};
