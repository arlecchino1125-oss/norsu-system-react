-- =============================================================================
-- Migration: Public Peer Facilitator Services (Time In/Out & Logbooks)
-- Description: Enables active Peer Facilitators to log volunteer hours (time-in/out),
--              manage peer support logbooks, and submit CARE activities logbooks
--              directly from the Public Hub using their verified Student ID.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enhance public_verify_student to detect active peer facilitator status
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_verify_student(text);

CREATE FUNCTION public.public_verify_student(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_is_peer boolean := false;
BEGIN
    IF length(coalesce(p_student_id, '')) > 64 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    IF NOT public.public_throttle_take(p_student_id, 'verify', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
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

    IF v_peer.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', true,
            'student', jsonb_build_object(
                'student_id', v_student.student_id,
                'is_peer', true
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object(
            'student_id', v_student.student_id,
            'is_peer', false
        )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_verify_student(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_verify_student(text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Public Peer Attendance: Get Data, Time In, Time Out
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_get_peer_attendance(text);

CREATE FUNCTION public.public_get_peer_attendance(p_student_id text)
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

-- Peer Time In
DROP FUNCTION IF EXISTS public.public_peer_time_in(text);

CREATE FUNCTION public.public_peer_time_in(p_student_id text)
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

-- Peer Time Out
DROP FUNCTION IF EXISTS public.public_peer_time_out(text);

CREATE FUNCTION public.public_peer_time_out(p_student_id text)
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
-- 3. Public Peer Logbooks: Peer Support & CARE Activities
-- ---------------------------------------------------------------------------

-- Get Logbook (Peer Support or CARE Activities)
DROP FUNCTION IF EXISTS public.public_get_peer_logbook(text, text, date);

CREATE FUNCTION public.public_get_peer_logbook(
    p_student_id text,
    p_logbook_type text,
    p_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_month date := date_trunc('month', p_month)::date;
    v_logbook jsonb := null;
    v_entries jsonb := '[]'::jsonb;
    v_archived jsonb := '[]'::jsonb;
    v_book_id uuid;
BEGIN
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

    IF p_logbook_type = 'peer_support' THEN
        SELECT jsonb_build_object(
            'id', id,
            'month', month,
            'status', status,
            'submitted_at', submitted_at,
            'reviewer_name', reviewer_name,
            'reviewed_at', reviewed_at
        ), id INTO v_logbook, v_book_id
        FROM public.peer_facilitator_logbooks
        WHERE student_id = v_student.student_id
          AND month = v_month
        LIMIT 1;

        IF v_book_id IS NOT NULL THEN
            SELECT coalesce(jsonb_agg(e ORDER BY e.entry_date DESC, e.logged_at DESC), '[]'::jsonb)
            INTO v_entries
            FROM (
                SELECT id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
                       assisted_student_id, assisted_initials, concern, action_taken, remarks, referred
                FROM public.peer_facilitator_log_entries
                WHERE logbook_id = v_book_id
            ) e;
        END IF;

        SELECT coalesce(jsonb_agg(a ORDER BY a.month DESC), '[]'::jsonb)
        INTO v_archived
        FROM (
            SELECT id, month, submitted_at
            FROM public.peer_facilitator_logbooks
            WHERE student_id = v_student.student_id
              AND status = 'submitted'
            ORDER BY month DESC
        ) a;

    ELSIF p_logbook_type = 'care_activities' THEN
        SELECT jsonb_build_object(
            'id', id,
            'month', month,
            'status', status,
            'submitted_at', submitted_at,
            'reviewer_name', reviewer_name,
            'reviewed_at', reviewed_at
        ), id INTO v_logbook, v_book_id
        FROM public.care_activities_logbooks
        WHERE student_id = v_student.student_id
          AND month = v_month
        LIMIT 1;

        IF v_book_id IS NOT NULL THEN
            SELECT coalesce(jsonb_agg(e ORDER BY e.entry_date DESC, e.logged_at DESC), '[]'::jsonb)
            INTO v_entries
            FROM (
                SELECT id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
                       speakers, action_taken, remarks
                FROM public.care_activities_log_entries
                WHERE logbook_id = v_book_id
            ) e;
        END IF;

        SELECT coalesce(jsonb_agg(a ORDER BY a.month DESC), '[]'::jsonb)
        INTO v_archived
        FROM (
            SELECT id, month, submitted_at
            FROM public.care_activities_logbooks
            WHERE student_id = v_student.student_id
              AND status = 'submitted'
            ORDER BY month DESC
        ) a;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid logbook type.');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'month', v_month,
        'logbook', v_logbook,
        'entries', v_entries,
        'archived', v_archived
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_peer_logbook(text, text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_peer_logbook(text, text, date) TO anon, authenticated;

-- Save Entry (Insert or Update)
DROP FUNCTION IF EXISTS public.public_save_peer_log_entry(text, text, date, uuid, jsonb);

CREATE FUNCTION public.public_save_peer_log_entry(
    p_student_id text,
    p_logbook_type text,
    p_month date,
    p_entry_id uuid,
    p_draft jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_month date := date_trunc('month', p_month)::date;
    v_book_id uuid;
    v_book_status text;
    v_entry_date date;
BEGIN
    IF NOT public.public_throttle_take(p_student_id, 'peer_entry', 20, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many requests. Please wait a moment and try again.');
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

    v_entry_date := (p_draft->>'entry_date')::date;
    IF v_entry_date IS NULL OR v_entry_date < v_month OR v_entry_date >= (v_month + interval '1 month') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Entry date must fall within the selected month.');
    END IF;

    IF p_logbook_type = 'peer_support' THEN
        -- Upsert draft logbook
        INSERT INTO public.peer_facilitator_logbooks (student_id, month, status)
        VALUES (v_student.student_id, v_month, 'draft')
        ON CONFLICT (student_id, month) DO NOTHING;

        SELECT id, status INTO v_book_id, v_book_status
        FROM public.peer_facilitator_logbooks
        WHERE student_id = v_student.student_id AND month = v_month;

        IF v_book_status != 'draft' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This logbook has already been submitted and cannot be edited.');
        END IF;

        IF p_entry_id IS NOT NULL THEN
            UPDATE public.peer_facilitator_log_entries
            SET entry_date = v_entry_date,
                activity_type = trim(p_draft->>'activity_type'),
                assisted_student_id = nullif(trim(p_draft->>'assisted_student_id'), ''),
                assisted_initials = nullif(trim(p_draft->>'assisted_initials'), ''),
                concern = trim(p_draft->>'concern'),
                action_taken = trim(p_draft->>'action_taken'),
                remarks = nullif(trim(p_draft->>'remarks'), ''),
                referred = coalesce((p_draft->>'referred')::boolean, false)
            WHERE id = p_entry_id AND logbook_id = v_book_id;
        ELSE
            INSERT INTO public.peer_facilitator_log_entries (
                logbook_id, logbook_month, entry_date, activity_type,
                assisted_student_id, assisted_initials, concern, action_taken, remarks, referred
            ) VALUES (
                v_book_id, v_month, v_entry_date, trim(p_draft->>'activity_type'),
                nullif(trim(p_draft->>'assisted_student_id'), ''), nullif(trim(p_draft->>'assisted_initials'), ''),
                trim(p_draft->>'concern'), trim(p_draft->>'action_taken'),
                nullif(trim(p_draft->>'remarks'), ''), coalesce((p_draft->>'referred')::boolean, false)
            );
        END IF;

    ELSIF p_logbook_type = 'care_activities' THEN
        -- Upsert draft logbook
        INSERT INTO public.care_activities_logbooks (student_id, month, status)
        VALUES (v_student.student_id, v_month, 'draft')
        ON CONFLICT (student_id, month) DO NOTHING;

        SELECT id, status INTO v_book_id, v_book_status
        FROM public.care_activities_logbooks
        WHERE student_id = v_student.student_id AND month = v_month;

        IF v_book_status != 'draft' THEN
            RETURN jsonb_build_object('success', false, 'error', 'This logbook has already been submitted and cannot be edited.');
        END IF;

        IF p_entry_id IS NOT NULL THEN
            UPDATE public.care_activities_log_entries
            SET entry_date = v_entry_date,
                activity_type = trim(p_draft->>'activity_type'),
                speakers = nullif(trim(p_draft->>'speakers'), ''),
                action_taken = trim(p_draft->>'action_taken'),
                remarks = nullif(trim(p_draft->>'remarks'), '')
            WHERE id = p_entry_id AND logbook_id = v_book_id;
        ELSE
            INSERT INTO public.care_activities_log_entries (
                logbook_id, logbook_month, entry_date, activity_type,
                speakers, action_taken, remarks
            ) VALUES (
                v_book_id, v_month, v_entry_date, trim(p_draft->>'activity_type'),
                nullif(trim(p_draft->>'speakers'), ''), trim(p_draft->>'action_taken'),
                nullif(trim(p_draft->>'remarks'), '')
            );
        END IF;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid logbook type.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_save_peer_log_entry(text, text, date, uuid, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.public_save_peer_log_entry(text, text, date, uuid, jsonb) TO anon, authenticated;

-- Delete Entry
DROP FUNCTION IF EXISTS public.public_delete_peer_log_entry(text, text, uuid);

CREATE FUNCTION public.public_delete_peer_log_entry(
    p_student_id text,
    p_logbook_type text,
    p_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
BEGIN
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

    IF p_logbook_type = 'peer_support' THEN
        DELETE FROM public.peer_facilitator_log_entries e
        USING public.peer_facilitator_logbooks b
        WHERE e.id = p_entry_id
          AND e.logbook_id = b.id
          AND b.student_id = v_student.student_id
          AND b.status = 'draft';
    ELSIF p_logbook_type = 'care_activities' THEN
        DELETE FROM public.care_activities_log_entries e
        USING public.care_activities_logbooks b
        WHERE e.id = p_entry_id
          AND e.logbook_id = b.id
          AND b.student_id = v_student.student_id
          AND b.status = 'draft';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_delete_peer_log_entry(text, text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_delete_peer_log_entry(text, text, uuid) TO anon, authenticated;

-- Submit Logbook
DROP FUNCTION IF EXISTS public.public_submit_peer_logbook(text, text, date);

CREATE FUNCTION public.public_submit_peer_logbook(
    p_student_id text,
    p_logbook_type text,
    p_month date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_month date := date_trunc('month', p_month)::date;
BEGIN
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

    IF p_logbook_type = 'peer_support' THEN
        UPDATE public.peer_facilitator_logbooks
        SET status = 'submitted',
            submitted_at = now()
        WHERE student_id = v_student.student_id
          AND month = v_month
          AND status = 'draft';
    ELSIF p_logbook_type = 'care_activities' THEN
        UPDATE public.care_activities_logbooks
        SET status = 'submitted',
            submitted_at = now()
        WHERE student_id = v_student.student_id
          AND month = v_month
          AND status = 'draft';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_peer_logbook(text, text, date) FROM public;
GRANT EXECUTE ON FUNCTION public.public_submit_peer_logbook(text, text, date) TO anon, authenticated;

-- Search Assisted Students for Peer
DROP FUNCTION IF EXISTS public.public_search_students_for_peer(text, text);

CREATE FUNCTION public.public_search_students_for_peer(
    p_student_id text,
    p_term text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student public.students;
    v_peer public.peer_facilitators;
    v_term text := trim(coalesce(p_term, ''));
    v_result jsonb := '[]'::jsonb;
BEGIN
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

    IF length(v_term) < 2 THEN
        SELECT coalesce(jsonb_agg(s), '[]'::jsonb)
        INTO v_result
        FROM (
            SELECT st.student_id, st.first_name, st.last_name
            FROM public.students st
            WHERE st.student_id IN (
                SELECT e.assisted_student_id
                FROM public.peer_facilitator_log_entries e
                JOIN public.peer_facilitator_logbooks b ON b.id = e.logbook_id
                WHERE b.student_id = v_student.student_id
                  AND e.assisted_student_id IS NOT NULL
                ORDER BY e.logged_at DESC
                LIMIT 25
            )
            LIMIT 5
        ) s;
    ELSE
        SELECT coalesce(jsonb_agg(s), '[]'::jsonb)
        INTO v_result
        FROM (
            SELECT st.student_id, st.first_name, st.last_name
            FROM public.students st
            WHERE st.student_id ILIKE '%' || v_term || '%'
               OR st.first_name ILIKE '%' || v_term || '%'
               OR st.last_name ILIKE '%' || v_term || '%'
            ORDER BY st.last_name ASC, st.first_name ASC
            LIMIT 5
        ) s;
    END IF;

    RETURN jsonb_build_object('success', true, 'students', v_result);
END;
$$;

REVOKE ALL ON FUNCTION public.public_search_students_for_peer(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_search_students_for_peer(text, text) TO anon, authenticated;
