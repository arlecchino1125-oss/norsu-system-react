-- Migration: CARE Activities Logbook
-- Created: 2026-08-05 03:16:46

CREATE TABLE public.care_activities_logbooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id character varying NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    month date NOT NULL,
    status text NOT NULL DEFAULT 'draft',
    submitted_at timestamp with time zone,
    reviewed_by uuid,
    reviewer_name text,
    reviewed_at timestamp with time zone,
    CONSTRAINT care_activities_logbooks_status_check CHECK (status IN ('draft', 'submitted', 'approved')),
    CONSTRAINT care_activities_logbooks_month_first CHECK (EXTRACT(DAY FROM month) = 1),
    CONSTRAINT care_activities_logbooks_reviewer_name_len CHECK (reviewer_name IS NULL OR char_length(reviewer_name) <= 200)
);

CREATE UNIQUE INDEX care_activities_logbooks_student_month
    ON public.care_activities_logbooks (student_id, month);

-- Target for the entries' composite FK below.
ALTER TABLE public.care_activities_logbooks
    ADD CONSTRAINT care_activities_logbooks_id_month_key UNIQUE (id, month);

CREATE TABLE public.care_activities_log_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    logbook_id uuid NOT NULL,
    logbook_month date NOT NULL,
    entry_date date NOT NULL,
    logged_at timestamp with time zone NOT NULL DEFAULT now(),
    activity_type text NOT NULL,
    speakers text,
    action_taken text NOT NULL,
    remarks text,
    CONSTRAINT care_activities_log_entries_logbook_fkey
        FOREIGN KEY (logbook_id, logbook_month)
        REFERENCES public.care_activities_logbooks (id, month) ON DELETE CASCADE,
    CONSTRAINT care_activities_log_entries_date_in_month
        CHECK (entry_date >= logbook_month AND entry_date < (logbook_month + INTERVAL '1 month'))
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.care_activities_logbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_activities_log_entries ENABLE ROW LEVEL SECURITY;

-- 1. Student Read Own Logbooks
CREATE POLICY "care_activities_logbooks_student_select_own"
    ON public.care_activities_logbooks
    FOR SELECT
    TO authenticated
    USING (student_id = public.current_student_id());

-- 2. Student Create Draft Logbook (Must be an active peer facilitator)
CREATE POLICY "care_activities_logbooks_student_insert_own"
    ON public.care_activities_logbooks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        student_id = public.current_student_id()
        AND status = 'draft'
        AND EXISTS (
            SELECT 1
            FROM public.peer_facilitators f
            WHERE f.student_id = care_activities_logbooks.student_id
              AND f.archived_at IS NULL
        )
    );

-- 3. Student Submit Own Logbook
CREATE POLICY "care_activities_logbooks_student_submit_own"
    ON public.care_activities_logbooks
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

-- 4. Staff Select Logbooks
CREATE POLICY "care_activities_logbooks_staff_select"
    ON public.care_activities_logbooks
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

-- 5. Staff Review/Reopen Logbooks
CREATE POLICY "care_activities_logbooks_staff_review"
    ON public.care_activities_logbooks
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);


-- Entries RLS
-- 1. Student Select Own Entries
CREATE POLICY "care_activities_log_entries_student_select_own"
    ON public.care_activities_log_entries
    FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.care_activities_logbooks b
        WHERE b.id = care_activities_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
    ));

-- 2. Student Insert Own Entries (Only to draft logbook)
CREATE POLICY "care_activities_log_entries_student_insert_own"
    ON public.care_activities_log_entries
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.care_activities_logbooks b
        WHERE b.id = care_activities_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

-- 3. Student Update Own Entries (Only to draft logbook)
CREATE POLICY "care_activities_log_entries_student_update_own"
    ON public.care_activities_log_entries
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.care_activities_logbooks b
        WHERE b.id = care_activities_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.care_activities_logbooks b
        WHERE b.id = care_activities_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

-- 4. Student Delete Own Entries (Only to draft logbook)
CREATE POLICY "care_activities_log_entries_student_delete_own"
    ON public.care_activities_log_entries
    FOR DELETE
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.care_activities_logbooks b
        WHERE b.id = care_activities_log_entries.logbook_id
          AND b.student_id = public.current_student_id()
          AND b.status = 'draft'
    ));

-- 5. Staff Select Entries
CREATE POLICY "care_activities_log_entries_staff_select"
    ON public.care_activities_log_entries
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);


-- Grants
GRANT SELECT, INSERT, UPDATE ON public.care_activities_logbooks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_activities_log_entries TO authenticated;
GRANT ALL ON public.care_activities_logbooks TO service_role;
GRANT ALL ON public.care_activities_log_entries TO service_role;
