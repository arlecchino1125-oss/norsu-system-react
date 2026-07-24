-- Peer facilitators: archive instead of hard delete.
--
-- Removing a facilitator was a destructive DELETE. Soft-archive keeps the record
-- (and its link to any approved application) recoverable, and simply drops them
-- from the active roster and from hours access via archived_at.

ALTER TABLE public.peer_facilitators
    ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;

-- Only non-archived roster members may clock in.
DROP POLICY IF EXISTS "peer_facilitator_attendance_student_insert_own" ON public.peer_facilitator_attendance;
CREATE POLICY "peer_facilitator_attendance_student_insert_own"
    ON public.peer_facilitator_attendance
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = public.current_student_id()
        AND EXISTS (
            SELECT 1 FROM public.peer_facilitators f
            WHERE f.student_id = peer_facilitator_attendance.student_id
              AND f.archived_at IS NULL
        )
        AND (SELECT s.time_in_enabled FROM public.peer_facilitator_settings s WHERE s.id = 1)
    );
