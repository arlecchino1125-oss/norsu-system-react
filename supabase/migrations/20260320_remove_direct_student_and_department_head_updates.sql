-- Remove the remaining broad browser update paths now that
-- StudentPortal and DeptDashboard write through edge functions.
--
-- Prerequisites:
--   deploy updated manage-student-accounts
--   deploy manage-department-admissions
--   deploy frontend changes that invoke those functions

begin;

drop policy if exists students_self_update on public.students;
drop policy if exists applications_department_head_update_current_queue on public.applications;

commit;
