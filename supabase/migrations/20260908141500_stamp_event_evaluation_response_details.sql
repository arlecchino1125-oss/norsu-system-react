-- =============================================================================
-- Migration: Stamp Student Details on Event Evaluation Responses
-- Description:
-- 1. Updates stamp_event_evaluation_response_identity trigger to resolve
--    student details (name, department, course, year_level) from students table
--    even when submitted by anon via public_event_evaluate.
-- 2. Updates public_event_evaluate to explicitly supply resolved student metadata.
-- 3. Backfills existing event_evaluation_responses rows missing student details.
-- =============================================================================

-- 1. Update trigger to resolve student details from student_id if missing
CREATE OR REPLACE FUNCTION public.stamp_event_evaluation_response_identity() RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
DECLARE
    v_auth_student_id text := public.current_student_id();
    v_target_student_id text;
BEGIN
    -- If authenticated student session, lock to their student_id
    IF v_auth_student_id IS NOT NULL THEN
        NEW.student_id := v_auth_student_id;
    END IF;

    v_target_student_id := coalesce(NEW.student_id, v_auth_student_id);

    -- If name, course, or department is missing, auto-populate from students table
    IF v_target_student_id IS NOT NULL AND (NEW.student_name IS NULL OR NEW.course IS NULL) THEN
        SELECT
            trim(concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.suffix)),
            s.department,
            s.course,
            s.year_level
        INTO
            NEW.student_name,
            NEW.department,
            NEW.course,
            NEW.year_level
        FROM public.students s
        WHERE s.student_id = v_target_student_id;
    END IF;

    NEW.submitted_at := coalesce(NEW.submitted_at, now());

    RETURN NEW;
END;
$$;

-- 2. Update public_event_evaluate to supply metadata explicitly
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
        student_name,
        department,
        course,
        year_level,
        submitted_at
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

-- 3. Backfill all existing rows in event_evaluation_responses
UPDATE public.event_evaluation_responses r
SET
    student_name = coalesce(nullif(r.student_name, ''), trim(concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.suffix))),
    department = coalesce(r.department, s.department),
    course = coalesce(r.course, s.course),
    year_level = coalesce(r.year_level, s.year_level)
FROM public.students s
WHERE s.student_id = r.student_id
  AND (r.student_name IS NULL OR r.course IS NULL);
