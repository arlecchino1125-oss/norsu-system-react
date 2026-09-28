-- Counseling Flow v2: Approval gates, outcome statuses, follow-up linkage, evaluation eligibility, and permissions.

-- 1) 2nd-session linkage (ONLY schema change)
ALTER TABLE public.counseling_requests
    ADD COLUMN IF NOT EXISTS follow_up_of bigint
    REFERENCES public.counseling_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS counseling_requests_follow_up_idx
    ON public.counseling_requests (follow_up_of) WHERE follow_up_of IS NOT NULL;

-- 2) Evaluation + rating eligibility: outcome statuses count as a finished session
--    a) student_may_evaluate_counseling() -> status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
CREATE OR REPLACE FUNCTION public.student_may_evaluate_counseling(p_request_id bigint) RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.counseling_requests r
        JOIN public.counseling_evaluation_forms f ON f.is_global
        WHERE r.id = p_request_id
          AND r.student_id = public.current_student_id()
          AND r.status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
          AND f.is_active
    );
$$;

REVOKE ALL ON FUNCTION public.student_may_evaluate_counseling(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.student_may_evaluate_counseling(bigint) TO authenticated;

--    b) student_has_completed_counseling() -> status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
CREATE OR REPLACE FUNCTION public.student_has_completed_counseling() RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = 'public'
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.counseling_requests r
        WHERE r.student_id = public.current_student_id()
          AND r.status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
    );
$$;

REVOKE ALL ON FUNCTION public.student_has_completed_counseling() FROM anon;
GRANT EXECUTE ON FUNCTION public.student_has_completed_counseling() TO authenticated;

--    c) policy counseling_requests_student_feedback_update -> same 4-status list
DROP POLICY IF EXISTS "counseling_requests_student_feedback_update" ON public.counseling_requests;

CREATE POLICY "counseling_requests_student_feedback_update"
    ON public.counseling_requests
    FOR UPDATE
    TO authenticated
    USING (
        student_id = public.current_student_id()
        AND status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
    )
    WITH CHECK (
        student_id = public.current_student_id()
        AND status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
    );

--    d) public_counseling_evaluate() with status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
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

    -- Session-linked path: the session must be the student's own and completed/outcome-marked,
    -- and it must not have been evaluated yet.
    IF p_request_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.counseling_requests r
            WHERE r.id = p_request_id
              AND r.student_id = v_student.student_id
              AND r.status IN ('Completed', 'Counseled', 'Monitoring', 'Subject_For_2nd_Counseling')
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

-- 3) Permission seed (pattern of 20260803090000_…)
INSERT INTO public.role_permissions (role, permission_type, permission_key, is_allowed, status, description, created_by)
SELECT 'Care Staff', 'action', 'manage_counseling_outcome', true, 'enabled',
       'Set counseling outcome statuses (Counseled, Monitoring, Subject for 2nd Counseling) on completed sessions', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = 'Care Staff'
      AND permission_type = 'action'
      AND permission_key = 'manage_counseling_outcome'
);
