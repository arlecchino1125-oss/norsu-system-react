-- The stats function timed out (500) for staff while returning instantly for
-- anon. Cause: SECURITY INVOKER meant every one of the ~50k answer rows in the
-- aggregate re-evaluated the RLS policies, and answers_student_read_own is a
-- correlated subquery (EXISTS over submissions per row), on top of is_admin()
-- and current_staff_role() per row, plus the students table's own policies once
-- the department join was involved.
--
-- Fix: check authorisation ONCE instead of 50k times. That means SECURITY
-- DEFINER, which bypasses RLS -- so the guard below has to carry the weight the
-- policies were carrying, and execute has to be locked down.
--
-- The guard mirrors answers_care_admin_select exactly. It is wrapped in a scalar
-- subquery so Postgres runs it as a one-off InitPlan rather than per row; a
-- non-staff caller matches no rows and receives an empty set, the same outcome
-- RLS gave them. Students are intentionally not served by this function at all --
-- it exists for staff aggregates, and a student reading their own answers still
-- goes through the RLS-protected table.

create or replace function public.needs_assessment_answer_stats(
    p_form_id bigint,
    p_department text default null,
    p_course text default null
)
returns table (
    question_id bigint,
    answer_value integer,
    responses bigint
)
language sql
stable
security definer
-- Pinned so a caller cannot shadow the referenced tables or functions with
-- objects from their own schema. Mandatory for SECURITY DEFINER.
set search_path = public, pg_temp
as $$
    select
        answer.question_id,
        answer.answer_value,
        count(*) as responses
    from public.needs_assessment_answers as answer
    join public.needs_assessment_submissions as submission
        on submission.id = answer.submission_id
    where (select public.is_admin() or public.current_staff_role() = 'Care Staff')
      and submission.form_id = p_form_id
      -- Only scored answers: free-text answers carry a null value and would
      -- otherwise show up as a phantom bucket.
      and answer.answer_value between 1 and 5
      -- The students lookup is skipped entirely when nothing is being filtered,
      -- which is the common case. Joining unconditionally meant dragging every
      -- answer row through the students table for no reason.
      and (
        (p_department is null and p_course is null)
        or exists (
            select 1
            from public.students as student
            where student.student_id = submission.student_id
              and (p_department is null or student.department = p_department)
              and (p_course is null or student.course = p_course)
        )
      )
    group by answer.question_id, answer.answer_value;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default, which under
-- SECURITY INVOKER was harmless (RLS still applied) but under SECURITY DEFINER
-- would let anon read every department's numbers. Revoke first, then grant back
-- only to signed-in users -- the in-function guard still decides what they see.
revoke all on function public.needs_assessment_answer_stats(bigint, text, text) from public;
revoke all on function public.needs_assessment_answer_stats(bigint, text, text) from anon;
grant execute on function public.needs_assessment_answer_stats(bigint, text, text) to authenticated;

comment on function public.needs_assessment_answer_stats is
    'Per-question, per-score response counts for one needs assessment form, optionally narrowed to a department or course. SECURITY DEFINER with a single hoisted staff check, because per-row RLS evaluation over the answers table timed out.';
