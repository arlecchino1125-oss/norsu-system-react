-- Add scholarship applicant profile snapshot fields for detailed export requirements.

ALTER TABLE IF EXISTS public.scholarship_applications
ADD COLUMN IF NOT EXISTS student_last_name text,
ADD COLUMN IF NOT EXISTS student_given_name text,
ADD COLUMN IF NOT EXISTS student_ext_name text,
ADD COLUMN IF NOT EXISTS student_middle_name text,
ADD COLUMN IF NOT EXISTS sex_code smallint,
ADD COLUMN IF NOT EXISTS birthdate date,
ADD COLUMN IF NOT EXISTS complete_program_name text,
ADD COLUMN IF NOT EXISTS year_level_code smallint,
ADD COLUMN IF NOT EXISTS father_last_name text,
ADD COLUMN IF NOT EXISTS father_given_name text,
ADD COLUMN IF NOT EXISTS father_middle_name text,
ADD COLUMN IF NOT EXISTS mother_last_name text,
ADD COLUMN IF NOT EXISTS mother_given_name text,
ADD COLUMN IF NOT EXISTS mother_middle_name text,
ADD COLUMN IF NOT EXISTS permanent_street_barangay text,
ADD COLUMN IF NOT EXISTS permanent_zip_code text,
ADD COLUMN IF NOT EXISTS disability_info text,
ADD COLUMN IF NOT EXISTS indigenous_people_group text;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scholarship_applications_sex_code_chk'
    ) THEN
        ALTER TABLE public.scholarship_applications
        ADD CONSTRAINT scholarship_applications_sex_code_chk
        CHECK (sex_code IS NULL OR sex_code IN (0, 1));
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'scholarship_applications_year_level_code_chk'
    ) THEN
        ALTER TABLE public.scholarship_applications
        ADD CONSTRAINT scholarship_applications_year_level_code_chk
        CHECK (year_level_code IS NULL OR (year_level_code >= 1 AND year_level_code <= 6));
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_profile_snapshot_names
ON public.scholarship_applications (student_last_name, student_given_name);

SELECT 'Scholarship profile snapshot fields added.' AS result;
