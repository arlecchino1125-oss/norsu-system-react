-- CARE staff can now turn attendance proof requirements off per event.
-- Defaults preserve current behaviour: photo proof required, geofence off.

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS require_photo boolean DEFAULT true NOT NULL,
    ADD COLUMN IF NOT EXISTS require_geolocation boolean DEFAULT false NOT NULL;
