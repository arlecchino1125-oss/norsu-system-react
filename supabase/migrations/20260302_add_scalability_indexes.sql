-- Scalability indexes for high-traffic list queries and realtime dashboards.

CREATE INDEX IF NOT EXISTS idx_counseling_requests_student_created
ON public.counseling_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_counseling_requests_department_status_created
ON public.counseling_requests (department, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_student_created
ON public.support_requests (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_requests_department_status_created
ON public.support_requests (department, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_student_created
ON public.notifications (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_forms_active_created
ON public.forms (is_active, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_office_visits_student_status_timein
ON public.office_visits (student_id, status, time_in DESC);

CREATE INDEX IF NOT EXISTS idx_applications_status_created
ON public.applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_students_last_first
ON public.students (last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_event_attendance_student_event
ON public.event_attendance (student_id, event_id);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_student_created
ON public.scholarship_applications (student_id, created_at DESC);

-- Optional helper to avoid heavy client-side admissions filtering by active choice.
CREATE OR REPLACE FUNCTION public.get_department_admission_candidates(
    p_department_name text,
    p_statuses text[] DEFAULT ARRAY[
        'Qualified for Interview (1st Choice)',
        'Forwarded to 2nd Choice for Interview',
        'Forwarded to 3rd Choice for Interview',
        'Interview Scheduled'
    ],
    p_limit integer DEFAULT 100,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    created_at timestamptz,
    student_id text,
    first_name text,
    last_name text,
    reference_id text,
    email text,
    mobile text,
    priority_course text,
    alt_course_1 text,
    alt_course_2 text,
    current_choice smallint,
    status text,
    interview_date text,
    active_course text
)
LANGUAGE sql
STABLE
AS $$
    WITH normalized AS (
        SELECT
            a.id,
            a.created_at,
            a.student_id,
            a.first_name,
            a.last_name,
            a.reference_id,
            a.email,
            a.mobile,
            a.priority_course,
            a.alt_course_1,
            a.alt_course_2,
            a.current_choice,
            a.status,
            a.interview_date,
            CASE COALESCE(a.current_choice, 1)
                WHEN 1 THEN a.priority_course
                WHEN 2 THEN a.alt_course_1
                WHEN 3 THEN a.alt_course_2
                ELSE a.priority_course
            END AS active_course
        FROM public.applications a
        WHERE a.status = ANY (p_statuses)
    )
    SELECT
        n.id,
        n.created_at,
        n.student_id,
        n.first_name,
        n.last_name,
        n.reference_id,
        n.email,
        n.mobile,
        n.priority_course,
        n.alt_course_1,
        n.alt_course_2,
        n.current_choice,
        n.status,
        n.interview_date,
        n.active_course
    FROM normalized n
    JOIN public.courses c
      ON lower(btrim(c.name)) = lower(btrim(COALESCE(n.active_course, '')))
    JOIN public.departments d
      ON d.id = c.department_id
    WHERE d.name = p_department_name
    ORDER BY n.created_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 100), 500))
    OFFSET GREATEST(0, COALESCE(p_offset, 0));
$$;

SELECT 'Scalability indexes and dept admissions helper function added.' AS result;

