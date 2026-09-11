-- =============================================================================
-- Migration: Public Peer Events RPC & Evaluation Timing
-- Description:
-- 1. Adds public_get_peer_events RPC with SECURITY DEFINER to return peer
--    events, attendance state, and evaluation forms for anon/authenticated
--    without RLS 401 permission errors.
-- 2. Allows evaluation of peer_facilitators events when is_active is true,
--    even before schedule conclusion.
-- =============================================================================

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

-- Update public_event_evaluate to allow peer event evaluation when active
CREATE OR REPLACE FUNCTION public.public_event_evaluate(
    p_event_id bigint,
    p_student_id text,
    p_form_id bigint,
    p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

    IF v_event.audience_type <> 'peer_facilitators' THEN
        IF v_end IS NULL OR now() < v_end THEN
            RETURN jsonb_build_object('success', false, 'error', 'You can evaluate this event after it ends.');
        END IF;
        IF now() > v_close THEN
            RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.event_evaluation_responses
        WHERE form_id = p_form_id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already evaluated this event.');
    END IF;

    -- Verify all required questions are answered
    SELECT count(*) INTO v_expected
    FROM public.event_evaluation_questions
    WHERE form_id = p_form_id AND is_required = true;

    SELECT count(DISTINCT (a->>'question_id')::bigint) INTO v_answered
    FROM jsonb_array_elements(p_answers) a
    JOIN public.event_evaluation_questions q ON q.id = (a->>'question_id')::bigint
    WHERE q.form_id = p_form_id
      AND q.is_required = true
      AND (
          (q.question_type = 'scale' AND (a->>'answer_value') IS NOT NULL)
          OR (q.question_type IN ('text', 'choice') AND trim(coalesce(a->>'answer_text', '')) <> '')
      );

    IF v_answered < v_expected THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every required question before submitting.');
    END IF;

    INSERT INTO public.event_evaluation_responses (
        form_id,
        student_id,
        submitted_at
    ) VALUES (
        p_form_id,
        v_student.student_id,
        now()
    ) RETURNING id INTO v_response_id;

    FOR v_answer IN SELECT * FROM jsonb_array_elements(p_answers)
    LOOP
        INSERT INTO public.event_evaluation_answers (
            response_id,
            question_id,
            answer_value,
            answer_text
        ) VALUES (
            v_response_id,
            (v_answer->>'question_id')::bigint,
            (v_answer->>'answer_value')::integer,
            v_answer->>'answer_text'
        );
    END LOOP;

    RETURN jsonb_build_object('success', true, 'message', 'Thank you! Your evaluation has been recorded.');
END;
$$;

REVOKE ALL ON FUNCTION public.public_event_evaluate(bigint, text, bigint, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_evaluate(bigint, text, bigint, jsonb) TO anon, authenticated;
