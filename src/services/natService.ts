import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams } from '../types/query';

// NAT pagination needs a reliable total so page controls stay accurate.
const PAGED_LIST_COUNT_MODE = 'exact';

export type NatListMode = 'applications' | 'completed' | 'test_takers';

export interface NatApplicationsFilters {
    search?: string;
    status?: string;
    course?: string;
    mode?: NatListMode;
}

const NAT_BASE_APPLICATION_COLUMNS = [
    'id',
    'created_at',
    'reference_id',
    'status',
    'first_name',
    'last_name',
    'middle_name',
    'suffix',
    'dob',
    'age',
    'place_of_birth',
    'nationality',
    'sex',
    'gender_identity',
    'civil_status',
    'street',
    'city',
    'province',
    'zip_code',
    'mobile',
    'email',
    'facebook_url',
    'reason',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'test_date',
    'test_time',
    'current_choice',
    'interview_date'
];

const NAT_ARCHIVE_BASE_APPLICATION_COLUMNS = NAT_BASE_APPLICATION_COLUMNS.filter((column) => column !== 'id');

const NAT_ARCHIVE_APPLICATION_COLUMNS = [
    'archive_id',
    'source_application_id',
    'archive_outcome',
    'archived_at',
    'activated_student_id',
    'activated_course',
    'source_status',
    ...NAT_ARCHIVE_BASE_APPLICATION_COLUMNS,
    'time_in',
    'time_out'
].join(', ');

let natAttendanceSupport: boolean | null = null;

const getNatApplicationColumns = (includeAttendance: boolean) => {
    const columns = includeAttendance
        ? [...NAT_BASE_APPLICATION_COLUMNS, 'time_in', 'time_out']
        : NAT_BASE_APPLICATION_COLUMNS;
    return columns.join(', ');
};

const getArchiveCompletionSortValue = (row: any) => {
    const firstAvailable = row?.completed_at
        || row?.archived_at
        || row?.created_at
        || null;
    const parsed = firstAvailable ? new Date(firstAvailable).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
};

const mapArchivedApplicationRow = (row: any) => ({
    ...row,
    id: row?.source_application_id || row?.archive_id,
    isArchivedRecord: true,
    completed_at: row?.archived_at || row?.created_at || null
});

const sortNatRowsLocally = (rows: any[], sort?: SortParams) => {
    const sortColumn = sort?.column || 'created_at';
    const direction = sort?.ascending === true ? 1 : -1;

    return [...rows].sort((left: any, right: any) => {
        let leftValue: any = left?.[sortColumn];
        let rightValue: any = right?.[sortColumn];

        if (sortColumn === 'created_at' || sortColumn === 'completed_at') {
            leftValue = getArchiveCompletionSortValue(left);
            rightValue = getArchiveCompletionSortValue(right);
        }

        if (leftValue === rightValue) return 0;
        if (leftValue == null) return -1 * direction;
        if (rightValue == null) return 1 * direction;
        return leftValue > rightValue ? direction : -1 * direction;
    });
};

const sliceNatRowsForPage = (rows: any[], pageParams?: PageParams) => {
    const { from, to } = resolvePageParams(pageParams);
    return rows.slice(from, to + 1);
};

export const isMissingNatAttendanceColumnsError = (error: any) => {
    const message = String('').toLowerCase();
    return message.includes('applications.time_in')
        || message.includes('applications.time_out')
        || message.includes('column time_in')
        || message.includes('column time_out');
};

export const getNatAttendanceSupport = async () => {
    if (natAttendanceSupport !== null) {
        return natAttendanceSupport;
    }

    const { error } = await supabase
        .from('applications')
        .select('time_in, time_out')
        .limit(1);

    if (!error) {
        natAttendanceSupport = true;
        return natAttendanceSupport;
    }

    if (isMissingNatAttendanceColumnsError(error)) {
        natAttendanceSupport = false;
        return natAttendanceSupport;
    }

    throw error;
};

const applySearch = (query: any, search?: string) => {
    const trimmed = String(search || '').trim();
    if (!trimmed) return query;
    const safe = trimmed.replace(/[%]/g, '');
    return query.or([
        `first_name.ilike.%${safe}%`,
        `last_name.ilike.%${safe}%`,
        `reference_id.ilike.%${safe}%`
    ].join(','));
};

const applyModeFilters = (query: any, mode: NatListMode, supportsAttendance: boolean) => {
    if (mode === 'applications') {
        return query
            .neq('status', 'Ongoing')
            .neq('status', 'Test Taken')
            .neq('status', 'Passed')
            .neq('status', 'Qualified for Interview (1st Choice)')
            .neq('status', 'Interview Scheduled')
            .neq('status', 'Failed')
            .neq('status', 'Approved for Enrollment')
            .not('status', 'ilike', '%Forwarded to%')
            .not('status', 'ilike', '%Application Unsuccessful%');
    }

    if (mode === 'completed') {
        return query.or([
            'status.eq.Passed',
            'status.eq.Qualified for Interview (1st Choice)',
            'status.eq.Interview Scheduled',
            'status.eq.Failed',
            'status.eq.Approved for Enrollment',
            'status.ilike.%Forwarded to%',
            'status.ilike.%Application Unsuccessful%'
        ].join(','));
    }

    if (supportsAttendance) {
        return query
            .not('time_in', 'is', null)
            .not('time_out', 'is', null);
    }

    return query.eq('status', 'Test Taken');
};

export const getApplicationsPage = async (
    filters?: NatApplicationsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    const mode = filters?.mode || 'applications';
    const shouldTryAttendance = natAttendanceSupport !== false;

    const buildQuery = (supportsAttendance: boolean) => {
        let query: any = supabase
            .from('applications')
            .select(getNatApplicationColumns(supportsAttendance), { count: PAGED_LIST_COUNT_MODE });

        query = applyModeFilters(query, mode, supportsAttendance);
        query = applySearch(query, filters?.search);

        if (filters?.status && filters.status !== 'All') {
            query = query.eq('status', filters.status);
        }

        if (filters?.course && filters.course !== 'All') {
            query = query.eq('priority_course', filters.course);
        }

        query = applySort(query, sort || { column: 'created_at', ascending: false });
        query = query.range(from, to);
        return query;
    };

    let { data, error, count } = await buildQuery(shouldTryAttendance);
    if (error && shouldTryAttendance && isMissingNatAttendanceColumnsError(error)) {
        natAttendanceSupport = false;
        ({ data, error, count } = await buildQuery(false));
    } else if (!error && shouldTryAttendance) {
        natAttendanceSupport = true;
    }

    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getCompletedApplicationsPage = async (
    filters?: NatApplicationsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const shouldTryAttendance = natAttendanceSupport !== false;

    const buildLiveQuery = (supportsAttendance: boolean) => {
        let query: any = supabase
            .from('applications')
            .select(getNatApplicationColumns(supportsAttendance));

        query = applyModeFilters(query, 'completed', supportsAttendance);
        return query;
    };

    let liveData: any[] | null = null;
    let liveError: any = null;
    ({ data: liveData, error: liveError } = await buildLiveQuery(shouldTryAttendance));
    if (liveError && shouldTryAttendance && isMissingNatAttendanceColumnsError(liveError)) {
        natAttendanceSupport = false;
        ({ data: liveData, error: liveError } = await buildLiveQuery(false));
    } else if (!liveError && shouldTryAttendance) {
        natAttendanceSupport = true;
    }

    if (liveError) throw liveError;

    const { data: archivedRows, error: archivedError } = await supabase
        .from('application_archives')
        .select(NAT_ARCHIVE_APPLICATION_COLUMNS)
        .order('archived_at', { ascending: false });

    if (archivedError) throw archivedError;

    const normalizedStatusFilter = String(filters?.status || '').trim();
    const combinedRows = [
        ...((liveData || []).map((row: any) => ({ ...row, isArchivedRecord: false, completed_at: row?.created_at || null }))),
        ...((archivedRows || []).map(mapArchivedApplicationRow))
    ].filter((row: any) => {
        if (!normalizedStatusFilter || normalizedStatusFilter === 'All') return true;
        return String(row?.status || '').trim() === normalizedStatusFilter;
    });

    const sortedRows = sortNatRowsLocally(
        combinedRows,
        sort || { column: 'completed_at', ascending: false }
    );
    const pagedRows = sliceNatRowsForPage(sortedRows, pageParams);
    return toPageResult(pagedRows, sortedRows.length, pageParams);
};

export const getNatSummaryApplications = async () => {
    const shouldTryAttendance = natAttendanceSupport !== false;
    const buildLiveQuery = (supportsAttendance: boolean) => supabase
        .from('applications')
        .select(getNatApplicationColumns(supportsAttendance));

    let liveData: any[] | null = null;
    let liveError: any = null;
    ({ data: liveData, error: liveError } = await buildLiveQuery(shouldTryAttendance));
    if (liveError && shouldTryAttendance && isMissingNatAttendanceColumnsError(liveError)) {
        natAttendanceSupport = false;
        ({ data: liveData, error: liveError } = await buildLiveQuery(false));
    } else if (!liveError && shouldTryAttendance) {
        natAttendanceSupport = true;
    }

    if (liveError) throw liveError;

    const { data: archivedRows, error: archivedError } = await supabase
        .from('application_archives')
        .select(NAT_ARCHIVE_APPLICATION_COLUMNS)
        .order('archived_at', { ascending: false });

    if (archivedError) throw archivedError;

    return {
        rows: [
            ...((liveData || []).map((row: any) => ({ ...row, isArchivedRecord: false, completed_at: row?.created_at || null }))),
            ...((archivedRows || []).map(mapArchivedApplicationRow))
        ],
        supportsAttendance: natAttendanceSupport !== false
    };
};

export const getAdmissionSchedules = async () => {
    const { data, error } = await supabase
        .from('admission_schedules')
        .select('id, date, venue, slots, is_active, time_windows')
        .order('date', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const getCoursesForNat = async () => {
    const { data, error } = await supabase
        .from('courses')
        .select('id, name, capacity, application_limit, status, department_id');
    if (error) throw error;
    return data || [];
};
