/**
 * Core TypeScript models for NORSU System React
 * 
 * These interfaces map to the Supabase database schema and are used
 * to strongly type component state, API responses, and form payloads.
 */

export interface SystemEvent {
    id?: number;
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
    require_photo?: boolean;
    require_geolocation?: boolean;

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
    application_method?: string;
    application_url?: string;
}
