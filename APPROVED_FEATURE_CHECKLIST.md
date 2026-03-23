# Approved Feature Checklist

Last updated: 2026-03-23

## Scope

- This file tracks the approved features from our discussion.
- This is a scope-and-progress file, not a redesign file.
- `Home in system` means where the feature lives in the UI.
- `Used by` means who operates the feature.
- `Benefits` means who gets value from the feature.
- `Affects / notifies` means who or what is directly acted on by the feature.

## Rules

- Add only
- Keep existing features working
- Change only what is necessary for the new feature
- Simple tables
- Simple filters
- Simple checkboxes
- Simple modal/forms
- No fancy animations
- No fancy layouts
- No fancy styling

## Current Implementation Order

1. Interview Queue Board
2. Reschedule Flow
3. No-Show Handling
4. Panel Assignment
5. Bulk Status Actions
6. Applicant Timeline / History
7. Audit Logs (Skipped)
8. Missing Requirements Email Tool (Skipped, Reworked)
9. Dashboard Analytics
10. Role-Based Alerts
11. Calendar View
12. Export Center
13. Printable Master List
14. Batch Email Preview

## Workflow Compatibility Rules

- `Reschedule` is a Department Admissions duty inside the Department Portal.
- `Absent` is not a final admissions outcome by itself.
- After an applicant is marked `Absent`, department staff should be able to continue with a department decision such as:
  - reschedule
  - reject / forward
  - approve if the department decides to proceed
- `Approve` must automatically clear `interview_queue_status`.
- `Reject / Forward` must automatically clear `interview_queue_status`.
- `Reschedule` must clear `interview_queue_status`, keep the applicant in `Interview Scheduled`, update the interview date/time, and send the updated interview email.
- `Interview Queue Board` stays read-only.
- `Interview Queue Board` only shows `Interview Scheduled` and `Approved for Enrollment`.
- `Panel` only matters while the applicant is `Interview Scheduled`.
- `Venue` follows the same scheduling logic as `Panel`.
- `Single Schedule` and `Bulk Schedule` should both carry:
  - date
  - time
  - venue
  - panel assignment
- Interview emails for scheduling and rescheduling should include:
  - date
  - time
  - venue
  - panel assignment
- `Panel` and `Venue` should stay on reschedule by default, but authorized department-side users can edit them.
- If the applicant becomes `Approved for Enrollment`, `Forwarded`, or `Application Unsuccessful`, `Panel` becomes irrelevant.
- `Missing Requirements Email Tool` stays separate from status changes.
- `Missing Requirements Email Tool` can be used at any stage, including while the applicant is already scheduled for interview.
- `Missing Requirements Email Tool` must not automatically change applicant status, schedule, panel, or venue.

## Approved Features

- [x] Interview Queue Board
  Home in system: Staff Portal -> Department Portal -> Admissions -> Interview Queue page.
  Used by: Department Head and department admissions staff.
  Benefits: department staff who need a simple read-only view of interview-day outcomes without conflicting with approve/reject actions.
  Affects / notifies: applicants already in `Interview Scheduled` or `Approved for Enrollment`.
  Connected with: `applications.interview_date`, `applications.status`.
  Original scope: read-only board only. Show list of `Interview Scheduled` applicants and list of `Approved for Enrollment` applicants. No `Waiting`, `In Progress`, or `Done` in this page.

- [x] Reschedule Flow
  Home in system: Staff Portal -> Department Portal -> Admissions -> applicant scheduling actions.
  Used by: Department Head and department admissions staff.
  Benefits: staff who need to adjust an already-booked interview without redoing the entire process.
  Affects / notifies: one already scheduled applicant whose interview date/time is changed by the department.
  Connected with: `applications.interview_date`, `applications.interview_queue_status`, schedule metadata such as venue and panel, interview notification email flow.
  Original scope: staff can move one scheduled applicant to a new date/time and update the interview record.
  Compatibility rule: rescheduling is a department duty, must clear `Absent`, keep `Interview Scheduled`, keep panel and venue by default, allow department-side editing, and send the updated interview email.

- [x] No-Show Handling
  Home in system: Staff Portal -> Department Portal -> Admissions -> `Interview Scheduled` applicant card/actions.
  Used by: Department Head and department admissions staff during interview day.
  Benefits: staff who need a clear attendance outcome for applicants who did not appear.
  Affects / notifies: scheduled applicants manually marked as absent from the applicant action area.
  Connected with: `applications.interview_queue_status` as the simple absent marker.
  Original scope: manual only. Staff can mark an applicant as `Absent`. No conflict with auto-absent because there is no auto-absent yet. This is not part of the read-only interview queue board.
  Compatibility rule: after marking `Absent`, the department can still continue with a later department action such as reschedule, approve, or reject / forward.

- [x] Panel Assignment
  Home in system: Staff Portal -> Department Portal -> Admissions -> admissions scheduling and interview management area.
  Used by: Department Head and department admissions staff.
  Benefits: staff organizing interview workloads and panel members who need to know which applicants belong to them.
  Affects / notifies: selected scheduled applicants and their assigned panel label or interviewer group.
  Connected with: scheduled interview records, single scheduling, bulk scheduling, rescheduling, interview email details.
  Original scope: staff can assign a simple panel label or interviewer group to selected interview schedules.
  Compatibility rule: panel only matters while the applicant is `Interview Scheduled`. It should be included in single and bulk scheduling, included in interview email, kept by default on reschedule, editable by authorized department-side users, and become irrelevant after approve / reject / forward.
  Implementation note: shared interview metadata now includes both `panel` and `venue` in schedule and reschedule flows.

- [x] Bulk Status Actions
  Home in system: Staff Portal -> Department Portal -> Admissions -> Admissions Screening page.
  Used by: Department Head and department admissions staff.
  Benefits: staff processing many interview decisions faster without opening applicants one by one.
  Affects / notifies: selected applicants whose admissions status is updated in bulk.
  Connected with: applicant selection, admissions decisions, applicant status updates, related admissions email flows where applicable.
  Original scope: hybrid version. Single-item actions stay. Add bulk `Approve`, bulk `Forward to Next Choice`, and bulk `Mark Unsuccessful`. One action per batch only, not mixed outcomes in one submit.
  Implementation note: bulk actions now work on selected `Interview Scheduled` applicants, clear `Absent`, update the queue view correctly, and keep single-item actions unchanged.

- [x] Applicant Timeline / History
  Home in system: Staff Portal -> Department Portal -> Admissions -> Applicant record/details panel.
  Used by: Department Head and department admissions staff.
  Benefits: staff who need one quick view of an applicant before making the next decision.
  Affects / notifies: one applicant record being reviewed.
  Connected with: applicant status flow, schedule changes, decisions, related admissions entries.
  Original scope: one applicant panel showing status flow, schedule changes, and decisions.
  Implementation note: a simple `View Details` panel is now available from applicant rows and shows applicant info, current interview details, and a derived admissions timeline/history.

- [ ] Audit Logs (Skipped)
  Home in system: Backend audit records + Staff Portal -> Department Portal -> Admissions -> Applicant record/details panel.
  Used by: Department Head and department admissions staff.
  Benefits: staff and department leadership who need accountability and change history.
  Affects / notifies: admissions change records, not applicant-facing notifications.
  Connected with: acting staff account, action taken, changed data, timestamp, applicant record.
  Original scope: show who changed the applicant, what changed, and when.
  Status: skipped by user for this feature batch.

- [ ] Missing Requirements Email Tool (Skipped / Reworked)
  Home in system: Staff Portal -> Department Portal -> Admissions -> Applicant record/details panel.
  Used by: Department Head and department admissions staff.
  Benefits: staff following up incomplete applications and applicants who need clear instructions on what is still lacking.
  Affects / notifies: the applicant email recipient for that specific application.
  Connected with: applicant record, applicant email, custom missing document names, staff-written submission instructions, `send-email`.
  Original scope: staff open one applicant record, add custom missing document names, remove items, write simple submission instructions, click `Remind Applicant`, and the system sends a proper reminder email with greeting, missing requirements, and where/how to submit them.
  Rule: this does not use fixed database-locked document names.
  Compatibility rule: this is a reminder-only workflow. It can be sent before scheduling, while `Interview Scheduled`, after reschedule, or at another admissions stage, but it must not automatically change applicant status, absent flag, schedule, panel, or venue.
  Status: skipped in this original form and reworked into the NAT requirements flow, where CARE Staff manage requirement names and applicants see them in the NAT portal and NAT application received email.

- [x] Dashboard Analytics
  Home in system: Staff Portal -> Department Portal -> Dashboard / reports area.
  Used by: Department Head and department admissions staff.
  Benefits: department staff and department leadership who need quick admissions counts and funnel visibility.
  Affects / notifies: read-only dashboard summaries only.
  Connected with: department admissions totals, funnel-stage counts, applicant status summaries.
  Original scope: for department portal only. Simple counts and funnel-style summaries only.
  Implementation note: the department home dashboard now shows a simple admissions snapshot for `Ready for Interview`, `Interview Scheduled`, `Approved`, and `Unsuccessful`.

- [x] Role-Based Alerts
  Home in system: Staff Portal dashboards -> Admin Dashboard, Department Portal dashboard, and Care Staff Dashboard.
  Used by: Admin, Department Head, and Care Staff.
  Benefits: each role sees only the alert counts relevant to their own work.
  Affects / notifies: on-screen role-specific dashboard alerts in V1 only.
  Connected with: pending staff-account items, pending admissions decisions, referred support cases, counseling/service counts, and similar role-relevant totals.
  Original scope: show simple alert counts based on role.
  Implementation note: simple role-specific alert sections now appear on the Admin Dashboard, Department home dashboard, and CARE Staff dashboard.

- [x] Calendar View
  Home in system: Staff Portal -> shared calendar/list view connected to Department Portal and Care Staff Portal.
  Used by: Department Head, department admissions staff, and Care Staff.
  Benefits: staff who need one place to see admissions interviews, counseling schedules, and events.
  Affects / notifies: read-only schedule visibility in V1.
  Connected with: admissions interviews, counseling schedules, events.
  Original scope: simple calendar or list for admissions interviews, counseling schedules, and events.
  Implementation note: a simple shared read-only calendar list now appears in both the Department Portal and CARE Staff Portal with type and date filters for upcoming interviews, counseling schedules, and events.

- [x] Export Center
  Home in system: Staff Portal -> shared Export Center page with simple sections per module.
  Used by: Department Head, department admissions staff, Care Staff, and Admin where applicable.
  Benefits: staff preparing reports, printouts, file submissions, and downloadable records.
  Affects / notifies: exported CSV/PDF outputs only.
  Connected with: admissions, counseling, support, events, and other module exports where applicable.
  Original scope: one simple page for CSV/PDF exports by module.
  Implementation note: a simple Export Center is now available in the Department Portal and CARE Staff Portal with on-demand CSV/PDF exports for module records. Printable interview master list remains separate for the next task.

- [x] Printable Master List
  Home in system: Staff Portal -> Department Portal -> Export Center -> admissions interview export tools.
  Used by: Department Head, department admissions staff, and interview-day staff.
  Benefits: staff handling physical interview-day attendance and check-in.
  Affects / notifies: printable interview list output only.
  Connected with: applicant names, reference IDs, interview schedule, signature column for attendance/check-in.
  Original scope: keep as part of the export-related admissions tools and include applicant names, reference IDs, schedule, and signature column for interview-day attendance/check-in.
  Implementation note: the Department Export Center now includes a date-based printable master list for `Interview Scheduled` applicants with a blank signature column, available as `Print List` and `Export PDF`.

- [x] Batch Email Preview
  Home in system: Staff Portal -> Department Portal -> Admissions email-sending flows before final send.
  Used by: Department Head and department admissions staff.
  Benefits: staff who need to confirm recipients and message content before sending.
  Affects / notifies: applicant recipients once the real send is confirmed, but preview itself is read-only.
  Connected with: admissions email recipients, schedule notices, reschedule notices, venue and panel details, missing requirements reminder emails, read-only preview content.
  Original scope: read-only only. Staff can preview recipients and content before sending, but cannot edit inside preview.
  Implementation note: Department admissions email-sending actions now open a read-only preview modal showing recipients, subject, and actual rendered email content before the final send action is confirmed.

## Not Approved For Now

- Capacity-aware scheduling
- Reminder engine

## Done So Far

- Interview Queue Board was completed first.
- No-Show Handling was completed next by direct user request.
- Reschedule Flow was completed next.
- Panel Assignment was completed next, together with shared `venue` support for scheduling/rescheduling and interview emails.
- Bulk Status Actions were completed next for selected `Interview Scheduled` applicants.
- Applicant Timeline / History was completed next as a simple applicant details panel with derived admissions flow.
- Audit Logs was skipped.
- Missing Requirements Email Tool was skipped in its original admissions form and reworked into the NAT requirements flow.
- Dashboard Analytics and Role-Based Alerts are now completed as simple dashboard count sections.
- Calendar View is now completed as a simple shared upcoming schedule list.
- Export Center is now completed as a simple shared CSV/PDF export page for Department and CARE Staff.
- Printable Master List is now completed inside the Department Export Center as a simple interview-day print/PDF tool.
- Batch Email Preview is now completed as a read-only confirmation step before department admissions emails are sent.
- Current completed count: 12 done, 2 skipped, 0 still pending.
