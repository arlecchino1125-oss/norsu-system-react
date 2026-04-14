begin;

drop policy if exists students_self_update on public.students;
create policy students_self_update
on public.students
for update
to authenticated
using (
    auth.uid() = auth_user_id
    or student_id = public.current_student_id()
)
with check (
    auth.uid() = auth_user_id
    and student_id = public.current_student_id()
);

drop policy if exists applications_department_head_update_current_queue on public.applications;
create policy applications_department_head_update_current_queue
on public.applications
for update
to authenticated
using (
    public.current_staff_role() = 'Department Head'
    and exists (
        select 1
        from public.departments d
        join public.courses c
          on c.department_id = d.id
        where d.name = public.current_staff_department()
          and (
              (applications.priority_course = c.name and coalesce(applications.current_choice, 1) = 1)
              or (applications.alt_course_1 = c.name and applications.current_choice = 2)
              or (applications.alt_course_2 = c.name and applications.current_choice = 3)
          )
    )
)
with check (
    public.current_staff_role() = 'Department Head'
    and exists (
        select 1
        from public.departments d
        join public.courses c
          on c.department_id = d.id
        where d.name = public.current_staff_department()
          and (
              applications.priority_course = c.name
              or applications.alt_course_1 = c.name
              or applications.alt_course_2 = c.name
          )
    )
);

commit;
