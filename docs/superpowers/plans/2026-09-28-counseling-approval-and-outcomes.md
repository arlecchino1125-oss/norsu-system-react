# Counseling Flow v2 Implementation Plan & Status

**Tracking ID:** `counseling-flow-v2-approval-outcomes`  
**Execution Date:** 2026-09-28  
**Status:** Completed

---

## Deliverables Checklist

### 1. Database & Migrations
- [x] Migration `20260928120000_counseling_approval_and_outcomes.sql`
  - Added `follow_up_of` FK and index on `public.counseling_requests`.
  - Updated `student_may_evaluate_counseling()` and `student_has_completed_counseling()` to accept all 4 completed/outcome statuses.
  - Updated `counseling_requests_student_feedback_update` RLS policy.
  - Updated `public_counseling_evaluate()` RPC logic.
  - Seeded `manage_counseling_outcome` permission for `Care Staff`.
- [x] Database TypeScript Types: `src/types/database.ts` hand-added `follow_up_of: number | null`.

### 2. Workflow Core & Status Metadata
- [x] `src/utils/workflow.ts`:
  - 6 new statuses in `COUNSELING_STATUS`.
  - Defined `COUNSELING_AWAITING_CARE_STATUSES = ['Submitted', 'Pending']`.
  - Updated `COUNSELING_AWAITING_DEPT_STATUSES = ['Approved']`.
  - Defined `COUNSELING_RETURNED_STATUSES = ['Returned_To_Care']`.
  - Defined `COUNSELING_OUTCOME_STATUSES = ['Counseled', 'Monitoring', 'Subject_For_2nd_Counseling']`.
  - Defined `COUNSELING_SESSION_DONE_STATUSES = ['Completed', ...COUNSELING_OUTCOME_STATUSES]`.
  - Defined `COUNSELING_CALENDAR_STATUSES = ['Scheduled', 'Staff_Scheduled', 'Rescheduled']`.
  - Active and activity status lists updated.
  - Helper functions for transition validity and checks.
- [x] `src/utils/counselingStatusMeta.ts`: Shared label/tone map with audience resolution (`staff` vs `student`).
- [x] `src/utils/workflow.test.ts`: Vitest test suite covering all buckets and helper transition checks.

### 3. Edge Functions
- [x] `manage-care-services`:
  - Pure transition rules in `counselingTransitions.ts` and test suite `counselingTransitions.test.ts`.
  - Handled 5 modes: `approve-counseling`, `reject-counseling`, `set-counseling-outcome`, `reschedule-counseling`, `schedule-follow-up-counseling`.
  - Schedulable statuses extended to `['Referred', 'Returned_To_Care']`; completable statuses extended to `['Scheduled', 'Staff_Scheduled', 'Rescheduled']`.
  - Enforced permission checks, notifications, email payloads, and audit logging.
- [x] `manage-department-services`:
  - Pure transition rules in `counselingTransitions.ts` and test suite `counselingTransitions.test.ts`.
  - Updated queue status to `['Approved']`, completable statuses to `['Scheduled', 'Rescheduled']`.
  - Updated `rejectCounseling` to write `Returned_To_Care` and notify student.

### 4. Shared UI Components
- [x] `src/components/ui/ContextMenu.tsx`: Accessible, viewport-clamped, keyboard/escape-aware context menu.
- [x] `src/components/ui/ContextMenu.test.tsx`: Vitest tests for context menu interactions.
- [x] `CounselingOutcomeMenu.tsx` & `.test.tsx`: 5-action menu gated by `manage_counseling_outcome` and `counseling`.
- [x] `CounselingScheduleModal.tsx`: Modal for scheduling initial, rescheduled, or follow-up sessions.
- [x] `CounselingCompleteModal.tsx`: Modal for session notes and completion.

### 5. CARE Center Portal
- [x] `counselingData.ts` & `.test.ts`: Added `follow_up_of` column, all 11 tab filters, and status counters.
- [x] `useCareStaffCounseling.tsx`: Approval, rejection, outcome setting, rescheduling, and follow-up handlers.
- [x] `CareStaffCounselingPage.tsx`: Tabs, table row context triggers (right-click / long-press / ⋯ button), modals wiring (fixed pre-existing missing modals bug).
- [x] `CareStaffCounselingPage.test.tsx`: Verified all tabs render without errors.
- [x] `CareStaffDashboardView.tsx`: Activity text map and awaiting counters aligned.

### 6. College / Department Portal
- [x] `useDeptCounseling.ts`: Initial tab `Approved`, rejection status `Returned_To_Care`.
- [x] `DeptCounselingQueuePage.tsx`: For Review tab (`Approved`), support for `Rescheduled` in completion/forwarding, shared status meta.
- [x] `DeptCounseledPage.tsx` & `.test.tsx`: Filter uses `isCounselingSessionDone(status)`.
- [x] `DeptHistoryModal.tsx`: Outcome status chips via shared meta.
- [x] `DeptViewFormModal.tsx`: Outcome status chips via shared meta.
- [x] `useDeptData.ts`, `utils.ts`, `DeptHomePage.tsx`, `DeptDashboard.tsx`: Aligned statistics counters.

### 7. Student Portal
- [x] `CounselingView.tsx`: `isCounselingSessionDone` enables evaluations across all outcome statuses; neutral student labels ("For Follow-up Session", "Under CARE Handling").

### 8. Shared Surfaces
- [x] `StaffCalendarPage.tsx`: Query includes `COUNSELING_CALENDAR_STATUSES` (includes `Rescheduled`).
- [x] `StaffExportCenterPage.tsx`: Export payloads include `follow_up_of` and updated descriptions.
- [x] `src/types/permissions.ts`: `manage_counseling_outcome` registered and seeded.

### 9. Documentation
- [x] `docs/PORTAL-WORKFLOWS.md`: Updated §3 and §4 counseling subsections.
- [x] `docs/superpowers/specs/2026-09-28-counseling-approval-and-outcomes-design.md`: Design spec document.
- [x] `docs/superpowers/plans/2026-09-28-counseling-approval-and-outcomes.md`: Implementation plan and tracking document.
