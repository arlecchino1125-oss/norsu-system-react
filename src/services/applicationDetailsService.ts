import { supabase } from '../lib/supabase';

const APPLICATION_DETAIL_COLUMNS = [
    'id',
    'reference_id',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'email',
    'mobile',
    'civil_status',
    'nationality',
    'street',
    'city',
    'province',
    'zip_code',
    'place_of_birth',
    'age',
    'sex',
    'gender_identity',
    'facebook_url',
    'dob',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'current_choice',
    'status',
    'reason',
    'created_at',
    'test_date',
    'test_time',
    'time_in',
    'time_out',
    'interview_date',
    'interview_queue_status',
    'interview_venue',
    'interview_panel'
].join(', ');

const APPLICATION_ARCHIVE_DETAIL_FIELDS = APPLICATION_DETAIL_COLUMNS
    .split(', ')
    .filter((column) => column !== 'id');

const APPLICATION_ARCHIVE_DETAIL_COLUMNS = [
    'archive_id',
    'source_application_id',
    'archive_outcome',
    'archived_at',
    'activated_student_id',
    'activated_course',
    'source_status',
    ...APPLICATION_ARCHIVE_DETAIL_FIELDS
].join(', ');

export const getApplicationDetailsById = async (applicationId: string) => {
    const normalizedApplicationId = String(applicationId || '').trim();
    if (!normalizedApplicationId) {
        throw new Error('Application ID is required.');
    }

    const { data, error } = await supabase
        .from('applications')
        .select(APPLICATION_DETAIL_COLUMNS)
        .eq('id', normalizedApplicationId)
        .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const { data: archivedData, error: archivedError } = await supabase
        .from('application_archives')
        .select(APPLICATION_ARCHIVE_DETAIL_COLUMNS)
        .eq('source_application_id', normalizedApplicationId)
        .maybeSingle();

    if (archivedError) throw archivedError;
    if (!archivedData) throw new Error('Applicant details not found.');
    const archivedRecord: any = archivedData;

    return {
        ...archivedRecord,
        id: archivedRecord.source_application_id || normalizedApplicationId,
        isArchivedRecord: true,
        completed_at: archivedRecord.archived_at || archivedRecord.created_at || null
    };
};
