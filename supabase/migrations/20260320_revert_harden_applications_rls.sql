begin;

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

alter table public.applications disable row level security;

commit;
