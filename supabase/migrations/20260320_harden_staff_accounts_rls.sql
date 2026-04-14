-- Harden staff_accounts now that pre-login browser lookups are resolved
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

create or replace function public.current_staff_account_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.id
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_account_id()
is 'Returns the linked staff_accounts.id for the current auth user.';

create or replace function public.current_staff_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.username
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_username()
is 'Returns the linked staff_accounts.username for the current auth user.';

create or replace function public.current_staff_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.email
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_email()
is 'Returns the linked staff_accounts.email for the current auth user.';

revoke all on function public.current_staff_account_id() from public;
revoke all on function public.current_staff_username() from public;
revoke all on function public.current_staff_email() from public;

grant execute on function public.current_staff_account_id() to anon, authenticated, service_role;
grant execute on function public.current_staff_username() to anon, authenticated, service_role;
grant execute on function public.current_staff_email() to anon, authenticated, service_role;

alter table public.staff_accounts enable row level security;

do $$
declare
    pol record;
begin
    for pol in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = 'staff_accounts'
    loop
        execute format('drop policy if exists %I on public.staff_accounts', pol.policyname);
    end loop;
end
$$;

create policy staff_accounts_admin_manage
on public.staff_accounts
for all
to authenticated
using (
    public.is_admin()
)
with check (
    public.is_admin()
);

create policy staff_accounts_self_read
on public.staff_accounts
for select
to authenticated
using (
    id::text = public.current_staff_account_id()
);

create policy staff_accounts_self_update_profile
on public.staff_accounts
for update
to authenticated
using (
    id::text = public.current_staff_account_id()
)
with check (
    id::text = public.current_staff_account_id()
    and auth.uid() = auth_user_id
    and coalesce(username, '') = coalesce(public.current_staff_username(), '')
    and coalesce(role, '') = coalesce(public.current_staff_role(), '')
    and coalesce(department, '') = coalesce(public.current_staff_department(), '')
    and lower(coalesce(email, '')) = lower(coalesce(public.current_staff_email(), ''))
);

commit;
