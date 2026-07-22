# Supabase Changelog

## 2026-07-22 — Feature: Peer facilitator volunteer time log

**Migration:** `20260722090000_peer_facilitator_attendance.sql`

**Problem:** Approved CARE Peer Facilitators had no way to record the volunteer time they put in, and staff had no view of it. No existing table fit: `event_attendance` requires an `event_id` (facilitator help isn't an event) and `office_visits` is the counseling logbook with its own reason/status semantics.

**Fix:** New `peer_facilitator_attendance` table (`student_id`, `time_in`, `time_out`). Hours are always derived from the pair, never stored. A partial unique index on `student_id WHERE time_out IS NULL` makes a second open session impossible at the database, so no app-side "already clocked in" check exists to drift. RLS: a student may insert only for themselves and only while holding an `approved` application in the *active* form year (last year's facilitators cannot keep logging), may read only their own rows, and may update a row only while `time_out IS NULL` — closing a session makes it immutable to them. Care Staff and Admin read all rows and may correct a bad one.

RLS governs *which* row a student may write, not the values in it, so a crafted request could still have posted `time_in` hours in the past or `time_out` in the future and inflated the hours. `stamp_peer_facilitator_attendance_times` (BEFORE INSERT OR UPDATE) closes that: when the caller is a student it forces `time_in := now()` on insert, blanks any supplied `time_out` so a pre-closed row cannot be fabricated, and on update pins `time_in` to the stored value and rewrites `time_out` to the server clock. Non-students (Care Staff, Admin, service role) pass through untouched, keeping staff corrections possible. Frontend: approved facilitators get a Time In / Time Out card in the student portal Volunteer tab; Care Staff get a "Facilitator Hours" tab under Form Management with a date dropdown, per-day roster, and per-day totals.

**Rollback:** `DROP TABLE public.peer_facilitator_attendance;` — no other table references it.

## 2026-07-20 — Security: Remove the CARE bulk student-data reset entirely

**Migration:** `20260720120000_remove_student_data_reset.sql`

**Problem:** The CARE Staff settings page exposed an OTP-protected "danger zone" that deleted every student-service record and every linked student auth account in one action. Even gated behind OTP + typed confirmation + audit logging, a single compromised CARE Staff session could irreversibly destroy all student data. The capability is no longer needed.

**Fix:** Removed end to end. Frontend: deleted `StudentDataDangerZoneCard`, its wiring in the CARE Staff settings page/dashboard/governance hook, and the `reset_student_data` action from the permission catalog and Care Staff defaults; updated the admin Governance panel copy. Edge function: deleted the `preview-care-student-reset`, `request-care-reset-otp`, and `care-reset-student-data` modes and their helpers from `manage-student-accounts`, and dropped the `destructive_reset` OTP purpose from the shared OTP/email services. Database: deleted the `reset_student_data` permission rows, rewrote `seed_default_role_permissions` so reset-to-defaults cannot re-grant it, purged unconsumed `destructive_reset` OTPs, and tightened the `security_change_otps` purpose CHECK so they can never be created again.

**Rollback:** Requires restoring the deleted code and re-widening the CHECK constraint. Deliberately not provided as a simple script — the removal is the security fix.

## 2026-07-14 — Security: Restrict archive surface, drop unguarded event RPC

**Migration:** `20260714100000_restrict_archive_surface.sql`

**Problem:** Three issues from the security-definer advisor sweep. (1) `increment_event_attendees(uuid)` was SECURITY DEFINER with no auth check and no callers — any signed-in user could inflate any event's attendee count. (2) `archive_student`/`restore_student` were executable by `authenticated`, letting staff bypass the `manage-record-archives` edge function's `role_permissions` check, rate limiting, and audit log — and spoof `p_archived_by`. (3) Department Heads held `archive_records`/`restore_records`, but policy is Care Staff + Admin only.

**Fix:** Dropped `increment_event_attendees`. Revoked `authenticated` EXECUTE on `archive_student`/`restore_student` (service role, i.e. the edge function, remains the only caller) and on the two trigger functions (`audit_staff_table_change`, `sync_event_registration_attendance_status` — lint hygiene; they were never RPC-callable). Deleted Department Head `archive_records`/`restore_records` rows and rewrote `seed_archive_action_permission_defaults` to seed Care Staff only, so "reset to defaults" cannot re-grant them. Paired frontend change removes both keys from the Department Head defaults in `src/types/permissions.ts`.

**Rollback:** Re-granting `authenticated` EXECUTE and re-seeding the Department Head rows restores the old behavior, but reopens the permission-toggle/audit-log bypass. Prefer forward repair.

## 2026-07-14 — Security: Harden NAT public database boundary

**Migration:** `20260714062703_harden_nat_portal.sql`

**Problem:** Anonymous callers could insert directly into `applications`, bypassing the NAT Edge Function's validation, rate limiting, password hashing, and email flow. Public course and schedule policies also exposed inactive rows and more table privileges than the public form needs, while authenticated callers could directly invoke privileged NAT-related functions.

**Fix:** Removed direct anonymous application writes, restricted public reads to safe columns on open courses and active schedules, limited public permission reads to `SELECT`, and made `consume_edge_rate_limit` plus `finalize_application` service-role-only. A transaction-safe insert trigger now validates course and schedule availability and capacity for every NAT application insert.

**Rollback:** Restoring the former policies/grants and dropping the trigger would restore the previous behavior, but it would also reopen the direct anonymous submission bypass and remove server-side capacity enforcement.

## 2026-07-06 — Security: Revoke anon EXECUTE on SECURITY DEFINER functions

**Migration:** `20260706062900_revoke_anon_execute_security_definer.sql`

**Problem:** 17 `SECURITY DEFINER` functions in the `public` schema were executable by the `anon` role. Anyone with the project URL + anon key could call destructive operations like `archive_student`, `restore_student`, `swap_or_rename_student_ids`, and `finalize_application` — or leak staff identity via `current_staff_email`, `current_staff_role`, etc.

**Fix:** Revoked `EXECUTE` from `anon` on all 17 functions. No functionality impact — all frontend `.rpc()` calls use authenticated clients, and all edge functions use `SUPABASE_SERVICE_ROLE_KEY` (which bypasses EXECUTE grants).

**Functions affected:**
- `archive_student`, `restore_student`, `swap_or_rename_student_ids`, `finalize_application`
- `register_student_for_event`, `cancel_student_event_registration`, `increment_event_attendees`
- `get_department_applications_page`
- `is_admin`, `current_staff_account_id`, `current_staff_department`, `current_staff_email`
- `current_staff_full_name`, `current_staff_role`, `current_staff_username`, `current_student_id`
- `consume_edge_rate_limit`

## 2026-07-06 — Security: Drop general_feedback anon INSERT policy

**Migration:** `20260706063500_drop_general_feedback_anon_insert.sql`

**Problem:** `general_feedback_anon_insert` RLS policy had `WITH CHECK (true)` — any unauthenticated user could insert unlimited rows via PostgREST, a spam/abuse vector.

**Fix:** Dropped the policy. No UI impact — there is no public feedback form. Authenticated students submit feedback through `StudentDashboardView.tsx`, covered by `general_feedback_student_insert_own`.

## 2026-07-06 — Security: Pin search_path on 16 functions

**Migration:** `20260706063600_pin_search_path_on_functions.sql`

**Problem:** 16 functions in the `public` schema had a mutable `search_path`, leaving them vulnerable to schema-poisoning (a rogue schema could shadow `public` tables).

**Fix:** `ALTER FUNCTION ... SET search_path = 'public'` on all 16 functions. No behavior change — all queries already resolved against `public`.

## 2026-07-06 — Fix: Seed Student feature:volunteer permission

**Migration:** `20260706083000_seed_student_volunteer_feature_permission.sql`

**Problem:** The Peer Facilitator volunteer view is gated behind `feature:volunteer`, but no `role_permissions` row was ever seeded for the Student role. Unknown feature keys resolve to `hidden`, so the student portal blocked the view with a "Volunteer Form is currently hidden" toast.

**Fix:** Idempotent insert of `Student` / `feature` / `volunteer` (`is_allowed = true`, `status = 'enabled'`). Paired with a frontend change adding `volunteer` to `FEATURE_PERMISSIONS.student` so the key appears in the admin permissions UI and future role seeds.

## 2026-07-06 — Security: Restrict peer_facilitator_applications to staff

**Migration:** `20260706100000_restrict_peer_facilitator_applications_to_staff.sql`

**Problem:** The initial `peer_facilitator_applications` migration (`20260706071727`) created SELECT-all and UPDATE-all policies for **any authenticated user** — a logged-in student could read every applicant's data and approve/reject applications (including their own) via direct PostgREST calls.

**Fix:** Dropped both broad policies; replaced with staff-only equivalents using the repo's standard predicate (`is_admin() OR current_staff_role() = 'Care Staff'`). Students keep their own-row SELECT and INSERT policies, so the student portal's status card and submissions are unaffected.

## 2026-07-06 — Feature: Peer facilitator school-year windows

**Migration:** `20260706103000_peer_facilitator_school_year.sql`

**What:** Care staff can set the active form year (e.g. "2026-2027") shown in the student portal header; every application is stamped with the active year at insert time so each window has its own isolated volunteer list.

**How:** New single-row `peer_facilitator_settings` table (same pattern as `student_activation_settings`) — authenticated read, staff-only update. Added `school_year` column to `peer_facilitator_applications` (existing rows backfilled to the current setting) plus a BEFORE INSERT trigger that stamps the active year server-side, so the window assignment cannot be forged by the client. Changing the year starts a fresh list; prior windows stay queryable under their own tag.
