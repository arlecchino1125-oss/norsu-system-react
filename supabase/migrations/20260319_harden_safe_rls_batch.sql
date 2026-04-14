-- Harden the first safe batch of RLS policies.
-- This intentionally does NOT tighten:
--   applications, students, staff_accounts, needs_assessments
-- because the current app still has pre-auth and public flows that depend on them.
--
-- Prerequisite:
--   20260319_add_auth_context_helpers.sql

begin;

do $$
begin
    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'current_student_id'
    ) then
        raise exception 'Missing helper function public.current_student_id(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'current_staff_role'
    ) then
        raise exception 'Missing helper function public.current_staff_role(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'current_staff_department'
    ) then
        raise exception 'Missing helper function public.current_staff_department(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'is_admin'
    ) then
        raise exception 'Missing helper function public.is_admin(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;
end
$$;

do $$
declare
    tbl text;
    pol record;
begin
    foreach tbl in array array[
        'admission_schedules',
        'courses',
        'departments',
        'events',
        'scholarships',
        'office_visit_reasons',
        'forms',
        'questions',
        'notifications',
        'general_feedback',
        'counseling_requests',
        'support_requests',
        'office_visits',
        'event_attendance',
        'event_feedback',
        'scholarship_applications',
        'submissions',
        'answers',
        'enrolled_students',
        'audit_logs'
    ]
    loop
        execute format('alter table public.%I enable row level security', tbl);

        for pol in
            select policyname
            from pg_policies
            where schemaname = 'public'
              and tablename = tbl
        loop
            execute format('drop policy if exists %I on public.%I', pol.policyname, tbl);
        end loop;
    end loop;
end
$$;

-- Reference / catalog tables
create policy admission_schedules_public_read
on public.admission_schedules
for select
to public
using (true);

create policy admission_schedules_care_admin_manage
on public.admission_schedules
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy courses_public_read
on public.courses
for select
to public
using (true);

create policy courses_care_admin_manage
on public.courses
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy departments_public_read
on public.departments
for select
to public
using (true);

create policy departments_admin_manage
on public.departments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Shared authenticated content
create policy events_authenticated_read
on public.events
for select
to authenticated
using (true);

create policy events_care_admin_manage
on public.events
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy scholarships_authenticated_read
on public.scholarships
for select
to authenticated
using (true);

create policy scholarships_care_admin_manage
on public.scholarships
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy office_visit_reasons_authenticated_read
on public.office_visit_reasons
for select
to authenticated
using (
    is_active = true
    or public.is_admin()
    or public.current_staff_role() = 'Care Staff'
);

create policy office_visit_reasons_care_admin_manage
on public.office_visit_reasons
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy forms_authenticated_read
on public.forms
for select
to authenticated
using (
    is_active = true
    or public.is_admin()
    or public.current_staff_role() = 'Care Staff'
);

create policy forms_care_admin_manage
on public.forms
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy questions_authenticated_read
on public.questions
for select
to authenticated
using (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or exists (
        select 1
        from public.forms f
        where f.id = questions.form_id
          and f.is_active = true
    )
);

create policy questions_care_admin_manage
on public.questions
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

-- Student-facing tables
create policy notifications_student_own
on public.notifications
for select
to authenticated
using (student_id = public.current_student_id());

create policy notifications_student_insert_own
on public.notifications
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy notifications_student_update_own
on public.notifications
for update
to authenticated
using (student_id = public.current_student_id())
with check (student_id = public.current_student_id());

create policy notifications_staff_manage
on public.notifications
for all
to authenticated
using (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and exists (
            select 1
            from public.students s
            where s.student_id = notifications.student_id
              and s.department = public.current_staff_department()
        )
    )
)
with check (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and exists (
            select 1
            from public.students s
            where s.student_id = notifications.student_id
              and s.department = public.current_staff_department()
        )
    )
);

create policy general_feedback_anon_insert
on public.general_feedback
for insert
to anon
with check (true);

create policy general_feedback_student_read_own
on public.general_feedback
for select
to authenticated
using (student_id = public.current_student_id());

create policy general_feedback_student_insert_own
on public.general_feedback
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy general_feedback_care_admin_read
on public.general_feedback
for select
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy counseling_requests_student_read_own
on public.counseling_requests
for select
to authenticated
using (student_id = public.current_student_id());

create policy counseling_requests_student_insert_own
on public.counseling_requests
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy counseling_requests_student_feedback_update
on public.counseling_requests
for update
to authenticated
using (
    student_id = public.current_student_id()
    and status = 'Completed'
)
with check (
    student_id = public.current_student_id()
    and status = 'Completed'
);

create policy counseling_requests_staff_manage
on public.counseling_requests
for all
to authenticated
using (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and department = public.current_staff_department()
    )
)
with check (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and department = public.current_staff_department()
    )
);

create policy support_requests_student_read_own
on public.support_requests
for select
to authenticated
using (student_id = public.current_student_id());

create policy support_requests_student_insert_own
on public.support_requests
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy support_requests_staff_manage
on public.support_requests
for all
to authenticated
using (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and department = public.current_staff_department()
    )
)
with check (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
    or (
        public.current_staff_role() = 'Department Head'
        and department = public.current_staff_department()
    )
);

create policy office_visits_student_read_own
on public.office_visits
for select
to authenticated
using (student_id = public.current_student_id());

create policy office_visits_student_insert_own
on public.office_visits
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy office_visits_student_update_own
on public.office_visits
for update
to authenticated
using (student_id = public.current_student_id())
with check (student_id = public.current_student_id());

create policy office_visits_care_admin_manage
on public.office_visits
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy event_attendance_student_read_own
on public.event_attendance
for select
to authenticated
using (student_id = public.current_student_id());

create policy event_attendance_student_insert_own
on public.event_attendance
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy event_attendance_student_update_own
on public.event_attendance
for update
to authenticated
using (student_id = public.current_student_id())
with check (student_id = public.current_student_id());

create policy event_attendance_department_read
on public.event_attendance
for select
to authenticated
using (
    public.current_staff_role() = 'Department Head'
    and department = public.current_staff_department()
);

create policy event_attendance_care_admin_manage
on public.event_attendance
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy event_feedback_student_read_own
on public.event_feedback
for select
to authenticated
using (student_id = public.current_student_id());

create policy event_feedback_student_insert_own
on public.event_feedback
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy event_feedback_care_admin_read
on public.event_feedback
for select
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy scholarship_applications_student_read_own
on public.scholarship_applications
for select
to authenticated
using (student_id = public.current_student_id());

create policy scholarship_applications_student_insert_own
on public.scholarship_applications
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy scholarship_applications_care_admin_manage
on public.scholarship_applications
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy submissions_student_read_own
on public.submissions
for select
to authenticated
using (student_id = public.current_student_id());

create policy submissions_student_insert_own
on public.submissions
for insert
to authenticated
with check (student_id = public.current_student_id());

create policy submissions_care_admin_manage
on public.submissions
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy answers_student_read_own
on public.answers
for select
to authenticated
using (
    exists (
        select 1
        from public.submissions s
        where s.id = answers.submission_id
          and s.student_id = public.current_student_id()
    )
);

create policy answers_student_insert_own
on public.answers
for insert
to authenticated
with check (
    exists (
        select 1
        from public.submissions s
        where s.id = answers.submission_id
          and s.student_id = public.current_student_id()
    )
);

create policy answers_care_admin_manage
on public.answers
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy enrolled_students_student_read_own
on public.enrolled_students
for select
to authenticated
using (student_id = public.current_student_id());

create policy enrolled_students_care_admin_manage
on public.enrolled_students
for all
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff')
with check (public.is_admin() or public.current_staff_role() = 'Care Staff');

create policy audit_logs_authenticated_insert
on public.audit_logs
for insert
to authenticated
with check (true);

create policy audit_logs_care_admin_read
on public.audit_logs
for select
to authenticated
using (public.is_admin() or public.current_staff_role() = 'Care Staff');

commit;
