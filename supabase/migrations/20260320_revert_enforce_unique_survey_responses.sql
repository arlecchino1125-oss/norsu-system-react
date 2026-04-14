begin;

drop index if exists public.submissions_one_per_student_form;
drop index if exists public.answers_one_per_submission_question;

commit;
