-- Auth context helpers for future RLS policies.
-- These are safe to deploy before turning RLS on.

create or replace function public.current_student_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select s.student_id
    from public.students as s
    where s.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_student_id()
is 'Returns the linked students.student_id for the current auth user.';

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.role
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_role()
is 'Returns the linked staff_accounts.role for the current auth user.';

create or replace function public.current_staff_department()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.department
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_department()
is 'Returns the linked staff_accounts.department for the current auth user.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(public.current_staff_role() = 'Admin', false);
$$;

comment on function public.is_admin()
is 'Returns true when the current auth user is a linked Admin staff account.';

revoke all on function public.current_student_id() from public;
revoke all on function public.current_staff_role() from public;
revoke all on function public.current_staff_department() from public;
revoke all on function public.is_admin() from public;

grant execute on function public.current_student_id() to anon, authenticated, service_role;
grant execute on function public.current_staff_role() to anon, authenticated, service_role;
grant execute on function public.current_staff_department() to anon, authenticated, service_role;
grant execute on function public.is_admin() to anon, authenticated, service_role;
