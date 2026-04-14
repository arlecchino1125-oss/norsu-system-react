update public.students
set sex = gender
where nullif(btrim(coalesce(sex, '')), '') is null
  and nullif(btrim(coalesce(gender, '')), '') is not null;

alter table if exists public.students
drop column if exists gender;
