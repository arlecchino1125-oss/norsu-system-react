-- Restrict the archive/restore surface and remove a dead, unguarded RPC.
--
-- 1) increment_event_attendees(uuid): SECURITY DEFINER with no auth check and
--    no callers anywhere (frontend or edge functions). Any signed-in user could
--    inflate any event's attendee count via /rest/v1/rpc. Dropped.
-- 2) archive_student / restore_student: only the manage-record-archives edge
--    function (service role) calls them. Direct RPC calls bypassed its
--    role_permissions check, rate limiting, and audit logging, and allowed
--    spoofing p_archived_by. authenticated loses EXECUTE; service_role keeps it.
-- 3) audit_staff_table_change / sync_event_registration_attendance_status:
--    trigger functions are not callable via RPC anyway; revoked to silence the
--    advisor. Triggers still fire — EXECUTE is not checked against the DML user.
-- 4) Policy: archiving/restoring records is Care Staff + Admin only.
--    Department Head rows are deleted and the defaults seed no longer
--    re-grants them on "reset to defaults".

DROP FUNCTION IF EXISTS public.increment_event_attendees(uuid);

REVOKE EXECUTE ON FUNCTION public.archive_student(text, text, text, bigint) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_student(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.archive_student(text, text, text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_student(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.audit_staff_table_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_event_registration_attendance_status() FROM authenticated;

-- ponytail: archive_student/restore_student still list 'Department Head' in
-- their internal role guard; that path is unreachable now that authenticated
-- cannot EXECUTE them and the edge function enforces role_permissions.
-- Rewrite the guards only if the authenticated grant ever returns.

DELETE FROM public.role_permissions
WHERE role = 'Department Head'
  AND permission_type = 'action'
  AND permission_key IN ('archive_records', 'restore_records');

CREATE OR REPLACE FUNCTION public.seed_archive_action_permission_defaults(target_role text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
declare
    seeded_count integer := 0;
begin
    insert into public.role_permissions (
        role,
        permission_type,
        permission_key,
        is_allowed,
        status,
        notice_text,
        description
    )
    select
        defaults.role,
        defaults.permission_type,
        defaults.permission_key,
        defaults.is_allowed,
        defaults.status,
        defaults.notice_text,
        defaults.description
    from (
        values
            ('Care Staff', 'action', 'archive_records', true, 'enabled', null, 'Archive, close, deactivate, or retire records without hard deletion.'),
            ('Care Staff', 'action', 'restore_records', true, 'enabled', null, 'Restore previously archived records back into active use.')
    ) as defaults(role, permission_type, permission_key, is_allowed, status, notice_text, description)
    where target_role is null or defaults.role = target_role
    on conflict (role, permission_type, permission_key)
    do update set
        is_allowed = excluded.is_allowed,
        status = excluded.status,
        notice_text = excluded.notice_text,
        description = excluded.description,
        updated_at = timezone('utc'::text, now());

    get diagnostics seeded_count = row_count;
    return seeded_count;
end;
$$;

COMMENT ON FUNCTION public.seed_archive_action_permission_defaults(text) IS
    'Seeds archive/restore action permissions. Care Staff only; Admin bypasses permission checks and Department Heads are excluded by policy.';

-- Fail installation if any boundary set above is missing.
DO $$
DECLARE
    v_archive oid := to_regprocedure('public.archive_student(text, text, text, bigint)');
    v_restore oid := to_regprocedure('public.restore_student(text)');
BEGIN
    IF to_regprocedure('public.increment_event_attendees(uuid)') IS NOT NULL THEN
        RAISE EXCEPTION 'increment_event_attendees must be dropped';
    END IF;

    IF v_archive IS NULL OR v_restore IS NULL
       OR has_function_privilege('authenticated', v_archive, 'EXECUTE')
       OR has_function_privilege('authenticated', v_restore, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_archive, 'EXECUTE')
       OR NOT has_function_privilege('service_role', v_restore, 'EXECUTE') THEN
        RAISE EXCEPTION 'archive_student/restore_student must be service-role only';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.role_permissions
        WHERE role = 'Department Head'
          AND permission_type = 'action'
          AND permission_key IN ('archive_records', 'restore_records')
    ) THEN
        RAISE EXCEPTION 'Department Head must not hold archive/restore permissions';
    END IF;
END;
$$;

-- Emergency rollback consideration: re-granting authenticated EXECUTE and
-- re-seeding the Department Head rows restores the previous behavior, but it
-- also reopens the permission-toggle/audit-log bypass. Prefer forward repair.
