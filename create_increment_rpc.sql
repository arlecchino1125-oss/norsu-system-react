-- Create a function to atomically increment the attendees count for an event
-- This prevents race conditions when multiple students time in simultaneously

CREATE OR REPLACE FUNCTION increment_event_attendees(e_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET attendees = COALESCE(attendees, 0) + 1
  WHERE id = e_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
