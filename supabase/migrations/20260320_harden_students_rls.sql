-- Harden students now that pre-login browser lookups are resolved
-- through the resolve-auth-login edge function.
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

alter table public.students enable row level security;

do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'students'
    loop
        execute format('drop policy if exists %I on public.students', pol.policyname);
    end loop;
end
$$;

create policy students_admin_care_manage
on public.students
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

create policy students_department_head_read_department
on public.students
for select
to authenticated
using (
    public.current_staff_role() = 'Department Head'
    and coalesce(department, '') = coalesce(public.current_staff_department(), '')
);

create policy students_self_read
on public.students
for select
to authenticated
using (
    auth.uid() = auth_user_id
    or student_id = public.current_student_id()
);

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

commit;
