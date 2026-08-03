-- 1. Security Helper: Check if student belongs to the caller's department
CREATE OR REPLACE FUNCTION public.student_text_id_in_current_staff_department(p_student_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.student_id = p_student_id
          AND NULLIF(trim(coalesce(public.current_staff_department(), ''::text)), ''::text) IS NOT NULL
          AND coalesce(s.department, ''::text) = coalesce(public.current_staff_department(), ''::text)
    );
$$;

REVOKE ALL ON FUNCTION public.student_text_id_in_current_staff_department(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_text_id_in_current_staff_department(text) TO authenticated, service_role;

-- 2. Least-Privilege RLS Policies

-- peer_facilitator_applications (SELECT only)
CREATE POLICY "peer_facilitator_applications_dept_select"
    ON public.peer_facilitator_applications
    FOR SELECT
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

-- peer_facilitators (SELECT, INSERT, UPDATE)
CREATE POLICY "peer_facilitators_dept_select"
    ON public.peer_facilitators
    FOR SELECT
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

CREATE POLICY "peer_facilitators_dept_insert"
    ON public.peer_facilitators
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

CREATE POLICY "peer_facilitators_dept_update"
    ON public.peer_facilitators
    FOR UPDATE
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    )
    WITH CHECK (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

-- peer_facilitator_attendance (SELECT only)
CREATE POLICY "peer_facilitator_attendance_dept_select"
    ON public.peer_facilitator_attendance
    FOR SELECT
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

-- peer_facilitator_logbooks (SELECT only)
CREATE POLICY "peer_facilitator_logbooks_dept_select"
    ON public.peer_facilitator_logbooks
    FOR SELECT
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND public.student_text_id_in_current_staff_department(student_id)
    );

-- peer_facilitator_log_entries (SELECT only, scoping through peer_facilitator_logbooks)
CREATE POLICY "peer_facilitator_log_entries_dept_select"
    ON public.peer_facilitator_log_entries
    FOR SELECT
    TO authenticated
    USING (
        public.current_staff_role() = 'Department Head'::text 
        AND EXISTS (
            SELECT 1 FROM public.peer_facilitator_logbooks lb
            WHERE lb.id = logbook_id
            AND public.student_text_id_in_current_staff_department(lb.student_id)
        )
    );

-- 3. Atomic RPC for Application Approval
CREATE OR REPLACE FUNCTION public.department_evaluate_peer_application(
    p_application_id uuid,
    p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_application record;
    v_active_year text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF public.current_staff_role() != 'Department Head' THEN
        RAISE EXCEPTION 'Access denied: Department Head required';
    END IF;

    IF p_status NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Invalid status';
    END IF;

    -- Fetch application and verify it is pending
    SELECT * INTO v_application 
    FROM public.peer_facilitator_applications 
    WHERE id = p_application_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF v_application.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not in a pending state';
    END IF;

    -- Verify the student belongs to the caller's department
    IF NOT public.student_text_id_in_current_staff_department(v_application.student_id) THEN
        RAISE EXCEPTION 'Access denied: Student not in your department';
    END IF;

    -- Update the application status
    UPDATE public.peer_facilitator_applications
    SET status = p_status
    WHERE id = p_application_id;

    -- If approved, atomically insert or reactivate in roster
    IF p_status = 'approved' THEN
        -- Safely get the active school year from settings
        SELECT school_year INTO v_active_year
        FROM public.peer_facilitator_settings
        LIMIT 1;

        IF v_active_year IS NULL AND v_application.school_year IS NULL THEN
            RAISE EXCEPTION 'Cannot approve: missing school year in both global settings and the application record.';
        END IF;

        INSERT INTO public.peer_facilitators (student_id, peer_year, source, application_id, archived_at)
        VALUES (v_application.student_id, coalesce(v_active_year, v_application.school_year), 'application', p_application_id, NULL)
        ON CONFLICT (student_id) DO UPDATE 
        SET archived_at = NULL,
            peer_year = EXCLUDED.peer_year,
            source = EXCLUDED.source,
            application_id = EXCLUDED.application_id; -- updated_at usually handled by a trigger, if not, wait.
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.department_evaluate_peer_application(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.department_evaluate_peer_application(uuid, text) TO authenticated, service_role;
