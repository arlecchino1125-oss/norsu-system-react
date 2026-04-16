begin;

alter table public.role_permissions
drop constraint if exists role_permissions_role_check;

alter table public.role_permissions
add constraint role_permissions_role_check
check (role in ('Admin', 'Care Staff', 'Department Head', 'Student'));

drop policy if exists role_permissions_staff_read on public.role_permissions;
drop policy if exists role_permissions_role_read on public.role_permissions;

create policy role_permissions_role_read
on public.role_permissions
for select
to authenticated
using (
    public.current_staff_role() is not null
    or (
        auth.uid() is not null
        and role = 'Student'
    )
);

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
        description
    )
    values
        ('Student', 'table', 'students', true, 'Student master records, profile data, and academic standing.'),
        ('Student', 'table', 'counseling_requests', true, 'Counseling queue items and resolution records.'),
        ('Student', 'table', 'support_requests', true, 'Support service requests and approval workflow records.'),
        ('Student', 'table', 'forms', true, 'Needs assessment and dynamic form definitions.'),
        ('Student', 'table', 'events', true, 'Campus event publishing and scheduling data.'),
        ('Student', 'table', 'event_attendance', true, 'Event attendance and participation records.'),
        ('Student', 'table', 'event_feedback', true, 'Student event evaluation and rating records.'),
        ('Student', 'table', 'scholarships', true, 'Scholarship offerings and lifecycle details.'),
        ('Student', 'table', 'scholarship_applications', true, 'Student scholarship application submissions.'),
        ('Student', 'table', 'notifications', true, 'Student-facing notifications triggered by staff workflows.'),
        ('Student', 'table', 'office_visits', true, 'Office logbook and in-person visit history.'),
        ('Student', 'table', 'office_visit_reasons', true, 'Reference options for office-visit time-in reasons.'),
        ('Student', 'table', 'general_feedback', true, 'General feedback submissions from students.'),
        ('Student', 'table', 'security_change_otps', true, 'One-time passcode records for security-sensitive actions.'),
        ('Student', 'table', 'submissions', true, 'Dynamic form submission records.'),
        ('Student', 'table', 'enrolled_students', true, 'Enrollment-key and student activation source records.'),
        ('Student', 'table', 'courses', true, 'Course-to-department routing data.'),
        ('Student', 'function', 'manage-student-accounts', true, 'Student self-service account operations and security changes.'),
        ('Student', 'feature', 'dashboard', true, 'Student home dashboard with notifications, history, and quick links.'),
        ('Student', 'feature', 'profile', true, 'Student profile viewing and editing experience.'),
        ('Student', 'feature', 'assessment', true, 'Needs assessment forms and completion history.'),
        ('Student', 'feature', 'counseling', true, 'Student counseling requests and session feedback.'),
        ('Student', 'feature', 'support', true, 'Additional support request workflow.'),
        ('Student', 'feature', 'scholarship', true, 'Student scholarship browsing and application tracking.'),
        ('Student', 'feature', 'events', true, 'Event calendar, publishing, and activity updates.'),
        ('Student', 'feature', 'feedback', true, 'Student evaluation and feedback history.'),
        ('Student', 'action', 'update_profile', true, 'Update the student profile, profile picture, and academic self-service fields.'),
        ('Student', 'action', 'change_security_credentials', true, 'Change the student email or password through OTP verification.'),
        ('Student', 'action', 'complete_assessment', true, 'Submit available needs assessment forms.'),
        ('Student', 'action', 'request_counseling', true, 'Create counseling requests and submit session feedback.'),
        ('Student', 'action', 'request_support', true, 'Create additional support requests.'),
        ('Student', 'action', 'apply_scholarship', true, 'Apply to scholarship opportunities.'),
        ('Student', 'action', 'manage_event_attendance', true, 'Time in, time out, and rate student events.'),
        ('Student', 'action', 'complete_office_visit', true, 'Complete office-visit time in or time out actions.'),
        ('Student', 'action', 'submit_feedback', true, 'Submit student feedback and general evaluations.')
    on conflict (role, permission_type, permission_key)
    do update set
        is_allowed = excluded.is_allowed,
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

    if target_role not in ('Care Staff', 'Department Head', 'Student') then
        raise exception 'Only Care Staff, Department Head, and Student can be reset to defaults.';
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

revoke all on function public.seed_student_role_permissions() from public;
grant execute on function public.seed_student_role_permissions() to authenticated, service_role;

select public.seed_student_role_permissions();

commit;
