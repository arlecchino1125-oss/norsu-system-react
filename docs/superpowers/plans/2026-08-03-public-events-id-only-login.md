# Public Events ID-Only Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The public events portal identifies a student by Student ID alone — no email — and that ID reveals nothing about the student and can do nothing except time in, time out, rate, and answer an evaluation.

**Architecture:** Every `public_*` RPC drops its `p_email` parameter and `public_resolve_student` matches on `student_id` alone. `public_verify_student` stops returning a profile and returns only the canonical `student_id`, so the two client-side consumers of that profile — the audience filter and the rating form's demographics strip — are removed: the filter moves into `public_get_active_events`, where the DB already holds the student row, and the strip is deleted because `public_event_rate` already writes name/sex/college server-side from `v_student` and never trusted the client's copy.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest, Supabase (Postgres, `SECURITY DEFINER` RPCs called by the `anon` role).

## Accepted security trade-off — read before starting

Email was not decoration. `20260727150000_public_events_portal.sql:182-184` states the reason in the source: *"Requires the email as well: student IDs are semi-public and attendance history should not be enumerable from an ID alone."*

Removing it means **anyone holding a student ID can time in as that student and submit an evaluation and rating in their name.** This is impersonation, and no amount of data minimisation addresses it — minimisation only limits what an attacker can *read*. The project owner has accepted this knowingly in exchange for students being able to record attendance without an email they may not remember.

What this plan does mitigate, and must not regress:

- An ID reveals **nothing** — not a name, not a department. A wrong or guessed ID and a correct one are indistinguishable except that actions succeed.
- An ID can perform **only** the four actions. No other read, no other write.
- The existing `public_throttle_take` rate limits stay exactly as they are on all four actions.

## Global Constraints

- Every `public_*` function is `SECURITY DEFINER` with `SET search_path TO 'public'`. Preserve both on every function you touch.
- Changing a function's parameter list changes its signature, so each one needs `DROP FUNCTION IF EXISTS public.<name>(<old arg types>);` then `CREATE FUNCTION`, then its `REVOKE ALL ... FROM public;` and `GRANT EXECUTE ... TO anon, authenticated;` reissued. **A dropped function loses its grants — an unreissued grant means the portal breaks for `anon`.**
- `public_resolve_student` is an internal helper and is **never** granted to `anon`. It returns a whole `public.students` row; that row must never reach the browser.
- Do not change the attendance-window rules added by `20260803120000_event_attendance_close_date.sql`. Every window guard (`now() > v_close`, `now() < v_start`, `now() < v_end`) stays exactly as written.
- Do not change any audience rule, the registration/walk-in gate, the duplicate-action guards, or the throttle budgets. Only the identity parameter changes.
- Rate-limit budgets stay verbatim: `time_in` 10/5min, `time_out` 10/5min, `evaluate` 5/5min, `rate` 5/5min.
- Timestamps are `AT TIME ZONE 'Asia/Manila'`.
- Run tests with `npm test -- <path>`. Full gate is `npm run check` (lint + typecheck + test + build).
- Docker is not available in this environment, so the migration cannot be applied locally. The committed `.sql` file is the deliverable; applying it is the human's step.

---

### Task 1: Migration — identity by ID alone, and an ID that reveals nothing

**Files:**
- Create: `supabase/migrations/20260804090000_public_events_id_only.sql`
- Test: `src/lib/publicEventsIdentityMigration.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `public_resolve_student(text)`, `public_verify_student(text)`, `public_get_student_event_status(text)`, `public_get_active_events(text)`, `public_event_time_in(bigint, text)`, `public_event_time_out(bigint, text)`, `public_event_evaluate(bigint, text, bigint, jsonb)`, `public_event_rate(bigint, text, integer[], text, text, text)`. Task 2 calls all of these.

All eight functions ship in **one** migration. They cannot be split: the moment `public_resolve_student` loses its second parameter, every function that calls it fails to resolve, so they must change together in a single file.

- [ ] **Step 1: Write the failing guard test**

Create `src/lib/publicEventsIdentityMigration.test.ts`. It follows the same "newest definition wins" scan as `src/lib/eventWindowMigrationLockstep.test.ts` — read that file first for the pattern.

```ts
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The public events portal identifies a student by ID alone. That makes the ID
 * the only credential, so two properties have to hold and keep holding:
 *
 *   1. No public RPC still asks for an email.
 *   2. An ID reveals nothing. public_verify_student returns the student_id and
 *      nothing else -- no name, no department, no course, no year level.
 *
 * Both are asserted against the committed migrations, so a later migration that
 * quietly reintroduces a profile field fails here.
 */

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationFiles = readdirSync(migrationsDirectory).filter((file) => file.endsWith('.sql')).sort();

const latestDefinitionOf = (functionName: string) => {
    const pattern = new RegExp(
        `create\\s+(?:or\\s+replace\\s+)?function\\s+public\\.${functionName}\\b[\\s\\S]*?\\n\\$\\$;`,
        'gi'
    );
    for (const file of [...migrationFiles].reverse()) {
        const sql = readFileSync(resolve(migrationsDirectory, file), 'utf8');
        const matches = sql.match(pattern);
        if (matches && matches.length > 0) return { file, body: matches[matches.length - 1] };
    }
    return null;
};

const PUBLIC_RPCS = [
    'public_resolve_student',
    'public_verify_student',
    'public_get_student_event_status',
    'public_get_active_events',
    'public_event_time_in',
    'public_event_time_out',
    'public_event_evaluate',
    'public_event_rate'
];

// Fields that must never leave the database for a caller holding only an ID.
const PROFILE_FIELDS = ['first_name', 'last_name', 'middle_name', 'suffix', 'sex', 'department', 'course', 'year_level', 'section', 'email'];

describe('public events portal identifies by student ID alone', () => {
    it.each(PUBLIC_RPCS)('%s no longer takes an email', (name) => {
        const definition = latestDefinitionOf(name);
        expect(definition, `no migration defines ${name}`).not.toBeNull();
        expect(definition!.body).not.toMatch(/p_email/i);
    });

    it('public_verify_student returns the student id and nothing else', () => {
        const definition = latestDefinitionOf('public_verify_student');
        for (const field of PROFILE_FIELDS) {
            expect(definition!.body, `public_verify_student still returns ${field}`)
                .not.toMatch(new RegExp(`'${field}'`, 'i'));
        }
        expect(definition!.body).toMatch(/'student_id',\s*v_student\.student_id/i);
    });

    it('keeps the internal resolver ungranted to anon', () => {
        const sql = migrationFiles
            .map((file) => readFileSync(resolve(migrationsDirectory, file), 'utf8'))
            .join('\n');
        expect(sql).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.public_resolve_student[^;]*to[^;]*anon/i);
    });

    it('regrants every public RPC it drops', () => {
        const sql = readFileSync(resolve(migrationsDirectory, '20260804090000_public_events_id_only.sql'), 'utf8');
        for (const name of PUBLIC_RPCS.filter((n) => n !== 'public_resolve_student')) {
            expect(sql, `${name} was dropped without a grant`)
                .toMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}\\b[^;]*to\\s+anon,\\s*authenticated`, 'i'));
        }
    });

    it('keeps the throttle budgets untouched', () => {
        const budgets: Array<[string, string, number]> = [
            ['public_event_time_in', 'time_in', 10],
            ['public_event_time_out', 'time_out', 10],
            ['public_event_evaluate', 'evaluate', 5],
            ['public_event_rate', 'rate', 5]
        ];
        for (const [fn, action, budget] of budgets) {
            expect(latestDefinitionOf(fn)!.body).toMatch(
                new RegExp(`public_throttle_take\\([^)]*'${action}',\\s*${budget},\\s*interval '5 minutes'\\)`, 'i')
            );
        }
    });

    it('keeps the attendance closing-date guard on every write path', () => {
        for (const name of ['public_event_time_out', 'public_event_evaluate', 'public_event_rate']) {
            expect(latestDefinitionOf(name)!.body, `${name} lost its closing-date guard`)
                .toMatch(/attendance for this event is closed/i);
        }
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- src/lib/publicEventsIdentityMigration.test.ts
```

Expected: FAIL — the `p_email` assertions fail for all eight, and the file `20260804090000_public_events_id_only.sql` does not exist.

- [ ] **Step 3: Write the migration header and the identity core**

Create `supabase/migrations/20260804090000_public_events_id_only.sql`:

```sql
-- The public events portal identifies a student by Student ID alone.
--
-- 20260727150000 required an email as a second factor, on the reasoning that
-- student IDs are semi-public and attendance history should not be enumerable
-- from an ID alone. That is dropped here deliberately: students were unable to
-- record attendance because they did not have their registered email to hand.
--
-- The accepted cost is impersonation -- anyone holding an ID can act as that
-- student. What compensates, and must not be weakened later:
--
--   * An ID reveals nothing. public_verify_student returns the student_id and
--     nothing else, so a guessed ID yields no name, department or course.
--   * An ID can only time in, time out, rate, and answer an evaluation.
--   * The per-action rate limits are unchanged.
--
-- src/lib/publicEventsIdentityMigration.test.ts fails if any of those slip.

-- ---------------------------------------------------------------------------
-- 1. Internal resolver. Still never granted to anon: it returns a whole
--    students row, which is exactly what must not reach the browser.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_resolve_student(text, text);

CREATE FUNCTION public.public_resolve_student(p_student_id text)
RETURNS public.students
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    select *
    from public.students
    where student_id = trim(coalesce(p_student_id, ''))
      and not coalesce(is_archived, false)
    limit 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Verification returns the canonical id and nothing else.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_verify_student(text, text);

CREATE FUNCTION public.public_verify_student(p_student_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
BEGIN
    v_student := public.public_resolve_student(p_student_id);

    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    -- Deliberately only the id. Returning a name here would turn this function
    -- into a roster lookup for anyone who can guess an ID.
    RETURN jsonb_build_object(
        'success', true,
        'student', jsonb_build_object('student_id', v_student.student_id)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.public_verify_student(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_verify_student(text) TO anon, authenticated;
```

- [ ] **Step 4: Move the audience filter server-side**

Append to the same migration. `public_get_active_events` gains an optional student id; when supplied, the audience narrowing that the browser used to do happens here instead, so the student's department and course never leave the database.

```sql
-- ---------------------------------------------------------------------------
-- 3. Event list. With an id supplied, the audience rules are applied here --
--    the browser no longer needs the student's department or course to do it.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.public_get_active_events();

CREATE FUNCTION public.public_get_active_events(p_student_id text DEFAULT NULL)
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_student public.students;
BEGIN
    IF nullif(trim(coalesce(p_student_id, '')), '') IS NOT NULL THEN
        v_student := public.public_resolve_student(p_student_id);
    END IF;

    RETURN QUERY
    SELECT
        e.id, e.created_at, e.title, e.type, e.description, e.location,
        e.event_date, e.event_time, e.end_time, e.attendees, e.is_archived,
        e.participation_mode, e.audience_type, e.audience_departments,
        e.audience_courses, e.audience_year_levels, e.audience_sections,
        e.allow_walk_ins, e.capacity, e.registration_deadline,
        e.require_photo, e.require_geolocation, e.attendance_closes_at
    FROM public.events e
    WHERE NOT coalesce(e.is_archived, false)
      -- No id: a guest sees every live event, exactly as before.
      AND (
        v_student.student_id IS NULL
        OR (
            (e.audience_type <> 'graduating_students'
                OR lower(coalesce(v_student.status, '')) = 'graduating'
                OR lower(coalesce(v_student.year_level, '')) IN ('4th year', '5th year'))
            AND (cardinality(coalesce(e.audience_departments, '{}'::text[])) = 0
                OR coalesce(v_student.department, '') = ANY(e.audience_departments))
            AND (cardinality(coalesce(e.audience_courses, '{}'::text[])) = 0
                OR coalesce(v_student.course, '') = ANY(e.audience_courses))
            AND (cardinality(coalesce(e.audience_year_levels, '{}'::text[])) = 0
                OR coalesce(v_student.year_level, '') = ANY(e.audience_year_levels))
            AND (cardinality(coalesce(e.audience_sections, '{}'::text[])) = 0
                OR coalesce(v_student.section, '') = ANY(e.audience_sections))
        )
      )
    ORDER BY e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.public_get_active_events(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_get_active_events(text) TO anon, authenticated;
```

These five conditions mirror the audience checks already inside `public_event_time_in`. Read that function in `20260727190000_align_event_action_windows.sql:348-383` and confirm yours match — a mismatch means the portal shows an event the RPC will refuse, or hides one it would accept.

- [ ] **Step 5: Drop the email parameter from the status read and the four writes**

Append the remaining five functions to the same migration. For each, **copy the current body forward and change only the identity plumbing** — Postgres cannot patch a function body, so restating it in full is this repo's established pattern.

Copy from these exact sources:

| Function | Copy from | Old signature to drop |
| --- | --- | --- |
| `public_get_student_event_status` | `20260727150000_public_events_portal.sql:185` to the end of that function | `(text, text)` |
| `public_event_time_in` | `20260727190000_align_event_action_windows.sql:298` to the end | `(bigint, text, text)` |
| `public_event_time_out` | `20260803120000_event_attendance_close_date.sql`, its `public_event_time_out` block | `(bigint, text, text)` |
| `public_event_evaluate` | `20260803120000_event_attendance_close_date.sql`, its `public_event_evaluate` block | `(bigint, text, text, bigint, jsonb)` |
| `public_event_rate` | `20260803120000_event_attendance_close_date.sql`, its `public_event_rate` block | `(bigint, text, text, integer[], text, text, text)` |

Always copy from `20260803120000` where it defines the function — that migration is newer than `20260727170000` and carries the attendance closing-date guards. Copying the older version silently reverts them.

In each copied body make exactly these changes and nothing else:

1. Delete `p_email text` from the parameter list.
2. Change `public.public_resolve_student(p_student_id, p_email)` to `public.public_resolve_student(p_student_id)`.
3. Change the not-found message from `'Invalid Student ID or Email.'` to `'Student ID was not found.'`.
4. Precede each with its `DROP FUNCTION IF EXISTS` using the old signature from the table above, and follow each with:

```sql
REVOKE ALL ON FUNCTION public.<name>(<new arg types>) FROM public;
GRANT EXECUTE ON FUNCTION public.<name>(<new arg types>) TO anon, authenticated;
```

Everything else stays byte-for-byte: every audience check, the registration/walk-in gate, the throttle call and its budget, the duplicate-action guards, the window guards, the completeness count in `public_event_evaluate`, and the server-side `v_student.sex` / `format('%s - %s (%s)', ...)` college string in `public_event_rate`.

- [ ] **Step 6: Run the guard test to verify it passes**

```bash
npm test -- src/lib/publicEventsIdentityMigration.test.ts
```

Expected: PASS, 13 tests.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260804090000_public_events_id_only.sql src/lib/publicEventsIdentityMigration.test.ts
git commit -m "feat(public-events): identify students by ID alone, and reveal nothing from it"
```

---

### Task 2: Service layer and types

**Files:**
- Modify: `src/pages/public/features/events/publicEventsService.ts`
- Test: `src/pages/public/features/events/publicEventsService.test.ts` (create if absent)

**Interfaces:**
- Consumes: the eight RPCs from Task 1.
- Produces: `PublicStudent` narrowed to `{ student_id: string }`; `verifyPublicStudent(studentId)`, `getPublicEvents(studentId?)`, `getPublicEventStatus(studentId)`, `timeInPublicEvent(eventId, studentId)`, `timeOutPublicEvent(eventId, studentId)`, `evaluatePublicEvent(eventId, studentId, formId, answers)`, `ratePublicEvent(eventId, studentId, scores, openBest, openSuggestions, openComments)`. Tasks 3 and 4 call these.

- [ ] **Step 1: Write the failing test**

Create `src/pages/public/features/events/publicEventsService.test.ts`:

```tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('../../../../lib/supabase', () => ({ supabase: { rpc: (...args: any[]) => rpcMock(...args) } }));

import { verifyPublicStudent, getPublicEvents, timeInPublicEvent } from './publicEventsService';

describe('publicEventsService sends an id and never an email', () => {
    beforeEach(() => rpcMock.mockReset());

    it('verifies with the student id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true, student: { student_id: '202600001' } }, error: null });
        await verifyPublicStudent(' 202600001 ');
        expect(rpcMock).toHaveBeenCalledWith('public_verify_student', { p_student_id: '202600001' });
    });

    it('passes the id to the event list so the server narrows the audience', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents('202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: '202600001' });
    });

    it('sends no id at all for a signed-out guest', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents();
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: null });
    });

    it('times in with the id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        await timeInPublicEvent(7, '202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_event_time_in', { p_event_id: 7, p_student_id: '202600001' });
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test -- src/pages/public/features/events/publicEventsService.test.ts
```

Expected: FAIL — every call still sends `p_email`.

- [ ] **Step 3: Narrow the type and drop the email argument**

In `src/pages/public/features/events/publicEventsService.ts`, replace the `PublicStudent` interface with:

```ts
// Deliberately only the id. The portal identifies a student by ID alone, so
// returning a name or a department here would make it a roster lookup for
// anyone who can guess an ID. Everything the portal writes -- the attendee
// name on event_attendance, the sex and college on event_feedback -- is filled
// server-side from the resolved row, so the browser never needs these.
export interface PublicStudent {
    student_id: string;
}
```

Then remove the `email` parameter and the `p_email` argument from `verifyPublicStudent`, `getPublicEventStatus`, `timeInPublicEvent`, `timeOutPublicEvent`, `evaluatePublicEvent` and `ratePublicEvent`, and give `getPublicEvents` an optional id:

```ts
export const getPublicEvents = async (studentId?: string): Promise<PublicEvent[]> => {
    const { data, error } = await rpc('public_get_active_events', {
        p_student_id: studentId?.trim() || null
    });
    if (error) throw error;
    return (data || []) as PublicEvent[];
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test -- src/pages/public/features/events/publicEventsService.test.ts
```

Expected: PASS, 4 tests. `npm run typecheck` will now fail in the hook and the modals — Tasks 3 and 4 own those.

- [ ] **Step 5: Commit**

```bash
git add src/pages/public/features/events/publicEventsService.ts src/pages/public/features/events/publicEventsService.test.ts
git commit -m "feat(public-events): service layer identifies by student id alone"
```

---

### Task 3: Identity modal — one field

**Files:**
- Modify: `src/pages/public/features/events/components/PublicIdentityModal.tsx`

**Interfaces:**
- Consumes: `verifyPublicStudent(studentId)` from Task 2.
- Produces: `onSubmit: (studentId: string) => Promise<void>`. Task 4 supplies that callback.

- [ ] **Step 1: Remove the email field**

In `src/pages/public/features/events/components/PublicIdentityModal.tsx`:

- Change the prop type on line 10 to `onSubmit: (studentId: string) => Promise<void>;`
- Delete the `const [email, setEmail] = useState('');` on line 15
- Change the call on line 26 to `await onSubmit(studentId);`
- Delete the `setEmail('');` reset on line 30
- Change the heading on line 52 to `Enter your Student ID`
- Delete the entire email `<label>` + `<input>` block (lines 81-88)
- Change the submit guard on line 102 to `disabled={loading || !studentId.trim()}`

- [ ] **Step 2: Verify no email remains**

```bash
grep -in "email" src/pages/public/features/events/components/PublicIdentityModal.tsx
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/pages/public/features/events/components/PublicIdentityModal.tsx
git commit -m "feat(public-events): identity modal asks for the student id only"
```

---

### Task 4: Hook and display — stop reading a profile that no longer exists

**Files:**
- Modify: `src/pages/public/features/events/hooks/usePublicEvents.ts`
- Modify: `src/pages/public/features/events/PublicEventsPage.tsx:88,143`
- Modify: `src/pages/public/features/events/components/PublicRatingModal.tsx:70-90`

**Interfaces:**
- Consumes: the narrowed `PublicStudent` and the service functions from Task 2.
- Produces: nothing later tasks depend on. This is the last task.

- [ ] **Step 1: Delete the client-side audience filter**

In `src/pages/public/features/events/hooks/usePublicEvents.ts`, replace the `eventsList` memo (around lines 104-115) with:

```ts
    // The audience narrowing now happens inside public_get_active_events, which
    // has the student row and does not have to hand the browser a department
    // and course to do it. Only the visibility rule is left here.
    const eventsList = useMemo(
        () => (rawEvents || []).filter((event: PublicEvent) => !isEventConcluded(event)),
        [rawEvents]
    );
```

Remove the now-unused `isStudentEligibleForEvent` import if nothing else in the file uses it.

Then pass the identity into the events query so the server can filter — find the `getPublicEvents` call and give it `identity?.student.student_id`, and add that value to the query key so the list refetches when a student signs in or out.

Remove `p_email` / `email` from every service call in this file; they now take `identity.student.student_id` alone.

- [ ] **Step 2: Show the ID instead of a name**

`PublicEventsPage.tsx:88` renders `{student.first_name} {student.last_name}` and those fields no longer exist. Replace that expression with `{student.student_id}`. Leave line 143 alone — it already uses `student.student_id`.

- [ ] **Step 3: Delete the demographics strip from the rating form**

In `src/pages/public/features/events/components/PublicRatingModal.tsx`, delete the whole `<section>` block spanning roughly lines 70-90 — the four-column Name / Sex / College / Activity Date panel.

It is display-only. `public_event_rate` writes `student_name`, `sex` and the `college` string from the resolved database row (`20260727170000_public_events_portal_rules.sql:518-522`) and never reads these values from the browser, so removing them changes nothing about what is stored.

If the Activity Date is worth keeping, keep only that one `<div>` and drop the other three — it comes from `ratingForm.date_of_activity`, not from the student profile.

- [ ] **Step 4: Run the full gate**

```bash
npm run check
```

Expected: lint, typecheck, tests and build all clean. If typecheck still reports a missing property on `PublicStudent`, that is a profile field being read somewhere this plan did not list — remove the read; do not widen the type back.

- [ ] **Step 5: Confirm the ID leaks nothing**

```bash
grep -rn "first_name\|last_name\|\.sex\|year_level\|\.section" src/pages/public/features/events/
```

Expected: no output. Any hit is a profile field still expected in the browser.

- [ ] **Step 6: Commit**

```bash
git add src/pages/public/features/events/
git commit -m "feat(public-events): drop the student profile from the browser entirely"
```

---

## Out of scope

- **The student portal and the staff portals.** They authenticate through Supabase sessions and are untouched.
- **`public_get_evaluation_form(bigint)`.** It already takes no identity — only a form id — so nothing about it changes.
- **The attendance window rules.** `20260803120000` owns those; this plan only removes the email parameter around them.
- **Restoring a second factor.** If the impersonation risk proves real in practice, the natural follow-up is a short-lived code sent to the student's registered email or a staff-operated kiosk mode — a separate piece of work, not a variation of this one.

## Self-review notes

- **Spec coverage:** "remove the email check" → Tasks 1, 2, 3. "verify against the database" → `public_resolve_student(text)` in Task 1 Step 3. "shouldn't show any database tables" → Task 1 Steps 3-4 (server returns only `student_id`, audience filtering moved server-side) and Task 4 (browser stops reading a profile). "doesn't send anything else rather than time in, time out, rate, and evaluation" → the RPC list in Task 1 is exhaustive; the guard test enumerates it and fails if one grows an email back.
- **Naming:** `p_student_id` (SQL), `studentId` (TS), `PublicStudent.student_id`. Consistent across all four tasks.
- **Verification gap:** Docker is unavailable, so the migration cannot be applied or parsed locally. Task 1's guard test checks the migration's text, not its execution. Someone must run this against a real database before it is trusted.
