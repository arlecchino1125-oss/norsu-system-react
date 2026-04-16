begin;

do $$
begin
    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'current_staff_role'
    ) then
        raise exception 'Missing helper function public.current_staff_role(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'current_staff_account_id'
    ) then
        raise exception 'Missing helper function public.current_staff_account_id(). Run 20260320_harden_staff_accounts_rls.sql first.';
    end if;

    if not exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'is_admin'
    ) then
        raise exception 'Missing helper function public.is_admin(). Run 20260319_add_auth_context_helpers.sql first.';
    end if;
end
$$;

create table if not exists public.role_permissions (
    id uuid primary key default gen_random_uuid(),
    role varchar(50) not null,
    permission_type varchar(50) not null,
    permission_key varchar(255) not null,
    is_allowed boolean not null default true,
    description text,
    created_at timestamptz not null default timezone('utc'::text, now()),
    created_by bigint default nullif(public.current_staff_account_id(), '')::bigint references public.staff_accounts(id) on delete set null,
    updated_at timestamptz not null default timezone('utc'::text, now()),
    constraint role_permissions_role_check
        check (role in ('Admin', 'Care Staff', 'Department Head')),
    constraint role_permissions_permission_type_check
        check (permission_type in ('table', 'function', 'feature', 'action')),
    constraint role_permissions_permission_key_check
        check (length(btrim(permission_key)) > 0),
    constraint role_permissions_role_type_key_unique
        unique (role, permission_type, permission_key)
);

comment on table public.role_permissions
is 'Defines table, function, feature, and action permissions for staff portal roles.';

alter table public.role_permissions enable row level security;

create or replace function public.set_role_permissions_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$;

drop trigger if exists update_updated_at on public.role_permissions;

create trigger update_updated_at
before update on public.role_permissions
for each row
execute function public.set_role_permissions_updated_at();

create index if not exists idx_role_permissions_lookup
on public.role_permissions (role, permission_type, permission_key);

drop policy if exists role_permissions_staff_read on public.role_permissions;
drop policy if exists role_permissions_admin_manage on public.role_permissions;

create policy role_permissions_staff_read
on public.role_permissions
for select
to authenticated
using (
    public.current_staff_role() is not null
);

create policy role_permissions_admin_manage
on public.role_permissions
for all
to authenticated
using (
    public.is_admin()
)
with check (
    public.is_admin()
);

revoke all on public.role_permissions from public;
grant select, insert, update, delete on public.role_permissions to authenticated;
grant all on public.role_permissions to service_role;

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
        description
    )
    select
        defaults.role,
        defaults.permission_type,
        defaults.permission_key,
        defaults.is_allowed,
        defaults.description
    from (
        values
            ('Admin', 'table', '*', true, 'Wildcard table access for Admin.'),
            ('Admin', 'function', '*', true, 'Wildcard edge-function access for Admin.'),
            ('Admin', 'feature', '*', true, 'Wildcard portal-feature access for Admin.'),
            ('Admin', 'action', '*', true, 'Wildcard action access for Admin.'),

            ('Care Staff', 'table', 'students', true, 'Student master records, profile data, and academic standing.'),
            ('Care Staff', 'table', 'applications', true, 'NAT and admissions application records.'),
            ('Care Staff', 'table', 'enrolled_students', true, 'Enrollment-key and student activation source records.'),
            ('Care Staff', 'table', 'counseling_requests', true, 'Counseling queue items and resolution records.'),
            ('Care Staff', 'table', 'support_requests', true, 'Support service requests and approval workflow records.'),
            ('Care Staff', 'table', 'events', true, 'Campus event publishing and scheduling data.'),
            ('Care Staff', 'table', 'scholarships', true, 'Scholarship offerings and lifecycle details.'),
            ('Care Staff', 'table', 'scholarship_applications', true, 'Student scholarship application submissions.'),
            ('Care Staff', 'table', 'forms', true, 'Needs assessment and dynamic form definitions.'),
            ('Care Staff', 'table', 'audit_logs', true, 'Cross-role activity monitoring and accountability records.'),
            ('Care Staff', 'table', 'departments', true, 'Department and college structure metadata.'),
            ('Care Staff', 'table', 'courses', true, 'Course-to-department routing data.'),
            ('Care Staff', 'table', 'notifications', true, 'Student-facing notifications triggered by staff workflows.'),
            ('Care Staff', 'table', 'office_visits', true, 'Office logbook and in-person visit history.'),
            ('Care Staff', 'table', 'general_feedback', true, 'General feedback submissions from students.'),
            ('Care Staff', 'table', 'event_attendance', true, 'Event attendance and participation records.'),
            ('Care Staff', 'table', 'submissions', true, 'Dynamic form submission records.'),
            ('Care Staff', 'table', 'answers', true, 'Per-question form response records.'),
            ('Care Staff', 'table', 'nat_requirements', true, 'NAT requirement definitions and checklist items.'),
            ('Care Staff', 'function', 'manage-student-accounts', true, 'Staff-only student account operations, resets, and student-auth maintenance.'),
            ('Care Staff', 'function', 'manage-care-services', true, 'CARE counseling and support workflow management.'),
            ('Care Staff', 'feature', 'student_population', true, 'Student population dashboards and filters.'),
            ('Care Staff', 'feature', 'student_analytics', true, 'Analytics cards, charts, and student trend reporting.'),
            ('Care Staff', 'feature', 'nat_management', true, 'NAT queue and admission-management workspace.'),
            ('Care Staff', 'feature', 'counseling', true, 'CARE counseling queue and session handling.'),
            ('Care Staff', 'feature', 'support_requests', true, 'CARE support-request queue and completion flows.'),
            ('Care Staff', 'feature', 'events', true, 'Event calendar, publishing, and activity updates.'),
            ('Care Staff', 'feature', 'scholarships', true, 'Scholarship listing and student scholarship operations.'),
            ('Care Staff', 'feature', 'forms', true, 'Form builder and submissions management.'),
            ('Care Staff', 'feature', 'feedback', true, 'Student feedback review and response tools.'),
            ('Care Staff', 'feature', 'audit_logs', true, 'Staff audit review screens and governance reporting.'),
            ('Care Staff', 'feature', 'office_logbook', true, 'Walk-in or office-visit tracking workspace.'),
            ('Care Staff', 'feature', 'export_center', true, 'CSV and operational export tools.'),
            ('Care Staff', 'feature', 'calendar', true, 'Shared calendar views for staff scheduling.'),
            ('Care Staff', 'feature', 'settings', true, 'Portal-level settings and governance controls.'),
            ('Care Staff', 'action', 'reset_student_data', true, 'Perform the CARE destructive student-data reset workflow.'),
            ('Care Staff', 'action', 'export_data', true, 'Generate and download staff export files.'),

            ('Department Head', 'table', 'applications', true, 'NAT and admissions application records.'),
            ('Department Head', 'table', 'enrolled_students', true, 'Enrollment-key and student activation source records.'),
            ('Department Head', 'table', 'counseling_requests', true, 'Counseling queue items and resolution records.'),
            ('Department Head', 'table', 'support_requests', true, 'Support service requests and approval workflow records.'),
            ('Department Head', 'table', 'events', true, 'Campus event publishing and scheduling data.'),
            ('Department Head', 'table', 'courses', true, 'Course-to-department routing data.'),
            ('Department Head', 'table', 'departments', true, 'Department and college structure metadata.'),
            ('Department Head', 'table', 'students', true, 'Student master records, profile data, and academic standing.'),
            ('Department Head', 'table', 'notifications', true, 'Student-facing notifications triggered by staff workflows.'),
            ('Department Head', 'table', 'office_visits', true, 'Office logbook and in-person visit history.'),
            ('Department Head', 'function', 'manage-department-admissions', true, 'Department interview scheduling and admissions decisions.'),
            ('Department Head', 'function', 'manage-department-services', true, 'Department counseling, support approvals, and referrals.'),
            ('Department Head', 'feature', 'admissions', true, 'Department admissions dashboard and application routing views.'),
            ('Department Head', 'feature', 'interview_queue', true, 'Interview-queue management and status updates.'),
            ('Department Head', 'feature', 'counseling_queue', true, 'Department counseling queue handling.'),
            ('Department Head', 'feature', 'support_approvals', true, 'Department support approval and scheduling tools.'),
            ('Department Head', 'feature', 'students', true, 'Department student roster and profile views.'),
            ('Department Head', 'feature', 'counseled', true, 'Completed counseling history and follow-up records.'),
            ('Department Head', 'feature', 'events', true, 'Event calendar, publishing, and activity updates.'),
            ('Department Head', 'feature', 'reports', true, 'Department reporting and summary outputs.'),
            ('Department Head', 'feature', 'calendar', true, 'Shared calendar views for staff scheduling.'),
            ('Department Head', 'feature', 'settings', true, 'Portal-level settings and governance controls.'),
            ('Department Head', 'action', 'approve_applications', true, 'Approve applications routed to a department.'),
            ('Department Head', 'action', 'schedule_interviews', true, 'Schedule or reschedule admissions interviews.'),
            ('Department Head', 'action', 'manage_own_department', true, 'Manage records limited to the actor''s assigned department.')
    ) as defaults(role, permission_type, permission_key, is_allowed, description)
    where target_role is null or defaults.role = target_role
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

    if target_role not in ('Care Staff', 'Department Head') then
        raise exception 'Only Care Staff and Department Head can be reset to defaults.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated' and not public.is_admin() then
        raise exception 'Admin privileges are required to reset role permissions.';
    end if;

    delete from public.role_permissions
    where role = target_role;

    seeded_count := public.seed_default_role_permissions(target_role);
    return seeded_count;
end;
$$;

revoke all on function public.seed_default_role_permissions(text) from public;
revoke all on function public.reset_role_permissions_to_defaults(text) from public;

grant execute on function public.seed_default_role_permissions(text) to authenticated, service_role;
grant execute on function public.reset_role_permissions_to_defaults(text) to authenticated, service_role;

select public.seed_default_role_permissions();

commit;
