-- One closing date for everything a student can do on an event card.
--
-- Before: time-in closed at least(end, start + 3h); time-out, rating and
-- evaluation had no closing window at all and leaned on the card scrolling out
-- of view at end + 3 days. Students with no internet during the event simply
-- lost their attendance.
--
-- After: events.attendance_closes_at is the single deadline. Time-in still opens
-- at the start and time-out still opens at the end, but both -- plus rating and
-- evaluation -- close there, and that is also when the card archives. NULL means
-- end + 3 days, which is exactly the old visibility rule, so every existing row
-- keeps behaving as it does today and nothing needs backfilling.
--
-- Photo and geolocation are now enforced only while the event is still running.
-- They exist to prove the student was physically at the venue, which is not a
-- thing a late time-in can demonstrate. The columns, parameters and validation
-- all stay in place so the checks can be switched back on without rework.
--
-- Keep in lockstep with src/utils/eventWindows.ts.
-- src/lib/eventWindowMigrationLockstep.test.ts fails if they part.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendance_closes_at timestamptz;

COMMENT ON COLUMN public.events.attendance_closes_at IS
    'Single deadline for time-in, time-out, rating and evaluation; the card archives here too. NULL falls back to end + 3 days.';

-- ---------------------------------------------------------------------------
-- 1. Shared window helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_event_window(p_event public.events)
RETURNS TABLE (start_at timestamptz, end_at timestamptz, checkin_close timestamptz, timeout_close timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
    v_close timestamptz;
BEGIN
    IF p_event.event_date IS NULL OR nullif(trim(p_event.event_time), '') IS NULL THEN
        RETURN;
    END IF;

    BEGIN
        v_start := (p_event.event_date + p_event.event_time::time) AT TIME ZONE 'Asia/Manila';
        v_end := CASE
            WHEN p_event.end_time IS NOT NULL
                THEN (p_event.event_date + p_event.end_time) AT TIME ZONE 'Asia/Manila'
            ELSE v_start + interval '3 hours'
        END;
    EXCEPTION
        WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RETURN;
    END;

    IF v_end <= v_start THEN
        RETURN;
    END IF;

    v_close := coalesce(p_event.attendance_closes_at, v_end + interval '3 days');

    -- Both columns carry the same single deadline now. The names are kept so no
    -- dependent function has to be dropped and recreated.
    RETURN QUERY SELECT v_start, v_end, v_close, v_close;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public portal read: expose the new column
-- ---------------------------------------------------------------------------

-- Explicit column list rather than SETOF events, so anon does not automatically
-- start receiving whatever column the next events migration adds. Changing the
-- return type means a drop and recreate, which loses the grants below.
DROP FUNCTION IF EXISTS public.public_get_active_events();

CREATE FUNCTION public.public_get_active_events()
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    title text,
    type text,
    description text,
    location text,
    event_date date,
    event_time text,
    end_time time,
    attendees bigint,
    is_archived boolean,
    participation_mode text,
    audience_type text,
    audience_departments text[],
    audience_courses text[],
    audience_year_levels text[],
    audience_sections text[],
    allow_walk_ins boolean,
    capacity integer,
    registration_deadline timestamptz,
    require_photo boolean,
    require_geolocation boolean,
    attendance_closes_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    select
        e.id, e.created_at, e.title, e.type, e.description, e.location,
        e.event_date, e.event_time, e.end_time, e.attendees, e.is_archived,
        e.participation_mode, e.audience_type, e.audience_departments,
        e.audience_courses, e.audience_year_levels, e.audience_sections,
        e.allow_walk_ins, e.capacity, e.registration_deadline,
        e.require_photo, e.require_geolocation, e.attendance_closes_at
    from public.events e
    where not coalesce(e.is_archived, false)
    order by e.created_at desc;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_events() FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_events() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Public portal writes: close at the date, not at is_archived
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_time_out(bigint, text, text);

CREATE FUNCTION public.public_event_time_out(p_event_id bigint, p_student_id text, p_email text)
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
    v_close timestamptz;
    v_attendance public.event_attendance;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'time_out', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    SELECT w.start_at, w.end_at, w.checkin_close INTO v_start, v_end, v_close
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    IF now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time out opens when the event ends.');
    END IF;
    IF now() > v_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
    END IF;

    SELECT * INTO v_attendance
    FROM public.event_attendance
    WHERE event_id = p_event_id AND student_id = v_student.student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No attendance record found. Time in first.');
    END IF;

    IF v_attendance.time_out IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already timed out for this event.');
    END IF;

    UPDATE public.event_attendance SET time_out = now() WHERE id = v_attendance.id;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_event_time_out(bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_time_out(bigint, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Evaluation: event ended is still the opening gate, the close date is new.
-- ---------------------------------------------------------------------------

drop function if exists public.public_event_evaluate(bigint, text, text, bigint, jsonb);

create function public.public_event_evaluate(
    p_event_id bigint,
    p_student_id text,
    p_email text,
    p_form_id bigint,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_end timestamptz;
    v_close timestamptz;
    v_response_id bigint;
    v_answer jsonb;
    v_answered integer;
    v_expected integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'evaluate', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    IF jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'array'
       OR jsonb_array_length(p_answers) = 0
       OR jsonb_array_length(p_answers) > 200 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every question before submitting.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.event_evaluation_forms
        WHERE id = p_form_id AND event_id = p_event_id AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This evaluation form is not available.');
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    SELECT w.end_at, w.checkin_close INTO v_end, v_close FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can evaluate this event after it ends.');
    END IF;
    IF now() > v_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_evaluation_responses
        WHERE form_id = p_form_id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already evaluated this event.');
    END IF;

    -- A blank submission is rejected outright: every question on the form needs
    -- an answer that is actually present, not just a key with an empty value.
    SELECT count(*) INTO v_expected
    FROM public.event_evaluation_questions
    WHERE form_id = p_form_id;

    SELECT count(DISTINCT (a->>'question_id')::bigint) INTO v_answered
    FROM jsonb_array_elements(p_answers) a
    WHERE (a->>'question_id') ~ '^[0-9]+$'
      AND (
          nullif(a->>'answer_value', '') IS NOT NULL
          OR nullif(trim(coalesce(a->>'answer_text', '')), '') IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM public.event_evaluation_questions q
          WHERE q.form_id = p_form_id AND q.id = (a->>'question_id')::bigint
      );

    IF v_answered < v_expected THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every question before submitting.');
    END IF;

    INSERT INTO public.event_evaluation_responses (
        form_id, student_id, student_name, department, course, year_level, submitted_at
    ) VALUES (
        p_form_id,
        v_student.student_id,
        trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix)),
        v_student.department,
        v_student.course,
        v_student.year_level,
        now()
    ) RETURNING id INTO v_response_id;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        IF (v_answer->>'question_id') !~ '^[0-9]+$' THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.event_evaluation_questions q
            WHERE q.form_id = p_form_id AND q.id = (v_answer->>'question_id')::bigint
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.event_evaluation_answers (response_id, question_id, answer_value, answer_text)
        VALUES (
            v_response_id,
            (v_answer->>'question_id')::bigint,
            CASE WHEN (v_answer->>'answer_value') ~ '^-?[0-9]+$'
                THEN (v_answer->>'answer_value')::integer END,
            left(nullif(trim(coalesce(v_answer->>'answer_text', '')), ''), 2000)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

revoke all on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) from public;
grant execute on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Rating: same gate as the evaluation above.
-- ---------------------------------------------------------------------------

drop function if exists public.public_event_rate(bigint, text, text, integer[], text, text, text);

create function public.public_event_rate(
    p_event_id bigint,
    p_student_id text,
    p_email text,
    p_scores integer[],
    p_open_best text,
    p_open_suggestions text,
    p_open_comments text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_end timestamptz;
    v_close timestamptz;
    v_score integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'rate', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    IF coalesce(array_length(p_scores, 1), 0) <> 7 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rate all seven criteria.');
    END IF;

    FOREACH v_score IN ARRAY p_scores LOOP
        IF v_score IS NULL OR v_score < 1 OR v_score > 5 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Each criterion must be rated 1 to 5.');
        END IF;
    END LOOP;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    SELECT w.end_at, w.checkin_close INTO v_end, v_close FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can rate this event after it ends.');
    END IF;
    IF now() > v_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_feedback
        WHERE event_id = p_event_id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already rated this event.');
    END IF;

    INSERT INTO public.event_feedback (
        event_id, student_id, student_name, rating, feedback, submitted_at,
        sex, college, date_of_activity,
        q1_score, q2_score, q3_score, q4_score, q5_score, q6_score, q7_score,
        open_best, open_suggestions, open_comments
    ) VALUES (
        p_event_id,
        v_student.student_id,
        trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix)),
        round((p_scores[1] + p_scores[2] + p_scores[3] + p_scores[4] + p_scores[5] + p_scores[6] + p_scores[7])::numeric / 7),
        left(nullif(trim(coalesce(p_open_comments, '')), ''), 2000),
        now(),
        v_student.sex,
        format('%s - %s (%s)', coalesce(v_student.department, ''), coalesce(v_student.course, ''), coalesce(v_student.year_level, '')),
        v_event.event_date,
        p_scores[1], p_scores[2], p_scores[3], p_scores[4], p_scores[5], p_scores[6], p_scores[7],
        left(nullif(trim(coalesce(p_open_best, '')), ''), 2000),
        left(nullif(trim(coalesce(p_open_suggestions, '')), ''), 2000),
        left(nullif(trim(coalesce(p_open_comments, '')), ''), 2000)
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

revoke all on function public.public_event_rate(bigint, text, text, integer[], text, text, text) from public;
grant execute on function public.public_event_rate(bigint, text, text, integer[], text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Evaluation form visibility: opens at the end, shuts at the close date.
-- ---------------------------------------------------------------------------

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
             AND now() <= w.checkin_close
       );
$$;

-- ---------------------------------------------------------------------------
-- 7. Student portal write: the same single deadline
-- ---------------------------------------------------------------------------

-- Restated in full from 20260727210000_cap_time_in_window.sql; only the closing
-- rule and the photo/geolocation gating change. Every audience, registration and
-- proof-ownership check below is unchanged.
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
    v_close_at timestamptz;
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

    SELECT * INTO v_student
    FROM public.students
    WHERE student_id = v_student_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active student profile was not found.';
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
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

    -- One deadline for everything: time-in, time-out and the card archiving.
    v_close_at := coalesce(v_event.attendance_closes_at, v_event_end_at + interval '3 days');

    IF v_action = 'check_in' THEN
        IF now() < v_event_start_at THEN
            RAISE EXCEPTION 'Check-in is not open yet.';
        END IF;
        IF now() > v_close_at THEN
            RAISE EXCEPTION 'Attendance for this event is closed.';
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
               SELECT 1 FROM public.event_registrations
               WHERE event_id = p_event_id
                 AND student_id = v_student_id
                 AND status IN ('Registered', 'Attended')
           ) THEN
            RAISE EXCEPTION 'Register for the event before checking in.';
        END IF;

        -- Photo proof only means something while the event is running. A student
        -- timing in two days late cannot produce a photo of a venue they are not
        -- at, so the requirement lapses with the event.
        IF now() <= v_event_end_at THEN
            IF coalesce(v_event.require_photo, false)
               AND nullif(trim(coalesce(p_proof_url, '')), '') IS NULL THEN
                RAISE EXCEPTION 'Attendance photo proof is required.';
            END IF;
        END IF;

        -- An uploaded photo is still checked for ownership whenever one is sent,
        -- late or not: this is the guard that stops one student attaching
        -- another student's proof.
        IF nullif(trim(coalesce(p_proof_url, '')), '') IS NOT NULL THEN
            v_proof_prefix := format('r2:students/%s/events/%s/attendance/', v_student.id, p_event_id);
            IF left(p_proof_url, length(v_proof_prefix)) <> v_proof_prefix THEN
                RAISE EXCEPTION 'Attendance photo proof does not belong to this student and event.';
            END IF;
        END IF;
    ELSE
        IF now() < v_event_end_at THEN
            RAISE EXCEPTION 'Check-out is not open yet.';
        END IF;
        IF now() > v_close_at THEN
            RAISE EXCEPTION 'Attendance for this event is closed.';
        END IF;
    END IF;

    IF (p_latitude IS NULL) <> (p_longitude IS NULL) THEN
        RAISE EXCEPTION 'Both latitude and longitude are required together.';
    END IF;

    IF p_latitude IS NOT NULL
       AND (p_latitude < -90 OR p_latitude > 90 OR p_longitude < -180 OR p_longitude > 180) THEN
        RAISE EXCEPTION 'Attendance location is invalid.';
    END IF;

    -- Same as the photo: a 200m radius check is meaningless once the event is
    -- over, and would lock out exactly the students this window exists for.
    IF coalesce(v_event.require_geolocation, false) AND now() <= v_event_end_at THEN
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
        -- Clamped to [0,1] so floating point drift cannot hand sqrt() a negative.
        v_half_chord := least(1.0, greatest(0.0, v_half_chord));
        v_distance_meters := 6371000 * 2 * atan2(sqrt(v_half_chord), sqrt(1 - v_half_chord));

        IF v_distance_meters > 200 THEN
            RAISE EXCEPTION 'You are too far from the event venue.';
        END IF;
    END IF;

    IF v_action = 'check_in' THEN
        IF EXISTS (
            SELECT 1 FROM public.event_attendance
            WHERE event_id = p_event_id AND student_id = v_student_id
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
        SET attendees = (SELECT count(*) FROM public.event_attendance WHERE event_id = p_event_id)
        WHERE id = p_event_id;

        RETURN v_attendance;
    END IF;

    SELECT * INTO v_attendance
    FROM public.event_attendance
    WHERE event_id = p_event_id AND student_id = v_student_id
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

REVOKE EXECUTE ON FUNCTION public.record_student_event_attendance(bigint, text, text, double precision, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_student_event_attendance(bigint, text, text, double precision, double precision) TO authenticated;
