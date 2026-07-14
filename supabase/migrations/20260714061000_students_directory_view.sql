-- Finding #2: Registrar and Department Head read whole student rows (RLS filters
-- rows, not columns), exposing medical / disability / pregnancy / criminal /
-- family-financial fields they have no operational need for.
--
-- This view exposes ONLY identity / enrollment / academic columns, with the same
-- row scoping the base-table policies use. Registrar/Dept-Head reads (profile
-- modal, export) go through it so sensitive columns never reach the client.
-- A plain (non-security_invoker) view runs as its owner and applies its own
-- WHERE as the row filter, so it keeps working even if the base-table SELECT
-- policies are later removed. auth.uid() inside the helper calls still reflects
-- the CALLING user's JWT, so per-role/per-department scoping is preserved.
--
-- Sensitive columns intentionally omitted: all spouse_/mother_/father_/parent_/
-- guardian_/emergency_ fields, supporter/employer/working-student (financial),
-- is_pwd/pwd_*/disability_cause, currently_pregnant, is_indigenous/indigenous_*/
-- ip_document_url, is_four_ps_member/four_ps_document_url, is_rebel_returnee,
-- witnessed_conflict, is_safe_in_community, solo-parent/orphan/homeless/senior
-- fields, has_been_criminally_charged/has_been_convicted_of_crime and their
-- detail columns, and work_experiences.

CREATE OR REPLACE VIEW public.students_directory AS
    SELECT
        s.id,
        s.created_at,
        s.student_id,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.suffix,
        s.dob,
        s.age,
        s.place_of_birth,
        s.nationality,
        s.sex,
        s.gender_identity,
        s.civil_status,
        s.profile_picture_url,
        s.facebook_url,
        s.religion,
        s.email,
        s.mobile,
        s.street,
        s.city,
        s.province,
        s.zip_code,
        s.region,
        s.course,
        s.year_level,
        s.section,
        s.department,
        s.status,
        s.school_last_attended,
        s.elem_school,
        s.elem_year_graduated,
        s.junior_high_school,
        s.junior_high_year_graduated,
        s.senior_high_school,
        s.senior_high_year_graduated,
        s.college_school,
        s.college_year_graduated,
        s.honors_awards,
        s.tesda_nc2_acquired,
        s.eligibility_acquired,
        s.special_trainings_attended,
        s.extracurricular_activities,
        s.holds_public_service_position,
        s.public_service_position,
        s.organizations_memberships,
        s.sports_skills,
        s.other_talents,
        s.scholarships_availed,
        s.profile_completed,
        s.is_archived,
        s.archived_at,
        s.address,
        s.priority_course,
        s.alt_course_1,
        s.alt_course_2
    FROM public.students s
    WHERE
        public.is_admin()
        OR public.current_staff_role() = 'Care Staff'
        OR public.current_staff_role() = 'Registrar'
        OR (
            public.current_staff_role() = 'Department Head'
            AND coalesce(s.department, '') = coalesce(public.current_staff_department(), '')
        );

ALTER VIEW public.students_directory OWNER TO postgres;

REVOKE ALL ON public.students_directory FROM PUBLIC, anon;
GRANT SELECT ON public.students_directory TO authenticated, service_role;

COMMENT ON VIEW public.students_directory IS
    'Non-sensitive student columns (identity/enrollment/academic) for Registrar and Department Head, row-scoped by staff role/department. Excludes medical, disability, pregnancy, criminal, and family-financial fields.';

-- Keep the existing ranked search implementation, but put the privileged
-- boundary in a small wrapper that authenticates staff before bypassing RLS.
ALTER FUNCTION public.search_care_students(text, text, text, text, text, text, integer, integer, text, boolean)
    RENAME TO search_care_students_impl;

REVOKE ALL ON FUNCTION public.search_care_students_impl(text, text, text, text, text, text, integer, integer, text, boolean)
    FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_care_students(
    p_search text DEFAULT '',
    p_department text DEFAULT NULL,
    p_course text DEFAULT NULL,
    p_year_level text DEFAULT NULL,
    p_section text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_page integer DEFAULT 1,
    p_page_size integer DEFAULT 5,
    p_sort_column text DEFAULT 'created_at',
    p_sort_ascending boolean DEFAULT false
) RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    student_id text,
    first_name text,
    last_name text,
    course text,
    year_level text,
    section text,
    department text,
    status text,
    profile_completed boolean,
    course_year_update_required boolean,
    course_year_window_start timestamptz,
    course_year_window_end timestamptz,
    course_year_confirmed_at timestamptz,
    course_year_archive jsonb,
    is_archived boolean,
    archived_at timestamptz,
    archived_reason text,
    archived_by text,
    archive_note text,
    total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
    v_role text;
    v_department text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_role := public.current_staff_role();
    IF v_role IS NULL OR v_role NOT IN ('Admin', 'Care Staff', 'Registrar', 'Department Head') THEN
        RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
    END IF;

    IF v_role = 'Department Head' AND nullif(btrim(coalesce(public.current_staff_department(), '')), '') IS NULL THEN
        RAISE EXCEPTION 'Staff department required' USING ERRCODE = '42501';
    END IF;

    v_department := CASE
        WHEN v_role = 'Department Head' THEN public.current_staff_department()
        ELSE p_department
    END;

    RETURN QUERY
    SELECT result.*
    FROM public.search_care_students_impl(
        p_search,
        v_department,
        p_course,
        p_year_level,
        p_section,
        p_status,
        p_page,
        p_page_size,
        p_sort_column,
        p_sort_ascending
    ) AS result;
END;
$$;

ALTER FUNCTION public.search_care_students(text, text, text, text, text, text, integer, integer, text, boolean)
    OWNER TO postgres;

REVOKE ALL ON FUNCTION public.search_care_students(text, text, text, text, text, text, integer, integer, text, boolean)
    FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.search_care_students(text, text, text, text, text, text, integer, integer, text, boolean)
    TO authenticated;

DROP POLICY IF EXISTS students_registrar_read ON public.students;
DROP POLICY IF EXISTS students_department_head_read_department ON public.students;

-- Fail the migration if its security boundary is accidentally weakened.
DO $$
DECLARE
    v_search_oid oid;
BEGIN
    SELECT p.oid
    INTO v_search_oid
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'search_care_students';

    IF v_search_oid IS NULL
       OR NOT (SELECT p.prosecdef FROM pg_proc AS p WHERE p.oid = v_search_oid)
       OR has_function_privilege('anon', v_search_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'search_care_students security contract is not installed';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'students'
          AND policyname IN ('students_registrar_read', 'students_department_head_read_department')
    ) THEN
        RAISE EXCEPTION 'broad student read policies still exist';
    END IF;
END;
$$;
