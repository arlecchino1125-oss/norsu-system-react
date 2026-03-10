import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams } from '../types/query';

export type NatListMode = 'applications' | 'completed' | 'test_takers';

export interface NatApplicationsFilters {
    search?: string;
    status?: string;
    course?: string;
    mode?: NatListMode;
}

export const NAT_APPLICATION_COLUMNS = [
    'id',
    'created_at',
    'reference_id',
    'status',
    'first_name',
    'last_name',
    'middle_name',
    'suffix',
    'student_id',
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
    'school_last_attended',
    'year_level_applying',
    'reason',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'alt_course_3',
    'test_date',
    'test_time',
    'time_in',
    'time_out',
    'is_working_student',
    'working_student_type',
    'supporter',
    'supporter_contact',
    'is_pwd',
    'pwd_type',
    'is_indigenous',
    'indigenous_group',
    'witnessed_conflict',
    'is_solo_parent',
    'is_child_of_solo_parent'
].join(', ');

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

const applyModeFilters = (query: any, mode: NatListMode) => {
    if (mode === 'applications') {
        return query
            .neq('status', 'Qualified for Interview (1st Choice)')
            .neq('status', 'Failed')
            .neq('status', 'Approved for Enrollment')
            .not('status', 'ilike', '%Forwarded to%')
            .not('status', 'ilike', '%Application Unsuccessful%');
    }

    if (mode === 'completed') {
        return query.or([
            'status.eq.Qualified for Interview (1st Choice)',
            'status.eq.Failed',
            'status.eq.Approved for Enrollment',
            'status.ilike.%Forwarded to%',
            'status.ilike.%Application Unsuccessful%'
        ].join(','));
    }

    return query
        .not('time_in', 'is', null)
        .not('time_out', 'is', null);
};

export const getApplicationsPage = async (
    filters?: NatApplicationsFilters,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    const mode = filters?.mode || 'applications';

    let query: any = supabase
        .from('applications')
        .select(NAT_APPLICATION_COLUMNS, { count: 'exact' });

    query = applyModeFilters(query, mode);
    query = applySearch(query, filters?.search);

    if (filters?.status && filters.status !== 'All') {
        query = query.eq('status', filters.status);
    }

    if (filters?.course && filters.course !== 'All') {
        query = query.eq('priority_course', filters.course);
    }

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
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
        .select('id, name, application_limit, status, department_id');
    if (error) throw error;
    return data || [];
};

