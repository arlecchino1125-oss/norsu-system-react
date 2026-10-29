-- Optimize Row Level Security (RLS) policies on public.students and
-- public.notifications so Postgres evaluates auth/role helper functions
-- ONCE per query (via an InitPlan scalar subquery) instead of once per row.
--
-- Without `(SELECT ...)`, counting 3,357 students or 8,456 notifications
-- executes `public.is_admin()`, `public.current_staff_role()`, and
-- `public.current_student_id()` thousands of times even when an index exists
-- (1.56s on students, 2.59s on notifications).

ALTER POLICY "students_admin_care_select" ON public.students
    USING (
        (SELECT public.is_admin())
        OR ((SELECT public.current_staff_role()) = 'Care Staff'::text)
    );

ALTER POLICY "students_self_read" ON public.students
    USING (
        ((SELECT auth.uid()) = auth_user_id)
        OR (student_id = (SELECT public.current_student_id()))
    );

ALTER POLICY "notifications_staff_manage" ON public.notifications
    USING (
        (SELECT public.is_admin())
        OR ((SELECT public.current_staff_role()) = 'Care Staff'::text)
        OR (
            ((SELECT public.current_staff_role()) = 'Department Head'::text)
            AND EXISTS (
                SELECT 1
                FROM public.students s
                WHERE s.student_id = notifications.student_id
                  AND s.department = (SELECT public.current_staff_department())
            )
        )
    )
    WITH CHECK (
        (SELECT public.is_admin())
        OR ((SELECT public.current_staff_role()) = 'Care Staff'::text)
        OR (
            ((SELECT public.current_staff_role()) = 'Department Head'::text)
            AND EXISTS (
                SELECT 1
                FROM public.students s
                WHERE s.student_id = notifications.student_id
                  AND s.department = (SELECT public.current_staff_department())
            )
        )
    );

ALTER POLICY "notifications_student_own" ON public.notifications
    USING (
        student_id = (SELECT public.current_student_id())
    );

