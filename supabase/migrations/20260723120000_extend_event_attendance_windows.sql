-- Widen the attendance windows so short events are usable:
--   * Check-in stays open for at least 2h after the event starts (or until it
--     ends, whichever is later) instead of closing at the end time.
--   * Check-out stays open for 2h after the event ends, then closes. The student
--     portal keeps the event visible for that same grace so everyone can time out.
-- Keep this in lockstep with src/utils/eventWindows.ts.

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
            ELSE v_event_start_at + interval '2 hours'
        END;
    EXCEPTION
        WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RAISE EXCEPTION 'The event attendance window is invalid.';
    END;

    IF v_event_end_at <= v_event_start_at THEN
        RAISE EXCEPTION 'The event attendance window is invalid.';
    END IF;

    -- Check-in stays open at least 2h from the start, or until the event ends.
    v_check_in_close_at := greatest(v_event_end_at, v_event_start_at + interval '2 hours');

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
        -- The event stays active for 2h after it ends so everyone can time out.
        IF now() > v_event_end_at + interval '2 hours' THEN
            RAISE EXCEPTION 'Check-out window has closed.';
        END IF;
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
            event_id,
            student_id,
            student_name,
            checked_in_at,
            time_in,
            time_out,
            proof_url,
            latitude,
            longitude,
            department
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
