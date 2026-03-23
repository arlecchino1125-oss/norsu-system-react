# Performance Plan

## Goal

Improve app speed and perceived responsiveness without changing core behavior.

## Priority Order

1. Code-split the app
2. Add query caching
3. Remove unnecessary exact counts
4. Load data by active view
5. Cache small reference data

## 1. Code-Split The App

Biggest first-load win.

Current issue:
- `src/App.tsx` imports all main pages up front
- the production build already shows a very large main bundle

Plan:
- use `React.lazy` and `Suspense` for:
  - `AdminDashboard`
  - `DeptDashboard`
  - `CareStaffDashboard`
  - `StudentPortal`
  - `NATPortal`

Expected result:
- faster first page load
- less JS downloaded for users who only visit one portal

## 2. Add Query Caching

Best repeat-navigation win.

Recommended approach:
- add `TanStack Query` or `SWR`

Best cache targets:
- `courses`
- `departments`
- `office_visit_reasons`
- `forms`
- `questions`

Short cache targets:
- notifications
- support queues
- counseling queues
- admissions lists

Expected result:
- fewer repeated Supabase calls
- faster page revisits
- smoother navigation between tabs/modules

## 3. Remove Unnecessary Exact Counts

Current issue:
- many paged queries use `count: 'exact'`
- exact counts are more expensive than normal fetches

Plan:
- keep exact counts only where total pages really matter
- remove them from screens where the total is not essential

Examples to review:
- `src/services/studentPortalService.ts`
- `src/services/deptService.ts`
- care staff dashboard counters and list pages

Expected result:
- lower DB cost
- faster list queries

## 4. Load Data By Active View

Current issue:
- some pages load multiple datasets together even when the user only needs one module

Main hotspot:
- `src/hooks/dept/useDeptData.ts`

Plan:
- dashboard loads dashboard data
- admissions loads admissions data
- support loads support data
- counseling loads counseling data
- events loads events data

Expected result:
- less work on initial dashboard entry
- less wasted loading
- better responsiveness on slower connections

## 5. Cache Small Reference Data

Easy quick wins.

Good candidates:
- course map
- department list
- form list
- office visit reasons

Plan:
- cache in memory first
- optionally use session storage for short-lived reuse

Expected result:
- fewer repeated fetches for stable lookup data

## Recommended Implementation Order

### Phase 1
- route lazy loading in `src/App.tsx`

### Phase 2
- add query caching for stable reference data

### Phase 3
- reduce unnecessary `count: 'exact'` usage

### Phase 4
- split heavy shared hooks into per-view data loading

## Notes

- Start with code splitting before deeper caching work.
- Caching helps most after the app stops loading every heavy page up front.
- Focus first on first-load speed and repeated navigation speed.
