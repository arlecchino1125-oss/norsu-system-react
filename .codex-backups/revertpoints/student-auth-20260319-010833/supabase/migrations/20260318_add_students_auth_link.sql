ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS auth_user_id uuid;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'students_auth_user_id_key'
    ) THEN
        ALTER TABLE public.students
        ADD CONSTRAINT students_auth_user_id_key UNIQUE (auth_user_id);
    END IF;
END $$;
