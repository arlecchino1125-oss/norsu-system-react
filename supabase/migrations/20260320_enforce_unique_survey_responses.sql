begin;

do $$
declare
    duplicate_submission_pairs integer;
    duplicate_answer_pairs integer;
begin
    select count(*)
    into duplicate_submission_pairs
    from (
        select form_id, student_id
        from public.submissions
        where form_id is not null
          and student_id is not null
        group by form_id, student_id
        having count(*) > 1
    ) dup_submissions;

    if duplicate_submission_pairs > 0 then
        raise exception 'Cannot enforce unique survey submissions: found duplicate submissions for % form/student pair(s). Clean the duplicates first.', duplicate_submission_pairs;
    end if;

    select count(*)
    into duplicate_answer_pairs
    from (
        select submission_id, question_id
        from public.answers
        where submission_id is not null
          and question_id is not null
        group by submission_id, question_id
        having count(*) > 1
    ) dup_answers;

    if duplicate_answer_pairs > 0 then
        raise exception 'Cannot enforce unique survey answers: found duplicate answers for % submission/question pair(s). Clean the duplicates first.', duplicate_answer_pairs;
    end if;
end
$$;

create unique index if not exists submissions_one_per_student_form
on public.submissions (form_id, student_id)
where form_id is not null
  and student_id is not null;

create unique index if not exists answers_one_per_submission_question
on public.answers (submission_id, question_id)
where submission_id is not null
  and question_id is not null;

commit;
