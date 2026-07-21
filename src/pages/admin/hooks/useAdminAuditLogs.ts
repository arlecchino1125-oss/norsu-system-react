import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { sanitizeAuditSearchTerm } from '../utils';
import { isTrackedStaffAuditRole, TRACKED_STAFF_AUDIT_ROLES, type StaffAuditLogRow } from '../../../lib/staffAudit';
import type { AuditRoleFilter } from '../types';

const AUDIT_PAGE_SIZE = 25;
const AUDIT_SEARCH_DEBOUNCE_MS = 280;

export function useAdminAuditLogs(isAuthenticated: boolean, showToast: (msg: string, type?: string) => void) {
    const queryClient = useQueryClient();
    const [auditRoleFilter, setAuditRoleFilterState] = useState<AuditRoleFilter>('All');
    const [auditSearch, setAuditSearchState] = useState('');
    const [debouncedAuditSearch, setDebouncedAuditSearch] = useState('');
    const [auditPage, setAuditPage] = useState(1);

    // Jump back to page 1 right where the filter/search actually changes, instead of
    // reacting to the change afterward in a separate effect.
    const setAuditRoleFilter = useCallback((role: AuditRoleFilter) => {
        setAuditRoleFilterState(role);
        setAuditPage(1);
    }, []);

    const setAuditSearch = useCallback((search: string) => {
        setAuditSearchState(search);
        setAuditPage(1);
    }, []);

    // React Query config for audit log pagination, filtering, and search
    const { data: auditData, isLoading: auditLoading, error: auditQueryError } = useQuery({
        queryKey: ['admin_audit_logs', auditRoleFilter, debouncedAuditSearch, auditPage],
        queryFn: async () => {
            const normalizedSearch = sanitizeAuditSearchTerm(debouncedAuditSearch);
            const from = (auditPage - 1) * AUDIT_PAGE_SIZE;
            const to = from + AUDIT_PAGE_SIZE - 1;

            let query: any = supabase
                .from('audit_logs')
                .select('id, created_at, user_name, action, details, actor_role, actor_department, entity_table, entity_id', { count: 'exact' });

            if (auditRoleFilter === 'All') {
                query = query.in('actor_role', [...TRACKED_STAFF_AUDIT_ROLES]);
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
            return {
                logs: (data || []) as StaffAuditLogRow[],
                total: count || 0
            };
        },
        enabled: isAuthenticated
    });

    const auditLogs = auditData?.logs || [];
    const auditTotalCount = auditData?.total || 0;

    const fetchAuditLogs = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ['admin_audit_logs'] });
    }, [queryClient]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedAuditSearch(auditSearch);
        }, AUDIT_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [auditSearch]);

    // ponytail: the total row count only exists after the server responds, so there's
    // no way to clamp auditPage against it during render (unlike a client-already-loaded
    // list). Correcting it here, after the count is known, is a legitimate use of an
    // effect -- it's synchronizing local pagination with an external, async total.
    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(auditTotalCount / AUDIT_PAGE_SIZE));
        if (auditPage > totalPages) {
            setAuditPage(totalPages);
        }
    }, [auditPage, auditTotalCount]);

    useEffect(() => {
        if (auditQueryError) {
            showToast("Couldn't load staff audit logs.", 'error');
        }
    }, [auditQueryError, showToast]);

    // False positive: cleanup below does call supabase.removeChannel(channel) —
    // the detector doesn't recognize Supabase's client.removeChannel() cleanup
    // convention (it looks for .unsubscribe() on the subscribed object itself).
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup
    useEffect(() => {
        if (!isAuthenticated) return;

        let isMounted = true;
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

    return {
        auditLogs,
        auditLoading,
        auditTotalCount,
        auditRoleFilter,
        setAuditRoleFilter,
        auditSearch,
        setAuditSearch,
        auditPage,
        setAuditPage,
        fetchAuditLogs,
    };
}
