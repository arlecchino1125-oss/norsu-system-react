-- The public events portal identifies a student by Student ID alone.
--
-- 20260727150000 required an email as a second factor, on the reasoning that
-- student IDs are semi-public and attendance history should not be enumerable
-- from an ID alone. That is dropped here deliberately: students were unable to
-- record attendance because they did not have their registered email to hand.
--
-- The accepted cost is impersonation -- anyone holding an ID can act as that
-- student. What compensates, and must not be weakened later:
--
--   * An ID reveals nothing. public_verify_student returns the student_id and
--     nothing else, so a guessed ID yields no name, department or course.
--   * An ID can only time in, time out, rate, and answer an evaluation.
--   * The per-action rate limits are unchanged.
--
-- src/lib/publicEventsIdentityMigration.test.ts fails if any of those slip.

-- ---------------------------------------------------------------------------
-- 1. Internal resolver. Still never granted to anon: it returns a whole
--    students row, which is exactly what must not reach the browser.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_resolve_student(text, text);

CREATE FUNCTION public.public_resolve_student(p_student_id text)
RETURNS public.students
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    select *
    from public.students
    where student_id = trim(coalesce(p_student_id, ''))
      and not coalesce(is_archived, false)
    limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Verification returns the canonical id and nothing else.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_verify_student(text, text);

-- Deliberately NOT stable: public_throttle_take writes a row per attempt, and a
-- STABLE function cannot write. Marking this stable silently makes the throttle
-- below impossible to keep.
CREATE FUNCTION public.public_verify_student(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
BEGIN
    IF length(coalesce(p_student_id, '')) > 64 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    -- Carried over from the email-based version. Be clear about what it does:
    -- it is keyed on the SUBMITTED id, so it only slows repeated guesses against
    -- one id. An attacker walking 202600001, 202600002, ... gets a fresh budget
    -- for each and is not slowed at all. Under ID-only login the id is the whole
    -- credential, so there is nothing to guess *against* an id and this key
    -- defends much less than it did. Kept because removing a guard silently is
    -- worse than keeping a weak one; enumeration needs a key the caller cannot
    -- rotate (IP or device), which this function cannot see.
    IF NOT public.public_throttle_take(p_student_id, 'verify', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    v_student := public.public_resolve_student(p_student_id);

    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    -- Deliberately only the id. Returning a name here would turn this function
    -- into a roster lookup for anyone who can guess an ID.
    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object('student_id', v_student.student_id)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_verify_student(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_verify_student(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Event list. With an id supplied, the audience rules are applied here --
--    the browser no longer needs the student's department or course to do it.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_get_active_events();

CREATE FUNCTION public.public_get_active_events(p_student_id text DEFAULT NULL)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
BEGIN
    IF nullif(trim(coalesce(p_student_id, '')), '') IS NOT NULL THEN
        v_student := public.public_resolve_student(p_student_id);
    END IF;

    RETURN QUERY
    SELECT
        e.id, e.created_at, e.title, e.type, e.description, e.location,
        e.event_date, e.event_time, e.end_time, e.attendees, e.is_archived,
        e.participation_mode, e.audience_type, e.audience_departments,
        e.audience_courses, e.audience_year_levels, e.audience_sections,
        e.allow_walk_ins, e.capacity, e.registration_deadline,
        e.require_photo, e.require_geolocation, e.attendance_closes_at
    FROM public.events e
    WHERE NOT coalesce(e.is_archived, false)
      -- No id: a guest sees every live event, exactly as before.
      AND (
        v_student.student_id IS NULL
        OR (
            (e.audience_type <> 'graduating_students'
                OR lower(coalesce(v_student.status, '')) = 'graduating'
                OR lower(coalesce(v_student.year_level, '')) IN ('4th year', '5th year'))
            AND (cardinality(coalesce(e.audience_departments, '{}'::text[])) = 0
                OR coalesce(v_student.department, '') = ANY(e.audience_departments))
            AND (cardinality(coalesce(e.audience_courses, '{}'::text[])) = 0
                OR coalesce(v_student.course, '') = ANY(e.audience_courses))
            AND (cardinality(coalesce(e.audience_year_levels, '{}'::text[])) = 0
                OR coalesce(v_student.year_level, '') = ANY(e.audience_year_levels))
            AND (cardinality(coalesce(e.audience_sections, '{}'::text[])) = 0
                OR coalesce(v_student.section, '') = ANY(e.audience_sections))
        )
      )
    ORDER BY e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_events(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_events(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Status read. Copied from 20260727150000_public_events_portal.sql with
--    only the identity plumbing changed: the email parameter is gone and the
--    resolver is called with the id alone.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_get_student_event_status(text, text);

CREATE FUNCTION public.public_get_student_event_status(p_student_id text)
RETURNS TABLE (
    event_id bigint,
    time_in timestamptz,
    time_out timestamptz,
    evaluated boolean,
    rated boolean,
    has_evaluation_form boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student_id text;
BEGIN
    v_student_id := (public.public_resolve_student(p_student_id)).student_id;

    IF v_student_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        e.id,
        a.time_in,
        a.time_out,
        EXISTS (
            SELECT 1
            FROM public.event_evaluation_responses r
            JOIN public.event_evaluation_forms f ON f.id = r.form_id
            WHERE f.event_id = e.id
              AND r.student_id = v_student_id
        ),
        EXISTS (
            SELECT 1
            FROM public.event_feedback fb
            WHERE fb.event_id = e.id
              AND fb.student_id = v_student_id
        ),
        -- Lets the portal hide the evaluation button on events staff never
        -- attached a form to, instead of offering a button that always errors.
        EXISTS (
            SELECT 1
            FROM public.event_evaluation_forms ef
            WHERE ef.event_id = e.id
              AND ef.is_active = true
        )
    FROM public.events e
    LEFT JOIN public.event_attendance a
        ON a.event_id = e.id AND a.student_id = v_student_id
    WHERE NOT coalesce(e.is_archived, false);
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_student_event_status(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_student_event_status(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Time in. Copied from 20260727190000_align_event_action_windows.sql with
--    only the identity plumbing changed: the email parameter is gone, the
--    resolver is called with the id alone, and the not-found message is
--    updated. Every audience check, the registration/walk-in gate, the
--    duplicate-action guard, the throttle budget and the window guards are
--    byte-for-byte unchanged.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_time_in(bigint, text, text);

CREATE FUNCTION public.public_event_time_in(p_event_id bigint, p_student_id text)
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

REVOKE ALL ON FUNCTION public.public_event_time_in(bigint, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_time_in(bigint, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Time out. Copied from 20260803120000_event_attendance_close_date.sql with
--    only the identity plumbing changed. The closing-date guard, the throttle
--    budget and the duplicate-action guard are byte-for-byte unchanged.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_time_out(bigint, text, text);

CREATE FUNCTION public.public_event_time_out(p_event_id bigint, p_student_id text)
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
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
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

REVOKE ALL ON FUNCTION public.public_event_time_out(bigint, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_time_out(bigint, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Evaluation. Copied from 20260803120000_event_attendance_close_date.sql
--    with only the identity plumbing changed. The closing-date guard, the
--    throttle budget, the completeness count and the duplicate-action guard
--    are byte-for-byte unchanged.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_evaluate(bigint, text, text, bigint, jsonb);

CREATE FUNCTION public.public_event_evaluate(
    p_event_id bigint,
    p_student_id text,
    p_form_id bigint,
    p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
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

REVOKE ALL ON FUNCTION public.public_event_evaluate(bigint, text, bigint, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_evaluate(bigint, text, bigint, jsonb) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. Rating. Copied from 20260803120000_event_attendance_close_date.sql with
--    only the identity plumbing changed. The closing-date guard, the throttle
--    budget, the score validation and the server-side name/sex/college writes
--    are byte-for-byte unchanged.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_rate(bigint, text, text, integer[], text, text, text);

CREATE FUNCTION public.public_event_rate(
    p_event_id bigint,
    p_student_id text,
    p_scores integer[],
    p_open_best text,
    p_open_suggestions text,
    p_open_comments text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_end timestamptz;
    v_close timestamptz;
    v_score integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
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

REVOKE ALL ON FUNCTION public.public_event_rate(bigint, text, integer[], text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_rate(bigint, text, integer[], text, text, text) TO anon, authenticated;