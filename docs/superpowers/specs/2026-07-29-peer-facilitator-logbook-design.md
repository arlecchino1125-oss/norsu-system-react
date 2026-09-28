# Peer Facilitator Logbook (Peer Support) — Design

- **Date:** 2026-07-29
- **Status:** Approved for planning
- **Area:** Student portal + Care Staff portal + Supabase (peer facilitators)

## Problem

Peer facilitators do peer support work today and record it on paper: *PEER
FACILITATOR MONITORING LOGBOOK (Peer Support)*, a monthly sheet the peer keeps and
Guidance Center staff review. None of it reaches the system.

Peer facilitator attendance records clock-in/clock-out and nothing else, so the
office knows peers logged hours and nothing about what happened in them. The peer
support sessions themselves — what was discussed, what was done, what needs
follow-up — exist only on paper, one sheet per peer per month, or not at all.

This digitises that sheet. Nothing more.

## Goals

- A peer records each peer-support session from their phone, any time during the
  month.
- A peer can see their month's entries and edit any one of them.
- The month accumulates into a logbook staff review and approve; approved months
  land in the peer's archive, downloadable in the paper layout.

## Non-goals

- **The referral column is a yes/no and nothing else.** No counseling request is
  created, no destination is recorded, no one is notified. The office learns that
  a referral happened, the same as the paper form tells them. Wiring peers into
  the counseling queue is a later feature; this column is its hook.
- **No signatures captured.** Signature lines print blank and are signed by hand
  after printing.
- **No peer support intake queue.** Students requesting a peer through the system
  appears nowhere on the source form.
- No changes to attendance/hours. The logbook is the *content* record; hours are
  the *time* record. They stay independent.
- No peer visibility into counseling records.
- The staff-side hours work (date-range export, session correction, archived
  roster view) is parked — a separate, earlier design.

## No server-side code

With the referral reduced to a boolean, nothing in this feature needs privileged
execution. No edge function, no RPC, no trigger. Two tables, RLS, and UI.

## The form is a print target, not a layout

This digitises the logbook; it does not reproduce it on screen. The eight-column
sheet is unusable on a phone and there is no reason to force it anywhere in the
UI. Every screen is a stacked detail view. The paper layout exists in exactly one
place: the PDF export, which reproduces the source form for filing.

The consequence is one logbook component serving three contexts — peer's current
month (editable), peer's archive (read-only), staff review (read-only plus the
approval stamp). Two flags, not three implementations.

## Source form → system

| Logbook column | Field |
|---|---|
| Date | `entry_date` |
| Type of Activity/Interaction | `activity_type` |
| Name of Student Assisted *(Optional/Initials only)* | `assisted_student_id` (nullable) + `assisted_initials` (nullable) |
| Concern/Topic Discussed | `concern` |
| Action Taken/Assistance Provided | `action_taken` |
| Referred to Guidance…(Yes/No) | `referred` boolean |
| Remarks/Follow-up Plan | `remarks` |
| Signature of PEERkada | *not stored; prints blank* |

Header fields (Peer Facilitator Name, Program/Year/Section) derive from the
`students` row; Month Covered is `peer_facilitator_logbooks.month`. The Peer
Facilitator Signature line prints blank; *Reviewed by* prints the reviewer's name
and date.

## Data model

### `peer_facilitator_logbooks` — the monthly artifact

| column | notes |
|---|---|
| `id` | uuid pk |
| `student_id` | the peer; FK `students(student_id)` ON DELETE CASCADE |
| `month` | date, first of month |
| `status` | text CHECK IN (`'draft'`,`'submitted'`,`'approved'`), default `'draft'` |
| `submitted_at` | timestamptz nullable |
| `reviewed_by` | uuid nullable, staff auth uid |
| `reviewer_name` | text nullable |
| `reviewed_at` | timestamptz nullable |

UNIQUE `(student_id, month)`.

### `peer_facilitator_log_entries` — one session

| column | notes |
|---|---|
| `id` | uuid pk |
| `logbook_id` | FK `peer_facilitator_logbooks(id)` ON DELETE CASCADE |
| `entry_date` | date; must fall within the logbook's month |
| `logged_at` | timestamptz default now(); disambiguates same-day entries on the card list |
| `activity_type` | text |
| `assisted_student_id` | nullable FK `students(student_id)` ON DELETE SET NULL |
| `assisted_initials` | text nullable |
| `concern` | text |
| `action_taken` | text |
| `remarks` | text nullable |
| `referred` | boolean default false |

No "create logbook" action: the first entry of a month upserts its logbook on
`(student_id, month)`.

The assisted-student field does three things, all optional, because the source
form marks the column optional and confidentiality-sensitive:

- Pick from search → stores `assisted_student_id`, displays initials
- Type initials freehand → stores `assisted_initials` only, no link
- Leave blank → allowed

`activity_type` is free text backed by a native `<datalist>` of suggestions, not a
managed dropdown. Free text means the office never needs an admin screen to add an
activity; the suggestions keep reporting groupable.

### RLS

- Peer: `SELECT` own logbooks in any status; `INSERT`/`UPDATE`/`DELETE` entries
  only while the parent logbook is `status = 'draft'`. The draft check lives in
  `USING`, so a submitted month is immutable with no trigger.
- Peer: `UPDATE` own logbook `draft → submitted` only.
- Care Staff / Admin: `SELECT` all; own the `submitted → approved` and
  `submitted → draft` transitions.

Roster membership (`peer_facilitators`, `archived_at IS NULL`) gates insert, the
same rule the attendance insert policy uses.

## Student UI

New lazy `PeerLogbook.tsx`, rendered in the facilitator branch of `VolunteerView`
alongside `VolunteerTimeLog`.

**The logbook** — month selected with a native `<input type="month">`. Entries
stack as cards showing **two lines only: date and activity type**, with the logged
time to separate same-day entries and a badge when `referred` is true. No student
name, no initials, no concern text on the list — nothing identifying survives to a
screen readable over a shoulder.

**The entry** — tapping a card opens the full record: every field including the
assisted student, stacked vertically, read-only by default with an Edit button
beside it. Once the logbook is `submitted` or `approved`, the same view opens and
the Edit button is simply not rendered — the locked state is the default state
with nothing added.

**Logging a session** — the same stacked form in create mode. Assisted-student
search reuses the `AddFacilitatorModal` query shape (ilike across first name /
last name / student ID, enabled at 2+ characters), capped at 5 results. Before the
peer types, the list shows their 5 most recently logged students — peers see the
same people across follow-ups, so it is usually a one-tap pick.

**Submit** locks the month and sends it for review. No signature. A notice
appears on the logbook as the month nears its end (system time) prompting the peer
to submit — the paper sheet is a monthly hand-in and nothing else would remind
them.

**Archive** — approved months collect in a read-only list on the same page. They
persist in the app whether or not the peer downloads them; the PDF is offered, not
required.

## Staff UI

Staff reach a logbook **through the peer**, not through a list of logbooks. The
roster is already the place staff look up a facilitator, so the logbook hangs off
that rather than becoming a parallel index of the same people.

1. **Active Facilitators** rows gain a small status chip — *"Logbook submitted"* —
   so a month awaiting review is visible without opening anything.
2. Clicking a facilitator opens their detail with a **Peer Support** tab.
3. The tab lists that peer's monthly logbooks, most recent first.
4. Opening one renders **the same logbook component the peer sees**, read-only —
   same cards, same stacked entry view. Not a table.
5. Opening an entry shows all eight fields stacked vertically, read-only.
6. **Approve** stamps `reviewer_name` and `reviewed_at` and moves the logbook to
   `approved`. That is what puts it in the peer's archive.

**Return to peer** moves `submitted → draft`, so a locked month with a forgotten
entry has a way out.

**Export PDF** reproduces the source form — eight columns, header and footer
fields, signature lines blank — via the existing `loadJsPdfAutoTable`. Available to
staff and, for approved months, to the peer.

## Migration

Single migration, and the only backend work in the feature: both tables, RLS
policies, the unique index on `(student_id, month)`, an index on
`(logbook_id, entry_date)`, and an index on `assisted_student_id` for the
recent-students lookup.

## Deliberate simplifications

**No signature capture.** `react-signature-canvas` is already a dependency and
already drives the referral pad in `DeptReferralModal`, so adding pads later is
small. For now the lines print blank and are signed on paper.

**No admin screen for activity types.** The `<datalist>` is a hardcoded list of
suggestions and the field accepts anything, so an unanticipated activity is typed,
not blocked. Promote to a managed table only if reporting demands a closed set.

**`referred` carries no destination.** The source form asks a yes/no question and
the column answers it. A destination, a linked counseling request, and staff
follow-up belong to the referral feature, not this one.

## Verification checks

- A peer can add, edit, and delete entries in the current month, and cannot touch
  a submitted one — enforced by policy, verified with a direct PostgREST call, not
  just a hidden button.
- Entry dates outside the logbook's month are rejected.
- A student not on the roster cannot insert entries at all.
- Approving stamps reviewer name and date and surfaces the month in the peer's
  archive; return-to-peer reopens editing.
- The card list renders no student name or initials in any status.
- PDF export reproduces the eight columns in the source form's order, with the
  signature lines blank.

## Test

One `.test.ts` covering the month-boundary rule on entry dates and the
draft-only-edit rule, matching the existing `src/lib/*Migration.test.ts` pattern.
