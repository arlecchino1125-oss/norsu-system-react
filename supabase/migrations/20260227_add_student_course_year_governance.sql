-- Add controlled course/year governance for student profile updates.

ALTER TABLE IF EXISTS public.students
ADD COLUMN IF NOT EXISTS course_year_update_required boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS course_year_window_start timestamptz,
ADD COLUMN IF NOT EXISTS course_year_window_end timestamptz,
ADD COLUMN IF NOT EXISTS course_year_confirmed_at timestamptz;

ALTER TABLE IF EXISTS public.enrolled_students
ADD COLUMN IF NOT EXISTS year_level text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'students_course_year_window_chk'
    ) THEN
        ALTER TABLE public.students
        ADD CONSTRAINT students_course_year_window_chk
        CHECK (
            (NOT course_year_update_required)
            OR (
                course_year_window_start IS NOT NULL
                AND course_year_window_end IS NOT NULL
                AND course_year_window_end > course_year_window_start
            )
        );
    END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.validate_students_course_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    allowed_years text[] := ARRAY['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
    course_exists boolean := false;
BEGIN
    IF NEW.year_level IS NOT NULL
        AND btrim(NEW.year_level) <> ''
        AND NOT (NEW.year_level = ANY (allowed_years)) THEN
        RAISE EXCEPTION 'Invalid year level: %', NEW.year_level
            USING ERRCODE = '22023';
    END IF;

    IF NEW.course IS NOT NULL
        AND btrim(NEW.course) <> '' THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.courses c
            WHERE lower(btrim(c.name)) = lower(btrim(NEW.course))
        )
        INTO course_exists;

        IF NOT course_exists THEN
            RAISE EXCEPTION 'Invalid course: %', NEW.course
                USING ERRCODE = '22023';
        END IF;
    END IF;

    IF NEW.course IS NULL AND NEW.year_level IS NOT NULL THEN
        RAISE EXCEPTION 'Year level requires a course value.'
            USING ERRCODE = '22023';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_students_course_year ON public.students;

CREATE TRIGGER trg_validate_students_course_year
BEFORE INSERT OR UPDATE ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.validate_students_course_year();

CREATE INDEX IF NOT EXISTS idx_students_course_year_update_required
ON public.students (course_year_update_required, course_year_window_end);

CREATE INDEX IF NOT EXISTS idx_enrolled_students_student_year
ON public.enrolled_students (student_id, year_level);

SELECT 'Student course/year governance fields added.' AS result;
