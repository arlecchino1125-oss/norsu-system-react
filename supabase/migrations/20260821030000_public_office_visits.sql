-- Public Office Visit Logging (Time In / Time Out)
-- Supports verified students (via Student ID) and visitors/guests (via First & Last Name)

CREATE POLICY "office_visit_reasons_anon_read" ON "public"."office_visit_reasons"
    FOR SELECT TO "anon"
    USING (is_active = true);

-- 1. Fetch active visit reasons for public UI
CREATE OR REPLACE FUNCTION public.public_get_office_visit_reasons()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'reason', reason
            ) ORDER BY reason ASC
        ),
        '[]'::jsonb
    )
    FROM public.office_visit_reasons
    WHERE is_active = true;
$$;

REVOKE ALL ON FUNCTION public.public_get_office_visit_reasons() FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_office_visit_reasons() TO anon, authenticated;

-- 2. Public Time In (Student or Visitor)
CREATE OR REPLACE FUNCTION public.public_office_visit_time_in(
    p_student_id text,
    p_first_name text,
    p_last_name text,
    p_is_visitor boolean,
    p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_full_name text;
    v_student_id text := null;
    v_reason text := nullif(trim(p_reason), '');
    v_visit_id bigint;
    v_time_in timestamptz;
    v_throttle_key text;
BEGIN
    IF v_reason IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Please select a valid reason for your visit.');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.office_visit_reasons
        WHERE reason = v_reason AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected reason is not currently available.');
    END IF;

    -- Visitor flow
    IF coalesce(p_is_visitor, false) = true OR p_student_id IS NULL OR trim(p_student_id) = '' THEN
        IF nullif(trim(p_first_name), '') IS NULL OR nullif(trim(p_last_name), '') IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Please provide both your First Name and Last Name.');
        END IF;

        v_full_name := trim(concat_ws(' ', trim(p_first_name), trim(p_last_name)));
        IF length(v_full_name) > 160 THEN
            v_full_name := left(v_full_name, 160);
        END IF;

        v_throttle_key := 'visitor:' || lower(v_full_name);
        IF NOT public.public_throttle_take(v_throttle_key, 'office_visit_in', 5, interval '5 minutes') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few moments.');
        END IF;

        -- Check if there is already an ongoing visit for this visitor within the last 12 hours
        SELECT id, time_in INTO v_visit_id, v_time_in
        FROM public.office_visits
        WHERE student_id IS NULL
          AND lower(student_name) = lower(v_full_name)
          AND status = 'Ongoing'
          AND time_in >= (now() - interval '12 hours')
        ORDER BY time_in DESC
        LIMIT 1;

        IF v_visit_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'visit_id', v_visit_id,
                'student_name', v_full_name,
                'student_id', null,
                'reason', v_reason,
                'time_in', v_time_in,
                'is_visitor', true,
                'already_active', true
            );
        END IF;

        INSERT INTO public.office_visits (
            student_id,
            student_name,
            reason,
            status,
            time_in
        ) VALUES (
            null,
            v_full_name,
            v_reason,
            'Ongoing',
            now()
        ) RETURNING id, time_in INTO v_visit_id, v_time_in;

        RETURN jsonb_build_object(
            'success', true,
            'visit_id', v_visit_id,
            'student_name', v_full_name,
            'student_id', null,
            'reason', v_reason,
            'time_in', v_time_in,
            'is_visitor', true
        );

    -- Student flow
    ELSE
        v_student := public.public_resolve_student(p_student_id);
        IF v_student.student_id IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Student ID not found in records.');
        END IF;

        v_student_id := v_student.student_id;
        v_full_name := trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix));

        IF NOT public.public_throttle_take(v_student.student_id, 'office_visit_in', 5, interval '5 minutes') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few moments.');
        END IF;

        -- Check if student already has an ongoing visit within the last 12 hours
        SELECT id, time_in INTO v_visit_id, v_time_in
        FROM public.office_visits
        WHERE student_id = v_student_id
          AND status = 'Ongoing'
          AND time_in >= (now() - interval '12 hours')
        ORDER BY time_in DESC
        LIMIT 1;

        IF v_visit_id IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', true,
                'visit_id', v_visit_id,
                'student_name', v_full_name,
                'student_id', v_student_id,
                'reason', v_reason,
                'time_in', v_time_in,
                'is_visitor', false,
                'already_active', true
            );
        END IF;

        INSERT INTO public.office_visits (
            student_id,
            student_name,
            reason,
            status,
            time_in
        ) VALUES (
            v_student_id,
            v_full_name,
            v_reason,
            'Ongoing',
            now()
        ) RETURNING id, time_in INTO v_visit_id, v_time_in;

        RETURN jsonb_build_object(
            'success', true,
            'visit_id', v_visit_id,
            'student_name', v_full_name,
            'student_id', v_student_id,
            'reason', v_reason,
            'time_in', v_time_in,
            'is_visitor', false
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.public_office_visit_time_in(text, text, text, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_office_visit_time_in(text, text, text, boolean, text) TO anon, authenticated;

-- 3. Public Time Out
CREATE OR REPLACE FUNCTION public.public_office_visit_time_out(
    p_visit_id bigint,
    p_student_id text,
    p_visitor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_visit public.office_visits;
    v_time_out timestamptz;
BEGIN
    IF p_visit_id IS NOT NULL THEN
        SELECT * INTO v_visit
        FROM public.office_visits
        WHERE id = p_visit_id AND status = 'Ongoing';
    END IF;

    IF v_visit.id IS NULL AND p_student_id IS NOT NULL AND trim(p_student_id) <> '' THEN
        SELECT * INTO v_visit
        FROM public.office_visits
        WHERE student_id = trim(p_student_id)
          AND status = 'Ongoing'
          AND time_in >= (now() - interval '18 hours')
        ORDER BY time_in DESC
        LIMIT 1;
    END IF;

    IF v_visit.id IS NULL AND p_visitor_name IS NOT NULL AND trim(p_visitor_name) <> '' THEN
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
        RETURN jsonb_build_object('success', false, 'error', 'No active office visit found to time out.');
    END IF;

    v_time_out := now();

    UPDATE public.office_visits
    SET status = 'Completed',
        time_out = v_time_out
    WHERE id = v_visit.id;

    RETURN jsonb_build_object(
        'success', true,
        'visit_id', v_visit.id,
        'student_name', v_visit.student_name,
        'reason', v_visit.reason,
        'time_in', v_visit.time_in,
        'time_out', v_time_out
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_office_visit_time_out(bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_office_visit_time_out(bigint, text, text) TO anon, authenticated;

-- 4. Check Active Visit
CREATE OR REPLACE FUNCTION public.public_get_active_office_visit(
    p_student_id text,
    p_visitor_name text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_visit public.office_visits;
BEGIN
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
        'id', v_visit.id,
        'student_id', v_visit.student_id,
        'student_name', v_visit.student_name,
        'reason', v_visit.reason,
        'time_in', v_visit.time_in,
        'status', v_visit.status
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_office_visit(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_office_visit(text, text) TO anon, authenticated;
