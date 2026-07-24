-- Peer Facilitators overhaul.
--
-- Root cause being fixed: peer_facilitator_settings.school_year was a single
-- value doing three jobs -- stamping applications, filtering what students see,
-- and gating hours. Changing it to onboard a 2025 batch hid the 2026-2027
-- cohort. This migration demotes school_year to a pure label and makes a real
-- roster the source of truth for "who is an active facilitator".

-- 1. Settings gains two switches; school_year stays but is label-only now.
ALTER TABLE public.peer_facilitator_settings
    ADD COLUMN IF NOT EXISTS applications_open boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS time_in_enabled boolean NOT NULL DEFAULT true;

-- 2. The roster: one row per currently-active facilitator, from either source.
CREATE TABLE IF NOT EXISTS public.peer_facilitators (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- UNIQUE: a student is active once; approval upsert and manual add can't dup.
    student_id character varying NOT NULL UNIQUE REFERENCES public.students(student_id) ON DELETE CASCADE,
    peer_year text NOT NULL,
    -- Drives the "Applied" vs "Added by staff" label/filter in the office UI.
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('application', 'manual')),
    -- Link back to the approval this came from; kept nullable for manual adds.
    application_id uuid REFERENCES public.peer_facilitator_applications(id) ON DELETE SET NULL,
    added_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS peer_facilitators_student_idx
    ON public.peer_facilitators (student_id);

ALTER TABLE public.peer_facilitators ENABLE ROW LEVEL SECURITY;

-- Students read only their own membership -- the portal asks "am I active".
CREATE POLICY "peer_facilitators_student_select_own"
    ON public.peer_facilitators
    FOR SELECT
    TO authenticated
    USING (student_id = public.current_student_id());

CREATE POLICY "peer_facilitators_staff_select"
    ON public.peer_facilitators
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

CREATE POLICY "peer_facilitators_staff_write"
    ON public.peer_facilitators
    FOR ALL
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_facilitators TO authenticated;
GRANT ALL ON public.peer_facilitators TO service_role;

-- 3. Backfill: every currently-approved application becomes a roster row. This
-- is by approved STATUS, not by the active year, so the hidden 2026-2027
-- approved facilitators are restored regardless of what school_year is set to.
INSERT INTO public.peer_facilitators (student_id, peer_year, source, application_id)
SELECT DISTINCT ON (a.student_id)
    a.student_id,
    COALESCE(a.school_year, ''),
    'application',
    a.id
FROM public.peer_facilitator_applications a
WHERE a.status = 'approved'
ORDER BY a.student_id, a.created_at DESC
ON CONFLICT (student_id) DO NOTHING;

-- 4. Hours gate is now roster membership + the global toggle, year-independent.
-- (Closing an already-open session stays governed by the untouched update
-- policy, so switching the toggle off can never trap a facilitator clocked in.)
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
        )
        AND (SELECT s.time_in_enabled FROM public.peer_facilitator_settings s WHERE s.id = 1)
    );

-- 5. The applications-open toggle is a real gate, not just a hidden button:
-- reject a student's insert at the DB when applications are closed.
DROP POLICY IF EXISTS "Students can insert their own application" ON public.peer_facilitator_applications;
CREATE POLICY "Students can insert their own application"
    ON public.peer_facilitator_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM public.students WHERE student_id = peer_facilitator_applications.student_id
        )
        AND (SELECT s.applications_open FROM public.peer_facilitator_settings s WHERE s.id = 1)
    );
