-- Index the events list query flagged by Postgres index_advisor:
--   SELECT ... FROM events WHERE is_archived = $1 ORDER BY created_at DESC LIMIT ...
-- Existing idx_events_is_archived_event_date sorts by event_date, not created_at,
-- so this query currently scans + sorts (advisor cost 15.94 -> 3.03).
-- Composite (is_archived, created_at DESC) serves both the filter and the sort
-- from one index. The events table grows monotonically, so this only pays off more
-- over time. Mirrors the existing idx_events_is_archived_event_date pattern.

CREATE INDEX IF NOT EXISTS idx_events_is_archived_created_at
    ON public.events USING btree (is_archived, created_at DESC);
