# Peer Facilitator Logbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Digitise the paper *PEER FACILITATOR MONITORING LOGBOOK (Peer Support)* so peers log sessions from their phone, submit the month, and staff approve it into the peer's archive.

**Architecture:** Two tables — a monthly logbook holding status/submission/review, and its entries. The first entry of a month upserts its logbook, so there is no create-logbook action. One shared month view renders in three contexts (peer draft, peer archive, staff review) via a `readOnly` flag. No edge function, no RPC: everything is RLS plus UI.

**Tech Stack:** React 19 + TypeScript, TanStack Query v5, Supabase (Postgres + RLS), Tailwind, Vitest + Testing Library, jsPDF/autotable (lazy-loaded via `src/lib/exportVendors.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-29-peer-facilitator-logbook-design.md`.
- **`referred` is a bare boolean.** No counseling request, no destination, no notification, no edge function. Do not add any.
- **No signature capture anywhere.** Signature lines print blank on the PDF.
- **The card list must never render a student name or initials**, in any status. Identity appears only inside an opened entry.
- The eight-column paper layout appears **only** in the PDF export. Every screen is a stacked vertical view.
- Roster membership = a `peer_facilitators` row with `archived_at IS NULL`. This gates who may write entries.
- Test command: `npm test`. Typecheck: `npm run typecheck`. Full gate: `npm run check`.
- Existing RLS helpers to reuse: `public.current_student_id()`, `public.is_admin()`, `public.current_staff_role()`.
- Match surrounding code style: 4-space indent, single quotes, no semicolon-free lines, comments explain *why* not *what*.

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/20260729100000_peer_facilitator_logbook.sql` | Both tables, constraints, RLS, submit-stamp trigger |
| `src/lib/peerFacilitatorLogbookMigration.test.ts` | Asserts the migration's load-bearing clauses |
| `src/utils/peerLogbook.ts` | Pure month/date/initials helpers |
| `src/utils/peerLogbook.test.ts` | Tests for the above |
| `src/utils/peerLogbookPdf.ts` | Paper-layout row builder + PDF export |
| `src/utils/peerLogbookPdf.test.ts` | Tests the pure row builder |
| `src/components/peerLogbook/PeerLogEntryModal.tsx` | One entry: stacked view / edit / create |
| `src/components/peerLogbook/PeerLogbookMonth.tsx` | Card list for a month + entry modal orchestration |
| `src/components/peerLogbook/PeerLogbookMonth.test.tsx` | Asserts no identity leaks to the card list |
| `src/pages/student/features/volunteer/components/PeerLogbook.tsx` | Peer's month picker, data, submit, archive |
| `src/pages/student/features/volunteer/components/VolunteerView.tsx` | Mount `PeerLogbook` in the facilitator branch |
| `src/pages/carestaff/features/peerfacilitators/components/CareStaffPeerSupportModal.tsx` | Staff view of one peer's logbooks + approve |
| `src/pages/carestaff/features/peerfacilitators/components/CareStaffActiveFacilitatorsTable.tsx` | Submitted chip + row opens the modal |

Shared components live in `src/components/peerLogbook/` because both portals render them; putting them under either portal would make one import across a portal boundary.

---

### Task 1: Migration

**Files:**
- Create: `supabase/migrations/20260729100000_peer_facilitator_logbook.sql`
- Test: `src/lib/peerFacilitatorLogbookMigration.test.ts`

**Interfaces:**
- Consumes: existing `public.students`, `public.peer_facilitators`, `public.current_student_id()`, `public.is_admin()`, `public.current_staff_role()`
- Produces: tables `public.peer_facilitator_logbooks` (columns `id, student_id, month, status, submitted_at, reviewed_by, reviewer_name, reviewed_at, created_at`) and `public.peer_facilitator_log_entries` (columns `id, logbook_id, logbook_month, entry_date, logged_at, activity_type, assisted_student_id, assisted_initials, concern, action_taken, remarks, referred`)

- [ ] **Step 1: Write the failing test**

Create `src/lib/peerFacilitatorLogbookMigration.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260729100000_peer_facilitator_logbook.sql'),
    'utf8'
);

describe('peer facilitator logbook migration', () => {
    it('keeps one logbook per facilitator per month', () => {
        expect(migration).toMatch(/CREATE UNIQUE INDEX peer_facilitator_logbooks_student_month\s+ON public\.peer_facilitator_logbooks \(student_id, month\)/i);
    });

    it('pins the month column to the first of the month', () => {
        expect(migration).toMatch(/CHECK \(EXTRACT\(DAY FROM month\) = 1\)/i);
    });

    // The composite FK is what makes the date range check possible without a
    // trigger: it guarantees logbook_month really is the parent's month.
    it('confines an entry date to its logbook month declaratively', () => {
        expect(migration).toMatch(/FOREIGN KEY \(logbook_id, logbook_month\)\s+REFERENCES public\.peer_facilitator_logbooks \(id, month\)/i);
        expect(migration).toMatch(/entry_date >= logbook_month AND entry_date < \(logbook_month \+ INTERVAL '1 month'\)/i);
    });

    it('lets a student move their own draft to submitted and no further', () => {
        expect(migration).toMatch(/peer_facilitator_logbooks_student_submit_own/i);
        expect(migration).toMatch(/USING \(student_id = public\.current_student_id\(\) AND status = 'draft'\)/i);
        expect(migration).toMatch(/WITH CHECK \(\s*student_id = public\.current_student_id\(\)\s+AND status = 'submitted'/i);
    });

    it('gates entry writes on the parent month still being a draft', () => {
        expect(migration).toMatch(/peer_facilitator_log_entries_student_insert_own/i);
        expect(migration).toMatch(/peer_facilitator_log_entries_student_update_own/i);
        expect(migration).toMatch(/peer_facilitator_log_entries_student_delete_own/i);
        expect(migration).toMatch(/b\.status = 'draft'/i);
    });

    it('only lets rostered facilitators start a logbook', () => {
        expect(migration).toMatch(/FROM public\.peer_facilitators f\s+WHERE f\.student_id = peer_facilitator_logbooks\.student_id\s+AND f\.archived_at IS NULL/i);
    });

    it('stamps submitted_at server-side so a student cannot backdate it', () => {
        expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.stamp_peer_facilitator_logbook_submission\(\)/i);
        expect(migration).toMatch(/NEW\.submitted_at := now\(\)/i);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/peerFacilitatorLogbookMigration.test.ts`
Expected: FAIL — `ENOENT: no such file or directory` for the migration path.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/20260729100000_peer_facilitator_logbook.sql`:

```sql
-- Peer support logbook: the digital form of the paper PEER FACILITATOR
-- MONITORING LOGBOOK (Peer Support), one sheet per facilitator per month.
--
-- Two tables because status, submission and review belong to the month, not to a
-- single interaction. The first entry of a month upserts its logbook, so there is
-- no create-logbook action to build, and none to forget.
--
-- The "Referred to Guidance (Yes/No)" column is exactly that -- a boolean. It
-- records what the paper form records. Wiring it into counseling_requests is a
-- later feature; this column is its hook.

CREATE TABLE public.peer_facilitator_logbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id character varying NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    month date NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    submitted_at timestamp with time zone,
    reviewed_by uuid,
    reviewer_name text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT peer_facilitator_logbooks_status_check CHECK (status IN ('draft', 'submitted', 'approved')),
    CONSTRAINT peer_facilitator_logbooks_month_first CHECK (EXTRACT(DAY FROM month) = 1),
    CONSTRAINT peer_facilitator_logbooks_reviewer_name_len CHECK (reviewer_name IS NULL OR char_length(reviewer_name) <= 200)
);

CREATE UNIQUE INDEX peer_facilitator_logbooks_student_month
    ON public.peer_facilitator_logbooks (student_id, month);

-- Staff list submitted months across all peers; the roster chip reads this too.
CREATE INDEX peer_facilitator_logbooks_status_idx
    ON public.peer_facilitator_logbooks (status, month DESC);

-- Target for the entries' composite FK below. A plain unique(id) is implied by
-- the PK, but the FK needs (id, month) as a unit to carry month into the child.
ALTER TABLE public.peer_facilitator_logbooks
    ADD CONSTRAINT peer_facilitator_logbooks_id_month_key UNIQUE (id, month);

CREATE TABLE public.peer_facilitator_log_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_id uuid NOT NULL,
    logbook_month date NOT NULL,
    entry_date date NOT NULL,
    logged_at timestamp with time zone NOT NULL DEFAULT now(),
    activity_type text NOT NULL,
    assisted_student_id character varying REFERENCES public.students(student_id) ON DELETE SET NULL,
    assisted_initials text,
    concern text NOT NULL,
    action_taken text NOT NULL,
    remarks text,
    referred boolean NOT NULL DEFAULT false,
    -- Carrying the parent's month down lets a plain CHECK enforce "this entry
    -- belongs to this month" -- a CHECK cannot reach another table, and the
    -- composite FK is what guarantees logbook_month is not simply made up.
    FOREIGN KEY (logbook_id, logbook_month)
        REFERENCES public.peer_facilitator_logbooks (id, month) ON DELETE CASCADE,
    CONSTRAINT peer_facilitator_log_entries_date_in_month
        CHECK (entry_date >= logbook_month AND entry_date < (logbook_month + INTERVAL '1 month')),
    CONSTRAINT peer_facilitator_log_entries_activity_len CHECK (char_length(activity_type) BETWEEN 1 AND 120),
    CONSTRAINT peer_facilitator_log_entries_initials_len CHECK (assisted_initials IS NULL OR char_length(assisted_initials) <= 20),
    CONSTRAINT peer_facilitator_log_entries_concern_len CHECK (char_length(concern) BETWEEN 1 AND 4000),
    CONSTRAINT peer_facilitator_log_entries_action_len CHECK (char_length(action_taken) BETWEEN 1 AND 4000),
    CONSTRAINT peer_facilitator_log_entries_remarks_len CHECK (remarks IS NULL OR char_length(remarks) <= 4000)
);

CREATE INDEX peer_facilitator_log_entries_logbook_idx
    ON public.peer_facilitator_log_entries (logbook_id, entry_date DESC);

-- Powers the "5 most recently logged students" default in the entry form.
CREATE INDEX peer_facilitator_log_entries_assisted_idx
    ON public.peer_facilitator_log_entries (assisted_student_id)
    WHERE assisted_student_id IS NOT NULL;

-- A student controls the request body, so submitted_at sent from the client is
-- whatever they type. Stamp it server-side on the draft -> submitted move, the
-- same pattern as stamp_peer_facilitator_attendance_times.
CREATE OR REPLACE FUNCTION public.stamp_peer_facilitator_logbook_submission() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = 'public'
    AS $$
BEGIN
    IF public.current_student_id() IS NULL THEN
        RETURN NEW;  -- staff review stamps its own values
    END IF;

    IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
        NEW.submitted_at := now();
    ELSE
        NEW.submitted_at := OLD.submitted_at;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_peer_facilitator_logbook_submission() FROM anon;

CREATE TRIGGER peer_facilitator_logbooks_stamp_submission
    BEFORE UPDATE ON public.peer_facilitator_logbooks
    FOR EACH ROW
    EXECUTE FUNCTION public.stamp_peer_facilitator_logbook_submission();

ALTER TABLE public.peer_facilitator_logbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_facilitator_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_facilitator_logbooks_student_select_own"
    ON public.peer_facilitator_logbooks
    FOR SELECT
    TO authenticated
    USING (student_id = public.current_student_id());

-- Only a live roster member starts a month, and only ever as a draft.
CREATE POLICY "peer_facilitator_logbooks_student_insert_own"
    ON public.peer_facilitator_logbooks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = public.current_student_id()
        AND status = 'draft'
        AND EXISTS (
            SELECT 1
            FROM public.peer_facilitators f
            WHERE f.student_id = peer_facilitator_logbooks.student_id
              AND f.archived_at IS NULL
        )
    );

-- USING pins the source row to draft, WITH CHECK pins the outcome to submitted:
-- a student can neither reopen an approved month nor approve their own. The
-- reviewer columns are pinned null so the same update cannot forge a review.
CREATE POLICY "peer_facilitator_logbooks_student_submit_own"
    ON public.peer_facilitator_logbooks
    FOR UPDATE
    TO authenticated
    USING (student_id = public.current_student_id() AND status = 'draft')
    WITH CHECK (
        student_id = public.current_student_id()
        AND status = 'submitted'
        AND reviewed_by IS NULL
        AND reviewer_name IS NULL
        AND reviewed_at IS NULL
    );

CREATE POLICY "peer_facilitator_logbooks_staff_select"
    ON public.peer_facilitator_logbooks
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitator_logbooks_staff_review"
    ON public.peer_facilitator_logbooks
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitator_log_entries_student_select_own"
    ON public.peer_facilitator_log_entries
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
    ));

-- The draft condition lives in the policy, so a submitted month is immutable
-- with no extra trigger and no client-side honour system.
CREATE POLICY "peer_facilitator_log_entries_student_insert_own"
    ON public.peer_facilitator_log_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_student_update_own"
    ON public.peer_facilitator_log_entries
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_student_delete_own"
    ON public.peer_facilitator_log_entries
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_staff_select"
    ON public.peer_facilitator_log_entries
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

GRANT SELECT, INSERT, UPDATE ON public.peer_facilitator_logbooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_facilitator_log_entries TO authenticated;
GRANT ALL ON public.peer_facilitator_logbooks TO service_role;
GRANT ALL ON public.peer_facilitator_log_entries TO service_role;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/peerFacilitatorLogbookMigration.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260729100000_peer_facilitator_logbook.sql src/lib/peerFacilitatorLogbookMigration.test.ts
git commit -m "feat(peer): add peer support logbook tables and policies"
```

---

### Task 2: Month and display helpers

**Files:**
- Create: `src/utils/peerLogbook.ts`
- Test: `src/utils/peerLogbook.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `monthKeyOf(date: Date): string` → `'2026-07'`
  - `monthStartOf(monthKey: string): string` → `'2026-07-01'` (the `month` column value)
  - `monthLabelOf(monthKey: string): string` → `'July 2026'`
  - `todayIso(date?: Date): string` → `'2026-07-29'`
  - `daysLeftInMonth(now: Date): number`
  - `shouldPromptSubmit(now: Date, status: string): boolean`
  - `initialsFrom(first?: string | null, last?: string | null): string`
  - `entryInitials(entry: { assisted_initials?: string | null; students?: { first_name?: string | null; last_name?: string | null } | null }): string`

- [ ] **Step 1: Write the failing test**

Create `src/utils/peerLogbook.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
    daysLeftInMonth,
    entryInitials,
    initialsFrom,
    monthKeyOf,
    monthLabelOf,
    monthStartOf,
    shouldPromptSubmit,
    todayIso
} from './peerLogbook';

describe('peerLogbook helpers', () => {
    it('derives the month key from local time, not UTC', () => {
        // 2026-07-01 07:30 local. A UTC-based key would read 2026-06 for anyone
        // east of Greenwich, filing the entry into the wrong month.
        expect(monthKeyOf(new Date(2026, 6, 1, 7, 30))).toBe('2026-07');
    });

    it('maps a month key to the first of that month', () => {
        expect(monthStartOf('2026-07')).toBe('2026-07-01');
    });

    it('labels a month for display', () => {
        expect(monthLabelOf('2026-07')).toBe('July 2026');
    });

    it('formats a local calendar date', () => {
        expect(todayIso(new Date(2026, 6, 29, 23, 30))).toBe('2026-07-29');
    });

    it('counts the days left including today', () => {
        expect(daysLeftInMonth(new Date(2026, 6, 29))).toBe(3);
        expect(daysLeftInMonth(new Date(2026, 6, 31))).toBe(1);
        expect(daysLeftInMonth(new Date(2026, 6, 1))).toBe(31);
    });

    it('prompts a draft to be submitted only near month end', () => {
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'draft')).toBe(true);
        expect(shouldPromptSubmit(new Date(2026, 6, 10), 'draft')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'submitted')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'approved')).toBe(false);
    });

    it('builds initials from a name', () => {
        expect(initialsFrom('Reynel', 'Repaso')).toBe('R.R.');
        expect(initialsFrom('Reynel', null)).toBe('R.');
        expect(initialsFrom(null, null)).toBe('');
    });

    it('prefers typed initials over a linked student', () => {
        expect(entryInitials({ assisted_initials: 'X.Y.', students: { first_name: 'Reynel', last_name: 'Repaso' } })).toBe('X.Y.');
        expect(entryInitials({ assisted_initials: null, students: { first_name: 'Reynel', last_name: 'Repaso' } })).toBe('R.R.');
        expect(entryInitials({ assisted_initials: null, students: null })).toBe('');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/peerLogbook.test.ts`
Expected: FAIL — cannot resolve `./peerLogbook`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/peerLogbook.ts`:

```ts
/** Month and display helpers for the peer support logbook (student + care staff views). */

const pad = (value: number) => String(value).padStart(2, '0');

/** 'YYYY-MM' for the local calendar month — matches sessionDate's local-time rule. */
export const monthKeyOf = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/** The `month` column value: every logbook month is stored as its first day. */
export const monthStartOf = (monthKey: string): string => `${monthKey}-01`;

export const monthLabelOf = (monthKey: string): string => {
    const [year, month] = monthKey.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

/** Local calendar day (YYYY-MM-DD) — the default for a new entry's date. */
export const todayIso = (date: Date = new Date()): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Days remaining in the month, counting today. */
export const daysLeftInMonth = (now: Date): number => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate() + 1;
};

/** The paper sheet is a monthly hand-in, and nothing else would remind a peer. */
export const shouldPromptSubmit = (now: Date, status: string): boolean =>
    status === 'draft' && daysLeftInMonth(now) <= 5;

export const initialsFrom = (first?: string | null, last?: string | null): string =>
    [first, last]
        .filter(Boolean)
        .map((name) => `${String(name).trim().charAt(0).toUpperCase()}.`)
        .join('');

/** Typed initials win: the peer chose them deliberately over the linked record. */
export const entryInitials = (entry: {
    assisted_initials?: string | null;
    students?: { first_name?: string | null; last_name?: string | null } | null;
}): string =>
    entry.assisted_initials?.trim()
        || initialsFrom(entry.students?.first_name, entry.students?.last_name);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/peerLogbook.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/peerLogbook.ts src/utils/peerLogbook.test.ts
git commit -m "feat(peer): add logbook month and initials helpers"
```

---

### Task 3: Entry modal — stacked view, edit, create

**Files:**
- Create: `src/components/peerLogbook/PeerLogEntryModal.tsx`

**Interfaces:**
- Consumes: `todayIso` from `src/utils/peerLogbook`; `Modal` from `src/components/ui/Modal`; `Button` from `src/components/ui/Button`; `supabase` from `src/lib/supabase`
- Produces:
  - `export interface PeerLogEntry { id: string; logbook_id: string; logbook_month: string; entry_date: string; logged_at: string; activity_type: string; assisted_student_id: string | null; assisted_initials: string | null; concern: string; action_taken: string; remarks: string | null; referred: boolean; students?: { first_name?: string | null; last_name?: string | null } | null }`
  - `export interface PeerLogEntryDraft { entry_date: string; activity_type: string; assisted_student_id: string | null; assisted_initials: string | null; concern: string; action_taken: string; remarks: string; referred: boolean }`
  - default export `PeerLogEntryModal(props: { entry: PeerLogEntry | null; monthKey: string; readOnly: boolean; peerStudentId: string; isSaving: boolean; onClose: () => void; onSave: (draft: PeerLogEntryDraft) => void; onDelete?: () => void })` — `entry === null` means create mode
  - `export const ACTIVITY_SUGGESTIONS: string[]`

- [ ] **Step 1: Write the component**

There is no separate test step for this task — Task 4's test renders it through the month view, which is how it is actually used. Create `src/components/peerLogbook/PeerLogEntryModal.tsx`:

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import Modal from '../ui/Modal';
import { initialsFrom, monthStartOf, todayIso } from '../../utils/peerLogbook';

export interface PeerLogEntry {
    id: string;
    logbook_id: string;
    logbook_month: string;
    entry_date: string;
    logged_at: string;
    activity_type: string;
    assisted_student_id: string | null;
    assisted_initials: string | null;
    concern: string;
    action_taken: string;
    remarks: string | null;
    referred: boolean;
    students?: { first_name?: string | null; last_name?: string | null } | null;
}

export interface PeerLogEntryDraft {
    entry_date: string;
    activity_type: string;
    assisted_student_id: string | null;
    assisted_initials: string | null;
    concern: string;
    action_taken: string;
    remarks: string;
    referred: boolean;
}

/** Suggestions only -- the field accepts anything, so a new activity is typed, not blocked. */
export const ACTIVITY_SUGGESTIONS = [
    'One-on-one peer support',
    'Group session',
    'Classroom / orientation',
    'Outreach activity',
    'Follow-up check-in',
    'Office duty'
];

// Staff-only lookup elsewhere, but the term still feeds a PostgREST or() string,
// so strip the characters that would break its comma/paren-delimited grammar.
const sanitizeTerm = (term: string) => term.replace(/[,()*]/g, ' ').trim();

const fullName = (s: any) => [s?.first_name, s?.last_name].filter(Boolean).join(' ') || '—';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{label}</p>
        <div className="mt-1 text-sm text-slate-700">{children}</div>
    </div>
);

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500';

const AssistedStudentPicker = ({
    peerStudentId, selectedId, selectedLabel, onPick, onClear
}: {
    peerStudentId: string;
    selectedId: string | null;
    selectedLabel: string;
    onPick: (student: any) => void;
    onClear: () => void;
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const term = sanitizeTerm(searchTerm);

    // Before the peer types, offer whoever they logged most recently -- follow-ups
    // mean the same handful of students recur, so it is usually a one-tap pick.
    const { data: recent = [] } = useQuery({
        queryKey: ['peer-logbook-recent-students', peerStudentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_log_entries')
                .select('assisted_student_id, logged_at, students:assisted_student_id ( student_id, first_name, last_name )')
                .not('assisted_student_id', 'is', null)
                .order('logged_at', { ascending: false })
                .limit(25);
            if (error) throw error;
            const seen = new Map<string, any>();
            for (const row of data || []) {
                const student = (row as any).students;
                if (student?.student_id && !seen.has(student.student_id)) seen.set(student.student_id, student);
            }
            return Array.from(seen.values()).slice(0, 5);
        },
        enabled: term.length < 2,
        staleTime: 60000
    });

    const { data: results = [], isFetching } = useQuery({
        queryKey: ['peer-logbook-student-search', term],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('student_id, first_name, last_name, course, year_level')
                .eq('is_archived', false)
                .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%`)
                .limit(5);
            if (error) throw error;
            return data || [];
        },
        enabled: term.length >= 2
    });

    if (selectedId) {
        return (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
                <p className="truncate text-sm font-bold text-slate-900">{selectedLabel}</p>
                <Button variant="secondary" size="sm" onClick={onClear}>Change</Button>
            </div>
        );
    }

    const options = term.length >= 2 ? results : recent;

    return (
        <div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or student ID..."
                    aria-label="Search for the student assisted"
                    className={`${inputClass} pl-10`}
                />
            </div>
            <div className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-100">
                {isFetching ? (
                    <p className="px-3 py-3 text-center text-xs text-slate-400">Searching...</p>
                ) : options.length === 0 ? (
                    <p className="px-3 py-3 text-center text-xs text-slate-400">
                        {term.length >= 2 ? 'No matching students.' : 'Type at least 2 characters to search.'}
                    </p>
                ) : (
                    options.map((s: any) => (
                        <button
                            type="button"
                            key={s.student_id}
                            onClick={() => onPick(s)}
                            className="w-full px-3 py-2 text-left transition-colors hover:bg-blue-50"
                        >
                            <p className="text-sm font-bold text-slate-900">{fullName(s)}</p>
                            <p className="text-xs text-slate-500">{s.student_id}</p>
                        </button>
                    ))
                )}
            </div>
        </div>
    );
};

export default function PeerLogEntryModal({
    entry, monthKey, readOnly, peerStudentId, isSaving, onClose, onSave, onDelete
}: {
    entry: PeerLogEntry | null;
    monthKey: string;
    readOnly: boolean;
    peerStudentId: string;
    isSaving: boolean;
    onClose: () => void;
    onSave: (draft: PeerLogEntryDraft) => void;
    onDelete?: () => void;
}) {
    const monthStart = monthStartOf(monthKey);
    const today = todayIso();
    const defaultDate = today.startsWith(monthKey) ? today : monthStart;

    const [isEditing, setIsEditing] = useState(!entry);
    const [draft, setDraft] = useState<PeerLogEntryDraft>({
        entry_date: entry?.entry_date || defaultDate,
        activity_type: entry?.activity_type || '',
        assisted_student_id: entry?.assisted_student_id || null,
        assisted_initials: entry?.assisted_initials || null,
        concern: entry?.concern || '',
        action_taken: entry?.action_taken || '',
        remarks: entry?.remarks || '',
        referred: entry?.referred || false
    });
    const [pickedLabel, setPickedLabel] = useState(
        entry?.students ? fullName(entry.students) : ''
    );

    const set = <K extends keyof PeerLogEntryDraft>(key: K, value: PeerLogEntryDraft[K]) =>
        setDraft((current) => ({ ...current, [key]: value }));

    const canSave = draft.activity_type.trim() && draft.concern.trim() && draft.action_taken.trim();

    // Last day of the month, so the date input cannot leave the logbook's month --
    // the DB check would reject it anyway, this just says so before the round trip.
    const [year, month] = monthKey.split('-').map(Number);
    const maxDate = todayIso(new Date(year, month, 0));

    const readView = (
        <div className="space-y-4">
            <Field label="Date">{new Date(`${(entry || draft).entry_date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</Field>
            <Field label="Type of activity / interaction">{entry?.activity_type}</Field>
            <Field label="Student assisted">
                {entry?.students
                    ? `${fullName(entry.students)} (${initialsFrom(entry.students.first_name, entry.students.last_name)})`
                    : entry?.assisted_initials || 'Not recorded'}
            </Field>
            <Field label="Concern / topic discussed"><span className="whitespace-pre-wrap">{entry?.concern}</span></Field>
            <Field label="Action taken / assistance provided"><span className="whitespace-pre-wrap">{entry?.action_taken}</span></Field>
            <Field label="Referred to Guidance Center">{entry?.referred ? 'Yes' : 'No'}</Field>
            <Field label="Remarks / follow-up plan"><span className="whitespace-pre-wrap">{entry?.remarks || 'None'}</span></Field>
        </div>
    );

    const editView = (
        <div className="space-y-4">
            <div>
                <label htmlFor="entry-date" className="mb-1 block text-xs font-bold text-gray-700">Date</label>
                <input
                    id="entry-date"
                    type="date"
                    value={draft.entry_date}
                    min={monthStart}
                    max={maxDate}
                    onChange={(e) => set('entry_date', e.target.value)}
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="entry-activity" className="mb-1 block text-xs font-bold text-gray-700">Type of activity / interaction</label>
                <input
                    id="entry-activity"
                    list="peer-activity-suggestions"
                    value={draft.activity_type}
                    onChange={(e) => set('activity_type', e.target.value)}
                    className={inputClass}
                />
                <datalist id="peer-activity-suggestions">
                    {ACTIVITY_SUGGESTIONS.map((option) => <option key={option} value={option} />)}
                </datalist>
            </div>

            <div>
                <p className="mb-1 text-xs font-bold text-gray-700">Student assisted <span className="font-medium text-slate-400">— optional</span></p>
                <AssistedStudentPicker
                    peerStudentId={peerStudentId}
                    selectedId={draft.assisted_student_id}
                    selectedLabel={pickedLabel}
                    onPick={(student) => {
                        set('assisted_student_id', student.student_id);
                        setPickedLabel(fullName(student));
                    }}
                    onClear={() => {
                        set('assisted_student_id', null);
                        setPickedLabel('');
                    }}
                />
                <label htmlFor="entry-initials" className="mt-2 mb-1 block text-xs font-bold text-gray-700">…or initials only</label>
                <input
                    id="entry-initials"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. R.R."
                    value={draft.assisted_initials || ''}
                    onChange={(e) => set('assisted_initials', e.target.value || null)}
                    className={inputClass}
                />
            </div>

            <div>
                <label htmlFor="entry-concern" className="mb-1 block text-xs font-bold text-gray-700">Concern / topic discussed</label>
                <textarea id="entry-concern" rows={3} value={draft.concern} onChange={(e) => set('concern', e.target.value)} className={inputClass} />
            </div>

            <div>
                <label htmlFor="entry-action" className="mb-1 block text-xs font-bold text-gray-700">Action taken / assistance provided</label>
                <textarea id="entry-action" rows={3} value={draft.action_taken} onChange={(e) => set('action_taken', e.target.value)} className={inputClass} />
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input
                    type="checkbox"
                    checked={draft.referred}
                    onChange={(e) => set('referred', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-bold text-slate-700">Referred to Guidance Center</span>
            </label>

            <div>
                <label htmlFor="entry-remarks" className="mb-1 block text-xs font-bold text-gray-700">Remarks / follow-up plan</label>
                <textarea id="entry-remarks" rows={2} value={draft.remarks} onChange={(e) => set('remarks', e.target.value)} className={inputClass} />
            </div>
        </div>
    );

    return (
        <Modal
            open
            size="lg"
            title={entry ? 'Log Entry' : 'New Log Entry'}
            subtitle={entry && !isEditing ? 'Recorded peer support session' : 'Record one peer support session'}
            onClose={onClose}
            footer={isEditing ? (
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button variant="primary" isLoading={isSaving} disabled={!canSave} onClick={() => onSave(draft)}>Save</Button>
                </>
            ) : readOnly ? (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            ) : (
                <>
                    {onDelete && (
                        <Button variant="danger" leftIcon={<Trash2 size={14} />} onClick={onDelete} disabled={isSaving}>Delete</Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button variant="primary" onClick={() => setIsEditing(true)}>Edit</Button>
                </>
            )}
        >
            <div className="mx-auto w-full max-w-2xl">
                {isEditing ? editView : readView}
            </div>
        </Modal>
    );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/peerLogbook/PeerLogEntryModal.tsx
git commit -m "feat(peer): add stacked log entry view and editor"
```

---

### Task 4: Month card list

**Files:**
- Create: `src/components/peerLogbook/PeerLogbookMonth.tsx`
- Test: `src/components/peerLogbook/PeerLogbookMonth.test.tsx`

**Interfaces:**
- Consumes: `PeerLogEntry`, `PeerLogEntryDraft`, `PeerLogEntryModal` from Task 3; `entryInitials` is deliberately *not* used here
- Produces: default export `PeerLogbookMonth(props: { entries: PeerLogEntry[]; monthKey: string; readOnly: boolean; peerStudentId: string; isSaving: boolean; onSaveEntry: (draft: PeerLogEntryDraft, entryId: string | null) => void; onDeleteEntry: (entryId: string) => void; isLoading?: boolean })`

- [ ] **Step 1: Write the failing test**

Create `src/components/peerLogbook/PeerLogbookMonth.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PeerLogbookMonth from './PeerLogbookMonth';

vi.mock('@tanstack/react-query', () => ({
    useQuery: () => ({ data: [], isFetching: false })
}));

const entries = [{
    id: 'entry-1',
    logbook_id: 'book-1',
    logbook_month: '2026-07-01',
    entry_date: '2026-07-14',
    logged_at: '2026-07-14T06:30:00.000Z',
    activity_type: 'One-on-one peer support',
    assisted_student_id: '420135501',
    assisted_initials: null,
    concern: 'Struggling with academic load',
    action_taken: 'Listened and shared study planning',
    remarks: 'Check back next week',
    referred: true,
    students: { first_name: 'Reynel', last_name: 'Repaso' }
}];

describe('PeerLogbookMonth', () => {
    const baseProps = {
        entries,
        monthKey: '2026-07',
        peerStudentId: '420100001',
        isSaving: false,
        onSaveEntry: vi.fn(),
        onDeleteEntry: vi.fn()
    };

    it('shows only the date and activity type on the card', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByText('One-on-one peer support')).toBeInTheDocument();
    });

    // The whole point of the two-line card: a logbook open on a phone in a
    // corridor must not expose who was assisted or what was discussed.
    it('never leaks the assisted student or the concern to the list', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.queryByText(/Reynel/)).not.toBeInTheDocument();
        expect(screen.queryByText(/R\.R\./)).not.toBeInTheDocument();
        expect(screen.queryByText(/Struggling with academic load/)).not.toBeInTheDocument();
    });

    it('flags a referred entry without naming anyone', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByText('Referred')).toBeInTheDocument();
    });

    it('offers no way to add an entry when read only', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly />);
        expect(screen.queryByRole('button', { name: /add entry/i })).not.toBeInTheDocument();
    });

    it('offers an add button when editable', () => {
        render(<PeerLogbookMonth {...baseProps} readOnly={false} />);
        expect(screen.getByRole('button', { name: /add entry/i })).toBeInTheDocument();
    });

    it('tells the peer the month is empty', () => {
        render(<PeerLogbookMonth {...baseProps} entries={[]} readOnly={false} />);
        expect(screen.getByText(/no peer support logged/i)).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/peerLogbook/PeerLogbookMonth.test.tsx`
Expected: FAIL — cannot resolve `./PeerLogbookMonth`.

- [ ] **Step 3: Write the implementation**

Create `src/components/peerLogbook/PeerLogbookMonth.tsx`:

```tsx
import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import PeerLogEntryModal, { type PeerLogEntry, type PeerLogEntryDraft } from './PeerLogEntryModal';

const formatEntryDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

const formatLoggedTime = (value: string) =>
    new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function PeerLogbookMonth({
    entries, monthKey, readOnly, peerStudentId, isSaving, onSaveEntry, onDeleteEntry, isLoading = false
}: {
    entries: PeerLogEntry[];
    monthKey: string;
    readOnly: boolean;
    peerStudentId: string;
    isSaving: boolean;
    onSaveEntry: (draft: PeerLogEntryDraft, entryId: string | null) => void;
    onDeleteEntry: (entryId: string) => void;
    isLoading?: boolean;
}) {
    const [openEntry, setOpenEntry] = useState<PeerLogEntry | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const closeModal = () => {
        setOpenEntry(null);
        setIsCreating(false);
    };

    return (
        <div className="space-y-3">
            {!readOnly && (
                <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => setIsCreating(true)} className="w-full sm:w-auto">
                    Add Entry
                </Button>
            )}

            {isLoading ? (
                <p className="py-8 text-center text-[11px] font-semibold text-slate-400">Loading entries...</p>
            ) : entries.length === 0 ? (
                <p className="py-8 text-center text-[11px] font-semibold text-slate-400">
                    No peer support logged for this month yet.
                </p>
            ) : (
                <ul className="space-y-2">
                    {entries.map((entry) => (
                        <li key={entry.id}>
                            {/* Two lines only. Nothing identifying reaches this list -- a
                                logbook is read on a phone, often with someone nearby. */}
                            <button
                                type="button"
                                onClick={() => setOpenEntry(entry)}
                                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                        {formatEntryDate(entry.entry_date)} · {formatLoggedTime(entry.logged_at)}
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900">{entry.activity_type}</p>
                                </div>
                                {entry.referred && (
                                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700">
                                        Referred
                                    </span>
                                )}
                                <ChevronRight size={16} className="shrink-0 text-slate-300" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {(openEntry || isCreating) && (
                <PeerLogEntryModal
                    entry={openEntry}
                    monthKey={monthKey}
                    readOnly={readOnly}
                    peerStudentId={peerStudentId}
                    isSaving={isSaving}
                    onClose={closeModal}
                    onSave={(draft) => {
                        onSaveEntry(draft, openEntry?.id ?? null);
                        closeModal();
                    }}
                    onDelete={openEntry && !readOnly ? () => {
                        onDeleteEntry(openEntry.id);
                        closeModal();
                    } : undefined}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/peerLogbook/PeerLogbookMonth.test.tsx`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/peerLogbook/PeerLogbookMonth.tsx src/components/peerLogbook/PeerLogbookMonth.test.tsx
git commit -m "feat(peer): add month card list for the peer support logbook"
```

---

### Task 5: PDF export in the paper layout

**Files:**
- Create: `src/utils/peerLogbookPdf.ts`
- Test: `src/utils/peerLogbookPdf.test.ts`

**Interfaces:**
- Consumes: `loadJsPdfAutoTable` from `src/lib/exportVendors`; `PeerLogEntry` from `src/components/peerLogbook/PeerLogEntryModal`; `entryInitials`, `monthLabelOf` from `src/utils/peerLogbook`
- Produces:
  - `export const LOGBOOK_COLUMNS: string[]` — the eight headers in the source form's order
  - `export const buildLogbookRows(entries: PeerLogEntry[]): string[][]`
  - `export const exportLogbookPdf(options: { peerName: string; programYearSection: string; monthKey: string; entries: PeerLogEntry[]; reviewerName?: string | null }): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `src/utils/peerLogbookPdf.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { LOGBOOK_COLUMNS, buildLogbookRows } from './peerLogbookPdf';

const entry = {
    id: 'entry-1',
    logbook_id: 'book-1',
    logbook_month: '2026-07-01',
    entry_date: '2026-07-14',
    logged_at: '2026-07-14T06:30:00.000Z',
    activity_type: 'One-on-one peer support',
    assisted_student_id: '420135501',
    assisted_initials: null,
    concern: 'Struggling with academic load',
    action_taken: 'Listened and shared study planning',
    remarks: 'Check back next week',
    referred: true,
    students: { first_name: 'Reynel', last_name: 'Repaso' }
} as any;

describe('peer logbook PDF rows', () => {
    it('keeps the eight columns in the source form order', () => {
        expect(LOGBOOK_COLUMNS).toEqual([
            'Date',
            'Type of Activity/Interaction',
            'Name of Student Assisted',
            'Concern/Topic Discussed',
            'Action Taken/Assistance Provided',
            'Referred to Guidance (Yes/No)',
            'Remarks/Follow-up Plan',
            'Signature of PEERkada'
        ]);
    });

    it('prints initials rather than the linked student name', () => {
        const [row] = buildLogbookRows([entry]);
        expect(row[2]).toBe('R.R.');
        expect(row.join(' ')).not.toContain('Reynel');
    });

    it('renders the referral flag as the form asks it', () => {
        expect(buildLogbookRows([entry])[0][5]).toBe('Yes');
        expect(buildLogbookRows([{ ...entry, referred: false }])[0][5]).toBe('No');
    });

    // The office signs the printed sheet by hand; the app captures no signature.
    it('leaves the PEERkada signature column blank', () => {
        expect(buildLogbookRows([entry])[0][7]).toBe('');
    });

    it('leaves an unrecorded student blank rather than inventing initials', () => {
        const anonymous = { ...entry, assisted_student_id: null, students: null };
        expect(buildLogbookRows([anonymous])[0][2]).toBe('');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/utils/peerLogbookPdf.test.ts`
Expected: FAIL — cannot resolve `./peerLogbookPdf`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/peerLogbookPdf.ts`:

```ts
import { loadJsPdfAutoTable } from '../lib/exportVendors';
import type { PeerLogEntry } from '../components/peerLogbook/PeerLogEntryModal';
import { entryInitials, monthLabelOf } from './peerLogbook';

/** The source form's columns, in its order. The PDF is the only place this layout exists. */
export const LOGBOOK_COLUMNS = [
    'Date',
    'Type of Activity/Interaction',
    'Name of Student Assisted',
    'Concern/Topic Discussed',
    'Action Taken/Assistance Provided',
    'Referred to Guidance (Yes/No)',
    'Remarks/Follow-up Plan',
    'Signature of PEERkada'
];

export const buildLogbookRows = (entries: PeerLogEntry[]): string[][] =>
    entries.map((entry) => [
        new Date(`${entry.entry_date}T00:00:00`).toLocaleDateString(),
        entry.activity_type,
        entryInitials(entry),
        entry.concern,
        entry.action_taken,
        entry.referred ? 'Yes' : 'No',
        entry.remarks || '',
        ''  // signed by hand on the printed sheet
    ]);

export const exportLogbookPdf = async ({
    peerName, programYearSection, monthKey, entries, reviewerName
}: {
    peerName: string;
    programYearSection: string;
    monthKey: string;
    entries: PeerLogEntry[];
    reviewerName?: string | null;
}): Promise<void> => {
    const { jsPDF, autoTable } = await loadJsPdfAutoTable();
    // Landscape: eight columns of prose do not fit portrait at a readable size.
    const doc = new jsPDF({ orientation: 'landscape' });

    doc.setFontSize(10);
    doc.text('OFFICE OF THE CAMPUS CARE CENTER DIRECTOR', 14, 14);
    doc.text('GUIHULNGAN CAMPUS', 14, 19);
    doc.setFontSize(12);
    doc.text('CARE Center-Peer Facilitator Logbook (Peer Support)', 14, 27);
    doc.setFontSize(10);
    doc.text(`Peer Facilitator Name: ${peerName}`, 14, 35);
    doc.text(`Program/Year/Section: ${programYearSection}`, 14, 40);
    doc.text(`Month Covered: ${monthLabelOf(monthKey)}`, 14, 45);

    autoTable(doc, {
        head: [LOGBOOK_COLUMNS],
        body: buildLogbookRows(entries),
        startY: 50,
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: 'bold' },
        columnStyles: { 3: { cellWidth: 45 }, 4: { cellWidth: 45 }, 6: { cellWidth: 35 } }
    });

    const endY = (doc as any).lastAutoTable?.finalY ?? 50;
    doc.text('Peer Facilitator Signature: _________________________________', 14, endY + 15);
    doc.text(`Reviewed by (Guidance Center Staff): ${reviewerName || '_______________________'}`, 14, endY + 23);

    doc.save(`peer-support-logbook-${monthKey}.pdf`);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/utils/peerLogbookPdf.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/peerLogbookPdf.ts src/utils/peerLogbookPdf.test.ts
git commit -m "feat(peer): export a logbook month in the paper form layout"
```

---

### Task 6: Student logbook page

**Files:**
- Create: `src/pages/student/features/volunteer/components/PeerLogbook.tsx`
- Modify: `src/pages/student/features/volunteer/components/VolunteerView.tsx` (facilitator branch, after `VolunteerTimeLog`)

**Interfaces:**
- Consumes: `PeerLogbookMonth` (Task 4), `PeerLogEntryDraft`/`PeerLogEntry` (Task 3), `exportLogbookPdf` (Task 5), `monthKeyOf`/`monthStartOf`/`monthLabelOf`/`shouldPromptSubmit` (Task 2)
- Produces: default export `PeerLogbook(props: { studentId: string; peerName: string; programYearSection: string; showToast?: (message: string, type?: string) => void })`

- [ ] **Step 1: Write the component**

Create `src/pages/student/features/volunteer/components/PeerLogbook.tsx`:

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Send } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import type { PeerLogEntry, PeerLogEntryDraft } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { monthKeyOf, monthLabelOf, monthStartOf, shouldPromptSubmit } from '../../../../../utils/peerLogbook';

const ENTRY_COLUMNS = `
    id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
    assisted_student_id, assisted_initials, concern, action_taken, remarks, referred,
    students:assisted_student_id ( first_name, last_name )
`;

const STATUS_TONE: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-600',
    submitted: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

export default function PeerLogbook({
    studentId, peerName, programYearSection, showToast
}: {
    studentId: string;
    peerName: string;
    programYearSection: string;
    showToast?: (message: string, type?: string) => void;
}) {
    const queryClient = useQueryClient();
    const [monthKey, setMonthKey] = useState(() => monthKeyOf(new Date()));

    const bookKey = ['peer-logbook', studentId, monthKey];

    const { data, isLoading } = useQuery({
        queryKey: bookKey,
        queryFn: async () => {
            const { data: logbook, error: bookError } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, status, submitted_at, reviewer_name, reviewed_at')
                .eq('student_id', studentId)
                .eq('month', monthStartOf(monthKey))
                .maybeSingle();
            if (bookError) throw bookError;
            if (!logbook) return { logbook: null, entries: [] as PeerLogEntry[] };

            const { data: entries, error: entryError } = await supabase
                .from('peer_facilitator_log_entries')
                .select(ENTRY_COLUMNS)
                .eq('logbook_id', logbook.id)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (entryError) throw entryError;
            return { logbook, entries: (entries || []) as unknown as PeerLogEntry[] };
        }
    });

    const { data: archived = [] } = useQuery({
        queryKey: ['peer-logbook-archive', studentId],
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, reviewer_name, reviewed_at')
                .eq('student_id', studentId)
                .eq('status', 'approved')
                .order('month', { ascending: false });
            if (error) throw error;
            return rows || [];
        }
    });

    const logbook = data?.logbook || null;
    const entries = data?.entries || [];
    const status = logbook?.status || 'draft';
    const isLocked = status !== 'draft';

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: bookKey });
        queryClient.invalidateQueries({ queryKey: ['peer-logbook-archive', studentId] });
    };

    const saveEntryMutation = useMutation({
        mutationFn: async ({ draft, entryId }: { draft: PeerLogEntryDraft; entryId: string | null }) => {
            if (entryId) {
                const { error } = await supabase
                    .from('peer_facilitator_log_entries')
                    .update({ ...draft, remarks: draft.remarks || null })
                    .eq('id', entryId);
                if (error) throw error;
                return;
            }

            // ignoreDuplicates keeps this an ON CONFLICT DO NOTHING. A normal upsert
            // would run an UPDATE on an existing month, which the student policy
            // rejects -- it only permits draft -> submitted.
            const month = monthStartOf(monthKey);
            const { error: bookError } = await supabase
                .from('peer_facilitator_logbooks')
                .upsert({ student_id: studentId, month }, { onConflict: 'student_id,month', ignoreDuplicates: true });
            if (bookError) throw bookError;

            const { data: book, error: readError } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id')
                .eq('student_id', studentId)
                .eq('month', month)
                .single();
            if (readError) throw readError;

            const { error } = await supabase
                .from('peer_facilitator_log_entries')
                .insert([{ ...draft, remarks: draft.remarks || null, logbook_id: book.id, logbook_month: month }]);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Log entry saved.');
        },
        onError: () => showToast?.('Unable to save the log entry.', 'error')
    });

    const deleteEntryMutation = useMutation({
        mutationFn: async (entryId: string) => {
            const { error } = await supabase.from('peer_facilitator_log_entries').delete().eq('id', entryId);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Log entry deleted.');
        },
        onError: () => showToast?.('Unable to delete the log entry.', 'error')
    });

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!logbook) throw new Error('Nothing to submit.');
            // submitted_at is stamped by the DB trigger, not sent from here.
            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({ status: 'submitted' })
                .eq('id', logbook.id);
            if (error) throw error;
        },
        onSuccess: () => {
            invalidate();
            showToast?.('Logbook submitted for review.');
        },
        onError: () => showToast?.('Unable to submit the logbook.', 'error')
    });

    const downloadMonth = async (targetMonthKey: string, targetLogbookId: string, reviewerName?: string | null) => {
        const { data: rows, error } = await supabase
            .from('peer_facilitator_log_entries')
            .select(ENTRY_COLUMNS)
            .eq('logbook_id', targetLogbookId)
            .order('entry_date', { ascending: true });
        if (error) {
            showToast?.('Unable to build the PDF.', 'error');
            return;
        }
        await exportLogbookPdf({
            peerName,
            programYearSection,
            monthKey: targetMonthKey,
            entries: (rows || []) as unknown as PeerLogEntry[],
            reviewerName
        });
    };

    return (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-500">Peer Support</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">The Logbook</h3>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="peer-logbook-month" className="sr-only">Month covered</label>
                    <input
                        id="peer-logbook-month"
                        type="month"
                        value={monthKey}
                        onChange={(e) => setMonthKey(e.target.value)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase ${STATUS_TONE[status]}`}>
                        {status}
                    </span>
                </div>
            </div>

            {shouldPromptSubmit(new Date(), status) && monthKey === monthKeyOf(new Date()) && entries.length > 0 && (
                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                    <p className="text-[11px] font-semibold leading-5 text-amber-800">
                        {monthLabelOf(monthKey)} is almost over. Submit your logbook so the CARE Office can review it.
                    </p>
                </div>
            )}

            <div className="mt-4 border-t border-slate-100 pt-4">
                <PeerLogbookMonth
                    entries={entries}
                    monthKey={monthKey}
                    readOnly={isLocked}
                    peerStudentId={studentId}
                    isLoading={isLoading}
                    isSaving={saveEntryMutation.isPending || deleteEntryMutation.isPending}
                    onSaveEntry={(draft, entryId) => saveEntryMutation.mutate({ draft, entryId })}
                    onDeleteEntry={(entryId) => deleteEntryMutation.mutate(entryId)}
                />
            </div>

            {!isLocked && entries.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                    <Button
                        variant="primary"
                        leftIcon={<Send size={16} />}
                        isLoading={submitMutation.isPending}
                        onClick={() => submitMutation.mutate()}
                        className="w-full sm:w-auto"
                    >
                        Submit {monthLabelOf(monthKey)} for review
                    </Button>
                </div>
            )}

            {archived.length > 0 && (
                /* ponytail: native <details>, no disclosure state to manage */
                <details className="mt-4 border-t border-slate-100 pt-4">
                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 transition hover:text-slate-600">
                        Archived logbooks ({archived.length})
                    </summary>
                    <ul className="mt-3 space-y-2">
                        {archived.map((book: any) => (
                            <li key={book.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900">{monthLabelOf(String(book.month).slice(0, 7))}</p>
                                    <p className="text-[10px] font-semibold text-slate-500">
                                        Approved{book.reviewer_name ? ` by ${book.reviewer_name}` : ''}
                                    </p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    leftIcon={<Download size={14} />}
                                    onClick={() => downloadMonth(String(book.month).slice(0, 7), book.id, book.reviewer_name)}
                                >
                                    Export
                                </Button>
                            </li>
                        ))}
                    </ul>
                </details>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Mount it in the facilitator branch**

In `src/pages/student/features/volunteer/components/VolunteerView.tsx`, add the lazy import beside the existing two:

```tsx
const PeerLogbook = lazy(() => import('./PeerLogbook'));
```

Then, immediately after the `<VolunteerTimeLog … />` `Suspense` block inside the `if (isFacilitator)` branch, add:

```tsx
                <Suspense fallback={null}>
                    <PeerLogbook
                        studentId={personalInfo.studentId}
                        peerName={[personalInfo.firstName, personalInfo.lastName].filter(Boolean).join(' ')}
                        programYearSection={[personalInfo.course, personalInfo.year, personalInfo.section].filter(Boolean).join(' / ')}
                        showToast={showToast}
                    />
                </Suspense>
```

`personalInfo` is typed `any`, so nothing here is checked by the compiler — the field names must be right by inspection. They are `course`, `year`, and `section` (**not** `yearLevel`), as used in `CounselingFormModal.tsx:96` and `ProfileView.tsx:204`. Joined with `/` they read as the form's "Program/Year/Section" line.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add src/pages/student/features/volunteer/components/PeerLogbook.tsx src/pages/student/features/volunteer/components/VolunteerView.tsx
git commit -m "feat(peer): add the student peer support logbook"
```

---

### Task 7: Staff review

**Files:**
- Create: `src/pages/carestaff/features/peerfacilitators/components/CareStaffPeerSupportModal.tsx`
- Modify: `src/pages/carestaff/features/peerfacilitators/components/CareStaffActiveFacilitatorsTable.tsx`

**Interfaces:**
- Consumes: `PeerLogbookMonth` (Task 4), `exportLogbookPdf` (Task 5), `monthLabelOf` (Task 2)
- Produces: default export `CareStaffPeerSupportModal(props: { facilitator: any; onClose: () => void; showToast: (message: string, type?: string) => void })`

- [ ] **Step 1: Write the staff modal**

Create `src/pages/carestaff/features/peerfacilitators/components/CareStaffPeerSupportModal.tsx`:

```tsx
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Undo2 } from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
import PeerLogbookMonth from '../../../../../components/peerLogbook/PeerLogbookMonth';
import type { PeerLogEntry } from '../../../../../components/peerLogbook/PeerLogEntryModal';
import { exportLogbookPdf } from '../../../../../utils/peerLogbookPdf';
import { monthLabelOf } from '../../../../../utils/peerLogbook';

const ENTRY_COLUMNS = `
    id, logbook_id, logbook_month, entry_date, logged_at, activity_type,
    assisted_student_id, assisted_initials, concern, action_taken, remarks, referred,
    students:assisted_student_id ( first_name, last_name )
`;

const STATUS_TONE: Record<string, string> = {
    draft: 'border-slate-200 bg-slate-50 text-slate-600',
    submitted: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700'
};

const fullName = (s: any) =>
    [s?.first_name, s?.middle_name ? `${String(s.middle_name).charAt(0)}.` : '', s?.last_name, s?.suffix]
        .filter(Boolean).join(' ') || '—';

export default function CareStaffPeerSupportModal({
    facilitator, onClose, showToast
}: {
    facilitator: any;
    onClose: () => void;
    showToast: (message: string, type?: string) => void;
}) {
    const queryClient = useQueryClient();
    const [openBookId, setOpenBookId] = useState<string | null>(null);
    const studentId = facilitator.student_id;

    const booksKey = ['care-staff-peer-logbooks', studentId];

    const { data: books = [], isLoading } = useQuery({
        queryKey: booksKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('id, month, status, submitted_at, reviewer_name, reviewed_at')
                .eq('student_id', studentId)
                .order('month', { ascending: false });
            if (error) throw error;
            return data || [];
        }
    });

    const openBook = books.find((b: any) => b.id === openBookId) || null;

    const { data: entries = [], isLoading: entriesLoading } = useQuery({
        queryKey: ['care-staff-peer-log-entries', openBookId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_log_entries')
                .select(ENTRY_COLUMNS)
                .eq('logbook_id', openBookId)
                .order('entry_date', { ascending: false })
                .order('logged_at', { ascending: false });
            if (error) throw error;
            return (data || []) as unknown as PeerLogEntry[];
        },
        enabled: !!openBookId
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ bookId, approve }: { bookId: string; approve: boolean }) => {
            if (!approve) {
                const { error } = await supabase
                    .from('peer_facilitator_logbooks')
                    .update({ status: 'draft', reviewed_by: null, reviewer_name: null, reviewed_at: null })
                    .eq('id', bookId);
                if (error) throw error;
                return;
            }

            const { data: userData } = await supabase.auth.getUser();
            const authUserId = userData.user?.id ?? null;
            const { data: staffAccount } = await supabase
                .from('staff_accounts')
                .select('full_name, username')
                .eq('auth_user_id', authUserId)
                .maybeSingle();

            const { error } = await supabase
                .from('peer_facilitator_logbooks')
                .update({
                    status: 'approved',
                    reviewed_by: authUserId,
                    reviewer_name: staffAccount?.full_name || staffAccount?.username || 'CARE Staff',
                    reviewed_at: new Date().toISOString()
                })
                .eq('id', bookId);
            if (error) throw error;
        },
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({ queryKey: booksKey });
            queryClient.invalidateQueries({ queryKey: ['care-staff-submitted-logbooks'] });
            showToast(variables.approve ? 'Logbook approved.' : 'Logbook returned to the peer.', 'success');
        },
        onError: () => showToast('Failed to update the logbook.', 'error')
    });

    const exportOpenBook = async () => {
        if (!openBook) return;
        await exportLogbookPdf({
            peerName: fullName(facilitator.students),
            programYearSection: [facilitator.students?.course, facilitator.students?.year_level].filter(Boolean).join(' - '),
            monthKey: String(openBook.month).slice(0, 7),
            entries,
            reviewerName: openBook.reviewer_name
        });
    };

    return (
        <Modal
            open
            anchorId="staff-content-region"
            title={fullName(facilitator.students)}
            subtitle={openBook ? `Peer Support · ${monthLabelOf(String(openBook.month).slice(0, 7))}` : 'Peer Support'}
            onClose={openBook ? () => setOpenBookId(null) : onClose}
            footer={openBook ? (
                <>
                    <Button variant="secondary" leftIcon={<Download size={14} />} onClick={exportOpenBook}>Export PDF</Button>
                    {openBook.status === 'submitted' && (
                        <Button
                            variant="secondary"
                            leftIcon={<Undo2 size={14} />}
                            isLoading={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ bookId: openBook.id, approve: false })}
                        >
                            Return to peer
                        </Button>
                    )}
                    {openBook.status !== 'approved' && (
                        <Button
                            variant="primary"
                            leftIcon={<CheckCircle2 size={16} />}
                            isLoading={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ bookId: openBook.id, approve: true })}
                        >
                            Approve
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setOpenBookId(null)}>Back</Button>
                </>
            ) : (
                <Button variant="secondary" onClick={onClose}>Close</Button>
            )}
        >
            <div className="mx-auto w-full max-w-3xl">
                {openBook ? (
                    <>
                        <div className="mb-4 flex items-center gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${STATUS_TONE[openBook.status]}`}>
                                {openBook.status}
                            </span>
                            {openBook.reviewer_name && (
                                <span className="text-[11px] font-semibold text-slate-500">
                                    Reviewed by {openBook.reviewer_name}
                                    {openBook.reviewed_at ? ` · ${new Date(openBook.reviewed_at).toLocaleDateString()}` : ''}
                                </span>
                            )}
                        </div>
                        <PeerLogbookMonth
                            entries={entries}
                            monthKey={String(openBook.month).slice(0, 7)}
                            readOnly
                            peerStudentId={studentId}
                            isLoading={entriesLoading}
                            isSaving={false}
                            onSaveEntry={() => undefined}
                            onDeleteEntry={() => undefined}
                        />
                    </>
                ) : isLoading ? (
                    <p className="py-8 text-center text-sm text-slate-400">Loading logbooks...</p>
                ) : books.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400">This facilitator has no peer support logbooks yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {books.map((book: any) => (
                            <li key={book.id}>
                                <button
                                    type="button"
                                    onClick={() => setOpenBookId(book.id)}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                                >
                                    <span className="text-sm font-bold text-slate-900">
                                        {monthLabelOf(String(book.month).slice(0, 7))}
                                    </span>
                                    <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${STATUS_TONE[book.status]}`}>
                                        {book.status}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
}
```

- [ ] **Step 2: Add the chip and open the modal from the roster**

In `src/pages/carestaff/features/peerfacilitators/components/CareStaffActiveFacilitatorsTable.tsx`:

Add the import beside the existing ones:

```tsx
import CareStaffPeerSupportModal from './CareStaffPeerSupportModal';
```

Add state beside `pendingArchiveId`:

```tsx
    const [openFacilitator, setOpenFacilitator] = useState<any>(null);
```

Add a query after the existing `facilitators` query. `peer_facilitators` and `peer_facilitator_logbooks` share no FK path, so PostgREST cannot embed one in the other — fetch the submitted set and map it in JS:

```tsx
    const { data: submittedLogbooks = [] } = useQuery({
        queryKey: ['care-staff-submitted-logbooks', refreshSignal],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('peer_facilitator_logbooks')
                .select('student_id')
                .eq('status', 'submitted');
            if (error) throw error;
            return data || [];
        }
    });

    const awaitingReview = new Set(submittedLogbooks.map((row: any) => row.student_id));
```

In the table body, replace the facilitator name cell with a clickable one that carries the chip:

```tsx
                                        <td className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={() => setOpenFacilitator(f)}
                                                className="text-left font-bold text-gray-900 transition hover:text-blue-700 hover:underline"
                                            >
                                                {fullName(f.students)}
                                            </button>
                                            <div className="text-xs text-gray-500">{f.student_id}</div>
                                            {awaitingReview.has(f.student_id) && (
                                                <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                                                    Logbook submitted
                                                </span>
                                            )}
                                        </td>
```

Render the modal beside the existing two, before the closing `</div>`:

```tsx
            {openFacilitator && (
                <CareStaffPeerSupportModal
                    facilitator={openFacilitator}
                    onClose={() => setOpenFacilitator(null)}
                    showToast={functions.showToast}
                />
            )}
```

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all tests pass. `CareStaffPeerFacilitatorsPage.test.tsx` mocks `useQuery` by `queryKey[0]` and falls through to `{ data: [], isLoading: false, isFetching: false }`, so the new `care-staff-submitted-logbooks` key is already handled by that fallback.

- [ ] **Step 4: Commit**

```bash
git add src/pages/carestaff/features/peerfacilitators/components/
git commit -m "feat(peer): let care staff review and approve peer support logbooks"
```

---

### Task 8: Full gate

- [ ] **Step 1: Run the complete check**

Run: `npm run check`
Expected: lint, typecheck, tests, and build all pass.

- [ ] **Step 2: Fix anything the gate catches, then commit**

```bash
git add -A
git commit -m "chore(peer): satisfy the lint and type gate for the logbook"
```

---

## Deferred — do not build in this plan

- Wiring `referred` into `counseling_requests` (the peer referral feature).
- Signature capture. `react-signature-canvas` is already a dependency, so adding pads later is small.
- A one-item tab strip in the staff modal. The modal's body *is* the Peer Support view; a tab bar with a single tab is chrome with no choice in it. Add a real tab strip when a second tab exists.
- An admin screen for activity types.
