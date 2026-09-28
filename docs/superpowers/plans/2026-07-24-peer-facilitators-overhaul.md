# Peer Facilitators Overhaul Implementation Plan

> **For agentic workers:** implement task-by-task; each task ends testable.

**Goal:** Make an active-facilitator roster the source of truth (approved + staff-added), decouple student visibility/hours from the `school_year` label, add applications-open and time-in toggles, and move Peer Facilitator management to its own staff page.

**Architecture:** New `peer_facilitators` roster table + two boolean toggles on `peer_facilitator_settings`. Attendance and the student portal read the roster, not the year. A new `features/peerfacilitators/` staff page hosts Applications / Active Facilitators / Facilitator Hours (relocated from `features/forms`).

**Tech Stack:** React 19, @tanstack/react-query, Supabase (Postgres + RLS), TypeScript, vitest, Tailwind.

## Global Constraints

- Supabase project: `ydbpzzbbiwhlwqmweqzj` (Care System). Repo `.env` targets it.
- Typed client: `createClient<Database>` — `src/types/database.ts` MUST be regenerated after DDL (`generate_typescript_types`), not hand-edited.
- RLS helpers available: `public.current_student_id()`, `public.current_staff_role()`, `public.is_admin()`.
- Migration tests assert SQL file **text** (regex), not a live DB (vitest, jsdom).
- Feature components at `features/<x>/components/` share import depth `../../../../../` → moving between feature folders keeps relative imports valid.
- Do NOT change `settings.school_year`'s value; the overhaul restores cohorts by logic, not data edits.

---

### Task 1: Migration — roster table, toggles, backfill, RLS rewrites

**Files:**
- Create: `supabase/migrations/20260724100000_peer_facilitators_overhaul.sql`
- Create: `src/lib/peerFacilitatorsOverhaulMigration.test.ts`
- Apply via Supabase MCP `apply_migration` to `ydbpzzbbiwhlwqmweqzj`.

SQL:
1. `ALTER peer_facilitator_settings ADD applications_open bool default true`, `time_in_enabled bool default true`.
2. `CREATE TABLE peer_facilitators (id uuid pk, student_id varchar UNIQUE FK students ON DELETE CASCADE, peer_year text not null, source text default 'manual' CHECK IN ('application','manual'), application_id uuid FK applications ON DELETE SET NULL, added_by uuid, created_at timestamptz)` + index + RLS (student select own; staff select + all-write) + grants.
3. Backfill: insert one roster row per approved application (`DISTINCT ON (student_id) ... ORDER BY student_id, created_at DESC`, source `application`), `ON CONFLICT (student_id) DO NOTHING`.
4. Replace attendance insert policy: student owns row AND on roster AND `time_in_enabled`.
5. Replace application student-insert policy: own row AND `applications_open`.

**Interfaces produced:** table `peer_facilitators(student_id, peer_year, source, application_id, added_by)`; settings columns `applications_open`, `time_in_enabled`.

- [ ] Write migration SQL, add regex test, apply migration, regenerate `database.ts`, run test.

### Task 2: Student portal — roster-driven view + hours toggle

**Files:**
- Modify: `src/pages/student/features/volunteer/components/VolunteerView.tsx`
- Modify: `src/pages/student/features/volunteer/components/VolunteerTimeLog.tsx`

- Remove `.eq('school_year', activeYear)`. Query: roster row (maybeSingle), latest application (any year), settings (`applications_open`, `time_in_enabled`, `school_year`).
- Branches: on-roster → facilitator view + time log; else pending/rejected app → status; else open → apply; else → "Applications closed".
- `VolunteerTimeLog` gains `timeInEnabled` prop; Time In disabled + note when false; Time Out always enabled.

### Task 3: Staff nav wiring for a new `peer_facilitators` tab

**Files:**
- Modify: `src/pages/carestaff/types.ts` (ACTIVE_TABS + `'peer_facilitators'`)
- Modify: `src/pages/carestaff/utils.ts` (CARE_STAFF_TAB_FEATURES → `'forms'`; REFRESHABLE add; NAV_SECTIONS Administration item; HEADER_TITLES)
- Modify: `src/pages/CareStaffDashboard.tsx` (lazy import + `case 'peer_facilitators'`)

### Task 4: Relocate peer-facilitator components to `features/peerfacilitators/`

**Files (git mv, same depth → imports stay valid):**
- `features/forms/components/CareStaffVolunteerFormsTable.tsx` → `features/peerfacilitators/components/`
- `features/forms/components/CareStaffFacilitatorHours.tsx` → `features/peerfacilitators/components/`
- `features/forms/peerFacilitatorEmail.ts` (+ `.test.ts`) → `features/peerfacilitators/`

### Task 5: New page shell + Applications enhancements

**Files:**
- Create: `features/peerfacilitators/components/CareStaffPeerFacilitatorsPage.tsx` (3 sub-tabs)
- Modify: `features/peerfacilitators/components/CareStaffVolunteerFormsTable.tsx` — add `applications_open` toggle; relabel year box "Current application year"; on approve, upsert roster row (`source='application'`, `peer_year=app.school_year`, `application_id=app.id`, onConflict student_id ignoreDuplicates).

### Task 6: Active Facilitators section

**Files:**
- Create: `features/peerfacilitators/components/CareStaffActiveFacilitatorsTable.tsx`
- Roster ⨝ students list; source filter All/Applied/Added-by-staff; `time_in_enabled` toggle; Add (student ilike search + year); Remove (delete row, confirm). Dedupe via unique student_id.

### Task 7: Trim Forms page

**Files:**
- Modify: `features/forms/components/CareStaffFormsPage.tsx` — drop volunteers/hours tabs + tab bar + their imports; keep Needs Assessments; update header copy.

### Task 8: Verify

Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Spot-check advisors via MCP `get_advisors security`.
