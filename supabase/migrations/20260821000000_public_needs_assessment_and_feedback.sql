-- Public Needs Assessment + General Feedback for the ID-only portal.
--
-- Follows the exact security contract established by
-- 20260804090000_public_events_id_only.sql and 20260818000000_counseling_evaluations.sql:
--   * Every public_* function is SECURITY DEFINER with SET search_path TO 'public'.
--   * Student identity resolves server-side through public_resolve_student(p_student_id).
--   * No profile field (name, department, course, etc.) is ever read by the browser;
--     every PII stamp comes from v_student.* inside the function.
--   * Writes are rate-limited via public_throttle_take.
--   * The anon role executes every RPC; the resolver is never granted to anon.
--
-- General feedback additionally allows anonymous submission (no student_id),
-- so locked-out students and even visitors can leave service-quality feedback.

-- ---------------------------------------------------------------------------
-- 1. Needs Assessment: list active forms (with completion status if an id is
--    supplied). STABLE because it is a pure read.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_get_assessment_forms(p_student_id text DEFAULT NULL)
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    title text,
    description text,
    is_completed boolean
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
        f.id,
        f.created_at,
        f.title,
        f.description,
        EXISTS (
            SELECT 1 FROM public.needs_assessment_submissions s
            WHERE s.form_id = f.id
              AND v_student.student_id IS NOT NULL
              AND s.student_id = v_student.student_id
        ) AS is_completed
    FROM public.needs_assessment_forms f
    WHERE f.is_active = true
    ORDER BY f.created_at DESC;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Needs Assessment: list questions for one form. The questions are global
--    (no student context), so no id is required to read them. STABLE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_get_assessment_form_questions(p_form_id bigint)
RETURNS TABLE (
    id bigint,
    question_text text,
    question_type text,
    scale_min integer,
    scale_max integer,
    order_index integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT
        q.id,
        q.question_text,
        q.question_type,
        q.scale_min,
        q.scale_max,
        q.order_index
    FROM public.needs_assessment_questions q
    JOIN public.needs_assessment_forms f ON f.id = q.form_id
    WHERE q.form_id = p_form_id
      AND f.is_active = true
    ORDER BY q.order_index;
$$;

-- ---------------------------------------------------------------------------
-- 3. Needs Assessment: submit answers. VOLATILE (inserts), rate-limited.
--    Accepts answers as JSONB: [{ "question_id": 1, "answer_value": 3,
--        "answer_text": null }, ...]. Validates that every question belongs to
--    the form, and enforces one submission per (student, form).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_submit_assessment(
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
    v_form public.needs_assessment_forms;
    v_submission_id bigint;
    v_answer jsonb;
    v_expected integer;
    v_answered integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'assessment', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    SELECT * INTO v_form
    FROM public.needs_assessment_forms
    WHERE id = p_form_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This form is not available right now.');
    END IF;

    -- Enforce one submission per student per form.
    IF EXISTS (
        SELECT 1 FROM public.needs_assessment_submissions
        WHERE form_id = v_form.id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already completed this assessment.');
    END IF;

    -- Every answer must reference a question on this form.
    SELECT count(*) INTO v_expected
    FROM public.needs_assessment_questions
    WHERE form_id = v_form.id;

    SELECT count(DISTINCT (a->>'question_id')::bigint) INTO v_answered
    FROM jsonb_array_elements(p_answers) a
    WHERE (a->>'question_id') ~ '^[0-9]+$'
      AND (
          nullif(a->>'answer_value', '') IS NOT NULL
          OR nullif(trim(coalesce(a->>'answer_text', '')), '') IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM public.needs_assessment_questions q
          WHERE q.form_id = v_form.id AND q.id = (a->>'question_id')::bigint
      );

    IF v_answered < v_expected THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every question before submitting.');
    END IF;

    INSERT INTO public.needs_assessment_submissions (form_id, student_id, submitted_at)
    VALUES (v_form.id, v_student.student_id, now())
    RETURNING id INTO v_submission_id;

    FOR v_answer IN SELECT jsonb_array_elements(p_answers)
    LOOP
        IF (v_answer->>'question_id') !~ '^[0-9]+$' THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.needs_assessment_questions q
            WHERE q.form_id = v_form.id AND q.id = (v_answer->>'question_id')::bigint
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.needs_assessment_answers (
            submission_id, question_id, answer_value, answer_text
        ) VALUES (
            v_submission_id,
            (v_answer->>'question_id')::bigint,
            CASE WHEN (v_answer->>'answer_value') ~ '^-?[0-9]+$'
                THEN (v_answer->>'answer_value')::integer END,
            left(nullif(trim(coalesce(v_answer->>'answer_text', '')), ''), 1500)
        );
    END LOOP;

        RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. General Feedback: submit Citizen's Charter / SQD feedback.
--    p_student_id is OPTIONAL: when absent (NULL) the submission is anonymous
--    and student_name is set to 'Guest'. When supplied, the real name is stamped
--    server-side from the resolved student row.
--
--    p_data carries the form fields as JSONB to avoid a 19-parameter signature.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_submit_general_feedback(
    p_data jsonb,
    p_student_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_throttle_key text;
    v_student_name text := 'Guest';
    v_student_id text := 'guest';
BEGIN
    -- Resolve the student when an id is supplied so the browser can never
    -- stamp a name or id it does not own.
    IF nullif(trim(coalesce(p_student_id, '')), '') IS NOT NULL THEN
        v_student := public.public_resolve_student(p_student_id);
        IF v_student.student_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
        END IF;
        v_student_id := v_student.student_id;
        v_student_name := trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix));
    END IF;

    -- Throttle: by student id when known, by lowercased email when provided,
    -- or by a shared anonymous bucket otherwise. Budget 5 / 5 min.
    IF p_data ? 'email' AND p_data->>'email' IS NOT NULL AND trim(p_data->>'email') <> '' THEN
        v_throttle_key := lower(trim(p_data->>'email'));
    ELSIF v_student_id <> 'guest' THEN
        v_throttle_key := v_student_id;
    ELSE
        v_throttle_key := 'anonymous';
    END IF;

    IF NOT public.public_throttle_take(v_throttle_key, 'feedback', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    INSERT INTO public.general_feedback (
        student_id, student_name, client_type, sex, age, region,
        service_availed, cc1, cc2, cc3,
        sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8,
        suggestions, email
    ) VALUES (
        v_student_id,
        v_student_name,
        nullif(trim(coalesce(p_data->>'client_type', '')), ''),
        (p_data->>'sex')::text,
        CASE WHEN (p_data->>'age') ~ '^[0-9]+$' THEN (p_data->>'age')::integer END,
        nullif(trim(coalesce(p_data->>'region', '')), ''),
        nullif(trim(coalesce(p_data->>'service_availed', '')), ''),
        CASE WHEN (p_data->>'cc1') ~ '^[0-9]+$' THEN (p_data->>'cc1')::integer END,
        CASE WHEN (p_data->>'cc2') ~ '^[0-9]+$' THEN (p_data->>'cc2')::integer END,
        CASE WHEN (p_data->>'cc3') ~ '^[0-9]+$' THEN (p_data->>'cc3')::integer END,
        CASE WHEN (p_data->>'sqd0') ~ '^[0-9]+$' THEN (p_data->>'sqd0')::integer END,
        CASE WHEN (p_data->>'sqd1') ~ '^[0-9]+$' THEN (p_data->>'sqd1')::integer END,
        CASE WHEN (p_data->>'sqd2') ~ '^[0-9]+$' THEN (p_data->>'sqd2')::integer END,
        CASE WHEN (p_data->>'sqd3') ~ '^[0-9]+$' THEN (p_data->>'sqd3')::integer END,
        CASE WHEN (p_data->>'sqd4') ~ '^[0-9]+$' THEN (p_data->>'sqd4')::integer END,
        CASE WHEN (p_data->>'sqd5') ~ '^[0-9]+$' THEN (p_data->>'sqd5')::integer END,
        CASE WHEN (p_data->>'sqd6') ~ '^[0-9]+$' THEN (p_data->>'sqd6')::integer END,
        CASE WHEN (p_data->>'sqd7') ~ '^[0-9]+$' THEN (p_data->>'sqd7')::integer END,
        CASE WHEN (p_data->>'sqd8') ~ '^[0-9]+$' THEN (p_data->>'sqd8')::integer END,
        nullif(trim(coalesce(p_data->>'suggestions', '')), ''),
        nullif(trim(coalesce(p_data->>'email', '')), '')
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.public_get_assessment_forms(text) FROM public;
REVOKE ALL ON FUNCTION public.public_get_assessment_form_questions(bigint) FROM public;
REVOKE ALL ON FUNCTION public.public_submit_assessment(text, bigint, jsonb) FROM public;
REVOKE ALL ON FUNCTION public.public_submit_general_feedback(jsonb, text) FROM public;

GRANT EXECUTE ON FUNCTION public.public_get_assessment_forms(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_get_assessment_form_questions(bigint) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_assessment(text, bigint, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_submit_general_feedback(jsonb, text) TO anon, authenticated;