-- Two intake paths enforced two different rules: the authenticated portal
-- treated free-text questions as optional while the ID-only portal (and
-- public_submit_assessment) demanded every question be answered. The rule now
-- lives on the question itself -- is_required -- and every client plus the RPC
-- reads the same flag.
--
-- Backfill: scale questions stay required (both intake paths already demanded
-- them). Free-text questions become optional because the builder seeds them as
-- "Others, please specify:", an answer no student should be forced to give.
-- Staff can flip either per question from the builder.

alter table public.needs_assessment_questions
    add column if not exists is_required boolean not null default true;

comment on column public.needs_assessment_questions.is_required is
    'When true the student must answer this question before the assessment can be submitted. Enforced by both intake clients and public_submit_assessment.';

-- Idempotent: only rows still carrying the old default flip, so a re-run never
-- overwrites a choice staff made in the builder.
update public.needs_assessment_questions
   set is_required = false
 where question_type in ('text', 'open_ended')
   and is_required;

-- Needs-assessment answers were the only free text in the schema with no
-- ceiling; 1500 matches event_evaluation_answers and counseling_evaluation_answers.
-- NOT VALID: legacy rows may already exceed it, but every new write is checked.
alter table public.needs_assessment_answers
    drop constraint if exists needs_assessment_answers_text_len;

alter table public.needs_assessment_answers
    add constraint needs_assessment_answers_text_len
    check (answer_text is null or char_length(answer_text) <= 1500) not valid;

-- ---------------------------------------------------------------------------
-- public_get_assessment_form_questions: expose is_required so the portal can
-- mark optional questions and gate submit the same way the app does.
-- RETURNS TABLE changes shape, so the function is dropped and rebuilt --
-- CREATE OR REPLACE cannot change a return type -- which also drops its grants.
-- ---------------------------------------------------------------------------

drop function if exists public.public_get_assessment_form_questions(bigint);

create function public.public_get_assessment_form_questions(p_form_id bigint)
returns table (
    id bigint,
    question_text text,
    question_type text,
    scale_min integer,
    scale_max integer,
    order_index integer,
    is_required boolean
)
language sql
stable
security definer
set search_path TO 'public'
as $$
    select
        q.id,
        q.question_text,
        q.question_type,
        q.scale_min,
        q.scale_max,
        q.order_index,
        q.is_required
    from public.needs_assessment_questions q
    join public.needs_assessment_forms f on f.id = q.form_id
    where q.form_id = p_form_id
      and f.is_active = true
    order by q.order_index;
$$;


-- ---------------------------------------------------------------------------
-- public_submit_assessment: same contract as before -- identity resolution,
-- throttling, one submission per student per form, per-form question checks --
-- except only is_required questions must be answered. Optional questions can
-- be omitted or sent; anything sent that does not belong to the form is still
-- dropped.
-- ---------------------------------------------------------------------------

create or replace function public.public_submit_assessment(
    p_student_id text,
    p_form_id bigint,
    p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path TO 'public'
as $$
DECLARE
    v_student public.students;
    v_form public.needs_assessment_forms;
    v_submission_id bigint;
    v_answer jsonb;
    v_expected integer;
    v_answered integer;
BEGIN
    v_student := public.public_resolve_student(p_student_id);
    IF v_student.student_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Student ID was not found.');
    END IF;

    IF NOT public.public_throttle_take(v_student.student_id, 'assessment', 5, interval '5 minutes') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Too many attempts. Please wait a few minutes and try again.');
    END IF;

    SELECT * INTO v_form
    FROM public.needs_assessment_forms
    WHERE id = p_form_id AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'This form is not available right now.');
    END IF;

    -- Enforce one submission per student per form.
    IF EXISTS (
        SELECT 1 FROM public.needs_assessment_submissions
        WHERE form_id = v_form.id AND student_id = v_student.student_id
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'You have already completed this assessment.');
    END IF;

    -- Only the required questions are counted towards v_expected.
    SELECT count(*) INTO v_expected
    FROM public.needs_assessment_questions
    WHERE form_id = v_form.id
      AND is_required = true;

    SELECT count(DISTINCT (a->>'question_id')::bigint) INTO v_answered
    FROM jsonb_array_elements(p_answers) a
    WHERE (a->>'question_id') ~ '^[0-9]+$'
      AND (
          nullif(a->>'answer_value', '') IS NOT NULL
          OR nullif(trim(coalesce(a->>'answer_text', '')), '') IS NOT NULL
      )
      AND EXISTS (
          SELECT 1 FROM public.needs_assessment_questions q
          WHERE q.form_id = v_form.id
            AND q.id = (a->>'question_id')::bigint
            AND q.is_required = true
      );

    IF v_answered < v_expected THEN
        RETURN jsonb_build_object('success', false, 'error', 'Answer every required question before submitting.');
    END IF;

    INSERT INTO public.needs_assessment_submissions (form_id, student_id, submitted_at)
    VALUES (v_form.id, v_student.student_id, now())
    RETURNING id INTO v_submission_id;

    FOR v_answer IN SELECT jsonb_array_elements(p_answers)
    LOOP
        IF (v_answer->>'question_id') !~ '^[0-9]+$' THEN
            CONTINUE;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM public.needs_assessment_questions q
            WHERE q.form_id = v_form.id AND q.id = (v_answer->>'question_id')::bigint
        ) THEN
            CONTINUE;
        END IF;

        INSERT INTO public.needs_assessment_answers (
            submission_id, question_id, answer_value, answer_text
        ) VALUES (
            v_submission_id,
            (v_answer->>'question_id')::bigint,
            CASE WHEN (v_answer->>'answer_value') ~ '^-?[0-9]+$'
                THEN (v_answer->>'answer_value')::integer END,
            left(nullif(trim(coalesce(v_answer->>'answer_text', '')), ''), 1500)
        );
    END LOOP;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Grants. The rebuilt read function starts from the default PUBLIC grant, so
-- both functions are revoked and re-granted exactly as before.
revoke all on function public.public_get_assessment_form_questions(bigint) from public;
revoke all on function public.public_submit_assessment(text, bigint, jsonb) from public;

grant execute on function public.public_get_assessment_form_questions(bigint) to anon, authenticated;
grant execute on function public.public_submit_assessment(text, bigint, jsonb) to anon, authenticated;
