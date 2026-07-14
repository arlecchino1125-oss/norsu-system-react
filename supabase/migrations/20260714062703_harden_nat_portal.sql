-- Keep NAT intake public through the submit-nat-application Edge Function,
-- while removing direct anonymous database writes and limiting public reads.

drop policy if exists applications_anon_submit on public.applications;
revoke all on table public.applications from anon;

drop policy if exists courses_public_read on public.courses;
drop policy if exists courses_anon_read_open on public.courses;
drop policy if exists courses_authenticated_read on public.courses;

create policy courses_anon_read_open
    on public.courses
    for select
    to anon
    using (status = 'Open');

create policy courses_authenticated_read
    on public.courses
    for select
    to authenticated
    using (true);

revoke all on table public.courses from anon;
grant select (id, name, application_limit, status)
    on table public.courses
    to anon;
revoke all on sequence public.courses_id_seq from anon;

drop policy if exists admission_schedules_public_read on public.admission_schedules;
drop policy if exists admission_schedules_anon_read_active on public.admission_schedules;
drop policy if exists admission_schedules_authenticated_read on public.admission_schedules;

create policy admission_schedules_anon_read_active
    on public.admission_schedules
    for select
    to anon
    using (is_active is true);

create policy admission_schedules_authenticated_read
    on public.admission_schedules
    for select
    to authenticated
    using (true);

revoke all on table public.admission_schedules from anon;
grant select (id, date, venue, slots, is_active, time_windows)
    on table public.admission_schedules
    to anon;
revoke all on sequence public.admission_schedules_id_seq from anon;

drop policy if exists departments_public_read on public.departments;
drop policy if exists departments_authenticated_read on public.departments;

create policy departments_authenticated_read
    on public.departments
    for select
    to authenticated
    using (true);

revoke all on table public.departments from anon;
revoke all on sequence public.departments_id_seq from anon;

revoke all on table public.role_permissions from anon;
grant select on table public.role_permissions to anon;

drop policy if exists role_permissions_role_read on public.role_permissions;
drop policy if exists role_permissions_anon_read_public on public.role_permissions;
drop policy if exists role_permissions_authenticated_read on public.role_permissions;

create policy role_permissions_anon_read_public
    on public.role_permissions
    for select
    to anon
    using (role = 'Public');

create policy role_permissions_authenticated_read
    on public.role_permissions
    for select
    to authenticated
    using (
        role = 'Public'
        or (select public.current_staff_role()) is not null
        or ((select auth.uid()) is not null and role = 'Student')
    );

-- These SECURITY DEFINER functions are called only by service-role Edge
-- Functions. Authenticated browser clients do not need direct EXECUTE access.
revoke execute on function public.consume_edge_rate_limit(text, text, integer, integer)
    from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, text, integer, integer)
    to service_role;

revoke execute on function public.finalize_application(uuid, text, bigint, text, text)
    from public, anon, authenticated;
grant execute on function public.finalize_application(uuid, text, bigint, text, text)
    to service_role;

-- Complete the database portion of NAT activation in one transaction. Auth is
-- created by the Edge Function first because Supabase Auth is outside Postgres.
create or replace function public.complete_nat_student_activation(
    p_application_id uuid,
    p_student_id text,
    p_auth_user_id uuid,
    p_course text
)
returns public.application_archives
language plpgsql
security invoker
set search_path to ''
as $$
declare
    v_application public.applications%rowtype;
    v_archive public.application_archives%rowtype;
    v_enrollment public.enrolled_students%rowtype;
    v_student_row_id bigint;
    v_student_id text := nullif(btrim(coalesce(p_student_id, '')), '');
    v_course text := nullif(btrim(coalesce(p_course, '')), '');
    v_department text;
    v_require_enrollment_key boolean := true;
begin
    if p_application_id is null
       or v_student_id is null
       or p_auth_user_id is null
       or v_course is null then
        raise exception using
            errcode = '22023',
            message = 'Missing required NAT activation details.';
    end if;

    select a.*
      into v_application
      from public.applications as a
     where a.id = p_application_id
     for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Application not found or already finalized.';
    end if;

    if v_application.status is distinct from 'Approved for Enrollment' then
        raise exception using
            errcode = '42501',
            message = 'Student account activation is not available yet.';
    end if;

    select coalesce(d.name, 'Unassigned')
      into v_department
      from public.courses as c
      left join public.departments as d on d.id = c.department_id
     where c.name = v_course;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'The selected course is unavailable.';
    end if;

    select s.require_enrollment_key
      into v_require_enrollment_key
      from public.student_activation_settings as s
     where s.id = 1;

    if not found then
        v_require_enrollment_key := true;
    end if;

    if v_require_enrollment_key then
        select e.*
          into v_enrollment
          from public.enrolled_students as e
         where e.student_id = v_student_id
         for update;

        if not found then
            raise exception using
                errcode = 'P0002',
                message = 'Student ID not found in the enrollment list.';
        end if;

        if nullif(btrim(coalesce(v_enrollment.course, '')), '') is not null
           and lower(btrim(v_enrollment.course)) <> lower(v_course) then
            raise exception using
                errcode = '22023',
                message = format('Course mismatch. This ID is enrolled in %s.', v_enrollment.course);
        end if;

        if coalesce(v_enrollment.is_used, false)
           and lower(btrim(coalesce(v_enrollment.assigned_to_email, '')))
               <> lower(btrim(v_application.email)) then
            raise exception using
                errcode = '23505',
                message = 'This Student ID has already been activated by another user.';
        end if;
    else
        -- The students foreign key and staff ID-swap flow require a parent row.
        -- This is structural only: no key fields are checked, assigned, or used.
        insert into public.enrolled_students (student_id)
        values (v_student_id)
        on conflict (student_id) do nothing;
    end if;

    insert into public.students (
        student_id,
        auth_user_id,
        first_name,
        last_name,
        middle_name,
        suffix,
        dob,
        age,
        place_of_birth,
        sex,
        gender_identity,
        civil_status,
        nationality,
        email,
        mobile,
        facebook_url,
        street,
        city,
        province,
        zip_code,
        course,
        year_level,
        status,
        department,
        priority_course,
        alt_course_1,
        alt_course_2
    )
    values (
        v_student_id,
        p_auth_user_id,
        v_application.first_name,
        v_application.last_name,
        v_application.middle_name,
        v_application.suffix,
        v_application.dob,
        v_application.age,
        v_application.place_of_birth,
        v_application.sex,
        v_application.gender_identity,
        v_application.civil_status,
        v_application.nationality,
        lower(btrim(v_application.email)),
        v_application.mobile,
        v_application.facebook_url,
        v_application.street,
        v_application.city,
        v_application.province,
        v_application.zip_code,
        v_course,
        '1st Year',
        'Active',
        v_department,
        v_application.priority_course,
        v_application.alt_course_1,
        v_application.alt_course_2
    )
    on conflict (student_id) do update
       set auth_user_id = excluded.auth_user_id,
           first_name = excluded.first_name,
           last_name = excluded.last_name,
           middle_name = excluded.middle_name,
           suffix = excluded.suffix,
           dob = excluded.dob,
           age = excluded.age,
           place_of_birth = excluded.place_of_birth,
           sex = excluded.sex,
           gender_identity = excluded.gender_identity,
           civil_status = excluded.civil_status,
           nationality = excluded.nationality,
           email = excluded.email,
           mobile = excluded.mobile,
           facebook_url = excluded.facebook_url,
           street = excluded.street,
           city = excluded.city,
           province = excluded.province,
           zip_code = excluded.zip_code,
           course = excluded.course,
           year_level = excluded.year_level,
           status = excluded.status,
           department = excluded.department,
           priority_course = excluded.priority_course,
           alt_course_1 = excluded.alt_course_1,
           alt_course_2 = excluded.alt_course_2
     where public.students.auth_user_id is null
        or public.students.auth_user_id = excluded.auth_user_id
    returning id into v_student_row_id;

    if v_student_row_id is null then
        raise exception using
            errcode = '23505',
            message = 'This student record is already linked to a different auth account.';
    end if;

    if v_require_enrollment_key then
        update public.enrolled_students
           set is_used = true,
               status = 'Activated',
               assigned_to_email = lower(btrim(v_application.email))
         where student_id = v_student_id;
    end if;

    v_archive := public.finalize_application(
        p_application_id,
        'enrolled',
        null,
        v_student_id,
        v_course
    );

    return v_archive;
end;
$$;

revoke execute on function public.complete_nat_student_activation(uuid, text, uuid, text)
    from public, anon, authenticated;
grant execute on function public.complete_nat_student_activation(uuid, text, uuid, text)
    to service_role;

-- Keep Pass eligibility true even when a stale or direct client bypasses the
-- disabled Care Staff button.
create or replace function public.enforce_nat_pass_attendance()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $$
begin
    if new.status = 'Qualified for Interview (1st Choice)'
       and (new.time_in is null or new.time_out is null) then
        if tg_op = 'INSERT' then
            raise exception using
                errcode = '23514',
                message = 'Time In and Time Out are required before passing.';
        elsif old.status is distinct from new.status then
            raise exception using
                errcode = '23514',
                message = 'Time In and Time Out are required before passing.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists enforce_nat_pass_attendance
    on public.applications;

create trigger enforce_nat_pass_attendance
    before insert or update on public.applications
    for each row
    execute function public.enforce_nat_pass_attendance();

revoke execute on function public.enforce_nat_pass_attendance()
    from public, anon, authenticated;
grant execute on function public.enforce_nat_pass_attendance()
    to service_role;

-- Serialize submissions on the selected course and schedule rows so capacity
-- checks and the following INSERT are one atomic transaction.
create or replace function public.enforce_nat_application_submission_constraints()
returns trigger
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
    v_course_status text;
    v_course_limit integer;
    v_schedule_active boolean;
    v_schedule_slots integer;
    v_time_windows jsonb;
    v_time_window jsonb;
    v_time_slot_limit integer;
    v_application_count bigint;
begin
    if nullif(btrim(coalesce(new.first_name, '')), '') is null
       or nullif(btrim(coalesce(new.last_name, '')), '') is null
       or new.dob is null
       or new.age is null
       or new.age <= 0
       or nullif(btrim(coalesce(new.place_of_birth, '')), '') is null
       or nullif(btrim(coalesce(new.nationality, '')), '') is null
       or nullif(btrim(coalesce(new.sex, '')), '') is null
       or nullif(btrim(coalesce(new.civil_status, '')), '') is null
       or nullif(btrim(coalesce(new.reason, '')), '') is null
       or nullif(btrim(coalesce(new.street, '')), '') is null
       or nullif(btrim(coalesce(new.city, '')), '') is null
       or nullif(btrim(coalesce(new.province, '')), '') is null
       or nullif(btrim(coalesce(new.zip_code, '')), '') is null then
        raise exception using
            errcode = '23502',
            message = 'Complete all required NAT application fields.';
    end if;

    if nullif(btrim(coalesce(new.alt_course_1, '')), '') is null then
        raise exception using
            errcode = '23502',
            message = 'Second course choice is required.';
    end if;

    if nullif(btrim(coalesce(new.alt_course_2, '')), '') is null then
        raise exception using
            errcode = '23502',
            message = 'Third course choice is required.';
    end if;

    if lower(btrim(new.priority_course)) = lower(btrim(new.alt_course_1))
       or lower(btrim(new.priority_course)) = lower(btrim(new.alt_course_2))
       or lower(btrim(new.alt_course_1)) = lower(btrim(new.alt_course_2)) then
        raise exception using
            errcode = '23514',
            message = 'Choose three different courses.';
    end if;

    if length(regexp_replace(coalesce(new.mobile, ''), '[^0-9]', '', 'g')) not between 10 and 13 then
        raise exception using
            errcode = '23514',
            message = 'Mobile number must contain 10 to 13 digits.';
    end if;

    if coalesce(new.email, '') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
        raise exception using
            errcode = '23514',
            message = 'A valid email address is required.';
    end if;

    -- Lock every selected course in a deterministic order. This keeps course
    -- status validation atomic and avoids opposite-choice deadlocks.
    perform 1
      from public.courses as c
     where c.name = any (
         array[new.priority_course, new.alt_course_1, new.alt_course_2]::text[]
     )
     order by c.name
     for update;

    select c.status, c.application_limit
      into v_course_status, v_course_limit
      from public.courses as c
     where c.name = new.priority_course;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'The selected primary course is unavailable.';
    end if;

    if v_course_status is distinct from 'Open' then
        raise exception using
            errcode = 'P0001',
            message = 'The selected primary course is closed.';
    end if;

    select count(*)
      into v_application_count
      from public.applications as a
     where a.priority_course = new.priority_course;

    if v_application_count >= coalesce(v_course_limit, 200) then
        raise exception using
            errcode = 'P0001',
            message = 'The selected primary course is already full.';
    end if;

    select c.status, c.application_limit
      into v_course_status, v_course_limit
      from public.courses as c
     where c.name = new.alt_course_1;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'The selected second course choice is unavailable.';
    end if;

    if v_course_status is distinct from 'Open' then
        raise exception using
            errcode = 'P0001',
            message = 'The selected second course choice is closed.';
    end if;

    select count(*)
      into v_application_count
      from public.applications as a
     where a.priority_course = new.alt_course_1;

    if v_application_count >= coalesce(v_course_limit, 200) then
        raise exception using
            errcode = 'P0001',
            message = 'The selected second course choice is already full.';
    end if;

    select c.status, c.application_limit
      into v_course_status, v_course_limit
      from public.courses as c
     where c.name = new.alt_course_2;

    if not found then
        raise exception using
            errcode = '23503',
            message = 'The selected third course choice is unavailable.';
    end if;

    if v_course_status is distinct from 'Open' then
        raise exception using
            errcode = 'P0001',
            message = 'The selected third course choice is closed.';
    end if;

    select count(*)
      into v_application_count
      from public.applications as a
     where a.priority_course = new.alt_course_2;

    if v_application_count >= coalesce(v_course_limit, 200) then
        raise exception using
            errcode = 'P0001',
            message = 'The selected third course choice is already full.';
    end if;

    select s.is_active, s.slots, s.time_windows
      into v_schedule_active, v_schedule_slots, v_time_windows
      from public.admission_schedules as s
     where s.date = new.test_date
     for update;

    if not found or v_schedule_active is not true then
        raise exception using
            errcode = 'P0001',
            message = 'The selected admission schedule is unavailable.';
    end if;

    select count(*)
      into v_application_count
      from public.applications as a
     where a.test_date = new.test_date;

    if coalesce(v_schedule_slots, 0) <= 0
       or v_application_count >= v_schedule_slots then
        raise exception using
            errcode = 'P0001',
            message = 'The selected admission schedule is already full.';
    end if;

    if jsonb_typeof(v_time_windows) is distinct from 'array' then
        raise exception using
            errcode = 'P0001',
            message = 'The admission schedule has invalid time windows.';
    elsif jsonb_array_length(v_time_windows) > 0 then
        if nullif(trim(coalesce(new.test_time, '')), '') is null then
            raise exception using
                errcode = 'P0001',
                message = 'Select an available admission test time.';
        end if;

        select slot.value
          into v_time_window
          from jsonb_array_elements(v_time_windows) as slot(value)
         where concat(slot.value ->> 'start', '-', slot.value ->> 'end') = new.test_time
         limit 1;

        if v_time_window is null then
            raise exception using
                errcode = 'P0001',
                message = 'The selected admission test time is unavailable.';
        end if;

        begin
            v_time_slot_limit := (v_time_window ->> 'slots')::integer;
        exception
            when invalid_text_representation or numeric_value_out_of_range then
            v_time_slot_limit := 0;
        end;

        select count(*)
          into v_application_count
          from public.applications as a
         where a.test_date = new.test_date
           and a.test_time = new.test_time;

        if coalesce(v_time_slot_limit, 0) <= 0
           or v_application_count >= v_time_slot_limit then
            raise exception using
                errcode = 'P0001',
                message = 'The selected admission test time is already full.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists enforce_nat_application_submission_constraints
    on public.applications;

create trigger enforce_nat_application_submission_constraints
    before insert on public.applications
    for each row
    execute function public.enforce_nat_application_submission_constraints();

revoke execute on function public.enforce_nat_application_submission_constraints()
    from public, anon, authenticated;
grant execute on function public.enforce_nat_application_submission_constraints()
    to service_role;
