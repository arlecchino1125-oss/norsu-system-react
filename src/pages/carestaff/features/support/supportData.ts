import { supabase } from '../../../../lib/supabase';
import {
    CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES,
    SUPPORT_STATUS
} from '../../../../utils/workflow';

export const SUPPORT_REQUESTS_PAGE_SIZE = 12;

export const SUPPORT_REQUEST_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'student_name',
    'department',
    'support_type',
    'description',
    'documents_url',
    'status',
    'care_notes',
    'care_documents_url',
    'dept_notes',
    'resolution_notes'
].join(', ');

export type SupportCounts = Record<string, number>;

const sortByCreatedAt = (rows: any[]) =>
    [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

// Single source of truth for how a tab maps to a status filter — shared by the
// list query and the count fallback so the two can never drift apart.
export const applySupportTabFilter = (query: any, tab: string) => {
    if (tab === 'dept_updates') {
        return query.in('status', [...CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES]);
    }
    return query.eq('status', tab);
};

export const applySupportCategoryFilter = (query: any, category: string) => {
    if (category === 'All') return query;
    return query.ilike('support_type', `%${category}%`);
};

// The paginated list for the selected tab/category only. Keyed by tab + category
// + page upstream, so it legitimately refetches on those — but nothing else does.
export async function fetchSupportListPage(tab: string, category: string, page: number) {
    const from = (page - 1) * SUPPORT_REQUESTS_PAGE_SIZE;
    const to = from + SUPPORT_REQUESTS_PAGE_SIZE - 1;
    let query: any = supabase
        .from('support_requests')
        .select(SUPPORT_REQUEST_COLUMNS, { count: 'exact' });
    query = applySupportTabFilter(query, tab);
    query = applySupportCategoryFilter(query, category);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    return { reqs: sortByCreatedAt(data || []), total: count || 0 };
}

const bucketStatusCounts = (rows: { status: string; count: number | string }[]): SupportCounts => {
    const by = new Map(rows.map((r) => [r.status, Number(r.count) || 0]));
    const sum = (statuses: readonly string[]) => statuses.reduce((n, s) => n + (by.get(s) || 0), 0);
    return {
        [SUPPORT_STATUS.SUBMITTED]: by.get(SUPPORT_STATUS.SUBMITTED) || 0,
        [SUPPORT_STATUS.FORWARDED_TO_DEPT]: by.get(SUPPORT_STATUS.FORWARDED_TO_DEPT) || 0,
        [SUPPORT_STATUS.VISIT_SCHEDULED]: by.get(SUPPORT_STATUS.VISIT_SCHEDULED) || 0,
        dept_updates: sum(CARE_STAFF_SUPPORT_DEPT_UPDATE_STATUSES),
        [SUPPORT_STATUS.COMPLETED]: by.get(SUPPORT_STATUS.COMPLETED) || 0
    };
};

const countForTab = async (tab: string) => {
    let query: any = supabase.from('support_requests').select('id', { count: 'exact', head: true });
    query = applySupportTabFilter(query, tab);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
};

// ponytail: 5 head-count round-trips, used only when the grouped-count RPC isn't
// deployed yet. Drop this once the migration is applied in every environment.
async function fetchSupportCountsFallback(): Promise<SupportCounts> {
    const [submitted, forwarded, visitScheduled, deptUpdates, completed] = await Promise.all([
        countForTab(SUPPORT_STATUS.SUBMITTED),
        countForTab(SUPPORT_STATUS.FORWARDED_TO_DEPT),
        countForTab(SUPPORT_STATUS.VISIT_SCHEDULED),
        countForTab('dept_updates'),
        countForTab(SUPPORT_STATUS.COMPLETED)
    ]);
    return {
        [SUPPORT_STATUS.SUBMITTED]: submitted,
        [SUPPORT_STATUS.FORWARDED_TO_DEPT]: forwarded,
        [SUPPORT_STATUS.VISIT_SCHEDULED]: visitScheduled,
        dept_updates: deptUpdates,
        [SUPPORT_STATUS.COMPLETED]: completed
    };
};

// Tab/stat counts for the whole page in ONE request. Independent of the selected
// tab, category, and page, so switching any of them never refetches these.
// Prefers the grouped-count RPC (SECURITY INVOKER → RLS still scopes the counts);
// falls back to the per-status counts if the function isn't deployed, so a
// missing/denied RPC degrades to the previous behaviour instead of breaking.
export async function fetchSupportCounts(): Promise<SupportCounts> {
    const { data, error } = await (supabase as any).rpc('get_support_status_counts');
    if (!error && Array.isArray(data)) {
        return bucketStatusCounts(data);
    }
    return fetchSupportCountsFallback();
}
