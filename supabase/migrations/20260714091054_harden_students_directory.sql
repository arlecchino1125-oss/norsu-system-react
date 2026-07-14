-- Harden the student directory without breaking existing portal queries.
-- The view becomes SECURITY INVOKER; the only privileged step is this narrow,
-- explicitly authorized function with a fixed, non-sensitive return shape.

CREATE OR REPLACE FUNCTION public.get_students_directory_rows()
RETURNS TABLE(
    id bigint,
    created_at timestamptz,
    student_id text,
    first_name text,
    middle_name text,
    last_name text,
    suffix text,
    dob date,
    age integer,
    place_of_birth text,
    nationality text,
    sex text,
    gender_identity text,
    civil_status text,
    profile_picture_url text,
    facebook_url text,
    religion text,
    email text,
    mobile text,
    street text,
    city text,
    province text,
    zip_code text,
    region text,
    course text,
    year_level text,
    section text,
    department text,
    status text,
    school_last_attended text,
    elem_school text,
    elem_year_graduated text,
    junior_high_school text,
    junior_high_year_graduated text,
    senior_high_school text,
    senior_high_year_graduated text,
    college_school text,
    college_year_graduated text,
    honors_awards text,
    tesda_nc2_acquired text,
    eligibility_acquired text,
    special_trainings_attended text,
    extracurricular_activities text,
    holds_public_service_position boolean,
    public_service_position text,
    organizations_memberships text,
    sports_skills text,
    other_talents text,
    scholarships_availed text,
    profile_completed boolean,
    is_archived boolean,
    archived_at timestamptz,
    address text,
    priority_course text,
    alt_course_1 text,
    alt_course_2 text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_role text;
    v_department text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    v_role := CASE
        WHEN public.is_admin() THEN 'Admin'
        ELSE public.current_staff_role()
    END;

    IF v_role IS NULL
       OR v_role NOT IN ('Admin', 'Care Staff', 'Registrar', 'Department Head') THEN
        RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
    END IF;

    IF v_role = 'Department Head' THEN
        v_department := nullif(btrim(coalesce(public.current_staff_department(), '')), '');

        IF v_department IS NULL THEN
            RAISE EXCEPTION 'Staff department required' USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN QUERY
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
    FROM public.students AS s
    WHERE v_role IN ('Admin', 'Care Staff', 'Registrar')
       OR (v_role = 'Department Head' AND s.department = v_department);
END;
$$;

ALTER FUNCTION public.get_students_directory_rows() OWNER TO postgres;

REVOKE ALL ON FUNCTION public.get_students_directory_rows()
    FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_students_directory_rows()
    TO authenticated;

COMMENT ON FUNCTION public.get_students_directory_rows() IS
    'Authorized source for the safe student directory. Rejects non-staff callers and forces Department Heads to their assigned department.';

-- ponytail: preserve the existing relation contract; move high-volume callers
-- to scoped RPC pagination only if function-backed filtering becomes measurable.
CREATE OR REPLACE VIEW public.students_directory
WITH (security_invoker = true)
AS
    SELECT *
    FROM public.get_students_directory_rows();

ALTER VIEW public.students_directory OWNER TO postgres;

REVOKE ALL ON public.students_directory FROM PUBLIC, anon, service_role;
GRANT SELECT ON public.students_directory TO authenticated;

COMMENT ON VIEW public.students_directory IS
    'Security-invoker compatibility view over the authenticated, role-scoped student directory function.';

-- Fail installation if the advisor-facing property or privilege boundary is
-- weakened later in this migration.
DO $$
DECLARE
    v_view_options text[];
    v_function_oid oid := to_regprocedure('public.get_students_directory_rows()');
BEGIN
    SELECT c.reloptions
      INTO v_view_options
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname = 'students_directory';

    IF NOT ('security_invoker=true' = ANY(coalesce(v_view_options, ARRAY[]::text[]))) THEN
        RAISE EXCEPTION 'students_directory must be security invoker';
    END IF;

    IF v_function_oid IS NULL
       OR NOT (SELECT p.prosecdef FROM pg_proc AS p WHERE p.oid = v_function_oid)
       OR has_function_privilege('anon', v_function_oid, 'EXECUTE')
       OR NOT has_function_privilege('authenticated', v_function_oid, 'EXECUTE') THEN
        RAISE EXCEPTION 'student directory function privilege contract is not installed';
    END IF;
END;
$$;

-- Emergency rollback consideration: restore the previous view definition and
-- drop get_students_directory_rows(). That reintroduces the advisor finding,
-- so prefer a forward repair instead of rolling back this security boundary.
