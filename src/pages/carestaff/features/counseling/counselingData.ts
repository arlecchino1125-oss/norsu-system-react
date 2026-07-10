import { supabase } from '../../../../lib/supabase';
import {
    COUNSELING_AWAITING_DEPT_STATUSES,
    COUNSELING_CALENDAR_STATUSES,
    COUNSELING_STATUS
} from '../../../../utils/workflow';

export const COUNSELING_REQUESTS_PAGE_SIZE = 12;

const COUNSELING_REQUEST_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'student_name',
    'request_type',
    'description',
    'status',
    'department',
    'course_year',
    'contact_number',
    'scheduled_date',
    'resolution_notes',
    'confidential_notes',
    'feedback',
    'reason_for_referral',
    'personal_actions_taken',
    'date_duration_of_concern',
    'referred_by',
    'referrer_contact_number',
    'relationship_with_student',
    'actions_made',
    'date_duration_of_observations',
    'referrer_signature'
].join(', ');

export type CounselingCounts = Record<string, number>;

const sortByCreatedAt = (rows: any[]) =>
    [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

// Single source of truth for how a tab maps to a status filter — shared by the
// list query and the count fallback so the two can never drift apart.
export const applyCounselingTabFilter = (query: any, tab: string) => {
    if (tab === COUNSELING_STATUS.SUBMITTED) {
        return query.in('status', [...COUNSELING_AWAITING_DEPT_STATUSES]);
    }
    if (tab === 'Calendar') {
        return query.in('status', [...COUNSELING_CALENDAR_STATUSES]);
    }
    return query.eq('status', tab);
};

// The paginated list for the selected tab only. Keyed by tab + page upstream,
// so it legitimately refetches on tab/page change — but nothing else does.
export async function fetchCounselingListPage(tab: string, page: number) {
    const from = (page - 1) * COUNSELING_REQUESTS_PAGE_SIZE;
    const to = from + COUNSELING_REQUESTS_PAGE_SIZE - 1;
    let query: any = supabase
        .from('counseling_requests')
        .select(COUNSELING_REQUEST_COLUMNS, { count: 'exact' });
    query = applyCounselingTabFilter(query, tab);
    const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
    if (error) throw error;
    return { reqs: sortByCreatedAt(data || []), total: count || 0 };
}

const bucketStatusCounts = (rows: { status: string; count: number | string }[]): CounselingCounts => {
    const by = new Map(rows.map((r) => [r.status, Number(r.count) || 0]));
    const sum = (statuses: readonly string[]) => statuses.reduce((n, s) => n + (by.get(s) || 0), 0);
    const staffScheduled = by.get(COUNSELING_STATUS.STAFF_SCHEDULED) || 0;
    const deptScheduled = by.get(COUNSELING_STATUS.SCHEDULED) || 0;
    return {
        awaitingDept: sum(COUNSELING_AWAITING_DEPT_STATUSES),
        [COUNSELING_STATUS.REFERRED]: by.get(COUNSELING_STATUS.REFERRED) || 0,
        [COUNSELING_STATUS.STAFF_SCHEDULED]: staffScheduled,
        [COUNSELING_STATUS.SCHEDULED]: deptScheduled,
        [COUNSELING_STATUS.COMPLETED]: by.get(COUNSELING_STATUS.COMPLETED) || 0,
        [COUNSELING_STATUS.REJECTED]: by.get(COUNSELING_STATUS.REJECTED) || 0,
        Calendar: staffScheduled + deptScheduled
    };
};

const countForTab = async (tab: string) => {
    let query: any = supabase.from('counseling_requests').select('id', { count: 'exact', head: true });
    query = applyCounselingTabFilter(query, tab);
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
};

// ponytail: 6 head-count round-trips, used only when the grouped-count RPC isn't
// deployed yet. Drop this once the migration is applied in every environment.
async function fetchCounselingCountsFallback(): Promise<CounselingCounts> {
    const [awaitingDept, referred, staffScheduled, deptScheduled, completed, rejected] = await Promise.all([
        countForTab(COUNSELING_STATUS.SUBMITTED),
        countForTab(COUNSELING_STATUS.REFERRED),
        countForTab(COUNSELING_STATUS.STAFF_SCHEDULED),
        countForTab(COUNSELING_STATUS.SCHEDULED),
        countForTab(COUNSELING_STATUS.COMPLETED),
        countForTab(COUNSELING_STATUS.REJECTED)
    ]);
    return {
        awaitingDept,
        [COUNSELING_STATUS.REFERRED]: referred,
        [COUNSELING_STATUS.STAFF_SCHEDULED]: staffScheduled,
        [COUNSELING_STATUS.SCHEDULED]: deptScheduled,
        [COUNSELING_STATUS.COMPLETED]: completed,
        [COUNSELING_STATUS.REJECTED]: rejected,
        Calendar: staffScheduled + deptScheduled
    };
}

// Tab/stat counts for the whole page in ONE request. Independent of the selected
// tab, so switching tabs never refetches these. Prefers the grouped-count RPC
// (SECURITY INVOKER → RLS still scopes the counts); falls back to the per-status
// counts if the function isn't deployed, so a missing/denied RPC degrades to the
// previous behaviour instead of breaking the badges.
export async function fetchCounselingCounts(): Promise<CounselingCounts> {
    const { data, error } = await supabase.rpc('get_counseling_status_counts');
    if (!error && Array.isArray(data)) {
        return bucketStatusCounts(data);
    }
    return fetchCounselingCountsFallback();
}
