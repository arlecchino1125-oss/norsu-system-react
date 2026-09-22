-- Adopts get_event_attendance_counts into the migration history.
--
-- This function predates the July 2026 schema snapshot and was never committed
-- as a migration. 20260922100000_lock_down_security_definer_execute.sql already
-- revokes anon via a guarded DO block; this migration makes the function managed
-- so the guard can be dropped in a future cleanup and so `supabase db diff` stops
-- reporting it as drift.

CREATE OR REPLACE FUNCTION public.get_event_attendance_counts(event_ids bigint[])
RETURNS TABLE(event_id bigint, attendance_count integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT event_id, COUNT(*)::int AS attendance_count
  FROM event_attendance
  WHERE event_id = ANY(event_ids)
  GROUP BY event_id;
$$;

-- CREATE OR REPLACE reinstates default grants (anon + authenticated ALL), so
-- re-issue the explicit lockdown: staff-only, no anon.
revoke all on function public.get_event_attendance_counts(bigint[]) from public, anon;
grant execute on function public.get_event_attendance_counts(bigint[]) to authenticated, service_role;
