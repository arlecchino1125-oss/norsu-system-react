-- Set rate limit for counseling and support requests to 2 per 5 minutes

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
