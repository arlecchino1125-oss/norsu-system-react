# Codebase Cleanup Audit

Generated on 2026-03-31.

## Goal

This document lists parts of the codebase that look unnecessary, removable, duplicative, or heavier than they need to be.

This is an audit only.

- Nothing in this file has been removed automatically.
- Items are grouped by confidence level.
- Some items are safe to remove now.
- Some items should only be removed if you confirm the feature is no longer needed.

## 1. Safe To Remove Now

These are the strongest cleanup candidates based on current routing, imports, and code references.

### `src/pages/PublicLanding.backup.tsx`

Why it can be removed:

- It is a backup file, not a real app entry.
- It is not routed anywhere.
- Keeping backup files inside `src/pages` increases confusion and accidental reuse risk.

Recommendation:

- Delete it.

### `src/pages/PublicLanding.tsx`

Why it can probably be removed:

- The app currently uses `src/pages/PublicLandingV2.tsx` from `src/App.tsx`.
- `PublicLanding.tsx` appears to be the older version of the landing page.
- Keeping both makes maintenance harder and creates naming confusion.

Recommendation:

- Remove `PublicLanding.tsx` if `PublicLandingV2.tsx` is the final version.
- After that, rename `PublicLandingV2.tsx` to `PublicLanding.tsx` for cleanliness.

### Unused `clsx` dependency

File:

- `package.json`

Why it can probably be removed:

- No current imports or `clsx(...)` usage were found in `src`.

Recommendation:

- Remove `clsx` from dependencies if you are not about to introduce it.

### Unused `tailwind-merge` dependency

File:

- `package.json`

Why it can probably be removed:

- No current imports or `twMerge(...)` usage were found in `src`.

Recommendation:

- Remove `tailwind-merge` from dependencies if you are not using it soon.

### Unused `msw` dependency

File:

- `package.json`

Why it can probably be removed:

- No current imports or mock server setup were found.
- It adds dependency weight without visible use.

Recommendation:

- Remove `msw` unless you plan to add mocked network tests soon.

### Possibly unused `@testing-library/react`

File:

- `package.json`

Why it can probably be removed:

- No current imports were found in `src`.
- Current tests are mostly service/unit tests, not UI rendering tests.

Recommendation:

- Remove it if you are not planning React component tests.

### Possibly unused `@testing-library/user-event`

File:

- `package.json`

Why it can probably be removed:

- No current imports were found in `src`.
- Same reasoning as `@testing-library/react`.

Recommendation:

- Remove it if you are not planning interaction-heavy component tests.

### Unused helper in `manage-care-services`

File:

- `supabase/functions/manage-care-services/source/index.ts`

Item:

- `sanitizeShortText`

Why it can probably be removed:

- It appears to be declared but not used in that file.

Recommendation:

- Delete the helper if no future near-term use is planned.

## 2. Simplify Or Merge

These are not always removable features, but they are unnecessarily duplicated or implemented in a heavier way than needed.

### Duplicate landing-page naming

Files:

- `src/pages/PublicLanding.tsx`
- `src/pages/PublicLandingV2.tsx`
- `src/pages/PublicLanding.backup.tsx`

Why this should be cleaned:

- Three landing-page variants create uncertainty about which one is real.
- It becomes easier to patch the wrong file by accident.

Recommendation:

- Keep one final landing page only.
- Remove the backup and old version.
- Rename the final version to the clean normal name.

### Duplicate export helper in CARE staff modals

Files:

- `src/pages/carestaff/modals/CareStaffModals.tsx`
- `src/utils/dashboardUtils.ts`

Why this should be cleaned:

- `CareStaffModals.tsx` has its own local `exportToExcel(...)`.
- It is not actually Excel export. It builds a CSV blob.
- There is already shared export logic in `dashboardUtils.ts`.

Recommendation:

- Remove the local helper.
- Reuse the shared export utility.
- Rename misleading helpers so CSV and XLSX are clearly separated.

### Two different XLSX loading strategies

Files:

- `index.html`
- `src/lib/exportVendors.ts`
- `src/pages/carestaff/StudentPopulationPage.tsx`
- `src/pages/carestaff/NATManagementPage.tsx`

Why this should be cleaned:

- The app uses both:
  - a CDN script in `index.html`
  - dynamic imports through `exportVendors.ts`
- `StudentPopulationPage.tsx` still depends on a global `XLSX`.
- This increases brittleness and makes loading behavior inconsistent.

Recommendation:

- Pick one strategy only.
- Best cleanup direction: use module imports or shared lazy loaders everywhere.
- Remove the global-script dependency after migrating `StudentPopulationPage.tsx`.

### Large shared page-transition / decorative animation footprint

Files:

- `src/index.css`
- several page components using `page-transition`, `animate-blob`, and animation delay utilities

Why this might be overdone:

- These effects are used across many screens.
- They are not wrong, but they add visual complexity and styling overhead.
- If your priority is maintainability over flair, some of these decorative utilities can be trimmed.

Recommendation:

- Keep only the motion styles that clearly improve user experience.
- Consider removing rarely noticed decorative blob/background animation helpers.

## 3. Repo Clutter And Non-Product Files

These are not app features, but they still add noise or risk.

### Tracked `.env`

File:

- `.env`

Why this is a problem:

- Environment files should usually not be committed.
- It increases secret leakage risk.
- It makes local and production environment management messier.

Recommendation:

- Stop tracking `.env`.
- Add a `.env.example` instead.

### `.codex-backups`

Folder:

- `.codex-backups`

Why it is removable:

- It is local backup material, not product code.
- It adds clutter in the project root.

Recommendation:

- Delete locally if you do not need the history.
- Or keep it outside the repo.
- If needed, make sure it stays ignored.

### `.sixth`

Folder:

- `.sixth`

Why it is removable:

- It appears to be tool metadata rather than app runtime code.
- It adds noise for future maintainers.

Recommendation:

- Remove it if you do not actively use it.
- Otherwise keep it out of source control if possible.

### `dist`

Folder:

- `dist`

Why it is removable:

- It is generated build output.
- It does not need to sit in your working tree unless you are actively testing the build artifacts.

Recommendation:

- Safe to delete locally anytime.

### Root-level analysis and planning markdown files

Examples:

- `email_flow_analysis.md`
- `erd_analysis.md`
- `implementation_plan.md`
- `SCHEMA_CLEANUP_PLAN.md`
- `STUDENT_ACTIVATION_WHOLE_FLOW_ERD.md`
- `FALLBACK_MESSAGES_INVENTORY.md`

Why this may be too much in the app root:

- These files are useful, but they crowd the root directory.
- They are documentation/process artifacts, not core runtime files.

Recommendation:

- Move them into a `docs/` folder if you want to keep them.

## 4. Not Unnecessary, But Too Heavy

These are important parts of the app, but they currently carry too much maintenance weight.

### `src/pages/StudentPortal.tsx`

Why it is a problem:

- Very large file size.
- It combines too many responsibilities: profile flow, notifications, gating, service entry, modal logic, office visit logic, and more.

Recommendation:

- Split by concern.
- Good targets: profile completion, notifications, overlays/modals, service-entry guards, account-security actions.

### `src/pages/NATPortal.tsx`

Why it is a problem:

- Large and multi-purpose.
- Handles both applicant flow and a lot of scheduling/email/activation-related behavior.

Recommendation:

- Split form steps, schedule handling, and transactional actions into separate modules.

### `src/pages/DeptDashboard.tsx`

Why it is a problem:

- Very large orchestration page.
- Likely handling too many module-specific states in one place.

Recommendation:

- Move logic into focused feature modules or hooks.

### `src/pages/carestaff/NATManagementPage.tsx`

Why it is a problem:

- Very large.
- Contains export logic, bulk parsing, status-board behavior, modal behavior, and scheduling behavior together.

Recommendation:

- Split bulk-pass import/export, status board, applicant details, and course-limit tools.

### `src/pages/carestaff/StudentPopulationPage.tsx`

Why it is a problem:

- Very large and feature-dense.
- Contains profile rendering, Excel parsing, bulk actions, enrollment-key management, export behavior, and edit flows together.

Recommendation:

- Separate import/export tools, student detail viewer, and enrollment-key management into smaller components.

### `src/pages/student/StudentPortalViews.tsx`

Why it is a problem:

- Holds many distinct student-facing views in one file.
- Makes reuse and targeted changes harder.

Recommendation:

- Split each major student module into its own file if maintainability becomes painful.

## 5. Things To Review Before Removing

These are not clearly unnecessary, but they are worth questioning.

### Extensive fallback/placeholder text spread across many pages

Why it may be worth simplifying:

- There are many different variants for empty states and placeholders.
- That can lead to inconsistent tone and harder maintenance.

Recommendation:

- Consider centralizing common placeholders like:
  - `No description provided.`
  - `No notes provided.`
  - `No email address available`
  - `Unknown`
  - `Unassigned`
  - `N/A`

### Multiple export formats in staff tools

Why it may be worth reviewing:

- Some pages support PDF, CSV, Excel, and print flows.
- If users only rely on one or two formats, the rest may be unnecessary feature weight.

Recommendation:

- Review which export formats are actually used.
- Remove low-value formats if they are almost never needed.

### Heavy decorative UI on login and portal pages

Why it may be worth reviewing:

- Framer Motion and layered decorative backgrounds are used in multiple login/public screens.
- This is not inherently bad, but some of it may not add much practical value.

Recommendation:

- Keep the visuals that strengthen identity.
- Trim the ones that only add complexity.

## 6. Suggested Cleanup Order

If you want to reduce risk, clean in this order:

1. Remove obviously unused files:
   - `src/pages/PublicLanding.backup.tsx`
   - maybe `src/pages/PublicLanding.tsx`
2. Remove unused dependencies:
   - `clsx`
   - `tailwind-merge`
   - maybe `msw`
   - maybe `@testing-library/react`
   - maybe `@testing-library/user-event`
3. Stop tracking `.env`.
4. Unify XLSX loading.
5. Remove duplicated export helpers.
6. Move root documentation files into a `docs/` folder.
7. Refactor oversized portal/dashboard files.

## 7. Summary

The strongest current cleanup wins are:

- remove duplicate and backup landing-page files
- remove clearly unused packages
- stop tracking `.env`
- unify export/XLSX logic
- reduce root-folder clutter

The biggest long-term maintenance issue is not one single feature.
It is the number of very large files carrying too many responsibilities at once.
