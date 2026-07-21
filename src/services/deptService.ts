import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { AdmissionsFilters, PageParams, RequestFilters, SortParams, StudentFilters } from '../types/query';
import { readSessionCache, writeSessionCache } from '../utils/sessionCache';

const PAGED_LIST_COUNT_MODE = 'planned';
const DEPT_STUDENT_COUNT_MODE = 'exact';

const DEPT_STUDENT_COLUMNS = [
    'id',
    'student_id',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'email',
    'mobile',
    'sex',
    'address',
    'street',
    'city',
    'province',
    'zip_code',
    'year_level',
    'status',
    'profile_completed',
    'department',
    'course',
    'section'
].join(', ');

const DEPT_REQUEST_COLUMNS = [
    'id',
    'student_id',
    'student_name',
    'department',
    'status',
    'created_at',
    'scheduled_date',
    'resolution_notes',
    'request_type',
    'description',
    'reason_for_referral',
    'personal_actions_taken',
    'date_duration_of_concern',
    'actions_made',
    'date_duration_of_observations',
    'referrer_contact_number',
    'relationship_with_student',
    'rating',
    'feedback',
    'course_year',
    'contact_number',
    'referred_by',
    'confidential_notes',
    'referrer_signature'
].join(', ');

const DEPT_SUPPORT_COLUMNS = [
    'id',
    'student_id',
    'student_name',
    'department',
    'status',
    'created_at',
    'support_type',
    'description',
    'documents_url',
    'care_notes',
    'care_documents_url',
    'dept_notes',
    'resolution_notes'
].join(', ');

const DEPT_EVENT_COLUMNS = [
    'id',
    'title',
    'description',
    'type',
    'location',
    'event_date',
    'event_time',
    'end_time',
    'created_at',
    'attendees',
    'latitude',
    'longitude',
    'participation_mode',
    'audience_type',
    'audience_departments',
    'audience_courses',
    'audience_year_levels',
    'audience_sections',
    'attendance_required',
    'allow_walk_ins',
    'capacity',
    'registration_deadline'
].join(', ');

const DEPT_ADMISSION_COLUMNS = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'reference_id',
    'email',
    'mobile',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'current_choice',
    'status',
    'interview_date',
    'interview_venue',
    'interview_panel',
    'interview_queue_status'
].join(', ');

const DEFAULT_ADMISSIONS_STATUSES = [
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview',
    'Interview Scheduled'
];

const DEPARTMENT_ADMISSIONS_RPC_CACHE_KEY = 'dept.admissions.rpc.available';
// Only static lookups are cached here. Paged lists are cached by React Query,
// whose invalidation (realtime, refresh, mutations) must not be masked by a
// second cache layer in this service.
const DEPT_LOOKUP_CACHE_TTL_MS = 10 * 60 * 1000;

const readDepartmentAdmissionsRpcAvailability = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const cached = window.sessionStorage.getItem(DEPARTMENT_ADMISSIONS_RPC_CACHE_KEY);
    if (cached === 'true') return true;
    if (cached === 'false') return false;
    return null;
};

const writeDepartmentAdmissionsRpcAvailability = (value: boolean | null) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (value == null) {
        window.sessionStorage.removeItem(DEPARTMENT_ADMISSIONS_RPC_CACHE_KEY);
        return;
    }

    window.sessionStorage.setItem(DEPARTMENT_ADMISSIONS_RPC_CACHE_KEY, value ? 'true' : 'false');
};

let departmentAdmissionsRpcAvailability: boolean | null = readDepartmentAdmissionsRpcAvailability();

const buildDeptCacheKey = (scope: string, payload: unknown) => `dept-cache:${scope}:${JSON.stringify(payload)}`;

const readDeptCache = <T>(scope: string, payload: unknown) =>
    readSessionCache<T>(buildDeptCacheKey(scope, payload));

const writeDeptCache = <T>(scope: string, payload: unknown, value: T, ttlMs: number) =>
    writeSessionCache(buildDeptCacheKey(scope, payload), value, ttlMs);

const sanitizePostgrestSearchTerm = (value: string) =>
    value
        .replace(/[%,()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const applyStudentFilters = (query: any, filters?: StudentFilters) => {
    let next = query.eq('is_archived', false);
    if (!filters) return next;

    if (filters.department && filters.department !== 'All') {
        next = next.eq('department', filters.department);
    }

    if (filters.course && filters.course !== 'All') {
        next = next.eq('course', filters.course);
    }

    if (filters.yearLevel && filters.yearLevel !== 'All') {
        next = next.eq('year_level', filters.yearLevel);
    }

    if (filters.section && filters.section !== 'All') {
        next = next.eq('section', filters.section);
    }

    if (filters.status && filters.status !== 'All') {
        if (filters.status === 'Incomplete') {
            next = next.or('profile_completed.eq.false,profile_completed.is.null');
        } else {
            next = next.eq('status', filters.status);
        }
    }

    const search = String(filters.search || '').trim();
    if (search) {
        const safe = sanitizePostgrestSearchTerm(search);
        if (safe) {
            next = next.or([
                `first_name.ilike.%${safe}%`,
                `last_name.ilike.%${safe}%`,
                `student_id.ilike.%${safe}%`,
                `email.ilike.%${safe}%`
            ].join(','));
        }
    }

    return next;
};

const applyRequestFilters = (query: any, filters?: RequestFilters) => {
    let next = query;
    if (!filters) return next;

    if (filters.department) {
        next = next.eq('department', filters.department);
    }

    if (filters.studentId) {
        next = next.eq('student_id', filters.studentId);
    }

    if (Array.isArray(filters.status) && filters.status.length > 0) {
        next = next.in('status', filters.status);
    } else if (typeof filters.status === 'string' && filters.status !== 'All') {
        next = next.eq('status', filters.status);
    }

    const scheduledOn = String(filters.scheduledOn || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(scheduledOn)) {
        // scheduled_date is written as a naive local timestamp, so plain date
        // boundaries (no timezone) match the storage convention
        const nextDay = new Date(`${scheduledOn}T00:00:00`);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayKey = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
        next = next.gte('scheduled_date', `${scheduledOn} 00:00:00`).lt('scheduled_date', `${nextDayKey} 00:00:00`);
    }

    const search = String(filters.search || '').trim();
    if (search) {
        const safe = sanitizePostgrestSearchTerm(search);
        if (safe) {
            next = next.or([
                `student_name.ilike.%${safe}%`,
                `student_id.ilike.%${safe}%`
            ].join(','));
        }
    }

    return next;
};

export const getStudentsPage = async (
    filters?: StudentFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('students_directory')
        .select(DEPT_STUDENT_COLUMNS, { count: DEPT_STUDENT_COUNT_MODE });

    query = applyStudentFilters(query, filters);
    query = applySort(query, sort || { column: 'last_name', ascending: true });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getCounselingRequestsPage = async (
    filters?: RequestFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('counseling_requests')
        .select(DEPT_REQUEST_COLUMNS, { count: PAGED_LIST_COUNT_MODE });

    query = applyRequestFilters(query, filters);
    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getSupportRequestsPage = async (
    filters?: RequestFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('support_requests')
        .select(DEPT_SUPPORT_COLUMNS, { count: PAGED_LIST_COUNT_MODE });

    query = applyRequestFilters(query, filters);
    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getEventsPage = async (
    pageParams?: PageParams,
    sort?: SortParams,
    filters?: { fromDate?: string }
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('events')
        .select(DEPT_EVENT_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('is_archived', false);

    const fromDate = String(filters?.fromDate || '').trim();
    if (fromDate) {
        query = query.or(`event_date.is.null,event_date.gte.${fromDate}`);
    }

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

const applyAdmissionsFilters = (query: any, filters?: AdmissionsFilters) => {
    let next = query;

    const statusList = Array.isArray(filters?.status)
        ? filters?.status
        : DEFAULT_ADMISSIONS_STATUSES;
    next = next.in('status', statusList);

    const search = String(filters?.search || '').trim();
    if (search) {
        const safe = sanitizePostgrestSearchTerm(search);
        if (safe) {
            next = next.or([
                `first_name.ilike.%${safe}%`,
                `last_name.ilike.%${safe}%`,
                `reference_id.ilike.%${safe}%`
            ].join(','));
        }
    }

    return next;
};

const sortRows = (rows: any[], sort?: SortParams) => {
    const activeSort = sort || { column: 'created_at', ascending: false };
    const direction = activeSort.ascending ? 1 : -1;

    return rows.toSorted((left: any, right: any) => {
        const leftValue = left?.[activeSort.column];
        const rightValue = right?.[activeSort.column];

        if (leftValue === rightValue) return 0;
        if (leftValue == null) return -1 * direction;
        if (rightValue == null) return 1 * direction;
        return leftValue > rightValue ? direction : -1 * direction;
    });
};

export const getDepartmentCourseNames = async (departmentName: string) => {
    const normalizedDepartment = String(departmentName || '').trim();
    if (!normalizedDepartment) {
        return [] as string[];
    }

    const cached = readDeptCache<string[]>('department-course-names', normalizedDepartment);
    if (cached) {
        return cached;
    }

    const { data: department, error: departmentError } = await supabase
        .from('departments')
        .select('*')
        .eq('name', normalizedDepartment)
        .maybeSingle();

    if (departmentError) throw departmentError;
    if (!department?.id || department?.is_archived) {
        return [] as string[];
    }

    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('name')
        .eq('department_id', department.id);

    if (courseError) throw courseError;

    const result = (courses || []).flatMap((course: any) => {
        const name = String(course?.name || '').trim();
        return name ? [name] : [];
    });
    writeDeptCache('department-course-names', normalizedDepartment, result, DEPT_LOOKUP_CACHE_TTL_MS);
    return result;
};

const fetchDepartmentApplicationSlice = async (
    courseColumn: 'priority_course' | 'alt_course_1' | 'alt_course_2',
    courseNames: string[],
    filters: AdmissionsFilters | undefined,
    choiceCondition: { isNull?: boolean; value?: number }
) => {
    if (courseNames.length === 0) {
        return [] as any[];
    }

    let query: any = supabase
        .from('applications')
        .select(DEPT_ADMISSION_COLUMNS);

    query = applyAdmissionsFilters(query, filters);
    query = query.in(courseColumn, courseNames);

    if (choiceCondition.isNull) {
        query = query.is('current_choice', null);
    } else if (typeof choiceCondition.value === 'number') {
        query = query.eq('current_choice', choiceCondition.value);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
};

const getDepartmentApplicationsPageFallback = async (
    departmentName: string,
    filters?: AdmissionsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    let departmentCourseNames = await getDepartmentCourseNames(departmentName);

    if (filters?.course && filters.course !== 'All') {
        departmentCourseNames = departmentCourseNames.filter((course) => course === filters.course);
    }

    if (departmentCourseNames.length === 0) {
        return toPageResult([], 0, pageParams);
    }

    const [firstChoiceRows, unassignedChoiceRows, secondChoiceRows, thirdChoiceRows] = await Promise.all([
        fetchDepartmentApplicationSlice('priority_course', departmentCourseNames, filters, { value: 1 }),
        fetchDepartmentApplicationSlice('priority_course', departmentCourseNames, filters, { isNull: true }),
        fetchDepartmentApplicationSlice('alt_course_1', departmentCourseNames, filters, { value: 2 }),
        fetchDepartmentApplicationSlice('alt_course_2', departmentCourseNames, filters, { value: 3 })
    ]);

    const mergedById = new Map<string, any>();
    [
        ...firstChoiceRows,
        ...unassignedChoiceRows,
        ...secondChoiceRows,
        ...thirdChoiceRows
    ].forEach((row: any) => {
        if (row?.id != null) {
            mergedById.set(String(row.id), row);
        }
    });

    const mergedRows = sortRows(Array.from(mergedById.values()), sort || { column: 'created_at', ascending: false });
    const { from, to } = resolvePageParams(pageParams);
    const pagedRows = mergedRows.slice(from, to + 1);

    return toPageResult(pagedRows, mergedRows.length, pageParams);
};

const getDepartmentApplicationsPageViaRpc = async (
    departmentName: string,
    filters?: AdmissionsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const activeSort = sort || { column: 'created_at', ascending: false };
    if (activeSort.column !== 'created_at') {
        return getDepartmentApplicationsPageFallback(departmentName, filters, pageParams, sort);
    }

    const { from, pageSize } = resolvePageParams(pageParams);
    const trimmedSearch = String(filters?.search || '').trim();
    const requestedStatusList = Array.isArray(filters?.status) && filters.status.length > 0
        ? filters.status
        : DEFAULT_ADMISSIONS_STATUSES;

    const { data, error } = await supabase.rpc('get_department_applications_page', {
        p_department_name: String(departmentName || '').trim(),
        p_statuses: requestedStatusList,
        p_search: trimmedSearch || null,
        p_course: filters?.course && filters.course !== 'All' ? filters.course : null,
        p_limit: pageSize,
        p_offset: from,
        p_sort_ascending: activeSort.ascending ?? false
    });

    if (error) {
        throw error;
    }

    const rows = (data || []).map((row: any) => {
        const { total_count, ...application } = row || {};
        return application;
    });
    const total = Number(data?.[0]?.total_count || 0);

    return toPageResult(rows, total, pageParams);
};

export const getDepartmentApplicationsPage = async (
    departmentName: string,
    filters?: AdmissionsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    if (departmentAdmissionsRpcAvailability === false) {
        return getDepartmentApplicationsPageFallback(departmentName, filters, pageParams, sort);
    }

    try {
        const result = await getDepartmentApplicationsPageViaRpc(departmentName, filters, pageParams, sort);
        departmentAdmissionsRpcAvailability = true;
        writeDepartmentAdmissionsRpcAvailability(true);
        return result;
    } catch (error: any) {
        const isMissingRpc = String(error?.code || '').trim() === 'PGRST202'
            || String(error?.message || '').includes('Could not find the function public.get_department_applications_page');

        if (isMissingRpc) {
            departmentAdmissionsRpcAvailability = false;
            writeDepartmentAdmissionsRpcAvailability(false);
        } else {
            console.warn('Department admissions RPC unavailable, falling back to legacy query path.', error);
        }

        return getDepartmentApplicationsPageFallback(departmentName, filters, pageParams, sort);
    }
};

export const getDepartmentInterviewQueue = async (
    departmentName: string,
    interviewDate?: string
) => {
    const departmentCourseNames = await getDepartmentCourseNames(departmentName);
    if (departmentCourseNames.length === 0) {
        return [] as any[];
    }

    const filters: AdmissionsFilters = { status: ['Interview Scheduled', 'Approved for Enrollment'] };
    const [firstChoiceRows, unassignedChoiceRows, secondChoiceRows, thirdChoiceRows] = await Promise.all([
        fetchDepartmentApplicationSlice('priority_course', departmentCourseNames, filters, { value: 1 }),
        fetchDepartmentApplicationSlice('priority_course', departmentCourseNames, filters, { isNull: true }),
        fetchDepartmentApplicationSlice('alt_course_1', departmentCourseNames, filters, { value: 2 }),
        fetchDepartmentApplicationSlice('alt_course_2', departmentCourseNames, filters, { value: 3 })
    ]);

    const mergedById = new Map<string, any>();
    [
        ...firstChoiceRows,
        ...unassignedChoiceRows,
        ...secondChoiceRows,
        ...thirdChoiceRows
    ].forEach((row: any) => {
        if (row?.id != null) {
            mergedById.set(String(row.id), row);
        }
    });

    const normalizedDate = String(interviewDate || '').trim();
    const rows = Array.from(mergedById.values()).filter((row: any) => {
            const rowInterviewDate = String(row?.interview_date || '').trim();
            if (!rowInterviewDate) return false;
            const matchesDate = !normalizedDate || rowInterviewDate.startsWith(normalizedDate);
            return matchesDate && !(
                String(row?.status || '').trim() === 'Interview Scheduled'
                && String(row?.interview_queue_status || '').trim() === 'Absent'
            );
        });

    return sortRows(rows, { column: 'interview_date', ascending: true });
};

export const getCourseDepartmentMap = async () => {
    const cached = readDeptCache<Record<string, string>>('course-department-map', {});
    if (cached) {
        return cached;
    }

    const { data: coursesData, error: courseError } = await supabase
        .from('courses')
        .select('id, name, department_id');
    if (courseError) throw courseError;

    const { data: deptsData, error: deptError } = await supabase
        .from('departments')
        .select('id, name');
    if (deptError) throw deptError;

    const deptMap: Record<string, string> = {};
    (deptsData || []).forEach((dept: any) => {
        deptMap[String(dept.id)] = dept.name;
    });

    const courseMap: Record<string, string> = {};
    (coursesData || []).forEach((course: any) => {
        const key = String(course.name || '').trim().toLowerCase();
        courseMap[key] = deptMap[String(course.department_id)] || 'Unassigned';
    });

    writeDeptCache('course-department-map', {}, courseMap, DEPT_LOOKUP_CACHE_TTL_MS);
    return courseMap;
};
