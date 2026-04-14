create or replace function public.get_department_applications_page(
    p_department_name text,
    p_statuses text[] default null,
    p_search text default null,
    p_course text default null,
    p_limit integer default 10,
    p_offset integer default 0,
    p_sort_ascending boolean default false
)
returns table (
    id text,
    created_at timestamptz,
    student_id text,
    first_name text,
    last_name text,
    reference_id text,
    email text,
    mobile text,
    priority_course text,
    alt_course_1 text,
    alt_course_2 text,
    current_choice integer,
    status text,
    interview_date text,
    total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
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
        where d.name = p_department_name
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
            a.student_id,
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
$$;

grant execute on function public.get_department_applications_page(
    text,
    text[],
    text,
    text,
    integer,
    integer,
    boolean
) to authenticated, service_role;
