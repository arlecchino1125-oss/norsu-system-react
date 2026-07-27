-- Public events portal, second pass. Three things:
--
--  1. Window rules diverge from the student portal on purpose. Time-in closes
--     when the event ends (no 3h grace), time-out opens at the end and never
--     closes, and evaluating/rating only needs the event to have ended -- no
--     attendance requirement.
--  2. Throttling. This portal is anon-executable by design, so a per-student
--     attempt budget is the only brake between it and a scripted loop.
--  3. An evaluation cannot be submitted blank.
--
-- Injection surface: every function below is plpgsql over typed parameters with
-- no EXECUTE and no string-built SQL, so values can never reach the parser.
-- What is added here is size clamping, which is the part parameterisation does
-- not cover.

-- ---------------------------------------------------------------------------
-- Throttle
-- ---------------------------------------------------------------------------

create table if not exists public.public_events_throttle (
    id bigserial primary key,
    throttle_key text not null,
    action text not null,
    attempted_at timestamptz not null default now()
);

create index if not exists public_events_throttle_lookup
    on public.public_events_throttle (throttle_key, action, attempted_at desc);

alter table public.public_events_throttle enable row level security;
-- No policies on purpose: only the SECURITY DEFINER helper below touches it.
revoke all on table public.public_events_throttle from public, anon, authenticated;
revoke all on sequence public.public_events_throttle_id_seq from public, anon, authenticated;

drop function if exists public.public_throttle_take(text, text, integer, interval);

-- Records an attempt and answers whether it is still within budget. Old rows for
-- the same key are cleared on the way through, so the table stays small without
-- a scheduled job.
create function public.public_throttle_take(
    p_key text,
    p_action text,
    p_limit integer,
    p_window interval
)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_key text := lower(trim(coalesce(p_key, '')));
    v_count integer;
BEGIN
    IF v_key = '' THEN
        RETURN false;
    END IF;

    DELETE FROM public.public_events_throttle
    WHERE throttle_key = v_key
      AND action = p_action
      AND attempted_at < now() - p_window;

    SELECT count(*) INTO v_count
    FROM public.public_events_throttle
    WHERE throttle_key = v_key AND action = p_action;

    IF v_count >= p_limit THEN
        RETURN false;
    END IF;

    INSERT INTO public.public_events_throttle (throttle_key, action)
    VALUES (v_key, p_action);

    RETURN true;
END;
$$;

revoke all on function public.public_throttle_take(text, text, integer, interval) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Identity: now volatile, because a failed attempt has to be recorded.
-- ---------------------------------------------------------------------------

drop function if exists public.public_verify_student(text, text);

create function public.public_verify_student(p_student_id text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
BEGIN
    IF length(coalesce(p_student_id, '')) > 64 OR length(coalesce(p_email, '')) > 320 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    -- Keyed on the submitted ID so guessing emails against one ID burns budget.
    IF NOT public.public_throttle_take(p_student_id, 'verify', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    v_student := public.public_resolve_student(p_student_id, p_email);

    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'student_id', v_student.student_id,
            'first_name', v_student.first_name,
            'last_name', v_student.last_name,
            'sex', v_student.sex,
            'department', v_student.department,
            'course', v_student.course,
            'year_level', v_student.year_level,
            'section', v_student.section,
            'status', v_student.status
        )
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------

drop function if exists public.public_event_time_in(bigint, text, text);

create function public.public_event_time_in(p_event_id bigint, p_student_id text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_start timestamptz;
    v_end timestamptz;
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

    SELECT w.start_at, w.end_at INTO v_start, v_end
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    -- Time-in is open for exactly the event: opens at the start time, shuts at
    -- the end time. No grace period on either side.
    IF now() < v_start THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in is not open yet.');
    END IF;
    IF now() >= v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in closed when the event ended.');
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

drop function if exists public.public_event_time_out(bigint, text, text);

create function public.public_event_time_out(p_event_id bigint, p_student_id text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_start timestamptz;
    v_end timestamptz;
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

    SELECT w.start_at, w.end_at INTO v_start, v_end
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    -- Opens when the event ends and stays open. The closing grace is deliberately
    -- absent here; the event archiving out of view is what ends it.
    IF now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time out opens when the event ends.');
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

-- ---------------------------------------------------------------------------
-- Evaluation: event ended is the only gate. No attendance requirement.
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

    SELECT w.end_at INTO v_end FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can evaluate this event after it ends.');
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

-- ---------------------------------------------------------------------------
-- Rating: same gate as the evaluation above.
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

    SELECT w.end_at INTO v_end FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can rate this event after it ends.');
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

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.public_verify_student(text, text) from public;
revoke all on function public.public_event_time_in(bigint, text, text) from public;
revoke all on function public.public_event_time_out(bigint, text, text) from public;
revoke all on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) from public;
revoke all on function public.public_event_rate(bigint, text, text, integer[], text, text, text) from public;

grant execute on function public.public_verify_student(text, text) to anon, authenticated;
grant execute on function public.public_event_time_in(bigint, text, text) to anon, authenticated;
grant execute on function public.public_event_time_out(bigint, text, text) to anon, authenticated;
grant execute on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) to anon, authenticated;
grant execute on function public.public_event_rate(bigint, text, text, integer[], text, text, text) to anon, authenticated;
