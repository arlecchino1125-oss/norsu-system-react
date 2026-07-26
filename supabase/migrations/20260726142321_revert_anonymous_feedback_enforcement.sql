DROP TRIGGER IF EXISTS general_feedback_enforce_anonymity ON public.general_feedback;
DROP TRIGGER IF EXISTS event_feedback_enforce_anonymity ON public.event_feedback;
DROP FUNCTION IF EXISTS public.enforce_general_feedback_anonymity();
DROP FUNCTION IF EXISTS public.enforce_event_feedback_anonymity();

CREATE OR REPLACE FUNCTION public.stamp_event_evaluation_response_identity() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = 'public'
    AS $$
DECLARE
    v_student_id text := public.current_student_id();
BEGIN
    IF v_student_id IS NULL THEN
        RETURN NEW;
    END IF;

    NEW.student_id := v_student_id;
    NEW.submitted_at := now();

    SELECT trim(concat_ws(' ', s.first_name, s.last_name)), s.department, s.course, s.year_level
    INTO NEW.student_name, NEW.department, NEW.course, NEW.year_level
    FROM public.students s
    WHERE s.student_id = v_student_id;

    RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.stamp_event_evaluation_response_identity() TO PUBLIC;
REVOKE EXECUTE ON FUNCTION public.stamp_event_evaluation_response_identity() FROM anon;

GRANT SELECT ON public.general_feedback TO anon, authenticated;
GRANT SELECT ON public.event_feedback TO anon, authenticated;
GRANT SELECT ON public.event_evaluation_responses TO authenticated;
