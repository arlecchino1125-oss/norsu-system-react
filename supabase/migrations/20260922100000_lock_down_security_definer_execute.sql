-- Locks down SECURITY DEFINER functions that anon and authenticated can invoke
-- through PostgREST even though nothing in this app calls them.
--
-- Root cause being cleaned up here: Supabase ships default privileges that grant
-- ALL on new functions in the public schema to anon and authenticated
-- (see 20260705160000_remote_schema.sql, "ALTER DEFAULT PRIVILEGES ... GRANT ALL
-- ON FUNCTIONS"). Consequences that bit this repo twice:
--
--   * Revoking only FROM PUBLIC does NOT remove anon's direct default grant --
--     department_evaluate_peer_application and the two
--     student_*_in_current_staff_department helpers were "locked down" that way
--     and are still anon-executable on the live database.
--   * DROP + CREATE reinstates the default grants; the single-argument
--     public_resolve_student was rebuilt in 20260804090000 and lost the revoke
--     its two-argument predecessor had.
--
-- Every statement below therefore names anon AND authenticated explicitly.
--
-- Deliberately untouched: the public_* portal RPCs, which exist to be callable
-- without a session (documented in supabase/SECURITY-ANON-SURFACE.md). This
-- migration only removes EXECUTE from roles that have no caller.
--
-- If a revoke below fails because the function is missing on the remote, that is
-- schema drift: reconcile with `supabase db diff --linked` before re-running.

-- ---------------------------------------------------------------------------
-- 1. public_resolve_student returns a whole student row, so it must never be
--    reachable from PostgREST. Its callers are other SECURITY DEFINER functions
--    owned by postgres, which run with the definer's privileges and need no
--    caller-side grant.
-- ---------------------------------------------------------------------------
revoke all on function public.public_resolve_student(text) from public, anon, authenticated;
grant execute on function public.public_resolve_student(text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Maintenance and trigger functions. Triggers are invoked by the system and
--    never check EXECUTE, and auto_timeout_records is only reached through
--    PERFORM inside other SECURITY DEFINER functions.
-- ---------------------------------------------------------------------------
revoke all on function public.auto_timeout_records() from public, anon, authenticated;
grant execute on function public.auto_timeout_records() to service_role;

revoke all on function public.lock_counseling_requests_student_update() from public, anon, authenticated;

revoke all on function public.stamp_event_evaluation_response_identity() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. RLS helper functions. Policies evaluate as the querying role, so
--    authenticated must keep EXECUTE or every policy that references them
--    breaks. anon never satisfies these policies (no session) and the ID-only
--    portal reads through SECURITY DEFINER RPCs instead.
-- ---------------------------------------------------------------------------
revoke all on function public.student_may_evaluate_form(bigint) from public, anon;
grant execute on function public.student_may_evaluate_form(bigint) to authenticated, service_role;

revoke all on function public.student_may_evaluate_counseling(bigint) from public, anon;
grant execute on function public.student_may_evaluate_counseling(bigint) to authenticated, service_role;

revoke all on function public.student_has_completed_counseling() from public, anon;
grant execute on function public.student_has_completed_counseling() to authenticated, service_role;

revoke all on function public.student_in_current_staff_department(bigint) from public, anon;
grant execute on function public.student_in_current_staff_department(bigint) to authenticated, service_role;

revoke all on function public.student_text_id_in_current_staff_department(text) from public, anon;
grant execute on function public.student_text_id_in_current_staff_department(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Staff action. Department heads approve or reject peer-facilitator
--    applications from the department dashboard; the function re-checks the
--    caller's role internally, but anon should not be able to reach it at all
--    with a guessed application id.
-- ---------------------------------------------------------------------------
revoke all on function public.department_evaluate_peer_application(uuid, text) from public, anon;
grant execute on function public.department_evaluate_peer_application(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. get_event_attendance_counts predated the July snapshot and was unmanaged.
--    20260922110000_adopt_get_event_attendance_counts.sql now owns the CREATE
--    and the grant block. The guarded DO below runs first (migrations are
--    ordered by timestamp) and handles the revoke on the existing live function;
--    the later migration then re-issues it after CREATE OR REPLACE.
-- ---------------------------------------------------------------------------
do $$
begin
    if to_regprocedure('public.get_event_attendance_counts(bigint[])') is not null then
        execute 'revoke all on function public.get_event_attendance_counts(bigint[]) from public, anon';
        execute 'grant execute on function public.get_event_attendance_counts(bigint[]) to authenticated, service_role';
    end if;
end $$;