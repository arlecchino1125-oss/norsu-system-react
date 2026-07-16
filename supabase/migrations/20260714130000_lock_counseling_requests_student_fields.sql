-- counseling_requests_student_feedback_update lets a student UPDATE their own
-- completed request, but RLS only restricts which ROWS (status = 'Completed'),
-- not which COLUMNS. The app only ever writes rating/feedback, but a direct
-- API call could also overwrite staff-only fields like confidential_notes or
-- resolution_notes. Lock every column except rating/feedback when the actor
-- is a student; staff/admin updates are untouched.

CREATE OR REPLACE FUNCTION public.lock_counseling_requests_student_update()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_rating integer := NEW.rating;
    v_feedback text := NEW.feedback;
BEGIN
    IF public.current_student_id() IS NOT NULL THEN
        NEW := OLD;
        NEW.rating := v_rating;
        NEW.feedback := v_feedback;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_counseling_requests_student_update ON public.counseling_requests;

CREATE TRIGGER lock_counseling_requests_student_update
    BEFORE UPDATE ON public.counseling_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.lock_counseling_requests_student_update();
