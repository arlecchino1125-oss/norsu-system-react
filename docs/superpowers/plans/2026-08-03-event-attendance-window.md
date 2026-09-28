# Event Attendance Window Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded 3-hour time-in cap with one per-event closing date that governs time-in, time-out, rating, evaluation and archiving, and give staff a control to push it forward on any event.

**Architecture:** A new nullable `events.attendance_closes_at` column becomes the single deadline. `src/utils/eventWindows.ts` collapses `checkInClose` and `visibleUntil` into one `closesAt`; the SQL RPCs read the same column with the same `end + 3 days` fallback, so a NULL row behaves exactly as it does today and no backfill is needed. Photo and geolocation checks are scoped to `now <= end_time` so a late time-in is not blocked by proof-of-presence rules that no longer make sense.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, Supabase (Postgres + PL/pgSQL RPCs), Tailwind.

## Global Constraints

- `src/utils/eventWindows.ts` is the single source of truth for these windows. Any change to it must be mirrored in the migration, and `src/lib/eventWindowMigrationLockstep.test.ts` is what enforces that. Never make the lockstep test pass by weakening it.
- All timestamps in SQL are computed `AT TIME ZONE 'Asia/Manila'`.
- Default fallback interval is exactly **3 days** past the event end, matching the existing `VISIBILITY_MS` constant.
- `attendance_closes_at` is nullable and stays nullable. NULL means "use the fallback". Do not backfill it.
- Do **not** delete the `require_photo` / `require_geolocation` columns, RPC parameters, storage-prefix ownership check, or lat/long validation. They are being scoped down, not removed.
- Run `npm test` (vitest) for tests, `npm run typecheck` for types. `npm run check` runs lint + typecheck + test + build.
- Attendance activity types are `event`, `seminar`, `orientation`, `meeting` (see `isAttendanceActivityType` in `src/utils/eventAudience.ts`).

---

### Task 1: Collapse the window helper to one closing date

**Files:**
- Modify: `src/utils/eventWindows.ts`
- Test: `src/utils/eventWindows.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `getEventWindows(event) => { start: Date|null, end: Date|null, closesAt: Date|null }` and `isEventConcluded(event) => boolean`. `checkInClose` and `visibleUntil` cease to exist. Every later task depends on the `closesAt` name.

- [ ] **Step 1: Rewrite the failing tests**

Replace the whole `describe('getEventWindows', ...)` block in `src/utils/eventWindows.test.ts` with:

```ts
describe('getEventWindows', () => {
    it('keeps time-in open long after a short event has ended', () => {
        const { end, closesAt } = getEventWindows(shortEvent);
        // The old rule shut time-in at 10:02. Now it runs to the close date.
        expect(closesAt!.getTime()).toBeGreaterThan(end!.getTime());
    });

    it('defaults the close to 3 days after the end', () => {
        const { end, closesAt } = getEventWindows(shortEvent);
        expect(closesAt!.getTime() - end!.getTime()).toBe(3 * 24 * HOUR);
    });

    it('applies no 3h cap to a long event', () => {
        const { start, closesAt } = getEventWindows(longEvent);
        expect(closesAt!.getTime() - start!.getTime()).toBeGreaterThan(3 * HOUR);
    });

    it('honours an explicit attendance_closes_at', () => {
        const { closesAt } = getEventWindows({
            ...shortEvent,
            attendance_closes_at: '2026-08-01T02:00:00.000Z'
        });
        expect(closesAt!.toISOString()).toBe('2026-08-01T02:00:00.000Z');
    });

    it('falls back when attendance_closes_at is unparseable', () => {
        const { end, closesAt } = getEventWindows({ ...shortEvent, attendance_closes_at: 'not-a-date' });
        expect(closesAt!.getTime() - end!.getTime()).toBe(3 * 24 * HOUR);
    });

    it('no longer exposes separate check-in, timeout or visibility windows', () => {
        const windows = getEventWindows(longEvent);
        expect(windows).not.toHaveProperty('checkInClose');
        expect(windows).not.toHaveProperty('timeoutClose');
        expect(windows).not.toHaveProperty('visibleUntil');
    });
});
```

Then, in the existing `describe('isEventConcluded', ...)` block, add one case at the end (keep all four existing cases as they are — they still describe the default fallback correctly):

```ts
    it('concludes at an explicit attendance_closes_at instead of the default', () => {
        at('2026-07-23T12:00:00'); // hours after the 10:02 end, days before the default close
        expect(isEventConcluded({
            ...shortEvent,
            attendance_closes_at: new Date('2026-07-23T11:00:00').toISOString()
        })).toBe(true);
    });
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npm test -- src/utils/eventWindows.test.ts
```

Expected: FAIL. `closesAt` is `undefined`, so `closesAt!.getTime()` throws `TypeError: Cannot read properties of undefined`.

- [ ] **Step 3: Rewrite the helper**

In `src/utils/eventWindows.ts`, replace everything from the `const VISIBILITY_MS` line through the end of `isEventConcluded` with:

```ts
// How long an event stays actionable past its end when staff has not set a
// date of its own. Matches `interval '3 days'` in the migrations. Exported so
// the staff form suggests the same default rather than restating the number.
export const DEFAULT_CLOSE_MS = 3 * 24 * 60 * 60 * 1000;

export const parseEventDate = (value?: string): Date | null => {
    if (!value) return null;
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const parseEventTime = (value?: string) => {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] || 0);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;
    return { hour, minute, second };
};

const combine = (dateValue?: string, timeValue?: string): Date | null => {
    const date = parseEventDate(dateValue);
    const time = parseEventTime(timeValue);
    if (!date || !time) return null;
    const combined = new Date(date);
    combined.setHours(time.hour, time.minute, time.second, 0);
    return combined;
};

export interface EventWindows {
    start: Date | null;
    end: Date | null;
    /**
     * The one deadline. Time-in, time-out, rating and evaluation all close here,
     * and the card archives at the same moment. Staff sets it per event through
     * events.attendance_closes_at; NULL lands it at end + 3 days.
     */
    closesAt: Date | null;
}

// Time-in opens at the start and time-out opens at the end, exactly as before.
// Neither has a closing window of its own any more: students who had no internet
// during the event can still record attendance right up to closesAt.

export function getEventWindows(event: any): EventWindows {
    const start = combine(event?.event_date, event?.event_time);
    if (!start) return { start: null, end: null, closesAt: null };

    const end = combine(event?.event_date, event?.end_time)
        || new Date(start.getTime() + THREE_HOURS_MS);

    const explicit = event?.attendance_closes_at ? new Date(event.attendance_closes_at) : null;
    const closesAt = explicit && !Number.isNaN(explicit.getTime())
        ? explicit
        : new Date(end.getTime() + DEFAULT_CLOSE_MS);

    return { start, end, closesAt };
}

// Concluded = explicitly archived, or past its closing date. Students stop
// seeing it and staff show it as "Archived" once this is true.
export function isEventConcluded(event: any): boolean {
    if (event?.is_archived) return true;
    const { closesAt } = getEventWindows(event);
    if (closesAt) return Date.now() > closesAt.getTime();
    // No parseable schedule (e.g. an announcement): fall back to a plain past-date check.
    return Boolean(event?.event_date) && event.event_date < new Date().toISOString().slice(0, 10);
}
```

Keep the file's existing top comment and the `const THREE_HOURS_MS = 3 * 60 * 60 * 1000;` line — `THREE_HOURS_MS` is still the fallback event *duration* when `end_time` is blank.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test -- src/utils/eventWindows.test.ts
```

Expected: PASS, 10 tests.

- [ ] **Step 5: Confirm the two known consumers now fail to typecheck**

```bash
npm run typecheck
```

Expected: FAIL, with errors in `StudentEventsView.tsx` and `PublicEventsView.tsx` about `checkInClose` not existing on `EventWindows`. This is the expected state — Task 3 fixes them. Do not fix them here.

- [ ] **Step 6: Commit**

```bash
git add src/utils/eventWindows.ts src/utils/eventWindows.test.ts
git commit -m "refactor(events): collapse attendance windows into one closesAt date"
```

---

### Task 2: Migration — the column and the RPC rules

**Files:**
- Create: `supabase/migrations/20260803120000_event_attendance_close_date.sql`
- Modify: `src/lib/eventWindowMigrationLockstep.test.ts`
- Modify: `src/types/database.ts` (regenerated)

**Interfaces:**
- Consumes: `getEventWindows()` from Task 1 — the lockstep test derives its expected fallback from it.
- Produces: `events.attendance_closes_at timestamptz NULL`; `public_event_window` returning the close date in both `checkin_close` and `timeout_close`; `public_get_active_events` returning a new final `attendance_closes_at` column.

- [ ] **Step 1: Rewrite the lockstep test**

The cap this file guards no longer exists. Replace the whole file body from `// A 4.5h event:` (line 43) to the end of `src/lib/eventWindowMigrationLockstep.test.ts` with:

```ts
// A 4.5h event with no explicit close: the derived number below is the default
// fallback span, in days, that both the browser and the RPCs must agree on.
const longEvent = { type: 'event', event_date: '2026-07-23', event_time: '08:00', end_time: '12:30' };
const { end, closesAt } = getEventWindows(longEvent);
const fallbackDays = (closesAt!.getTime() - end!.getTime()) / (24 * HOUR_MS);

describe('event window lockstep between eventWindows.ts and the migrations', () => {
    it('derives a whole number of fallback days to compare against', () => {
        expect(Number.isInteger(fallbackDays)).toBe(true);
        expect(fallbackDays).toBeGreaterThan(0);
    });

    it('gives the student attendance RPC the same fallback close as the browser', () => {
        const definition = latestDefinitionOf('record_student_event_attendance');
        expect(definition, 'no migration defines record_student_event_attendance').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`coalesce\\(\\s*v_event\\.attendance_closes_at,\\s*v_event_end_at \\+ interval '${fallbackDays} days'\\s*\\)`, 'i')
        );
    });

    it('gives the public portal window helper the same fallback close', () => {
        const definition = latestDefinitionOf('public_event_window');
        expect(definition, 'no migration defines public_event_window').not.toBeNull();
        expect(definition!.body).toMatch(
            new RegExp(`coalesce\\(\\s*p_event\\.attendance_closes_at,\\s*v_end \\+ interval '${fallbackDays} days'\\s*\\)`, 'i')
        );
    });

    it('leaves no 3h check-in cap behind in either RPC', () => {
        const windows = getEventWindows(longEvent);
        expect(windows).not.toHaveProperty('checkInClose');

        for (const name of ['record_student_event_attendance', 'public_event_window']) {
            const definition = latestDefinitionOf(name);
            expect(definition!.body, `${name} still caps check-in`).not.toMatch(/least\(/i);
            expect(definition!.body, `${name} still uses a 3 hour cap`).not.toMatch(/interval '3 hours'\s*\)/i);
        }
    });

    it('closes time-out and evaluation at the same date, not just on is_archived', () => {
        const studentRpc = latestDefinitionOf('record_student_event_attendance');
        expect(studentRpc!.body).toMatch(/check-out is not open yet/i);
        expect(studentRpc!.body).toMatch(/v_close_at/i);

        for (const name of ['public_event_time_out', 'public_event_evaluate', 'public_event_rate']) {
            const definition = latestDefinitionOf(name);
            expect(definition, `no migration defines ${name}`).not.toBeNull();
            expect(definition!.body, `${name} has no closing date`).toMatch(/attendance for this event is closed/i);
        }
    });

    it('stops enforcing photo and geolocation once the event has ended', () => {
        const studentRpc = latestDefinitionOf('record_student_event_attendance');
        expect(studentRpc!.body).toMatch(/IF now\(\) <= v_event_end_at THEN/i);
    });

    it('keeps evaluation open on event end alone, with no attendance requirement', () => {
        const formGate = latestDefinitionOf('student_may_evaluate_form');
        expect(formGate, 'no migration defines student_may_evaluate_form').not.toBeNull();
        expect(formGate!.body).not.toMatch(/event_attendance/i);

        const publicEvaluate = latestDefinitionOf('public_event_evaluate');
        expect(publicEvaluate!.body).not.toMatch(/event_attendance/i);
    });
});
```

Note: `latestDefinitionOf` matches on `create [or replace] function ... $$;`. `public_event_time_out`, `public_event_evaluate` and `public_event_rate` are written with `drop function` + `create function` (not `or replace`) — the existing regex already handles both, so keep writing them that way.

Also update the header comment block at the top of the file, replacing the paragraph about the 2h/3h split with:

```ts
/**
 * Stops the committed migrations from drifting away from src/utils/eventWindows.ts.
 *
 * Nothing here is hardcoded. The expected values are DERIVED from
 * getEventWindows(), which is the single source of truth: change that file and
 * these assertions change with it, forcing the migration to be updated too.
 *
 * The 3h check-in cap these tests used to guard is gone. What they guard now is
 * the single closing date: the same fallback span on both sides, no cap
 * sneaking back in, and every student-facing action shutting at that date
 * rather than relying on the card scrolling out of view.
 */
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- src/lib/eventWindowMigrationLockstep.test.ts
```

Expected: FAIL on the `coalesce(...attendance_closes_at...)` assertions — no migration defines the column yet.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260803120000_event_attendance_close_date.sql`:

```sql
-- One closing date for everything a student can do on an event card.
--
-- Before: time-in closed at least(end, start + 3h); time-out, rating and
-- evaluation had no closing window at all and leaned on the card scrolling out
-- of view at end + 3 days. Students with no internet during the event simply
-- lost their attendance.
--
-- After: events.attendance_closes_at is the single deadline. Time-in still opens
-- at the start and time-out still opens at the end, but both -- plus rating and
-- evaluation -- close there, and that is also when the card archives. NULL means
-- end + 3 days, which is exactly the old visibility rule, so every existing row
-- keeps behaving as it does today and nothing needs backfilling.
--
-- Photo and geolocation are now enforced only while the event is still running.
-- They exist to prove the student was physically at the venue, which is not a
-- thing a late time-in can demonstrate. The columns, parameters and validation
-- all stay in place so the checks can be switched back on without rework.
--
-- Keep in lockstep with src/utils/eventWindows.ts.
-- src/lib/eventWindowMigrationLockstep.test.ts fails if they part.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS attendance_closes_at timestamptz;

COMMENT ON COLUMN public.events.attendance_closes_at IS
    'Single deadline for time-in, time-out, rating and evaluation; the card archives here too. NULL falls back to end + 3 days.';

-- ---------------------------------------------------------------------------
-- 1. Shared window helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.public_event_window(p_event public.events)
RETURNS TABLE (start_at timestamptz, end_at timestamptz, checkin_close timestamptz, timeout_close timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_start timestamptz;
    v_end timestamptz;
    v_close timestamptz;
BEGIN
    IF p_event.event_date IS NULL OR nullif(trim(p_event.event_time), '') IS NULL THEN
        RETURN;
    END IF;

    BEGIN
        v_start := (p_event.event_date + p_event.event_time::time) AT TIME ZONE 'Asia/Manila';
        v_end := CASE
            WHEN p_event.end_time IS NOT NULL
                THEN (p_event.event_date + p_event.end_time) AT TIME ZONE 'Asia/Manila'
            ELSE v_start + interval '3 hours'
        END;
    EXCEPTION
        WHEN invalid_datetime_format OR datetime_field_overflow THEN
            RETURN;
    END;

    IF v_end <= v_start THEN
        RETURN;
    END IF;

    v_close := coalesce(p_event.attendance_closes_at, v_end + interval '3 days');

    -- Both columns carry the same single deadline now. The names are kept so no
    -- dependent function has to be dropped and recreated.
    RETURN QUERY SELECT v_start, v_end, v_close, v_close;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Public portal read: expose the new column
-- ---------------------------------------------------------------------------

-- Explicit column list rather than SETOF events, so anon does not automatically
-- start receiving whatever column the next events migration adds. Changing the
-- return type means a drop and recreate, which loses the grants below.
DROP FUNCTION IF EXISTS public.public_get_active_events();

CREATE FUNCTION public.public_get_active_events()
RETURNS TABLE (
    id bigint,
    created_at timestamptz,
    title text,
    type text,
    description text,
    location text,
    event_date date,
    event_time text,
    end_time time,
    attendees bigint,
    is_archived boolean,
    participation_mode text,
    audience_type text,
    audience_departments text[],
    audience_courses text[],
    audience_year_levels text[],
    audience_sections text[],
    allow_walk_ins boolean,
    capacity integer,
    registration_deadline timestamptz,
    require_photo boolean,
    require_geolocation boolean,
    attendance_closes_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    select
        e.id, e.created_at, e.title, e.type, e.description, e.location,
        e.event_date, e.event_time, e.end_time, e.attendees, e.is_archived,
        e.participation_mode, e.audience_type, e.audience_departments,
        e.audience_courses, e.audience_year_levels, e.audience_sections,
        e.allow_walk_ins, e.capacity, e.registration_deadline,
        e.require_photo, e.require_geolocation, e.attendance_closes_at
    from public.events e
    where not coalesce(e.is_archived, false)
    order by e.created_at desc;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_events() FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_events() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Public portal writes: close at the date, not at is_archived
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_event_time_out(bigint, text, text);

CREATE FUNCTION public.public_event_time_out(p_event_id bigint, p_student_id text, p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
    v_event public.events;
    v_start timestamptz;
    v_end timestamptz;
    v_close timestamptz;
    v_attendance public.event_attendance;
BEGIN
    v_student := public.public_resolve_student(p_student_id, p_email);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid Student ID or Email.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'time_out', 10, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    SELECT * INTO v_event
    FROM public.events
    WHERE id = p_event_id AND NOT coalesce(is_archived, false)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event was not found.');
    END IF;

    SELECT w.start_at, w.end_at, w.checkin_close INTO v_start, v_end, v_close
    FROM public.public_event_window(v_event) w;

    IF v_start IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'The event attendance window is not configured.');
    END IF;

    IF now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'Time out opens when the event ends.');
    END IF;
    IF now() > v_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
    END IF;

    SELECT * INTO v_attendance
    FROM public.event_attendance
    WHERE event_id = p_event_id AND student_id = v_student.student_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'No attendance record found. Time in first.');
    END IF;

    IF v_attendance.time_out IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already timed out for this event.');
    END IF;

    UPDATE public.event_attendance SET time_out = now() WHERE id = v_attendance.id;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.public_event_time_out(bigint, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_event_time_out(bigint, text, text) TO anon, authenticated;
```

Then append the three remaining functions. For each, start from its current body and make only the change described:

**`public_event_evaluate`** — copy the whole `create function public.public_event_evaluate(...)` block from `supabase/migrations/20260727170000_public_events_portal_rules.sql:316-441` (including the `drop function if exists` line above it and the `revoke`/`grant` pair from lines 542 and 548). Then change two things:

1. Add `v_close timestamptz;` to the `DECLARE` block, next to `v_end timestamptz;`.
2. Replace this:

```sql
    SELECT w.end_at INTO v_end FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can evaluate this event after it ends.');
    END IF;
```

with:

```sql
    SELECT w.end_at, w.checkin_close INTO v_end, v_close FROM public.public_event_window(v_event) w;

    IF v_end IS NULL OR now() < v_end THEN
        RETURN jsonb_build_object('success', false, 'error', 'You can evaluate this event after it ends.');
    END IF;
    IF now() > v_close THEN
        RETURN jsonb_build_object('success', false, 'error', 'Attendance for this event is closed.');
    END IF;
```

**`public_event_rate`** — copy the `create function public.public_event_rate(...)` block from `supabase/migrations/20260727170000_public_events_portal_rules.sql:447` through the end of that function (including its `drop function if exists` line and the `revoke`/`grant` pair from lines 543 and 549), and make the identical two changes: add `v_close timestamptz;` to `DECLARE`, and add the same `IF now() > v_close` guard immediately after its existing "after it ends" check.

**`student_may_evaluate_form`** — replace it outright:

```sql
CREATE OR REPLACE FUNCTION public.student_may_evaluate_form(p_form_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT public.current_student_id() IS NOT NULL
       AND EXISTS (
           SELECT 1
           FROM public.event_evaluation_forms f
           JOIN public.events e ON e.id = f.event_id
           CROSS JOIN LATERAL public.public_event_window(e.*) w
           WHERE f.id = p_form_id
             AND f.event_id IS NOT NULL
             AND f.is_active
             AND NOT coalesce(e.is_archived, false)
             AND w.end_at IS NOT NULL
             AND now() >= w.end_at
             AND now() <= w.checkin_close
       );
$$;
```

- [ ] **Step 4: Add the student attendance RPC to the same migration**

Copy the entire `CREATE OR REPLACE FUNCTION public.record_student_event_attendance(...)` block from `supabase/migrations/20260727210000_cap_time_in_window.sql:56-279` into the migration, then make exactly four changes:

1. In `DECLARE`, rename `v_check_in_close_at timestamptz;` to `v_close_at timestamptz;`.

2. Replace:

```sql
    -- Check-in shuts at the end, or 3h in, whichever lands first.
    v_check_in_close_at := least(v_event_end_at, v_event_start_at + interval '3 hours');
```

with:

```sql
    -- One deadline for everything: time-in, time-out and the card archiving.
    v_close_at := coalesce(v_event.attendance_closes_at, v_event_end_at + interval '3 days');
```

3. Replace the check-in timing guard:

```sql
        IF now() > v_check_in_close_at THEN
            RAISE EXCEPTION 'Check-in is already closed.';
        END IF;
```

with:

```sql
        IF now() > v_close_at THEN
            RAISE EXCEPTION 'Attendance for this event is closed.';
        END IF;
```

4. Wrap the photo block, and add the check-out upper bound. Replace this run of code:

```sql
        IF coalesce(v_event.require_photo, true)
           AND nullif(trim(coalesce(p_proof_url, '')), '') IS NULL THEN
            RAISE EXCEPTION 'Attendance photo proof is required.';
        END IF;

        IF nullif(trim(coalesce(p_proof_url, '')), '') IS NOT NULL THEN
            v_proof_prefix := format('r2:students/%s/events/%s/attendance/', v_student.id, p_event_id);
            IF left(p_proof_url, length(v_proof_prefix)) <> v_proof_prefix THEN
                RAISE EXCEPTION 'Attendance photo proof does not belong to this student and event.';
            END IF;
        END IF;
    ELSE
        IF now() < v_event_end_at THEN
            RAISE EXCEPTION 'Check-out is not open yet.';
        END IF;
        -- No closing window: check-out stays available until the event archives.
    END IF;
```

with:

```sql
        -- Photo proof only means something while the event is running. A student
        -- timing in two days late cannot produce a photo of a venue they are not
        -- at, so the requirement lapses with the event.
        IF now() <= v_event_end_at THEN
            IF coalesce(v_event.require_photo, false)
               AND nullif(trim(coalesce(p_proof_url, '')), '') IS NULL THEN
                RAISE EXCEPTION 'Attendance photo proof is required.';
            END IF;
        END IF;

        -- An uploaded photo is still checked for ownership whenever one is sent,
        -- late or not: this is the guard that stops one student attaching
        -- another student's proof.
        IF nullif(trim(coalesce(p_proof_url, '')), '') IS NOT NULL THEN
            v_proof_prefix := format('r2:students/%s/events/%s/attendance/', v_student.id, p_event_id);
            IF left(p_proof_url, length(v_proof_prefix)) <> v_proof_prefix THEN
                RAISE EXCEPTION 'Attendance photo proof does not belong to this student and event.';
            END IF;
        END IF;
    ELSE
        IF now() < v_event_end_at THEN
            RAISE EXCEPTION 'Check-out is not open yet.';
        END IF;
        IF now() > v_close_at THEN
            RAISE EXCEPTION 'Attendance for this event is closed.';
        END IF;
    END IF;
```

Note the `coalesce(v_event.require_photo, true)` → `coalesce(v_event.require_photo, false)` flip: a row with a NULL `require_photo` no longer demands a photo.

5. Wrap the geolocation block for the same reason. Replace:

```sql
    IF coalesce(v_event.require_geolocation, false) THEN
        IF v_event.latitude IS NULL OR v_event.longitude IS NULL THEN
```

with:

```sql
    -- Same as the photo: a 200m radius check is meaningless once the event is
    -- over, and would lock out exactly the students this window exists for.
    IF coalesce(v_event.require_geolocation, false) AND now() <= v_event_end_at THEN
        IF v_event.latitude IS NULL OR v_event.longitude IS NULL THEN
```

Leave the `(p_latitude IS NULL) <> (p_longitude IS NULL)` pairing check and the -90/90 range check above it exactly where they are — those validate whatever coordinates are sent, whenever they are sent.

Finish the migration with the grants, matching the ones in `20260722230000_harden_student_event_attendance_writes.sql`:

```sql
REVOKE EXECUTE ON FUNCTION public.record_student_event_attendance(bigint, text, text, double precision, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_student_event_attendance(bigint, text, text, double precision, double precision) TO authenticated;
```

- [ ] **Step 5: Run the lockstep test to verify it passes**

```bash
npm test -- src/lib/eventWindowMigrationLockstep.test.ts src/lib/eventAttendanceRlsHardeningMigration.test.ts
```

Expected: the lockstep file PASSES (7 tests). `eventAttendanceRlsHardeningMigration.test.ts` still FAILS on its `checkInClose` assertion — Task 3 fixes that.

- [ ] **Step 6: Apply the migration and regenerate types**

```bash
npx supabase db push
```

Then:

```bash
npm run db:types
```

Expected: `src/types/database.ts` gains `attendance_closes_at: string | null` in the `events` Row/Insert/Update types. If `db push` is not available in this environment, apply the SQL through the Supabase dashboard SQL editor and add the field to `database.ts` by hand.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260803120000_event_attendance_close_date.sql src/lib/eventWindowMigrationLockstep.test.ts src/types/database.ts
git commit -m "feat(events): one attendance closing date across every event RPC"
```

---

### Task 3: Student and public portals read the new window

**Files:**
- Modify: `src/pages/student/features/events/components/StudentEventsView.tsx:22-27,239-254,510-527`
- Modify: `src/pages/public/features/events/components/PublicEventsView.tsx:14-20,38-74`
- Modify: `src/pages/public/features/events/publicEventsService.ts:8-31`
- Modify: `src/lib/eventAttendanceRlsHardeningMigration.test.ts:44-47`

**Interfaces:**
- Consumes: `getEventWindows(event) => { start, end, closesAt }` from Task 1; `attendance_closes_at` on the event row from Task 2.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Update the migration guard test**

In `src/lib/eventAttendanceRlsHardeningMigration.test.ts`, replace the test at lines 44-47 with:

```ts
    it('closes the browser check-in action when the server attendance window closes', () => {
        expect(studentEventsView).toMatch(/const isAttendanceClosed = [^;]*now > \(closesAt as Date\)/i);
        expect(studentEventsView).toMatch(/'Attendance closed'/i);
    });
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- src/lib/eventAttendanceRlsHardeningMigration.test.ts
```

Expected: FAIL — `StudentEventsView.tsx` still says `isCheckInClosed` / `checkInClose`.

- [ ] **Step 3: Update `StudentEventsView.tsx`**

At lines 22-27, the `getEventWindow` wrapper returns nulls for non-attendance items. Change its null branch:

```tsx
const getEventWindow = (item: any) => {
    if (!isAttendanceActivityType(item?.type)) {
        return { start: null, end: null, closesAt: null };
    }
    return getEventWindows(item);
};
```

In `EventDetailModal` (lines 239-254), replace:

```tsx
    const { start, end, checkInClose } = getEventWindow(selectedEvent);
    const now = new Date();
    const isEventEnded = Boolean(end) && now >= (end as Date);
    const isCheckInClosed = isAttendanceActivity && Boolean(checkInClose) && now > (checkInClose as Date);
    const canTimeIn = isAttendanceActivity && Boolean(start) && Boolean(checkInClose)
        && now >= (start as Date) && !isCheckInClosed && !isTimedIn;
    const canTimeOut = isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut;
    const mustRegisterForTimeIn = isRegistrationEvent(selectedEvent) && !selectedEvent.allow_walk_ins;
    const canUseTimeIn = canTimeIn && (!mustRegisterForTimeIn || hasActiveRegistration(selectedEvent, isTimedIn));
    const timeInLabel = isTimingIn
        ? 'Processing...'
        : mustRegisterForTimeIn && !hasActiveRegistration(selectedEvent, isTimedIn)
            ? 'Register before Time In'
            : isCheckInClosed
                ? 'Check-in closed'
                : (canTimeIn ? 'Time In' : `Check-in opens at ${formatTimeLabel(selectedEvent.event_time)}`);
```

with:

```tsx
    const { start, end, closesAt } = getEventWindow(selectedEvent);
    const now = new Date();
    const isEventEnded = Boolean(end) && now >= (end as Date);
    const isAttendanceClosed = isAttendanceActivity && Boolean(closesAt) && now > (closesAt as Date);
    const canTimeIn = isAttendanceActivity && Boolean(start) && Boolean(closesAt)
        && now >= (start as Date) && !isAttendanceClosed && !isTimedIn;
    const canTimeOut = isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut && !isAttendanceClosed;
    const mustRegisterForTimeIn = isRegistrationEvent(selectedEvent) && !selectedEvent.allow_walk_ins;
    const canUseTimeIn = canTimeIn && (!mustRegisterForTimeIn || hasActiveRegistration(selectedEvent, isTimedIn));
    const timeInLabel = isTimingIn
        ? 'Processing...'
        : mustRegisterForTimeIn && !hasActiveRegistration(selectedEvent, isTimedIn)
            ? 'Register before Time In'
            : isAttendanceClosed
                ? 'Attendance closed'
                : (canTimeIn ? 'Time In' : `Time In opens at ${formatTimeLabel(selectedEvent.event_time)}`);
```

In the card list (lines 510-527), replace:

```tsx
                        const { start, end, checkInClose } = getEventWindow(item);
                        const now = new Date();
                        const isEventEnded = Boolean(end) && now >= (end as Date);
                        const isCheckInClosed = isAttendanceActivity && Boolean(checkInClose) && now > (checkInClose as Date);
                        const canTimeIn = isAttendanceActivity && Boolean(start) && Boolean(checkInClose)
                            && now >= (start as Date) && !isCheckInClosed && !isTimedIn;
                        const canTimeOut = isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut;
```

with:

```tsx
                        const { start, end, closesAt } = getEventWindow(item);
                        const now = new Date();
                        const isEventEnded = Boolean(end) && now >= (end as Date);
                        const isAttendanceClosed = isAttendanceActivity && Boolean(closesAt) && now > (closesAt as Date);
                        const canTimeIn = isAttendanceActivity && Boolean(start) && Boolean(closesAt)
                            && now >= (start as Date) && !isAttendanceClosed && !isTimedIn;
                        const canTimeOut = isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut && !isAttendanceClosed;
```

and in the `timeInLabel` chain just below it, replace the two lines:

```tsx
                                    : isCheckInClosed
                                        ? 'Check-in closed'
```

with:

```tsx
                                    : isAttendanceClosed
                                        ? 'Attendance closed'
```

- [ ] **Step 4: Update `PublicEventsView.tsx`**

Replace the `getEventWindow` wrapper at lines 14-20:

```tsx
const getEventWindow = (item: any) => {
    if (!isAttendanceActivityType(item?.type)) {
        return { start: null, end: null, closesAt: null };
    }
    return getEventWindows(item);
};
```

Replace the doc comment at lines 38-48 and the `getEventState` body at lines 49-74 with:

```tsx
/**
 * Everything the portal is allowed to compute about one event for one student.
 * The same rules run again inside the RPCs -- this only decides what to render.
 *
 * These are the same rules the student portal applies:
 *   - Time in opens at the start.
 *   - Time out opens when the event ends.
 *   - Rating and the evaluation form need the event to have ended, and nothing
 *     else -- neither is gated on attendance.
 *   - All four close at the event's single closing date, which is also when the
 *     card archives out of view.
 */
const getEventState = (item: PublicEvent, status: PublicEventStatus | undefined) => {
    const isAttendanceActivity = isAttendanceActivityType(item.type);
    const { start, end, closesAt } = getEventWindow(item);
    const now = new Date();

    const isTimedIn = Boolean(status?.time_in);
    const isTimedOut = Boolean(status?.time_out);
    const hasWindow = Boolean(start) && Boolean(closesAt);
    const isEventEnded = Boolean(end) && now >= (end as Date);
    const isTimeInClosed = isAttendanceActivity && Boolean(closesAt) && now > (closesAt as Date);

    return {
        isAttendanceActivity,
        start,
        end,
        isTimedIn,
        isTimedOut,
        isEventEnded,
        isTimeInClosed,
        canTimeIn: isAttendanceActivity && hasWindow && now >= (start as Date) && !isTimeInClosed && !isTimedIn,
        canTimeOut: isAttendanceActivity && isEventEnded && isTimedIn && !isTimedOut && !isTimeInClosed,
        canRate: isAttendanceActivity && isEventEnded && !isTimeInClosed && !status?.rated,
        canEvaluate: isAttendanceActivity && isEventEnded && !isTimeInClosed
            && Boolean(status?.has_evaluation_form) && !status?.evaluated
    };
};
```

`isTimeInClosed` keeps its name — it is read further down the file for button labels and renaming it is churn this task does not need.

- [ ] **Step 5: Add the column to the public event type**

In `src/pages/public/features/events/publicEventsService.ts`, add one line to the `PublicEvent` interface after `require_geolocation: boolean | null;` (line 30):

```ts
    attendance_closes_at: string | null;
```

- [ ] **Step 6: Run typecheck and the full test suite**

```bash
npm run typecheck && npm test
```

Expected: typecheck clean, all tests PASS. If `useStudentEventsData.test.tsx` or `usePublicEvents.ts` tests fail, they are asserting on the old visibility behaviour — read the failure and update the fixture, not the source.

- [ ] **Step 7: Commit**

```bash
git add src/pages/student/features/events/components/StudentEventsView.tsx src/pages/public/features/events/components/PublicEventsView.tsx src/pages/public/features/events/publicEventsService.ts src/lib/eventAttendanceRlsHardeningMigration.test.ts
git commit -m "feat(events): both portals gate every action on the closing date"
```

---

### Task 4: "Attendance closes" field and the Advanced section on the event form

**Files:**
- Modify: `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx:252-330` (payload, `createEmptyEvent`, `handleEditEvent`)
- Modify: `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx:104-240` (form body)
- Test: `src/pages/carestaff/features/events/components/CareStaffEventsPage.test.tsx`

**Interfaces:**
- Consumes: `attendance_closes_at` column from Task 2.
- Produces: `newEvent.attendance_closes_at` as a `datetime-local` string (`'YYYY-MM-DDTHH:mm'`) in the form state; written to the DB as an ISO string or NULL.

- [ ] **Step 1: Write the failing test**

This file mocks the hook wholesale (`vi.mock('../hooks/useCareStaffEvents', ...)`) and drives the page off a `baseHookState` object, so the form is rendered by overriding that state — there is no helper that opens the modal for real. Add `createEmptyEvent` to the existing import from `../hooks/useCareStaffEvents` at the top of the file, then add:

```tsx
it('offers an attendance closing date and tucks the proof toggles under Advanced', () => {
    vi.mocked(useCareStaffEvents).mockReturnValue({
        ...baseHookState,
        showEventModal: true,
        editingEventId: null,
        newEvent: { ...createEmptyEvent(), type: 'Event' },
        setNewEvent: vi.fn(),
        setShowEventModal: vi.fn(),
        setEditingEventId: vi.fn(),
        createEvent: vi.fn(),
        departmentOptions: [],
        courseOptions: [],
        getCurrentLocation: vi.fn(),
        renderAudienceCheckboxGroup: () => null
    } as any);

    render(<CareStaffEventsPage functions={{ showToast: vi.fn() }} />);

    expect(screen.getByLabelText(/attendance closes/i)).toBeInTheDocument();

    // <details> keeps its children mounted while closed, so the toggles are
    // findable — what this asserts is that they start collapsed, not absent.
    const advanced = screen.getByText('Advanced').closest('details') as HTMLDetailsElement;
    expect(advanced).not.toBeNull();
    expect(advanced.open).toBe(false);
    expect(screen.getByLabelText(/require photo on time in/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/require geolocation/i)).toBeInTheDocument();
});
```

If the page throws on a `baseHookState` key this test does not supply, add that key to the override object rather than changing the page.

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- src/pages/carestaff/features/events/components/CareStaffEventsPage.test.tsx
```

Expected: FAIL — no element is labelled "Attendance closes".

- [ ] **Step 3: Add the field to the form state**

In `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx`:

Add `attendance_closes_at: ''` to the object returned by `createEmptyEvent()`, and add `require_photo: false` if it currently defaults to `true` there.

Add this helper near the other module-level helpers in the same file:

```tsx
// The form takes a `datetime-local` value ('YYYY-MM-DDTHH:mm'). Blank means
// "use the default", which the RPCs read as end + 3 days.
const toCloseTimestamp = (value: string) => {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null;
};

// Suggests the default so staff sees the real date rather than an empty box.
// DEFAULT_CLOSE_MS comes from eventWindows.ts on purpose: that file is the
// single source of truth for this span, and restating 3 days here is exactly
// the drift the lockstep test exists to prevent.
export const suggestCloseDate = (eventDate: string, endTime: string) => {
    if (!eventDate) return '';
    const end = new Date(`${eventDate}T${endTime || '23:59'}`);
    if (Number.isNaN(end.getTime())) return '';
    const close = new Date(end.getTime() + DEFAULT_CLOSE_MS);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${close.getFullYear()}-${pad(close.getMonth() + 1)}-${pad(close.getDate())}T${pad(close.getHours())}:${pad(close.getMinutes())}`;
};
```

Add `DEFAULT_CLOSE_MS` to the existing import from `../../../../../utils/eventWindows` in this file, or add the import if there is none.

In the `payload` object inside `createEvent` (line 263), add after `require_geolocation`:

```tsx
                attendance_closes_at: isAttendanceActivity ? toCloseTimestamp(newEvent.attendance_closes_at) : null,
```

In `handleEditEvent` (line 310), add to the `setNewEvent({...})` object:

```tsx
            attendance_closes_at: item.attendance_closes_at
                ? new Date(item.attendance_closes_at).toISOString().slice(0, 16)
                : '',
```

- [ ] **Step 4: Add the field and the Advanced section to the form**

In `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx`, inside the `isAttendanceActivityType(newEvent.type)` block, put the closing-date input immediately after the End Time / Location grid at line 106-109:

```tsx
                            <div>
                                <label htmlFor="event-attendance-closes" className="block text-xs font-bold text-gray-500 mb-1">Attendance closes</label>
                                <input
                                    id="event-attendance-closes"
                                    type="datetime-local"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={newEvent.attendance_closes_at}
                                    onChange={e => setNewEvent({ ...newEvent, attendance_closes_at: e.target.value })}
                                    placeholder={suggestCloseDate(newEvent.event_date, newEvent.end_time)}
                                />
                                <p className="mt-1 text-[11px] text-gray-400">
                                    Time in, time out, rating and the evaluation form all stay open until this date, then the card archives.
                                    Leave blank for 3 days after the event ends{suggestCloseDate(newEvent.event_date, newEvent.end_time) ? ` (${suggestCloseDate(newEvent.event_date, newEvent.end_time).replace('T', ' ')})` : ''}.
                                </p>
                            </div>
```

Import `suggestCloseDate` alongside the other imports from `../hooks/useCareStaffEvents` on line 35.

Then move the two proof checkboxes out of the grid at lines 149-166. Delete the "Require photo on time in" `<label>` block (lines 158-166) and, after the geolocation panel's closing tag at line 238, wrap both in a native disclosure:

```tsx
                            <details className="rounded-xl border border-slate-200 bg-slate-50">
                                <summary className="cursor-pointer select-none px-4 py-3 text-xs font-bold text-gray-500">Advanced</summary>
                                <div className="space-y-3 border-t border-slate-200 p-4">
                                    <p className="text-[11px] text-gray-400">
                                        Proof-of-presence checks. Both apply only while the event is running &mdash; a student timing in after it ends is never asked for either.
                                    </p>
                                    <label htmlFor="event-require-photo" className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-bold text-gray-600">
                                        <input
                                            id="event-require-photo"
                                            type="checkbox"
                                            checked={Boolean(newEvent.require_photo)}
                                            onChange={e => setNewEvent({ ...newEvent, require_photo: e.target.checked })}
                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        Require photo on time in
                                    </label>
                                    {/* the existing blue geolocation panel moves in here verbatim */}
                                </div>
                            </details>
```

Move the whole existing `<div className="bg-blue-50 p-4 rounded-xl border border-blue-100">…</div>` geolocation block (lines 218-238) inside that `<div className="space-y-3 …">`, unchanged except for adding `id="event-require-geolocation"` to its checkbox and turning its wrapping `<label>` into `<label htmlFor="event-require-geolocation" …>` so the test can find it by label.

Note `checked={Boolean(newEvent.require_photo)}` replaces the old `newEvent.require_photo !== false` — the default is now off.

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm test -- src/pages/carestaff/features/events/components/CareStaffEventsPage.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx src/pages/carestaff/features/events/components/CareStaffEventsPage.test.tsx src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx
git commit -m "feat(events): staff sets the attendance closing date at creation"
```

---

### Task 5: Extend attendance on a posted event card

**Files:**
- Modify: `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx` (add `handleExtendAttendance`, export it)
- Modify: `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx:874-878,916-930,1120-1140` (buttons + wiring)
- Test: `src/pages/carestaff/features/events/hooks/useCareStaffEvents.test.tsx`

**Interfaces:**
- Consumes: `attendance_closes_at` column from Task 2; `suggestCloseDate` from Task 4.
- Produces: `handleExtendAttendance(event: SystemEvent, closesAt: string) => Promise<void>` — writes `{ attendance_closes_at, is_archived: false }` and refetches.

- [ ] **Step 1: Write the failing test**

The file already mocks `supabase` as `{ from: vi.fn() }` and builds a fresh query object per test. Follow that shape — add a new `describe` block at the end of `src/pages/carestaff/features/events/hooks/useCareStaffEvents.test.tsx`:

```tsx
describe('useCareStaffEvents extend attendance', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    it('pushes the close date forward and un-archives the event', async () => {
        const eq = vi.fn().mockResolvedValue({ error: null });
        const update = vi.fn().mockReturnValue({ eq });
        vi.mocked(supabase.from).mockReturnValue({ update } as any);

        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        await act(async () => {
            await result.current.handleExtendAttendance({ id: 42 } as any, '2026-08-10T17:00');
        });

        expect(update).toHaveBeenCalledWith({
            attendance_closes_at: new Date('2026-08-10T17:00').toISOString(),
            is_archived: false
        });
        expect(eq).toHaveBeenCalledWith('id', 42);
    });

    it('refuses a blank date without touching the database', async () => {
        const showToast = vi.fn();
        const { result } = renderHook(() => useCareStaffEvents({ functions: { showToast } }));

        await act(async () => {
            await result.current.handleExtendAttendance({ id: 42 } as any, '');
        });

        expect(supabase.from).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('Pick a valid closing date.', 'error');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- src/pages/carestaff/features/events/hooks/useCareStaffEvents.test.tsx
```

Expected: FAIL — `result.current.handleExtendAttendance is not a function`.

- [ ] **Step 3: Add the handler**

In `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx`, add next to `handleEditEvent`:

```tsx
    // Pushes an event's single closing date forward. Un-archiving is the point,
    // not a side effect: the events staff most needs to reopen are the ones that
    // already scrolled out of the students' view.
    const handleExtendAttendance = async (item: SystemEvent, closesAt: string) => {
        const parsed = closesAt ? new Date(closesAt) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
            if (showToast) showToast('Pick a valid closing date.', 'error');
            return;
        }
        try {
            const { error } = await supabase
                .from('events')
                .update({ attendance_closes_at: parsed.toISOString(), is_archived: false })
                .eq('id', item.id);
            if (error) throw error;
            if (showToast) showToast('Attendance reopened.');
            await fetchEvents();
        } catch (err: any) {
            if (showToast) showToast(err.message, 'error');
        }
    };
```

Add `handleExtendAttendance` to the object the hook returns, next to `handleEditEvent` (around line 1002).

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- src/pages/carestaff/features/events/hooks/useCareStaffEvents.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Wire the button into both card lists**

In `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx`, add local state near the other modal state in the page component (around line 1019):

```tsx
    const [extendTarget, setExtendTarget] = useState<any>(null);
    const [extendDate, setExtendDate] = useState('');
```

Add `handleExtendAttendance` to the destructured hook result (line 1002 area) and to the props threaded into the card list component (lines 817 and 1127-1140), alongside `handleEditEvent`.

In the **active** card actions (after line 874), add:

```tsx
                    {isAttendanceActivityType(item.type) && (
                        <Button variant="secondary" size="sm" onClick={() => onOpenExtend(item)} leftIcon={<Clock size={14} />}>Extend</Button>
                    )}
```

In the **archived** card actions (inside the `<div className="relative z-20 flex shrink-0 flex-wrap gap-2">` at line 916), add:

```tsx
                {isAttendanceActivityType(item.type) && (
                    <Button variant="ghost" size="sm" onClick={() => onOpenExtend(item)} leftIcon={<Clock size={14} className="text-blue-400" />}>Extend attendance</Button>
                )}
```

Pass `onOpenExtend` into the card list as a prop, defined in the page component as:

```tsx
    const onOpenExtend = (item: any) => {
        setExtendTarget(item);
        setExtendDate(suggestCloseDate(item.event_date || '', item.end_time || ''));
    };
```

Add the modal near the existing archive-confirmation modal (line 1256):

```tsx
            {extendTarget && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardContent className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">Extend attendance</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                {extendTarget.title} &mdash; time in, time out, rating and the evaluation form reopen until this date.
                                An archived event comes back into the students&rsquo; list.
                            </p>
                            <label htmlFor="extend-closes-at" className="block text-xs font-bold text-gray-500 mb-1">Attendance closes</label>
                            <input
                                id="extend-closes-at"
                                type="datetime-local"
                                className="w-full border rounded-lg p-2 text-sm"
                                value={extendDate}
                                onChange={e => setExtendDate(e.target.value)}
                            />
                            <div className="flex gap-3 mt-6">
                                <Button variant="secondary" className="flex-1" onClick={() => setExtendTarget(null)}>Cancel</Button>
                                <Button
                                    className="flex-1"
                                    onClick={async () => {
                                        await handleExtendAttendance(extendTarget, extendDate);
                                        setExtendTarget(null);
                                    }}
                                >
                                    Reopen
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
```

`Clock` is already imported on line 5. Import `suggestCloseDate` from `../hooks/useCareStaffEvents` if Task 4 has not already added it to that import list.

- [ ] **Step 6: Run the full check**

```bash
npm run check
```

Expected: lint, typecheck, tests and build all PASS.

- [ ] **Step 7: Verify in the running app**

Start the dev server and confirm end to end:
1. Create an event dated yesterday with an end time in the past. Leave "Attendance closes" blank.
2. Open the student portal as an eligible student — the card is visible and "Time In" is enabled despite the event having ended.
3. Time in, then time out. Both succeed.
4. Back in the staff portal, set that event's close date to a past datetime via **Extend**. The student card disappears and the RPC rejects a further time-in with "Attendance for this event is closed."

- [ ] **Step 8: Commit**

```bash
git add src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx src/pages/carestaff/features/events/hooks/useCareStaffEvents.test.tsx src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx
git commit -m "feat(events): staff can reopen attendance on any posted or archived event"
```

---

## Self-review notes

- **Spec coverage:** §1 schema → Task 2 Step 3. §2 helper → Task 1. §3 database → Task 2 Steps 3-4. §4 photo/geolocation → Task 2 Step 4 (SQL) + Task 4 Step 4 (UI). §5 staff controls → Tasks 4 and 5. §6 tests → Task 1 Step 1, Task 2 Step 1, Task 3 Step 1, plus new coverage in Tasks 4 and 5.
- **Naming:** `closesAt` (TS), `attendance_closes_at` (DB column and form state), `v_close_at` (student RPC), `v_close` (public RPCs), `handleExtendAttendance`, `suggestCloseDate`. Used consistently across every task.
- **Not in the spec, added here:** `public_get_active_events` must be dropped and recreated because its return signature changes — the public portal would otherwise never see the new column. Task 2 Step 3 covers it, grants included.
