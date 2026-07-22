-- forms / questions / submissions / answers have only ever served one feature:
-- Needs Assessment. Event evaluations are about to land as their own tables, so
-- the generic names stop being true. Rename before adding, not after.
--
-- Names only. No column changes, no data changes, no policy logic changes --
-- every policy below keeps the exact predicate it had, under a new name.

-- 1. Tables.
ALTER TABLE public.forms       RENAME TO needs_assessment_forms;
ALTER TABLE public.questions   RENAME TO needs_assessment_questions;
ALTER TABLE public.submissions RENAME TO needs_assessment_submissions;
ALTER TABLE public.answers     RENAME TO needs_assessment_answers;

-- 2. Identity sequences (a table rename does not carry these along).
ALTER SEQUENCE public.forms_id_seq       RENAME TO needs_assessment_forms_id_seq;
ALTER SEQUENCE public.questions_id_seq   RENAME TO needs_assessment_questions_id_seq;
ALTER SEQUENCE public.submissions_id_seq RENAME TO needs_assessment_submissions_id_seq;
ALTER SEQUENCE public.answers_id_seq     RENAME TO needs_assessment_answers_id_seq;

-- 3. Constraints. PostgREST surfaces these names in error responses, so a
--    half-renamed schema leaks the old vocabulary back to the client.
ALTER TABLE public.needs_assessment_forms
    RENAME CONSTRAINT forms_pkey TO needs_assessment_forms_pkey;

ALTER TABLE public.needs_assessment_questions
    RENAME CONSTRAINT questions_pkey TO needs_assessment_questions_pkey;
ALTER TABLE public.needs_assessment_questions
    RENAME CONSTRAINT questions_form_id_fkey TO needs_assessment_questions_form_id_fkey;

ALTER TABLE public.needs_assessment_submissions
    RENAME CONSTRAINT submissions_pkey TO needs_assessment_submissions_pkey;
ALTER TABLE public.needs_assessment_submissions
    RENAME CONSTRAINT submissions_form_id_fkey TO needs_assessment_submissions_form_id_fkey;
ALTER TABLE public.needs_assessment_submissions
    RENAME CONSTRAINT fk_submissions_students TO fk_needs_assessment_submissions_students;

ALTER TABLE public.needs_assessment_answers
    RENAME CONSTRAINT answers_pkey TO needs_assessment_answers_pkey;
ALTER TABLE public.needs_assessment_answers
    RENAME CONSTRAINT answers_question_id_fkey TO needs_assessment_answers_question_id_fkey;
ALTER TABLE public.needs_assessment_answers
    RENAME CONSTRAINT answers_submission_id_fkey TO needs_assessment_answers_submission_id_fkey;

-- 4. Indexes.
ALTER INDEX public.idx_questions_form_id
    RENAME TO idx_needs_assessment_questions_form_id;
ALTER INDEX public.idx_submissions_form_id
    RENAME TO idx_needs_assessment_submissions_form_id;
ALTER INDEX public.idx_submissions_student_id
    RENAME TO idx_needs_assessment_submissions_student_id;
ALTER INDEX public.submissions_one_per_student_form
    RENAME TO needs_assessment_submissions_one_per_student_form;
ALTER INDEX public.idx_answers_question_id
    RENAME TO idx_needs_assessment_answers_question_id;
ALTER INDEX public.idx_answers_submission_id
    RENAME TO idx_needs_assessment_answers_submission_id;
ALTER INDEX public.answers_one_per_submission_question
    RENAME TO needs_assessment_answers_one_per_submission_question;

-- 5. Policies.
ALTER POLICY forms_admin_delete       ON public.needs_assessment_forms RENAME TO needs_assessment_forms_admin_delete;
ALTER POLICY forms_authenticated_read ON public.needs_assessment_forms RENAME TO needs_assessment_forms_authenticated_read;
ALTER POLICY forms_care_admin_insert  ON public.needs_assessment_forms RENAME TO needs_assessment_forms_care_admin_insert;
ALTER POLICY forms_care_admin_update  ON public.needs_assessment_forms RENAME TO needs_assessment_forms_care_admin_update;

ALTER POLICY questions_admin_delete       ON public.needs_assessment_questions RENAME TO needs_assessment_questions_admin_delete;
ALTER POLICY questions_authenticated_read ON public.needs_assessment_questions RENAME TO needs_assessment_questions_authenticated_read;
ALTER POLICY questions_care_admin_insert  ON public.needs_assessment_questions RENAME TO needs_assessment_questions_care_admin_insert;
ALTER POLICY questions_care_admin_update  ON public.needs_assessment_questions RENAME TO needs_assessment_questions_care_admin_update;

ALTER POLICY submissions_admin_delete      ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_admin_delete;
ALTER POLICY submissions_care_admin_insert ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_care_admin_insert;
ALTER POLICY submissions_care_admin_select ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_care_admin_select;
ALTER POLICY submissions_care_admin_update ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_care_admin_update;
ALTER POLICY submissions_student_insert_own ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_student_insert_own;
ALTER POLICY submissions_student_read_own   ON public.needs_assessment_submissions RENAME TO needs_assessment_submissions_student_read_own;

ALTER POLICY answers_admin_delete       ON public.needs_assessment_answers RENAME TO needs_assessment_answers_admin_delete;
ALTER POLICY answers_care_admin_insert  ON public.needs_assessment_answers RENAME TO needs_assessment_answers_care_admin_insert;
ALTER POLICY answers_care_admin_select  ON public.needs_assessment_answers RENAME TO needs_assessment_answers_care_admin_select;
ALTER POLICY answers_care_admin_update  ON public.needs_assessment_answers RENAME TO needs_assessment_answers_care_admin_update;
ALTER POLICY answers_student_insert_own ON public.needs_assessment_answers RENAME TO needs_assessment_answers_student_insert_own;
ALTER POLICY answers_student_read_own   ON public.needs_assessment_answers RENAME TO needs_assessment_answers_student_read_own;

-- 6. Live permission rows. The 'feature' key 'forms' is deliberately untouched:
--    that is the Care Staff nav tab, which also holds Volunteers and Hours.
UPDATE public.role_permissions
SET permission_key = 'needs_assessment_forms',
    description = 'Needs assessment form definitions.',
    updated_at = timezone('utc'::text, now())
WHERE permission_type = 'table' AND permission_key = 'forms';

UPDATE public.role_permissions
SET permission_key = 'needs_assessment_submissions',
    description = 'Needs assessment submission records.',
    updated_at = timezone('utc'::text, now())
WHERE permission_type = 'table' AND permission_key = 'submissions';

UPDATE public.role_permissions
SET permission_key = 'needs_assessment_answers',
    description = 'Needs assessment per-question response records.',
    updated_at = timezone('utc'::text, now())
WHERE permission_type = 'table' AND permission_key = 'answers';

-- 7. Reseed functions carry the permission keys as string literals, so a
--    "reset to defaults" would otherwise resurrect the old names.
--    CREATE OR REPLACE drops SET clauses, hence the explicit search_path.
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
            ('Care Staff', 'table', 'needs_assessment_forms', true, 'enabled', null, 'Needs assessment form definitions.'),
            ('Care Staff', 'table', 'audit_logs', true, 'enabled', null, 'Cross-role activity monitoring and accountability records.'),
            ('Care Staff', 'table', 'departments', true, 'enabled', null, 'Department and college structure metadata.'),
            ('Care Staff', 'table', 'courses', true, 'enabled', null, 'Course-to-department routing data.'),
            ('Care Staff', 'table', 'notifications', true, 'enabled', null, 'Student-facing notifications triggered by staff workflows.'),
            ('Care Staff', 'table', 'office_visits', true, 'enabled', null, 'Office logbook and in-person visit history.'),
            ('Care Staff', 'table', 'general_feedback', true, 'enabled', null, 'General feedback submissions from students.'),
            ('Care Staff', 'table', 'event_attendance', true, 'enabled', null, 'Event attendance and participation records.'),
            ('Care Staff', 'table', 'needs_assessment_submissions', true, 'enabled', null, 'Needs assessment submission records.'),
            ('Care Staff', 'table', 'needs_assessment_answers', true, 'enabled', null, 'Needs assessment per-question response records.'),
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

CREATE OR REPLACE FUNCTION "public"."seed_student_role_permissions"() RETURNS integer
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
    values
        ('Student', 'table', 'students', true, 'enabled', null, 'Student master records, profile data, and academic standing.'),
        ('Student', 'table', 'counseling_requests', true, 'enabled', null, 'Counseling queue items and resolution records.'),
        ('Student', 'table', 'support_requests', true, 'enabled', null, 'Support service requests and approval workflow records.'),
        ('Student', 'table', 'needs_assessment_forms', true, 'enabled', null, 'Needs assessment form definitions.'),
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
        ('Student', 'table', 'needs_assessment_submissions', true, 'enabled', null, 'Needs assessment submission records.'),
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

ALTER FUNCTION "public"."seed_student_role_permissions"() OWNER TO "postgres";
