create table if not exists public.student_activation_settings (
    id integer primary key default 1 check (id = 1),
    require_enrollment_key boolean not null default true,
    updated_at timestamp with time zone not null default timezone('utc'::text, now()),
    updated_by uuid
);

insert into public.student_activation_settings (id, require_enrollment_key)
values (1, true)
on conflict (id) do nothing;

alter table public.student_activation_settings enable row level security;

create or replace function public.set_student_activation_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists trg_student_activation_settings_updated_at on public.student_activation_settings;

create trigger trg_student_activation_settings_updated_at
before update on public.student_activation_settings
for each row
execute function public.set_student_activation_settings_updated_at();
