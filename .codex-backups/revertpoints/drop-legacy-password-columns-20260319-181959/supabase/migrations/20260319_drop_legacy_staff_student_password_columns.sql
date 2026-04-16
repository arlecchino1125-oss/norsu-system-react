alter table public.staff_accounts
drop column if exists password;

alter table public.students
drop column if exists password;
