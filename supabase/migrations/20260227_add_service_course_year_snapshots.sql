-- Add course/year duration snapshots to CARE service records.

ALTER TABLE IF EXISTS public.counseling_requests
ADD COLUMN IF NOT EXISTS year_window_range text;

ALTER TABLE IF EXISTS public.support_requests
ADD COLUMN IF NOT EXISTS course_year text,
ADD COLUMN IF NOT EXISTS year_window_range text;

ALTER TABLE IF EXISTS public.scholarship_applications
ADD COLUMN IF NOT EXISTS course_year text,
ADD COLUMN IF NOT EXISTS year_window_range text;

CREATE INDEX IF NOT EXISTS idx_counseling_requests_year_window_range
ON public.counseling_requests (year_window_range);

CREATE INDEX IF NOT EXISTS idx_support_requests_course_year
ON public.support_requests (course_year);

CREATE INDEX IF NOT EXISTS idx_scholarship_applications_course_year
ON public.scholarship_applications (course_year);

SELECT 'CARE service course/year snapshot fields added.' AS result;
