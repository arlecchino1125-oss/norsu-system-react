-- Finding #1: Archived staff kept full access.
-- The staff auth helpers resolved identity by auth_user_id only, so an archived
-- staffer with a live session (or who logged back in) still resolved to their
-- role and passed every staff RLS policy. Adding `is_archived = false` makes an
-- archived account resolve to NULL, so every policy that routes through these
-- helpers denies them. It also closes the self-unarchive path: the profile
-- self-update policy checks id = current_staff_account_id(), which now returns
-- NULL for archived accounts, so their own row is no longer visible to update.

CREATE OR REPLACE FUNCTION public.current_staff_account_id() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.id
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_department() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.department
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_email() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.email
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_full_name() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.full_name
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.role
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;

CREATE OR REPLACE FUNCTION public.current_staff_username() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
    AS $$
    select sa.username
    from public.staff_accounts as sa
    where sa.auth_user_id = auth.uid()
      and sa.is_archived = false
    limit 1;
$$;
