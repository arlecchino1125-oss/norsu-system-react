# Supabase Changelog

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
