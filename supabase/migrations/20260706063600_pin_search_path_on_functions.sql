-- Pin search_path on all functions flagged by Supabase security advisor.
-- Prevents schema-poisoning attacks where a rogue schema shadows public tables.

ALTER FUNCTION public.archive_and_reset_expired_course_year(timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.compute_school_year_label(timestamp with time zone, timestamp with time zone) SET search_path = 'public';
ALTER FUNCTION public.current_staff_audit_entity_label(jsonb) SET search_path = 'public';
ALTER FUNCTION public.current_staff_audit_record_id(jsonb) SET search_path = 'public';
ALTER FUNCTION public.get_department_admission_candidates(text, text[], integer, integer) SET search_path = 'public';
ALTER FUNCTION public.increment_event_attendees(uuid) SET search_path = 'public';
ALTER FUNCTION public.reset_role_permissions_to_defaults(text) SET search_path = 'public';
ALTER FUNCTION public.seed_archive_action_permission_defaults(text) SET search_path = 'public';
ALTER FUNCTION public.seed_default_role_permissions(text) SET search_path = 'public';
ALTER FUNCTION public.seed_student_role_permissions() SET search_path = 'public';
ALTER FUNCTION public.set_event_registrations_updated_at() SET search_path = 'public';
ALTER FUNCTION public.set_role_permissions_updated_at() SET search_path = 'public';
ALTER FUNCTION public.set_student_activation_settings_updated_at() SET search_path = 'public';
ALTER FUNCTION public.swap_or_rename_student_ids(text, text) SET search_path = 'public';
ALTER FUNCTION public.sync_student_course_year_to_enrollment() SET search_path = 'public';
ALTER FUNCTION public.validate_students_course_year() SET search_path = 'public';
