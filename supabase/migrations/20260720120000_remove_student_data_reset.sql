-- Remove the CARE bulk student-data reset capability entirely.
-- The edge-function modes (preview-care-student-reset, request-care-reset-otp,
-- care-reset-student-data) and the frontend danger-zone UI are deleted in the
-- same change. This migration removes the permission row and rewrites the
-- seed function so "reset to defaults" can never re-grant it.

-- 1. Delete any existing reset_student_data permission rows.
delete from public.role_permissions
where permission_type = 'action'
  and permission_key = 'reset_student_data';

-- 2. Update the live description of the manage-student-accounts function
--    permission (it no longer performs resets).
update public.role_permissions
set description = 'Staff-only student account operations and student-auth maintenance.',
    updated_at = timezone('utc'::text, now())
where role = 'Care Staff'
  and permission_type = 'function'
  and permission_key = 'manage-student-accounts';

-- 3. Recreate seed_default_role_permissions without the reset_student_data row
--    (and with the updated manage-student-accounts description), so a
--    reset-to-defaults cannot re-seed the removed permission.
CREATE OR REPLACE FUNCTION "public"."seed_default_role_permissions"("target_role" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql"
    SET search_path = 'public'
    AS $$
declare
    seeded_count integer := 0;
begin
    insert into public.role_permissions (
        role,
        permission_type,
        permission_key,
        is_allowed,
        status,
        notice_text,
        description
    )
    select
        defaults.role,
        defaults.permission_type,
        defaults.permission_key,
        defaults.is_allowed,
        defaults.status,
        defaults.notice_text,
        defaults.description
    from (
        values
            ('Admin', 'table', '*', true, 'enabled', null, 'Wildcard table access for Admin.'),
            ('Admin', 'function', '*', true, 'enabled', null, 'Wildcard edge-function access for Admin.'),
            ('Admin', 'feature', '*', true, 'enabled', null, 'Wildcard portal-feature access for Admin.'),
            ('Admin', 'action', '*', true, 'enabled', null, 'Wildcard action access for Admin.'),

            ('Care Staff', 'table', 'students', true, 'enabled', null, 'Student master records, profile data, and academic standing.'),
            ('Care Staff', 'table', 'applications', true, 'enabled', null, 'NAT and admissions application records.'),
            ('Care Staff', 'table', 'enrolled_students', true, 'enabled', null, 'Enrollment-key and student activation source records.'),
            ('Care Staff', 'table', 'counseling_requests', true, 'enabled', null, 'Counseling queue items and resolution records.'),
            ('Care Staff', 'table', 'support_requests', true, 'enabled', null, 'Support service requests and approval workflow records.'),
            ('Care Staff', 'table', 'events', true, 'enabled', null, 'Campus event publishing and scheduling data.'),
            ('Care Staff', 'table', 'scholarships', true, 'enabled', null, 'Scholarship offerings and lifecycle details.'),
            ('Care Staff', 'table', 'scholarship_applications', true, 'enabled', null, 'Student scholarship application submissions.'),
            ('Care Staff', 'table', 'forms', true, 'enabled', null, 'Needs assessment and dynamic form definitions.'),
            ('Care Staff', 'table', 'audit_logs', true, 'enabled', null, 'Cross-role activity monitoring and accountability records.'),
            ('Care Staff', 'table', 'departments', true, 'enabled', null, 'Department and college structure metadata.'),
            ('Care Staff', 'table', 'courses', true, 'enabled', null, 'Course-to-department routing data.'),
            ('Care Staff', 'table', 'notifications', true, 'enabled', null, 'Student-facing notifications triggered by staff workflows.'),
            ('Care Staff', 'table', 'office_visits', true, 'enabled', null, 'Office logbook and in-person visit history.'),
            ('Care Staff', 'table', 'general_feedback', true, 'enabled', null, 'General feedback submissions from students.'),
            ('Care Staff', 'table', 'event_attendance', true, 'enabled', null, 'Event attendance and participation records.'),
            ('Care Staff', 'table', 'submissions', true, 'enabled', null, 'Dynamic form submission records.'),
            ('Care Staff', 'table', 'answers', true, 'enabled', null, 'Per-question form response records.'),
            ('Care Staff', 'table', 'nat_requirements', true, 'enabled', null, 'NAT requirement definitions and checklist items.'),
            ('Care Staff', 'function', 'manage-student-accounts', true, 'enabled', null, 'Staff-only student account operations and student-auth maintenance.'),
            ('Care Staff', 'function', 'manage-care-services', true, 'enabled', null, 'CARE counseling and support workflow management.'),
            ('Care Staff', 'feature', 'student_population', true, 'enabled', null, 'Student population dashboards and filters.'),
            ('Care Staff', 'feature', 'student_analytics', true, 'enabled', null, 'Analytics cards, charts, and student trend reporting.'),
            ('Care Staff', 'feature', 'nat_management', true, 'enabled', null, 'NAT queue and admission-management workspace.'),
            ('Care Staff', 'feature', 'counseling', true, 'enabled', null, 'CARE counseling queue and session handling.'),
            ('Care Staff', 'feature', 'support_requests', true, 'enabled', null, 'CARE support-request queue and completion flows.'),
            ('Care Staff', 'feature', 'events', true, 'enabled', null, 'Event calendar, publishing, and activity updates.'),
            ('Care Staff', 'feature', 'scholarships', true, 'enabled', null, 'Scholarship listing and student scholarship operations.'),
            ('Care Staff', 'feature', 'forms', true, 'enabled', null, 'Form builder and submissions management.'),
            ('Care Staff', 'feature', 'feedback', true, 'enabled', null, 'Student feedback review and response tools.'),
            ('Care Staff', 'feature', 'audit_logs', true, 'enabled', null, 'Staff audit review screens and governance reporting.'),
            ('Care Staff', 'feature', 'office_logbook', true, 'enabled', null, 'Walk-in or office-visit tracking workspace.'),
            ('Care Staff', 'feature', 'export_center', true, 'enabled', null, 'CSV and operational export tools.'),
            ('Care Staff', 'feature', 'calendar', true, 'enabled', null, 'Shared calendar views for staff scheduling.'),
            ('Care Staff', 'feature', 'settings', true, 'enabled', null, 'Portal-level settings and governance controls.'),
            ('Care Staff', 'action', 'export_data', true, 'enabled', null, 'Generate and download staff export files.'),

            ('Department Head', 'table', 'applications', true, 'enabled', null, 'NAT and admissions application records.'),
            ('Department Head', 'table', 'enrolled_students', true, 'enabled', null, 'Enrollment-key and student activation source records.'),
            ('Department Head', 'table', 'counseling_requests', true, 'enabled', null, 'Counseling queue items and resolution records.'),
            ('Department Head', 'table', 'support_requests', true, 'enabled', null, 'Support service requests and approval workflow records.'),
            ('Department Head', 'table', 'events', true, 'enabled', null, 'Campus event publishing and scheduling data.'),
            ('Department Head', 'table', 'courses', true, 'enabled', null, 'Course-to-department routing data.'),
            ('Department Head', 'table', 'departments', true, 'enabled', null, 'Department and college structure metadata.'),
            ('Department Head', 'table', 'students', true, 'enabled', null, 'Student master records, profile data, and academic standing.'),
            ('Department Head', 'table', 'notifications', true, 'enabled', null, 'Student-facing notifications triggered by staff workflows.'),
            ('Department Head', 'table', 'office_visits', true, 'enabled', null, 'Office logbook and in-person visit history.'),
            ('Department Head', 'function', 'manage-department-admissions', true, 'enabled', null, 'Department interview scheduling and admissions decisions.'),
            ('Department Head', 'function', 'manage-department-services', true, 'enabled', null, 'Department counseling, support approvals, and referrals.'),
            ('Department Head', 'feature', 'admissions', true, 'enabled', null, 'Department admissions dashboard and application routing views.'),
            ('Department Head', 'feature', 'interview_queue', true, 'enabled', null, 'Interview-queue management and status updates.'),
            ('Department Head', 'feature', 'counseling_queue', true, 'enabled', null, 'Department counseling queue handling.'),
            ('Department Head', 'feature', 'support_approvals', true, 'enabled', null, 'Department support approval and scheduling tools.'),
            ('Department Head', 'feature', 'students', true, 'enabled', null, 'Department student roster and profile views.'),
            ('Department Head', 'feature', 'counseled', true, 'enabled', null, 'Completed counseling history and follow-up records.'),
            ('Department Head', 'feature', 'events', true, 'enabled', null, 'Event calendar, publishing, and activity updates.'),
            ('Department Head', 'feature', 'reports', true, 'enabled', null, 'Department reporting and summary outputs.'),
            ('Department Head', 'feature', 'calendar', true, 'enabled', null, 'Shared calendar views for staff scheduling.'),
            ('Department Head', 'feature', 'export_center', true, 'enabled', null, 'CSV and operational export tools.'),
            ('Department Head', 'feature', 'settings', true, 'enabled', null, 'Portal-level settings and governance controls.'),
            ('Department Head', 'action', 'approve_applications', true, 'enabled', null, 'Approve applications routed to a department.'),
            ('Department Head', 'action', 'schedule_interviews', true, 'enabled', null, 'Schedule or reschedule admissions interviews.'),
            ('Department Head', 'action', 'manage_own_department', true, 'enabled', null, 'Manage records limited to the actor''s assigned department.'),

            ('Public', 'feature', 'nat_portal', true, 'enabled', null, 'Public NAT application, status, and applicant login portal.')
    ) as defaults(role, permission_type, permission_key, is_allowed, status, notice_text, description)
    where target_role is null or defaults.role = target_role
    on conflict (role, permission_type, permission_key)
    do update set
        is_allowed = excluded.is_allowed,
        status = excluded.status,
        notice_text = excluded.notice_text,
        description = excluded.description,
        updated_at = timezone('utc'::text, now());

    get diagnostics seeded_count = row_count;
    return seeded_count;
end;
$$;

ALTER FUNCTION "public"."seed_default_role_permissions"("target_role" "text") OWNER TO "postgres";

-- 4. Purge any unconsumed destructive-reset OTPs so no stale code can ever be
--    replayed (the purpose no longer exists in any code path).
delete from public.security_change_otps
where purpose = 'destructive_reset';

-- 5. Tighten the purpose CHECK constraint so destructive_reset OTPs can never
--    be created again. Runs after the delete above so no rows violate it.
alter table public.security_change_otps
    drop constraint if exists security_change_otps_purpose_check;
alter table public.security_change_otps
    add constraint security_change_otps_purpose_check
    check (purpose = any (array['password_change'::text, 'email_change'::text, 'forgot_password'::text]));
