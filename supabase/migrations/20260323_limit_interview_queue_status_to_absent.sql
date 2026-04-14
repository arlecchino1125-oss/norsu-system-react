alter table if exists public.applications
drop constraint if exists applications_interview_queue_status_chk;

alter table if exists public.applications
add constraint applications_interview_queue_status_chk
check (
    interview_queue_status is null
    or interview_queue_status = 'Absent'
);
