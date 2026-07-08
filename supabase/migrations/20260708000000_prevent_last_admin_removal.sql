-- Prevent removing the last active Admin account (via archive, delete, or role change).
-- The admin dashboard's own "don't archive yourself" check only guards against
-- an Admin archiving their own session -- two Admins could still archive each
-- other down to zero, and the client-side check is bypassable anyway (it's a
-- direct table update, not routed through an edge function). This trigger is
-- the real backstop: without it, the admin portal could be locked out entirely
-- with no path back in through the app. Keep the last active Admin as Admin.
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = 'public'
    AS $$
DECLARE
    remaining_admin_count integer;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.role = 'Admin' AND COALESCE(OLD.is_archived, false) = false THEN
            SELECT count(*) INTO remaining_admin_count
            FROM public.staff_accounts
            WHERE role = 'Admin'
              AND COALESCE(is_archived, false) = false
              AND id <> OLD.id;

            IF remaining_admin_count = 0 THEN
                RAISE EXCEPTION 'Cannot remove the last active Admin account.';
            END IF;
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.role = 'Admin'
           AND COALESCE(OLD.is_archived, false) = false
           AND (
               COALESCE(NEW.is_archived, false) = true
               OR COALESCE(NEW.role, ''::text) <> 'Admin'
           ) THEN
            SELECT count(*) INTO remaining_admin_count
            FROM public.staff_accounts
            WHERE role = 'Admin'
              AND COALESCE(is_archived, false) = false
              AND id <> OLD.id;

            IF remaining_admin_count = 0 THEN
                IF COALESCE(NEW.is_archived, false) = true THEN
                    RAISE EXCEPTION 'Cannot archive the last active Admin account.';
                END IF;
                RAISE EXCEPTION 'Cannot remove the Admin role from the last active Admin account.';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal() FROM anon;

DROP TRIGGER IF EXISTS staff_accounts_prevent_last_admin_removal ON public.staff_accounts;

CREATE TRIGGER staff_accounts_prevent_last_admin_removal
    BEFORE UPDATE OR DELETE ON public.staff_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_last_admin_removal();
