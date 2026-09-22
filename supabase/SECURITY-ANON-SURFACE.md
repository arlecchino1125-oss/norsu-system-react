# Intentional anon-executable surface

The database linter (`anon_security_definer_function_executable`, lint 0028) flags
every `SECURITY DEFINER` function that the `anon` role can execute. Most of those
warnings are **expected**: the ID-only public portal has no Supabase session, so
its only way in is an RPC callable without signing in. This file records which
ones are deliberate so a future audit does not "fix" the portal by revoking them,
and which invariants keep that surface safe.

## Why the surface exists

- The student app (`src/pages/student/**`) has a session and talks to tables
  through RLS.
- The public portal (`src/pages/public/**`) has **no session**. It identifies a
  student with their ID, and every `public_*` function:
  - resolves the real student row server-side via `public_resolve_student`,
  - never returns profile fields (name, department, course) to the browser,
  - rate-limits writes through `public_throttle_take` (5 attempts / 5 minutes),
  - stamps identity server-side from `v_student.*`.

## Deliberate anon-executable functions

Assessments
`public_get_assessment_forms`, `public_get_assessment_form_questions`,
`public_submit_assessment`, `public_submit_general_feedback`

Student identity
`public_verify_student` (returns ID + peer flag only)

Events
`public_get_active_events`, `public_get_student_event_status`,
`public_get_evaluation_form`, `public_event_evaluate`, `public_event_rate`,
`public_event_time_in`, `public_event_time_out`

Counseling
`public_get_counseling_evaluations`, `public_get_counseling_evaluation_form`,
`public_counseling_evaluate`, `public_submit_counseling_request`

Office visits
`public_get_office_visit_reasons`, `public_get_active_office_visit`,
`public_office_visit_time_in`, `public_office_visit_time_out`

Requests and scholarships
`public_submit_support_request`, `public_submit_scholarship_application`

Peer facilitators
`public_get_peer_events`, `public_get_peer_attendance`, `public_get_peer_logbook`,
`public_save_peer_log_entry`, `public_delete_peer_log_entry`,
`public_submit_peer_logbook`, `public_search_students_for_peer`
(the search verifies the caller is an active peer facilitator before returning
anything)

## Must never be anon-executable

- `public_resolve_student` -- returns a whole student row.
- RLS helper functions (`is_admin`, `current_*`, `student_may_evaluate_*`,
  `student_has_completed_counseling`, `student_in_current_staff_department`,
  `student_text_id_in_current_staff_department`) -- only policies need them, and
  policies run as the querying role.
- Trigger functions (`stamp_event_evaluation_response_identity`,
  `lock_counseling_requests_student_update`, `audit_staff_table_change`, ...) --
  triggers never check EXECUTE, so no grant is needed at all.
- Maintenance functions (`auto_timeout_records`, `get_event_attendance_counts`).

`20260922100000_lock_down_security_definer_execute.sql` enforces this list.

## Why grants leak (read before writing a migration)

Supabase ships default privileges that grant `ALL` on every new function in
`public` to `anon` and `authenticated`
(`ALTER DEFAULT PRIVILEGES ... GRANT ALL ON FUNCTIONS TO anon, authenticated`,
visible in `20260705160000_remote_schema.sql`). Two traps follow:

1. `REVOKE ... FROM PUBLIC` does **not** remove anon's direct default grant.
   Revoke from `anon` (and `PUBLIC`) explicitly.
2. `DROP FUNCTION` + `CREATE FUNCTION` reinstates the default grants;
   `CREATE OR REPLACE` preserves them. After a drop, re-issue the revoke with the
   rest of the grant block.

## Checklist for every new function

- Decide its audience: portal (anon), signed-in app (authenticated), internal
  (neither).
- Finish the migration with an explicit block, e.g.:

  ```sql
  revoke all on function public.my_function(text) from public, anon, authenticated;
  grant execute on function public.my_function(text) to authenticated, service_role;
  ```

- For portal functions, copy the existing contract: `SECURITY DEFINER`,
  `set search_path = public, pg_temp`, resolve identity server-side, throttle
  writes.

## How to re-audit

```sql
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_can,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_can
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
order by 1, 2;
```

Anything `anon_can = true` that is not in the list above is a bug.