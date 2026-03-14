import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams, StudentFilters } from '../types/query';

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
    'gender',
    'sex',
    'gender_identity',
    'civil_status',
    'address',
    'street',
    'city',
    'province',
    'zip_code',
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
    'is_pwd',
    'pwd_type',
    'is_indigenous',
    'indigenous_group',
    'witnessed_conflict',
    'is_safe_in_community',
    'is_solo_parent',
    'is_child_of_solo_parent',
    'mother_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'mother_occupation',
    'mother_contact',
    'father_name',
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'father_occupation',
    'father_contact',
    'parent_address',
    'num_brothers',
    'num_sisters',
    'birth_order',
    'spouse_name',
    'spouse_occupation',
    'num_children',
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
    'extracurricular_activities',
    'scholarships_availed',
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'course_year_archive'
].join(', ');

const applyStudentFilters = (query: any, filters?: StudentFilters) => {
    let next = query;
    if (!filters) return next;

    const trimmedSearch = String(filters.search || '').trim();
    if (trimmedSearch) {
        const safe = trimmedSearch.replace(/[%]/g, '');
        next = next.or([
            `first_name.ilike.%${safe}%`,
            `last_name.ilike.%${safe}%`,
            `student_id.ilike.%${safe}%`
        ].join(','));
    }

    if (filters.status && filters.status !== 'All') {
        next = next.eq('status', filters.status);
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

export const getStudentsPage = async (
    filters?: StudentFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('students')
        .select(STUDENT_LIST_COLUMNS, { count: 'exact' });

    query = applyStudentFilters(query, filters);
    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getStudentIdsByFilters = async (filters?: StudentFilters): Promise<string[]> => {
    let query: any = supabase
        .from('students')
        .select('id');
    query = applyStudentFilters(query, filters);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((row: any) => String(row.id)).filter(Boolean);
};

export const getAllStudentsForExport = async () => {
    const { data, error } = await supabase
        .from('students')
        .select(STUDENT_LIST_COLUMNS)
        .order('last_name', { ascending: true });
    if (error) throw error;
    return data || [];
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

export const getEnrollmentKeys = async () => {
    const { data, error } = await supabase
        .from('enrolled_students')
        .select('student_id, course, year_level, is_used, status, assigned_to_email, created_at')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getCoursesWithDepartments = async () => {
    const { data, error } = await supabase
        .from('courses')
        .select('id, name, application_limit, status, department_id, departments(name)')
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
    return data || [];
};

export const getNatApplicationCourseCounts = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('priority_course');
    if (error) throw error;
    return data || [];
};
