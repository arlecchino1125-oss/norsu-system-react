drop trigger if exists trg_sync_application_nat_password_hash on public.applications;

drop function if exists public.sync_application_nat_password_hash();

alter table if exists public.applications
drop column if exists password;
