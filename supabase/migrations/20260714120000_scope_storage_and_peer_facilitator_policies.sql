-- Harden storage.objects policies for profile-pictures / attendance_proofs and
-- lock peer_facilitator_applications' own-row policies to authenticated users.
--
-- Previous storage policies only checked bucket_id (no ownership/path check) and
-- applied to role `public`, so any authenticated student could read/write any
-- other student's file, and (per the audit) anonymous sessions were exposed to
-- insert on attendance_proofs. New rules:
--   Students: view/update own profile picture; insert/view own attendance
--     proofs (no update/delete on attendance proofs).
--   Care Staff: view all students' profile pictures and attendance proofs.
--   Department Head / Dean / College User: view profile pictures and
--     attendance proofs of students in their own department.
--   Anonymous: no access (all policies scoped TO authenticated).
--
-- Path conventions differ per bucket (confirmed from git history):
--   profile-pictures: `<student_id>/avatar.<ext>`      -> storage.foldername(name)[1]
--   attendance_proofs: `<student_id>_<eventId>_<ts>.jpg` -> split_part(name, '_', 1)

-- storage.objects is owned by supabase_storage_admin and already has RLS
-- enabled by default on every Supabase project; the migration role can't
-- (and doesn't need to) ALTER TABLE it.

UPDATE storage.buckets SET public = false WHERE id IN ('profile-pictures', 'attendance_proofs');

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
          AND (
              qual ILIKE '%profile-pictures%' OR qual ILIKE '%attendance_proofs%'
              OR with_check ILIKE '%profile-pictures%' OR with_check ILIKE '%attendance_proofs%'
          )
    LOOP
        EXECUTE format('DROP POLICY %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Students: view + update their own profile picture
CREATE POLICY "profile_pictures_student_select_own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = public.current_student_id()
    );

CREATE POLICY "profile_pictures_student_update_own"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = public.current_student_id()
    )
    WITH CHECK (
        bucket_id = 'profile-pictures'
        AND (storage.foldername(name))[1] = public.current_student_id()
    );

-- Students: insert + view their own attendance proofs (no update/delete)
CREATE POLICY "attendance_proofs_student_insert_own"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'attendance_proofs'
        AND split_part(name, '_', 1) = public.current_student_id()
    );

CREATE POLICY "attendance_proofs_student_select_own"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'attendance_proofs'
        AND split_part(name, '_', 1) = public.current_student_id()
    );

-- Staff: Admin/Care Staff see all; Department Head/Dean/College User see their department's students
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
                public.current_staff_role() = ANY (ARRAY['Department Head', 'Dean', 'College User'])
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.student_id = (storage.foldername(name))[1]
                      AND COALESCE(s.department, '') = COALESCE(public.current_staff_department(), '')
                )
            )
        )
    );

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
                public.current_staff_role() = ANY (ARRAY['Department Head', 'Dean', 'College User'])
                AND EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.student_id = split_part(name, '_', 1)
                      AND COALESCE(s.department, '') = COALESCE(public.current_staff_department(), '')
                )
            )
        )
    );

-- peer_facilitator_applications: the "own row" policies applied to role
-- `public` (anon + authenticated). auth.uid() is null for anon so they were
-- already denied in practice, but scope explicitly to authenticated so the
-- table only ever grants to logged-in students, not just by accident.
DROP POLICY IF EXISTS "Students can insert their own application" ON public.peer_facilitator_applications;
DROP POLICY IF EXISTS "Students can view their own applications" ON public.peer_facilitator_applications;

CREATE POLICY "Students can insert their own application"
    ON public.peer_facilitator_applications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (
        SELECT auth_user_id FROM public.students WHERE student_id = peer_facilitator_applications.student_id
    ));

CREATE POLICY "Students can view their own applications"
    ON public.peer_facilitator_applications
    FOR SELECT
    TO authenticated
    USING (auth.uid() IN (
        SELECT auth_user_id FROM public.students WHERE student_id = peer_facilitator_applications.student_id
    ));
