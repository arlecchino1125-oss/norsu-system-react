-- Create the peer facilitator applications table
CREATE TABLE public.peer_facilitator_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    organizations TEXT,
    motivation TEXT,
    skills TEXT,
    commitment TEXT,
    status VARCHAR NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.peer_facilitator_applications ENABLE ROW LEVEL SECURITY;

-- Allow students to insert their own application
CREATE POLICY "Students can insert their own application"
    ON public.peer_facilitator_applications
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT auth_user_id FROM public.students WHERE student_id = peer_facilitator_applications.student_id
    ));

-- Allow students to select their own applications
CREATE POLICY "Students can view their own applications"
    ON public.peer_facilitator_applications
    FOR SELECT
    USING (auth.uid() IN (
        SELECT auth_user_id FROM public.students WHERE student_id = peer_facilitator_applications.student_id
    ));

-- Allow care staff and admins to view all applications
CREATE POLICY "Authenticated users can view all applications"
    ON public.peer_facilitator_applications
    FOR SELECT
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

-- Allow care staff to update applications
CREATE POLICY "Authenticated users can update applications"
    ON public.peer_facilitator_applications
    FOR UPDATE
    TO authenticated
    USING (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text)
    WITH CHECK (public.is_admin() OR public.current_staff_role() = 'Care Staff'::text);

-- Grant privileges to authenticated and anon roles (if required, though standard is authenticated)
GRANT ALL ON public.peer_facilitator_applications TO authenticated;
GRANT ALL ON public.peer_facilitator_applications TO service_role;
