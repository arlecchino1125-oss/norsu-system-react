-- Correction: "Department Head", "Dean", and "College User" were treated as
-- three distinct staff_accounts.role values in the previous migration. They
-- are not — "Department Head" is the only stored role value (the staff
-- account form just labels the option "Department Head (Dean)" in the UI).
-- "Dean" and "College User" never match any real row, so the array check
-- was harmless but pointless. Simplify back to a plain equality check.

DROP POLICY IF EXISTS "profile_pictures_staff_select" ON storage.objects;
CREATE POLICY "profile_pictures_staff_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'profile-pictures'
        AND (
            public.is_admin()
            OR public.current_staff_role() = 'Care Staff'
            OR (
                public.current_staff_role() = 'Department Head'
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.student_id = (storage.foldername(name))[1]
                      AND COALESCE(s.department, '') = COALESCE(public.current_staff_department(), '')
                )
            )
        )
    );

DROP POLICY IF EXISTS "attendance_proofs_staff_select" ON storage.objects;
CREATE POLICY "attendance_proofs_staff_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'attendance_proofs'
        AND (
            public.is_admin()
            OR public.current_staff_role() = 'Care Staff'
            OR (
                public.current_staff_role() = 'Department Head'
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.student_id = split_part(name, '_', 1)
                      AND COALESCE(s.department, '') = COALESCE(public.current_staff_department(), '')
                )
            )
        )
    );
