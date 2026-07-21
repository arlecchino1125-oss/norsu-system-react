import { supabase } from './supabase';

export type StaffProfileRecord = {
    id?: string | number | null;
    username?: string | null;
    full_name?: string | null;
    role?: string | null;
    department?: string | null;
    email?: string | null;
    created_at?: string | null;
    auth_user_id?: string | null;
    is_archived?: boolean | null;
    archived_at?: string | null;
    archive_note?: string | null;
    [key: string]: unknown;
};
const isStaffProfileRecord = (value: unknown): value is StaffProfileRecord =>
    Boolean(value) && typeof value === 'object' && 'role' in value;
const STAFF_PROFILE_SELECT = '*';
const STUDENT_BOOTSTRAP_SELECT = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'middle_name',
    'student_id',
    'course',
    'year_level',
    'status',
    'department',
    'email',
    'mobile',
    'section',
    'region',
    'profile_picture_url',
    'profile_completed',
    'has_seen_tour',
    'course_year_update_required',
    'course_year_window_start',
    'course_year_window_end',
    'course_year_confirmed_at',
    'auth_user_id'
].join(', ');
const STUDENT_PROFILE_SELECT = [
    'id',
    'created_at',
    'first_name',
    'last_name',
    'student_id',
    'course',
    'year_level',
    'status',
    'department',
    'middle_name',
    'dob',
    'civil_status',
    'nationality',
    'email',
    'mobile',
    'street',
    'city',
    'province',
    'zip_code',
    'region',
    'suffix',
    'place_of_birth',
    'age',
    'sex',
    'gender_identity',
    'facebook_url',
    'is_working_student',
    'working_student_type',
    'employer_name',
    'employer_address',
    'supporter',
    'supporter_contact',
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
    'is_solo_parent',
    'is_child_of_solo_parent',
    'solo_parent_document_url',
    'is_orphan',
    'orphan_cause',
    'is_homeless_citizen',
    'is_senior_citizen',
    'senior_citizen_document_url',
    'work_experiences',
    'priority_course',
    'alt_course_1',
    'alt_course_2',
    'section',
    'profile_picture_url',
    'religion',
    'mother_name',
    'mother_occupation',
    'mother_status',
    'mother_contact',
    'mother_address',
    'father_name',
    'father_occupation',
    'father_status',
    'father_contact',
    'father_address',
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
    'father_last_name',
    'father_given_name',
    'father_middle_name',
    'mother_last_name',
    'mother_given_name',
    'mother_middle_name',
    'auth_user_id'
].join(', ');

export const getStudentProfileByAuthUser = async (authUser: any) => {
    if (!authUser?.id) return null;

    const { data: linkedStudent, error: linkedError } = await supabase
        .from('students')
        .select(STUDENT_PROFILE_SELECT)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (linkedError) throw linkedError;
    return linkedStudent || null;
};

export const getStudentBootstrapByAuthUser = async (authUser: any) => {
    if (!authUser?.id) return null;

    const { data: linkedStudent, error: linkedError } = await supabase
        .from('students')
        .select(STUDENT_BOOTSTRAP_SELECT)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (linkedError) throw linkedError;
    return linkedStudent || null;
};

export const getStaffProfileByAuthUser = async (authUser: any): Promise<StaffProfileRecord | null> => {
    if (!authUser?.id) return null;

    const { data: linkedStaff, error: linkedError } = await supabase
        .from('staff_accounts')
        .select(STAFF_PROFILE_SELECT)
        .eq('auth_user_id', authUser.id)
        .maybeSingle();

    if (linkedError) throw linkedError;
    if (isStaffProfileRecord(linkedStaff) && !linkedStaff.is_archived) return linkedStaff;
    return null;
};
