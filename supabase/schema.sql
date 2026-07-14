


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."archive_and_reset_expired_course_year"("p_now" timestamp with time zone DEFAULT "now"()) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    affected_count integer := 0;
BEGIN
    WITH targets AS (
        SELECT
            s.id,
            COALESCE(s.course_year_archive, '[]'::jsonb)
                || jsonb_build_array(
                    jsonb_strip_nulls(
                        jsonb_build_object(
                            'school_year', public.compute_school_year_label(s.course_year_window_start, s.course_year_window_end),
                            'window_start', s.course_year_window_start,
                            'window_end', s.course_year_window_end,
                            'course', s.course,
                            'year_level', s.year_level,
                            'confirmed_at', s.course_year_confirmed_at,
                            'archived_at', p_now
                        )
                    )
                ) AS next_archive
        FROM public.students s
        WHERE s.course_year_window_end IS NOT NULL
          AND s.course_year_window_end <= p_now
          AND (
              s.course IS NOT NULL
              OR s.year_level IS NOT NULL
              OR s.course_year_update_required
              OR s.course_year_window_start IS NOT NULL
          )
    )
    UPDATE public.students s
    SET
        course_year_archive = t.next_archive,
        course = NULL,
        year_level = NULL,
        status = 'Inactive',
        course_year_confirmed_at = NULL,
        course_year_update_required = false,
        course_year_window_start = NULL,
        course_year_window_end = NULL,
        course_year_profile_edited = false
    FROM targets t
    WHERE s.id = t.id;

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;


ALTER FUNCTION "public"."archive_and_reset_expired_course_year"("p_now" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."students" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "student_id" "text" NOT NULL,
    "course" "text",
    "year_level" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "department" "text",
    "middle_name" "text",
    "dob" "date",
    "civil_status" "text",
    "nationality" "text",
    "email" "text",
    "mobile" "text",
    "address" "text",
    "emergency_contact" "text",
    "street" "text",
    "city" "text",
    "province" "text",
    "zip_code" "text",
    "suffix" "text",
    "place_of_birth" "text",
    "age" integer,
    "sex" "text",
    "gender_identity" "text",
    "facebook_url" "text",
    "school_last_attended" "text",
    "is_working_student" boolean DEFAULT false,
    "working_student_type" "text",
    "supporter" "text",
    "supporter_contact" "text",
    "is_pwd" boolean DEFAULT false,
    "pwd_type" "text",
    "is_indigenous" boolean DEFAULT false,
    "indigenous_group" "text",
    "witnessed_conflict" boolean DEFAULT false,
    "is_solo_parent" boolean DEFAULT false,
    "is_child_of_solo_parent" boolean DEFAULT false,
    "priority_course" "text",
    "alt_course_1" "text",
    "alt_course_2" "text",
    "section" "text" DEFAULT ''::"text",
    "profile_picture_url" "text",
    "religion" "text",
    "is_safe_in_community" boolean DEFAULT false,
    "mother_name" "text",
    "mother_occupation" "text",
    "mother_contact" "text",
    "father_name" "text",
    "father_occupation" "text",
    "father_contact" "text",
    "parent_address" "text",
    "num_brothers" "text",
    "num_sisters" "text",
    "birth_order" "text",
    "spouse_name" "text",
    "spouse_occupation" "text",
    "num_children" "text",
    "guardian_name" "text",
    "guardian_address" "text",
    "guardian_contact" "text",
    "guardian_relation" "text",
    "emergency_name" "text",
    "emergency_address" "text",
    "emergency_relationship" "text",
    "emergency_number" "text",
    "elem_school" "text",
    "elem_year_graduated" "text",
    "junior_high_school" "text",
    "junior_high_year_graduated" "text",
    "senior_high_school" "text",
    "senior_high_year_graduated" "text",
    "college_school" "text",
    "college_year_graduated" "text",
    "honors_awards" "text",
    "extracurricular_activities" "text",
    "scholarships_availed" "text",
    "profile_completed" boolean DEFAULT false,
    "has_seen_tour" boolean DEFAULT false,
    "course_year_update_required" boolean DEFAULT false NOT NULL,
    "course_year_window_start" timestamp with time zone,
    "course_year_window_end" timestamp with time zone,
    "course_year_confirmed_at" timestamp with time zone,
    "course_year_archive" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "father_last_name" "text",
    "father_given_name" "text",
    "father_middle_name" "text",
    "mother_last_name" "text",
    "mother_given_name" "text",
    "mother_middle_name" "text",
    "auth_user_id" "uuid",
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_reason" "text",
    "archived_by" bigint,
    "archive_note" "text",
    "region" "text",
    "spouse_employer_name" "text",
    "spouse_employer_address" "text",
    "spouse_contact" "text",
    "children_names_birthdates" "text",
    "currently_pregnant" "text",
    "mother_status" "text",
    "mother_address" "text",
    "father_status" "text",
    "father_address" "text",
    "parents_num_children" "text",
    "birth_order_other" "text",
    "employer_name" "text",
    "employer_address" "text",
    "pwd_number" "text",
    "disability_cause" "text",
    "pwd_document_url" "text",
    "ip_document_url" "text",
    "is_four_ps_member" boolean DEFAULT false,
    "four_ps_document_url" "text",
    "is_rebel_returnee" boolean DEFAULT false,
    "solo_parent_document_url" "text",
    "is_orphan" boolean DEFAULT false,
    "orphan_cause" "text",
    "is_homeless_citizen" boolean DEFAULT false,
    "is_senior_citizen" boolean DEFAULT false,
    "senior_citizen_document_url" "text",
    "work_experiences" "text",
    "tesda_nc2_acquired" "text",
    "eligibility_acquired" "text",
    "special_trainings_attended" "text",
    "holds_public_service_position" boolean DEFAULT false,
    "public_service_position" "text",
    "organizations_memberships" "text",
    "sports_skills" "text",
    "other_talents" "text",
    "has_been_criminally_charged" boolean DEFAULT false,
    "has_been_convicted_of_crime" boolean DEFAULT false,
    "region_other" "text",
    "year_level_other" "text",
    "working_student_type_other" "text",
    "indigenous_group_other" "text",
    "orphan_cause_other" "text",
    "criminal_charge_details" "text",
    "crime_conviction_details" "text",
    "pwd_type_other" "text",
    "course_year_profile_edited" boolean DEFAULT false,
    CONSTRAINT "students_course_year_window_chk" CHECK (((NOT "course_year_update_required") OR (("course_year_window_start" IS NOT NULL) AND ("course_year_window_end" IS NOT NULL) AND ("course_year_window_end" > "course_year_window_start"))))
);


ALTER TABLE "public"."students" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text" DEFAULT NULL::"text", "p_note" "text" DEFAULT NULL::"text", "p_archived_by" bigint DEFAULT NULL::bigint) RETURNS "public"."students"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_student public.students%rowtype;
    v_actor_role text := nullif(public.current_staff_role(), '');
    v_actor_department text := nullif(public.current_staff_department(), '');
    v_actor_id bigint := coalesce(p_archived_by, nullif(public.current_staff_account_id(), '')::bigint);
    v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
    v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
    if nullif(btrim(coalesce(p_student_id, '')), '') is null then
        raise exception 'Student ID is required.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated' then
        if v_actor_role is null then
            raise exception 'Only linked staff accounts can archive students.';
        end if;

        if v_actor_role not in ('Admin', 'Care Staff', 'Department Head') then
            raise exception 'Insufficient privileges to archive students.';
        end if;
    end if;

    select *
    into v_student
    from public.students
    where student_id = btrim(p_student_id)
    for update;

    if not found then
        raise exception 'Student not found.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated'
       and v_actor_role = 'Department Head'
       and coalesce(v_student.department, '') <> coalesce(v_actor_department, '') then
        raise exception 'Department Heads can only archive students in their own department.';
    end if;

    if coalesce(v_student.is_archived, false) then
        return v_student;
    end if;

    update public.students
    set is_archived = true,
        archived_at = timezone('utc'::text, now()),
        archived_reason = v_reason,
        archived_by = v_actor_id,
        archive_note = v_note
    where student_id = btrim(p_student_id)
    returning *
    into v_student;

    return v_student;
end;
$$;


ALTER FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) IS 'Archives a student in place by setting archive flags on public.students.';



CREATE OR REPLACE FUNCTION "public"."audit_staff_table_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    actor_role text := public.current_staff_role();
    actor_name text := coalesce(public.current_staff_full_name(), public.current_staff_username(), actor_role);
    actor_id text := public.current_staff_account_id();
    actor_department text := public.current_staff_department();
    record_data jsonb;
    record_id text;
    entity_label text;
    table_label text := replace(tg_table_name, '_', ' ');
    action text;
    summary text;
    previous_status text;
    next_status text;
begin
    if actor_role not in ('Care Staff', 'Department Head') then
        if tg_op = 'DELETE' then
            return old;
        end if;
        return new;
    end if;

    record_data := case
        when tg_op = 'DELETE' then to_jsonb(old)
        else to_jsonb(new)
    end;
    record_id := public.current_staff_audit_record_id(record_data);
    entity_label := public.current_staff_audit_entity_label(record_data);
    previous_status := case
        when tg_op = 'UPDATE' then nullif(to_jsonb(old)->>'status', '')
        else null
    end;
    next_status := nullif(record_data->>'status', '');

    action := case tg_op
        when 'INSERT' then format('Created %s', table_label)
        when 'DELETE' then format('Deleted %s', table_label)
        else format('Updated %s', table_label)
    end;

    if tg_op = 'UPDATE' and previous_status is distinct from next_status and next_status is not null then
        action := format('Updated %s status', table_label);
    end if;

    summary := case
        when tg_op = 'INSERT' then format(
            '%s created %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
        when tg_op = 'DELETE' then format(
            '%s deleted %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
        when previous_status is distinct from next_status and next_status is not null then format(
            '%s changed %s%s to %s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end,
            next_status
        )
        else format(
            '%s updated %s%s.',
            actor_name,
            table_label,
            case when entity_label is not null then format(' for %s', entity_label) else '' end
        )
    end;

    insert into public.audit_logs (
        user_name,
        action,
        details,
        actor_role,
        actor_id,
        actor_department,
        entity_table,
        entity_id
    )
    values (
        actor_name,
        action,
        jsonb_strip_nulls(jsonb_build_object(
            'source', 'db_trigger',
            'operation', tg_op,
            'table', tg_table_name,
            'record_id', record_id,
            'label', entity_label,
            'previous_status', previous_status,
            'status', next_status,
            'summary', summary
        )),
        actor_role,
        actor_id,
        actor_department,
        tg_table_name,
        record_id
    );

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;


ALTER FUNCTION "public"."audit_staff_table_change"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_registrations" (
    "id" bigint NOT NULL,
    "event_id" bigint NOT NULL,
    "student_id" "text" NOT NULL,
    "student_name" "text",
    "email" "text",
    "department" "text",
    "course" "text",
    "year_level" "text",
    "section" "text",
    "status" "text" DEFAULT 'Registered'::"text" NOT NULL,
    "registered_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "cancelled_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "event_registrations_status_chk" CHECK (("status" = ANY (ARRAY['Registered'::"text", 'Cancelled'::"text", 'Attended'::"text", 'Absent'::"text"])))
);


ALTER TABLE "public"."event_registrations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) RETURNS "public"."event_registrations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_student_id text;
    v_registration public.event_registrations%rowtype;
begin
    v_student_id := public.current_student_id();
    if v_student_id is null then
        raise exception 'Student account is not linked to the current session.';
    end if;

    select *
    into v_registration
    from public.event_registrations
    where event_id = p_event_id
      and student_id = v_student_id
    limit 1;

    if not found then
        raise exception 'Registration record was not found.';
    end if;

    if v_registration.status = 'Attended' then
        raise exception 'Registration cannot be cancelled after attendance is recorded.';
    end if;

    update public.event_registrations
    set status = 'Cancelled',
        cancelled_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    where id = v_registration.id
    returning * into v_registration;

    return v_registration;
end;
$$;


ALTER FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_school_year_label"("start_ts" timestamp with time zone, "end_ts" timestamp with time zone) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    SELECT CASE
        WHEN start_ts IS NULL AND end_ts IS NULL THEN 'AY Unknown'
        WHEN start_ts IS NULL THEN
            'AY ' || (EXTRACT(YEAR FROM end_ts)::int - 1)::text || '-' || (EXTRACT(YEAR FROM end_ts)::int)::text
        WHEN end_ts IS NULL THEN
            'AY ' || (EXTRACT(YEAR FROM start_ts)::int)::text || '-' || (EXTRACT(YEAR FROM start_ts)::int + 1)::text
        ELSE
            'AY '
            || LEAST(EXTRACT(YEAR FROM start_ts)::int, EXTRACT(YEAR FROM end_ts)::int)::text
            || '-'
            || GREATEST(EXTRACT(YEAR FROM start_ts)::int, EXTRACT(YEAR FROM end_ts)::int)::text
    END;
$$;


ALTER FUNCTION "public"."compute_school_year_label"("start_ts" timestamp with time zone, "end_ts" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) RETURNS TABLE("allowed" boolean, "request_count" integer, "remaining" integer, "retry_after_seconds" integer, "reset_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
declare
    v_now timestamptz := timezone('utc'::text, now());
    v_scope text := nullif(trim(coalesce(p_scope, '')), '');
    v_identifier text := nullif(trim(coalesce(p_identifier, '')), '');
    v_identifier_hash text;
    v_max_requests integer := greatest(1, coalesce(p_max_requests, 1));
    v_window_seconds integer := greatest(1, coalesce(p_window_seconds, 1));
    v_request_count integer;
    v_reset_at timestamptz;
begin
    if v_scope is null then
        raise exception 'Rate limit scope is required.';
    end if;

    if v_identifier is null then
        raise exception 'Rate limit identifier is required.';
    end if;

    v_identifier_hash := encode(extensions.digest(v_identifier, 'sha256'), 'hex');

    insert into public.edge_rate_limits as limits (
        scope,
        identifier_hash,
        window_starts_at,
        expires_at,
        request_count,
        created_at,
        updated_at
    )
    values (
        v_scope,
        v_identifier_hash,
        v_now,
        v_now + make_interval(secs => v_window_seconds),
        1,
        v_now,
        v_now
    )
    on conflict (scope, identifier_hash) do update
        set request_count = case
                when limits.expires_at <= v_now then 1
                else limits.request_count + 1
            end,
            window_starts_at = case
                when limits.expires_at <= v_now then v_now
                else limits.window_starts_at
            end,
            expires_at = case
                when limits.expires_at <= v_now then v_now + make_interval(secs => v_window_seconds)
                else limits.expires_at
            end,
            updated_at = v_now
    returning limits.request_count, limits.expires_at
    into v_request_count, v_reset_at;

    return query
    select
        v_request_count <= v_max_requests,
        v_request_count,
        greatest(0, v_max_requests - v_request_count),
        case
            when v_request_count <= v_max_requests then 0
            else greatest(1, ceil(extract(epoch from (v_reset_at - v_now)))::integer)
        end,
        v_reset_at;
end;
$$;


ALTER FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_account_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.id
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_account_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_account_id"() IS 'Returns the linked staff_accounts.id for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_staff_audit_entity_label"("row_data" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select coalesce(
        nullif(trim(concat_ws(' ', row_data->>'first_name', row_data->>'last_name')), ''),
        nullif(row_data->>'student_name', ''),
        nullif(row_data->>'title', ''),
        nullif(row_data->>'name', ''),
        nullif(row_data->>'reference_id', ''),
        nullif(row_data->>'student_id', ''),
        nullif(row_data->>'id', '')
    );
$$;


ALTER FUNCTION "public"."current_staff_audit_entity_label"("row_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_audit_record_id"("row_data" "jsonb") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select coalesce(
        nullif(row_data->>'id', ''),
        nullif(row_data->>'student_id', ''),
        nullif(row_data->>'reference_id', ''),
        nullif(row_data->>'name', ''),
        nullif(row_data->>'title', '')
    );
$$;


ALTER FUNCTION "public"."current_staff_audit_record_id"("row_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_staff_department"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.department
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_department"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_department"() IS 'Returns the linked staff_accounts.department for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_staff_email"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.email
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_email"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_email"() IS 'Returns the linked staff_accounts.email for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_staff_full_name"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.full_name
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_full_name"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_full_name"() IS 'Returns the linked staff_accounts.full_name for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_staff_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.role
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_role"() IS 'Returns the linked staff_accounts.role for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_staff_username"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select sa.username
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;


ALTER FUNCTION "public"."current_staff_username"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_staff_username"() IS 'Returns the linked staff_accounts.username for the current auth user.';



CREATE OR REPLACE FUNCTION "public"."current_student_id"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select s.student_id
    from public.students as s
    where s.auth_user_id = auth.uid()
    limit 1;
$$;


ALTER FUNCTION "public"."current_student_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."current_student_id"() IS 'Returns the linked students.student_id for the current auth user.';



CREATE TABLE IF NOT EXISTS "public"."application_archives" (
    "archive_id" bigint NOT NULL,
    "source_application_id" "uuid" NOT NULL,
    "archive_outcome" "text" NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "archived_by" bigint,
    "activated_student_id" "text",
    "activated_course" "text",
    "source_status" "text",
    "reference_id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "middle_name" "text",
    "email" "text" NOT NULL,
    "mobile" "text" NOT NULL,
    "priority_course" "text" NOT NULL,
    "test_date" "date",
    "username" "text",
    "status" "text" NOT NULL,
    "created_at" timestamp with time zone NOT NULL,
    "civil_status" "text",
    "nationality" "text",
    "reason" "text",
    "street" "text",
    "city" "text",
    "province" "text",
    "zip_code" "text",
    "alt_course_1" "text",
    "alt_course_2" "text",
    "suffix" "text",
    "place_of_birth" "text",
    "age" integer,
    "sex" "text",
    "gender_identity" "text",
    "facebook_url" "text",
    "dob" "date",
    "current_choice" integer,
    "interview_date" "text",
    "test_time" "text",
    "time_in" timestamp with time zone,
    "time_out" timestamp with time zone,
    "interview_queue_status" "text",
    "interview_venue" "text",
    "interview_panel" "text",
    "nat_password_hash" "text",
    CONSTRAINT "application_archives_archive_outcome_check" CHECK (("archive_outcome" = ANY (ARRAY['enrolled'::"text", 'failed_nat'::"text", 'application_unsuccessful'::"text"])))
);


ALTER TABLE "public"."application_archives" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint DEFAULT NULL::bigint, "p_activated_student_id" "text" DEFAULT NULL::"text", "p_activated_course" "text" DEFAULT NULL::"text") RETURNS "public"."application_archives"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_existing_archive public.application_archives%rowtype;
    v_application public.applications%rowtype;
    v_normalized_outcome text := lower(btrim(coalesce(p_outcome, '')));
    v_normalized_student_id text := nullif(btrim(coalesce(p_activated_student_id, '')), '');
    v_normalized_course text := nullif(btrim(coalesce(p_activated_course, '')), '');
    v_final_status text;
begin
    if p_application_id is null then
        raise exception 'Application ID is required.';
    end if;

    if v_normalized_outcome not in ('enrolled', 'failed_nat', 'application_unsuccessful') then
        raise exception 'Unsupported application outcome: %.', coalesce(p_outcome, '');
    end if;

    if v_normalized_outcome = 'enrolled' and v_normalized_student_id is null then
        raise exception 'Activated student ID is required when finalizing an enrolled application.';
    end if;

    select *
    into v_existing_archive
    from public.application_archives
    where source_application_id = p_application_id
    limit 1;

    if found then
        if v_existing_archive.archive_outcome <> v_normalized_outcome then
            raise exception 'Application % is already archived with outcome %.',
                p_application_id,
                v_existing_archive.archive_outcome;
        end if;

        delete from public.applications
        where id = p_application_id;

        return v_existing_archive;
    end if;

    select *
    into v_application
    from public.applications
    where id = p_application_id
    for update;

    if not found then
        raise exception 'Application not found or already finalized.';
    end if;

    v_final_status := case v_normalized_outcome
        when 'enrolled' then 'Enrolled'
        when 'failed_nat' then 'Failed'
        when 'application_unsuccessful' then 'Application Unsuccessful'
        else v_application.status
    end;

    insert into public.application_archives (
        source_application_id,
        archive_outcome,
        archived_by,
        activated_student_id,
        activated_course,
        source_status,
        reference_id,
        first_name,
        last_name,
        middle_name,
        email,
        mobile,
        priority_course,
        test_date,
        username,
        status,
        created_at,
        civil_status,
        nationality,
        reason,
        street,
        city,
        province,
        zip_code,
        alt_course_1,
        alt_course_2,
        suffix,
        place_of_birth,
        age,
        sex,
        gender_identity,
        facebook_url,
        dob,
        current_choice,
        interview_date,
        test_time,
        time_in,
        time_out,
        interview_queue_status,
        interview_venue,
        interview_panel,
        nat_password_hash
    )
    values (
        v_application.id,
        v_normalized_outcome,
        p_archived_by,
        case when v_normalized_outcome = 'enrolled' then v_normalized_student_id else null end,
        case when v_normalized_outcome = 'enrolled' then v_normalized_course else null end,
        v_application.status,
        v_application.reference_id,
        v_application.first_name,
        v_application.last_name,
        v_application.middle_name,
        v_application.email,
        v_application.mobile,
        v_application.priority_course,
        v_application.test_date,
        v_application.username,
        v_final_status,
        v_application.created_at,
        v_application.civil_status,
        v_application.nationality,
        v_application.reason,
        v_application.street,
        v_application.city,
        v_application.province,
        v_application.zip_code,
        v_application.alt_course_1,
        v_application.alt_course_2,
        v_application.suffix,
        v_application.place_of_birth,
        v_application.age,
        v_application.sex,
        v_application.gender_identity,
        v_application.facebook_url,
        v_application.dob,
        coalesce(v_application.current_choice, 1),
        v_application.interview_date,
        v_application.test_time,
        v_application.time_in,
        v_application.time_out,
        v_application.interview_queue_status,
        v_application.interview_venue,
        v_application.interview_panel,
        v_application.nat_password_hash
    )
    returning *
    into v_existing_archive;

    delete from public.applications
    where id = v_application.id;

    return v_existing_archive;
end;
$$;


ALTER FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint, "p_activated_student_id" "text", "p_activated_course" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_care_student_course_year_counts"() RETURNS TABLE("course" "text", "year_level" "text", "student_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    select
        coalesce(s.course, '') as course,
        coalesce(s.year_level, '') as year_level,
        count(*) as student_count
    from public.students s
    where s.is_archived = false
      and s.status = 'Active'
    group by coalesce(s.course, ''), coalesce(s.year_level, '')
    order by coalesce(s.course, ''), coalesce(s.year_level, '');
$$;


ALTER FUNCTION "public"."get_care_student_course_year_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_care_student_population_overview"() RETURNS TABLE("total_population" bigint, "active_students" bigint, "archived_students" bigint, "school_years" "text"[])
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    with archive_entries as (
        select
            case
                when nullif(trim(entry.value->>'school_year'), '') is not null then
                    case
                        when left(trim(entry.value->>'school_year'), 2) = 'AY'
                            then 'SY' || substring(trim(entry.value->>'school_year') from 3)
                        else trim(entry.value->>'school_year')
                    end
                when (entry.value->>'window_start') ~ '^\d{4}-\d{2}-\d{2}'
                  and (entry.value->>'window_end') ~ '^\d{4}-\d{2}-\d{2}' then
                    'SY '
                    || least(
                        extract(year from (entry.value->>'window_start')::timestamp)::integer,
                        extract(year from (entry.value->>'window_end')::timestamp)::integer
                    )::text
                    || '-'
                    || greatest(
                        extract(year from (entry.value->>'window_start')::timestamp)::integer,
                        extract(year from (entry.value->>'window_end')::timestamp)::integer
                    )::text
                else ''
            end as school_year
        from public.students s
        cross join lateral jsonb_array_elements(
            case
                when jsonb_typeof(s.course_year_archive) = 'array' then s.course_year_archive
                else '[]'::jsonb
            end
        ) as entry(value)
        where s.is_archived = false
    ),
    school_year_list as (
        select array(
            select distinct school_year
            from archive_entries
            where school_year <> ''
            order by school_year desc
        ) as school_years
    )
    select
        count(*) filter (where s.is_archived = false) as total_population,
        count(*) filter (where s.is_archived = false and s.status = 'Active') as active_students,
        count(*) filter (where s.is_archived = true) as archived_students,
        coalesce(sy.school_years, array[]::text[]) as school_years
    from public.students s
    cross join school_year_list sy
    group by sy.school_years;
$$;


ALTER FUNCTION "public"."get_care_student_population_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_department_admission_candidates"("p_department_name" "text", "p_statuses" "text"[] DEFAULT ARRAY['Qualified for Interview (1st Choice)'::"text", 'Forwarded to 2nd Choice for Interview'::"text", 'Forwarded to 3rd Choice for Interview'::"text", 'Interview Scheduled'::"text"], "p_limit" integer DEFAULT 100, "p_offset" integer DEFAULT 0) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "first_name" "text", "last_name" "text", "reference_id" "text", "email" "text", "mobile" "text", "priority_course" "text", "alt_course_1" "text", "alt_course_2" "text", "current_choice" smallint, "status" "text", "interview_date" "text", "active_course" "text")
    LANGUAGE "sql" STABLE
    AS $$
    with normalized as (
        select
            a.id,
            a.created_at,
            a.first_name,
            a.last_name,
            a.reference_id,
            a.email,
            a.mobile,
            a.priority_course,
            a.alt_course_1,
            a.alt_course_2,
            a.current_choice,
            a.status,
            a.interview_date,
            case coalesce(a.current_choice, 1)
                when 1 then a.priority_course
                when 2 then a.alt_course_1
                when 3 then a.alt_course_2
                else a.priority_course
            end as active_course
        from public.applications a
        where a.status = any (p_statuses)
    )
    select
        n.id,
        n.created_at,
        n.first_name,
        n.last_name,
        n.reference_id,
        n.email,
        n.mobile,
        n.priority_course,
        n.alt_course_1,
        n.alt_course_2,
        n.current_choice,
        n.status,
        n.interview_date,
        n.active_course
    from normalized n
    join public.courses c
      on lower(btrim(c.name)) = lower(btrim(coalesce(n.active_course, '')))
    join public.departments d
      on d.id = c.department_id
    where d.name = p_department_name
    order by n.created_at desc
    limit greatest(p_limit, 0)
    offset greatest(p_offset, 0);
$$;


ALTER FUNCTION "public"."get_department_admission_candidates"("p_department_name" "text", "p_statuses" "text"[], "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_department_applications_page"("p_department_name" "text", "p_statuses" "text"[] DEFAULT NULL::"text"[], "p_search" "text" DEFAULT NULL::"text", "p_course" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 10, "p_offset" integer DEFAULT 0, "p_sort_ascending" boolean DEFAULT false) RETURNS TABLE("id" "text", "created_at" timestamp with time zone, "first_name" "text", "last_name" "text", "reference_id" "text", "email" "text", "mobile" "text", "priority_course" "text", "alt_course_1" "text", "alt_course_2" "text", "current_choice" integer, "status" "text", "interview_date" "text", "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    caller_role text;
    caller_department text;
    effective_department text;
begin
    if auth.uid() is null then
        raise exception 'Authenticated staff session required.';
    end if;

    select sa.role, sa.department
    into caller_role, caller_department
    from public.staff_accounts sa
    where sa.auth_user_id = auth.uid()
    limit 1;

    if caller_role is null then
        raise exception 'Linked staff account not found for current session.';
    end if;

    if caller_role = 'Department Head' then
        effective_department := nullif(btrim(caller_department), '');
    elsif caller_role in ('Admin', 'Care Staff') then
        effective_department := nullif(btrim(p_department_name), '');
    else
        raise exception 'Insufficient privileges to read department applications.';
    end if;

    if effective_department is null then
        raise exception 'Department is required for this request.';
    end if;

    return query
    with requested_statuses as (
        select case
            when coalesce(array_length(p_statuses, 1), 0) > 0 then p_statuses
            else array[
                'Qualified for Interview (1st Choice)',
                'Forwarded to 2nd Choice for Interview',
                'Forwarded to 3rd Choice for Interview',
                'Interview Scheduled'
            ]::text[]
        end as statuses
    ),
    department_courses as (
        select c.name
        from public.departments d
        join public.courses c on c.department_id = d.id
        where d.name = effective_department
          and (
              p_course is null
              or btrim(p_course) = ''
              or c.name = p_course
          )
    ),
    matched_applications as (
        select distinct a.*
        from public.applications a
        join department_courses dc
            on (
                (coalesce(a.current_choice, 1) = 1 and a.priority_course = dc.name)
                or (a.current_choice = 2 and a.alt_course_1 = dc.name)
                or (a.current_choice = 3 and a.alt_course_2 = dc.name)
            )
        cross join requested_statuses rs
        where a.status = any(rs.statuses)
          and (
              coalesce(nullif(btrim(p_search), ''), '') = ''
              or a.first_name ilike '%' || btrim(p_search) || '%'
              or a.last_name ilike '%' || btrim(p_search) || '%'
              or a.reference_id ilike '%' || btrim(p_search) || '%'
          )
    ),
    paged as (
        select
            a.id::text as id,
            a.created_at,
            a.first_name,
            a.last_name,
            a.reference_id,
            a.email,
            a.mobile,
            a.priority_course,
            a.alt_course_1,
            a.alt_course_2,
            a.current_choice,
            a.status,
            a.interview_date::text as interview_date,
            count(*) over() as total_count
        from matched_applications a
        order by
            case when p_sort_ascending then a.created_at end asc,
            case when not p_sort_ascending then a.created_at end desc
        limit greatest(p_limit, 0)
        offset greatest(p_offset, 0)
    )
    select *
    from paged;
end;
$$;


ALTER FUNCTION "public"."get_department_applications_page"("p_department_name" "text", "p_statuses" "text"[], "p_search" "text", "p_course" "text", "p_limit" integer, "p_offset" integer, "p_sort_ascending" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_event_attendees"("e_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.events
  SET attendees = COALESCE(attendees, 0) + 1
  WHERE id = e_id;
END;
$$;


ALTER FUNCTION "public"."increment_event_attendees"("e_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select coalesce(public.current_staff_role() = 'Admin', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_admin"() IS 'Returns true when the current auth user is a linked Admin staff account.';



CREATE OR REPLACE FUNCTION "public"."register_student_for_event"("p_event_id" bigint) RETURNS "public"."event_registrations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_student_id text;
    v_student public.students%rowtype;
    v_event public.events%rowtype;
    v_registration public.event_registrations%rowtype;
    v_active_count integer;
begin
    v_student_id := public.current_student_id();
    if v_student_id is null then
        raise exception 'Student account is not linked to the current session.';
    end if;

    select *
    into v_student
    from public.students
    where student_id = v_student_id
    limit 1;

    if not found then
        raise exception 'Student profile was not found.';
    end if;

    select *
    into v_event
    from public.events
    where id = p_event_id
    limit 1;

    if not found then
        raise exception 'Event was not found.';
    end if;

    if coalesce(v_event.is_archived, false) then
        raise exception 'This event is no longer open for registration.';
    end if;

    if v_event.participation_mode <> 'registration_required' then
        raise exception 'This event does not require registration.';
    end if;

    if v_event.registration_deadline is not null
       and now() > v_event.registration_deadline then
        raise exception 'The registration deadline for this event has passed.';
    end if;

    if v_event.audience_type = 'graduating_students'
       and lower(coalesce(v_student.status, '')) <> 'graduating'
       and lower(coalesce(v_student.year_level, '')) not in ('4th year', '5th year') then
        raise exception 'This event is only open to graduating students.';
    end if;

    if cardinality(coalesce(v_event.audience_departments, '{}'::text[])) > 0
       and not (coalesce(v_student.department, '') = any(v_event.audience_departments)) then
        raise exception 'This event is not open to your department.';
    end if;

    if cardinality(coalesce(v_event.audience_courses, '{}'::text[])) > 0
       and not (coalesce(v_student.course, '') = any(v_event.audience_courses)) then
        raise exception 'This event is not open to your course.';
    end if;

    if cardinality(coalesce(v_event.audience_year_levels, '{}'::text[])) > 0
       and not (coalesce(v_student.year_level, '') = any(v_event.audience_year_levels)) then
        raise exception 'This event is not open to your year level.';
    end if;

    if cardinality(coalesce(v_event.audience_sections, '{}'::text[])) > 0
       and not (coalesce(v_student.section, '') = any(v_event.audience_sections)) then
        raise exception 'This event is not open to your section.';
    end if;

    select *
    into v_registration
    from public.event_registrations
    where event_id = p_event_id
      and student_id = v_student_id
    limit 1;

    if found and v_registration.status in ('Registered', 'Attended', 'Absent') then
        return v_registration;
    end if;

    if v_event.capacity is not null then
        select count(*)::integer
        into v_active_count
        from public.event_registrations
        where event_id = p_event_id
          and status <> 'Cancelled'
          and student_id <> v_student_id;

        if v_active_count >= v_event.capacity then
            raise exception 'This event has reached its registration capacity.';
        end if;
    end if;

    insert into public.event_registrations (
        event_id,
        student_id,
        student_name,
        email,
        department,
        course,
        year_level,
        section,
        status,
        registered_at,
        cancelled_at
    )
    values (
        p_event_id,
        v_student_id,
        trim(concat_ws(' ', v_student.first_name, v_student.middle_name, v_student.last_name, v_student.suffix)),
        v_student.email,
        v_student.department,
        v_student.course,
        v_student.year_level,
        v_student.section,
        'Registered',
        timezone('utc'::text, now()),
        null
    )
    on conflict (event_id, student_id)
    do update set
        student_name = excluded.student_name,
        email = excluded.email,
        department = excluded.department,
        course = excluded.course,
        year_level = excluded.year_level,
        section = excluded.section,
        status = 'Registered',
        registered_at = timezone('utc'::text, now()),
        cancelled_at = null,
        updated_at = timezone('utc'::text, now())
    returning * into v_registration;

    return v_registration;
end;
$$;


ALTER FUNCTION "public"."register_student_for_event"("p_event_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
declare
    seeded_count integer := 0;
    archive_seeded_count integer := 0;
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

    archive_seeded_count := public.seed_archive_action_permission_defaults(target_role);

    return seeded_count + archive_seeded_count;
end;
$$;


ALTER FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_student"("p_student_id" "text") RETURNS "public"."students"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_student public.students%rowtype;
    v_actor_role text := nullif(public.current_staff_role(), '');
    v_actor_department text := nullif(public.current_staff_department(), '');
begin
    if nullif(btrim(coalesce(p_student_id, '')), '') is null then
        raise exception 'Student ID is required.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated' then
        if v_actor_role is null then
            raise exception 'Only linked staff accounts can restore students.';
        end if;

        if v_actor_role not in ('Admin', 'Care Staff', 'Department Head') then
            raise exception 'Insufficient privileges to restore students.';
        end if;
    end if;

    select *
    into v_student
    from public.students
    where student_id = btrim(p_student_id)
    for update;

    if not found then
        raise exception 'Student not found.';
    end if;

    if coalesce(auth.role(), '') = 'authenticated'
       and v_actor_role = 'Department Head'
       and coalesce(v_student.department, '') <> coalesce(v_actor_department, '') then
        raise exception 'Department Heads can only restore students in their own department.';
    end if;

    if not coalesce(v_student.is_archived, false) then
        return v_student;
    end if;

    update public.students
    set is_archived = false,
        archived_at = null,
        archived_reason = null,
        archived_by = null,
        archive_note = null
    where student_id = btrim(p_student_id)
    returning *
    into v_student;

    return v_student;
end;
$$;


ALTER FUNCTION "public"."restore_student"("p_student_id" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_student"("p_student_id" "text") IS 'Restores an archived student by clearing archive flags on public.students.';



CREATE OR REPLACE FUNCTION "public"."search_care_students"("p_search" "text" DEFAULT ''::"text", "p_department" "text" DEFAULT NULL::"text", "p_course" "text" DEFAULT NULL::"text", "p_year_level" "text" DEFAULT NULL::"text", "p_section" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text", "p_page" integer DEFAULT 1, "p_page_size" integer DEFAULT 5, "p_sort_column" "text" DEFAULT 'created_at'::"text", "p_sort_ascending" boolean DEFAULT false) RETURNS TABLE("id" bigint, "created_at" timestamp with time zone, "student_id" "text", "first_name" "text", "last_name" "text", "course" "text", "year_level" "text", "section" "text", "department" "text", "status" "text", "profile_completed" boolean, "course_year_update_required" boolean, "course_year_window_start" timestamp with time zone, "course_year_window_end" timestamp with time zone, "course_year_confirmed_at" timestamp with time zone, "course_year_archive" "jsonb", "is_archived" boolean, "archived_at" timestamp with time zone, "archived_reason" "text", "archived_by" "text", "archive_note" "text", "total_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'extensions'
    AS $$
    with params as (
        select
            regexp_split_to_array(lower(trim(coalesce(p_search, ''))), '\s+') as tokens,
            lower(trim(regexp_replace(coalesce(p_search, ''), '\s+', ' ', 'g'))) as phrase,
            greatest(1, least(coalesce(p_page_size, 5), 100)) as safe_page_size,
            greatest(0, (greatest(1, coalesce(p_page, 1)) - 1) * greatest(1, least(coalesce(p_page_size, 5), 100))) as safe_offset,
            nullif(p_department, 'All') as department_filter,
            nullif(p_course, 'All') as course_filter,
            nullif(p_year_level, 'All') as year_level_filter,
            nullif(p_section, 'All') as section_filter,
            nullif(p_status, 'All') as status_filter
    ),
    matched as (
        select
            s.id,
            s.created_at,
            s.student_id,
            s.first_name,
            s.last_name,
            s.course,
            s.year_level,
            s.section,
            s.department,
            s.status,
            s.profile_completed,
            s.course_year_update_required,
            s.course_year_window_start,
            s.course_year_window_end,
            s.course_year_confirmed_at,
            s.course_year_archive,
            s.is_archived,
            s.archived_at,
            s.archived_reason,
            s.archived_by,
            s.archive_note,
            (
                case
                    when p.phrase = '' then 0
                    when lower(trim(concat_ws(' ', s.first_name, s.last_name))) = p.phrase
                      or lower(trim(concat_ws(' ', s.last_name, s.first_name))) = p.phrase then -20
                    when lower(trim(concat_ws(' ', s.first_name, s.last_name))) like p.phrase || '%'
                      or lower(trim(concat_ws(' ', s.last_name, s.first_name))) like p.phrase || '%' then -15
                    when lower(trim(concat_ws(' ', s.first_name, s.last_name))) like '%' || p.phrase || '%'
                      or lower(trim(concat_ws(' ', s.last_name, s.first_name))) like '%' || p.phrase || '%' then -6
                    else 0
                end
                +
                coalesce((
                    select sum(
                        case
                            when lower(coalesce(s.first_name, '')) = token.value
                              or lower(coalesce(s.last_name, '')) = token.value then 0
                            when lower(coalesce(s.first_name, '')) like token.value || '%'
                              or lower(coalesce(s.last_name, '')) like token.value || '%' then 1
                            when lower(coalesce(s.first_name, '')) like '%' || token.value || '%'
                              or lower(coalesce(s.last_name, '')) like '%' || token.value || '%' then 4
                            when lower(coalesce(s.student_id, '')) like '%' || token.value || '%' then 8
                            else 30
                        end
                    )
                    from unnest(p.tokens) as token(value)
                    where token.value <> ''
                ), 0)
            )::integer as search_rank
        from public.students s
        cross join params p
        where s.is_archived = false
          and (p.department_filter is null or s.department = p.department_filter)
          and (p.course_filter is null or s.course = p.course_filter)
          and (p.year_level_filter is null or s.year_level = p.year_level_filter)
          and (p.section_filter is null or s.section = p.section_filter)
          and (
              p.status_filter is null
              or (p.status_filter = 'Incomplete' and coalesce(s.profile_completed, false) = false)
              or (p.status_filter <> 'Incomplete' and s.status = p.status_filter)
          )
          and (
              p.phrase = ''
              or not exists (
                  select 1
                  from unnest(p.tokens) as token(value)
                  where token.value <> ''
                    and not (
                        lower(coalesce(s.first_name, '')) like '%' || token.value || '%'
                        or lower(coalesce(s.last_name, '')) like '%' || token.value || '%'
                        or lower(coalesce(s.student_id, '')) like '%' || token.value || '%'
                    )
              )
          )
    ),
    counted as (
        select matched.*, count(*) over() as total_count
        from matched
    )
    select
        counted.id,
        counted.created_at,
        counted.student_id,
        counted.first_name,
        counted.last_name,
        counted.course,
        counted.year_level,
        counted.section,
        counted.department,
        counted.status,
        counted.profile_completed,
        counted.course_year_update_required,
        counted.course_year_window_start,
        counted.course_year_window_end,
        counted.course_year_confirmed_at,
        counted.course_year_archive,
        counted.is_archived,
        counted.archived_at,
        counted.archived_reason,
        counted.archived_by,
        counted.archive_note,
        counted.total_count
    from counted
    order by
        counted.search_rank asc,
        case when p_sort_column = 'last_name' and coalesce(p_sort_ascending, true) then lower(counted.last_name) end asc nulls last,
        case when p_sort_column = 'last_name' and not coalesce(p_sort_ascending, true) then lower(counted.last_name) end desc nulls last,
        case when p_sort_column = 'student_id' and coalesce(p_sort_ascending, true) then counted.student_id end asc nulls last,
        case when p_sort_column = 'student_id' and not coalesce(p_sort_ascending, true) then counted.student_id end desc nulls last,
        case when p_sort_column = 'course' and coalesce(p_sort_ascending, true) then lower(counted.course) end asc nulls last,
        case when p_sort_column = 'course' and not coalesce(p_sort_ascending, true) then lower(counted.course) end desc nulls last,
        case when p_sort_column = 'status' and coalesce(p_sort_ascending, true) then lower(counted.status) end asc nulls last,
        case when p_sort_column = 'status' and not coalesce(p_sort_ascending, true) then lower(counted.status) end desc nulls last,
        case when p_sort_column = 'created_at' and coalesce(p_sort_ascending, false) then counted.created_at end asc nulls last,
        case when p_sort_column = 'created_at' and not coalesce(p_sort_ascending, false) then counted.created_at end desc nulls last,
        lower(counted.first_name) asc nulls last,
        lower(counted.last_name) asc nulls last,
        counted.student_id asc nulls last
    limit (select safe_page_size from params)
    offset (select safe_offset from params);
$$;


ALTER FUNCTION "public"."search_care_students"("p_search" "text", "p_department" "text", "p_course" "text", "p_year_level" "text", "p_section" "text", "p_status" "text", "p_page" integer, "p_page_size" integer, "p_sort_column" "text", "p_sort_ascending" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql"
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
            ('Care Staff', 'action', 'archive_records', true, 'enabled', null, 'Archive, close, deactivate, or retire records without hard deletion.'),
            ('Care Staff', 'action', 'restore_records', true, 'enabled', null, 'Restore previously archived records back into active use.'),
            ('Department Head', 'action', 'archive_records', true, 'enabled', null, 'Archive, close, deactivate, or retire records without hard deletion.'),
            ('Department Head', 'action', 'restore_records', true, 'enabled', null, 'Restore previously archived records back into active use.')
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


ALTER FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_default_role_permissions"("target_role" "text" DEFAULT NULL::"text") RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."seed_default_role_permissions"("target_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_student_role_permissions"() RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."seed_student_role_permissions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_event_registrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$;


ALTER FUNCTION "public"."set_event_registrations_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_role_permissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$;


ALTER FUNCTION "public"."set_role_permissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_student_activation_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$;


ALTER FUNCTION "public"."set_student_activation_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."swap_or_rename_student_ids"("p_source_id" "text", "p_target_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_source_exists boolean;
    v_target_exists boolean;
    v_source_auth_id uuid;
    v_target_auth_id uuid;
    v_temp_id text;
BEGIN
    -- Trim inputs
    p_source_id := trim(p_source_id);
    p_target_id := trim(p_target_id);

    IF p_source_id = '' OR p_target_id = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source and target Student IDs cannot be empty.');
    END IF;

    IF p_source_id = p_target_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source and target Student IDs must be different.');
    END IF;

    -- Check source student
    SELECT EXISTS(SELECT 1 FROM public.students WHERE student_id = p_source_id) INTO v_source_exists;
    IF NOT v_source_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Source student ID ' || p_source_id || ' does not exist.');
    END IF;

    -- Get source details
    SELECT auth_user_id FROM public.students WHERE student_id = p_source_id INTO v_source_auth_id;

    -- Check target student
    SELECT EXISTS(SELECT 1 FROM public.students WHERE student_id = p_target_id) INTO v_target_exists;

    IF NOT v_target_exists THEN
        -- Case A: Target is vacant (Simple Rename)
        -- Update enrolled_students (Cascades to students(student_id) and then to all referencing child tables)
        UPDATE public.enrolled_students
        SET student_id = p_target_id
        WHERE student_id = p_source_id;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'rename',
            'source_auth_id', v_source_auth_id,
            'target_auth_id', NULL
        );
    ELSE
        -- Case B: Target is occupied (ID Swap)
        -- Get target details
        SELECT auth_user_id FROM public.students WHERE student_id = p_target_id INTO v_target_auth_id;

        -- Create a unique temporary ID
        v_temp_id := p_source_id || '_temp_' || extract(epoch from now())::text;

        -- Step B.1: Move source to temp
        UPDATE public.enrolled_students SET student_id = v_temp_id WHERE student_id = p_source_id;

        -- Step B.2: Move target to source
        UPDATE public.enrolled_students SET student_id = p_source_id WHERE student_id = p_target_id;

        -- Step B.3: Move temp to target
        UPDATE public.enrolled_students SET student_id = p_target_id WHERE student_id = v_temp_id;

        RETURN jsonb_build_object(
            'success', true,
            'mode', 'swap',
            'source_auth_id', v_source_auth_id,
            'target_auth_id', v_target_auth_id
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."swap_or_rename_student_ids"("p_source_id" "text", "p_target_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_event_registration_attendance_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    update public.event_registrations
    set status = 'Attended',
        updated_at = timezone('utc'::text, now())
    where event_id = new.event_id
      and student_id = new.student_id
      and status <> 'Cancelled';

    return new;
end;
$$;


ALTER FUNCTION "public"."sync_event_registration_attendance_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_student_course_year_to_enrollment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE public.enrolled_students
    SET course = NEW.course,
        year_level = NEW.year_level
    WHERE student_id = NEW.student_id;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_student_course_year_to_enrollment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_students_course_year"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    allowed_years text[] := ARRAY['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
BEGIN
    IF NEW.year_level IS NOT NULL
        AND btrim(NEW.year_level) <> ''
        AND NOT (NEW.year_level = ANY (allowed_years)) THEN
        RAISE EXCEPTION 'Invalid year level: %', NEW.year_level
            USING ERRCODE = '22023';
    END IF;

    -- Removed enrolled_students checks to allow students to freely update course and year.
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_students_course_year"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admission_schedules" (
    "id" bigint NOT NULL,
    "date" "date" NOT NULL,
    "venue" "text",
    "slots" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "time_windows" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."admission_schedules" OWNER TO "postgres";


ALTER TABLE "public"."admission_schedules" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."admission_schedules_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" bigint NOT NULL,
    "submission_id" bigint,
    "question_id" bigint,
    "answer_value" integer,
    "answer_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."answers" OWNER TO "postgres";


ALTER TABLE "public"."answers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."answers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."application_archives" ALTER COLUMN "archive_id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."application_archives_archive_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reference_id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "middle_name" "text",
    "email" "text" NOT NULL,
    "mobile" "text" NOT NULL,
    "priority_course" "text" NOT NULL,
    "test_date" "date" NOT NULL,
    "username" "text" NOT NULL,
    "status" "text" DEFAULT 'Submitted'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "civil_status" "text",
    "nationality" "text",
    "reason" "text",
    "street" "text",
    "city" "text",
    "province" "text",
    "zip_code" "text",
    "alt_course_1" "text",
    "alt_course_2" "text",
    "suffix" "text",
    "place_of_birth" "text",
    "age" integer,
    "sex" "text",
    "gender_identity" "text",
    "facebook_url" "text",
    "dob" "date",
    "current_choice" integer DEFAULT 1,
    "interview_date" "text",
    "test_time" "text",
    "time_in" timestamp with time zone,
    "time_out" timestamp with time zone,
    "interview_queue_status" "text",
    "interview_venue" "text",
    "interview_panel" "text",
    "nat_password_hash" "text",
    CONSTRAINT "applications_interview_queue_status_chk" CHECK ((("interview_queue_status" IS NULL) OR ("interview_queue_status" = 'Absent'::"text")))
);


ALTER TABLE "public"."applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" bigint NOT NULL,
    "user_name" "text",
    "action" "text",
    "details" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "actor_role" "text",
    "actor_id" "text",
    "actor_department" "text",
    "entity_table" "text",
    "entity_id" "text"
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


ALTER TABLE "public"."audit_logs" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."audit_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."counseling_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "student_id" "text",
    "student_name" "text",
    "request_type" "text",
    "description" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "scheduled_date" timestamp with time zone,
    "department" "text",
    "resolution_notes" "text",
    "confidential_notes" "text",
    "feedback" "text",
    "rating" integer,
    "course_year" "text",
    "contact_number" "text",
    "reason_for_referral" "text",
    "personal_actions_taken" "text",
    "date_duration_of_concern" "text",
    "referred_by" "text",
    "referrer_contact_number" "text",
    "relationship_with_student" "text",
    "actions_made" "text",
    "date_duration_of_observations" "text",
    "referrer_signature" "text"
);


ALTER TABLE "public"."counseling_requests" OWNER TO "postgres";


ALTER TABLE "public"."counseling_requests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."counseling_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "department_id" bigint,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "capacity" integer DEFAULT 500,
    "application_limit" integer DEFAULT 200,
    "status" "text" DEFAULT 'Open'::"text"
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


ALTER TABLE "public"."courses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."courses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archive_note" "text"
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


ALTER TABLE "public"."departments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."departments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."edge_rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "scope" "text" NOT NULL,
    "identifier_hash" "text" NOT NULL,
    "window_starts_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "edge_rate_limits_request_count_check" CHECK (("request_count" >= 0))
);


ALTER TABLE "public"."edge_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."enrolled_students" (
    "student_id" "text" NOT NULL,
    "is_used" boolean DEFAULT false,
    "assigned_to_email" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "course" "text",
    "status" "text" DEFAULT 'Pending'::"text",
    "year_level" "text"
);


ALTER TABLE "public"."enrolled_students" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."event_attendance" (
    "id" bigint NOT NULL,
    "event_id" bigint,
    "student_id" "text" NOT NULL,
    "student_name" "text",
    "checked_in_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "time_in" timestamp with time zone,
    "time_out" timestamp with time zone,
    "proof_url" "text",
    "latitude" double precision,
    "longitude" double precision,
    "department" "text"
);


ALTER TABLE "public"."event_attendance" OWNER TO "postgres";


ALTER TABLE "public"."event_attendance" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_attendance_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."event_feedback" (
    "id" bigint NOT NULL,
    "event_id" bigint,
    "student_id" "text" NOT NULL,
    "student_name" "text",
    "rating" integer,
    "feedback" "text",
    "submitted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "sex" "text",
    "college" "text",
    "date_of_activity" "date",
    "q1_score" integer,
    "q2_score" integer,
    "q3_score" integer,
    "q4_score" integer,
    "q5_score" integer,
    "q6_score" integer,
    "q7_score" integer,
    "open_best" "text",
    "open_suggestions" "text",
    "open_comments" "text",
    CONSTRAINT "event_feedback_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."event_feedback" OWNER TO "postgres";


ALTER TABLE "public"."event_feedback" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."event_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."event_registrations" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."event_registrations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "type" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "event_date" "date",
    "event_time" "text",
    "attendees" bigint DEFAULT 0,
    "end_time" time without time zone,
    "latitude" double precision,
    "longitude" double precision,
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archived_by" bigint,
    "participation_mode" "text" DEFAULT 'general_attendance'::"text" NOT NULL,
    "audience_type" "text" DEFAULT 'all_students'::"text" NOT NULL,
    "audience_departments" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "audience_courses" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "audience_year_levels" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "audience_sections" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "attendance_required" boolean DEFAULT false NOT NULL,
    "allow_walk_ins" boolean DEFAULT true NOT NULL,
    "capacity" integer,
    "registration_deadline" timestamp with time zone,
    CONSTRAINT "events_audience_type_chk" CHECK (("audience_type" = ANY (ARRAY['all_students'::"text", 'filtered_students'::"text", 'graduating_students'::"text"]))),
    CONSTRAINT "events_capacity_positive_chk" CHECK ((("capacity" IS NULL) OR ("capacity" > 0))),
    CONSTRAINT "events_participation_mode_chk" CHECK (("participation_mode" = ANY (ARRAY['general_attendance'::"text", 'registration_required'::"text"])))
);


ALTER TABLE "public"."events" OWNER TO "postgres";


ALTER TABLE "public"."events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" bigint NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


ALTER TABLE "public"."forms" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."forms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."general_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "text" NOT NULL,
    "student_name" "text" NOT NULL,
    "client_type" "text",
    "sex" "text",
    "age" integer,
    "region" "text",
    "service_availed" "text",
    "cc1" integer,
    "cc2" integer,
    "cc3" integer,
    "sqd0" integer,
    "sqd1" integer,
    "sqd2" integer,
    "sqd3" integer,
    "sqd4" integer,
    "sqd5" integer,
    "sqd6" integer,
    "sqd7" integer,
    "sqd8" integer,
    "suggestions" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."general_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."nat_requirements" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."nat_requirements" OWNER TO "postgres";


ALTER TABLE "public"."nat_requirements" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."nat_requirements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "student_id" "text" NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."office_visit_reasons" (
    "id" bigint NOT NULL,
    "reason" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."office_visit_reasons" OWNER TO "postgres";


ALTER TABLE "public"."office_visit_reasons" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."office_visit_reasons_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."office_visits" (
    "id" bigint NOT NULL,
    "student_id" "text",
    "student_name" "text",
    "reason" "text",
    "time_in" timestamp with time zone DEFAULT "now"(),
    "time_out" timestamp with time zone,
    "status" "text" DEFAULT 'Ongoing'::"text"
);


ALTER TABLE "public"."office_visits" OWNER TO "postgres";


ALTER TABLE "public"."office_visits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."office_visits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" bigint NOT NULL,
    "form_id" bigint,
    "question_text" "text" NOT NULL,
    "question_type" "text" DEFAULT 'scale'::"text",
    "scale_min" integer DEFAULT 1,
    "scale_max" integer DEFAULT 5,
    "order_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


ALTER TABLE "public"."questions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."questions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" character varying(50) NOT NULL,
    "permission_type" character varying(50) NOT NULL,
    "permission_key" character varying(255) NOT NULL,
    "is_allowed" boolean DEFAULT true NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "created_by" bigint DEFAULT (NULLIF("public"."current_staff_account_id"(), ''::"text"))::bigint,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "status" character varying(32) DEFAULT 'enabled'::character varying NOT NULL,
    "notice_text" "text",
    CONSTRAINT "role_permissions_permission_key_check" CHECK (("length"("btrim"(("permission_key")::"text")) > 0)),
    CONSTRAINT "role_permissions_permission_type_check" CHECK ((("permission_type")::"text" = ANY ((ARRAY['table'::character varying, 'function'::character varying, 'feature'::character varying, 'action'::character varying])::"text"[]))),
    CONSTRAINT "role_permissions_role_check" CHECK ((("role")::"text" = ANY (ARRAY['Admin'::"text", 'Care Staff'::"text", 'Department Head'::"text", 'Student'::"text", 'Public'::"text", 'Registrar'::"text"]))),
    CONSTRAINT "role_permissions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['enabled'::character varying, 'hidden'::character varying, 'maintenance'::character varying, 'coming_soon'::character varying])::"text"[])))
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."role_permissions" IS 'Defines table, function, feature, and action permissions for staff portal roles.';



CREATE TABLE IF NOT EXISTS "public"."scholarship_applications" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "scholarship_id" bigint NOT NULL,
    "student_id" "text" NOT NULL,
    "status" "text" DEFAULT 'Applied'::"text"
);


ALTER TABLE "public"."scholarship_applications" OWNER TO "postgres";


ALTER TABLE "public"."scholarship_applications" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."scholarship_applications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."scholarships" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text" NOT NULL,
    "deadline" "date",
    "description" "text",
    "requirements" "text",
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."scholarships" OWNER TO "postgres";


ALTER TABLE "public"."scholarships" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."scholarships_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."security_change_otps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "auth_user_id" "uuid" NOT NULL,
    "account_type" "text" NOT NULL,
    "purpose" "text" NOT NULL,
    "target_email" "text" NOT NULL,
    "otp_hash" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "consumed_at" timestamp with time zone,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "last_attempt_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "security_change_otps_account_type_check" CHECK (("account_type" = ANY (ARRAY['student'::"text", 'staff'::"text"]))),
    CONSTRAINT "security_change_otps_purpose_check" CHECK (("purpose" = ANY (ARRAY['password_change'::"text", 'email_change'::"text", 'destructive_reset'::"text", 'forgot_password'::"text"])))
);


ALTER TABLE "public"."security_change_otps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_accounts" (
    "id" bigint NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text",
    "role" "text" NOT NULL,
    "department" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "auth_user_id" "uuid",
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "archive_note" "text"
);


ALTER TABLE "public"."staff_accounts" OWNER TO "postgres";


ALTER TABLE "public"."staff_accounts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."staff_accounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."student_activation_settings" (
    "id" integer DEFAULT 1 NOT NULL,
    "require_enrollment_key" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "student_activation_settings_id_check" CHECK (("id" = 1))
);


ALTER TABLE "public"."student_activation_settings" OWNER TO "postgres";


ALTER TABLE "public"."students" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."students_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" bigint NOT NULL,
    "form_id" bigint,
    "student_id" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


ALTER TABLE "public"."submissions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."submissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."support_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "student_id" "text" NOT NULL,
    "student_name" "text",
    "department" "text",
    "support_type" "text",
    "description" "text",
    "documents_url" "text",
    "status" "text" DEFAULT 'Submitted'::"text",
    "care_notes" "text",
    "care_documents_url" "text",
    "dept_notes" "text",
    "resolution_notes" "text"
);


ALTER TABLE "public"."support_requests" OWNER TO "postgres";


ALTER TABLE "public"."support_requests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."support_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."admission_schedules"
    ADD CONSTRAINT "admission_schedules_date_key" UNIQUE ("date");



ALTER TABLE ONLY "public"."admission_schedules"
    ADD CONSTRAINT "admission_schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."application_archives"
    ADD CONSTRAINT "application_archives_pkey" PRIMARY KEY ("archive_id");



ALTER TABLE ONLY "public"."application_archives"
    ADD CONSTRAINT "application_archives_source_application_id_key" UNIQUE ("source_application_id");



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_alt_course_1_len" CHECK ((("alt_course_1" IS NULL) OR ("char_length"("alt_course_1") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_alt_course_2_len" CHECK ((("alt_course_2" IS NULL) OR ("char_length"("alt_course_2") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_city_len" CHECK ((("city" IS NULL) OR ("char_length"("city") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_civil_status_len" CHECK ((("civil_status" IS NULL) OR ("char_length"("civil_status") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_email_key" UNIQUE ("email");



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_email_len" CHECK ((("email" IS NULL) OR ("char_length"("email") <= 254))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_facebook_url_len" CHECK ((("facebook_url" IS NULL) OR ("char_length"("facebook_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_first_name_len" CHECK ((("first_name" IS NULL) OR ("char_length"("first_name") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_gender_identity_len" CHECK ((("gender_identity" IS NULL) OR ("char_length"("gender_identity") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_interview_date_len" CHECK ((("interview_date" IS NULL) OR ("char_length"("interview_date") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_interview_panel_len" CHECK ((("interview_panel" IS NULL) OR ("char_length"("interview_panel") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_interview_queue_status_len" CHECK ((("interview_queue_status" IS NULL) OR ("char_length"("interview_queue_status") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_interview_venue_len" CHECK ((("interview_venue" IS NULL) OR ("char_length"("interview_venue") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_last_name_len" CHECK ((("last_name" IS NULL) OR ("char_length"("last_name") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_middle_name_len" CHECK ((("middle_name" IS NULL) OR ("char_length"("middle_name") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_mobile_len" CHECK ((("mobile" IS NULL) OR ("char_length"("mobile") <= 24))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_nationality_len" CHECK ((("nationality" IS NULL) OR ("char_length"("nationality") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_place_of_birth_len" CHECK ((("place_of_birth" IS NULL) OR ("char_length"("place_of_birth") <= 120))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_priority_course_len" CHECK ((("priority_course" IS NULL) OR ("char_length"("priority_course") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_province_len" CHECK ((("province" IS NULL) OR ("char_length"("province") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_reason_len" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 1000))) NOT VALID;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_reference_id_key" UNIQUE ("reference_id");



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_reference_id_len" CHECK ((("reference_id" IS NULL) OR ("char_length"("reference_id") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_sex_len" CHECK ((("sex" IS NULL) OR ("char_length"("sex") <= 20))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_street_len" CHECK ((("street" IS NULL) OR ("char_length"("street") <= 160))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_suffix_len" CHECK ((("suffix" IS NULL) OR ("char_length"("suffix") <= 20))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_test_time_len" CHECK ((("test_time" IS NULL) OR ("char_length"("test_time") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_username_key" UNIQUE ("username");



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_username_len" CHECK ((("username" IS NULL) OR ("char_length"("username") <= 80))) NOT VALID;



ALTER TABLE "public"."applications"
    ADD CONSTRAINT "applications_zip_code_len" CHECK ((("zip_code" IS NULL) OR ("char_length"("zip_code") <= 20))) NOT VALID;



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_actions_made_len" CHECK ((("actions_made" IS NULL) OR ("char_length"("actions_made") <= 4000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_confidential_notes_len" CHECK ((("confidential_notes" IS NULL) OR ("char_length"("confidential_notes") <= 4000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_contact_number_len" CHECK ((("contact_number" IS NULL) OR ("char_length"("contact_number") <= 40))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_course_year_len" CHECK ((("course_year" IS NULL) OR ("char_length"("course_year") <= 255))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_date_duration_len" CHECK ((("date_duration_of_concern" IS NULL) OR ("char_length"("date_duration_of_concern") <= 255))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_department_len" CHECK ((("department" IS NULL) OR ("char_length"("department") <= 120))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_description_len" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 4000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_feedback_len" CHECK ((("feedback" IS NULL) OR ("char_length"("feedback") <= 1500))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_observations_len" CHECK ((("date_duration_of_observations" IS NULL) OR ("char_length"("date_duration_of_observations") <= 255))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_personal_actions_taken_len" CHECK ((("personal_actions_taken" IS NULL) OR ("char_length"("personal_actions_taken") <= 4000))) NOT VALID;



ALTER TABLE ONLY "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_reason_for_referral_len" CHECK ((("reason_for_referral" IS NULL) OR ("char_length"("reason_for_referral") <= 4000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_referred_by_len" CHECK ((("referred_by" IS NULL) OR ("char_length"("referred_by") <= 160))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_referrer_contact_len" CHECK ((("referrer_contact_number" IS NULL) OR ("char_length"("referrer_contact_number") <= 40))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_referrer_signature_len" CHECK ((("referrer_signature" IS NULL) OR ("char_length"("referrer_signature") <= 500000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_relationship_len" CHECK ((("relationship_with_student" IS NULL) OR ("char_length"("relationship_with_student") <= 120))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_request_type_len" CHECK ((("request_type" IS NULL) OR ("char_length"("request_type") <= 80))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_resolution_notes_len" CHECK ((("resolution_notes" IS NULL) OR ("char_length"("resolution_notes") <= 4000))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_student_name_len" CHECK ((("student_name" IS NULL) OR ("char_length"("student_name") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_name_key" UNIQUE ("name");



ALTER TABLE "public"."courses"
    ADD CONSTRAINT "courses_name_len" CHECK ((("name" IS NULL) OR ("char_length"("name") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."courses"
    ADD CONSTRAINT "courses_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE "public"."departments"
    ADD CONSTRAINT "departments_name_len" CHECK ((("name" IS NULL) OR ("char_length"("name") <= 120))) NOT VALID;



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edge_rate_limits"
    ADD CONSTRAINT "edge_rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."edge_rate_limits"
    ADD CONSTRAINT "edge_rate_limits_scope_identifier_key" UNIQUE ("scope", "identifier_hash");



ALTER TABLE "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_assigned_to_email_len" CHECK ((("assigned_to_email" IS NULL) OR ("char_length"("assigned_to_email") <= 254))) NOT VALID;



ALTER TABLE "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_course_len" CHECK ((("course" IS NULL) OR ("char_length"("course") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_pkey" PRIMARY KEY ("student_id");



ALTER TABLE "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_student_id_key" UNIQUE ("student_id");



ALTER TABLE "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_year_level_len" CHECK ((("year_level" IS NULL) OR ("char_length"("year_level") <= 32))) NOT VALID;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_student_id_key" UNIQUE ("event_id", "student_id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_unique" UNIQUE ("event_id", "student_id");



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_college_len" CHECK ((("college" IS NULL) OR ("char_length"("college") <= 255))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_feedback_len" CHECK ((("feedback" IS NULL) OR ("char_length"("feedback") <= 1500))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_open_best_len" CHECK ((("open_best" IS NULL) OR ("char_length"("open_best") <= 1500))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_open_comments_len" CHECK ((("open_comments" IS NULL) OR ("char_length"("open_comments") <= 1500))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_open_suggestions_len" CHECK ((("open_suggestions" IS NULL) OR ("char_length"("open_suggestions") <= 1500))) NOT VALID;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_sex_len" CHECK ((("sex" IS NULL) OR ("char_length"("sex") <= 20))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_student_name_len" CHECK ((("student_name" IS NULL) OR ("char_length"("student_name") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_unique" UNIQUE ("event_id", "student_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_student_uniq" UNIQUE ("event_id", "student_id");



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_description_len" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 4000))) NOT VALID;



ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_event_time_len" CHECK ((("event_time" IS NULL) OR ("char_length"("event_time") <= 80))) NOT VALID;



ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_location_len" CHECK ((("location" IS NULL) OR ("char_length"("location") <= 200))) NOT VALID;



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_title_len" CHECK ((("title" IS NULL) OR ("char_length"("title") <= 160))) NOT VALID;



ALTER TABLE "public"."events"
    ADD CONSTRAINT "events_type_len" CHECK ((("type" IS NULL) OR ("char_length"("type") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_client_type_len" CHECK ((("client_type" IS NULL) OR ("char_length"("client_type") <= 80))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_email_len" CHECK ((("email" IS NULL) OR ("char_length"("email") <= 254))) NOT VALID;



ALTER TABLE ONLY "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_region_len" CHECK ((("region" IS NULL) OR ("char_length"("region") <= 80))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_service_availed_len" CHECK ((("service_availed" IS NULL) OR ("char_length"("service_availed") <= 255))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_sex_len" CHECK ((("sex" IS NULL) OR ("char_length"("sex") <= 20))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_student_name_len" CHECK ((("student_name" IS NULL) OR ("char_length"("student_name") <= 160))) NOT VALID;



ALTER TABLE "public"."general_feedback"
    ADD CONSTRAINT "general_feedback_suggestions_len" CHECK ((("suggestions" IS NULL) OR ("char_length"("suggestions") <= 1500))) NOT VALID;



ALTER TABLE ONLY "public"."nat_requirements"
    ADD CONSTRAINT "nat_requirements_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."nat_requirements"
    ADD CONSTRAINT "nat_requirements_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_message_len" CHECK ((("message" IS NULL) OR ("char_length"("message") <= 4000))) NOT VALID;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."notifications"
    ADD CONSTRAINT "notifications_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE ONLY "public"."office_visit_reasons"
    ADD CONSTRAINT "office_visit_reasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."office_visit_reasons"
    ADD CONSTRAINT "office_visit_reasons_reason_key" UNIQUE ("reason");



ALTER TABLE "public"."office_visit_reasons"
    ADD CONSTRAINT "office_visit_reasons_reason_len" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 255))) NOT VALID;



ALTER TABLE ONLY "public"."office_visits"
    ADD CONSTRAINT "office_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."office_visits"
    ADD CONSTRAINT "office_visits_reason_len" CHECK ((("reason" IS NULL) OR ("char_length"("reason") <= 255))) NOT VALID;



ALTER TABLE "public"."office_visits"
    ADD CONSTRAINT "office_visits_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE "public"."office_visits"
    ADD CONSTRAINT "office_visits_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."office_visits"
    ADD CONSTRAINT "office_visits_student_name_len" CHECK ((("student_name" IS NULL) OR ("char_length"("student_name") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_type_key_unique" UNIQUE ("role", "permission_type", "permission_key");



ALTER TABLE ONLY "public"."scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_scholarship_id_student_id_key" UNIQUE ("scholarship_id", "student_id");



ALTER TABLE ONLY "public"."scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_unique" UNIQUE ("scholarship_id", "student_id");



ALTER TABLE "public"."scholarships"
    ADD CONSTRAINT "scholarships_description_len" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 4000))) NOT VALID;



ALTER TABLE ONLY "public"."scholarships"
    ADD CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."scholarships"
    ADD CONSTRAINT "scholarships_requirements_len" CHECK ((("requirements" IS NULL) OR ("char_length"("requirements") <= 4000))) NOT VALID;



ALTER TABLE "public"."scholarships"
    ADD CONSTRAINT "scholarships_title_len" CHECK ((("title" IS NULL) OR ("char_length"("title") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."security_change_otps"
    ADD CONSTRAINT "security_change_otps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_department_len" CHECK ((("department" IS NULL) OR ("char_length"("department") <= 120))) NOT VALID;



ALTER TABLE "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_email_len" CHECK ((("email" IS NULL) OR ("char_length"("email") <= 254))) NOT VALID;



ALTER TABLE "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_full_name_len" CHECK ((("full_name" IS NULL) OR ("char_length"("full_name") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_role_len" CHECK ((("role" IS NULL) OR ("char_length"("role") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_username_key" UNIQUE ("username");



ALTER TABLE "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_username_len" CHECK ((("username" IS NULL) OR ("char_length"("username") <= 80))) NOT VALID;



ALTER TABLE ONLY "public"."student_activation_settings"
    ADD CONSTRAINT "student_activation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_address_len" CHECK ((("address" IS NULL) OR ("char_length"("address") <= 300))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_alt_course_1_len" CHECK ((("alt_course_1" IS NULL) OR ("char_length"("alt_course_1") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_alt_course_2_len" CHECK ((("alt_course_2" IS NULL) OR ("char_length"("alt_course_2") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_auth_user_id_key" UNIQUE ("auth_user_id");



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_birth_order_len" CHECK ((("birth_order" IS NULL) OR ("char_length"("birth_order") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_birth_order_other_len" CHECK ((("birth_order_other" IS NULL) OR ("char_length"("birth_order_other") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_children_names_birthdates_len" CHECK ((("children_names_birthdates" IS NULL) OR ("char_length"("children_names_birthdates") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_city_len" CHECK ((("city" IS NULL) OR ("char_length"("city") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_civil_status_len" CHECK ((("civil_status" IS NULL) OR ("char_length"("civil_status") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_college_school_len" CHECK ((("college_school" IS NULL) OR ("char_length"("college_school") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_college_year_graduated_len" CHECK ((("college_year_graduated" IS NULL) OR ("char_length"("college_year_graduated") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_course_len" CHECK ((("course" IS NULL) OR ("char_length"("course") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_currently_pregnant_len" CHECK ((("currently_pregnant" IS NULL) OR ("char_length"("currently_pregnant") <= 20))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_department_len" CHECK ((("department" IS NULL) OR ("char_length"("department") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_disability_cause_len" CHECK ((("disability_cause" IS NULL) OR ("char_length"("disability_cause") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_elem_school_len" CHECK ((("elem_school" IS NULL) OR ("char_length"("elem_school") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_elem_year_graduated_len" CHECK ((("elem_year_graduated" IS NULL) OR ("char_length"("elem_year_graduated") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_eligibility_acquired_len" CHECK ((("eligibility_acquired" IS NULL) OR ("char_length"("eligibility_acquired") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_email_len" CHECK ((("email" IS NULL) OR ("char_length"("email") <= 254))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_emergency_address_len" CHECK ((("emergency_address" IS NULL) OR ("char_length"("emergency_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_emergency_contact_len" CHECK ((("emergency_contact" IS NULL) OR ("char_length"("emergency_contact") <= 300))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_emergency_name_len" CHECK ((("emergency_name" IS NULL) OR ("char_length"("emergency_name") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_emergency_number_len" CHECK ((("emergency_number" IS NULL) OR ("char_length"("emergency_number") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_emergency_relationship_len" CHECK ((("emergency_relationship" IS NULL) OR ("char_length"("emergency_relationship") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_employer_address_len" CHECK ((("employer_address" IS NULL) OR ("char_length"("employer_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_employer_name_len" CHECK ((("employer_name" IS NULL) OR ("char_length"("employer_name") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_extracurricular_activities_len" CHECK ((("extracurricular_activities" IS NULL) OR ("char_length"("extracurricular_activities") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_facebook_url_len" CHECK ((("facebook_url" IS NULL) OR ("char_length"("facebook_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_address_len" CHECK ((("father_address" IS NULL) OR ("char_length"("father_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_contact_len" CHECK ((("father_contact" IS NULL) OR ("char_length"("father_contact") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_given_name_len" CHECK ((("father_given_name" IS NULL) OR ("char_length"("father_given_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_last_name_len" CHECK ((("father_last_name" IS NULL) OR ("char_length"("father_last_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_middle_name_len" CHECK ((("father_middle_name" IS NULL) OR ("char_length"("father_middle_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_name_len" CHECK ((("father_name" IS NULL) OR ("char_length"("father_name") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_occupation_len" CHECK ((("father_occupation" IS NULL) OR ("char_length"("father_occupation") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_father_status_len" CHECK ((("father_status" IS NULL) OR ("char_length"("father_status") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_first_name_len" CHECK ((("first_name" IS NULL) OR ("char_length"("first_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_four_ps_document_url_len" CHECK ((("four_ps_document_url" IS NULL) OR ("char_length"("four_ps_document_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_gender_identity_len" CHECK ((("gender_identity" IS NULL) OR ("char_length"("gender_identity") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_guardian_address_len" CHECK ((("guardian_address" IS NULL) OR ("char_length"("guardian_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_guardian_contact_len" CHECK ((("guardian_contact" IS NULL) OR ("char_length"("guardian_contact") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_guardian_name_len" CHECK ((("guardian_name" IS NULL) OR ("char_length"("guardian_name") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_guardian_relation_len" CHECK ((("guardian_relation" IS NULL) OR ("char_length"("guardian_relation") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_honors_awards_len" CHECK ((("honors_awards" IS NULL) OR ("char_length"("honors_awards") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_indigenous_group_len" CHECK ((("indigenous_group" IS NULL) OR ("char_length"("indigenous_group") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_ip_document_url_len" CHECK ((("ip_document_url" IS NULL) OR ("char_length"("ip_document_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_junior_high_school_len" CHECK ((("junior_high_school" IS NULL) OR ("char_length"("junior_high_school") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_junior_high_year_graduated_len" CHECK ((("junior_high_year_graduated" IS NULL) OR ("char_length"("junior_high_year_graduated") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_last_name_len" CHECK ((("last_name" IS NULL) OR ("char_length"("last_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_middle_name_len" CHECK ((("middle_name" IS NULL) OR ("char_length"("middle_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mobile_len" CHECK ((("mobile" IS NULL) OR ("char_length"("mobile") <= 24))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_address_len" CHECK ((("mother_address" IS NULL) OR ("char_length"("mother_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_contact_len" CHECK ((("mother_contact" IS NULL) OR ("char_length"("mother_contact") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_given_name_len" CHECK ((("mother_given_name" IS NULL) OR ("char_length"("mother_given_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_last_name_len" CHECK ((("mother_last_name" IS NULL) OR ("char_length"("mother_last_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_middle_name_len" CHECK ((("mother_middle_name" IS NULL) OR ("char_length"("mother_middle_name") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_name_len" CHECK ((("mother_name" IS NULL) OR ("char_length"("mother_name") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_occupation_len" CHECK ((("mother_occupation" IS NULL) OR ("char_length"("mother_occupation") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_mother_status_len" CHECK ((("mother_status" IS NULL) OR ("char_length"("mother_status") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_nationality_len" CHECK ((("nationality" IS NULL) OR ("char_length"("nationality") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_num_brothers_len" CHECK ((("num_brothers" IS NULL) OR ("char_length"("num_brothers") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_num_children_len" CHECK ((("num_children" IS NULL) OR ("char_length"("num_children") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_num_sisters_len" CHECK ((("num_sisters" IS NULL) OR ("char_length"("num_sisters") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_organizations_memberships_len" CHECK ((("organizations_memberships" IS NULL) OR ("char_length"("organizations_memberships") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_orphan_cause_len" CHECK ((("orphan_cause" IS NULL) OR ("char_length"("orphan_cause") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_other_talents_len" CHECK ((("other_talents" IS NULL) OR ("char_length"("other_talents") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_parent_address_len" CHECK ((("parent_address" IS NULL) OR ("char_length"("parent_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_parents_num_children_len" CHECK ((("parents_num_children" IS NULL) OR ("char_length"("parents_num_children") <= 40))) NOT VALID;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_place_of_birth_len" CHECK ((("place_of_birth" IS NULL) OR ("char_length"("place_of_birth") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_priority_course_len" CHECK ((("priority_course" IS NULL) OR ("char_length"("priority_course") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_profile_picture_url_len" CHECK ((("profile_picture_url" IS NULL) OR ("char_length"("profile_picture_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_province_len" CHECK ((("province" IS NULL) OR ("char_length"("province") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_public_service_position_len" CHECK ((("public_service_position" IS NULL) OR ("char_length"("public_service_position") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_pwd_document_url_len" CHECK ((("pwd_document_url" IS NULL) OR ("char_length"("pwd_document_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_pwd_number_len" CHECK ((("pwd_number" IS NULL) OR ("char_length"("pwd_number") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_pwd_type_len" CHECK ((("pwd_type" IS NULL) OR ("char_length"("pwd_type") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_region_len" CHECK ((("region" IS NULL) OR ("char_length"("region") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_religion_len" CHECK ((("religion" IS NULL) OR ("char_length"("religion") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_scholarships_availed_len" CHECK ((("scholarships_availed" IS NULL) OR ("char_length"("scholarships_availed") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_school_last_attended_len" CHECK ((("school_last_attended" IS NULL) OR ("char_length"("school_last_attended") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_section_len" CHECK ((("section" IS NULL) OR ("char_length"("section") <= 32))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_senior_citizen_document_url_len" CHECK ((("senior_citizen_document_url" IS NULL) OR ("char_length"("senior_citizen_document_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_senior_high_school_len" CHECK ((("senior_high_school" IS NULL) OR ("char_length"("senior_high_school") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_senior_high_year_graduated_len" CHECK ((("senior_high_year_graduated" IS NULL) OR ("char_length"("senior_high_year_graduated") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_sex_len" CHECK ((("sex" IS NULL) OR ("char_length"("sex") <= 20))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_solo_parent_document_url_len" CHECK ((("solo_parent_document_url" IS NULL) OR ("char_length"("solo_parent_document_url") <= 2048))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_special_trainings_attended_len" CHECK ((("special_trainings_attended" IS NULL) OR ("char_length"("special_trainings_attended") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_sports_skills_len" CHECK ((("sports_skills" IS NULL) OR ("char_length"("sports_skills") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_spouse_contact_len" CHECK ((("spouse_contact" IS NULL) OR ("char_length"("spouse_contact") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_spouse_employer_address_len" CHECK ((("spouse_employer_address" IS NULL) OR ("char_length"("spouse_employer_address") <= 200))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_spouse_employer_name_len" CHECK ((("spouse_employer_name" IS NULL) OR ("char_length"("spouse_employer_name") <= 160))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_spouse_name_len" CHECK ((("spouse_name" IS NULL) OR ("char_length"("spouse_name") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_spouse_occupation_len" CHECK ((("spouse_occupation" IS NULL) OR ("char_length"("spouse_occupation") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_street_len" CHECK ((("street" IS NULL) OR ("char_length"("street") <= 160))) NOT VALID;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_student_id_key" UNIQUE ("student_id");



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_suffix_len" CHECK ((("suffix" IS NULL) OR ("char_length"("suffix") <= 20))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_supporter_contact_len" CHECK ((("supporter_contact" IS NULL) OR ("char_length"("supporter_contact") <= 40))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_supporter_len" CHECK ((("supporter" IS NULL) OR ("char_length"("supporter") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_tesda_nc2_acquired_len" CHECK ((("tesda_nc2_acquired" IS NULL) OR ("char_length"("tesda_nc2_acquired") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_work_experiences_len" CHECK ((("work_experiences" IS NULL) OR ("char_length"("work_experiences") <= 1000))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_working_student_type_len" CHECK ((("working_student_type" IS NULL) OR ("char_length"("working_student_type") <= 120))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_year_level_len" CHECK ((("year_level" IS NULL) OR ("char_length"("year_level") <= 32))) NOT VALID;



ALTER TABLE "public"."students"
    ADD CONSTRAINT "students_zip_code_len" CHECK ((("zip_code" IS NULL) OR ("char_length"("zip_code") <= 20))) NOT VALID;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_care_documents_url_len" CHECK ((("care_documents_url" IS NULL) OR ("char_length"("care_documents_url") <= 4000))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_care_notes_len" CHECK ((("care_notes" IS NULL) OR ("char_length"("care_notes") <= 4000))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_department_len" CHECK ((("department" IS NULL) OR ("char_length"("department") <= 120))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_dept_notes_len" CHECK ((("dept_notes" IS NULL) OR ("char_length"("dept_notes") <= 510000))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_description_len" CHECK ((("description" IS NULL) OR ("char_length"("description") <= 4000))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_documents_url_len" CHECK ((("documents_url" IS NULL) OR ("char_length"("documents_url") <= 4000))) NOT VALID;



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_resolution_notes_len" CHECK ((("resolution_notes" IS NULL) OR ("char_length"("resolution_notes") <= 4000))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_status_len" CHECK ((("status" IS NULL) OR ("char_length"("status") <= 80))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_student_id_len" CHECK ((("student_id" IS NULL) OR ("char_length"("student_id") <= 32))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_student_name_len" CHECK ((("student_name" IS NULL) OR ("char_length"("student_name") <= 160))) NOT VALID;



ALTER TABLE "public"."support_requests"
    ADD CONSTRAINT "support_requests_support_type_len" CHECK ((("support_type" IS NULL) OR ("char_length"("support_type") <= 1000))) NOT VALID;



CREATE UNIQUE INDEX "answers_one_per_submission_question" ON "public"."answers" USING "btree" ("submission_id", "question_id") WHERE (("submission_id" IS NOT NULL) AND ("question_id" IS NOT NULL));



CREATE INDEX "audit_logs_actor_role_created_at_idx" ON "public"."audit_logs" USING "btree" ("actor_role", "created_at" DESC);



CREATE INDEX "edge_rate_limits_expires_at_idx" ON "public"."edge_rate_limits" USING "btree" ("expires_at");



CREATE INDEX "idx_answers_question_id" ON "public"."answers" USING "btree" ("question_id");



CREATE INDEX "idx_answers_submission_id" ON "public"."answers" USING "btree" ("submission_id");



CREATE INDEX "idx_application_archives_activated_student_id" ON "public"."application_archives" USING "btree" ("activated_student_id");



CREATE INDEX "idx_application_archives_archived_at" ON "public"."application_archives" USING "btree" ("archived_at" DESC);



CREATE INDEX "idx_application_archives_outcome_archived_at" ON "public"."application_archives" USING "btree" ("archive_outcome", "archived_at" DESC);



CREATE INDEX "idx_application_archives_reference_id" ON "public"."application_archives" USING "btree" ("reference_id");



CREATE INDEX "idx_applications_alt_course_1" ON "public"."applications" USING "btree" ("alt_course_1");



CREATE INDEX "idx_applications_alt_course_2" ON "public"."applications" USING "btree" ("alt_course_2");



CREATE INDEX "idx_applications_interview_queue_status" ON "public"."applications" USING "btree" ("status", "interview_date", "interview_queue_status");



CREATE INDEX "idx_applications_priority_course" ON "public"."applications" USING "btree" ("priority_course");



CREATE INDEX "idx_applications_reference_id" ON "public"."applications" USING "btree" ("reference_id");



CREATE INDEX "idx_applications_status_created_at" ON "public"."applications" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_applications_test_date_time" ON "public"."applications" USING "btree" ("test_date", "test_time");



CREATE INDEX "idx_counseling_requests_department" ON "public"."counseling_requests" USING "btree" ("department");



CREATE INDEX "idx_counseling_requests_scheduled_date" ON "public"."counseling_requests" USING "btree" ("scheduled_date");



CREATE INDEX "idx_counseling_requests_status_created_at" ON "public"."counseling_requests" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_counseling_requests_student_id" ON "public"."counseling_requests" USING "btree" ("student_id");



CREATE INDEX "idx_courses_department_id" ON "public"."courses" USING "btree" ("department_id");



CREATE INDEX "idx_departments_is_archived_name" ON "public"."departments" USING "btree" ("is_archived", "name");



CREATE INDEX "idx_enrolled_students_course" ON "public"."enrolled_students" USING "btree" ("course");



CREATE INDEX "idx_enrolled_students_student_year" ON "public"."enrolled_students" USING "btree" ("student_id", "year_level");



CREATE INDEX "idx_event_attendance_department" ON "public"."event_attendance" USING "btree" ("department");



CREATE INDEX "idx_event_attendance_student_id" ON "public"."event_attendance" USING "btree" ("student_id");



CREATE INDEX "idx_event_feedback_student_id" ON "public"."event_feedback" USING "btree" ("student_id");



CREATE INDEX "idx_event_registrations_event_status" ON "public"."event_registrations" USING "btree" ("event_id", "status");



CREATE INDEX "idx_event_registrations_student" ON "public"."event_registrations" USING "btree" ("student_id", "registered_at" DESC);



CREATE INDEX "idx_event_registrations_student_id" ON "public"."event_registrations" USING "btree" ("student_id");



CREATE INDEX "idx_events_audience_courses_gin" ON "public"."events" USING "gin" ("audience_courses");



CREATE INDEX "idx_events_audience_departments_gin" ON "public"."events" USING "gin" ("audience_departments");



CREATE INDEX "idx_events_audience_sections_gin" ON "public"."events" USING "gin" ("audience_sections");



CREATE INDEX "idx_events_audience_year_levels_gin" ON "public"."events" USING "gin" ("audience_year_levels");



CREATE INDEX "idx_events_is_archived_event_date" ON "public"."events" USING "btree" ("is_archived", "event_date");



CREATE INDEX "idx_events_participation_audience" ON "public"."events" USING "btree" ("participation_mode", "audience_type", "event_date");



CREATE INDEX "idx_general_feedback_student_id" ON "public"."general_feedback" USING "btree" ("student_id");



CREATE INDEX "idx_nat_requirements_is_active_created_at" ON "public"."nat_requirements" USING "btree" ("is_active", "created_at" DESC);



CREATE INDEX "idx_notifications_student_id" ON "public"."notifications" USING "btree" ("student_id");



CREATE INDEX "idx_office_visits_reason" ON "public"."office_visits" USING "btree" ("reason");



CREATE INDEX "idx_office_visits_status_time_in" ON "public"."office_visits" USING "btree" ("status", "time_in" DESC);



CREATE INDEX "idx_office_visits_student_id" ON "public"."office_visits" USING "btree" ("student_id");



CREATE INDEX "idx_office_visits_time_in" ON "public"."office_visits" USING "btree" ("time_in" DESC);



CREATE INDEX "idx_questions_form_id" ON "public"."questions" USING "btree" ("form_id");



CREATE INDEX "idx_role_permissions_created_by" ON "public"."role_permissions" USING "btree" ("created_by");



CREATE INDEX "idx_role_permissions_lookup" ON "public"."role_permissions" USING "btree" ("role", "permission_type", "permission_key");



CREATE INDEX "idx_scholarship_applications_student_id" ON "public"."scholarship_applications" USING "btree" ("student_id");



CREATE UNIQUE INDEX "idx_scholarship_applications_unique_student_per_scholarship" ON "public"."scholarship_applications" USING "btree" ("scholarship_id", "student_id");



CREATE INDEX "idx_scholarships_is_active_deadline" ON "public"."scholarships" USING "btree" ("is_active", "deadline");



CREATE INDEX "idx_security_change_otps_lookup" ON "public"."security_change_otps" USING "btree" ("auth_user_id", "account_type", "purpose", "consumed_at", "expires_at", "created_at" DESC);



CREATE INDEX "idx_staff_accounts_department" ON "public"."staff_accounts" USING "btree" ("department");



CREATE INDEX "idx_staff_accounts_is_archived_created_at" ON "public"."staff_accounts" USING "btree" ("is_archived", "created_at" DESC);



CREATE INDEX "idx_students_active_created_at" ON "public"."students" USING "btree" ("created_at" DESC) WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_first_name_lower_trgm" ON "public"."students" USING "gin" ("lower"(COALESCE("first_name", ''::"text")) "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_first_name_trgm" ON "public"."students" USING "gin" ("first_name" "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_last_name" ON "public"."students" USING "btree" ("last_name", "first_name", "student_id") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_last_name_lower_trgm" ON "public"."students" USING "gin" ("lower"(COALESCE("last_name", ''::"text")) "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_last_name_trgm" ON "public"."students" USING "gin" ("last_name" "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_lower_last_name" ON "public"."students" USING "btree" ("lower"("last_name"), "lower"("first_name"), "student_id") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_profile_completed" ON "public"."students" USING "btree" ("profile_completed") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_search_filters" ON "public"."students" USING "btree" ("department", "course", "year_level", "section", "status") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_student_id_lower_trgm" ON "public"."students" USING "gin" ("lower"(COALESCE("student_id", ''::"text")) "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_active_student_id_trgm" ON "public"."students" USING "gin" ("student_id" "extensions"."gin_trgm_ops") WHERE ("is_archived" = false);



CREATE INDEX "idx_students_course" ON "public"."students" USING "btree" ("course");



CREATE INDEX "idx_students_course_year_archive_gin" ON "public"."students" USING "gin" ("course_year_archive");



CREATE INDEX "idx_students_course_year_update_required" ON "public"."students" USING "btree" ("course_year_update_required", "course_year_window_end");



CREATE INDEX "idx_students_course_year_window_end" ON "public"."students" USING "btree" ("course_year_window_end");



CREATE INDEX "idx_students_department" ON "public"."students" USING "btree" ("department");



CREATE INDEX "idx_students_is_archived_archived_at" ON "public"."students" USING "btree" ("is_archived", "archived_at" DESC);



CREATE INDEX "idx_students_status" ON "public"."students" USING "btree" ("status");



CREATE INDEX "idx_students_student_id" ON "public"."students" USING "btree" ("student_id");



CREATE INDEX "idx_submissions_form_id" ON "public"."submissions" USING "btree" ("form_id");



CREATE INDEX "idx_submissions_student_id" ON "public"."submissions" USING "btree" ("student_id");



CREATE INDEX "idx_support_requests_department" ON "public"."support_requests" USING "btree" ("department");



CREATE INDEX "idx_support_requests_status_created_at" ON "public"."support_requests" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_support_requests_student_id" ON "public"."support_requests" USING "btree" ("student_id");



CREATE UNIQUE INDEX "submissions_one_per_student_form" ON "public"."submissions" USING "btree" ("form_id", "student_id") WHERE (("form_id" IS NOT NULL) AND ("student_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "audit_staff_change_admission_schedules" AFTER INSERT OR DELETE OR UPDATE ON "public"."admission_schedules" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_applications" AFTER INSERT OR DELETE OR UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_counseling_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."counseling_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_courses" AFTER INSERT OR DELETE OR UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_enrolled_students" AFTER INSERT OR DELETE OR UPDATE ON "public"."enrolled_students" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_events" AFTER INSERT OR DELETE OR UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_forms" AFTER INSERT OR DELETE OR UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_nat_requirements" AFTER INSERT OR DELETE OR UPDATE ON "public"."nat_requirements" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_office_visit_reasons" AFTER INSERT OR DELETE OR UPDATE ON "public"."office_visit_reasons" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_questions" AFTER INSERT OR DELETE OR UPDATE ON "public"."questions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_scholarships" AFTER INSERT OR DELETE OR UPDATE ON "public"."scholarships" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_staff_accounts" AFTER INSERT OR DELETE OR UPDATE ON "public"."staff_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_student_activation_settings" AFTER INSERT OR DELETE OR UPDATE ON "public"."student_activation_settings" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_students" AFTER INSERT OR DELETE OR UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "audit_staff_change_support_requests" AFTER INSERT OR DELETE OR UPDATE ON "public"."support_requests" FOR EACH ROW EXECUTE FUNCTION "public"."audit_staff_table_change"();



CREATE OR REPLACE TRIGGER "sync_student_course_year_trigger" AFTER UPDATE OF "course", "year_level", "student_id" ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."sync_student_course_year_to_enrollment"();



CREATE OR REPLACE TRIGGER "trg_event_attendance_sync_registration_status" AFTER INSERT ON "public"."event_attendance" FOR EACH ROW EXECUTE FUNCTION "public"."sync_event_registration_attendance_status"();



CREATE OR REPLACE TRIGGER "trg_event_registrations_updated_at" BEFORE UPDATE ON "public"."event_registrations" FOR EACH ROW EXECUTE FUNCTION "public"."set_event_registrations_updated_at"();



CREATE OR REPLACE TRIGGER "trg_student_activation_settings_updated_at" BEFORE UPDATE ON "public"."student_activation_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_student_activation_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trg_validate_students_course_year" BEFORE INSERT OR UPDATE ON "public"."students" FOR EACH ROW EXECUTE FUNCTION "public"."validate_students_course_year"();



CREATE OR REPLACE TRIGGER "update_updated_at" BEFORE UPDATE ON "public"."role_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."set_role_permissions_updated_at"();



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."answers"
    ADD CONSTRAINT "answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_alt_course_1_fkey" FOREIGN KEY ("alt_course_1") REFERENCES "public"."courses"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_alt_course_2_fkey" FOREIGN KEY ("alt_course_2") REFERENCES "public"."courses"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_priority_course_fkey" FOREIGN KEY ("priority_course") REFERENCES "public"."courses"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_test_date_fkey" FOREIGN KEY ("test_date") REFERENCES "public"."admission_schedules"("date") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."counseling_requests"
    ADD CONSTRAINT "counseling_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."enrolled_students"
    ADD CONSTRAINT "enrolled_students_course_fkey" FOREIGN KEY ("course") REFERENCES "public"."courses"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_attendance"
    ADD CONSTRAINT "event_attendance_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_feedback"
    ADD CONSTRAINT "event_feedback_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."event_registrations"
    ADD CONSTRAINT "event_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "fk_submissions_students" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."office_visits"
    ADD CONSTRAINT "office_visits_reason_fkey" FOREIGN KEY ("reason") REFERENCES "public"."office_visit_reasons"("reason") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."office_visits"
    ADD CONSTRAINT "office_visits_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."staff_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_scholarship_id_fkey" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scholarship_applications"
    ADD CONSTRAINT "scholarship_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."staff_accounts"
    ADD CONSTRAINT "staff_accounts_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_course_fkey" FOREIGN KEY ("course") REFERENCES "public"."courses"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."students"
    ADD CONSTRAINT "students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."enrolled_students"("student_id") ON UPDATE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_department_fkey" FOREIGN KEY ("department") REFERENCES "public"."departments"("name") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("student_id") ON UPDATE CASCADE;



ALTER TABLE "public"."admission_schedules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "admission_schedules_admin_delete" ON "public"."admission_schedules" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "admission_schedules_care_admin_insert" ON "public"."admission_schedules" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "admission_schedules_care_admin_update" ON "public"."admission_schedules" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "admission_schedules_public_read" ON "public"."admission_schedules" FOR SELECT USING (true);



ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answers_admin_delete" ON "public"."answers" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "answers_care_admin_insert" ON "public"."answers" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "answers_care_admin_select" ON "public"."answers" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "answers_care_admin_update" ON "public"."answers" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "answers_student_insert_own" ON "public"."answers" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "answers"."submission_id") AND ("s"."student_id" = "public"."current_student_id"())))));



CREATE POLICY "answers_student_read_own" ON "public"."answers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "answers"."submission_id") AND ("s"."student_id" = "public"."current_student_id"())))));



ALTER TABLE "public"."application_archives" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "application_archives_admin_care_read" ON "public"."application_archives" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "applications_admin_care_insert" ON "public"."applications" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "applications_admin_care_select" ON "public"."applications" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "applications_admin_care_update" ON "public"."applications" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "applications_admin_delete" ON "public"."applications" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "applications_anon_submit" ON "public"."applications" FOR INSERT WITH CHECK (((COALESCE("status", 'Submitted'::"text") = 'Submitted'::"text") AND (COALESCE("current_choice", 1) = 1) AND ("interview_date" IS NULL) AND ("time_in" IS NULL) AND ("time_out" IS NULL)));



CREATE POLICY "applications_department_head_read_current_queue" ON "public"."applications" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."departments" "d"
     JOIN "public"."courses" "c" ON (("c"."department_id" = "d"."id")))
  WHERE (("d"."name" = "public"."current_staff_department"()) AND ((("applications"."priority_course" = "c"."name") AND (COALESCE("applications"."current_choice", 1) = 1)) OR (("applications"."alt_course_1" = "c"."name") AND ("applications"."current_choice" = 2)) OR (("applications"."alt_course_2" = "c"."name") AND ("applications"."current_choice" = 3))))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_authenticated_insert" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (("public"."current_staff_role"() = ANY (ARRAY['Care Staff'::"text", 'Department Head'::"text"])));



CREATE POLICY "audit_logs_care_admin_read" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."counseling_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "counseling_requests_admin_manage" ON "public"."counseling_requests" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "counseling_requests_care_staff_read" ON "public"."counseling_requests" FOR SELECT TO "authenticated" USING (("public"."current_staff_role"() = 'Care Staff'::"text"));



CREATE POLICY "counseling_requests_department_head_read_department" ON "public"."counseling_requests" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND ("department" = "public"."current_staff_department"())));



CREATE POLICY "counseling_requests_student_feedback_update" ON "public"."counseling_requests" FOR UPDATE TO "authenticated" USING ((("student_id" = "public"."current_student_id"()) AND ("status" = 'Completed'::"text"))) WITH CHECK ((("student_id" = "public"."current_student_id"()) AND ("status" = 'Completed'::"text")));



CREATE POLICY "counseling_requests_student_insert_own" ON "public"."counseling_requests" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "counseling_requests_student_read_own" ON "public"."counseling_requests" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_admin_delete" ON "public"."courses" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "courses_care_admin_insert" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "courses_care_admin_update" ON "public"."courses" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "courses_public_read" ON "public"."courses" FOR SELECT USING (true);



CREATE POLICY "courses_registrar_read" ON "public"."courses" FOR SELECT TO "authenticated" USING (("public"."current_staff_role"() = 'Registrar'::"text"));



ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "departments_admin_manage" ON "public"."departments" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "departments_public_read" ON "public"."departments" FOR SELECT USING (true);



CREATE POLICY "departments_registrar_read" ON "public"."departments" FOR SELECT TO "authenticated" USING (("public"."current_staff_role"() = 'Registrar'::"text"));



ALTER TABLE "public"."edge_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."enrolled_students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "enrolled_students_admin_delete" ON "public"."enrolled_students" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "enrolled_students_care_admin_insert" ON "public"."enrolled_students" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "enrolled_students_care_admin_select" ON "public"."enrolled_students" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "enrolled_students_care_admin_update" ON "public"."enrolled_students" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "enrolled_students_student_read_own" ON "public"."enrolled_students" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."event_attendance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_attendance_care_admin_manage" ON "public"."event_attendance" TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "event_attendance_department_read" ON "public"."event_attendance" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND ("department" = "public"."current_staff_department"())));



CREATE POLICY "event_attendance_student_insert_own" ON "public"."event_attendance" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "event_attendance_student_read_own" ON "public"."event_attendance" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



CREATE POLICY "event_attendance_student_update_own" ON "public"."event_attendance" FOR UPDATE TO "authenticated" USING (("student_id" = "public"."current_student_id"())) WITH CHECK (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."event_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_feedback_care_admin_read" ON "public"."event_feedback" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "event_feedback_student_insert_own" ON "public"."event_feedback" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "event_feedback_student_read_own" ON "public"."event_feedback" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."event_registrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "event_registrations_care_admin_manage" ON "public"."event_registrations" TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "event_registrations_department_read" ON "public"."event_registrations" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND ("department" = "public"."current_staff_department"())));



CREATE POLICY "event_registrations_student_insert_own" ON "public"."event_registrations" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "event_registrations_student_read_own" ON "public"."event_registrations" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



CREATE POLICY "event_registrations_student_update_own" ON "public"."event_registrations" FOR UPDATE TO "authenticated" USING (("student_id" = "public"."current_student_id"())) WITH CHECK (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "events_admin_delete" ON "public"."events" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "events_authenticated_read" ON "public"."events" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "events_care_admin_insert" ON "public"."events" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "events_care_admin_update" ON "public"."events" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "forms_admin_delete" ON "public"."forms" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "forms_authenticated_read" ON "public"."forms" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR "public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "forms_care_admin_insert" ON "public"."forms" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "forms_care_admin_update" ON "public"."forms" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."general_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "general_feedback_anon_insert" ON "public"."general_feedback" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "general_feedback_care_admin_read" ON "public"."general_feedback" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "general_feedback_student_insert_own" ON "public"."general_feedback" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "general_feedback_student_read_own" ON "public"."general_feedback" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."nat_requirements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "nat_requirements_admin_delete" ON "public"."nat_requirements" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "nat_requirements_care_admin_insert" ON "public"."nat_requirements" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "nat_requirements_care_admin_select" ON "public"."nat_requirements" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "nat_requirements_care_admin_update" ON "public"."nat_requirements" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_staff_manage" ON "public"."notifications" TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text") OR (("public"."current_staff_role"() = 'Department Head'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."student_id" = "notifications"."student_id") AND ("s"."department" = "public"."current_staff_department"()))))))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text") OR (("public"."current_staff_role"() = 'Department Head'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."students" "s"
  WHERE (("s"."student_id" = "notifications"."student_id") AND ("s"."department" = "public"."current_staff_department"())))))));



CREATE POLICY "notifications_student_insert_own" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "notifications_student_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



CREATE POLICY "notifications_student_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("student_id" = "public"."current_student_id"())) WITH CHECK (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."office_visit_reasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "office_visit_reasons_admin_delete" ON "public"."office_visit_reasons" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "office_visit_reasons_authenticated_read" ON "public"."office_visit_reasons" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR "public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "office_visit_reasons_care_admin_insert" ON "public"."office_visit_reasons" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "office_visit_reasons_care_admin_update" ON "public"."office_visit_reasons" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."office_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "office_visits_care_admin_manage" ON "public"."office_visits" TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "office_visits_student_insert_own" ON "public"."office_visits" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "office_visits_student_read_own" ON "public"."office_visits" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions_admin_delete" ON "public"."questions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "questions_authenticated_read" ON "public"."questions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text") OR (EXISTS ( SELECT 1
   FROM "public"."forms" "f"
  WHERE (("f"."id" = "questions"."form_id") AND ("f"."is_active" = true))))));



CREATE POLICY "questions_care_admin_insert" ON "public"."questions" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "questions_care_admin_update" ON "public"."questions" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "role_permissions_admin_manage" ON "public"."role_permissions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "role_permissions_role_read" ON "public"."role_permissions" FOR SELECT TO "authenticated", "anon" USING (((("role")::"text" = 'Public'::"text") OR ("public"."current_staff_role"() IS NOT NULL) OR (("auth"."uid"() IS NOT NULL) AND (("role")::"text" = 'Student'::"text"))));



ALTER TABLE "public"."scholarship_applications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scholarship_applications_care_admin_manage" ON "public"."scholarship_applications" TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "scholarship_applications_student_insert_own" ON "public"."scholarship_applications" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "scholarship_applications_student_read_own" ON "public"."scholarship_applications" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."scholarships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scholarships_admin_delete" ON "public"."scholarships" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "scholarships_authenticated_read" ON "public"."scholarships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "scholarships_care_admin_insert" ON "public"."scholarships" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "scholarships_care_admin_update" ON "public"."scholarships" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



ALTER TABLE "public"."security_change_otps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "staff_accounts_admin_manage" ON "public"."staff_accounts" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "staff_accounts_self_read" ON "public"."staff_accounts" FOR SELECT TO "authenticated" USING ((("id")::"text" = "public"."current_staff_account_id"()));



CREATE POLICY "staff_accounts_self_update_profile" ON "public"."staff_accounts" FOR UPDATE TO "authenticated" USING ((("id")::"text" = "public"."current_staff_account_id"())) WITH CHECK (((("id")::"text" = "public"."current_staff_account_id"()) AND ("auth"."uid"() = "auth_user_id") AND (COALESCE("username", ''::"text") = COALESCE("public"."current_staff_username"(), ''::"text")) AND (COALESCE("role", ''::"text") = COALESCE("public"."current_staff_role"(), ''::"text")) AND (COALESCE("department", ''::"text") = COALESCE("public"."current_staff_department"(), ''::"text")) AND ("lower"(COALESCE("email", ''::"text")) = "lower"(COALESCE("public"."current_staff_email"(), ''::"text")))));



ALTER TABLE "public"."student_activation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_admin_care_insert" ON "public"."students" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "students_admin_care_select" ON "public"."students" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "students_admin_care_update" ON "public"."students" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "students_admin_delete" ON "public"."students" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "students_department_head_read_department" ON "public"."students" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND (COALESCE("department", ''::"text") = COALESCE("public"."current_staff_department"(), ''::"text"))));



CREATE POLICY "students_registrar_read" ON "public"."students" FOR SELECT TO "authenticated" USING (("public"."current_staff_role"() = 'Registrar'::"text"));



CREATE POLICY "students_self_read" ON "public"."students" FOR SELECT TO "authenticated" USING ((("auth"."uid"() = "auth_user_id") OR ("student_id" = "public"."current_student_id"())));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_admin_delete" ON "public"."submissions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "submissions_care_admin_insert" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "submissions_care_admin_select" ON "public"."submissions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "submissions_care_admin_update" ON "public"."submissions" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text"))) WITH CHECK (("public"."is_admin"() OR ("public"."current_staff_role"() = 'Care Staff'::"text")));



CREATE POLICY "submissions_student_insert_own" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "submissions_student_read_own" ON "public"."submissions" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));



ALTER TABLE "public"."support_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "support_requests_admin_manage" ON "public"."support_requests" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "support_requests_care_staff_read" ON "public"."support_requests" FOR SELECT TO "authenticated" USING (("public"."current_staff_role"() = 'Care Staff'::"text"));



CREATE POLICY "support_requests_department_head_read_department" ON "public"."support_requests" FOR SELECT TO "authenticated" USING ((("public"."current_staff_role"() = 'Department Head'::"text") AND ("department" = "public"."current_staff_department"())));



CREATE POLICY "support_requests_student_insert_own" ON "public"."support_requests" FOR INSERT TO "authenticated" WITH CHECK (("student_id" = "public"."current_student_id"()));



CREATE POLICY "support_requests_student_read_own" ON "public"."support_requests" FOR SELECT TO "authenticated" USING (("student_id" = "public"."current_student_id"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."answers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."applications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."audit_logs";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."counseling_requests";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."courses";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."departments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."enrolled_students";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_attendance";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."event_feedback";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."forms";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."office_visit_reasons";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."office_visits";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."questions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."scholarships";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."staff_accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."students";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."submissions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."support_requests";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



















































































































































































































































GRANT ALL ON FUNCTION "public"."archive_and_reset_expired_course_year"("p_now" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_and_reset_expired_course_year"("p_now" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_and_reset_expired_course_year"("p_now" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "public"."students" TO "anon";
GRANT ALL ON TABLE "public"."students" TO "authenticated";
GRANT ALL ON TABLE "public"."students" TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_student"("p_student_id" "text", "p_reason" "text", "p_note" "text", "p_archived_by" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_staff_table_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_staff_table_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_staff_table_change"() TO "service_role";



GRANT ALL ON TABLE "public"."event_registrations" TO "anon";
GRANT ALL ON TABLE "public"."event_registrations" TO "authenticated";
GRANT ALL ON TABLE "public"."event_registrations" TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_student_event_registration"("p_event_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_school_year_label"("start_ts" timestamp with time zone, "end_ts" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."compute_school_year_label"("start_ts" timestamp with time zone, "end_ts" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_school_year_label"("start_ts" timestamp with time zone, "end_ts" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_edge_rate_limit"("p_scope" "text", "p_identifier" "text", "p_max_requests" integer, "p_window_seconds" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_account_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_account_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_account_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_account_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_staff_audit_entity_label"("row_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_audit_entity_label"("row_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_audit_entity_label"("row_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."current_staff_audit_record_id"("row_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_audit_record_id"("row_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_audit_record_id"("row_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_department"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_department"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_department"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_department"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_email"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_email"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_full_name"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_full_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_full_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_full_name"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_staff_username"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_staff_username"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_staff_username"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_staff_username"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_student_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_student_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_student_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_student_id"() TO "service_role";



GRANT ALL ON TABLE "public"."application_archives" TO "anon";
GRANT ALL ON TABLE "public"."application_archives" TO "authenticated";
GRANT ALL ON TABLE "public"."application_archives" TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint, "p_activated_student_id" "text", "p_activated_course" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint, "p_activated_student_id" "text", "p_activated_course" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint, "p_activated_student_id" "text", "p_activated_course" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_application"("p_application_id" "uuid", "p_outcome" "text", "p_archived_by" bigint, "p_activated_student_id" "text", "p_activated_course" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_care_student_course_year_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_care_student_course_year_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_care_student_course_year_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_care_student_course_year_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_care_student_population_overview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_care_student_population_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_care_student_population_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_care_student_population_overview"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_department_admission_candidates"("p_department_name" "text", "p_statuses" "text"[], "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_department_admission_candidates"("p_department_name" "text", "p_statuses" "text"[], "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_department_admission_candidates"("p_department_name" "text", "p_statuses" "text"[], "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_department_applications_page"("p_department_name" "text", "p_statuses" "text"[], "p_search" "text", "p_course" "text", "p_limit" integer, "p_offset" integer, "p_sort_ascending" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_department_applications_page"("p_department_name" "text", "p_statuses" "text"[], "p_search" "text", "p_course" "text", "p_limit" integer, "p_offset" integer, "p_sort_ascending" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_department_applications_page"("p_department_name" "text", "p_statuses" "text"[], "p_search" "text", "p_course" "text", "p_limit" integer, "p_offset" integer, "p_sort_ascending" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_event_attendees"("e_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_event_attendees"("e_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_event_attendees"("e_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."register_student_for_event"("p_event_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."register_student_for_event"("p_event_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."register_student_for_event"("p_event_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_student_for_event"("p_event_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_role_permissions_to_defaults"("target_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_student"("p_student_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_student"("p_student_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_student"("p_student_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_student"("p_student_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."search_care_students"("p_search" "text", "p_department" "text", "p_course" "text", "p_year_level" "text", "p_section" "text", "p_status" "text", "p_page" integer, "p_page_size" integer, "p_sort_column" "text", "p_sort_ascending" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."search_care_students"("p_search" "text", "p_department" "text", "p_course" "text", "p_year_level" "text", "p_section" "text", "p_status" "text", "p_page" integer, "p_page_size" integer, "p_sort_column" "text", "p_sort_ascending" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."search_care_students"("p_search" "text", "p_department" "text", "p_course" "text", "p_year_level" "text", "p_section" "text", "p_status" "text", "p_page" integer, "p_page_size" integer, "p_sort_column" "text", "p_sort_ascending" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_care_students"("p_search" "text", "p_department" "text", "p_course" "text", "p_year_level" "text", "p_section" "text", "p_status" "text", "p_page" integer, "p_page_size" integer, "p_sort_column" "text", "p_sort_ascending" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_archive_action_permission_defaults"("target_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."seed_default_role_permissions"("target_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."seed_default_role_permissions"("target_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_default_role_permissions"("target_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_default_role_permissions"("target_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."seed_student_role_permissions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."seed_student_role_permissions"() TO "anon";
GRANT ALL ON FUNCTION "public"."seed_student_role_permissions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_student_role_permissions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_event_registrations_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_event_registrations_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_event_registrations_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_role_permissions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_role_permissions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_role_permissions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_student_activation_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_student_activation_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_student_activation_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."swap_or_rename_student_ids"("p_source_id" "text", "p_target_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."swap_or_rename_student_ids"("p_source_id" "text", "p_target_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."swap_or_rename_student_ids"("p_source_id" "text", "p_target_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_event_registration_attendance_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_event_registration_attendance_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_event_registration_attendance_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_student_course_year_to_enrollment"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_student_course_year_to_enrollment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_student_course_year_to_enrollment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_students_course_year"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_students_course_year"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_students_course_year"() TO "service_role";


















GRANT ALL ON TABLE "public"."admission_schedules" TO "anon";
GRANT ALL ON TABLE "public"."admission_schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."admission_schedules" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admission_schedules_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admission_schedules_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admission_schedules_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."answers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."answers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."answers_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."application_archives_archive_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."application_archives_archive_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."application_archives_archive_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."counseling_requests" TO "anon";
GRANT ALL ON TABLE "public"."counseling_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."counseling_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."counseling_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."counseling_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."counseling_requests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."courses" TO "anon";
GRANT ALL ON TABLE "public"."courses" TO "authenticated";
GRANT ALL ON TABLE "public"."courses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."courses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."departments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."edge_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."enrolled_students" TO "anon";
GRANT ALL ON TABLE "public"."enrolled_students" TO "authenticated";
GRANT ALL ON TABLE "public"."enrolled_students" TO "service_role";



GRANT ALL ON TABLE "public"."event_attendance" TO "anon";
GRANT ALL ON TABLE "public"."event_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."event_attendance" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_attendance_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_attendance_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_attendance_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."event_feedback" TO "anon";
GRANT ALL ON TABLE "public"."event_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."event_feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_feedback_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."event_registrations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."event_registrations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."event_registrations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."forms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."forms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."forms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."general_feedback" TO "anon";
GRANT ALL ON TABLE "public"."general_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."general_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."nat_requirements" TO "anon";
GRANT ALL ON TABLE "public"."nat_requirements" TO "authenticated";
GRANT ALL ON TABLE "public"."nat_requirements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."nat_requirements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."nat_requirements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."nat_requirements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."office_visit_reasons" TO "anon";
GRANT ALL ON TABLE "public"."office_visit_reasons" TO "authenticated";
GRANT ALL ON TABLE "public"."office_visit_reasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."office_visit_reasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."office_visit_reasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."office_visit_reasons_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."office_visits" TO "anon";
GRANT ALL ON TABLE "public"."office_visits" TO "authenticated";
GRANT ALL ON TABLE "public"."office_visits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."office_visits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."office_visits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."office_visits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."questions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."scholarship_applications" TO "anon";
GRANT ALL ON TABLE "public"."scholarship_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."scholarship_applications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scholarship_applications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scholarship_applications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scholarship_applications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."scholarships" TO "anon";
GRANT ALL ON TABLE "public"."scholarships" TO "authenticated";
GRANT ALL ON TABLE "public"."scholarships" TO "service_role";



GRANT ALL ON SEQUENCE "public"."scholarships_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."scholarships_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."scholarships_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."security_change_otps" TO "anon";
GRANT ALL ON TABLE "public"."security_change_otps" TO "authenticated";
GRANT ALL ON TABLE "public"."security_change_otps" TO "service_role";



GRANT ALL ON TABLE "public"."staff_accounts" TO "anon";
GRANT ALL ON TABLE "public"."staff_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_accounts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."staff_accounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."staff_accounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."staff_accounts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."student_activation_settings" TO "anon";
GRANT ALL ON TABLE "public"."student_activation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."student_activation_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."students_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."students_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."students_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."support_requests" TO "anon";
GRANT ALL ON TABLE "public"."support_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."support_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."support_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."support_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."support_requests_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































