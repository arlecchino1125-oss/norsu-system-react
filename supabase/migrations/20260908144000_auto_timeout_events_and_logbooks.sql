-- =============================================================================
-- Migration: Auto Time-Out for Events Attendance and Logbooks
-- Description:
-- 1. Creates public.auto_timeout_records() to automatically close:
--    - Event attendance 30 minutes after the exact time the event ends.
--    - Peer facilitator morning sessions 30 minutes after 12:00 PM (12:30 PM Manila).
--    - Peer facilitator afternoon sessions at 5:30 PM Manila (17:30:00).
--    - Office visits (morning at 12:30 PM Manila, afternoon at 5:30 PM Manila).
-- 2. Updates trigger stamp_peer_facilitator_attendance_times to allow cutoff timestamps.
-- 3. Hooks auto_timeout_records into event, peer, and office visit RPCs.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_timeout_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now timestamptz := now();
BEGIN
    -- 1. Events Attendance: Auto time out 30 minutes after exact event end time
    UPDATE public.event_attendance a
    SET time_out = GREATEST(a.time_in + interval '1 minute', w.end_at + interval '30 minutes')
    FROM public.events e
    CROSS JOIN LATERAL public.public_event_window(e) w
    WHERE a.event_id = e.id
      AND a.time_out IS NULL
      AND w.end_at IS NOT NULL
      AND v_now >= (w.end_at + interval '30 minutes');

    -- 2. Peer Facilitator Attendance: Morning shifts (clocked in before 12:00 PM Manila)
    --    Auto time out 30 minutes after 12:00 PM (12:30 PM Asia/Manila)
    UPDATE public.peer_facilitator_attendance a
    SET time_out = GREATEST(
        a.time_in + interval '1 minute',
        (timezone('Asia/Manila', a.time_in)::date + time '12:30:00') AT TIME ZONE 'Asia/Manila'
    )
    WHERE a.time_out IS NULL
      AND timezone('Asia/Manila', a.time_in)::time < time '12:00:00'
      AND v_now >= ((timezone('Asia/Manila', a.time_in)::date + time '12:30:00') AT TIME ZONE 'Asia/Manila');

    -- Peer Facilitator Attendance: Afternoon shifts (clocked in at or after 12:00 PM Manila)
    -- Auto time out at 5:30 PM Asia/Manila (17:30:00)
    UPDATE public.peer_facilitator_attendance a
    SET time_out = GREATEST(
        a.time_in + interval '1 minute',
        (timezone('Asia/Manila', a.time_in)::date + time '17:30:00') AT TIME ZONE 'Asia/Manila'
    )
    WHERE a.time_out IS NULL
      AND timezone('Asia/Manila', a.time_in)::time >= time '12:00:00'
      AND v_now >= ((timezone('Asia/Manila', a.time_in)::date + time '17:30:00') AT TIME ZONE 'Asia/Manila');

    -- 3. Office Visits Logbook: Morning visits (clocked in before 12:00 PM Manila)
    UPDATE public.office_visits v
    SET time_out = GREATEST(
            v.time_in + interval '1 minute',
            (timezone('Asia/Manila', v.time_in)::date + time '12:30:00') AT TIME ZONE 'Asia/Manila'
        ),
        status = 'Completed'
    WHERE v.status = 'Ongoing'
      AND v.time_out IS NULL
      AND timezone('Asia/Manila', v.time_in)::time < time '12:00:00'
      AND v_now >= ((timezone('Asia/Manila', v.time_in)::date + time '12:30:00') AT TIME ZONE 'Asia/Manila');

    -- Office Visits Logbook: Afternoon visits (clocked in at or after 12:00 PM Manila)
    UPDATE public.office_visits v
    SET time_out = GREATEST(
            v.time_in + interval '1 minute',
            (timezone('Asia/Manila', v.time_in)::date + time '17:30:00') AT TIME ZONE 'Asia/Manila'
        ),
        status = 'Completed'
    WHERE v.status = 'Ongoing'
      AND v.time_out IS NULL
      AND timezone('Asia/Manila', v.time_in)::time >= time '12:00:00'
      AND v_now >= ((timezone('Asia/Manila', v.time_in)::date + time '17:30:00') AT TIME ZONE 'Asia/Manila');
END;
$$;

REVOKE ALL ON FUNCTION public.auto_timeout_records() FROM public;
GRANT EXECUTE ON FUNCTION public.auto_timeout_records() TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Update trigger stamp_peer_facilitator_attendance_times
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stamp_peer_facilitator_attendance_times()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF public.current_student_id() IS NULL THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        NEW.time_in := now();
        NEW.time_out := NULL;
        RETURN NEW;
    END IF;

    NEW.time_in := OLD.time_in;
    IF NEW.time_out IS NOT NULL THEN
        -- Clamps any future timestamps while preserving valid historical/cutoff timestamps
        IF NEW.time_out > now() THEN
            NEW.time_out := now();
        END IF;
        IF NEW.time_out <= NEW.time_in THEN
            NEW.time_out := NEW.time_in + interval '1 minute';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Recreate public_get_student_event_status with auto-timeout hook
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_get_student_event_status(text);

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
SECURITY DEFINER
SET search_path TO 'public', pg_temp
AS $$
DECLARE
    v_student_id text;
BEGIN
    PERFORM public.auto_timeout_records();

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
-- Recreate public_get_peer_events with auto-timeout hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_get_peer_events(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id text;
    v_result jsonb;
BEGIN
    PERFORM public.auto_timeout_records();

    SELECT student_id INTO v_student_id
    FROM public.students
    WHERE student_id = trim(coalesce(p_student_id, ''))
      AND NOT coalesce(is_archived, false)
    LIMIT 1;

    SELECT coalesce(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'title', e.title,
            'description', e.description,
            'event_date', e.event_date,
            'event_time', e.event_time,
            'end_time', e.end_time,
            'location', e.location,
            'audience_type', e.audience_type,
            'time_in', att.time_in,
            'time_out', att.time_out,
            'form_id', ef.id,
            'form_title', ef.title,
            'form_is_active', coalesce(ef.is_active, false),
            'has_evaluated', (
                v_student_id IS NOT NULL AND ef.id IS NOT NULL AND EXISTS (
                    SELECT 1
                    FROM public.event_evaluation_responses r
                    WHERE r.form_id = ef.id
                      AND r.student_id = v_student_id
                )
            )
        ) ORDER BY e.event_date DESC, e.created_at DESC
    ), '[]'::jsonb)
    INTO v_result
    FROM public.events e
    LEFT JOIN LATERAL (
        SELECT time_in, time_out
        FROM public.event_attendance
        WHERE event_id = e.id AND student_id = v_student_id
        ORDER BY id DESC
        LIMIT 1
    ) att ON true
    LEFT JOIN LATERAL (
        SELECT id, title, is_active
        FROM public.event_evaluation_forms
        WHERE event_id = e.id
        ORDER BY (is_active IS TRUE) DESC, id DESC
        LIMIT 1
    ) ef ON true
    WHERE NOT coalesce(e.is_archived, false)
      AND (
          e.audience_type = 'peer_facilitators'
          OR lower(coalesce(e.title, '')) LIKE '%peer facilitator%'
      );

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_peer_events(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_peer_events(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate public_event_time_out with auto-timeout hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_event_time_out(p_event_id bigint, p_student_id text)
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
    PERFORM public.auto_timeout_records();

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
-- Recreate public_get_peer_attendance with auto-timeout hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_get_peer_attendance(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_settings public.peer_facilitator_settings;
    v_sessions jsonb;
    v_open_session jsonb;
BEGIN
    PERFORM public.auto_timeout_records();

    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    SELECT * INTO v_peer
    FROM public.peer_facilitators
    WHERE student_id = v_student.student_id
      AND archived_at IS NULL
    LIMIT 1;

    IF v_peer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not registered as an active Peer Facilitator.');
    END IF;

    SELECT * INTO v_settings FROM public.peer_facilitator_settings WHERE id = 1;

    -- Recent sessions (up to 100)
    SELECT coalesce(jsonb_agg(s ORDER BY s.time_in DESC), '[]'::jsonb)
    INTO v_sessions
    FROM (
        SELECT id, student_id, time_in, time_out
        FROM public.peer_facilitator_attendance
        WHERE student_id = v_student.student_id
        ORDER BY time_in DESC
        LIMIT 100
    ) s;

    -- Open session (if any)
    SELECT jsonb_build_object('id', id, 'time_in', time_in)
    INTO v_open_session
    FROM public.peer_facilitator_attendance
    WHERE student_id = v_student.student_id
      AND time_out IS NULL
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'is_peer', true,
        'first_name', coalesce(v_student.first_name, ''),
        'last_name', coalesce(v_student.last_name, ''),
        'course', coalesce(v_student.course, ''),
        'year_level', coalesce(v_student.year_level, ''),
        'section', coalesce(v_student.section, ''),
        'peer_year', coalesce(v_peer.peer_year, v_settings.school_year, ''),
        'time_in_enabled', coalesce(v_settings.time_in_enabled, true),
        'school_year', coalesce(v_settings.school_year, ''),
        'open_session', v_open_session,
        'sessions', v_sessions
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_peer_attendance(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_peer_attendance(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate public_peer_time_in with auto-timeout hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_peer_time_in(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_settings public.peer_facilitator_settings;
    v_new_id bigint;
    v_time_in timestamptz;
BEGIN
    PERFORM public.auto_timeout_records();

    IF NOT public.public_throttle_take(p_student_id, 'peer_time', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a moment and try again.');
    END IF;

    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    SELECT * INTO v_peer
    FROM public.peer_facilitators
    WHERE student_id = v_student.student_id
      AND archived_at IS NULL
    LIMIT 1;

    IF v_peer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not registered as an active Peer Facilitator.');
    END IF;

    SELECT * INTO v_settings FROM public.peer_facilitator_settings WHERE id = 1;
    IF v_settings.id IS NOT NULL AND NOT coalesce(v_settings.time_in_enabled, true) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Hours logging is currently paused by the CARE Center.');
    END IF;

    -- Check if open session exists
    IF EXISTS (
        SELECT 1 FROM public.peer_facilitator_attendance
        WHERE student_id = v_student.student_id
          AND time_out IS NULL
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are already timed in. Time out first.');
    END IF;

    INSERT INTO public.peer_facilitator_attendance (student_id)
    VALUES (v_student.student_id)
    RETURNING id, time_in INTO v_new_id, v_time_in;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Timed in. Your volunteer hours are now running.',
        'session', jsonb_build_object('id', v_new_id, 'time_in', v_time_in)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_peer_time_in(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_peer_time_in(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate public_peer_time_out with auto-timeout hook
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_peer_time_out(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_open_id bigint;
BEGIN
    PERFORM public.auto_timeout_records();

    IF NOT public.public_throttle_take(p_student_id, 'peer_time', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a moment and try again.');
    END IF;

    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    SELECT * INTO v_peer
    FROM public.peer_facilitators
    WHERE student_id = v_student.student_id
      AND archived_at IS NULL
    LIMIT 1;

    IF v_peer.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not registered as an active Peer Facilitator.');
    END IF;

    SELECT id INTO v_open_id
    FROM public.peer_facilitator_attendance
    WHERE student_id = v_student.student_id
      AND time_out IS NULL
    LIMIT 1;

    IF v_open_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No active timed-in session found.');
    END IF;

    UPDATE public.peer_facilitator_attendance
    SET time_out = now()
    WHERE id = v_open_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Timed out. Thank you for volunteering!'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_peer_time_out(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_peer_time_out(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Recreate public_get_active_office_visit with auto-timeout hook
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_get_active_office_visit(text, text);

CREATE FUNCTION public.public_get_active_office_visit(
    p_student_id text,
    p_visitor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', pg_temp
AS $$
DECLARE
    v_visit public.office_visits;
BEGIN
    PERFORM public.auto_timeout_records();

    IF p_student_id IS NOT NULL AND trim(p_student_id) <> '' THEN
        SELECT * INTO v_visit
        FROM public.office_visits
        WHERE student_id = trim(p_student_id)
          AND status = 'Ongoing'
          AND time_in >= (now() - interval '18 hours')
        ORDER BY time_in DESC
        LIMIT 1;
    ELSIF p_visitor_name IS NOT NULL AND trim(p_visitor_name) <> '' THEN
        SELECT * INTO v_visit
        FROM public.office_visits
        WHERE student_id IS NULL
          AND lower(student_name) = lower(trim(p_visitor_name))
          AND status = 'Ongoing'
          AND time_in >= (now() - interval '18 hours')
        ORDER BY time_in DESC
        LIMIT 1;
    END IF;

    IF v_visit.id IS NULL THEN
        RETURN jsonb_build_object('has_active', false);
    END IF;

    RETURN jsonb_build_object(
        'has_active', true,
        'visit_id', v_visit.id,
        'student_name', v_visit.student_name,
        'student_id', v_visit.student_id,
        'reason', v_visit.reason,
        'time_in', v_visit.time_in,
        'is_visitor', (v_visit.student_id IS NULL)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_office_visit(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_office_visit(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Run immediate backfill of any existing unclosed records
-- ---------------------------------------------------------------------------
SELECT public.auto_timeout_records();
