-- students.student_id is mutable: students rename it through the profile form
-- (manage-student-accounts mode 'update-profile'). Ten child tables carry
-- ON UPDATE CASCADE so their rows follow the rename. Three were missed.
--
-- Before this migration:
--   peer_facilitator_applications -- rename raises an FK violation
--   peer_facilitator_attendance   -- rename raises an FK violation
--   general_feedback              -- no FK at all, rows silently orphan

-- Postgres cannot alter a foreign key's referential actions in place, so both
-- peer facilitator constraints are dropped and recreated. ON DELETE CASCADE is
-- retained -- this migration changes update behaviour only.
ALTER TABLE public.peer_facilitator_applications
    DROP CONSTRAINT IF EXISTS peer_facilitator_applications_student_id_fkey;

ALTER TABLE public.peer_facilitator_applications
    ADD CONSTRAINT peer_facilitator_applications_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.peer_facilitator_attendance
    DROP CONSTRAINT IF EXISTS peer_facilitator_attendance_student_id_fkey;

ALTER TABLE public.peer_facilitator_attendance
    ADD CONSTRAINT peer_facilitator_attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- general_feedback accepted anonymous submissions until 20260706063500 dropped
-- that policy, so rows may exist whose student_id was never a real student. A
-- plain ADD CONSTRAINT validates every existing row and would fail on those.
--
-- NOT VALID installs the referential triggers immediately -- new inserts are
-- checked and renames still cascade -- and only skips the scan of existing
-- rows. Nothing is deleted, so shipping this needs no data-retention decision.
-- Run VALIDATE CONSTRAINT later, once the unmatched rows have been reviewed.
--
-- No ON DELETE action, matching the ten sibling tables: student deletion is
-- orchestrated by the manage-record-deletions edge function.
ALTER TABLE public.general_feedback
    ADD CONSTRAINT general_feedback_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE
    NOT VALID;

-- Fail loudly rather than silently no-opping. confupdtype 'c' is ON UPDATE CASCADE.
--
-- Counting cascading constraints alone is not enough. The DROPs above name the
-- constraints Postgres generates for an inline REFERENCES; if a name differs,
-- DROP ... IF EXISTS skips silently, the old non-cascading constraint survives
-- alongside the new one, renames still fail, and a count of 3 would pass. So
-- also assert that no non-cascading FK is left behind on these tables.
DO $$
DECLARE
    v_cascading integer;
    v_stale text;
BEGIN
    SELECT
        count(*) FILTER (WHERE c.confupdtype = 'c'),
        string_agg(t.relname || '.' || c.conname, ', ') FILTER (WHERE c.confupdtype <> 'c')
    INTO v_cascading, v_stale
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND c.confrelid = 'public.students'::regclass
      AND t.relname IN (
          'peer_facilitator_applications',
          'peer_facilitator_attendance',
          'general_feedback'
      );

    IF v_stale IS NOT NULL THEN
        RAISE EXCEPTION
            'Non-cascading student FK still present, rename will fail: %.', v_stale;
    END IF;

    IF v_cascading <> 3 THEN
        RAISE EXCEPTION
            'Expected 3 student_id foreign keys with ON UPDATE CASCADE, found %.',
            v_cascading;
    END IF;
END;
$$;
