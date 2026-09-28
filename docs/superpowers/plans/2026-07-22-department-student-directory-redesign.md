# Department Student Directory Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the department student card grid with a calm clickable directory list and reorganize the student profile into the shared accessible modal.

**Architecture:** Keep all existing paging, filtering, annotation, export, and mutation logic in `DeptStudentsPage.tsx`; replace only its presentation components. Reuse `ResolvedProfileImage`, native `details`/`summary`, and the shared `Modal` component so no dependency or shared-infrastructure change is needed.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, lucide-react, Vitest, Testing Library.

## Global Constraints

- Preserve all existing student data access, permissions, filters, paging, export, note, and at-risk behavior.
- Use one full-width responsive list; do not copy the Events page component or introduce a new component system.
- Use existing dependencies and shared components only.
- Do not change backend, database, routing, production configuration, or secrets.
- Do not commit, branch, or push unless the user explicitly asks.

---

### Task 1: Clickable Student Directory List

**Files:**
- Modify: `src/pages/dept/features/students/components/DeptStudentsPage.tsx:1-826`
- Test: `src/pages/dept/features/students/components/DeptStudentsPage.test.tsx:1-63`

**Interfaces:**
- Consumes: existing `studentsState`, `filteredData`, annotation service functions, and `setSelectedStudent` / `setShowStudentModal` callbacks.
- Produces: `DeptStudentRow`, a full-width row whose `View <name> profile` trigger opens the existing selected-student modal flow; native action menus retain note and risk mutations.

- [ ] **Step 1: Add failing interaction tests**

Extend the existing render setup with reusable callback mocks and add tests equivalent to:

```tsx
it('opens a student profile from the clickable row', async () => {
    const user = userEvent.setup();
    const setSelectedStudent = vi.fn();
    const setShowStudentModal = vi.fn();
    renderDirectory({ setSelectedStudent, setShowStudentModal });

    await user.click(screen.getByRole('button', { name: 'View Cejie Example profile' }));

    expect(setSelectedStudent).toHaveBeenCalledWith(expect.objectContaining({ student_id: '2026-001' }));
    expect(setShowStudentModal).toHaveBeenCalledWith(true);
});

it('keeps compact actions independent from profile navigation', async () => {
    const user = userEvent.setup();
    const setShowStudentModal = vi.fn();
    renderDirectory({ setShowStudentModal });

    await user.click(screen.getByRole('button', { name: 'Actions for Cejie Example' }));
    await user.click(screen.getByRole('menuitem', { name: 'Add note' }));

    expect(screen.getByPlaceholderText(/Add a short faculty note/i)).toBeInTheDocument();
    expect(setShowStudentModal).not.toHaveBeenCalled();
});
```

Import `userEvent` from `@testing-library/user-event` and extract the current render payload into `renderDirectory(overrides = {})` so both the existing annotation regression and the new interactions use identical data.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
npm test -- src/pages/dept/features/students/components/DeptStudentsPage.test.tsx
```

Expected: FAIL because the existing cards expose repeated `View Profile` buttons and no per-student actions menu.

- [ ] **Step 3: Replace the card presentation with the minimal row presentation**

In `DeptStudentsPage.tsx`:

1. Import `MoreHorizontal`, `Phone` only if needed, and `ResolvedProfileImage`; remove icons used only by the old colored pills and three-button card.
2. Add a small avatar renderer that keeps the initial behind the resolved image:

```tsx
const StudentAvatar = ({ student }: any) => (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-black text-emerald-800">
        {(student?.name || 'S').charAt(0).toUpperCase()}
        {student?.profile_picture_url && (
            <ResolvedProfileImage
                storedValue={student.profile_picture_url}
                studentId={String(student.student_id || student.id || '')}
                alt={`${student?.name || 'Student'} profile`}
                className="absolute inset-0 h-full w-full"
                previewOnClick={false}
                referrerPolicy="no-referrer"
            />
        )}
    </span>
);
```

3. Replace `DeptStudentCard` with `DeptStudentRow`. Use a stretched, absolutely positioned profile button with `aria-label={`View ${student.name} profile`}` so the row is clickable without nesting the checkbox and menu inside a button. Keep the checkbox and `details` controls above the overlay with `relative z-10`.
4. Render visible content in three restrained groups: identity, enrollment, and state/history. Use plain text and at most the Active/Inactive and At-Risk badges.
5. Implement the compact menu with native elements:

```tsx
<details className="relative z-20" onClick={(event) => event.stopPropagation()}>
    <summary
        role="button"
        aria-label={`Actions for ${student?.name || 'student'}`}
        className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 ${FOCUS_RING}`}
    >
        <MoreHorizontal size={18} />
    </summary>
    <div role="menu" className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
        <button type="button" role="menuitem" onClick={onOpenNoteEditor}>
            {savedNote ? 'Edit note' : 'Add note'}
        </button>
        <button type="button" role="menuitem" onClick={onToggleFlag}>
            {isFlagged ? 'Remove at-risk flag' : 'Flag as at-risk'}
        </button>
    </div>
</details>
```

Style both menu buttons as full-width, left-aligned 36px controls with clear hover and focus states. Close the containing `details` from each action with `event.currentTarget.closest('details')?.removeAttribute('open')` before invoking the existing handler.

6. Keep the existing inline note editor, but attach it below the row content with a top divider instead of a nested colored card.
7. Replace the `2xl:grid-cols-2` container with one `rounded-2xl border border-slate-200 bg-white` list using `divide-y divide-slate-100`; do not add row shadows.
8. Simplify the page header and toolbar: move the heading outside the toolbar, show totals as muted text, use one export-scope `<select>` and one Export CSV button, keep Select page always available, and show Flag selected only when `selectedCount > 0`.
9. Lighten `StudentsPaginationBar` to match the single bordered list while preserving page size, jump, previous, and next controls.

- [ ] **Step 4: Run the focused test and confirm it passes**

Run:

```powershell
npm test -- src/pages/dept/features/students/components/DeptStudentsPage.test.tsx
```

Expected: all `DeptStudentsPage` tests PASS, including the one-call annotation regression.

---

### Task 2: Organized Accessible Student Profile Modal

**Files:**
- Modify: `src/pages/dept/features/counseling/components/DeptViewFormModal.tsx:1-71`
- Create: `src/pages/dept/features/counseling/components/DeptViewFormModal.test.tsx`

**Interfaces:**
- Consumes: `showStudentModal`, `setShowStudentModal`, and `selectedStudent` from the existing dashboard modal props.
- Produces: the same close callback and selected-student display, now rendered through `Modal` with identity, enrollment, contact/personal, and address sections.

- [ ] **Step 1: Add a failing modal organization test**

Create a focused test that renders only the selected-student branch:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeptViewFormModal } from './DeptViewFormModal';

describe('DeptViewFormModal student profile', () => {
    it('organizes the directory profile in an accessible dialog', async () => {
        const user = userEvent.setup();
        const setShowStudentModal = vi.fn();
        render(
            <DeptViewFormModal
                showStudentModal
                setShowStudentModal={setShowStudentModal}
                selectedStudent={{
                    student_id: '2026-001',
                    name: 'Cejie Example',
                    email: 'cejie@example.test',
                    status: 'Active',
                    department: 'CAS (College of Arts and Sciences)',
                    course: 'Bachelor of Science in Computer Science (BSCS)',
                    year_level: '1st Year',
                    mobile: '09123456789',
                    sex: 'Female'
                }}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Student profile' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cejie Example' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Enrollment' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Contact & personal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close student profile' }));
        expect(setShowStudentModal).toHaveBeenCalledWith(false);
    });
});
```

- [ ] **Step 2: Run the modal test and confirm it fails**

Run:

```powershell
npm test -- src/pages/dept/features/counseling/components/DeptViewFormModal.test.tsx
```

Expected: FAIL because the current custom overlay has no dialog role and no organized section headings.

- [ ] **Step 3: Replace only the student-profile overlay with the shared modal**

Import `Modal`, `ResolvedProfileImage`, and the small set of lucide icons used by the identity and address rows. Leave the referral-form branch unchanged.

Render:

```tsx
const fullName = selectedStudent.name || [
    selectedStudent.first_name,
    selectedStudent.middle_name,
    selectedStudent.last_name,
    selectedStudent.suffix
].filter(Boolean).join(' ');
const address = [
    selectedStudent.street,
    selectedStudent.city,
    selectedStudent.province,
    selectedStudent.zip_code,
    selectedStudent.region
].filter(Boolean).join(', ');
const displayValue = (value: unknown) => value
    ? String(value)
    : <span className="font-normal text-slate-400">Not provided</span>;

<Modal
    open={showStudentModal && Boolean(selectedStudent)}
    onClose={() => setShowStudentModal(false)}
    title="Student profile"
    subtitle="Department directory record"
    size="lg"
    zIndex="z-[105]"
    footer={(
        <button type="button" aria-label="Close student profile" onClick={() => setShowStudentModal(false)}>
            Close
        </button>
    )}
>
    <section className="flex items-center gap-4 border-b border-slate-100 pb-5" aria-labelledby="student-profile-name">
        <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-100 text-xl font-black text-emerald-800">
            {(fullName || 'S').charAt(0).toUpperCase()}
            {selectedStudent.profile_picture_url && (
                <ResolvedProfileImage
                    storedValue={selectedStudent.profile_picture_url}
                    studentId={String(selectedStudent.student_id || selectedStudent.id || '')}
                    alt={`${fullName || 'Student'} profile`}
                    className="absolute inset-0 h-full w-full"
                    previewOnClick={false}
                    referrerPolicy="no-referrer"
                />
            )}
        </span>
        <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
                <h2 id="student-profile-name" className="text-xl font-bold text-slate-900">{fullName || 'Unnamed student'}</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {selectedStudent.status || 'Unknown'}
                </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{selectedStudent.student_id || selectedStudent.id || 'Student ID not provided'}</p>
            <p className="mt-1 break-all text-sm text-slate-600">{selectedStudent.email || 'Email not provided'}</p>
        </div>
    </section>

    <section className="pt-5">
        <h3 className="text-sm font-bold text-slate-900">Enrollment</h3>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
                ['College', selectedStudent.department],
                ['Program', selectedStudent.course],
                ['Year level', selectedStudent.year_level || selectedStudent.year],
                ['Section', selectedStudent.section]
            ].map(([label, value]) => (
                <div key={String(label)}>
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">{displayValue(value)}</dd>
                </div>
            ))}
        </dl>
    </section>

    <section className="mt-5 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-900">Contact &amp; personal</h3>
        <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
                ['Contact number', selectedStudent.mobile || selectedStudent.contact_number],
                ['Sex assigned at birth', selectedStudent.sex]
            ].map(([label, value]) => (
                <div key={String(label)}>
                    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-800">{displayValue(value)}</dd>
                </div>
            ))}
        </dl>
    </section>

    <section className="mt-5 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-bold text-slate-900">Permanent address</h3>
        <p className="mt-2 text-sm font-semibold text-slate-800">{displayValue(address)}</p>
    </section>
</Modal>
```

Use semantic `dl`, `dt`, and `dd` elements for the field groups. Render `Not provided` with muted text whenever a value is empty. Use the same initials-behind-image fallback as the list. Keep the modal read-only and do not pass note or flag mutations into it.

- [ ] **Step 4: Run both focused suites**

Run:

```powershell
npm test -- src/pages/dept/features/students/components/DeptStudentsPage.test.tsx src/pages/dept/features/counseling/components/DeptViewFormModal.test.tsx
```

Expected: both suites PASS.

---

### Task 3: Responsive and Repository Verification

**Files:**
- Verify: `src/pages/dept/features/students/components/DeptStudentsPage.tsx`
- Verify: `src/pages/dept/features/counseling/components/DeptViewFormModal.tsx`

**Interfaces:**
- Consumes: the two completed UI changes.
- Produces: a verified desktop/mobile directory and profile flow with no unrelated source changes.

- [ ] **Step 1: Run static checks and production build**

Run each command separately so failures remain attributable:

```powershell
npm run lint
npm run typecheck
npm run build
```

Expected: all commands exit 0. If repository-wide lint reports pre-existing failures outside the touched files, run ESLint on the touched files and record both results.

- [ ] **Step 2: Run React Doctor**

Run:

```powershell
npm run doctor -- --verbose
```

Expected: no new errors attributed to the changed Students or modal files.

- [ ] **Step 3: Verify the live portal at desktop width**

Open `http://localhost:5173/department/dashboard/students` in the authenticated local portal and verify at approximately 1440px wide:

- one full-width divided list, not a two-column card grid;
- row click opens the intended student;
- checkbox and actions menu do not open the modal;
- Add/Edit Note expands the correct row;
- Flag/Remove At-Risk updates the correct row;
- filters, export scope, export disabled states, paging, and selection remain usable;
- profile modal sections, missing-value fallbacks, close button, backdrop click, and Escape work.

- [ ] **Step 4: Verify responsive behavior**

Check approximately 390px and 768px widths. Confirm metadata stacks without horizontal overflow, long program/email content does not escape the row, actions remain reachable, modal content scrolls, and all controls retain visible focus states.

- [ ] **Step 5: Review the final diff**

Run:

```powershell
git diff -- src/pages/dept/features/students/components/DeptStudentsPage.tsx src/pages/dept/features/students/components/DeptStudentsPage.test.tsx src/pages/dept/features/counseling/components/DeptViewFormModal.tsx src/pages/dept/features/counseling/components/DeptViewFormModal.test.tsx docs/superpowers/specs/2026-07-22-department-student-directory-redesign.md docs/superpowers/plans/2026-07-22-department-student-directory-redesign.md
```

Expected: only the approved directory, modal, tests, and planning documents appear; no unrelated user changes are modified.
