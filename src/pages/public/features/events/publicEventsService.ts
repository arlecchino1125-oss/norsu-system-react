import { supabase } from '../../../../lib/supabase';

// Every call here goes through a `public_*` RPC defined in
// supabase/migrations/20260727150000_public_events_portal.sql and
// supabase/migrations/20260818000000_counseling_evaluations.sql. The portal has no
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
    is_peer?: boolean;
    peer_year?: string;
    first_name?: string;
    last_name?: string;
    course?: string;
    year_level?: string;
    section?: string;
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

export interface PublicAssessmentQuestion {
    id: number;
    order_index: number | null;
    question_text: string;
    question_type: 'scale' | 'text' | 'open_ended' | string | null;
    scale_min: number | null;
    scale_max: number | null;
}

const rpc = (fn: string, args?: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

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

// ---------------------------------------------------------------------------
// Public Counseling Evaluation Intake (No session listing)
// ---------------------------------------------------------------------------

export const getPublicCounselingEvaluationForm = async () => {
    const { data, error } = await rpc('public_get_counseling_evaluation_form', {
        p_request_id: null
    });
    if (error) throw error;
    const payload = unwrap(data);
    return {
        form: payload.form as PublicEvaluationForm,
        questions: (payload.questions || []) as PublicEvaluationQuestion[]
    };
};

export const evaluatePublicCounseling = async (
    studentId: string,
    answers: Array<{ question_id: number; answer_value: number | null; answer_text: string | null }>
) => {
    const { data, error } = await rpc('public_counseling_evaluate', {
        p_student_id: studentId.trim(),
        p_request_id: null,
        p_answers: answers
    });
    if (error) throw error;
    return unwrap(data);
};

// ---------------------------------------------------------------------------
// Public Needs Assessment (ID-only)
// ---------------------------------------------------------------------------

export interface PublicAssessmentForm {
    id: number;
    created_at: string;
    title: string;
    description: string | null;
    is_completed: boolean;
}

export const getPublicAssessmentForms = async (studentId?: string): Promise<PublicAssessmentForm[]> => {
    const { data, error } = await rpc('public_get_assessment_forms', {
        p_student_id: studentId?.trim() || null
    });
    if (error) throw error;
    return (data || []) as PublicAssessmentForm[];
};

export const getPublicAssessmentFormQuestions = async (formId: number): Promise<PublicAssessmentQuestion[]> => {
    const { data, error } = await rpc('public_get_assessment_form_questions', { p_form_id: formId });
    if (error) throw error;
    return (data || []) as PublicAssessmentQuestion[];
};

export const submitPublicAssessment = async (
    studentId: string,
    formId: number,
    answers: Array<{ question_id: number; answer_value: number | null; answer_text: string | null }>
) => {
    const { data, error } = await rpc('public_submit_assessment', {
        p_student_id: studentId.trim(),
        p_form_id: formId,
        p_answers: answers
    });
    if (error) throw error;
    return unwrap(data);
};

// ---------------------------------------------------------------------------
// Public General Feedback (optional ID — visitors welcome)
// ---------------------------------------------------------------------------

export interface PublicFeedbackData {
    client_type?: string;
    sex?: string;
    age?: string;
    region?: string;
    service_availed?: string;
    cc1?: string;
    cc2?: string;
    cc3?: string;
    sqd0?: number;
    sqd1?: number;
    sqd2?: number;
    sqd3?: number;
    sqd4?: number;
    sqd5?: number;
    sqd6?: number;
    sqd7?: number;
    sqd8?: number;
    suggestions?: string;
    email?: string;
}

export const submitPublicGeneralFeedback = async (
    data: PublicFeedbackData,
    studentId?: string
) => {
    const { data: rpcData, error } = await rpc('public_submit_general_feedback', {
        p_data: data as any,
        p_student_id: studentId?.trim() || null
    });
    if (error) throw error;
    return unwrap(rpcData);
};

import { parseScholarship } from '../../../../utils/scholarshipHelpers';

export const getPublicScholarships = async () => {
    const { data, error } = await supabase
        .from('scholarships')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(parseScholarship);
};

// ---------------------------------------------------------------------------
// Public Office Visits (Office Logbook Time In / Time Out)
// ---------------------------------------------------------------------------

export interface PublicOfficeVisitReason {
    id: number;
    reason: string;
}

export interface PublicActiveOfficeVisit {
    has_active: boolean;
    id?: number;
    student_id?: string | null;
    student_name?: string;
    reason?: string;
    time_in?: string;
    status?: string;
}

export const getPublicOfficeVisitReasons = async (): Promise<PublicOfficeVisitReason[]> => {
    const { data, error } = await rpc('public_get_office_visit_reasons');
    if (error) throw error;
    return (data || []) as PublicOfficeVisitReason[];
};

export const submitPublicOfficeTimeIn = async (args: {
    studentId?: string;
    firstName?: string;
    lastName?: string;
    isVisitor?: boolean;
    reason: string;
}) => {
    const { data, error } = await rpc('public_office_visit_time_in', {
        p_student_id: args.studentId?.trim() || null,
        p_first_name: args.firstName?.trim() || null,
        p_last_name: args.lastName?.trim() || null,
        p_is_visitor: Boolean(args.isVisitor),
        p_reason: args.reason.trim()
    });
    if (error) throw error;
    return unwrap(data);
};

export const submitPublicOfficeTimeOut = async (args: {
    visitId?: number;
    studentId?: string;
    visitorName?: string;
}) => {
    const { data, error } = await rpc('public_office_visit_time_out', {
        p_visit_id: args.visitId || null,
        p_student_id: args.studentId?.trim() || null,
        p_visitor_name: args.visitorName?.trim() || null
    });
    if (error) throw error;
    return unwrap(data);
};

export const getPublicActiveOfficeVisit = async (args: {
    studentId?: string;
    visitorName?: string;
}): Promise<PublicActiveOfficeVisit> => {
    const { data, error } = await rpc('public_get_active_office_visit', {
        p_student_id: args.studentId?.trim() || null,
        p_visitor_name: args.visitorName?.trim() || null
    });
    if (error) throw error;
    return (data || { has_active: false }) as PublicActiveOfficeVisit;
};

// ---------------------------------------------------------------------------
// Public Counseling Requests (Self-Referral Booking)
// ---------------------------------------------------------------------------

export interface PublicCounselingRequestData {
    studentId: string;
    reasonForReferral: string;
    personalActionsTaken?: string;
    dateDurationOfConcern?: string;
    contactNumber?: string;
}

export const submitPublicCounselingRequest = async (args: PublicCounselingRequestData) => {
    const { data, error } = await rpc('public_submit_counseling_request', {
        p_student_id: args.studentId.trim(),
        p_reason_for_referral: args.reasonForReferral.trim(),
        p_personal_actions_taken: args.personalActionsTaken?.trim() || '',
        p_date_duration_of_concern: args.dateDurationOfConcern?.trim() || '',
        p_contact_number: args.contactNumber?.trim() || ''
    });
    if (error) throw error;
    return unwrap(data);
};

// ---------------------------------------------------------------------------
// Public Additional Support Requests
// ---------------------------------------------------------------------------

export interface PublicSupportRequestData {
    studentId: string;
    categories: string[];
    otherCategory?: string;
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
    documentsUrl?: string;
}

export const submitPublicSupportRequest = async (args: PublicSupportRequestData) => {
    const { data, error } = await rpc('public_submit_support_request', {
        p_student_id: args.studentId.trim(),
        p_categories: args.categories,
        p_other_category: args.otherCategory?.trim() || '',
        p_q1: args.q1?.trim() || '',
        p_q2: args.q2?.trim() || '',
        p_q3: args.q3?.trim() || '',
        p_q4: args.q4?.trim() || '',
        p_documents_url: args.documentsUrl || null
    });
    if (error) throw error;
    return unwrap(data);
};

// ---------------------------------------------------------------------------
// Public Direct Scholarship Application Submission
// ---------------------------------------------------------------------------

export const submitPublicScholarshipApplication = async (args: {
    studentId: string;
    scholarshipId: number;
}) => {
    const { data, error } = await rpc('public_submit_scholarship_application', {
        p_student_id: args.studentId.trim(),
        p_scholarship_id: args.scholarshipId
    });
    if (error) throw error;
    return unwrap(data);
};

// ---------------------------------------------------------------------------
// Public Peer Facilitator Volunteer & Logbook Services
// ---------------------------------------------------------------------------

export interface PublicPeerAttendanceData {
    success: boolean;
    is_peer: boolean;
    first_name?: string;
    last_name?: string;
    course?: string;
    year_level?: string;
    section?: string;
    peer_year: string;
    time_in_enabled: boolean;
    school_year: string;
    open_session: { id: number; time_in: string } | null;
    sessions: Array<{
        id: number;
        student_id: string;
        time_in: string;
        time_out: string | null;
    }>;
}

export const getPublicPeerAttendance = async (studentId: string): Promise<PublicPeerAttendanceData> => {
    const { data, error } = await rpc('public_get_peer_attendance', {
        p_student_id: studentId.trim()
    });
    if (error) throw error;
    return unwrap(data);
};

export const submitPublicPeerTimeIn = async (studentId: string) => {
    const { data, error } = await rpc('public_peer_time_in', {
        p_student_id: studentId.trim()
    });
    if (error) throw error;
    return unwrap(data);
};

export const submitPublicPeerTimeOut = async (studentId: string) => {
    const { data, error } = await rpc('public_peer_time_out', {
        p_student_id: studentId.trim()
    });
    if (error) throw error;
    return unwrap(data);
};

export interface PublicPeerLogbookData {
    success: boolean;
    month: string;
    logbook: {
        id: string;
        month: string;
        status: string;
        submitted_at: string | null;
        reviewer_name: string | null;
        reviewed_at: string | null;
    } | null;
    entries: any[];
    archived: Array<{
        id: string;
        month: string;
        submitted_at: string | null;
    }>;
}

export const getPublicPeerLogbook = async (
    studentId: string,
    logbookType: 'peer_support' | 'care_activities',
    month: string
): Promise<PublicPeerLogbookData> => {
    const { data, error } = await rpc('public_get_peer_logbook', {
        p_student_id: studentId.trim(),
        p_logbook_type: logbookType,
        p_month: month
    });
    if (error) throw error;
    return unwrap(data);
};

export const savePublicPeerLogEntry = async (
    studentId: string,
    logbookType: 'peer_support' | 'care_activities',
    month: string,
    entryId: string | null,
    draft: Record<string, any>
) => {
    const { data, error } = await rpc('public_save_peer_log_entry', {
        p_student_id: studentId.trim(),
        p_logbook_type: logbookType,
        p_month: month,
        p_entry_id: entryId || null,
        p_draft: draft
    });
    if (error) throw error;
    return unwrap(data);
};

export const deletePublicPeerLogEntry = async (
    studentId: string,
    logbookType: 'peer_support' | 'care_activities',
    entryId: string
) => {
    const { data, error } = await rpc('public_delete_peer_log_entry', {
        p_student_id: studentId.trim(),
        p_logbook_type: logbookType,
        p_entry_id: entryId
    });
    if (error) throw error;
    return unwrap(data);
};

export const submitPublicPeerLogbook = async (
    studentId: string,
    logbookType: 'peer_support' | 'care_activities',
    month: string
) => {
    const { data, error } = await rpc('public_submit_peer_logbook', {
        p_student_id: studentId.trim(),
        p_logbook_type: logbookType,
        p_month: month
    });
    if (error) throw error;
    return unwrap(data);
};

export const searchPublicStudentsForPeer = async (
    studentId: string,
    term: string = ''
): Promise<Array<{ student_id: string; first_name: string; last_name: string }>> => {
    const { data, error } = await rpc('public_search_students_for_peer', {
        p_student_id: studentId.trim(),
        p_term: term.trim()
    });
    if (error) throw error;
    return unwrap(data).students || [];
};