-- Harden the public applications table now that NAT public reads/updates
-- are served through edge functions instead of direct browser table access.
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

alter table public.applications enable row level security;

do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'applications'
    loop
        execute format('drop policy if exists %I on public.applications', pol.policyname);
    end loop;
end
$$;

create policy applications_anon_submit
on public.applications
for insert
to public
with check (
    coalesce(status, 'Submitted') = 'Submitted'
    and coalesce(current_choice, 1) = 1
    and interview_date is null
    and time_in is null
    and time_out is null
);

create policy applications_admin_care_manage
on public.applications
for all
to authenticated
using (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
)
with check (
    public.is_admin()
    or public.current_staff_role() = 'Care Staff'
);

create policy applications_department_head_read_current_queue
on public.applications
for select
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
);

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
