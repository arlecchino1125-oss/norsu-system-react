begin;

drop policy if exists counseling_requests_admin_manage on public.counseling_requests;
drop policy if exists counseling_requests_care_staff_read on public.counseling_requests;
drop policy if exists counseling_requests_department_head_read_department on public.counseling_requests;

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

drop policy if exists support_requests_admin_manage on public.support_requests;
drop policy if exists support_requests_care_staff_read on public.support_requests;
drop policy if exists support_requests_department_head_read_department on public.support_requests;

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

create policy office_visits_student_update_own
on public.office_visits
for update
to authenticated
using (student_id = public.current_student_id())
with check (student_id = public.current_student_id());

commit;
