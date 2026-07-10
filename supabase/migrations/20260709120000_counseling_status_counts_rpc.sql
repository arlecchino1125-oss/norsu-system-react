-- Grouped status counts for the CARE staff Counseling page badges.
-- Collapses the 6 per-status count round-trips into a single request.
--
-- SECURITY INVOKER: the function runs as the calling user, so row-level security
-- still scopes the counts to exactly the rows that caller could already SELECT.
-- search_path is pinned to '' (matches 20260706063600_pin_search_path_on_functions),
-- so every object is schema-qualified below.
create or replace function public.get_counseling_status_counts()
returns table (status text, count bigint)
language sql
security invoker
stable
set search_path = ''
as $$
    select counseling_requests.status, count(*)::bigint
    from public.counseling_requests
    group by counseling_requests.status;
$$;

-- Match the role your direct `counseling_requests` SELECT already uses. CARE staff
-- hit the table as `authenticated`; anon is left without execute. If your staff
-- read the table as a different role, grant to that role instead — and note the
-- app falls back to per-status counts if execute is denied, so a wrong grant
-- degrades gracefully rather than breaking the page.
revoke all on function public.get_counseling_status_counts() from public;
grant execute on function public.get_counseling_status_counts() to authenticated;
