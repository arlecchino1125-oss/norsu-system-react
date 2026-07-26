import { supabase } from '../lib/supabase';
import { applySort, resolvePageParams, toPageResult } from './pagedQuery';
import { validateTextInput } from '../utils/inputSecurity';
import type { PageResult } from '../types/pagination';
import type { PageParams, SortParams } from '../types/query';
import type { Database } from '../types/database';

const PAGED_LIST_COUNT_MODE = 'planned';

const STUDENT_EVENT_COLUMNS = [
    'id',
    'created_at',
    'title',
    'description',
    'type',
    'location',
    'event_date',
    'event_time',
    'end_time',
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
    'registration_deadline',
    'require_photo',
    'require_geolocation'
].join(', ');

const STUDENT_FORM_COLUMNS = [
    'id',
    'created_at',
    'title',
    'description',
    'is_active'
].join(', ');

const STUDENT_COUNSELING_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'student_name',
    'request_type',
    'description',
    'department',
    'status',
    'course_year',
    'contact_number',
    'reason_for_referral',
    'personal_actions_taken',
    'date_duration_of_concern',
    'referred_by',
    'scheduled_date',
    'resolution_notes',
    'rating',
    'feedback'
].join(', ');

const STUDENT_SUPPORT_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'student_name',
    'department',
    'status',
    'support_type',
    'description',
    'documents_url',
    'care_notes',
    'care_documents_url',
    'dept_notes',
    'resolution_notes'
].join(', ');

const NOTIFICATION_COLUMNS = [
    'id',
    'created_at',
    'student_id',
    'message',
    'is_read'
].join(', ');

const ATTENDANCE_COLUMNS = [
    'id',
    'event_id',
    'student_id',
    'student_name',
    'checked_in_at',
    'time_in',
    'time_out',
    'proof_url',
    'latitude',
    'longitude',
    'department'
].join(', ');

export const getEventsPage = async (
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('events')
        .select(STUDENT_EVENT_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('is_archived', false);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getActiveFormsPage = async (
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('needs_assessment_forms')
        .select(STUDENT_FORM_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('is_active', true);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getCompletedFormIds = async (studentId: string) => {
    const { data, error } = await supabase
        .from('needs_assessment_submissions')
        .select('form_id')
        .eq('student_id', studentId);
    if (error) throw error;
    return (data || []).map((row: any) => row.form_id);
};

export const getStudentCounselingRequestsPage = async (
    studentId: string,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('counseling_requests')
        .select(STUDENT_COUNSELING_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('student_id', studentId);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getStudentSupportRequestsPage = async (
    studentId: string,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('support_requests')
        .select(STUDENT_SUPPORT_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('student_id', studentId);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getStudentNotificationsPage = async (
    studentId: string,
    pageParams?: PageParams,
    sort?: SortParams
): Promise<PageResult<any>> => {
    const { from, to } = resolvePageParams(pageParams);
    let query: any = supabase
        .from('notifications')
        .select(NOTIFICATION_COLUMNS, { count: PAGED_LIST_COUNT_MODE })
        .eq('student_id', studentId);

    query = applySort(query, sort || { column: 'created_at', ascending: false });
    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;
    return toPageResult(data, count, pageParams);
};

export const getActiveOfficeVisit = async (studentId: string) => {
    const { data, error } = await supabase
        .from('office_visits')
        .select('id, student_id, student_name, reason, time_in, time_out, status')
        .eq('student_id', studentId)
        .eq('status', 'Ongoing')
        .maybeSingle();
    if (error) throw error;
    return data;
};

export const getOfficeVisitReasons = async () => {
    const { data, error } = await supabase
        .from('office_visit_reasons')
        .select('id, reason, is_active')
        .eq('is_active', true)
        .order('reason');
    if (error) throw error;
    return data || [];
};

export const getAttendanceHistory = async (studentId: string) => {
    const { data, error } = await supabase
        .from('event_attendance')
        .select(ATTENDANCE_COLUMNS)
        .eq('student_id', studentId);
    if (error) throw error;
    return data || [];
};

export const getRatedEventIds = async (studentId: string) => {
    const { data, error } = await supabase
        .from('event_feedback')
        .select('event_id')
        .eq('student_id', studentId);
    if (error) throw error;
    return (data || []).map((row: any) => row.event_id);
};

export const createGeneralFeedback = async (payload: Record<string, unknown>) => {
    const regionCheck = validateTextInput(payload.region, 'shortText', { label: 'Region' });
    const serviceCheck = validateTextInput(payload.service_availed, 'mediumText', { label: 'Service availed' });
    const suggestionsCheck = validateTextInput(payload.suggestions, 'notes', { multiline: true, label: 'Suggestions' });
    const emailCheck = validateTextInput(payload.email, 'email', { label: 'Email' });
    const invalidText = [regionCheck, serviceCheck, suggestionsCheck, emailCheck].find((check) => !check.valid);

    if (invalidText?.error) {
        throw new Error(invalidText.error);
    }

    // payload is validated at runtime; student_id/student_name arrive via the spread
    const row = {
        ...payload,
        region: regionCheck.value || null,
        service_availed: serviceCheck.value || null,
        suggestions: suggestionsCheck.value || null,
        email: emailCheck.value || null,
    } as Database['public']['Tables']['general_feedback']['Insert'];

    const { error } = await supabase
        .from('general_feedback')
        .insert(row);
    if (error) throw error;
};
