-- Public Requests & Application Submissions (Counseling, Support, Direct Scholarship)
-- Uses server-side student resolution to keep private records safe while allowing fast submissions.

-- 1. Public Counseling Appointment Request
CREATE OR REPLACE FUNCTION public.public_submit_counseling_request(
    p_student_id text,
    p_reason_for_referral text,
    p_personal_actions_taken text DEFAULT '',
    p_date_duration_of_concern text DEFAULT '',
    p_contact_number text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_student_name text;
    v_course_year text;
    v_contact text;
    v_req_id bigint;
    v_reason text := nullif(trim(p_reason_for_referral), '');
BEGIN
    IF nullif(trim(p_student_id), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a valid Student ID.');
    END IF;

    IF v_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide your reason/s for requesting counseling.');
    END IF;

    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID not found in records.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'counseling_req', 2, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many requests submitted. Please wait a few moments.');
    END IF;

    v_student_name := trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix));
    v_course_year := trim(concat_ws(' - ', v_student.course, v_student.year_level));
    v_contact := coalesce(nullif(trim(p_contact_number), ''), v_student.mobile, '');

    INSERT INTO public.counseling_requests (
        student_id,
        student_name,
        department,
        course_year,
        contact_number,
        request_type,
        description,
        reason_for_referral,
        personal_actions_taken,
        date_duration_of_concern,
        status
    ) VALUES (
        v_student.student_id,
        v_student_name,
        v_student.department,
        v_course_year,
        v_contact,
        'Self-Referral',
        v_reason,
        v_reason,
        coalesce(trim(p_personal_actions_taken), ''),
        coalesce(trim(p_date_duration_of_concern), ''),
        'Submitted'
    ) RETURNING id INTO v_req_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_req_id,
        'student_name', v_student_name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_counseling_request(text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_submit_counseling_request(text, text, text, text, text) TO anon, authenticated;

-- 2. Public Additional Support Request
CREATE OR REPLACE FUNCTION public.public_submit_support_request(
    p_student_id text,
    p_categories text[],
    p_other_category text DEFAULT '',
    p_q1 text DEFAULT '',
    p_q2 text DEFAULT '',
    p_q3 text DEFAULT '',
    p_q4 text DEFAULT '',
    p_documents_url text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_student_name text;
    v_support_type text;
    v_description text;
    v_req_id bigint;
    v_cats text[];
BEGIN
    IF nullif(trim(p_student_id), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a valid Student ID.');
    END IF;

    v_cats := coalesce(p_categories, ARRAY[]::text[]);
    IF nullif(trim(p_other_category), '') IS NOT NULL THEN
        v_cats := array_append(v_cats, 'Other: ' || trim(p_other_category));
    END IF;

    IF array_length(v_cats, 1) IS NULL OR array_length(v_cats, 1) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please select at least one support category.');
    END IF;

    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID not found in records.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'support_req', 2, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many requests submitted. Please wait a few moments.');
    END IF;

    v_student_name := trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix));
    v_support_type := array_to_string(v_cats, ', ');
    v_description := trim(concat_ws(
        E'\n',
        '[Q1 Description]: ' || coalesce(trim(p_q1), ''),
        '[Q2 Previous Support]: ' || coalesce(trim(p_q2), ''),
        '[Q3 Required Support]: ' || coalesce(trim(p_q3), ''),
        '[Q4 Other Needs]: ' || coalesce(trim(p_q4), '')
    ));

    INSERT INTO public.support_requests (
        student_id,
        student_name,
        department,
        support_type,
        description,
        documents_url,
        status
    ) VALUES (
        v_student.student_id,
        v_student_name,
        v_student.department,
        v_support_type,
        v_description,
        nullif(trim(p_documents_url), ''),
        'Submitted'
    ) RETURNING id INTO v_req_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_req_id,
        'student_name', v_student_name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_support_request(text, text[], text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_submit_support_request(text, text[], text, text, text, text, text, text) TO anon, authenticated;

-- 3. Public Direct Scholarship Application Submission
CREATE OR REPLACE FUNCTION public.public_submit_scholarship_application(
    p_student_id text,
    p_scholarship_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_scholarship public.scholarships;
    v_app_id bigint;
BEGIN
    IF nullif(trim(p_student_id), '') IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please provide a valid Student ID.');
    END IF;

    IF p_scholarship_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please specify the scholarship to apply for.');
    END IF;

    -- Validate scholarship exists and is active
    SELECT * INTO v_scholarship
    FROM public.scholarships
    WHERE id = p_scholarship_id AND is_active = true;

    IF v_scholarship.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Scholarship not found or is no longer open.');
    END IF;

    -- Validate deadline
    IF v_scholarship.deadline IS NOT NULL AND trim(v_scholarship.deadline) <> '' THEN
        IF v_scholarship.deadline ~ '^\d{4}-\d{2}-\d{2}$' THEN
            IF (v_scholarship.deadline || ' 23:59:59+08')::timestamptz < now() THEN
                RETURN jsonb_build_object('success', false, 'error', 'The deadline for this scholarship has already passed.');
            END IF;
        END IF;
    END IF;

    -- Resolve student
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID not found in records.');
    END IF;

    -- Check duplicate application
    IF EXISTS (
        SELECT 1 FROM public.scholarship_applications
        WHERE scholarship_id = p_scholarship_id
          AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already submitted an application for this scholarship.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'scholarship_app', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few moments.');
    END IF;

    INSERT INTO public.scholarship_applications (
        scholarship_id,
        student_id,
        status
    ) VALUES (
        p_scholarship_id,
        v_student.student_id,
        'Pending'
    ) RETURNING id INTO v_app_id;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_app_id,
        'scholarship_title', v_scholarship.title
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_submit_scholarship_application(text, bigint) FROM public;
GRANT EXECUTE ON FUNCTION public.public_submit_scholarship_application(text, bigint) TO anon, authenticated;
