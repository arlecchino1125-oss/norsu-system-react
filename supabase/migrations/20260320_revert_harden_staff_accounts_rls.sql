begin;

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

alter table public.staff_accounts disable row level security;

drop function if exists public.current_staff_account_id();
drop function if exists public.current_staff_username();
drop function if exists public.current_staff_email();

commit;
