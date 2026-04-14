const TRACKED_ROLE_SET = new Set(['Care Staff', 'Department Head']);

export type StaffAuditActor = {
  authUserId?: string | null;
  staffAccountId?: string | null;
  role?: string | null;
  displayName?: string | null;
  department?: string | null;
};

export type StaffAuditEntry = {
  action: string;
  details?: Record<string, unknown> | null;
  entityTable?: string | null;
  entityId?: string | number | null;
};

export const writeStaffAuditLog = async (
  adminClient: any,
  actor: StaffAuditActor | null | undefined,
  entry: StaffAuditEntry,
) => {
  const actorRole = String(actor?.role || '').trim();
  const action = String(entry?.action || '').trim();

  if (!TRACKED_ROLE_SET.has(actorRole) || !action) {
    return false;
  }

  try {
    const { error } = await adminClient
      .from('audit_logs')
      .insert([
        {
          user_name: String(actor?.displayName || actorRole).trim() || actorRole,
          action,
          details: {
            source: 'edge_function',
            ...(entry?.details || {}),
          },
          actor_role: actorRole,
          actor_id: String(actor?.staffAccountId || actor?.authUserId || '').trim() || null,
          actor_department: String(actor?.department || '').trim() || null,
          entity_table: String(entry?.entityTable || '').trim() || null,
          entity_id: entry?.entityId !== undefined && entry?.entityId !== null
            ? String(entry.entityId).trim() || null
            : null,
        },
      ]);

    if (error) {
      console.error('[staff-audit] Failed to insert audit log:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[staff-audit] Unexpected audit log failure:', error);
    return false;
  }
};
