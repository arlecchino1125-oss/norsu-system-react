begin;

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

alter table public.students disable row level security;

commit;
