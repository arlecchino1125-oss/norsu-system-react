# Post-Change Review Checklist

Use this after the maintainability/scalability refactor changes.

## 1) Run full quality gate

Run:

```bash
npm run check
```

Expected: lint + typecheck + test + build all pass.

## 2) Smoke-test critical UI flows

Check these manually in the app:

1. Student portal load and navigation.
2. Profile view/edit still works.
3. Feedback submit/history works.
4. Counseling request submission works.
5. Support request submission works.
6. NAT management tabs and actions still work.

## 3) Validate server-side pagination/filter behavior

For high-volume list screens:

1. Changing page loads the next server page.
2. Filters (search/status/course/year/section) stay applied across pages.
3. Totals and visible rows match expected filtered results.

## 4) Confirm no wildcard list queries in target files

Check these files for `select('*')` in list-query paths:

1. `src/pages/StudentPortal.tsx`
2. `src/pages/student/StudentPortalViews.tsx`
3. `src/hooks/dept/useDeptData.ts`
4. `src/pages/carestaff/StudentPopulationPage.tsx`
5. `src/pages/carestaff/NATManagementPage.tsx`

## 5) Verify extracted student view modules

Confirm behavior and imports are correct for:

1. `src/pages/student/views/ProfileView.tsx`
2. `src/pages/student/views/FeedbackView.tsx`
3. `src/pages/student/views/ServiceIntroModal.tsx`

## 6) Database migration readiness

Validate migration:

1. `supabase/migrations/20260302_add_scalability_indexes.sql`

Checks:

1. Applies cleanly.
2. Does not conflict with existing indexes/constraints.

## 7) CI workflow sanity check

Review:

1. `.github/workflows/ci.yml`

Ensure pipeline runs:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run build`

## 8) Final diff review before commit

Run:

```bash
git status
git diff --name-only
```

Confirm only intended files are included.
