# Peer Facilitators Overhaul — Design

- **Date:** 2026-07-24
- **Status:** Approved for planning
- **Area:** Care Staff portal + Student portal + Supabase (peer facilitators)

## Problem

The Peer Facilitator flow has one control — a single school-year label in
`peer_facilitator_settings.school_year` — that silently does three jobs at once:

1. Stamps every new application with that year (insert trigger).
2. Filters what the student sees — `VolunteerView` loads only applications
   `.eq('school_year', activeYear)`.
3. Gates hours logging — the attendance insert policy only allows a student to
   clock in with an approved application **in the active year**.

When staff typed a different year into the "Form Year (active)" box to onboard a
2025 batch, the 2026-2027 cohort fell out of the active window: the student
portal stopped showing their applications and standing, and approved
facilitators lost hours access. Nothing was deleted — the rows still exist — but
they became invisible. There is now legitimate data under **both** `2025` (incl.
applications submitted 2026-07-24) and `2026-2027`, so no single year value is
"correct." The year-as-gate design is the root cause.

## Goals

- A student's standing and application are **never** hidden by a year setting.
- Staff can add a student directly as an active facilitator (with a year label),
  without an application.
- One **Active Facilitators** list shows both approved applicants and staff-added
  people, labeled by source and filterable.
- Staff can toggle the application form open/closed and toggle student hours
  logging on/off.
- Peer Facilitator management is its own sidebar page, not tabs buried under Forms.

## Non-goals

- No new dedicated RBAC permission key in this pass — the new page reuses the
  existing `forms` feature permission for visibility. A dedicated permission can
  be added later.
- No change to the counseling/support/needs-assessment features.
- No auto-removal from the roster when an approved application is later reverted
  (removal is a manual action; see Open Items).

## Decisions (from brainstorming)

- Manual adds get **full hours access regardless of year** — roster membership,
  not the year, grants access. The year is a descriptive label.
- The Active list is **one combined list**; anyone is removable. Removing deletes
  the roster row only and cuts hours access; the application record stays on file.
- The new page holds **three** sections: Applications, Active Facilitators, and
  the relocated Facilitator Hours dashboard.
- **Do not reset the school-year value.** The overhaul restores both cohorts by
  removing the visibility filter; resetting would only hide the other group.

## Data model

### `peer_facilitator_settings` (existing single-row table)

- `school_year` — keep, but **label only**: stamps new applications and titles the
  student page. Changing it no longer hides anyone.
- `applications_open boolean NOT NULL DEFAULT true` — students may submit the form.
- `time_in_enabled boolean NOT NULL DEFAULT true` — students may clock hours.

### `peer_facilitators` (new — source of truth for "active")

One row = one currently-active facilitator.

| column | notes |
|---|---|
| `id` | uuid pk |
| `student_id` | FK `students(student_id)` ON DELETE CASCADE; **UNIQUE** (active once) |
| `peer_year` | text label, e.g. `2025`, `2026-2027` |
| `source` | text CHECK IN (`'application'`,`'manual'`) — drives the label/filter |
| `application_id` | uuid nullable FK `peer_facilitator_applications(id)` when source=application |
| `added_by` | uuid nullable (auth uid of staff who added a manual row) |
| `created_at` | timestamptz default now() |

RLS:
- Student may `SELECT` their own row (portal needs to know "am I active").
- Care Staff / Admin: full `SELECT/INSERT/UPDATE/DELETE`.

### Hours access rule change

`peer_facilitator_attendance` insert policy changes from
"approved application in the active year" to:

> student has a row in `peer_facilitators` **AND** `time_in_enabled` is true.

Year-independent. The student close-own-session policy is unchanged so an
already-open session can always be closed even if the toggle is later switched
off (nobody gets stuck clocked in).

## Sync: approval → roster

Approving an application must place the student on the roster automatically.
Implement in the existing approval mutation (`CareStaffVolunteerFormsTable`
`updateStatusMutation`): on status → `approved`, upsert into `peer_facilitators`
(`source='application'`, `peer_year = app.school_year`, `application_id = app.id`)
with `ON CONFLICT (student_id) DO NOTHING` (already-active students are left as-is).

Single approval path, so app-side sync is sufficient; a DB trigger is the
alternative if a second approval path ever appears.

## Student portal — `VolunteerView` rewrite

Remove the `.eq('school_year', activeYear)` filter (the bug). New data:
roster membership for this student, their latest application (any year), and
settings (`applications_open`, `time_in_enabled`, `school_year` label).

Branches:
- **On roster** → "You are a CARE Peer Facilitator" + `VolunteerTimeLog`.
- **Not on roster, has pending/rejected application** → show that status.
- **Not on roster, no application, applications_open** → apply flow.
- **Not on roster, no application, applications closed** → "Applications are
  currently closed."

`VolunteerTimeLog`: when `time_in_enabled` is false, disable the **Time In**
button with a short note ("Hours logging is paused"). **Time Out** stays enabled.

## Staff — new sidebar page

New **Peer Facilitators** nav item under *Administration* (near Forms). Wiring:
add the tab to the `ActiveTab` union, `NAV_SECTIONS`, `HEADER_TITLES`, the render
switch in `CareStaffDashboard`, and map it in `CARE_STAFF_TAB_FEATURES` to the
existing `forms` feature key (no permission migration). Consider adding it to
`CARE_STAFF_REFRESHABLE_TABS`.

New component `CareStaffPeerFacilitatorsPage` with three sub-tabs:

1. **Applications** — the existing review/approve/reject table, plus the
   **applications open/closed** toggle. The year box becomes "current application
   year" (safe label); keep the historical viewing-by-year filter, default to
   showing all years.
2. **Active Facilitators** *(new)* — list from `peer_facilitators` joined to
   `students`; source filter (All / Applied / Added by staff); **Add facilitator**
   (student search by name/ID, reusing the population lookup pattern, + year
   field); **Remove** button (deletes the roster row); and the **time-in on/off**
   toggle. Guard duplicate adds via the unique `student_id` (show "already active").
3. **Facilitator Hours** — the existing `CareStaffFacilitatorHours`, relocated.

`CareStaffFormsPage` loses the Peer Facilitators and Facilitator Hours tabs and
its tab bar; it returns to just Needs Assessments (update header copy).

## Migration & rollout

Single migration:
1. Create `peer_facilitators` + RLS + unique(student_id) + supporting indexes.
2. Add `applications_open`, `time_in_enabled` to `peer_facilitator_settings`.
3. **Backfill**: insert a roster row for every currently-`approved` application
   (`source='application'`, `peer_year = school_year`, `application_id`). This
   restores the 2026-2027 approved facilitators by their approved status, not by
   the year value.
4. Replace the `peer_facilitator_attendance` insert policy per the rule above.

App changes ship alongside: student view rewrite, approval→roster sync, new staff
page + nav wiring, Forms page trimming, time-log toggle awareness.

No manual data edits required. The year value is left as staff set it.

## Open items / future

- Reverting an approved application does not remove the roster row (manual removal
  only). Add a trigger/handler later if that path becomes real.
- A dedicated `peer_facilitators` RBAC permission (separate from `forms`) if the
  office wants distinct access control.

## Verification checks

- Backfill: after migration, every approved application has exactly one roster row.
- Student view: a student with a `2025` application and a student with a
  `2026-2027` application both see their own status regardless of `school_year`.
- Hours gate: a rostered student can time in only while `time_in_enabled`; an open
  session can still be timed out after the toggle is switched off.
- Add/remove: staff add creates a `manual` row; remove deletes it and blocks the
  student's next time-in; the application record is untouched.
