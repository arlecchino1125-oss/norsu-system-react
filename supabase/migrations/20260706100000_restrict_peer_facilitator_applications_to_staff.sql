-- Restrict peer_facilitator_applications to staff for read-all/update.
-- The initial migration (20260706071727) allowed ANY authenticated user to
-- SELECT every application and UPDATE any row — a logged-in student could read
-- all applicants' data and approve/reject applications (including their own)
-- via direct PostgREST calls.
-- Students keep their own-row SELECT and INSERT policies from the initial migration.

DROP POLICY IF EXISTS "Authenticated users can view all applications" ON public.peer_facilitator_applications;
DROP POLICY IF EXISTS "Authenticated users can update applications" ON public.peer_facilitator_applications;

CREATE POLICY "peer_facilitator_apps_staff_select"
    ON public.peer_facilitator_applications
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitator_apps_staff_update"
    ON public.peer_facilitator_applications
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);
