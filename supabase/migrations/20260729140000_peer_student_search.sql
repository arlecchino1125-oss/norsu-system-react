-- Let a peer facilitator name the student they helped, without handing every
-- student the directory.
--
-- students_self_read deliberately limits a student to their own row, and must
-- keep doing so -- the peer support logbook is the one place that needs an
-- exception. This is that exception, kept as narrow as it can be: gated on
-- active roster membership, at most five rows, and only the fields needed to
-- tell two classmates apart. No email, no course, no contact details.
--
-- student_id is returned so an entry can link to a real record, but the UI
-- never renders it. What lands in the logbook is initials, per the paper form's
-- "Optional/Initials only for confidentiality".
--
-- Passing the term as a bound parameter also retires the hand-rolled sanitiser
-- the client needed to keep a PostgREST or() string well-formed.

CREATE OR REPLACE FUNCTION public.search_students_for_peer(p_term text DEFAULT '')
RETURNS TABLE (student_id text, first_name text, last_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_peer text;
    v_term text := trim(coalesce(p_term, ''));
BEGIN
    v_peer := public.current_student_id();
    IF v_peer IS NULL THEN
        RETURN;  -- staff and anon get nothing; they have their own lookups
    END IF;

    -- An archived facilitator loses this the moment they come off the roster,
    -- the same rule that governs logging hours and writing entries.
    IF NOT EXISTS (
        SELECT 1 FROM public.peer_facilitators f
        WHERE f.student_id = v_peer AND f.archived_at IS NULL
    ) THEN
        RETURN;
    END IF;

    -- No search term: the students this peer logged most recently, so a
    -- follow-up is one tap. Never a listing of the whole directory.
    IF length(v_term) < 2 THEN
        RETURN QUERY
        SELECT s.student_id::text, s.first_name::text, s.last_name::text
        FROM public.students s
        WHERE s.student_id IN (
            SELECT e.assisted_student_id
            FROM public.peer_facilitator_log_entries e
            JOIN public.peer_facilitator_logbooks b ON b.id = e.logbook_id
            WHERE b.student_id = v_peer
              AND e.assisted_student_id IS NOT NULL
            ORDER BY e.logged_at DESC
            LIMIT 25
        )
        LIMIT 5;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT s.student_id::text, s.first_name::text, s.last_name::text
    FROM public.students s
    WHERE NOT coalesce(s.is_archived, false)
      AND (
          s.first_name ILIKE '%' || v_term || '%'
          OR s.last_name ILIKE '%' || v_term || '%'
          OR s.student_id ILIKE '%' || v_term || '%'
      )
    ORDER BY s.last_name, s.first_name
    LIMIT 5;
END;
$$;

REVOKE ALL ON FUNCTION public.search_students_for_peer(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.search_students_for_peer(text) TO authenticated;
