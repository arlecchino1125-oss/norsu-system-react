begin;

alter table public.audit_logs
    add column if not exists actor_role text,
    add column if not exists actor_id text,
    add column if not exists actor_department text,
    add column if not exists entity_table text,
    add column if not exists entity_id text;

create index if not exists audit_logs_actor_role_created_at_idx
    on public.audit_logs (actor_role, created_at desc);

create or replace function public.current_staff_full_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select sa.full_name
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
    limit 1;
$$;

comment on function public.current_staff_full_name()
is 'Returns the linked staff_accounts.full_name for the current auth user.';

create or replace function public.current_staff_audit_record_id(row_data jsonb)
returns text
language sql
immutable
as $$
    select coalesce(
        nullif(row_data->>'id', ''),
        nullif(row_data->>'student_id', ''),
        nullif(row_data->>'reference_id', ''),
        nullif(row_data->>'name', ''),
        nullif(row_data->>'title', '')
    );
$$;

create or replace function public.current_staff_audit_entity_label(row_data jsonb)
returns text
language sql
immutable
as $$
    select coalesce(
        nullif(trim(concat_ws(' ', row_data->>'first_name', row_data->>'last_name')), ''),
        nullif(row_data->>'student_name', ''),
        nullif(row_data->>'title', ''),
        nullif(row_data->>'name', ''),
        nullif(row_data->>'reference_id', ''),
        nullif(row_data->>'student_id', ''),
        nullif(row_data->>'id', '')
    );
$$;

create or replace function public.audit_staff_table_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_role text := public.current_staff_role();
    actor_name text := coalesce(public.current_staff_full_name(), public.current_staff_username(), actor_role);
    actor_id text := public.current_staff_account_id();
    actor_department text := public.current_staff_department();
    record_data jsonb;
    record_id text;
    entity_label text;
    table_label text := replace(tg_table_name, '_', ' ');
    action text;
    summary text;
    previous_status text;
    next_status text;
begin
    if actor_role not in ('Care Staff', 'Department Head') then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;

    record_data := case
        when tg_op = 'DELETE' then to_jsonb(old)
        else to_jsonb(new)
    end;
    record_id := public.current_staff_audit_record_id(record_data);
    entity_label := public.current_staff_audit_entity_label(record_data);
    previous_status := case
        when tg_op = 'UPDATE' then nullif(to_jsonb(old)->>'status', '')
        else null
    end;
    next_status := nullif(record_data->>'status', '');

    action := case tg_op
        when 'INSERT' then format('Created %s', table_label)
        when 'DELETE' then format('Deleted %s', table_label)
        else format('Updated %s', table_label)
    end;

    if tg_op = 'UPDATE' and previous_status is distinct from next_status and next_status is not null then
        action := format('Updated %s status', table_label);
    end if;

    summary := case
        when tg_op = 'INSERT' then format(
            '%s created %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
        when tg_op = 'DELETE' then format(
            '%s deleted %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
        when previous_status is distinct from next_status and next_status is not null then format(
            '%s changed %s%s to %s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end,
            next_status
        )
        else format(
            '%s updated %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
    end;

    insert into public.audit_logs (
        user_name,
        action,
        details,
        actor_role,
        actor_id,
        actor_department,
        entity_table,
        entity_id
    )
    values (
        actor_name,
        action,
        jsonb_strip_nulls(jsonb_build_object(
            'source', 'db_trigger',
            'operation', tg_op,
            'table', tg_table_name,
            'record_id', record_id,
            'label', entity_label,
            'previous_status', previous_status,
            'status', next_status,
            'summary', summary
        )),
        actor_role,
        actor_id,
        actor_department,
        tg_table_name,
        record_id
    );

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

revoke all on function public.current_staff_full_name() from public;
grant execute on function public.current_staff_full_name() to anon, authenticated, service_role;

drop policy if exists audit_logs_authenticated_insert on public.audit_logs;
create policy audit_logs_authenticated_insert
on public.audit_logs
for insert
to authenticated
with check (public.current_staff_role() in ('Care Staff', 'Department Head'));

do $$
declare
    tbl text;
    trigger_name text;
begin
    foreach tbl in array ARRAY[
        'staff_accounts',
        'student_activation_settings',
        'applications',
        'admission_schedules',
        'nat_requirements',
        'courses',
        'students',
        'enrolled_students',
        'counseling_requests',
        'support_requests',
        'events',
        'scholarships',
        'forms',
        'questions',
        'office_visit_reasons'
    ]
    loop
        if exists (
            select 1
            from pg_tables
            where schemaname = 'public'
              and tablename = tbl
        ) then
            trigger_name := format('audit_staff_change_%s', tbl);
            execute format('drop trigger if exists %I on public.%I', trigger_name, tbl);
            execute format(
                'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_staff_table_change()',
                trigger_name,
                tbl
            );
        end if;
    end loop;
end
$$;

commit;
