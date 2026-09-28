# React Doctor Performance Zero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the full-codebase React Doctor Performance category from 133 warnings to zero without changing application behavior or design.

**Architecture:** Keep every fix local to the reported expression. Replace redundant collection passes with one-pass native array operations, build lookup sets once per surrounding operation, parallelize only independent asynchronous work, and narrowly document order-sensitive loops that must remain sequential.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase Edge Functions, React Doctor 0.8.1.

## Global Constraints

- Preserve the dirty working tree and all unrelated user changes.
- Do not add dependencies, commit, stage, push, or change production configuration.
- Treat `npx -y react-doctor@latest --json --category performance --yes` as the red/green regression check.
- Run existing focused tests for transformed services and utilities; add a test only when behavior changes or a new helper is introduced.
- Keep ordered database writes, rate-limited operations, and dependent retries sequential and use a narrow scanner suppression with an explanation.

---

### Task 1: Render-Time Initialization and Motion

**Files:**
- Modify: `src/pages/student/hooks/useStudentPortalRefresh.ts`
- Modify: `src/pages/student/hooks/useStudentProfileCompletionGate.ts`
- Modify: `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx`
- Modify: `src/pages/student/features/volunteer/components/VolunteerView.tsx`
- Modify: `src/pages/student/components/StudentHero.tsx`
- Modify: `supabase/functions/manage-nat-applications/natAttendance.ts`
- Modify: `src/pages/NATPortal.tsx`

- [ ] Confirm the seven diagnostics with the Performance scan.
- [ ] Lazy-initialize expensive state/ref values, hoist constant `Intl.DateTimeFormat` instances, replace handler-only state with a ref, and change `scale: 0` to `scale: 0.95` with opacity.
- [ ] Run typecheck and the Performance scan; expect these seven diagnostics to disappear with no replacements.

### Task 2: Client Collection Passes

**Files:**
- Modify only the reported React page, component, and hook files under `src/pages/`.

- [ ] For each exact `.map(...).filter(Boolean)` occurrence, preserve falsy-dropping semantics with one-pass `flatMap`.
- [ ] For reported `.filter(...).map(...)`, `.map(...).filter(...)`, and `.filter(...).filter(...)` chains, combine the predicates/transformation into one native pass.
- [ ] Run typecheck and the Performance scan; expect the client-side `js-flatmap-filter` and `js-combine-iterations` counts to reach zero.

### Task 3: Service and Edge-Function Collection Passes

**Files:**
- Modify only reported files under `src/services/`, `src/utils/`, and `supabase/functions/`.

- [ ] Apply the same one-pass transforms without changing result ordering or falsy handling.
- [ ] Run the relevant existing service/utility tests.
- [ ] Run typecheck and the Performance scan; expect both collection-iteration rules to reach zero globally.

### Task 4: Repeated Membership Lookups

**Files:**
- Modify the nine files reported for `js-set-map-lookups`.

- [ ] Build each `Set` once outside its surrounding loop or array callback and replace repeated `.includes()` calls with `.has()`.
- [ ] Keep genuinely tiny fixed lookup arrays inline only if documented with a narrow scanner suppression.
- [ ] Run typecheck and the Performance scan; expect `js-set-map-lookups` to reach zero.

### Task 5: Async Scheduling

**Files:**
- Modify the files reported for `async-await-in-loop`, `async-parallel`, and `async-defer-await`.

- [ ] Trace each loop's side effects and dependencies before editing.
- [ ] Use `Promise.all` only for independent operations; preserve result ordering through `Promise.all` result order.
- [ ] Move the export-center await below its synchronous early return.
- [ ] Keep order-sensitive or rate-limited loops sequential with a line-local documented scanner suppression.
- [ ] Run focused tests, typecheck, and the Performance scan; expect all async Performance rules to reach zero.

### Task 6: Full Verification

**Files:**
- Review all changed files; do not modify unrelated dirty files.

- [ ] Run the Bugs-only React Doctor scan and confirm Bugs remains zero.
- [ ] Run the full Performance scan and confirm zero diagnostics.
- [ ] Run `npm test -- --run --reporter=dot`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- [ ] Run the full React Doctor scan and report the remaining non-Performance categories exactly.
