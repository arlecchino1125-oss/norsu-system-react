-- Public events portal: /public/events.
--
-- Students who cannot get into their campus mail (and so cannot finish a
-- password reset) still need to see events, record attendance, rate, and answer
-- evaluations. This portal identifies them by student_id + email ONLY. That is
-- the whole authentication story on purpose -- it is the same trust level as the
-- authenticated student portal, which also lets a student time themselves in.
--
-- Everything else is derived server-side: name, department, course, year level
-- and section are read from public.students inside these functions, so the
-- browser can never submit attendance or evaluations under another identity.
--
-- The attendance windows below MUST stay in lockstep with
-- src/utils/eventWindows.ts and public.record_student_event_attendance.

-- These were originally applied by hand against the remote database and never
-- captured in a migration. Drop the hand-made signatures so this file is the
-- single source of truth from here on.
drop function if exists public.public_get_active_events();
drop function if exists public.public_get_student_event_status(text);
drop function if exists public.public_get_student_event_status(text, text);
drop function if exists public.public_event_time_in(bigint, text, text);
drop function if exists public.public_event_time_out(bigint, text, text);
drop function if exists public.public_get_evaluation_form(bigint);
drop function if exists public.public_event_evaluate(bigint, text, text, bigint, jsonb);
drop function if exists public.public_event_rate(bigint, text, text, integer[], text, text, text, text);
drop function if exists public.public_verify_student(text, text);
drop function if exists public.public_resolve_student(text, text);
drop function if exists public.public_event_window(public.events);

-- ---------------------------------------------------------------------------
-- Internal helpers. Never granted to anon: they take no credentials of their
-- own and returning a whole students row to the browser would leak far more
-- than this portal needs.
-- ---------------------------------------------------------------------------

create function public.public_resolve_student(p_student_id text, p_email text)
returns public.students
language sql
stable
security definer
set search_path to 'public'
as $$
    select *
    from public.students
    where student_id = trim(coalesce(p_student_id, ''))
      and lower(email) = lower(trim(coalesce(p_email, '')))
      and not coalesce(is_archived, false)
    limit 1;
$$;

create function public.public_event_window(p_event public.events)
returns table (start_at timestamptz, end_at timestamptz, checkin_close timestamptz, timeout_close timestamptz)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
BEGIN
    IF p_event.event_date IS NULL OR nullif(trim(p_event.event_time), '') IS NULL THEN
        RETURN;
    END IF;

    BEGIN
        v_start := (p_event.event_date + p_event.event_time::time) AT TIME ZONE 'Asia/Manila';
        v_end := CASE
            WHEN p_event.end_time IS NOT NULL
                THEN (p_event.event_date + p_event.end_time) AT TIME ZONE 'Asia/Manila'
            -- Mirrors getEventWindows(): a missing end time means a 3h event.
            ELSE v_start + interval '3 hours'
        END;
    EXCEPTION
        WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RETURN;
    END;

    IF v_end <= v_start THEN
        RETURN;
    END IF;

    RETURN QUERY SELECT
        v_start,
        v_end,
        -- Check-in stays open at least 3h from the start, or until the event ends.
        greatest(v_end, v_start + interval '3 hours'),
        -- Time-out stays open for 3h after the event ends.
        v_end + interval '3 hours';
END;
$$;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

-- Returns only the fields the portal actually renders or filters on: the
-- audience profile plus the name/sex the evaluation header shows back to the
-- student. No contact details, no guardian, no address.
create function public.public_verify_student(p_student_id text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
DECLARE
    v_student public.students;
BEGIN
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
-- Reads
-- ---------------------------------------------------------------------------

-- Explicit column list rather than SETOF events: anon should not automatically
-- start receiving whatever column the next events migration adds.
create function public.public_get_active_events()
returns table (
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
    require_geolocation boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
    select
        e.id, e.created_at, e.title, e.type, e.description, e.location,
        e.event_date, e.event_time, e.end_time, e.attendees, e.is_archived,
        e.participation_mode, e.audience_type, e.audience_departments,
        e.audience_courses, e.audience_year_levels, e.audience_sections,
        e.allow_walk_ins, e.capacity, e.registration_deadline,
        e.require_photo, e.require_geolocation
    from public.events e
    where not coalesce(e.is_archived, false)
    order by e.created_at desc;
$$;

-- One row per active event so the portal can render attendance, evaluation and
-- rating state from a single call. Requires the email as well: student IDs are
-- semi-public and attendance history should not be enumerable from an ID alone.
create function public.public_get_student_event_status(p_student_id text, p_email text)
returns table (
    event_id bigint,
    time_in timestamptz,
    time_out timestamptz,
    evaluated boolean,
    rated boolean,
    has_evaluation_form boolean
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
DECLARE
    v_student_id text;
BEGIN
    v_student_id := (public.public_resolve_student(p_student_id, p_email)).student_id;

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

create function public.public_get_evaluation_form(p_event_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
DECLARE
    v_form public.event_evaluation_forms;
    v_questions jsonb;
BEGIN
    SELECT * INTO v_form
    FROM public.event_evaluation_forms
    WHERE event_id = p_event_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active evaluation form for this event.');
    END IF;

    SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.order_index), '[]'::jsonb)
    INTO v_questions
    FROM public.event_evaluation_questions q
    WHERE q.form_id = v_form.id;

    RETURN jsonb_build_object(
        'success', true,
        'form', jsonb_build_object('id', v_form.id, 'title', v_form.title, 'description', v_form.description),
        'questions', v_questions
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- Writes
-- ---------------------------------------------------------------------------

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
    v_checkin_close timestamptz;
    v_timeout_close timestamptz;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
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

    SELECT w.start_at, w.end_at, w.checkin_close, w.timeout_close
    INTO v_start, v_end, v_checkin_close, v_timeout_close
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    IF now() < v_start THEN
        RETURN jsonb_build_object('success', false, 'error', 'Check-in is not open yet.');
    END IF;
    IF now() > v_checkin_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Check-in is already closed.');
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

    -- Registration is an authenticated-portal action, so the public portal can
    -- only refuse here rather than offer to register.
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

    -- Photo proof and geofencing are deliberately not enforced here: both need
    -- an authenticated storage upload, which this portal has no way to do.
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
    v_checkin_close timestamptz;
    v_timeout_close timestamptz;
    v_attendance public.event_attendance;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    SELECT w.start_at, w.end_at, w.checkin_close, w.timeout_close
    INTO v_start, v_end, v_checkin_close, v_timeout_close
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    IF now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time out is not open yet.');
    END IF;
    IF now() > v_timeout_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'The time out window has closed.');
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
    v_response_id bigint;
    v_answer jsonb;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.event_evaluation_forms
        WHERE id = p_form_id AND event_id = p_event_id AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'This evaluation form is not available.');
    END IF;

    -- Only attendees evaluate, matching the student portal's RLS on
    -- event_evaluation_forms.
    IF NOT EXISTS (
        SELECT 1 FROM public.event_attendance
        WHERE event_id = p_event_id AND student_id = v_student.student_id AND time_in IS NOT NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in to this event before evaluating it.');
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_evaluation_responses
        WHERE form_id = p_form_id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already evaluated this event.');
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

    -- Unanswered optional questions are skipped rather than stored as 0/'',
    -- which would otherwise read as a real "0 out of 5" in the staff reports.
    FOR v_answer IN SELECT * FROM jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
    LOOP
        IF nullif(v_answer->>'answer_value', '') IS NULL
           AND nullif(trim(coalesce(v_answer->>'answer_text', '')), '') IS NULL THEN
            CONTINUE;
        END IF;

        INSERT INTO public.event_evaluation_answers (response_id, question_id, answer_value, answer_text)
        VALUES (
            v_response_id,
            (v_answer->>'question_id')::bigint,
            nullif(v_answer->>'answer_value', '')::integer,
            nullif(trim(coalesce(v_answer->>'answer_text', '')), '')
        );
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- The 7-criteria participant rating, the same form the student portal writes to
-- event_feedback. Scores arrive as an array so the signature stays readable.
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

    IF NOT EXISTS (
        SELECT 1 FROM public.event_attendance
        WHERE event_id = p_event_id AND student_id = v_student.student_id AND time_in IS NOT NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time in to this event before rating it.');
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
        nullif(trim(coalesce(p_open_comments, '')), ''),
        now(),
        v_student.sex,
        format('%s - %s (%s)', coalesce(v_student.department, ''), coalesce(v_student.course, ''), coalesce(v_student.year_level, '')),
        v_event.event_date,
        p_scores[1], p_scores[2], p_scores[3], p_scores[4], p_scores[5], p_scores[6], p_scores[7],
        nullif(trim(coalesce(p_open_best, '')), ''),
        nullif(trim(coalesce(p_open_suggestions, '')), ''),
        nullif(trim(coalesce(p_open_comments, '')), '')
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.public_resolve_student(text, text) from public, anon, authenticated;
revoke all on function public.public_event_window(public.events) from public, anon, authenticated;

revoke all on function public.public_verify_student(text, text) from public;
revoke all on function public.public_get_active_events() from public;
revoke all on function public.public_get_student_event_status(text, text) from public;
revoke all on function public.public_get_evaluation_form(bigint) from public;
revoke all on function public.public_event_time_in(bigint, text, text) from public;
revoke all on function public.public_event_time_out(bigint, text, text) from public;
revoke all on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) from public;
revoke all on function public.public_event_rate(bigint, text, text, integer[], text, text, text) from public;

grant execute on function public.public_verify_student(text, text) to anon, authenticated;
grant execute on function public.public_get_active_events() to anon, authenticated;
grant execute on function public.public_get_student_event_status(text, text) to anon, authenticated;
grant execute on function public.public_get_evaluation_form(bigint) to anon, authenticated;
grant execute on function public.public_event_time_in(bigint, text, text) to anon, authenticated;
grant execute on function public.public_event_time_out(bigint, text, text) to anon, authenticated;
grant execute on function public.public_event_evaluate(bigint, text, text, bigint, jsonb) to anon, authenticated;
grant execute on function public.public_event_rate(bigint, text, text, integer[], text, text, text) to anon, authenticated;
