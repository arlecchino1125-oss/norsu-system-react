-- Drop the unused columns from the applications table
ALTER TABLE applications
DROP COLUMN IF EXISTS school_last_attended,
DROP COLUMN IF EXISTS year_level_applying,
DROP COLUMN IF EXISTS is_working_student,
DROP COLUMN IF EXISTS working_student_type,
DROP COLUMN IF EXISTS supporter,
DROP COLUMN IF EXISTS supporter_contact,
DROP COLUMN IF EXISTS is_pwd,
DROP COLUMN IF EXISTS pwd_type,
DROP COLUMN IF EXISTS is_indigenous,
DROP COLUMN IF EXISTS indigenous_group,
DROP COLUMN IF EXISTS witnessed_conflict,
DROP COLUMN IF EXISTS is_solo_parent,
DROP COLUMN IF EXISTS is_child_of_solo_parent;

-- Return a success message
SELECT 'Successfully dropped columns from applications table' as result;
