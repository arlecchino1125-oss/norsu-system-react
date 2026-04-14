-- Revert 20260319_harden_safe_rls_batch.sql
-- This is an app-compatibility rollback for the same table batch.
-- It restores permissive policies close to the current open/public behavior.

begin;

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

create policy admission_schedules_public_read
on public.admission_schedules
for select
to public
using (true);

create policy admission_schedules_public_write
on public.admission_schedules
for all
to public
using (true)
with check (true);

create policy courses_public_read
on public.courses
for select
to public
using (true);

create policy courses_public_write
on public.courses
for all
to public
using (true)
with check (true);

create policy departments_public_read
on public.departments
for select
to public
using (true);

create policy departments_public_write
on public.departments
for all
to public
using (true)
with check (true);

create policy events_public_access
on public.events
for all
to public
using (true)
with check (true);

create policy scholarships_public_access
on public.scholarships
for all
to public
using (true)
with check (true);

create policy office_visit_reasons_public_access
on public.office_visit_reasons
for all
to public
using (true)
with check (true);

create policy forms_public_access
on public.forms
for all
to public
using (true)
with check (true);

create policy questions_public_access
on public.questions
for all
to public
using (true)
with check (true);

create policy notifications_public_access
on public.notifications
for all
to public
using (true)
with check (true);

create policy general_feedback_public_read
on public.general_feedback
for select
to public
using (true);

create policy general_feedback_public_insert
on public.general_feedback
for insert
to public
with check (true);

create policy counseling_requests_public_access
on public.counseling_requests
for all
to public
using (true)
with check (true);

create policy support_requests_public_access
on public.support_requests
for all
to public
using (true)
with check (true);

create policy office_visits_public_access
on public.office_visits
for all
to public
using (true)
with check (true);

create policy event_attendance_public_access
on public.event_attendance
for all
to public
using (true)
with check (true);

create policy event_feedback_public_access
on public.event_feedback
for all
to public
using (true)
with check (true);

create policy scholarship_applications_public_access
on public.scholarship_applications
for all
to public
using (true)
with check (true);

create policy submissions_public_access
on public.submissions
for all
to public
using (true)
with check (true);

create policy answers_public_access
on public.answers
for all
to public
using (true)
with check (true);

create policy enrolled_students_public_access
on public.enrolled_students
for all
to public
using (true)
with check (true);

create policy audit_logs_public_access
on public.audit_logs
for all
to public
using (true)
with check (true);

commit;
