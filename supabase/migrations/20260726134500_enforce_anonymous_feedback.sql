-- Keep respondent linkage available only to ownership and duplicate-prevention
-- policies; reviewers receive no student identifier columns.

CREATE OR REPLACE FUNCTION public.enforce_general_feedback_anonymity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.student_name := 'Anonymous';
    NEW.email := NULL;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_event_feedback_anonymity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.student_name := 'Anonymous';
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_general_feedback_anonymity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_event_feedback_anonymity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS general_feedback_enforce_anonymity ON public.general_feedback;
CREATE TRIGGER general_feedback_enforce_anonymity
    BEFORE INSERT OR UPDATE ON public.general_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_general_feedback_anonymity();

DROP TRIGGER IF EXISTS event_feedback_enforce_anonymity ON public.event_feedback;
CREATE TRIGGER event_feedback_enforce_anonymity
    BEFORE INSERT OR UPDATE ON public.event_feedback
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_event_feedback_anonymity();

CREATE OR REPLACE FUNCTION public.stamp_event_evaluation_response_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
    v_student_id text := public.current_student_id();
BEGIN
    NEW.student_name := 'Anonymous';
    NEW.submitted_at := now();

    IF v_student_id IS NULL THEN
        RETURN NEW;
    END IF;

    NEW.student_id := v_student_id;

    SELECT s.department, s.course, s.year_level
    INTO NEW.department, NEW.course, NEW.year_level
    FROM public.students s
    WHERE s.student_id = v_student_id;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_event_evaluation_response_identity() FROM PUBLIC, anon, authenticated;

UPDATE public.general_feedback
SET student_name = 'Anonymous', email = NULL
WHERE student_name IS DISTINCT FROM 'Anonymous' OR email IS NOT NULL;

UPDATE public.event_feedback
SET student_name = 'Anonymous'
WHERE student_name IS DISTINCT FROM 'Anonymous';

UPDATE public.event_evaluation_responses
SET student_name = 'Anonymous'
WHERE student_name IS DISTINCT FROM 'Anonymous';

REVOKE SELECT ON public.general_feedback, public.event_feedback, public.event_evaluation_responses
FROM PUBLIC, anon, authenticated;

GRANT SELECT (
    id, client_type, sex, age, region, service_availed,
    cc1, cc2, cc3,
    sqd0, sqd1, sqd2, sqd3, sqd4, sqd5, sqd6, sqd7, sqd8,
    suggestions, created_at
) ON public.general_feedback TO authenticated;

GRANT SELECT (
    id, event_id, rating, feedback, submitted_at, sex, college, date_of_activity,
    q1_score, q2_score, q3_score, q4_score, q5_score, q6_score, q7_score,
    open_best, open_suggestions, open_comments
) ON public.event_feedback TO authenticated;

GRANT SELECT (
    id, form_id, department, course, year_level, submitted_at
) ON public.event_evaluation_responses TO authenticated;
