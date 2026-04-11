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

const AUDIT_ENTITY_LABELS: Record<string, string> = {
    admission_schedules: 'admission schedule',
    applications: 'application',
    counseling_requests: 'counseling request',
    courses: 'course',
    enrolled_students: 'enrolled student',
    events: 'event',
    forms: 'form',
    nat_requirements: 'NAT requirement',
    office_visit_reasons: 'office visit reason',
    questions: 'question',
    scholarships: 'scholarship',
    staff_accounts: 'staff account',
    student_activation_settings: 'student activation setting',
    students: 'student',
    support_requests: 'support request'
};

const formatStatusLabel = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return '';

    if (/^[A-Z0-9_ ]+$/.test(trimmed)) {
        return formatKeyLabel(trimmed.toLowerCase());
    }

    const normalized = trimmed.replace(/_/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatAuditEntityName = (parsed: Record<string, unknown>) => {
    const table = String(parsed.table || '').trim();
    const label = String(parsed.label || '').trim();
    const recordId = String(parsed.record_id || '').trim();
    const baseLabel = AUDIT_ENTITY_LABELS[table] || formatKeyLabel(table).toLowerCase();

    if (label) {
        if (table === 'questions' && /^\d+$/.test(label)) {
            return `Question ${label}`;
        }
        return label;
    }

    if (recordId && baseLabel) {
        return `${formatKeyLabel(baseLabel)} ${recordId}`;
    }

    return baseLabel ? formatKeyLabel(baseLabel) : '';
};

const formatDbTriggerDetails = (parsed: Record<string, unknown>) => {
    const entityName = formatAuditEntityName(parsed);
    const nextStatus = String(parsed.status || '').trim();
    const previousStatus = String(parsed.previous_status || '').trim();

    if (entityName && nextStatus && nextStatus !== previousStatus) {
        return `${entityName} (${formatStatusLabel(nextStatus)})`;
    }

    if (entityName) {
        return entityName;
    }

    if (nextStatus && nextStatus !== previousStatus) {
        return `Status changed to ${formatStatusLabel(nextStatus)}`;
    }

    const summary = String(parsed.summary || '').trim();
    return summary || '-';
};

export const formatAuditDetails = (details: unknown) => {
    if (!details) return '-';

    const parsed = parseAuditDetails(details);
    if (parsed) {
        if (String(parsed.source || '').trim() === 'db_trigger') {
            return formatDbTriggerDetails(parsed);
        }

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
    }

    if (typeof details === 'string') return details.trim() || '-';

    return String(details);
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
