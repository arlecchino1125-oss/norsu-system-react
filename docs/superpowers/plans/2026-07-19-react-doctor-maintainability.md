# React Doctor Maintainability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the 16 React Doctor maintainability warnings without changing application behavior.

**Architecture:** Hoist the two render-independent values to module scope. For boolean-heavy component APIs, group existing related booleans into one semantic state prop at each existing call site; keep handlers and rendering unchanged. Rename one callback whose `show*` name makes React Doctor mistake it for a boolean.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Doctor.

## Global Constraints

- Preserve current behavior, UI, architecture, and existing working-tree changes.
- Add no dependencies, variants, factories, or speculative abstractions.
- Do not commit, stage, push, or modify React Doctor configuration.
- Validate with React Doctor, typecheck, lint, tests, and production build.

---

### Task 1: Hoist render-independent event helpers

**Files:**
- Modify: `src/pages/carestaff/features/events/components/CareStaffEventsPage.tsx:31`

**Interfaces:**
- Produces: module-level `getStudentName(student)` and `REGISTRANT_STATUS_OPTIONS`.

- [ ] Move the existing `studentName` function above `AttendeesModal`, rename it to `getStudentName`, and update its one use.
- [ ] Move the existing registrant status array above `RegistrantsModal` as `REGISTRANT_STATUS_OPTIONS` and update its use.
- [ ] Run `npm run typecheck`; expect exit code 0.

### Task 2: Group local card and modal state props

**Files:**
- Modify: `src/pages/admin/features/permissions/components/RolePermissionsPage.tsx:472`
- Modify: `src/pages/admin/features/staff/components/StaffAccountsPanel.tsx:12`
- Modify: `src/pages/carestaff/features/nat/components/NatScheduleModal.tsx:10`
- Modify: `src/pages/carestaff/features/nat/components/CareStaffNatPage.tsx:1345`
- Modify: `src/pages/carestaff/features/population/components/EnrollmentKeysModal.tsx:64`
- Modify: `src/pages/carestaff/features/population/components/CareStaffPopulationPage.tsx:742`
- Modify: `src/pages/dept/features/students/components/DeptStudentsPage.tsx:122`

**Interfaces:**
- `PermissionCard` consumes `cardState` with the five existing permission booleans.
- `StaffAccountRow` consumes `rowState` with the four existing row booleans.
- `NatScheduleModal` consumes `modalState` with its four existing modal booleans.
- `EnrollmentKeysModal` consumes `modalState` with permission, pending, sync, and visibility booleans.
- `DeptStudentCard` consumes `cardState` with active, selected, flagged, and editing booleans.

- [ ] Replace each listed group of top-level boolean props with one inline state object at its existing caller.
- [ ] Destructure the same boolean names from that object inside the component body; leave every branch and handler unchanged.
- [ ] Run `npm run typecheck`; expect exit code 0.

### Task 3: Group department workflow state props

**Files:**
- Modify: `src/pages/dept/features/counseling/components/DeptCounselingQueuePage.tsx:155`
- Modify: `src/pages/dept/features/support/components/DeptSupportApprovalsPage.tsx:519`
- Modify: `src/pages/dept/components/DeptModulePages.tsx:91`

**Interfaces:**
- Counseling consumes `modalState` and `submissionState` objects.
- Support approvals consumes `modalState` and `submissionState` objects.

- [ ] Group each page's existing modal visibility booleans into `modalState` at the single caller.
- [ ] Group each page's existing submission booleans into `submissionState` at the same caller.
- [ ] Destructure those values inside each page component without changing modal conditions or disabled states.
- [ ] Run `npm run typecheck`; expect exit code 0.

### Task 4: Group NAT and student screen state props

**Files:**
- Modify: `src/pages/NATPortal.tsx:1419`
- Modify: `src/pages/student/features/auth/components/ForgotPasswordModal.tsx:10`
- Modify: `src/pages/student/pages/StudentLoginPage.tsx:332`
- Modify: `src/pages/student/features/dashboard/components/StudentDashboardView.tsx:248`
- Modify: `src/pages/student/layout/StudentPortalShell.tsx:16`
- Modify: `src/pages/student/pages/StudentPortalPage.tsx:297`

**Interfaces:**
- `NatWizardScreen` and `NatDashboardScreen` consume `screenState` objects.
- `ForgotPasswordModal` consumes a typed `status` object containing its five existing booleans.
- `StudentDashboardView` and `StudentPortalShell` consume `viewState` objects.

- [ ] Replace the top-level boolean props with the named state objects at existing call sites.
- [ ] Preserve each existing local boolean name by destructuring from its state object inside the component.
- [ ] Run `npm run typecheck`; expect exit code 0.

### Task 5: Clarify the event notification callback

**Files:**
- Modify: `src/pages/student/features/events/components/StudentEventsView.tsx:723`
- Modify: `src/pages/student/pages/StudentPortalPage.tsx:426`

**Interfaces:**
- `StudentEventsView` consumes `notify` instead of the misleading non-boolean `showToast` callback prop.

- [ ] Rename only the component prop and internal callback references from `showToast` to `notify`; pass the existing `showToast` function as `notify` at the caller.
- [ ] Run `npm run typecheck`; expect exit code 0.

### Task 6: Verify the cleanup

**Files:**
- Test: existing project suite plus `src/lib/managedRecordDeletionConcurrency.test.ts`.

- [ ] Run `npx react-doctor@latest . --json --category maintainability --yes`; expect 0 diagnostics.
- [ ] Run `npx react-doctor@latest . --verbose --yes`; expect 0 total issues and score 100.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test -- --reporter=dot`, and `npm run build`; expect successful exits with no new errors.
- [ ] Run `git diff --check`; report unrelated pre-existing whitespace findings without editing them.
