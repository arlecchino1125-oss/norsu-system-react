-- Peer facilitator school-year windows.
-- Care staff set the active form year (a label like '2026-2027'); every
-- application is stamped with the active year server-side at insert, so each
-- window's volunteer list is isolated — changing the year starts a fresh list
-- and prior windows remain intact under their own tag.

-- Single-row settings table, same pattern as student_activation_settings.
CREATE TABLE public.peer_facilitator_settings (
    id integer PRIMARY KEY DEFAULT 1,
    school_year text NOT NULL DEFAULT '2026-2027',
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT peer_facilitator_settings_id_check CHECK (id = 1)
);

INSERT INTO public.peer_facilitator_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.peer_facilitator_settings ENABLE ROW LEVEL SECURITY;

-- Students need the label for the portal header; only staff may change it.
CREATE POLICY "peer_facilitator_settings_read"
    ON public.peer_facilitator_settings
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "peer_facilitator_settings_staff_update"
    ON public.peer_facilitator_settings
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

GRANT SELECT, UPDATE ON public.peer_facilitator_settings TO authenticated;
GRANT ALL ON public.peer_facilitator_settings TO service_role;

-- Tag applications with their window; backfill existing rows into the current one.
ALTER TABLE public.peer_facilitator_applications
    ADD COLUMN IF NOT EXISTS school_year text;

UPDATE public.peer_facilitator_applications
SET school_year = (SELECT school_year FROM public.peer_facilitator_settings WHERE id = 1)
WHERE school_year IS NULL;

-- Stamp the active year on insert regardless of what the client sends —
-- guarantees window membership can't be forged or drift.
CREATE OR REPLACE FUNCTION public.stamp_peer_facilitator_school_year() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = 'public'
    AS $$
BEGIN
    NEW.school_year := (SELECT school_year FROM public.peer_facilitator_settings WHERE id = 1);
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.stamp_peer_facilitator_school_year() FROM anon;

CREATE TRIGGER peer_facilitator_applications_stamp_school_year
    BEFORE INSERT ON public.peer_facilitator_applications
    FOR EACH ROW
    EXECUTE FUNCTION public.stamp_peer_facilitator_school_year();
