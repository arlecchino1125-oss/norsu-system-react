Rollback note for the April 2, 2026 Supabase session recovery fix.

Touched files:
- `src/lib/auth.tsx`
- `src/lib/invokeEdgeFunction.ts`
- `src/lib/supabaseSessionRecovery.ts`

Exact revert points:
1. Remove the shared helper file: `src/lib/supabaseSessionRecovery.ts`
2. In `src/lib/auth.tsx`, remove the `supabaseSessionRecovery` import plus the new `handleRecoverableSessionError` and `prepareAuthSessionForLogin` callbacks, then restore the original `getSession()` handling in:
   - `loginStaff`
   - `loginStudent`
   - `initializeSession`
3. In `src/lib/invokeEdgeFunction.ts`, remove the `supabaseSessionRecovery` import and restore the original `requireAuth` branch that only read `client.auth.getSession()` and checked `access_token`.

Verification command after reverting:
- `npx tsc --noEmit`
