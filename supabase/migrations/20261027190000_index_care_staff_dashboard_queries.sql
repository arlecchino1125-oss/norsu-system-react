-- Index the Care Staff Dashboard & bell notification queries that previously
-- performed full sequential scans / unindexed sorts on growing tables:
--
-- 1. notifications:
--    SELECT id, message, created_at FROM public.notifications
--      WHERE message LIKE '[PROFILE UPDATE]%'
--      ORDER BY created_at DESC LIMIT 15
--    (plus exact count with the same predicate)
--    A partial B-tree index on (created_at DESC) matching the exact predicate
--    serves both the top-N sort and the exact count via index-only scans.
CREATE INDEX IF NOT EXISTS idx_notifications_profile_update_created_at
    ON public.notifications USING btree (created_at DESC)
    WHERE (message LIKE '[PROFILE UPDATE]%');

-- 2. audit_logs:
--    SELECT id, user_name, action, details, created_at FROM public.audit_logs
--      WHERE action IN ('Student Profile Updated', 'Student Profile Completed', 'Student Profile Picture Updated')
--      ORDER BY created_at DESC LIMIT 15
--    Existing audit_logs_actor_role_created_at_idx has actor_role as its leading
--    column, so action-filtered queries could not use it.
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
    ON public.audit_logs USING btree (action, created_at DESC);

-- 3. support_requests:
--    SELECT id, student_name, status, created_at FROM public.support_requests
--      ORDER BY created_at DESC LIMIT 10
--    Existing idx_support_requests_status_created_at requires a status filter.
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at
    ON public.support_requests USING btree (created_at DESC);

-- 4. scholarship_applications:
--    SELECT id, student_id, status, created_at FROM public.scholarship_applications
--      WHERE status <> 'Pending'
--      ORDER BY created_at DESC LIMIT 10
CREATE INDEX IF NOT EXISTS idx_scholarship_applications_status_created_at
    ON public.scholarship_applications USING btree (status, created_at DESC);



