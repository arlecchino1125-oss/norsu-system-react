# Peer Facilitators Page — Code Analysis

**Scope:** The `peer_facilitators` tab in the CARE Center staff portal only.
**Date:** 2026-08-01
**Portal:** Care Staff (`src/pages/carestaff`)

---

## 1. Overview

The Peer Facilitators page is the staff-side management surface for the CARE
Center's peer facilitator program. It is a three-tab shell:

| Tab | Component | Job |
|-----|-----------|-----|
| **Applications** | `CareStaffVolunteerFormsTable` | Review student applications, approve/reject, control the application form (open/close + school year) |
| **Active Facilitators** | `CareStaffActiveFacilitatorsTable` | View the roster, add students manually, archive/restore, toggle student hours logging |
| **Facilitator Hours** | `CareStaffFacilitatorHours` | Per-day attendance (DTR view) rolled up from time-in/time-out punches |

It is **lazy-loaded** into the dashboard:

```
CareStaffDashboard.tsx:39   const CareStaffPeerFacilitatorsPage = lazy(() => import('./carestaff/features/peerfacilitators/components/CareStaffPeerFacilitatorsPage'));
CareStaffDashboard.tsx:211  case 'peer_facilitators': return <CareStaffPeerFacilitatorsPage functions={functions} refreshSignal={viewRefreshSignal} />;
```

Props the page receives: `functions` (gives it `showToast`) and `refreshSignal`
(an incrementing number that bumps React Query keys so a global dashboard
refresh re-fetches everything).

---

## 2. File Map

### Feature directory — `src/pages/carestaff/features/peerfacilitators/`

```
components/
  CareStaffPeerFacilitatorsPage.tsx    tab shell + toolbar portal host
  CareStaffVolunteerFormsTable.tsx     Applications tab (+ ApplicationReviewModal)
  CareStaffActiveFacilitatorsTable.tsx Active roster (+ AddFacilitatorModal + archive confirm)
  CareStaffFacilitatorHours.tsx        Hours tab (+ FacilitatorDtrModal)
  CareStaffPeerSupportModal.tsx        facilitator detail: logbooks + entries + PDF export
peerFacilitatorEmail.ts                payload builder for approve/reject email
peerFacilitatorEmail.test.ts
components/CareStaffPeerFacilitatorsPage.test.tsx
```

### Shared pieces the page depends on

| File | What it contributes |
|------|---------------------|
| `src/utils/peerLogbook.ts` | `LOG_ENTRY_COLUMNS`, `LOGBOOK_STATUS_TONE`, `facilitatorName`, month helpers |
| `src/utils/peerLogbookPdf.ts` | `exportLogbookPdf` — landscape PDF with blank signature lines |
| `src/utils/volunteerHours.ts` | `sessionHours`, `totalHours`, `formatHours`, `splitAmPm`, `sessionDate` |
| `src/components/peerLogbook/PeerLogbookMonth.tsx` | Read-only entry list inside the staff logbook modal |
| `src/components/peerLogbook/PeerLogEntryModal.tsx` | Entry read view (used read-only by staff) |
| `src/lib/transactionalEmail.ts` | `sendTransactionalEmailNotification` (fire-and-forget email) |

---

## 3. Component Breakdown

### 3.1 `CareStaffPeerFacilitatorsPage` — the shell

- Local state: `activeTab`, `applicationToolbarHost`.
- Tabs are data-driven (`TABS` array with `key | label | icon`).
- **Toolbar portal pattern:** when the Applications tab is active it renders a
  hidden host `<div ref={setApplicationToolbarHost}>` inside the tab bar
  (right-aligned at `2xl` breakpoints). The table component later portals its
  controls into that host via `createPortal`. This keeps the application
  controls visually attached to the tab row while the state lives in the table.
- Renders exactly one child component based on the active tab.

### 3.2 `CareStaffVolunteerFormsTable` — Applications tab

**Settings query** (`peer_facilitator_settings` row id=1):
- `activeYear` = `settings.school_year`
- `applicationsOpen` = `settings.applications_open ?? true`

**Mutations (both target settings row id=1):**
- `toggleApplicationsMutation` — flip `applications_open`, toast on success.
- `saveYearMutation` — write `school_year` (the "Application year" field). On
  success it resets `yearFilter` + `yearDraft` and toasts "New applications will
  be tagged with it."

**Applications query** — `peer_facilitator_applications` joined to `students`
(via `student_id`) for name, course, contact details; ordered by `created_at
desc`. **All rows are fetched; pagination/filtering is client-side** (10/page).

**The review list has a hard rule (client-side):**

```ts
if (app.status === 'approved') return false;   // promoted to roster → drops out of this list
```

`approved` applications never appear here — the record is kept in the table but
the student now lives on the Active Facilitators roster. The status filter
buttons are therefore only `['all', 'pending', 'rejected']`.

**Filtering:** search (name or student_id, lowercased) + status filter +
optional year window (`selectedYear = yearFilter ?? activeYear`). Resets page
to 1 on any filter change.

**Approve = roster upsert (the core side effect), in `updateStatusMutation`:**

```ts
if (status === 'approved' && selectedApplication) {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from('peer_facilitators').upsert({
        student_id: selectedApplication.student_id,
        peer_year: selectedApplication.school_year || '',
        source: 'application',
        application_id: selectedApplication.id,
        added_by: userData.user?.id ?? null,
        archived_at: null            // re-approving un-archives a prior archive
    }, { onConflict: 'student_id' });
}
```

This is the single funnel that keeps "approved applicants" and
"staff-added facilitators" in one roster list. The `onConflict: 'student_id'`
upsert means a previously-archived facilitator is silently reactivated on
re-approval.

**On success of any status update:**
1. Invalidates `care-staff-volunteer-apps` **and** `care-staff-active-facilitators`.
2. Toasts "Application status updated successfully."
3. Sends a **fire-and-forget** status email via
   `sendTransactionalEmailNotification(buildPeerFacilitatorStatusEmailPayload(...))`;
   if the email fails it toasts an error but does not roll back the status.
4. Closes the review modal.

**Review modal (`ApplicationReviewModal`):**
- Reads applicant details + submission text (organizations, motivation, skills, commitment).
- Approve/Reject buttons only render while status is `pending`.
- `isUpdating` disables all buttons during the mutation.

### 3.3 `CareStaffActiveFacilitatorsTable` — Active roster

**Settings** — same `peer_facilitator_settings` query. Supplies `timeInEnabled`
and `defaultYear` (the school year prefilled into the add-student modal).

**Roster query** — `peer_facilitators` joined to `students`, filtered
`.is('archived_at', null)`, ordered newest first.

**"Logbook submitted" badge** — because `peer_facilitators` and
`peer_facilitator_logbooks` share no FK path, PostgREST can't embed one in the
other. A second query fetches **every** logbook row with `status = 'submitted'`,
builds a `Set` of `student_id`s, and the roster row shows an amber
"Logbook submitted" pill when the facilitator's id is in the set.

**Mutations:**
- `toggleTimeInMutation` — flip `settings.time_in_enabled` (the "Student hours
  logging" pause button in the header strip).
- `addMutation` — upsert a roster row with `source: 'manual'`,
  `added_by` = current staff user id, `archived_at: null`. Again `onConflict:
  'student_id'` — re-adding a previously archived student reactivates the row
  instead of colliding with the unique index.
- `archiveMutation` — soft delete: sets `archived_at` to now. Record is never
  destroyed.

**`AddFacilitatorModal` (nested):**
- Searches `students` (unarchived only) with a PostgREST `or()` across
  first/last name + id, `.limit(8)`.
- **`sanitizeTerm`** strips `, ( ) *` before building the query — those
  characters break PostgREST's `or()` grammar. (Input is staff-only, but the
  term still flows into a query string.)
- Query is `enabled: term.length >= 2`.
- Already-active students are filtered out client-side (`available`).
- The "Peer year" field is explicitly labeled **a label only, not an access
  limiter** (`<p>...it does not limit their access.</p>`).
- Selecting a student swaps the search list for a "Change"-able chip.

**Archive confirm modal** — explains nothing is deleted and that the
facilitator can be restored by re-adding/re-approving.

### 3.4 `CareStaffFacilitatorHours` — Hours tab

**Query** — all `peer_facilitator_attendance` rows (time_in/time_out joined to
students), ordered by `time_in desc`.

**Rollup logic (client-side):**
- `days` = distinct local calendar days across all sessions.
- One **DTR line per facilitator per day** — sessions are grouped by
  `student_id` via a `Map` reduce, sorted alphabetically by name with
  `toSorted`.
- **AM/PM split** by the hour the session *started* in (`< 12` → morning):
  `splitAmPm` in `volunteerHours.ts`.
- A DTR cell shows `spanLabel` — first `time_in` → last `time_out`, or
  "ongoing" when the latest session is still open.

**Empty states:**
- Loading → centered text.
- No sessions at all → a Card explaining that "Approved peer facilitators log
  their own time in and time out from the student portal" (the student portal
  writes `peer_facilitator_attendance`).

**Read-only table:** each row's Morning/Afternoon cells show the span label and
total hours; clicking a row opens `FacilitatorDtrModal` (morning/afternoon
cards + day total). No mutation on this tab — it is pure display.

### 3.5 `CareStaffPeerSupportModal` — facilitator detail (logbooks)

Opened by clicking a facilitator's name in the roster.

- **Books query** — `peer_facilitator_logbooks` for that student, ordered by
  month desc.
- **Entries query** — `peer_facilitator_log_entries` for the opened book,
  `enabled: !!openBookId` (so it doesn't fire for the list view).
- **`reopenMutation`** — sets a submitted book back to `status: 'draft'` and
  `submitted_at: null`. This is the **only** write in this modal.

**No approve action, deliberately.** Comment in code:

> A guidance counsellor signs the printed sheet as a counsellor; the system has
> no business recording an approval it never witnessed. Reopening stays,
> because a month marked submitted by mistake needs a way back.

So the staff path for a submitted logbook is: Export PDF → counsellor signs on
paper. `LOGBOOK_STATUS_TONE` still defines an `approved` style, but nothing in
this page can produce that status.

- **PDF export** — `exportLogbookPdf` (landscape, 8-column autoTable matching
  the paper form, **blank** signature + "Reviewed by" lines so the sheet is
  signed by hand).
- The entry list reuses `PeerLogbookMonth` in `readOnly` mode with no-op
  save/delete handlers. Entry modal is read-only too.
- Book list rows are month + status pill; the "Peer Support" tab strip is
  single-tab scaffolding for a future second view.

---

## 4. Data Access Summary

| Table | Usage on this page |
|-------|--------------------|
| `peer_facilitator_settings` (id=1 singleton) | `school_year`, `applications_open`, `time_in_enabled` |
| `peer_facilitator_applications` | review list + status writes + roster promotion |
| `peer_facilitators` | active roster (`.is('archived_at', null)`), add/archive upserts |
| `peer_facilitator_logbooks` | submitted-badge set, book list, reopen |
| `peer_facilitator_log_entries` | read-only entries per book |
| `peer_facilitator_attendance` | hours rollup (written by the **student** portal, not staff) |
| `students` | join for names/contact; staff-side search (RPC not needed here — staff have read access) |

---

## 5. State & Conventions

**Server state — React Query only** (matches the caching-single-layer rule).
Keys used:

```
['peer-facilitator-settings', refreshSignal]
['care-staff-volunteer-apps', refreshSignal]
['care-staff-active-facilitators', refreshSignal]
['care-staff-submitted-logbooks', refreshSignal]
['care-staff-facilitator-hours', refreshSignal]
['care-staff-peer-logbooks', studentId]
['care-staff-peer-log-entries', openBookId]
['facilitator-student-search', term]
```

All writes invalidate exactly the lists they affect (settings, apps+roster on
approve, roster on add/archive, books+submitted set on reopen). No local cache
for any of these.

**Client state — `useState`:** active tab, search terms, status/source/year
filters, page numbers, modal open flags, selected records.

**Portals:** the tab-bar toolbar (`createPortal(applicationControls,
toolbarHost)`) and modals (`document.body` / `anchorId="staff-content-region"`).

**ES2023 `toSorted`** is used for AM/PM split and name sorting (assumes a modern
runtime).

---

## 6. Key Business Rules (the ones worth not breaking)

1. **Approval promotes to roster; approved apps leave the review list.** The
   record is kept, the student shows up under Active Facilitators.
2. **Roster uniqueness is `student_id`.** Both approve and manual-add upsert on
   `onConflict: 'student_id'`; archive is soft (`archived_at`), and re-adding
   or re-approving reactivates the same row.
3. **`peer_year` / `school_year` is a display label only** — it never gates
   access or behavior.
4. **Archiving is reversible and non-destructive** — nothing is deleted.
5. **Staff never approve logbooks.** The counsellor signs the exported sheet.
   Staff can only reopen a mistakenly-submitted month.
6. **Email is best-effort.** Status updates commit regardless; a failed email
   only surfaces as an error toast.
7. **Logbook display is initials-only** and the assisted-student id is denormalized
   onto the entry at pick time, so displaying a logbook never requires
   permission to read another student's record.

---

## 7. Observations / Notes

- **The submitted-logbook badge query fetches every submitted row** just to
  build a `student_id` Set. Fine at campus scale; would want a
  distinct/joinable shape if the roster ever grows.
- **`getStatusStyle` and the `approved` tone are technically dead on this
  page** — approved rows are filtered out of the review list and nothing here
  sets a logbook to `approved`. Kept for the shared status vocabulary / future
  views.
- **`selectedApplication` is read from closure in the status mutation.** Safe in
  practice because the modal closes on success and only one review modal can be
  open, but the mutation isn't guarded against a stale reference if the modal
  were ever opened for a different record mid-flight.
- **List queries are un-paginated server-side** (full table, 10/page client
  slice). Acceptable for this dataset.
- **The single-tab "Peer Support" strip in the support modal** is deliberate
  scaffolding — the comment marks where a second facilitator view would slot in.
- The **PDF is the only place** the 8-column paper layout exists
  (`LOGBOOK_COLUMNS` in `peerLogbookPdf.ts`), mirroring the physical form
  1:1, including blank signature lines.
