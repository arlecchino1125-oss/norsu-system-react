create table if not exists public.security_change_otps (
    id uuid primary key default gen_random_uuid(),
    auth_user_id uuid not null,
    account_type text not null check (account_type in ('student', 'staff')),
    purpose text not null check (purpose in ('password_change', 'email_change')),
    target_email text not null,
    otp_hash text not null,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    attempt_count integer not null default 0,
    last_attempt_at timestamptz,
    created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_security_change_otps_lookup
on public.security_change_otps (auth_user_id, account_type, purpose, consumed_at, expires_at, created_at desc);

alter table public.security_change_otps enable row level security;
