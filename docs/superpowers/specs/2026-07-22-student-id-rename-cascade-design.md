# Student ID Rename Cascade Gaps

Three tables don't follow `students.student_id` renames. Ten others already do. One migration, no app code.

## The fix

```sql
-- Rebuild both peer facilitator links to follow renames.
-- Keeps ON DELETE CASCADE; Postgres can't alter actions in place.
ALTER TABLE public.peer_facilitator_applications
    DROP CONSTRAINT IF EXISTS peer_facilitator_applications_student_id_fkey;
ALTER TABLE public.peer_facilitator_applications
    ADD CONSTRAINT peer_facilitator_applications_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE public.peer_facilitator_attendance
    DROP CONSTRAINT IF EXISTS peer_facilitator_attendance_student_id_fkey;
ALTER TABLE public.peer_facilitator_attendance
    ADD CONSTRAINT peer_facilitator_attendance_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE ON DELETE CASCADE;

-- general_feedback has no link at all. NOT VALID because rows may exist from
-- when anon submissions were allowed (dropped in 20260706063500) pointing at
-- IDs that were never students -- a normal ADD would fail on those.
-- NOT VALID still checks new rows and still cascades renames; it only skips
-- the scan of existing rows. No ON DELETE, matching the ten sibling tables.
ALTER TABLE public.general_feedback
    ADD CONSTRAINT general_feedback_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES public.students(student_id)
    ON UPDATE CASCADE
    NOT VALID;
```

End the migration with a `DO` block that asserts two things against `pg_constraint`: three student FKs on these tables have `confupdtype = 'c'`, **and** none is left with any other value.

The second half matters. The `DROP`s name the constraints Postgres generates for an inline `REFERENCES`. If a name differs, `DROP ... IF EXISTS` skips silently, the old non-cascading constraint survives next to the new one, renames still fail — and a plain count of three would report success.

## Verify

Make a student with a peer facilitator application, an attendance row, and a feedback row. Rename their `student_id` via `manage-student-accounts` mode `update-profile`. All three should follow.

Then insert `general_feedback` with a fake `student_id` — it must be rejected. That's what proves the `NOT VALID` constraint is live rather than absent.

## Notes

`general_feedback` rows are insert-only in the app. If anything ever updates an old unmatched row, that update now fails. No such code path found.

No indexes added. `general_feedback` already has one; the two peer facilitator tables are small enough to scan.

Rollback is lossless — drop the three, recreate the two peer facilitator ones without `ON UPDATE`.

## Parked

- Repoint child tables to `students.id` so renames stop propagating: 12 tables, ~60 DB rules, 84 frontend files, 134 edge fn refs. Stage per feature.
- Log who renames a student ID and what it was before.
- Decide whether renames should be limited to registrar-issued IDs (`enrolled_students` is unmaintained).
- Review and clean unmatched `general_feedback` rows, then `VALIDATE CONSTRAINT`.
