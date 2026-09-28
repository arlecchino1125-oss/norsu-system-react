# Department Student Directory Redesign

## Goal

Make the department Students page easier to scan on desktop, friendlier to use, and visually consistent with the redesigned Events page without duplicating it. Preserve the existing search, filters, paging, selection, notes, at-risk flags, exports, and data access.

## Approved Direction

Use one full-width directory list with divided rows. Each student row is the primary profile entry point; secondary actions move into a compact native actions menu.

## Page Structure

1. A plain page header shows `Student Directory` and a short summary of filtered students and flagged students.
2. A compact toolbar contains search, course/year/status filters, export scope, and one export button.
3. Selection controls sit above the list. Bulk flagging appears only when at least one student is selected.
4. One bordered list replaces the two-column card grid. Rows are separated by dividers, following the Events page's calm rhythm.
5. Existing pagination remains below the list with lighter visual treatment.

## Student Row

- Show profile photo when available, with the student's initial as fallback.
- Keep the visible information limited to name, email, program, year/section, status, at-risk state, and counseling count.
- Make the row's main surface clickable and keyboard accessible; it opens the student profile modal.
- Keep the selection checkbox independent from profile navigation.
- Use a native `details`/`summary` actions menu for Add/Edit Note and Flag/Remove At-Risk.
- Expanding Add/Edit Note reveals the existing note editor directly below that row.
- Nested controls must not trigger profile navigation.

## Profile Modal

Use the existing shared `Modal` component for focus trapping, Escape handling, backdrop behavior, and dialog semantics.

The body contains:

- An identity block with profile photo/initial, name, status, student ID, and email.
- An Enrollment section for college, program, year level, and section.
- A Contact & Personal section for contact number and sex assigned at birth.
- A full-width Permanent Address row.
- Clear `Not provided` fallbacks instead of ambiguous dashes.

The modal stays read-only and keeps a single Close action.

## Responsive Behavior

- Desktop and tablet use the same single-column list for predictable scanning.
- At narrower widths, row metadata stacks below the identity block and the actions menu stays at the trailing edge.
- Controls retain visible focus states and usable touch targets.
- Long names, emails, and programs wrap or truncate without overflowing.

## States and Accessibility

- Preserve loading, empty, disabled, selected, flagged, hover, and focus states.
- Keep native labels on filters and selection controls.
- The profile trigger receives a descriptive accessible name.
- The actions menu has a descriptive label per student.
- Existing shared modal accessibility behavior is reused rather than reimplemented.

## Implementation Scope

- Redesign `DeptStudentsPage.tsx` while preserving its existing data and mutation logic.
- Replace only the student-profile portion of `DeptViewFormModal.tsx` with the shared modal structure.
- Add focused regression tests for clickable profile rows, independent compact actions, and modal organization.
- No backend, database, dependency, routing, or permission changes.

## Verification

- Run the focused Students and modal tests.
- Run lint, typecheck/build, and React Doctor.
- Verify the page at desktop and mobile widths in the signed-in department portal.
- Check profile opening, menu actions, note expansion, flagging, selection, filters, export controls, paging, empty/loading states, focus behavior, and modal dismissal.
