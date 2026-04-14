alter table if exists public.applications
add column if not exists interview_queue_status text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'applications_interview_queue_status_chk'
    ) then
        alter table public.applications
        add constraint applications_interview_queue_status_chk
        check (
            interview_queue_status is null
            or interview_queue_status = 'Absent'
        );
    end if;
end $$;

create index if not exists idx_applications_interview_queue_status
on public.applications (status, interview_date, interview_queue_status);
