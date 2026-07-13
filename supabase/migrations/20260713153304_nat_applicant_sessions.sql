create table if not exists public.nat_applicant_sessions (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references public.applications(id) on delete cascade,
    token_hash text not null unique,
    browser_id_hash text not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default timezone('utc'::text, now()),
    constraint nat_applicant_sessions_token_hash_check
        check (token_hash ~ '^[0-9a-f]{64}$'),
    constraint nat_applicant_sessions_browser_id_hash_check
        check (browser_id_hash ~ '^[0-9a-f]{64}$'),
    constraint nat_applicant_sessions_expiry_check
        check (expires_at > created_at)
);

create index if not exists nat_applicant_sessions_application_id_idx
    on public.nat_applicant_sessions (application_id);

create index if not exists nat_applicant_sessions_expires_at_idx
    on public.nat_applicant_sessions (expires_at);

alter table public.nat_applicant_sessions enable row level security;

revoke all on table public.nat_applicant_sessions from public, anon, authenticated;
grant select, insert, delete on table public.nat_applicant_sessions to service_role;

comment on table public.nat_applicant_sessions is
    'Fixed-lifetime NAT applicant sessions. Only SHA-256 token and browser identifiers are stored.';
