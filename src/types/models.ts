/**
 * Core TypeScript models for NORSU System React
 * 
 * These interfaces map to the Supabase database schema and are used
 * to strongly type component state, API responses, and form payloads.
 */

export interface Student {
    id?: string;
    student_id: string; // The academic ID like '123-456'
    first_name: string;
    last_name: string;
    middle_name?: string;
    suffix?: string;
    dob?: string;
    place_of_birth?: string;
    sex?: 'Male' | 'Female' | 'Other';
    gender_identity?: string;
    civil_status?: string;
    nationality?: string;
    street?: string;
    city?: string;
    province?: string;
    zip_code?: string;
    region?: string;
    region_other?: string;
    mobile?: string;
    email?: string;
    facebook_url?: string;
    mother_last_name?: string;
    mother_given_name?: string;
    mother_middle_name?: string;
    mother_name?: string;
    mother_occupation?: string;
    mother_status?: string;
    mother_contact?: string;
    mother_address?: string;
    father_last_name?: string;
    father_given_name?: string;
    father_middle_name?: string;
    father_name?: string;
    father_occupation?: string;
    father_status?: string;
    father_contact?: string;
    father_address?: string;
    parents_num_children?: string;
    birth_order?: string;
    birth_order_other?: string;
    spouse_name?: string;
    spouse_occupation?: string;
    spouse_employer_name?: string;
    spouse_employer_address?: string;
    spouse_contact?: string;
    num_children?: string;
    children_names_birthdates?: string;
    currently_pregnant?: string;
    supporter?: string;
    supporter_contact?: string;
    is_working_student?: boolean;
    working_student_type?: string;
    working_student_type_other?: string;
    employer_name?: string;
    employer_address?: string;
    is_pwd?: boolean;
    pwd_number?: string;
    pwd_type?: string;
    pwd_type_other?: string;
    disability_cause?: string;
    pwd_document_url?: string;
    is_indigenous?: boolean;
    indigenous_group?: string;
    indigenous_group_other?: string;
    ip_document_url?: string;
    is_four_ps_member?: boolean;
    four_ps_document_url?: string;
    is_rebel_returnee?: boolean;
    is_solo_parent?: boolean;
    is_child_of_solo_parent?: boolean;
    solo_parent_document_url?: string;
    is_orphan?: boolean;
    orphan_cause?: string;
    orphan_cause_other?: string;
    is_homeless_citizen?: boolean;
    is_senior_citizen?: boolean;
    senior_citizen_document_url?: string;
    work_experiences?: string;
    guardian_name?: string;
    guardian_address?: string;
    guardian_contact?: string;
    guardian_relation?: string;
    elem_school?: string;
    elem_year_graduated?: string;
    junior_high_school?: string;
    junior_high_year_graduated?: string;
    senior_high_school?: string;
    senior_high_year_graduated?: string;
    college_school?: string;
    college_year_graduated?: string;
    honors_awards?: string;
    tesda_nc2_acquired?: string;
    eligibility_acquired?: string;
    special_trainings_attended?: string;
    extracurricular_activities?: string;
    holds_public_service_position?: boolean;
    public_service_position?: string;
    organizations_memberships?: string;
    sports_skills?: string;
    other_talents?: string;
    scholarships_availed?: string;
    has_been_criminally_charged?: boolean;
    criminal_charge_details?: string;
    has_been_convicted_of_crime?: boolean;
    crime_conviction_details?: string;
    course?: string;
    year_level?: string;
    year_level_other?: string;
    section?: string;
    department?: string;
    status?: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
    created_at?: string;
    priority_course?: string;
    alt_course_1?: string;
    alt_course_2?: string;
    has_profile_picture?: boolean;
    profile_picture_url?: string;
    is_archived?: boolean;
    archived_at?: string | null;
    archived_reason?: string | null;
    archived_by?: string | number | null;
    archive_note?: string | null;
}

export interface CareStaffAccount {
    id?: string;
    username: string;
    role: string;
    name: string;
    department?: string;
    contact_number?: string;
    created_at?: string;
    password?: string; // Only used when generating new accounts
}

export interface DepartmentAccount {
    id?: string;
    username: string;
    role: string;
    name: string;
    department: string;
    contact_number?: string;
    created_at?: string;
    password?: string;
}

export interface SystemEvent {
    id?: string;
    title: string;
    type: 'Event' | 'Seminar' | 'Orientation' | 'Meeting' | 'Announcement' | 'Priority';
    description?: string;
    location?: string;
    event_date?: string;
    event_time?: string;
    end_time?: string;
    latitude?: string;
    longitude?: string;
    created_at?: string;
    is_archived?: boolean;
    archived_at?: string | null;
    archived_by?: string | number | null;
    participation_mode?: 'general_attendance' | 'registration_required';
    audience_type?: 'all_students' | 'filtered_students' | 'graduating_students';
    audience_departments?: string[];
    audience_courses?: string[];
    audience_year_levels?: string[];
    audience_sections?: string[];
    attendance_required?: boolean;
    allow_walk_ins?: boolean;
    capacity?: number | null;
    registration_deadline?: string | null;

    // Virtual fields appended by custom hooks like useEventsData
    attendees?: number;
    avgRating?: string | null;
    feedbackCount?: number;
    registeredCount?: number;
    cancelledRegistrationCount?: number;
    attendedRegistrationCount?: number;
    absentRegistrationCount?: number;
}

export interface Scholarship {
    id?: string;
    title: string;
    description?: string;
    requirements?: string;
    deadline?: string;
    created_at?: string;
    is_active?: boolean;
}

export interface Course {
    id?: string;
    name: string;
    created_at?: string;
}

export interface Department {
    id?: string;
    name: string;
    created_at?: string;
}
