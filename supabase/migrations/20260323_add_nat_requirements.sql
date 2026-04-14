create table if not exists public.nat_requirements (
    id bigint generated always as identity primary key,
    name text not null unique,
    created_at timestamp with time zone not null default timezone('utc'::text, now())
);
