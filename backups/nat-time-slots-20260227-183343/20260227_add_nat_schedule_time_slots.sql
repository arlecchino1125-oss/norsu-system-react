-- Add support for per-time-slot NAT scheduling while keeping day-level slots.

ALTER TABLE IF EXISTS public.admission_schedules
ADD COLUMN IF NOT EXISTS time_windows jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS public.applications
ADD COLUMN IF NOT EXISTS test_time text;

CREATE INDEX IF NOT EXISTS idx_applications_test_date_time
ON public.applications (test_date, test_time);

SELECT 'NAT schedule time-slot support added.' AS result;
