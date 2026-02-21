-- Add new student profile columns to match the comprehensive student form
-- Run this in your Supabase SQL Editor

-- Personal Information (new fields)
ALTER TABLE students ADD COLUMN IF NOT EXISTS religion text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_safe_in_community boolean DEFAULT false;

-- Family Background
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_occupation text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mother_contact text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_occupation text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_contact text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_address text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS num_brothers text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS num_sisters text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS birth_order text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS spouse_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS spouse_occupation text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS num_children text;

-- Guardian
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_address text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_contact text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS guardian_relation text;

-- Emergency Contact (expanded from single emergency_contact field)
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_name text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_address text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_relationship text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_number text;

-- Educational Background
ALTER TABLE students ADD COLUMN IF NOT EXISTS elem_school text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS elem_year_graduated text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS junior_high_school text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS junior_high_year_graduated text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS senior_high_school text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS senior_high_year_graduated text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_school text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS college_year_graduated text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS honors_awards text;

-- Extra-Curricular
ALTER TABLE students ADD COLUMN IF NOT EXISTS extracurricular_activities text;

-- Scholarships
ALTER TABLE students ADD COLUMN IF NOT EXISTS scholarships_availed text;

-- Profile Completion Flag
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;
