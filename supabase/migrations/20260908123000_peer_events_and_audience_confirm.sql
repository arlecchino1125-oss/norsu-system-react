-- =============================================================================
-- Migration: Peer Events Audience Type & Attendance Confirmation
-- Description:
-- 1. Updates events_audience_type_chk to include 'peer_facilitators'.
-- 2. Updates public_event_time_in to support 'peer_facilitators' and accept
--    an optional p_confirmed parameter to allow attendance when students
--    confirm after an audience mismatch notice.
-- =============================================================================

-- 1. Update check constraint on events.audience_type
ALTER TABLE public.events
    DROP CONSTRAINT IF EXISTS events_audience_type_chk;

ALTER TABLE public.events
    ADD CONSTRAINT events_audience_type_chk
    CHECK (audience_type = ANY (ARRAY['all_students'::text, 'filtered_students'::text, 'graduating_students'::text, 'peer_facilitators'::text]));

-- 2. Update public_event_time_in to support peer_facilitators and confirmation
DROP FUNCTION IF EXISTS public.public_event_time_in(bigint, text);
DROP FUNCTION IF EXISTS public.public_event_time_in(bigint, text, boolean);

CREATE OR REPLACE FUNCTION public.public_event_time_in(
    p_event_id bigint,
    p_student_id text,
    p_confirmed boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_start timestamptz;
    v_end timestamptz;
    v_checkin_close timestamptz;
    v_mismatch_reason text := null;
BEGIN
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'time_in', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    IF lower(coalesce(v_event.type, '')) NOT IN ('event', 'seminar', 'orientation', 'meeting') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance is not available for this item.');
    END IF;

    SELECT w.start_at, w.end_at, w.checkin_close
    INTO v_start, v_end, v_checkin_close
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    IF now() < v_start THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in is not open yet.');
    END IF;
    IF now() > v_checkin_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in is already closed.');
    END IF;

    -- Audience eligibility checks
    IF v_event.audience_type = 'peer_facilitators' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.peer_facilitators
            WHERE student_id = v_student.student_id AND archived_at IS NULL
        ) THEN
            v_mismatch_reason := 'This event is designated for CARE Peer Facilitators.';
        END IF;
    ELSIF v_event.audience_type = 'graduating_students'
       AND lower(coalesce(v_student.status, '')) <> 'graduating'
       AND lower(coalesce(v_student.year_level, '')) NOT IN ('4th year', '5th year') THEN
        v_mismatch_reason := 'This event is designated for graduating students.';
    ELSIF cardinality(coalesce(v_event.audience_year_levels, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.year_level, '') = ANY(v_event.audience_year_levels)) THEN
        v_mismatch_reason := 'This event is designated for ' || array_to_string(v_event.audience_year_levels, ', ') || '.';
    ELSIF cardinality(coalesce(v_event.audience_departments, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.department, '') = ANY(v_event.audience_departments)) THEN
        v_mismatch_reason := 'This event is designated for ' || array_to_string(v_event.audience_departments, ', ') || '.';
    ELSIF cardinality(coalesce(v_event.audience_courses, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.course, '') = ANY(v_event.audience_courses)) THEN
        v_mismatch_reason := 'This event is designated for ' || array_to_string(v_event.audience_courses, ', ') || '.';
    ELSIF cardinality(coalesce(v_event.audience_sections, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.section, '') = ANY(v_event.audience_sections)) THEN
        v_mismatch_reason := 'This event is designated for Section ' || array_to_string(v_event.audience_sections, ', ') || '.';
    END IF;

    IF v_mismatch_reason IS NOT NULL AND NOT p_confirmed THEN
        RETURN jsonb_build_object(
            'success', false,
            'needs_confirmation', true,
            'error', v_mismatch_reason || ' Are you sure you want to attend?'
        );
    END IF;

    IF v_event.participation_mode = 'registration_required'
       AND NOT coalesce(v_event.allow_walk_ins, false)
       AND NOT EXISTS (
           SELECT 1 FROM public.event_registrations
           WHERE event_id = p_event_id
             AND student_id = v_student.student_id
             AND status IN ('Registered', 'Attended')
       ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Register for this event in the student portal before timing in.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_attendance
        WHERE event_id = p_event_id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already timed in for this event.');
    END IF;

    INSERT INTO public.event_attendance (
        event_id,
        student_id,
        student_name,
        department,
        time_in,
        checked_in_at
    ) VALUES (
        p_event_id,
        v_student.student_id,
        trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix)),
        v_student.department,
        now(),
        now()
    );

    UPDATE public.events
    SET attendees = (SELECT count(*) FROM public.event_attendance WHERE event_id = p_event_id)
    WHERE id = p_event_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Timed in. Your attendance has been recorded.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_event_time_in(bigint, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_time_in(bigint, text, boolean) TO anon, authenticated;
