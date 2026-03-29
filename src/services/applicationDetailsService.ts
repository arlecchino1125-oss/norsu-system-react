import { supabase } from '../lib/supabase';

const APPLICATION_DETAIL_COLUMNS = [
    'id',
    'reference_id',
    'first_name',
    'middle_name',
    'last_name',
    'suffix',
    'student_id',
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
    if (!data) throw new Error('Applicant details not found.');
    return data;
};
