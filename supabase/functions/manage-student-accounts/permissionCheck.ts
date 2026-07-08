import { createClient } from 'npm:@supabase/supabase-js@2';

export type PermissionType = 'table' | 'function' | 'feature' | 'action';
export type PermissionStatus = 'enabled' | 'hidden' | 'maintenance' | 'coming_soon';

type PermissionRow = {
  permission_key?: string | null;
  is_allowed?: boolean | null;
  status?: PermissionStatus | null;
  notice_text?: string | null;
};

const clientCache = new Map<string, any>();

const getPermissionClient = (serviceKey: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const normalizedServiceKey = String(serviceKey || '').trim();

  if (!supabaseUrl || !normalizedServiceKey) {
    throw new Error('Missing Supabase service role configuration.');
  }

  const cacheKey = `${supabaseUrl}:${normalizedServiceKey.slice(0, 18)}`;
  if (!clientCache.has(cacheKey)) {
    clientCache.set(cacheKey, createClient(supabaseUrl, normalizedServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }));
  }

  return clientCache.get(cacheKey);
};

const normalizePermissionError = (message: string, status = 403) => {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
};

const normalizePermissionStatus = (status: string | null | undefined, isAllowed: boolean) => {
  const normalizedStatus = String(status || '').trim();
  if (
    normalizedStatus === 'enabled'
    || normalizedStatus === 'hidden'
    || normalizedStatus === 'maintenance'
    || normalizedStatus === 'coming_soon'
  ) {
    return normalizedStatus as PermissionStatus;
  }

  return isAllowed ? 'enabled' : 'hidden';
};

const resolvePermissionRow = (rows: PermissionRow[], permissionKey: string) => {
  const exactPermission = rows.find((entry) =>
    String(entry?.permission_key || '').trim() === permissionKey
  );

  if (exactPermission) {
    return exactPermission;
  }

  return rows.find((entry) =>
    String(entry?.permission_key || '').trim() === '*'
  ) || null;
};

const isPermissionRowAccessible = (row: PermissionRow | null) => {
  if (!row) {
    return false;
  }

  return Boolean(row.is_allowed) && normalizePermissionStatus(row.status, Boolean(row.is_allowed)) === 'enabled';
};

const buildPermissionErrorMessage = (
  row: PermissionRow | null,
  permissionType: PermissionType,
  permissionKey: string
) => {
  const customNotice = String(row?.notice_text || '').trim();
  if (customNotice) {
    return customNotice;
  }

  const normalizedStatus = normalizePermissionStatus(row?.status, Boolean(row?.is_allowed));
  if (normalizedStatus === 'maintenance') {
    return `${permissionKey} is currently under maintenance.`;
  }

  if (normalizedStatus === 'coming_soon') {
    return `${permissionKey} is not available yet. Please check back later.`;
  }

  return `Access denied. Missing ${permissionType} permission: ${permissionKey}.`;
};

export const checkPermission = async (
  serviceKey: string,
  role: string,
  permissionType: PermissionType,
  permissionKey: string
): Promise<boolean> => {
  const normalizedRole = String(role || '').trim();
  const normalizedPermissionKey = String(permissionKey || '').trim();

  if (!normalizedRole || !normalizedPermissionKey) {
    return false;
  }

  if (normalizedRole === 'Admin') {
    return true;
  }

  const client = getPermissionClient(serviceKey);
  const { data, error } = await client
    .from('role_permissions')
    .select('permission_key, is_allowed, status, notice_text')
    .eq('role', normalizedRole)
    .eq('permission_type', permissionType)
    .in('permission_key', [normalizedPermissionKey, '*']);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data as PermissionRow[] : [];
  return isPermissionRowAccessible(resolvePermissionRow(rows, normalizedPermissionKey));
};

export const requirePermission = async (
  serviceKey: string,
  role: string,
  permissionType: PermissionType,
  permissionKey: string
): Promise<void> => {
  const normalizedRole = String(role || '').trim();
  const normalizedPermissionKey = String(permissionKey || '').trim();

  if (normalizedRole === 'Admin') {
    return;
  }

  const client = getPermissionClient(serviceKey);
  const { data, error } = await client
    .from('role_permissions')
    .select('permission_key, is_allowed, status, notice_text')
    .eq('role', normalizedRole)
    .eq('permission_type', permissionType)
    .in('permission_key', [normalizedPermissionKey, '*']);

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? data as PermissionRow[] : [];
  const resolvedRow = resolvePermissionRow(rows, normalizedPermissionKey);
  const allowed = isPermissionRowAccessible(resolvedRow);

  if (!allowed) {
    throw normalizePermissionError(
      buildPermissionErrorMessage(resolvedRow, permissionType, normalizedPermissionKey),
      403
    );
  }
};
