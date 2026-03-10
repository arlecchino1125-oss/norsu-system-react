import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { AdmissionsFilters, PageParams, RequestFilters, SortParams, StudentFilters } from '../types/query';

const DEPT_STUDENT_COLUMNS = [
    'id',
    'student_id',
    'first_name',
    'last_name',
    'email',
    'year_level',
    'status',
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
    'longitude'
].join(', ');

const DEPT_ADMISSION_COLUMNS = [
    'id',
    'created_at',
    'student_id',
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
    'interview_date'
].join(', ');

const applyStudentFilters = (query: any, filters?: StudentFilters) => {
    let next = query;
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
        next = next.eq('status', filters.status);
    }

    const search = String(filters.search || '').trim();
    if (search) {
        const safe = search.replace(/[%]/g, '');
        next = next.or([
            `first_name.ilike.%${safe}%`,
            `last_name.ilike.%${safe}%`,
            `student_id.ilike.%${safe}%`,
            `email.ilike.%${safe}%`
        ].join(','));
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

    const search = String(filters.search || '').trim();
    if (search) {
        const safe = search.replace(/[%]/g, '');
        next = next.or([
            `student_name.ilike.%${safe}%`,
            `student_id.ilike.%${safe}%`
        ].join(','));
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
        .from('students')
        .select(DEPT_STUDENT_COLUMNS, { count: 'exact' });

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
        .select(DEPT_REQUEST_COLUMNS, { count: 'exact' });

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
        .select(DEPT_SUPPORT_COLUMNS, { count: 'exact' });

    query = applyRequestFilters(query, filters);
    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getEventsPage = async (
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('events')
        .select(DEPT_EVENT_COLUMNS, { count: 'exact' });

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getApplicationsPage = async (
    filters?: AdmissionsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('applications')
        .select(DEPT_ADMISSION_COLUMNS, { count: 'exact' });

    const statusList = Array.isArray(filters?.status)
        ? filters?.status
        : [
            'Qualified for Interview (1st Choice)',
            'Forwarded to 2nd Choice for Interview',
            'Forwarded to 3rd Choice for Interview',
            'Interview Scheduled'
        ];
    query = query.in('status', statusList);

    if (filters?.course && filters.course !== 'All') {
        query = query.or([
            `priority_course.eq.${filters.course}`,
            `alt_course_1.eq.${filters.course}`,
            `alt_course_2.eq.${filters.course}`
        ].join(','));
    }

    const search = String(filters?.search || '').trim();
    if (search) {
        const safe = search.replace(/[%]/g, '');
        query = query.or([
            `first_name.ilike.%${safe}%`,
            `last_name.ilike.%${safe}%`,
            `reference_id.ilike.%${safe}%`
        ].join(','));
    }

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getCourseDepartmentMap = async () => {
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

    return courseMap;
};
