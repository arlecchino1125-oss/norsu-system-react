-- Migration: Revoke anon EXECUTE on all SECURITY DEFINER functions
-- Reason: These functions were callable by unauthenticated users via PostgREST,
--         exposing destructive admin operations and sensitive info leaks.
-- Safe because: All frontend .rpc() calls use authenticated clients.
--               All edge functions use SUPABASE_SERVICE_ROLE_KEY (bypasses EXECUTE grants).
--
-- Note: Some functions had EXECUTE granted to PUBLIC (all roles), not just anon directly.
-- We revoke from both anon and PUBLIC, then re-grant to authenticated + service_role.

-- Destructive admin operations
REVOKE EXECUTE ON FUNCTION public.archive_student(text, text, text, bigint) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_student(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.swap_or_rename_student_ids(text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_application(uuid, text, bigint, text, text) FROM anon, PUBLIC;

-- Event manipulation
REVOKE EXECUTE ON FUNCTION public.register_student_for_event(bigint) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_student_event_registration(bigint) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_event_attendees(uuid) FROM anon, PUBLIC;

-- Data access
REVOKE EXECUTE ON FUNCTION public.get_department_applications_page(text, text[], text, text, integer, integer, boolean) FROM anon, PUBLIC;

-- Information leak (staff/student identity helpers)
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_account_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_department() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_email() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_full_name() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_role() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_staff_username() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_student_id() FROM anon, PUBLIC;

-- Edge function rate limiter (uses service_role, anon not needed)
REVOKE EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer) FROM anon, PUBLIC;

-- Trigger functions (defense-in-depth, not directly callable via RPC)
REVOKE EXECUTE ON FUNCTION public.audit_staff_table_change() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_event_registration_attendance_status() FROM anon, PUBLIC;

-- Re-grant to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.archive_student(text, text, text, bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.restore_student(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.swap_or_rename_student_ids(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_application(uuid, text, bigint, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_student_for_event(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_student_event_registration(bigint) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_event_attendees(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_department_applications_page(text, text[], text, text, integer, integer, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_account_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_department() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_full_name() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_staff_username() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_student_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.consume_edge_rate_limit(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_staff_table_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_event_registration_attendance_status() TO authenticated, service_role;
