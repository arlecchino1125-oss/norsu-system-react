begin;

alter table public.role_permissions
    add column if not exists status varchar(32) not null default 'enabled',
    add column if not exists notice_text text;

alter table public.role_permissions
drop constraint if exists role_permissions_role_check;

alter table public.role_permissions
add constraint role_permissions_role_check
check (role in ('Admin', 'Care Staff', 'Department Head', 'Student', 'Public'));

alter table public.role_permissions
drop constraint if exists role_permissions_status_check;

alter table public.role_permissions
add constraint role_permissions_status_check
check (status in ('enabled', 'hidden', 'maintenance', 'coming_soon'));

update public.role_permissions
set status = case
    when is_allowed then 'enabled'
    else 'hidden'
end
where status is null
   or (not is_allowed and status = 'enabled');

drop policy if exists role_permissions_staff_read on public.role_permissions;
drop policy if exists role_permissions_role_read on public.role_permissions;

create policy role_permissions_role_read
on public.role_permissions
for select
to anon, authenticated
using (
    role = 'Public'
    or public.current_staff_role() is not null
    or (
        auth.uid() is not null
        and role = 'Student'
    )
);

grant select on public.role_permissions to anon;

create or replace function public.seed_default_role_permissions(target_role text default null)
returns integer
language plpgsql
as $$
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
            ('Care Staff', 'function', 'manage-student-accounts', true, 'enabled', null, 'Staff-only student account operations, resets, and student-auth maintenance.'),
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
            ('Care Staff', 'action', 'reset_student_data', true, 'enabled', null, 'Perform the CARE destructive student-data reset workflow.'),
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

create or replace function public.seed_student_role_permissions()
returns integer
language plpgsql
as $$
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
    values
        ('Student', 'table', 'students', true, 'enabled', null, 'Student master records, profile data, and academic standing.'),
        ('Student', 'table', 'counseling_requests', true, 'enabled', null, 'Counseling queue items and resolution records.'),
        ('Student', 'table', 'support_requests', true, 'enabled', null, 'Support service requests and approval workflow records.'),
        ('Student', 'table', 'forms', true, 'enabled', null, 'Needs assessment and dynamic form definitions.'),
        ('Student', 'table', 'events', true, 'enabled', null, 'Campus event publishing and scheduling data.'),
        ('Student', 'table', 'event_attendance', true, 'enabled', null, 'Event attendance and participation records.'),
        ('Student', 'table', 'event_feedback', true, 'enabled', null, 'Student event evaluation and rating records.'),
        ('Student', 'table', 'scholarships', true, 'enabled', null, 'Scholarship offerings and lifecycle details.'),
        ('Student', 'table', 'scholarship_applications', true, 'enabled', null, 'Student scholarship application submissions.'),
        ('Student', 'table', 'notifications', true, 'enabled', null, 'Student-facing notifications triggered by staff workflows.'),
        ('Student', 'table', 'office_visits', true, 'enabled', null, 'Office logbook and in-person visit history.'),
        ('Student', 'table', 'office_visit_reasons', true, 'enabled', null, 'Reference options for office-visit time-in reasons.'),
        ('Student', 'table', 'general_feedback', true, 'enabled', null, 'General feedback submissions from students.'),
        ('Student', 'table', 'security_change_otps', true, 'enabled', null, 'One-time passcode records for security-sensitive actions.'),
        ('Student', 'table', 'submissions', true, 'enabled', null, 'Dynamic form submission records.'),
        ('Student', 'table', 'enrolled_students', true, 'enabled', null, 'Enrollment-key and student activation source records.'),
        ('Student', 'table', 'courses', true, 'enabled', null, 'Course-to-department routing data.'),
        ('Student', 'function', 'manage-student-accounts', true, 'enabled', null, 'Student self-service account operations and security changes.'),
        ('Student', 'feature', 'dashboard', true, 'enabled', null, 'Student home dashboard with notifications, history, and quick links.'),
        ('Student', 'feature', 'profile', true, 'enabled', null, 'Student profile viewing and editing experience.'),
        ('Student', 'feature', 'assessment', true, 'enabled', null, 'Needs assessment forms and completion history.'),
        ('Student', 'feature', 'counseling', true, 'enabled', null, 'Student counseling requests and session feedback.'),
        ('Student', 'feature', 'support', true, 'enabled', null, 'Additional support request workflow.'),
        ('Student', 'feature', 'scholarship', true, 'enabled', null, 'Student scholarship browsing and application tracking.'),
        ('Student', 'feature', 'events', true, 'enabled', null, 'Event calendar, publishing, and activity updates.'),
        ('Student', 'feature', 'feedback', true, 'enabled', null, 'Student evaluation and feedback history.'),
        ('Student', 'action', 'update_profile', true, 'enabled', null, 'Update the student profile, profile picture, and academic self-service fields.'),
        ('Student', 'action', 'change_security_credentials', true, 'enabled', null, 'Change the student email or password through OTP verification.'),
        ('Student', 'action', 'complete_assessment', true, 'enabled', null, 'Submit available needs assessment forms.'),
        ('Student', 'action', 'request_counseling', true, 'enabled', null, 'Create counseling requests and submit session feedback.'),
        ('Student', 'action', 'request_support', true, 'enabled', null, 'Create additional support requests.'),
        ('Student', 'action', 'apply_scholarship', true, 'enabled', null, 'Apply to scholarship opportunities.'),
        ('Student', 'action', 'manage_event_attendance', true, 'enabled', null, 'Time in, time out, and rate student events.'),
        ('Student', 'action', 'complete_office_visit', true, 'enabled', null, 'Complete office-visit time in or time out actions.'),
        ('Student', 'action', 'submit_feedback', true, 'enabled', null, 'Submit student feedback and general evaluations.')
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

create or replace function public.reset_role_permissions_to_defaults(target_role text)
returns integer
language plpgsql
as $$
declare
    seeded_count integer := 0;
begin
    if coalesce(btrim(target_role), '') = '' then
        raise exception 'Target role is required.';
    end if;

    if target_role not in ('Care Staff', 'Department Head', 'Student', 'Public') then
        raise exception 'Only Care Staff, Department Head, Student, and Public can be reset to defaults.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
        raise exception 'Admin privileges are required to reset role permissions.';
    end if;

    delete from public.role_permissions
    where role = target_role;

    if target_role = 'Student' then
        seeded_count := public.seed_student_role_permissions();
    else
        seeded_count := public.seed_default_role_permissions(target_role);
    end if;

    return seeded_count;
end;
$$;

revoke all on function public.seed_default_role_permissions(text) from public;
revoke all on function public.seed_student_role_permissions() from public;
revoke all on function public.reset_role_permissions_to_defaults(text) from public;

grant execute on function public.seed_default_role_permissions(text) to authenticated, service_role;
grant execute on function public.seed_student_role_permissions() to authenticated, service_role;
grant execute on function public.reset_role_permissions_to_defaults(text) to authenticated, service_role;

insert into public.role_permissions (
    role,
    permission_type,
    permission_key,
    is_allowed,
    status,
    notice_text,
    description
)
values (
    'Department Head',
    'feature',
    'export_center',
    true,
    'enabled',
    null,
    'CSV and operational export tools.'
)
on conflict (role, permission_type, permission_key) do nothing;

insert into public.role_permissions (
    role,
    permission_type,
    permission_key,
    is_allowed,
    status,
    notice_text,
    description
)
values (
    'Public',
    'feature',
    'nat_portal',
    true,
    'enabled',
    null,
    'Public NAT application, status, and applicant login portal.'
)
on conflict (role, permission_type, permission_key) do nothing;

commit;
