-- Remove the remaining broad direct browser update paths for counseling,
-- support requests, and student office visit timeout.
--
-- Prerequisites:
--   deploy manage-department-services
--   deploy manage-care-services
--   deploy updated manage-student-accounts
--   deploy the frontend changes that call those functions

begin;

drop policy if exists counseling_requests_staff_manage on public.counseling_requests;
drop policy if exists counseling_requests_admin_manage on public.counseling_requests;
drop policy if exists counseling_requests_care_staff_read on public.counseling_requests;
drop policy if exists counseling_requests_department_head_read_department on public.counseling_requests;

create policy counseling_requests_admin_manage
on public.counseling_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy counseling_requests_care_staff_read
on public.counseling_requests
for select
to authenticated
using (public.current_staff_role() = 'Care Staff');

create policy counseling_requests_department_head_read_department
on public.counseling_requests
for select
to authenticated
using (
    public.current_staff_role() = 'Department Head'
    and department = public.current_staff_department()
);

drop policy if exists support_requests_staff_manage on public.support_requests;
drop policy if exists support_requests_admin_manage on public.support_requests;
drop policy if exists support_requests_care_staff_read on public.support_requests;
drop policy if exists support_requests_department_head_read_department on public.support_requests;

create policy support_requests_admin_manage
on public.support_requests
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy support_requests_care_staff_read
on public.support_requests
for select
to authenticated
using (public.current_staff_role() = 'Care Staff');

create policy support_requests_department_head_read_department
on public.support_requests
for select
to authenticated
using (
    public.current_staff_role() = 'Department Head'
    and department = public.current_staff_department()
);

drop policy if exists office_visits_student_update_own on public.office_visits;

commit;
