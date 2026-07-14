-- Student ID swaps must go through manage-student-accounts, which verifies
-- that the caller is an Admin or Care Staff member before using service_role.
REVOKE EXECUTE ON FUNCTION public.swap_or_rename_student_ids(text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.swap_or_rename_student_ids(text, text)
TO service_role;
