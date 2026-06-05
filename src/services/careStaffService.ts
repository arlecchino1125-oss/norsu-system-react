import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams, StudentFilters } from '../types/query';

// Student population pagination needs an exact total so page controls stay accurate.
const PAGED_LIST_COUNT_MODE = 'exact';

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
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'course_year_archive',
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
    'middle_name',
    'suffix',
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
    'is_archived',
    'archived_at',
    'archived_reason',
    'archived_by',
    'archive_note'
].join(', ');

const applyStudentFilters = (query: any, filters?: StudentFilters) => {
    let next = query.eq('is_archived', false);
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
        .select(STUDENT_TABLE_COLUMNS, { count: PAGED_LIST_COUNT_MODE });

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
        .eq('is_archived', false)
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
    return (data || []).filter((department: any) => !department?.is_archived);
};

export const getNatApplicationCourseCounts = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('priority_course');
    if (error) throw error;
    return data || [];
};
