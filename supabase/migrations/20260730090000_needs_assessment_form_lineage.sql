-- Needs assessment forms are re-run rather than re-opened: a unique index
-- (submissions_one_per_student_form) allows one submission per student per form,
-- so asking the same cohort again in November means duplicating the July form
-- into a new row. source_form_id records that lineage so analytics can offer
-- "compare to" across runs of the same assessment instead of across every form.
--
-- Copies always store the ORIGINAL form's id, never their immediate parent, so
-- the whole family is one flat query: id = root OR source_form_id = root.

alter table public.needs_assessment_forms
    add column if not exists source_form_id bigint
        references public.needs_assessment_forms (id) on delete set null;

create index if not exists needs_assessment_forms_source_form_id_idx
    on public.needs_assessment_forms (source_form_id);

comment on column public.needs_assessment_forms.source_form_id is
    'The original form this one was duplicated from (null if it is the original). Always the root of the family, not the immediate parent.';
