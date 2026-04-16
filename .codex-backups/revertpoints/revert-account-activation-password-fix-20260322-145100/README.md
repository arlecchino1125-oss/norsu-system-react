Revert point before restoring send-email and activate-student-account to their pre-account-activation-password-fix state.
Restore these files to undo this revert:
- supabase/functions/send-email/source/index.ts
- supabase/functions/activate-student-account/source/index.ts
