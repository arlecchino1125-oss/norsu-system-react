# Fallback Messages Inventory

Generated from the current codebase on 2026-03-31.

## Scope

This inventory focuses on user-facing and operator-facing fallback/default text that appears in:

- Supabase Edge Function error responses
- Frontend fallback messages passed into shared invoke helpers
- UI empty states
- UI placeholder values such as `Unknown`, `Unassigned`, `N/A`, and `To be announced`

Excluded on purpose:

- Test-only fixtures
- CSS classes and styling tokens
- Internal comments
- Most form input placeholder hints such as `N/A if none`

## Shared Cross-Cutting Fallbacks

Primary sources:

- `src/lib/invokeEdgeFunction.ts`
- `src/lib/transactionalEmail.ts`
- `src/lib/auth.tsx`

Messages:

- `Failed to run edge function.`
- `Failed to send email.`
- `Failed to preview email.`
- `Email address is missing.`
- `Login failed.`
- `Connection error: ...`
- `Login error: ...`
- `Unable to resolve the login account.`
- `Unable to sign in with the migrated auth email.`
- `Unable to sync the auth email.`
- `useAuth must be used within an AuthProvider`

## Edge Functions

### `activate-student-account`

Source:

- `supabase/functions/activate-student-account/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Student ID not found in the enrollment list.`
- `This Student ID has already been activated by another user.`
- `This Student ID has already been activated. Please sign in instead.`
- `This student record is already linked to a different auth account.`
- `Missing required activation details.`
- `Missing required NAT activation details.`
- `Application not found.`
- `Application email is required before activation.`
- `Method not allowed.`
- `Unsupported activation mode.`
- `Unexpected activation error.`

### `resolve-auth-login`

Source:

- `supabase/functions/resolve-auth-login/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Username is required.`
- `Student ID is required.`
- `Method not allowed.`
- `Unsupported auth login resolver mode.`
- `Unexpected auth login resolver error.`

### `manage-student-accounts`

Source:

- `supabase/functions/manage-student-accounts/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Unsupported security OTP purpose.`
- `Missing authenticated session.`
- `Unable to verify the current user.`
- `Only linked student accounts can perform this action.`
- `OTP is required.`
- `No active OTP request found. Request a new code first.`
- `This OTP was issued for a different email address.`
- `This OTP has expired. Request a new code first.`
- `Invalid OTP.`
- `Admin privileges are required for this action.`
- `A valid email address is required.`
- `Enter a different email address to continue.`
- `Password must be at least 8 characters.`
- `No student changes were provided.`
- `Course and year level are required.`
- `Profile picture URL is required.`
- `Office visit ID is required.`
- `Office visit not found.`
- `You can only complete your own office visit.`
- `This office visit is already completed.`
- `Method not allowed.`
- `Unsupported student management mode.`
- `Unexpected student cleanup error.`

### `manage-care-services`

Source:

- `supabase/functions/manage-care-services/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Missing authenticated session.`
- `Unable to verify the current user.`
- `Care Staff privileges are required for this action.`
- `Counseling request not found.`
- `Support request not found.`
- `Counseling request ID is required.`
- `Session date and time are required.`
- `Public resolution notes are required.`
- `Support request ID is required.`
- `CARE Staff notes are required.`
- `Resolution notes are required.`
- `Method not allowed.`
- `Unsupported CARE services mode.`
- `Unexpected CARE services error.`

### `manage-department-services`

Source:

- `supabase/functions/manage-department-services/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Missing authenticated session.`
- `Unable to verify the current user.`
- `Department Head privileges are required for this action.`
- `Your department assignment is missing.`
- `Counseling request not found.`
- `Support request not found.`
- `Invalid signature format.`
- `Signature image is too large.`
- `Counseling request ID is required.`
- `Session date and time are required.`
- `Reason for referral is required.`
- `Actions made are required.`
- `A valid student must be selected for referral.`
- `The selected student could not be found.`
- `You can only create referrals for students in your department.`
- `Support request ID is required.`
- `Visit date and time are required.`
- `Resolution notes are required.`
- `Actions taken are required.`
- `Method not allowed.`
- `Unsupported department services mode.`
- `Unexpected department services error.`

### `manage-department-admissions`

Source:

- `supabase/functions/manage-department-admissions/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Missing authenticated session.`
- `Unable to verify the current user.`
- `Department Head privileges are required for this action.`
- `Your department assignment is missing.`
- `Application not found.`
- `This application is not currently routed to your department.`
- `A valid interview queue status is required.`
- `Application ID is required.`
- `Interview date and time are required.`
- `At least one application ID is required.`
- `Only applicants marked absent can be rescheduled.`
- `Method not allowed.`
- `Unsupported department admissions mode.`
- `Unexpected department admissions error.`

### `manage-staff-accounts`

Source:

- `supabase/functions/manage-staff-accounts/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Staff account not found.`
- `Staff account ID is required.`
- `Preserved staff account ID is required.`
- `Method not allowed.`
- `Unsupported staff management mode.`
- `Unexpected staff cleanup error.`

### `provision-staff-account`

Source:

- `supabase/functions/provision-staff-account/source/index.ts`

Messages:

- `Missing Supabase service role configuration.`
- `Method not allowed.`
- `Username, password, role, and email are required.`
- `Invalid staff role.`
- `A valid staff email address is required.`
- `Department is required for Department Head accounts.`
- `An account with this username already exists.`
- `Unexpected staff provisioning error.`

### `send-email` and shared mailer

Sources:

- `supabase/functions/send-email/source/index.ts`
- `supabase/functions/_shared/mailer.ts`

Messages:

- `Email is required.`
- `Email sent successfully`
- `Server misconfiguration: Missing email credentials.`

## Auth And Login UI

Primary source:

- `src/lib/auth.tsx`

Messages:

- `Username not found.`
- `Incorrect password.`
- `Staff profile not found.`
- `Student ID not found.`
- `Student profile not found.`
- `This staff account has not been linked to Supabase Auth yet. Ask an admin to link it before signing in.`
- `This staff account has no migrated auth email yet. Run the auth email sync first.`
- `This student account has not been activated in Supabase Auth yet. Complete student activation first before signing in.`
- `This student account has no migrated auth email yet. Run the student auth email sync first.`

## Student Portal And Account Security

Primary sources:

- `src/pages/StudentPortal.tsx`
- `src/components/AccountSecuritySettings.tsx`
- `src/pages/StudentLogin.tsx`

Messages:

- `Account activation failed.`
- `Email is required.`
- `Your student session could not be verified. Please sign in again.`
- `Failed to update your student profile.`
- `Your login session has expired. Please sign in again before changing your email.`
- `Your Supabase login session could not be verified. Please sign out and sign in again, then try again.`
- `Failed to sync your student login email.`
- `Your student profile is not loaded yet.`
- `Password must be at least 8 characters.`
- `Error: Unknown error`
- `No attendance record found. Please time in first.`
- `Failed to send the password OTP.`
- `Failed to send the email verification code.`
- `Failed to update your email.`
- `Failed to update your password.`
- `No email yet`

## Admin Dashboard

Primary source:

- `src/pages/AdminDashboard.tsx`

Messages:

- `Your admin session could not be verified. Please sign in again.`
- `Failed to manage staff account.`
- `Failed to manage student accounts.`
- `Failed to provision staff account.`
- `Failed to create account.`
- `Failed to delete account.`
- `Failed to migrate linked auth emails.`
- `Failed to refresh admin data.`
- `Failed to save the account email.`
- `Account created, but credential email failed: Unknown email error.`
- `Reset blocked: deploy manage-student-accounts before resetting linked students.`
- `Student reset blocked: deploy manage-student-accounts before resetting linked students.`
- `Unable to verify linked staff cleanup.`
- `Unable to verify linked student cleanup.`
- `Unknown email error.`
- `No student records found.`
- `No colleges yet. Add one above.`
- `Unknown`
- `Unnamed Student`

## Department Portal

Primary sources:

- `src/pages/DeptDashboard.tsx`
- `src/pages/dept/DeptAdmissionsPage.tsx`
- `src/pages/dept/DeptSupportApprovalsPage.tsx`
- `src/pages/dept/modals/DeptModals.tsx`

Messages:

- `Your department session could not be verified. Please sign in again.`
- `Failed to manage department admissions.`
- `Failed to manage department services.`
- `Failed to send the security OTP.`
- `Failed to update your department login email.`
- `Failed to update your department password.`
- `Failed to update your department profile.`
- `A valid profile name is required.`
- `Email is required.`
- `No applicant is selected for scheduling.`
- `Interview date and time are required.`
- `Failed to load interview queue.`
- `Failed to load email preview.`
- `Failed to open email preview.`
- `Failed to bulk approve applicants.`
- `Failed to bulk forward applicants.`
- `Failed to bulk mark applicants unsuccessful.`
- `Failed to mark applicant absent.`
- `Applicant approved, but email failed: Unknown email error.`
- `No email address available`
- `No subject available`
- `No preview available.`
- `No description provided.`
- `No pending support requests in queue.`
- `No completed requests yet.`
- `No reference ID`
- `Not set`
- `Date pending`

## CARE Staff Portal

Primary sources:

- `src/pages/CareStaffDashboard.tsx`
- `src/pages/carestaff/CounselingPage.tsx`
- `src/pages/carestaff/SupportRequestsPage.tsx`
- `src/pages/carestaff/NATManagementPage.tsx`
- `src/pages/carestaff/StudentPopulationPage.tsx`

Messages:

- `Your CARE Staff session could not be verified. Please sign in again.`
- `Failed to send the security OTP.`
- `Failed to update your staff login email.`
- `Failed to update your staff password.`
- `Failed to update your staff profile.`
- `A valid profile name is required.`
- `Email is required.`
- `Failed to manage CARE services.`
- `Please add notes for Dept Head.`
- `Please add resolution notes.`
- `No description provided.`
- `No requests found in this stage.`
- `No notes provided.`
- `No referral details provided.`
- `Schedule pending`
- `No match found`
- `The uploaded file does not contain any worksheet.`
- `The uploaded file has no data rows.`
- `No usable rows were found. Include at least a reference_id column.`
- `No reference IDs were found in the upload.`
- `Failed to parse the bulk pass file.`
- `Failed to bulk approve applicants.`
- `Failed to add NAT requirement.`
- `Failed to delete NAT requirement.`
- `Failed to load applicant details.`
- `Failed to load NAT data`
- `Review released NAT outcomes and admissions routing.`
- `Status Board`
- `Student not found`
- `No courses found for this department.`
- `No keys generated yet.`
- `Unassigned`
- `Year not set`

## NAT Applicant Flow

Primary source:

- `src/pages/NATPortal.tsx`

Messages:

- `Time API failed`
- `Failed to send NAT submission email.`
- `Activation failed.`
- `No test schedules are currently available.`
- `No test schedules are currently available. Please check back later.`
- `No requirements have been posted yet. Please check again later.`

## Calendar, Events, Feedback, Notifications

Primary sources:

- `src/components/NotificationBell.tsx`
- `src/pages/shared/StaffCalendarPage.tsx`
- `src/pages/student/StudentEventsView.tsx`
- `src/pages/student/views/FeedbackView.tsx`

Messages:

- `No notifications yet`
- `Date pending`
- `Time pending`
- `Venue pending`
- `Location pending`
- `All day`
- `Scheduled`
- `Location to be announced`
- `To be announced`
- `No additional details provided.`
- `Not recorded`
- `Anonymous`
- `Submitted via CSM feedback form.`

## Generic Display Placeholders

These appear throughout dashboards, tables, exports, and modal detail panes.

Primary sources:

- `src/pages/*`
- `src/components/*`
- `src/utils/*`

Messages:

- `—`
- `-`
- `N/A`
- `Unknown`
- `Unassigned`
- `Not set`
- `Not recorded`
- `No email provided`
- `No email yet`
- `No email address available`
- `No comment provided.`
- `No actions recorded.`
- `No rejection reason recorded.`
- `No resolution notes recorded.`
- `No referral details recorded.`
- `No specific requirements listed.`
- `No logs found.`
- `No records found.`
- `No requests found.`
- `No students found.`
- `No applicant is selected for scheduling.`
- `No applicants found for the current filters.`
- `No applicants could be approved.`
- `No applicants could be forwarded.`
- `No applicants could be marked unsuccessful.`
- `No applicants could be scheduled.`
- `ID Unknown`
- `Unknown Course`
- `Unknown Applicant`
- `Student`
- `User`
- `Staff`
- `file`

## Maintenance Notes

- This file is a living inventory, not a generated artifact.
- When adding new edge-function errors or new empty-state copy, update this file in the same PR.
- If a fallback is only used in tests, do not add it here.
