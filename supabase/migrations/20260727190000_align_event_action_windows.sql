-- Both portals now use one set of rules. Keep in lockstep with
-- src/utils/eventWindows.ts.
--
--   Time in   opens at the start, closes at max(end, start + 3h)
--   Time out  opens at the end and never closes
--   Evaluate  needs the event to have ended, and nothing else
--
-- Three changes here:
--   1. record_student_event_attendance loses its check-out closing window, and
--      its check-in grace goes to 3h. The 3h was already live in the database by
--      hand; the committed migration still said 2h, so a db reset would have
--      silently reverted the student portal to the old windows.
--   2. student_may_evaluate_form stops requiring attendance. It gated the RLS on
--      event_evaluation_forms, so without this the student portal cannot even
--      read the form it is now allowed to answer.
--   3. public_event_time_in gets the same 3h check-in grace.

-- ---------------------------------------------------------------------------
-- 1. Student attendance RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_student_event_attendance(
    p_event_id bigint,
    p_action text,
    p_proof_url text DEFAULT NULL,
    p_latitude double precision DEFAULT NULL,
    p_longitude double precision DEFAULT NULL
) RETURNS public.event_attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_action text;
    v_student_id text;
    v_student public.students%rowtype;
    v_event public.events%rowtype;
    v_attendance public.event_attendance%rowtype;
    v_event_start_at timestamptz;
    v_event_end_at timestamptz;
    v_check_in_close_at timestamptz;
    v_proof_prefix text;
    v_half_chord double precision;
    v_distance_meters double precision;
BEGIN
    v_action := lower(trim(coalesce(p_action, '')));
    IF v_action NOT IN ('check_in', 'check_out') THEN
        RAISE EXCEPTION 'Attendance action must be check_in or check_out.';
    END IF;

    v_student_id := public.current_student_id();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Student account is not linked to the current session.';
    END IF;

    SELECT *
    INTO v_student
    FROM public.students
    WHERE student_id = v_student_id
      AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active student profile was not found.';
    END IF;

    SELECT *
    INTO v_event
    FROM public.events
    WHERE id = p_event_id
      AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event was not found.';
    END IF;

    IF lower(coalesce(v_event.type, '')) NOT IN ('event', 'seminar', 'orientation', 'meeting') THEN
        RAISE EXCEPTION 'Attendance is not available for this item.';
    END IF;

    IF v_event.event_date IS NULL OR nullif(trim(v_event.event_time), '') IS NULL THEN
        RAISE EXCEPTION 'The event attendance window is not configured.';
    END IF;

    BEGIN
        v_event_start_at := (v_event.event_date + v_event.event_time::time) AT TIME ZONE 'Asia/Manila';
        v_event_end_at := CASE
            WHEN v_event.end_time IS NOT NULL
                THEN (v_event.event_date + v_event.end_time) AT TIME ZONE 'Asia/Manila'
            ELSE v_event_start_at + interval '3 hours'
        END;
    EXCEPTION
        WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RAISE EXCEPTION 'The event attendance window is invalid.';
    END;

    IF v_event_end_at <= v_event_start_at THEN
        RAISE EXCEPTION 'The event attendance window is invalid.';
    END IF;

    -- Check-in stays open at least 3h from the start, or until the event ends.
    v_check_in_close_at := greatest(v_event_end_at, v_event_start_at + interval '3 hours');

    IF v_action = 'check_in' THEN
        IF now() < v_event_start_at THEN
            RAISE EXCEPTION 'Check-in is not open yet.';
        END IF;
        IF now() > v_check_in_close_at THEN
            RAISE EXCEPTION 'Check-in is already closed.';
        END IF;

        IF v_event.audience_type = 'graduating_students'
           AND lower(coalesce(v_student.status, '')) <> 'graduating'
           AND lower(coalesce(v_student.year_level, '')) NOT IN ('4th year', '5th year') THEN
            RAISE EXCEPTION 'This event is only open to graduating students.';
        END IF;

        IF cardinality(coalesce(v_event.audience_departments, '{}'::text[])) > 0
           AND NOT (coalesce(v_student.department, '') = ANY(v_event.audience_departments)) THEN
            RAISE EXCEPTION 'This event is not open to your department.';
        END IF;

        IF cardinality(coalesce(v_event.audience_courses, '{}'::text[])) > 0
           AND NOT (coalesce(v_student.course, '') = ANY(v_event.audience_courses)) THEN
            RAISE EXCEPTION 'This event is not open to your course.';
        END IF;

        IF cardinality(coalesce(v_event.audience_year_levels, '{}'::text[])) > 0
           AND NOT (coalesce(v_student.year_level, '') = ANY(v_event.audience_year_levels)) THEN
            RAISE EXCEPTION 'This event is not open to your year level.';
        END IF;

        IF cardinality(coalesce(v_event.audience_sections, '{}'::text[])) > 0
           AND NOT (coalesce(v_student.section, '') = ANY(v_event.audience_sections)) THEN
            RAISE EXCEPTION 'This event is not open to your section.';
        END IF;

        IF v_event.participation_mode = 'registration_required'
           AND NOT coalesce(v_event.allow_walk_ins, false)
           AND NOT EXISTS (
               SELECT 1
               FROM public.event_registrations
               WHERE event_id = p_event_id
                 AND student_id = v_student_id
                 AND status IN ('Registered', 'Attended')
           ) THEN
            RAISE EXCEPTION 'Register for the event before checking in.';
        END IF;

        IF coalesce(v_event.require_photo, true)
           AND nullif(trim(coalesce(p_proof_url, '')), '') IS NULL THEN
            RAISE EXCEPTION 'Attendance photo proof is required.';
        END IF;

        IF nullif(trim(coalesce(p_proof_url, '')), '') IS NOT NULL THEN
            v_proof_prefix := format(
                'r2:students/%s/events/%s/attendance/',
                v_student.id,
                p_event_id
            );
            IF left(p_proof_url, length(v_proof_prefix)) <> v_proof_prefix THEN
                RAISE EXCEPTION 'Attendance photo proof does not belong to this student and event.';
            END IF;
        END IF;
    ELSE
        IF now() < v_event_end_at THEN
            RAISE EXCEPTION 'Check-out is not open yet.';
        END IF;
        -- No closing window: check-out stays available until the event archives.
    END IF;

    IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
        RAISE EXCEPTION 'Both latitude and longitude are required together.';
    END IF;

    IF p_latitude IS NOT NULL
       AND (p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180) THEN
        RAISE EXCEPTION 'Attendance location is invalid.';
    END IF;

    IF coalesce(v_event.require_geolocation, false) THEN
        IF v_event.latitude IS NULL OR v_event.longitude IS NULL THEN
            RAISE EXCEPTION 'The event location is not configured.';
        END IF;
        IF p_latitude IS NULL OR p_longitude IS NULL THEN
            RAISE EXCEPTION 'Attendance location is required.';
        END IF;

        v_half_chord :=
            power(sin(radians(p_latitude - v_event.latitude) / 2), 2)
            + cos(radians(v_event.latitude)) * cos(radians(p_latitude))
            * power(sin(radians(p_longitude - v_event.longitude) / 2), 2);
        v_half_chord := least(1.0, greatest(0.0, v_half_chord));
        v_distance_meters := 6371000 * 2
            * atan2(sqrt(v_half_chord), sqrt(1 - v_half_chord));

        IF v_distance_meters > 200 THEN
            RAISE EXCEPTION 'You are too far from the event venue.';
        END IF;
    END IF;

    IF v_action = 'check_in' THEN
        IF EXISTS (
            SELECT 1
            FROM public.event_attendance
            WHERE event_id = p_event_id
              AND student_id = v_student_id
        ) THEN
            RAISE EXCEPTION 'Attendance is already recorded for this event.';
        END IF;

        INSERT INTO public.event_attendance (
            event_id, student_id, student_name, checked_in_at, time_in, time_out,
            proof_url, latitude, longitude, department
        ) VALUES (
            p_event_id,
            v_student_id,
            trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix)),
            now(),
            now(),
            NULL,
            nullif(trim(coalesce(p_proof_url, '')), ''),
            p_latitude,
            p_longitude,
            v_student.department
        )
        RETURNING * INTO v_attendance;

        UPDATE public.events
        SET attendees = (
            SELECT count(*)
            FROM public.event_attendance
            WHERE event_id = p_event_id
        )
        WHERE id = p_event_id;

        RETURN v_attendance;
    END IF;

    SELECT *
    INTO v_attendance
    FROM public.event_attendance
    WHERE event_id = p_event_id
      AND student_id = v_student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No attendance record was found. Check in first.';
    END IF;

    IF v_attendance.time_out IS NOT NULL THEN
        RAISE EXCEPTION 'Check-out is already recorded for this event.';
    END IF;

    UPDATE public.event_attendance
    SET time_out = now()
    WHERE id = v_attendance.id
    RETURNING * INTO v_attendance;

    RETURN v_attendance;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Evaluation visibility: ended, not attended
-- ---------------------------------------------------------------------------

-- Backs the RLS policies on event_evaluation_forms and
-- event_evaluation_questions. Attendance is no longer part of it: any signed-in
-- student may answer the form once the event has ended.
CREATE OR REPLACE FUNCTION public.student_may_evaluate_form(p_form_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.current_student_id() IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM public.event_evaluation_forms f
           JOIN public.events e ON e.id = f.event_id
           CROSS JOIN LATERAL public.public_event_window(e.*) w
           WHERE f.id = p_form_id
             AND f.event_id IS NOT NULL
             AND f.is_active
             AND NOT coalesce(e.is_archived, false)
             AND w.end_at IS NOT NULL
             AND now() >= w.end_at
       );
$$;

-- ---------------------------------------------------------------------------
-- 3. Public time-in: same 3h check-in grace
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_event_time_in(p_event_id bigint, p_student_id text, p_email text)
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
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
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

    IF v_event.audience_type = 'graduating_students'
       AND lower(coalesce(v_student.status, '')) <> 'graduating'
       AND lower(coalesce(v_student.year_level, '')) NOT IN ('4th year', '5th year') THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is only open to graduating students.');
    END IF;

    IF cardinality(coalesce(v_event.audience_departments, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.department, '') = ANY(v_event.audience_departments)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is not open to your department.');
    END IF;

    IF cardinality(coalesce(v_event.audience_courses, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.course, '') = ANY(v_event.audience_courses)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is not open to your course.');
    END IF;

    IF cardinality(coalesce(v_event.audience_year_levels, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.year_level, '') = ANY(v_event.audience_year_levels)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is not open to your year level.');
    END IF;

    IF cardinality(coalesce(v_event.audience_sections, '{}'::text[])) > 0
       AND NOT (coalesce(v_student.section, '') = ANY(v_event.audience_sections)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event is not open to your section.');
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
        RETURN jsonb_build_object('success', false, 'error', 'You have already timed in for this event.');
    END IF;

    INSERT INTO public.event_attendance (
        event_id, student_id, student_name, department, checked_in_at, time_in
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

    RETURN jsonb_build_object('success', true);
END;
$$;
