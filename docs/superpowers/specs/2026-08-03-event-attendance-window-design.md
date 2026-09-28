# Event attendance windows: one closing date, editable per event

**Date:** 2026-08-03
**Status:** Approved

## Problem

Students miss attendance because they have no internet during the event. By the
time they get online, time-in has already closed.

Today time-in closes at `min(event_end, start + 3h)`, hardcoded in three places
that must be kept in lockstep: `src/utils/eventWindows.ts`,
`record_student_event_attendance` (student portal RPC), and
`public_event_window` (public portal RPC). Nothing about it is adjustable by
staff.

## Current behaviour

| Action | Opens | Closes |
| --- | --- | --- |
| Time in | event start | `min(end, start + 3h)` — hardcoded |
| Time out | event end | never (relies on the card archiving) |
| Rate / evaluate | event end | never (relies on the card archiving) |
| Card archives | — | `end + 3 days` (`VISIBILITY_MS`) |

Two problems beyond the hardcoded cap:

1. `visibleUntil` only hides the card in the browser. The public RPCs
   (`public_event_time_out`, `public_event_evaluate`, `public_event_rate`) filter
   on the manual `is_archived` flag alone, so an event that scrolled past its
   3-day visibility is still writable by anyone who calls the RPC directly.
2. `require_geolocation` enforces a 200 m radius and `require_photo` demands an
   upload. Both are unsatisfiable for a student timing in two days late from
   home — precisely the student this change exists to serve.

## Target behaviour

One nullable column, `events.attendance_closes_at`, is the single deadline.
Every student-facing action on an event card opens as it does now and closes
there, and the card archives at the same instant.

| Action | Opens | Closes |
| --- | --- | --- |
| Time in | event start | `closesAt` |
| Time out | event end | `closesAt` |
| Rate / evaluate | event end | `closesAt` |
| Card archives | — | `closesAt` |

`closesAt = attendance_closes_at ?? (end + 3 days)`. The 3h check-in cap is
deleted outright.

## Design

### 1. Schema

```sql
ALTER TABLE public.events ADD COLUMN attendance_closes_at timestamptz;
```

Nullable. NULL means "fall back to `end + 3 days`", which is exactly the current
visibility rule, so every existing row keeps behaving as it does today. No
backfill, and no migration risk from rows with an unparseable schedule.

### 2. `src/utils/eventWindows.ts` — the single source of truth

`checkInClose` and `visibleUntil` collapse into one `closesAt`:

```ts
export interface EventWindows {
    start: Date | null;
    end: Date | null;
    /** Time-in, time-out, rating and evaluation all close here, and the card archives. */
    closesAt: Date | null;
}
```

- Drop `THREE_HOURS_MS` from the check-in calculation. It stays only as the
  fallback event *duration* when `end_time` is blank.
- `closesAt = event.attendance_closes_at ? new Date(...) : end + VISIBILITY_MS`.
- `isEventConcluded` becomes `is_archived || now > closesAt`, unchanged in shape.

### 3. Database — one migration

`supabase/migrations/<ts>_event_attendance_close_date.sql`:

- **`public_event_window`** — keep the existing four-column return signature so
  no dependent object needs dropping. `checkin_close` and `timeout_close` are
  both set to `coalesce(p_event.attendance_closes_at, v_end + interval '3 days')`.
- **`record_student_event_attendance`** —
  - `v_close_at := coalesce(v_event.attendance_closes_at, v_event_end_at + interval '3 days')`
  - check-in: `now() < v_event_start_at` → not open yet; `now() > v_close_at` →
    closed. The `least(...)` cap is gone.
  - check-out: keeps `now() < v_event_end_at` → not open yet, and **gains**
    `now() > v_close_at` → closed.
  - photo and geolocation blocks are wrapped in `IF now() <= v_event_end_at`.
- **`public_event_time_out`** — add the `now() > v_close_at` upper bound.
- **`public_event_evaluate`**, **`public_event_rate`**, **`student_may_evaluate_form`**
  — add the same upper bound alongside the existing "event has ended" gate.

The three RPCs that currently only check `is_archived` now enforce the time-based
close too, which closes the gap described above.

### 4. Photo and geolocation

Enforced only while `now <= end_time`. A time-in after the event has ended skips
both — they exist to prove physical presence, which is meaningless days later.

Nothing is removed: the `require_photo` / `require_geolocation` columns, the RPC
parameters, the `r2:students/<id>/events/<id>/attendance/` prefix ownership
check, and the lat/long validation all stay exactly as they are, so the feature
can be switched back on without rework.

In the create/edit form the two checkboxes move into a collapsed **Advanced**
section. `require_photo` now defaults to **off** for new events (it defaults to
`true` today); the DB column default is left alone so existing rows are
unaffected.

### 5. Staff controls

**Create/edit form** (`CareStaffEventsPage.tsx` + `useCareStaffEvents.tsx`):
a `datetime-local` field labelled "Attendance closes", shown only for attendance
activity types, pre-filled with `end + 3 days` and written to
`attendance_closes_at` in the payload.

**Extend action** on a posted event card: a control that writes
`{ attendance_closes_at: <new date>, is_archived: false }`. It works on
already-archived events and un-archives them, which is what recovers the
existing backlog of missed attendance. Staff already write to `events` directly
under RLS and already set `is_archived` on every save, so no new grant is needed.

The dept portal is read-only for events and needs no change.

### 6. Tests

- `src/utils/eventWindows.test.ts` — replace the two 3h-cap cases with:
  time-in open long past the end; `closesAt` honouring an explicit
  `attendance_closes_at`; `closesAt` falling back to `end + 3 days` when NULL.
- `src/lib/eventWindowMigrationLockstep.test.ts` — the cap it guards no longer
  exists. Re-point it at the new invariant: both RPCs read
  `attendance_closes_at` with a fallback interval derived from
  `getEventWindows()`, and neither reintroduces a `least(...)` check-in cap.
- `src/lib/eventAttendanceRlsHardeningMigration.test.ts:45` — asserts the literal
  `checkInClose` expression in `StudentEventsView`; update to the `closesAt` name.
- New: a case asserting the check-out and evaluate RPCs both carry the
  `attendance_closes_at` upper bound, so the "everything dies with the card"
  rule cannot silently regress.

## Files touched

| File | Change |
| --- | --- |
| `supabase/migrations/<ts>_event_attendance_close_date.sql` | new — column + 6 function redefinitions |
| `src/utils/eventWindows.ts` | `checkInClose`/`visibleUntil` → `closesAt` |
| `src/types/database.ts` | regenerate for the new column |
| `src/pages/student/features/events/components/StudentEventsView.tsx` | `closesAt` gating, labels |
| `src/pages/public/features/events/components/PublicEventsView.tsx` | same |
| `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx` | payload field, extend handler |
| `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx` | "Attendance closes" field, Advanced section, Extend control |
| `src/utils/eventWindows.test.ts` | rewrite window cases |
| `src/lib/eventWindowMigrationLockstep.test.ts` | re-point the lockstep guard |
| `src/lib/eventAttendanceRlsHardeningMigration.test.ts` | rename assertion |

## Explicitly out of scope

- Changing how attendance duration is reported. Nothing computes hours from
  `time_in`/`time_out` for events, so a late time-in and immediate time-out is
  harmless — the attendee list shows "Completed" either way.
- Per-event control over the *opening* of time-in. It stays at the event start.
- Any dept-portal work.
