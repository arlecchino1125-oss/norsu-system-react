begin;

create table if not exists public.needs_assessments (
  id bigint generated always as identity not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()),
  student_id text,
  age integer,
  gender text,
  year_level text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()),
  constraint needs_assessments_pkey primary key (id),
  constraint fk_needs_assessments_students foreign key (student_id) references public.students(student_id)
);

commit;
