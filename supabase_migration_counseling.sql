-- ============================================================
-- COUNSELING FLOW REDESIGN — Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Student Self-Referral fields
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS course_year TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS reason_for_referral TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS personal_actions_taken TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS date_duration_of_concern TEXT;

-- Dept Head Referral Form fields (when forwarding to care staff)
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS referrer_contact_number TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS relationship_with_student TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS actions_made TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS date_duration_of_observations TEXT;
ALTER TABLE counseling_requests ADD COLUMN IF NOT EXISTS referrer_signature TEXT;
