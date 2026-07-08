-- Drop the overly permissive anon INSERT policy on general_feedback.
-- WITH CHECK (true) allowed any unauthenticated user to insert unlimited rows.
-- No public UI uses this — students submit feedback via authenticated session,
-- covered by the existing general_feedback_student_insert_own policy.
DROP POLICY IF EXISTS general_feedback_anon_insert ON public.general_feedback;
