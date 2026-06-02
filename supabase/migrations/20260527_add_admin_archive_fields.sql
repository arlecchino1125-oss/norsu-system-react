-- Add in-place archive fields for Admin-managed staff accounts and colleges.
-- These rows stay available for history/auditing, while active admin screens
-- filter on is_archived = false.

alter table public.staff_accounts
add column if not exists is_archived boolean not null default false,
add column if not exists archived_at timestamp with time zone,
add column if not exists archive_note text;

alter table public.departments
add column if not exists is_archived boolean not null default false,
add column if not exists archived_at timestamp with time zone,
add column if not exists archive_note text;

create index if not exists idx_staff_accounts_is_archived_created_at
on public.staff_accounts (is_archived, created_at desc);

create index if not exists idx_departments_is_archived_name
on public.departments (is_archived, name);

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
      and not coalesce(sa.is_archived, false)
    limit 1;
$$;

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
      and not coalesce(sa.is_archived, false)
    limit 1;
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
      and not coalesce(sa.is_archived, false)
    limit 1;
$$;

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
      and not coalesce(sa.is_archived, false)
    limit 1;
$$;

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
      and not coalesce(sa.is_archived, false)
    limit 1;
$$;
