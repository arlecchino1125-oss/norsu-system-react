import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams, StudentFilters } from '../types/query';

// Student population pagination needs an exact total so page controls stay accurate.
const PAGED_LIST_COUNT_MODE = 'exact';
const STUDENT_SEARCH_COLUMNS = [
    'first_name',
    'last_name',
    'student_id'
];
const STUDENT_SEARCH_RESERVED_CHARS = /[%*(),]/g;
const DEFAULT_STUDENT_POPULATION_OVERVIEW = {
    totalPopulation: 0,
    activeStudents: 0,
    archivedStudents: 0,
    schoolYears: [] as string[]
};

export interface CareStudentPopulationOverview {
    totalPopulation: number;
    activeStudents: number;
    archivedStudents: number;
    schoolYears: string[];
}

export interface CareStudentCourseYearCount {
    course: string;
    year_level: string;
    student_count: number;
}

export interface CareStudentBulkTarget {
    id: string | number;
    student_id?: string | null;
    course?: string | null;
    year_level?: string | null;
}

export const STUDENT_LIST_COLUMNS = [
    'id',
    'created_at',
    'student_id',
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
    'address',
    'street',
    'city',
    'province',
    'zip_code',
    'region',
    'mobile',
    'email',
    'emergency_contact',
    'facebook_url',
    'religion',
    'school_last_attended',
    'course',
    'year_level',
    'section',
    'department',
    'status',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'profile_picture_url',
    'supporter',
    'supporter_contact',
    'is_working_student',
    'working_student_type',
    'employer_name',
    'employer_address',
    'is_pwd',
    'pwd_number',
    'pwd_type',
    'disability_cause',
    'pwd_document_url',
    'is_indigenous',
    'indigenous_group',
    'ip_document_url',
    'is_four_ps_member',
    'four_ps_document_url',
    'is_rebel_returnee',
    'witnessed_conflict',
    'is_safe_in_community',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'solo_parent_document_url',
    'is_orphan',
    'orphan_cause',
    'is_homeless_citizen',
    'is_senior_citizen',
    'senior_citizen_document_url',
    'work_experiences',
    'mother_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'mother_occupation',
    'mother_status',
    'mother_contact',
    'mother_address',
    'father_name',
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'father_occupation',
    'father_status',
    'father_contact',
    'father_address',
    'parent_address',
    'num_brothers',
    'num_sisters',
    'parents_num_children',
    'birth_order',
    'birth_order_other',
    'spouse_name',
    'spouse_occupation',
    'spouse_employer_name',
    'spouse_employer_address',
    'spouse_contact',
    'num_children',
    'children_names_birthdates',
    'currently_pregnant',
    'guardian_name',
    'guardian_address',
    'guardian_contact',
    'guardian_relation',
    'emergency_name',
    'emergency_address',
    'emergency_relationship',
    'emergency_number',
    'elem_school',
    'elem_year_graduated',
    'junior_high_school',
    'junior_high_year_graduated',
    'senior_high_school',
    'senior_high_year_graduated',
    'college_school',
    'college_year_graduated',
    'honors_awards',
    'tesda_nc2_acquired',
    'eligibility_acquired',
    'special_trainings_attended',
    'extracurricular_activities',
    'holds_public_service_position',
    'public_service_position',
    'organizations_memberships',
    'sports_skills',
    'other_talents',
    'scholarships_availed',
    'has_been_criminally_charged',
    'has_been_convicted_of_crime',
    'criminal_charge_details',
    'crime_conviction_details',
    'region_other',
    'year_level_other',
    'working_student_type_other',
    'pwd_type_other',
    'indigenous_group_other',
    'orphan_cause_other',
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'course_year_archive',
    'course_year_profile_edited',
    'is_archived',
    'archived_at',
    'archived_reason',
    'archived_by',
    'archive_note'
].join(', ');

export const STUDENT_TABLE_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'first_name',
    'last_name',
    'course',
    'year_level',
    'section',
    'department',
    'status',
    'email',
    'profile_completed',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'course_year_archive',
    'course_year_profile_edited',
    'is_archived',
    'archived_at',
    'archived_reason',
    'archived_by',
    'archive_note'
].join(', ');

export const getStudentSearchTokens = (search?: string): string[] => {
    return String(search || '')
        .replace(STUDENT_SEARCH_RESERVED_CHARS, ' ')
        .split(/\s+/)
        .map(token => token.trim())
        .filter(Boolean);
};

const buildStudentSearchFilter = (token: string) => (
    STUDENT_SEARCH_COLUMNS
        .map(column => `${column}.ilike.%${token}%`)
        .join(',')
);

const normalizeSearchValue = (value: any) => String(value || '').trim().toLowerCase();

const getStudentVisibleSearchParts = (student: any) => {
    const firstName = normalizeSearchValue(student?.first_name);
    const lastName = normalizeSearchValue(student?.last_name);
    const studentId = normalizeSearchValue(student?.student_id);
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const lastFirstName = [lastName, firstName].filter(Boolean).join(' ');

    return {
        firstName,
        lastName,
        studentId,
        fullName,
        lastFirstName
    };
};

export const studentMatchesSearch = (student: any, search?: string): boolean => {
    const tokens = getStudentSearchTokens(search).map(token => token.toLowerCase());
    if (tokens.length === 0) return true;

    const { firstName, lastName, studentId } = getStudentVisibleSearchParts(student);
    const searchableValues = [firstName, lastName, studentId];

    return tokens.every(token => (
        searchableValues.some(value => value.includes(token))
    ));
};

const applyStudentFilters = (query: any, filters?: StudentFilters) => {
    let next = query.eq('is_archived', false);
    if (!filters) return next;

    if (filters.annotationStudentIds) {
        const ids = filters.annotationStudentIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0);
        next = ids.length > 0 ? next.in('id', ids) : next.eq('id', -1);
    }

    const searchTokens = getStudentSearchTokens(filters.search);
    if (searchTokens.length > 0) {
        searchTokens.forEach(token => {
            next = next.or(buildStudentSearchFilter(token));
        });
    }

    if (filters.status && filters.status !== 'All') {
        if (filters.status === 'Incomplete') {
            const fields = [
                'profile_picture_url',
                'student_id',
                'first_name',
                'last_name',
                'middle_name',
                'street',
                'city',
                'province',
                'zip_code',
                'region',
                'mobile',
                'dob',
                'sex',
                'gender_identity',
                'nationality',
                'facebook_url',
                'place_of_birth',
                'religion',
                'year_level',
                'department',
                'course',
                'civil_status'
            ];
            const orConditions = fields.flatMap(f => {
                if (f === 'dob') {
                    return [`${f}.is.null`];
                }
                return [`${f}.is.null`, `${f}.eq.`];
            });
            next = next.or(orConditions.join(','));
        } else if (filters.status === 'Active') {
            next = next.eq('status', 'Active');
            const fields = [
                'profile_picture_url',
                'student_id',
                'first_name',
                'last_name',
                'middle_name',
                'street',
                'city',
                'province',
                'zip_code',
                'region',
                'mobile',
                'dob',
                'sex',
                'gender_identity',
                'nationality',
                'facebook_url',
                'place_of_birth',
                'religion',
                'year_level',
                'department',
                'course',
                'civil_status'
            ];
            fields.forEach(f => {
                if (f === 'dob') {
                    next = next.not(f, 'is', null);
                } else {
                    next = next.not(f, 'is', null).neq(f, '');
                }
            });
        } else {
            next = next.eq('status', filters.status);
        }
    }

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

    return next;
};

const createStudentsQuery = (filters?: StudentFilters, countMode?: 'exact') => {
    const query: any = countMode
        ? supabase.from('students').select(STUDENT_TABLE_COLUMNS, { count: countMode })
        : supabase.from('students').select(STUDENT_TABLE_COLUMNS);
    return applyStudentFilters(query, filters);
};

const isMissingRpcError = (error: any, functionName: string) => {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return error?.code === '42883' || message.includes(functionName.toLowerCase());
};

const isMissingSearchRpcError = (error: any) => {
    return isMissingRpcError(error, 'search_care_students');
};

const getRestStudentsPage = async (
    filters?: StudentFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = createStudentsQuery(filters, PAGED_LIST_COUNT_MODE);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

const getRpcStudentsPage = async (
    filters?: StudentFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { page, pageSize } = resolvePageParams(pageParams);
    const search = getStudentSearchTokens(filters?.search).join(' ');
    const { data, error } = await supabase.rpc('search_care_students', {
        p_search: search,
        p_department: filters?.department || null,
        p_course: filters?.course || null,
        p_year_level: filters?.yearLevel || null,
        p_section: filters?.section || null,
        p_status: filters?.status || null,
        p_page: page,
        p_page_size: pageSize,
        p_sort_column: sort?.column || 'created_at',
        p_sort_ascending: sort?.ascending ?? false
    });

    if (error) {
        if (isMissingSearchRpcError(error)) {
            return getRestStudentsPage(filters, pageParams, sort);
        }
        throw error;
    }

    const rows = (data || []).map(({ total_count, ...row }: any) => row);
    const total = data?.length ? Number(data[0].total_count || 0) : 0;
    return toPageResult(rows, total, pageParams);
};

export const getStudentsPage = async (
    filters?: StudentFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    if (filters?.annotationStudentIds) {
        return getRestStudentsPage(filters, pageParams, sort);
    }

    return getRpcStudentsPage(filters, pageParams, sort);
};

const getStudentRowsByFilters = async (
    select: string,
    filters?: StudentFilters,
    order?: { column: string; ascending?: boolean }
): Promise<any[]> => {
    let allRows: any[] = [];
    let start = 0;
    const limit = 1000;

    while (true) {
        let query: any = supabase
            .from('students')
            .select(select);
        query = applyStudentFilters(query, filters);
        if (order) {
            query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        const { data, error } = await query.range(start, start + limit - 1);
        if (error) throw error;

        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);

        if (data.length < limit) break;
        start += limit;
    }

    return allRows;
};

export const getCareStudentBulkTargets = async (filters?: StudentFilters): Promise<CareStudentBulkTarget[]> => {
    return getStudentRowsByFilters('id, student_id, course, year_level', filters, { column: 'created_at', ascending: false });
};

export const getActiveStudentsForLocalFiltering = async () => {
    return getStudentRowsByFilters(STUDENT_TABLE_COLUMNS, undefined, { column: 'created_at', ascending: false });
};

export const getArchivedCareStudents = async () => {
    let allRows: any[] = [];
    let start = 0;
    const limit = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('students')
            .select(STUDENT_TABLE_COLUMNS)
            .eq('is_archived', true)
            .order('archived_at', { ascending: false })
            .range(start, start + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        allRows = allRows.concat(data);
        if (data.length < limit) break;
        start += limit;
    }

    return allRows;
};

export const getCareStudentSections = async (filters?: Pick<StudentFilters, 'course' | 'yearLevel'>): Promise<string[]> => {
    let query: any = supabase
        .from('students')
        .select('section')
        .eq('is_archived', false);

    if (filters?.course && filters.course !== 'All') {
        query = query.eq('course', filters.course);
    }
    if (filters?.yearLevel && filters.yearLevel !== 'All') {
        query = query.eq('year_level', filters.yearLevel);
    }

    const { data, error } = await query
        .order('section', { ascending: true })
        .range(0, 9999);
    if (error) throw error;

    return [...new Set<string>((data || [])
        .map((row: any) => String(row.section || '').trim())
        .filter(Boolean)
    )].sort();
};

const normalizeOverviewRow = (row: any): CareStudentPopulationOverview => ({
    totalPopulation: Number(row?.total_population || row?.totalPopulation || 0),
    activeStudents: Number(row?.active_students || row?.activeStudents || 0),
    archivedStudents: Number(row?.archived_students || row?.archivedStudents || 0),
    schoolYears: Array.isArray(row?.school_years)
        ? row.school_years.map((year: unknown) => String(year || '').trim()).filter(Boolean)
        : []
});

const deriveSchoolYearLabelFromArchiveEntry = (entry: any) => {
    const rawSchoolYear = String(entry?.school_year || '').trim();
    if (rawSchoolYear) {
        return rawSchoolYear.startsWith('AY') ? `SY${rawSchoolYear.slice(2)}` : rawSchoolYear;
    }

    const start = entry?.window_start ? new Date(entry.window_start) : null;
    const end = entry?.window_end ? new Date(entry.window_end) : null;
    if (start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return `SY ${Math.min(start.getFullYear(), end.getFullYear())}-${Math.max(start.getFullYear(), end.getFullYear())}`;
    }
    return '';
};

const getSchoolYearsFromArchiveRows = (rows: any[]) => {
    const years = new Set<string>();
    rows.forEach((row) => {
        const entries = Array.isArray(row?.course_year_archive) ? row.course_year_archive : [];
        entries.forEach((entry: any) => {
            const schoolYear = deriveSchoolYearLabelFromArchiveEntry(entry);
            if (schoolYear) years.add(schoolYear);
        });
    });
    return [...years].sort().reverse();
};

const getCareStudentPopulationOverviewRest = async (): Promise<CareStudentPopulationOverview> => {
    const [
        totalResult,
        activeResult,
        archivedResult,
        schoolYearResult
    ] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_archived', false),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_archived', false).eq('status', 'Active'),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('is_archived', true),
        supabase.from('students').select('course_year_archive').eq('is_archived', false).range(0, 9999)
    ]);

    const firstError = totalResult.error || activeResult.error || archivedResult.error || schoolYearResult.error;
    if (firstError) throw firstError;

    return {
        totalPopulation: Number(totalResult.count || 0),
        activeStudents: Number(activeResult.count || 0),
        archivedStudents: Number(archivedResult.count || 0),
        schoolYears: getSchoolYearsFromArchiveRows(schoolYearResult.data || [])
    };
};

export const getCareStudentPopulationOverview = async (): Promise<CareStudentPopulationOverview> => {
    const { data, error } = await supabase.rpc('get_care_student_population_overview');
    if (error) {
        if (isMissingRpcError(error, 'get_care_student_population_overview')) {
            return getCareStudentPopulationOverviewRest();
        }
        throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return row ? normalizeOverviewRow(row) : { ...DEFAULT_STUDENT_POPULATION_OVERVIEW };
};

export const getCareStudentCourseYearCounts = async (): Promise<CareStudentCourseYearCount[]> => {
    const { data, error } = await supabase.rpc('get_care_student_course_year_counts');
    if (error) {
        if (isMissingRpcError(error, 'get_care_student_course_year_counts')) {
            let rows: any[] = [];
            let start = 0;
            const limit = 1000;
            while (true) {
                const { data: batch, error: batchError } = await supabase
                    .from('students')
                    .select('course, year_level')
                    .eq('is_archived', false)
                    .eq('status', 'Active')
                    .order('course', { ascending: true })
                    .range(start, start + limit - 1);
                if (batchError) throw batchError;
                if (!batch || batch.length === 0) break;

                rows = rows.concat(batch);
                if (batch.length < limit) break;
                start += limit;
            }
            const counts = new Map<string, CareStudentCourseYearCount>();
            rows.forEach((row: any) => {
                const course = String(row.course || '');
                const yearLevel = String(row.year_level || '');
                const key = `${course}\u0000${yearLevel}`;
                const current = counts.get(key) || { course, year_level: yearLevel, student_count: 0 };
                current.student_count += 1;
                counts.set(key, current);
            });
            return [...counts.values()];
        }
        throw error;
    }

    return (data || []).map((row: any) => ({
        course: String(row.course || ''),
        year_level: String(row.year_level || ''),
        student_count: Number(row.student_count || 0)
    }));
};

export const getAllStudentsForExport = async () => {
    const { count, error: countError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('is_archived', false);

    if (countError) throw countError;
    const totalCount = count || 0;
    if (totalCount === 0) return [];

    const limit = 1000;
    const totalPages = Math.ceil(totalCount / limit);
    const allStudents: any[] = [];
    const concurrencyLimit = 5;

    for (let i = 0; i < totalPages; i += concurrencyLimit) {
        const pageIndices = Array.from(
            { length: Math.min(concurrencyLimit, totalPages - i) },
            (_, idx) => i + idx
        );

        const promises = pageIndices.map((pageIdx) => {
            const start = pageIdx * limit;
            return supabase
                .from('students')
                .select(STUDENT_LIST_COLUMNS)
                .eq('is_archived', false)
                .order('last_name', { ascending: true })
                .range(start, start + limit - 1);
        });

        const results = await Promise.all(promises);
        for (const res of results) {
            if (res.error) throw res.error;
            if (res.data) {
                allStudents.push(...res.data);
            }
        }
    }

    // Ensure they are correctly sorted by last name in case of any concurrent pagination overlap/ordering nuances
    allStudents.sort((a, b) => {
        const nameA = String(a.last_name || '').toLowerCase();
        const nameB = String(b.last_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return allStudents;
};

export const getStudentByStudentId = async (studentId: string) => {
    const { data, error } = await supabase
        .from('students')
        .select(STUDENT_LIST_COLUMNS)
        .eq('student_id', studentId)
        .maybeSingle();
    if (error) throw error;
    return data;
};

// Registrar/Department Head export path. Reads students_directory, which exposes
// only non-sensitive columns, so the sensitive column set (STUDENT_LIST_COLUMNS)
// never reaches these roles. Care Staff keep getAllStudentsForExport (full data).
export const getDirectoryStudentsForExport = async () => {
    const limit = 1000;
    let start = 0;
    const rows: any[] = [];

    while (true) {
        const { data, error } = await supabase
            .from('students_directory')
            .select('*')
            .eq('is_archived', false)
            .order('last_name', { ascending: true })
            .range(start, start + limit - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;

        rows.push(...data);
        if (data.length < limit) break;
        start += limit;
    }

    return rows;
};

export const getCoursesWithDepartments = async () => {
    const { data, error } = await supabase
        .from('courses')
        .select('id, name, capacity, application_limit, status, department_id, departments(name)')
        .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const getDepartments = async () => {
    const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).filter((department: any) => !department?.is_archived);
};

export const getNatApplicationCourseCounts = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('priority_course');
    if (error) throw error;
    return data || [];
};
