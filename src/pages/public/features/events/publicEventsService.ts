import { supabase } from '../../../../lib/supabase';

// Every call here goes through a `public_*` RPC defined in
// supabase/migrations/20260727150000_public_events_portal.sql. The portal has no
// Supabase session, so student_id travels with each write and the function
// resolves the real student row server-side.

export interface PublicEvent {
    id: number;
    created_at: string;
    title: string;
    type: string;
    description: string | null;
    location: string | null;
    event_date: string | null;
    event_time: string | null;
    end_time: string | null;
    attendees: number | null;
    is_archived: boolean;
    participation_mode: string | null;
    audience_type: string | null;
    audience_departments: string[] | null;
    audience_courses: string[] | null;
    audience_year_levels: string[] | null;
    audience_sections: string[] | null;
    allow_walk_ins: boolean | null;
    capacity: number | null;
    registration_deadline: string | null;
    require_photo: boolean | null;
    require_geolocation: boolean | null;
    attendance_closes_at: string | null;
}

// Deliberately only the id. The portal identifies a student by ID alone, so
// returning a name or a department here would make it a roster lookup for
// anyone who can guess an ID. Everything the portal writes -- the attendee
// name on event_attendance, the sex and college on event_feedback -- is filled
// server-side from the resolved row, so the browser never needs these.
export interface PublicStudent {
    student_id: string;
}

export interface PublicEventStatus {
    event_id: number;
    time_in: string | null;
    time_out: string | null;
    evaluated: boolean;
    rated: boolean;
    has_evaluation_form: boolean;
}

export interface PublicEvaluationQuestion {
    id: number;
    order_index: number | null;
    question_text: string;
    question_type: 'scale' | 'text' | 'choice';
    scale_min: number | null;
    scale_max: number | null;
    scale_min_label: string | null;
    scale_max_label: string | null;
    choices: string[] | null;
    is_required: boolean;
}

export interface PublicEvaluationForm {
    id: number;
    title: string;
    description: string | null;
}

// The RPCs were added after src/types/database.ts was last generated, so the
// typed client does not know their names yet.
const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

// Every write RPC answers { success, error? } instead of raising, so a business
// rule ("already timed in") reads as a message rather than a 500.
const unwrap = (data: any) => {
    if (!data?.success) throw new Error(data?.error || 'Something went wrong.');
    return data;
};

export const verifyPublicStudent = async (studentId: string): Promise<PublicStudent> => {
    const { data, error } = await rpc('public_verify_student', {
        p_student_id: studentId.trim()
    });
    if (error) throw error;
    return unwrap(data).student as PublicStudent;
};

export const getPublicEvents = async (studentId?: string): Promise<PublicEvent[]> => {
    const { data, error } = await rpc('public_get_active_events', {
        p_student_id: studentId?.trim() || null
    });
    if (error) throw error;
    return (data || []) as PublicEvent[];
};

export const getPublicEventStatus = async (studentId: string): Promise<PublicEventStatus[]> => {
    const { data, error } = await rpc('public_get_student_event_status', {
        p_student_id: studentId
    });
    if (error) throw error;
    return (data || []) as PublicEventStatus[];
};

export const timeInPublicEvent = async (eventId: number, studentId: string) => {
    const { data, error } = await rpc('public_event_time_in', {
        p_event_id: eventId,
        p_student_id: studentId
    });
    if (error) throw error;
    return unwrap(data);
};

export const timeOutPublicEvent = async (eventId: number, studentId: string) => {
    const { data, error } = await rpc('public_event_time_out', {
        p_event_id: eventId,
        p_student_id: studentId
    });
    if (error) throw error;
    return unwrap(data);
};

export const getPublicEvaluationForm = async (eventId: number) => {
    const { data, error } = await rpc('public_get_evaluation_form', { p_event_id: eventId });
    if (error) throw error;
    const payload = unwrap(data);
    return {
        form: payload.form as PublicEvaluationForm,
        questions: (payload.questions || []) as PublicEvaluationQuestion[]
    };
};

export const evaluatePublicEvent = async (
    eventId: number,
    studentId: string,
    formId: number,
    answers: Array<{ question_id: number; answer_value: number | null; answer_text: string | null }>
) => {
    const { data, error } = await rpc('public_event_evaluate', {
        p_event_id: eventId,
        p_student_id: studentId,
        p_form_id: formId,
        p_answers: answers
    });
    if (error) throw error;
    return unwrap(data);
};

export const ratePublicEvent = async (
    eventId: number,
    studentId: string,
    scores: number[],
    openBest: string,
    openSuggestions: string,
    openComments: string
) => {
    const { data, error } = await rpc('public_event_rate', {
        p_event_id: eventId,
        p_student_id: studentId,
        p_scores: scores,
        p_open_best: openBest,
        p_open_suggestions: openSuggestions,
        p_open_comments: openComments
    });
    if (error) throw error;
    return unwrap(data);
};