alter table public.security_change_otps
drop constraint if exists security_change_otps_purpose_check;

alter table public.security_change_otps
add constraint security_change_otps_purpose_check
check (purpose in ('password_change', 'email_change', 'destructive_reset'));
