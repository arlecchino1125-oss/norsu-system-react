CREATE INDEX IF NOT EXISTS idx_students_student_id_lookup
ON public.students (student_id);

CREATE INDEX IF NOT EXISTS idx_students_auth_user_id_lookup
ON public.students (auth_user_id)
WHERE auth_user_id IS NOT NULL;
