# React Doctor Bugs-Zero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the full-codebase React Doctor `Bugs` category from 41 warnings to zero without changing product behavior or touching other diagnostic categories.

**Architecture:** Keep React Query data as the source of truth, derive display values during render, and reset local UI state in the event that changes its discriminator or through keyed remounts. Stabilize shared callbacks only where effects genuinely depend on them. Preserve the Supabase auth subscription as an external-system effect with one documented rule suppression.

**Tech Stack:** React 19, TypeScript, TanStack Query, Vitest, Testing Library, Vite, React Doctor.

## Global Constraints

- Work in the existing dirty working tree and preserve all unrelated edits.
- Leave every change unstaged and uncommitted.
- Add no dependencies and change no configuration, database schema, or UI design.
- Address only React Doctor diagnostics whose category is `Bugs`, plus directly coupled duplicate-fetch effects.
- Run the Bugs-only scan after each task group; finish with full lint, typecheck, tests, build, and a full React Doctor scan.

---

### Task 1: Let React Query own externally refreshed data

**Files:**
- Modify: `src/pages/carestaff/features/audit/components/CareStaffAuditLogsPage.tsx`
- Modify: `src/pages/carestaff/features/forms/components/CareStaffVolunteerFormsTable.tsx`

**Interfaces:**
- Consumes: existing `refreshSignal` number props.
- Produces: query keys containing `refreshSignal`; no imperative query refetch effect.

- [ ] **Step 1: Confirm the failing diagnostics**

Run: `npx react-doctor@latest --json --category bugs --yes`

Expected: three `query-no-query-in-effect` diagnostics across the two files.

- [ ] **Step 2: Encode refresh signals in query keys**

```tsx
useQuery({
    queryKey: ['care-staff-audit-logs', refreshSignal],
    queryFn: loadAuditLogs,
});

useQuery({
    queryKey: ['care-staff-volunteer-settings', refreshSignal],
    queryFn: loadSettings,
});

useQuery({
    queryKey: ['care-staff-volunteer-apps', refreshSignal],
    queryFn: loadApplications,
});
```

Remove the `lastExternalRefreshSignalRef` values and effects that call the returned `refetch` functions.

- [ ] **Step 3: Verify this rule reaches zero**

Run: `npx react-doctor@latest --json --category bugs --yes`

Expected: no `query-no-query-in-effect` diagnostics.

### Task 2: Return query data instead of forwarding it through effects

**Files:**
- Modify: `src/pages/student/features/counseling/hooks/useStudentCounselingData.ts`
- Modify: `src/pages/student/features/counseling/components/CounselingView.tsx`
- Modify: `src/pages/student/features/support/hooks/useStudentSupportData.ts`
- Modify: `src/pages/student/features/support/components/SupportView.tsx`
- Modify: `src/pages/student/features/scholarship/hooks/useStudentScholarships.ts`

**Interfaces:**
- Produces: `{ counselingRequests, refreshCounselingRequests }` and `{ supportRequests, refreshSupportRequests }` from the data hooks.
- Removes: setter callback arguments and mount-time manual refreshes.

- [ ] **Step 1: Write focused hook tests**

```tsx
expect(result.current.counselingRequests).toEqual(rows);
expect(result.current.supportRequests).toEqual(rows);
```

Run the new tests and confirm they fail because each hook currently returns only a refresh function.

- [ ] **Step 2: Return query data directly**

```tsx
const { data: counselingRequests = [], refetch } = useQuery({
    queryKey: ['student_counseling_data', studentId],
    queryFn: () => getStudentCounselingRequestsPage(
        studentId,
        { page: 1, pageSize: 100 },
        { column: 'created_at', ascending: false }
    ).then((result) => result.rows || []),
    enabled: Boolean(studentId),
    staleTime: 2 * 60 * 1000
});
return { counselingRequests, refreshCounselingRequests };
```

Apply the same pattern to support. Remove the child effects, local request-list state, setter props, and immediate mount refetch effects. In scholarships derive `scholarshipsList` and `myApplications` from query results instead of mirroring them into state.

- [ ] **Step 3: Verify tests and diagnostics**

Expected: hook tests pass; `no-pass-data-to-parent` and `no-pass-live-state-to-parent` remain only at the auth subscription exception.

### Task 3: Use stable identity and derived pagination

**Files:**
- Modify: `src/pages/dept/features/counseling/components/DeptHistoryModal.tsx`
- Modify: `src/pages/dept/features/counseling/components/DeptCounselingQueuePage.tsx`
- Modify: `src/pages/student/features/events/components/StudentEventsView.tsx`

**Interfaces:**
- Produces: stable history row keys and pagination that resets without effects.

- [ ] **Step 1: Confirm the three existing diagnostics**

Expected rules: `no-array-index-as-key`, `no-effect-chain`, `no-reset-all-state-on-prop-change`/`no-adjust-state-on-prop-change`.

- [ ] **Step 2: Replace index fallback with a stable record key**

```tsx
key={record.id || `${record.student_id}-${record.created_at}-${record.request_type}`}
```

- [ ] **Step 3: Derive department pagination from its filter signature**

```tsx
const pageKey = `${counselingTab}:${filteredRequestSignature}`;
const [pageState, setPageState] = useState({ key: pageKey, page: 1 });
const currentPage = pageState.key === pageKey ? Math.min(pageState.page, totalPages) : 1;
```

Update `goToPage` and page-size changes to store `{ key: pageKey, page }`; delete both pagination effects.

- [ ] **Step 4: Reset student event pagination in filter click handlers**

```tsx
const selectEventFilter = (nextFilter: string) => {
    setEventFilter(nextFilter);
    setEventsPage(1);
};
```

Replace the three direct filter setter calls and delete the filter effect.

- [ ] **Step 5: Verify the affected rule keys are absent**

Run the Bugs-only scan and the existing student-events test.

### Task 4: Derive analytics and update profile dependencies at the originating event

**Files:**
- Modify: `src/pages/carestaff/features/analytics/components/CareStaffAnalyticsPage.tsx`
- Modify: `src/pages/student/features/profile/components/ProfileView.tsx`

**Interfaces:**
- Produces: memoized filtered analytics and event-driven course/department updates.

- [ ] **Step 1: Replace mirrored analytics state**

```tsx
const analyticsData = qAnalyticsData || { submissions: [], answers: [] };
const filteredData = useMemo(() => filterAnalytics(analyticsData, filters), [analyticsData, filters]);
const stats = useMemo(() => processAnalyticsData(filteredData.submissions), [filteredData.submissions]);
```

Use query results directly for questions and departments, and keep only explicit comparison loading state.

- [ ] **Step 2: Move department lookup into the course change event**

Pass a course-specific change callback into `Field`. Set the selected course immediately; restore the original department when the original course is selected; otherwise fetch the matching department and apply it only if the course is still current. Delete the department-adjustment effect.

- [ ] **Step 3: Verify `no-effect-chain` and `no-derived-state` are absent**

Run the Bugs-only scan, typecheck, and the analytics/profile-related tests.

### Task 5: Initialize modal and service state without prop-adjustment effects

**Files:**
- Modify: `src/pages/student/features/counseling/components/CounselingFormModal.tsx`
- Modify: `src/pages/student/features/support/components/SupportFormModal.tsx`
- Modify: `src/pages/student/features/profile/components/ProfileCompletionModal.tsx`
- Modify: `src/pages/student/features/shared/components/ServiceIntroModal.tsx`
- Modify: `src/pages/student/StudentPortalViewRouter.tsx`

**Interfaces:**
- Produces: fresh conditionally mounted forms, lazy profile-draft restoration, and keyed service guides.

- [ ] **Step 1: Delete unreachable close-reset effects**

Counseling and support forms are conditionally mounted only while open, so retain `useState(createInitialCounselingForm)` and `useState(createInitialSupportForm)` and remove the `if (!isOpen)` effects.

- [ ] **Step 2: Restore profile drafts in lazy initializers**

```tsx
const [profileStep, setProfileStep] = useState(() => readStoredStep(initialData));
const [formData, setFormData] = useState(() => readStoredDraft(initialData));
```

Remove the `wasOpenRef` and first-open effect while preserving object-URL cleanup and storage synchronization.

- [ ] **Step 3: Key and lazily initialize service guides**

```tsx
<ServiceIntroModal key={route.serviceKey} serviceKey={route.serviceKey} />
const [show, setShow] = React.useState(() => !localStorage.getItem(storageKey));
```

- [ ] **Step 4: Verify `no-adjust-state-on-prop-change` decreases by four occurrences**

Run the Bugs-only scan and modal/service tests.

### Task 6: Reset profile-completion state with a session-keyed remount

**Files:**
- Modify: `src/pages/student/pages/StudentPortalPage.tsx`
- Modify: `src/pages/student/hooks/useStudentProfileCompletionGate.ts`
- Modify: `src/pages/student/features/profile/profileFormUtils.ts`
- Test: `src/pages/student/hooks/useStudentProfileCompletionGate.test.tsx`

**Interfaces:**
- Produces: portal state keyed by authenticated student identity and synchronously initialized completion-gate state.

- [ ] **Step 1: Write a failing gate initialization test**

Store a pending profile record, render the hook, and assert the pending fields and forced-reminder state are present in the first result.

- [ ] **Step 2: Add a pure pending-profile merge helper**

```ts
export const mergePendingProfileIntoProfileForm = (base: any, pending: Record<string, unknown> | null) =>
    pending ? {
        ...base,
        firstName: resolveProfileFormValue(base.firstName, pending.firstName) || '',
        lastName: resolveProfileFormValue(base.lastName, pending.lastName) || '',
        middleName: resolveProfileFormValue(base.middleName, pending.middleName) || '',
        suffix: resolveProfileFormValue(base.suffix, pending.suffix) || '',
        dob: resolveProfileFormValue(base.dob, pending.dob) || '',
        age: resolveProfileFormValue(base.age, pending.age) || '',
        sex: resolveProfileFormValue(base.sex, pending.sex) || '',
        street: resolveProfileFormValue(base.street, pending.street) || '',
        city: resolveProfileFormValue(base.city, pending.city) || '',
        province: resolveProfileFormValue(base.province, pending.province) || '',
        zipCode: resolveProfileFormValue(base.zipCode, pending.zipCode) || '',
        mobile: resolveProfileFormValue(base.mobile, pending.mobile) || '',
        email: resolveProfileFormValue(base.email, pending.email) || ''
    } : base;
```

Keep `applyPendingProfileToProfileForm` as a compatibility wrapper around the pure helper.

- [ ] **Step 3: Initialize the gate synchronously and remove session-reset effects**

Initialize pending data and the forced state in lazy `useState` calls. Derive reminder visibility and the effective service gate during render. Remove the five state-adjustment effects.

- [ ] **Step 4: Key the portal content by auth/student identity**

Rename the existing body to `StudentPortalContent`; render it from the default export with a key built from `auth_user_id`, `user.id`, or `student_id`. This makes React reset all portal-local state when users change.

- [ ] **Step 5: Verify the gate test and Bugs scan**

Expected: all `useStudentProfileCompletionGate.ts` prop-adjustment diagnostics are absent.

### Task 7: Stabilize genuine hook dependencies

**Files:**
- Modify: `src/pages/carestaff/features/population/hooks/useCareStaffPopulation.ts`
- Modify: `src/pages/student/features/profile/hooks/useStudentProfileForm.ts`

**Interfaces:**
- Produces: stable callbacks and complete dependency arrays without changing trigger semantics.

- [ ] **Step 1: Wrap reusable population callbacks with `useCallback`**

Stabilize `refreshPopulationAfterStudentMutation`, `openProfileModal`, `fetchEnrollmentKeys`, `cleanupExpiredCourseYearWindows`, `handleRefreshData`, and `getStudentCourseYearForFilter`; order declarations so dependencies are initialized before use. Add each stable callback and `onProfileOpened` to its consuming effect.

- [ ] **Step 2: Complete profile callback dependencies**

Add the reported session field, completion setters, refs, and tour setter to the two `useCallback` arrays. Use `useEffectEvent` for the session-identity-triggered refresh so callback identity changes do not introduce a refetch loop.

- [ ] **Step 3: Verify `exhaustive-deps` reaches zero**

Run the Bugs-only scan and typecheck.

### Task 8: Document the external auth-subscription exception

**Files:**
- Modify: `src/lib/useAuthSessionBootstrap.ts`

**Interfaces:**
- Preserves: Supabase auth subscription, initialization, cleanup, and AuthProvider ownership.

- [ ] **Step 1: Add one narrow suppression at the reported call**

```ts
// Supabase owns this external subscription; the hook must synchronize its result with AuthProvider.
// eslint-disable-next-line react-doctor/no-pass-live-state-to-parent
initializeSession();
```

- [ ] **Step 2: Verify the suppression is recognized**

Run the Bugs-only JSON scan. If the diagnostic remains, retain the architecture and report it as a confirmed validation false positive instead of masking it through unrelated code.

### Task 9: Final zero-bug and runnable-code verification

**Files:**
- Review every task-owned diff; modify no additional files unless a check identifies a direct regression.

- [ ] **Step 1: Run React Doctor**

Run: `npx react-doctor@latest --json --category bugs --yes`

Expected: `diagnostics: []`.

- [ ] **Step 2: Run project checks**

Run:

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npx react-doctor@latest --verbose
```

Expected: lint exits 0 with only existing warnings, typecheck exits 0, all tests pass, build exits 0, and the full React Doctor report contains no `Bugs` category.

- [ ] **Step 3: Review scope**

Run `git diff --check` and inspect diffs only for task-owned files. Leave all edits unstaged and uncommitted.
