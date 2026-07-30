-- The analytics page was downloading every answer row (~40 per submission) just
-- to count them in the browser: 15s to first paint at ~1000 respondents, and it
-- gets worse with every submission. PostgREST aggregate functions are disabled on
-- this project (PGRST123), so the tally moves into a function instead.
--
-- Returns long form -- one row per (question, score) -- so ~40 questions collapse
-- to ~200 rows regardless of how many students answered.
--
-- SECURITY INVOKER (the default) on purpose: the caller's RLS still decides which
-- submissions they may count. This must not become a way to read another
-- department's numbers.

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
as $$
    select
        answer.question_id,
        answer.answer_value,
        count(*) as responses
    from public.needs_assessment_answers as answer
    join public.needs_assessment_submissions as submission
        on submission.id = answer.submission_id
    left join public.students as student
        on student.student_id = submission.student_id
    where submission.form_id = p_form_id
      -- Only scored answers: free-text answers carry a null value and would
      -- otherwise show up as a phantom bucket.
      and answer.answer_value between 1 and 5
      and (p_department is null or student.department = p_department)
      and (p_course is null or student.course = p_course)
    group by answer.question_id, answer.answer_value;
$$;

comment on function public.needs_assessment_answer_stats is
    'Per-question, per-score response counts for one needs assessment form, optionally narrowed to a department or course. Replaces shipping every answer row to the client.';

grant execute on function public.needs_assessment_answer_stats(bigint, text, text) to authenticated;

-- The group-by walks answers via submission; without these it is a seq scan on
-- the largest table in the schema.
create index if not exists needs_assessment_answers_submission_id_idx
    on public.needs_assessment_answers (submission_id);

create index if not exists needs_assessment_submissions_form_id_idx
    on public.needs_assessment_submissions (form_id);
