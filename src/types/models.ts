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
    mobile?: string;
    email?: string;
    facebook_url?: string;
    course?: string;
    year_level?: string;
    status?: 'Active' | 'Inactive' | 'Graduated' | 'Transferred';
    created_at?: string;
    priority_course?: string;
    alt_course_1?: string;
    alt_course_2?: string;
    has_profile_picture?: boolean;
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
    type: 'Event' | 'Seminar' | 'Meeting' | 'Announcement' | 'Priority';
    description?: string;
    location?: string;
    event_date?: string;
    event_time?: string;
    end_time?: string;
    latitude?: string;
    longitude?: string;
    created_at?: string;

    // Virtual fields appended by custom hooks like useEventsData
    attendees?: number;
    avgRating?: string | null;
    feedbackCount?: number;
}

export interface Scholarship {
    id?: string;
    title: string;
    description?: string;
    requirements?: string;
    deadline?: string;
    created_at?: string;
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
