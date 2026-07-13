-- Track failed NAT applicant logins so the edge function can require a
-- Cloudflare Turnstile CAPTCHA for a username after repeated failures.
-- No account lockout: the applicant can always log in by passing the CAPTCHA.
alter table "public"."applications"
    add column if not exists "failed_login_attempts" integer not null default 0,
    add column if not exists "captcha_required_until" timestamp with time zone;
