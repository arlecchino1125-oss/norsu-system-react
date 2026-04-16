Revert point for the activated-account password mismatch fix.
Restore these files to roll back:
- supabase/functions/send-email/source/index.ts
- supabase/functions/activate-student-account/source/index.ts
Reason: escape HTML email values and make generated activation passwords email-safe.
