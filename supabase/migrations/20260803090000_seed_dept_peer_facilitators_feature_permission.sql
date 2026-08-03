-- Seed the Department Head role's feature:peer_facilitators permission.
-- The dept Peer Facilitators page is gated through DEPT_MODULE_FEATURES, and
-- unknown feature keys resolve to hidden -- without this row the module would
-- be invisible to every Department Head and an Admin would have no toggle for it.
INSERT INTO public.role_permissions (role, permission_type, permission_key, is_allowed, status, description, created_by)
SELECT 'Department Head', 'feature', 'peer_facilitators', true, 'enabled', 'Department peer facilitator applications, roster, and hours', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions
    WHERE role = 'Department Head'
      AND permission_type = 'feature'
      AND permission_key = 'peer_facilitators'
);
