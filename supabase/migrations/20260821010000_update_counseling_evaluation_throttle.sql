-- Update counseling evaluation public rate limit to 2 per 5 minutes.

CREATE OR REPLACE FUNCTION public.public_counseling_evaluate(
    p_student_id text,
    p_request_id bigint,
    p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_form public.counseling_evaluation_forms;
    v_response_id bigint;
    v_answer jsonb;
    v_answered integer;
    v_expected integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    -- Throttled to 2 submissions per 5-minute window
    IF NOT public.public_throttle_take(v_student.student_id, 'counseling_evaluate', 2, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    IF jsonb_typeof(coalesce(p_answers, 'null'::jsonb)) <> 'array'
       OR jsonb_array_length(p_answers) = 0
       OR jsonb_array_length(p_answers) > 200 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every question before submitting.');
    END IF;

    SELECT * INTO v_form
    FROM public.counseling_evaluation_forms
    WHERE is_global = true AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No counseling evaluation form is available right now.');
    END IF;

    -- Session-linked path: the session must be the student's own and Completed,
    -- and it must not have been evaluated yet.
    IF p_request_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.counseling_requests r
            WHERE r.id = p_request_id
              AND r.student_id = v_student.student_id
              AND r.status = 'Completed'
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'This counseling session is not available for evaluation.');
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.counseling_evaluation_responses er
            WHERE er.counseling_request_id = p_request_id
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'You have already evaluated this session.');
        END IF;
    END IF;

    -- A blank submission is rejected outright: every question on the form needs
    -- an answer that is actually present, not just a key with an empty value.
    SELECT count(*) INTO v_expected
    FROM public.counseling_evaluation_questions
    WHERE form_id = v_form.id;

    SELECT count(DISTINCT (a->>'question_id')::bigint) INTO v_answered
    FROM jsonb_array_elements(p_answers) a
    WHERE (a->>'question_id') ~ '^[0-9]+$'
      AND (
          nullif(a->>'answer_value', '') IS NOT NULL
          OR nullif(trim(coalesce(a->>'answer_text', '')), '') IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM public.counseling_evaluation_questions q
          WHERE q.form_id = v_form.id AND q.id = (a->>'question_id')::bigint
      );

    IF v_answered < v_expected THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every question before submitting.');
    END IF;

    INSERT INTO public.counseling_evaluation_responses (
        form_id, counseling_request_id, student_id, student_name, department, course, year_level, submitted_at
    ) VALUES (
        v_form.id,
        p_request_id,
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
            SELECT 1 FROM public.counseling_evaluation_questions q
            WHERE q.form_id = v_form.id AND q.id = (v_answer->>'question_id')::bigint
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.counseling_evaluation_answers (response_id, question_id, answer_value, answer_text)
        VALUES (
            v_response_id,
            (v_answer->>'question_id')::bigint,
            CASE WHEN (v_answer->>'answer_value') ~ '^-?[0-9]+$'
                THEN (v_answer->>'answer_value')::integer END,
            left(nullif(trim(coalesce(v_answer->>'answer_text', '')), ''), 1500)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_counseling_evaluate(text, bigint, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.public_counseling_evaluate(text, bigint, jsonb) TO anon, authenticated;
