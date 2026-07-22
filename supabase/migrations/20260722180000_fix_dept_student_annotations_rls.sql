-- Department Heads have no SELECT policy on public.students, so the EXISTS()
-- sub-select inside the dept_student_annotations policies always saw 0 rows and
-- every read/write 42501'd. Move that check into a SECURITY DEFINER helper.

CREATE OR REPLACE FUNCTION public.student_in_current_staff_department(p_student_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.students s
        WHERE s.id = p_student_id
          AND coalesce(s.department, ''::text) = coalesce(public.current_staff_department(), ''::text)
    );
$$;

REVOKE ALL ON FUNCTION public.student_in_current_staff_department(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_in_current_staff_department(bigint) TO authenticated, service_role;

DROP POLICY IF EXISTS dept_student_annotations_select_staff ON public.dept_student_annotations;
CREATE POLICY dept_student_annotations_select_staff
    ON public.dept_student_annotations
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
        OR public.current_staff_role() = 'Care Staff'::text
        OR (
            public.current_staff_role() = 'Department Head'::text
            AND department = public.current_staff_department()
            AND public.student_in_current_staff_department(student_id)
        )
    );

DROP POLICY IF EXISTS dept_student_annotations_insert_department ON public.dept_student_annotations;
CREATE POLICY dept_student_annotations_insert_department
    ON public.dept_student_annotations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_admin()
        OR (
            public.current_staff_role() = 'Department Head'::text
            AND department = public.current_staff_department()
            AND public.student_in_current_staff_department(student_id)
        )
    );

DROP POLICY IF EXISTS dept_student_annotations_update_department ON public.dept_student_annotations;
CREATE POLICY dept_student_annotations_update_department
    ON public.dept_student_annotations
    FOR UPDATE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.current_staff_role() = 'Department Head'::text
            AND department = public.current_staff_department()
            AND public.student_in_current_staff_department(student_id)
        )
    )
    WITH CHECK (
        public.is_admin()
        OR (
            public.current_staff_role() = 'Department Head'::text
            AND department = public.current_staff_department()
            AND public.student_in_current_staff_department(student_id)
        )
    );

DROP POLICY IF EXISTS dept_student_annotations_delete_department ON public.dept_student_annotations;
CREATE POLICY dept_student_annotations_delete_department
    ON public.dept_student_annotations
    FOR DELETE
    TO authenticated
    USING (
        public.is_admin()
        OR (
            public.current_staff_role() = 'Department Head'::text
            AND department = public.current_staff_department()
            AND public.student_in_current_staff_department(student_id)
        )
    );
