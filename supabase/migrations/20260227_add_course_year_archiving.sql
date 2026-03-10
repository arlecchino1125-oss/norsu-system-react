-- Archive and reset course/year values when a school-year window expires.

ALTER TABLE IF EXISTS public.students
ADD COLUMN IF NOT EXISTS course_year_archive jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.compute_school_year_label(
    start_ts timestamptz,
    end_ts timestamptz
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN start_ts IS NULL AND end_ts IS NULL THEN 'SY Unknown'
        WHEN start_ts IS NULL THEN
            'SY ' || (EXTRACT(YEAR FROM end_ts)::int - 1)::text || '-' || (EXTRACT(YEAR FROM end_ts)::int)::text
        WHEN end_ts IS NULL THEN
            'SY ' || (EXTRACT(YEAR FROM start_ts)::int)::text || '-' || (EXTRACT(YEAR FROM start_ts)::int + 1)::text
        ELSE
            'SY '
            || LEAST(EXTRACT(YEAR FROM start_ts)::int, EXTRACT(YEAR FROM end_ts)::int)::text
            || '-'
            || GREATEST(EXTRACT(YEAR FROM start_ts)::int, EXTRACT(YEAR FROM end_ts)::int)::text
    END;
$$;

CREATE OR REPLACE FUNCTION public.archive_and_reset_expired_course_year(
    p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    affected_count integer := 0;
BEGIN
    WITH targets AS (
        SELECT
            s.id,
            COALESCE(s.course_year_archive, '[]'::jsonb)
                || jsonb_build_array(
                    jsonb_strip_nulls(
                        jsonb_build_object(
                            'school_year', public.compute_school_year_label(s.course_year_window_start, s.course_year_window_end),
                            'window_start', s.course_year_window_start,
                            'window_end', s.course_year_window_end,
                            'course', s.course,
                            'year_level', s.year_level,
                            'confirmed_at', s.course_year_confirmed_at,
                            'archived_at', p_now
                        )
                    )
                ) AS next_archive
        FROM public.students s
        WHERE s.course_year_window_end IS NOT NULL
          AND s.course_year_window_end <= p_now
          AND (
              s.course IS NOT NULL
              OR s.year_level IS NOT NULL
              OR s.course_year_update_required
              OR s.course_year_window_start IS NOT NULL
          )
    )
    UPDATE public.students s
    SET
        course_year_archive = t.next_archive,
        course = NULL,
        year_level = NULL,
        status = 'Inactive',
        course_year_confirmed_at = NULL,
        course_year_update_required = false,
        course_year_window_start = NULL,
        course_year_window_end = NULL
    FROM targets t
    WHERE s.id = t.id;

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_students_course_year_window_end
ON public.students (course_year_window_end);

CREATE INDEX IF NOT EXISTS idx_students_course_year_archive_gin
ON public.students USING gin (course_year_archive);

SELECT 'Course/year archiving and expired-window reset support added.' AS result;
