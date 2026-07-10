-- Grouped status counts for the CARE staff Support page badges.
-- Collapses the 5 per-status count round-trips into a single request.
-- Mirrors 20260709120000_counseling_status_counts_rpc.
--
-- SECURITY INVOKER: the function runs as the calling user, so row-level security
-- still scopes the counts to exactly the rows that caller could already SELECT.
-- search_path is pinned to '' (matches 20260706063600_pin_search_path_on_functions),
-- so every object is schema-qualified below.
create or replace function public.get_support_status_counts()
returns table (status text, count bigint)
language sql
security invoker
stable
set search_path = ''
as $$
    select support_requests.status, count(*)::bigint
    from public.support_requests
    group by support_requests.status;
$$;

-- Same grant as the counseling RPC. If CARE staff sessions turn out not to run
-- as `authenticated`, adjust the grant to match — the app falls back to
-- per-status counts if execute is denied, so a wrong grant degrades gracefully.
revoke all on function public.get_support_status_counts() from public;
grant execute on function public.get_support_status_counts() to authenticated;
