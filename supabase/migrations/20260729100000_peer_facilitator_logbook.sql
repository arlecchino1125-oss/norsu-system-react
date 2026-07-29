-- Peer support logbook: the digital form of the paper PEER FACILITATOR
-- MONITORING LOGBOOK (Peer Support), one sheet per facilitator per month.
--
-- Two tables because status, submission and review belong to the month, not to a
-- single interaction. The first entry of a month upserts its logbook, so there is
-- no create-logbook action to build, and none to forget.
--
-- The "Referred to Guidance (Yes/No)" column is exactly that -- a boolean. It
-- records what the paper form records. Wiring it into counseling_requests is a
-- later feature; this column is its hook.

CREATE TABLE public.peer_facilitator_logbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id character varying NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    month date NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    submitted_at timestamp with time zone,
    reviewed_by uuid,
    reviewer_name text,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT peer_facilitator_logbooks_status_check CHECK (status IN ('draft', 'submitted', 'approved')),
    CONSTRAINT peer_facilitator_logbooks_month_first CHECK (EXTRACT(DAY FROM month) = 1),
    CONSTRAINT peer_facilitator_logbooks_reviewer_name_len CHECK (reviewer_name IS NULL OR char_length(reviewer_name) <= 200)
);

CREATE UNIQUE INDEX peer_facilitator_logbooks_student_month
    ON public.peer_facilitator_logbooks (student_id, month);

-- Staff list submitted months across all peers; the roster chip reads this too.
CREATE INDEX peer_facilitator_logbooks_status_idx
    ON public.peer_facilitator_logbooks (status, month DESC);

-- Target for the entries' composite FK below. A plain unique(id) is implied by
-- the PK, but the FK needs (id, month) as a unit to carry month into the child.
ALTER TABLE public.peer_facilitator_logbooks
    ADD CONSTRAINT peer_facilitator_logbooks_id_month_key UNIQUE (id, month);

CREATE TABLE public.peer_facilitator_log_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_id uuid NOT NULL,
    logbook_month date NOT NULL,
    entry_date date NOT NULL,
    logged_at timestamp with time zone NOT NULL DEFAULT now(),
    activity_type text NOT NULL,
    assisted_student_id character varying REFERENCES public.students(student_id) ON DELETE SET NULL,
    assisted_initials text,
    concern text NOT NULL,
    action_taken text NOT NULL,
    remarks text,
    referred boolean NOT NULL DEFAULT false,
    -- Carrying the parent's month down lets a plain CHECK enforce "this entry
    -- belongs to this month" -- a CHECK cannot reach another table, and the
    -- composite FK is what guarantees logbook_month is not simply made up.
    FOREIGN KEY (logbook_id, logbook_month)
        REFERENCES public.peer_facilitator_logbooks (id, month) ON DELETE CASCADE,
    CONSTRAINT peer_facilitator_log_entries_date_in_month
        CHECK (entry_date >= logbook_month AND entry_date < (logbook_month + INTERVAL '1 month')),
    CONSTRAINT peer_facilitator_log_entries_activity_len CHECK (char_length(activity_type) BETWEEN 1 AND 120),
    CONSTRAINT peer_facilitator_log_entries_initials_len CHECK (assisted_initials IS NULL OR char_length(assisted_initials) <= 20),
    CONSTRAINT peer_facilitator_log_entries_concern_len CHECK (char_length(concern) BETWEEN 1 AND 4000),
    CONSTRAINT peer_facilitator_log_entries_action_len CHECK (char_length(action_taken) BETWEEN 1 AND 4000),
    CONSTRAINT peer_facilitator_log_entries_remarks_len CHECK (remarks IS NULL OR char_length(remarks) <= 4000)
);

CREATE INDEX peer_facilitator_log_entries_logbook_idx
    ON public.peer_facilitator_log_entries (logbook_id, entry_date DESC);

-- Powers the "5 most recently logged students" default in the entry form.
CREATE INDEX peer_facilitator_log_entries_assisted_idx
    ON public.peer_facilitator_log_entries (assisted_student_id)
    WHERE assisted_student_id IS NOT NULL;

-- A student controls the request body, so submitted_at sent from the client is
-- whatever they type. Stamp it server-side on the draft -> submitted move, the
-- same pattern as stamp_peer_facilitator_attendance_times.
CREATE OR REPLACE FUNCTION public.stamp_peer_facilitator_logbook_submission() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = 'public'
    AS $$
BEGIN
    IF public.current_student_id() IS NULL THEN
        RETURN NEW;  -- staff review stamps its own values
    END IF;

    IF NEW.status = 'submitted' AND OLD.status IS DISTINCT FROM 'submitted' THEN
        NEW.submitted_at := now();
    ELSE
        NEW.submitted_at := OLD.submitted_at;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_peer_facilitator_logbook_submission() FROM anon;

CREATE TRIGGER peer_facilitator_logbooks_stamp_submission
    BEFORE UPDATE ON public.peer_facilitator_logbooks
    FOR EACH ROW
    EXECUTE FUNCTION public.stamp_peer_facilitator_logbook_submission();

ALTER TABLE public.peer_facilitator_logbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_facilitator_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "peer_facilitator_logbooks_student_select_own"
    ON public.peer_facilitator_logbooks
    FOR SELECT
    TO authenticated
    USING (student_id = public.current_student_id());

-- Only a live roster member starts a month, and only ever as a draft.
CREATE POLICY "peer_facilitator_logbooks_student_insert_own"
    ON public.peer_facilitator_logbooks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = public.current_student_id()
        AND status = 'draft'
        AND EXISTS (
            SELECT 1
            FROM public.peer_facilitators f
            WHERE f.student_id = peer_facilitator_logbooks.student_id
              AND f.archived_at IS NULL
        )
    );

-- USING pins the source row to draft, WITH CHECK pins the outcome to submitted:
-- a student can neither reopen an approved month nor approve their own. The
-- reviewer columns are pinned null so the same update cannot forge a review.
CREATE POLICY "peer_facilitator_logbooks_student_submit_own"
    ON public.peer_facilitator_logbooks
    FOR UPDATE
    TO authenticated
    USING (student_id = public.current_student_id() AND status = 'draft')
    WITH CHECK (
        student_id = public.current_student_id()
        AND status = 'submitted'
        AND reviewed_by IS NULL
        AND reviewer_name IS NULL
        AND reviewed_at IS NULL
    );

CREATE POLICY "peer_facilitator_logbooks_staff_select"
    ON public.peer_facilitator_logbooks
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitator_logbooks_staff_review"
    ON public.peer_facilitator_logbooks
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitator_log_entries_student_select_own"
    ON public.peer_facilitator_log_entries
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
    ));

-- The draft condition lives in the policy, so a submitted month is immutable
-- with no extra trigger and no client-side honour system.
CREATE POLICY "peer_facilitator_log_entries_student_insert_own"
    ON public.peer_facilitator_log_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_student_update_own"
    ON public.peer_facilitator_log_entries
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_student_delete_own"
    ON public.peer_facilitator_log_entries
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.peer_facilitator_logbooks b
        WHERE b.id = peer_facilitator_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

CREATE POLICY "peer_facilitator_log_entries_staff_select"
    ON public.peer_facilitator_log_entries
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

GRANT SELECT, INSERT, UPDATE ON public.peer_facilitator_logbooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_facilitator_log_entries TO authenticated;
GRANT ALL ON public.peer_facilitator_logbooks TO service_role;
GRANT ALL ON public.peer_facilitator_log_entries TO service_role;
