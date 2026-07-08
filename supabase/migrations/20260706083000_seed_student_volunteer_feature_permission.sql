-- Seed the Student role's feature:volunteer permission.
-- The volunteer (Peer Facilitator) view shipped gated behind feature:volunteer,
-- but no role_permissions row was ever created, and unknown feature keys resolve
-- to hidden — so the student portal blocked the view with a "currently hidden" toast.
INSERT INTO public.role_permissions (role, permission_type, permission_key, is_allowed, status, description, created_by)
SELECT 'Student', 'feature', 'volunteer', true, 'enabled', 'Peer Facilitator volunteer form', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = 'Student'
      AND permission_type = 'feature'
      AND permission_key = 'volunteer'
);
