# Secure Login and NAT Session Implementation Plan

> Execute locally only. Do not commit, push, deploy, or modify production configuration.

## Goal

Stop pre-authentication email/account disclosure and replace repeated NAT password submission with fixed six-hour opaque applicant sessions, while keeping CAPTCHA fair for shared Piso WiFi networks.

## Task 1: Secure staff and student login

- Add failing Edge Function handler tests for generic failures, dummy authentication work, role/user validation, and successful session return.
- Implement a dependency-injected login handler.
- Update `resolve-auth-login/index.ts` so identifier resolution and password authentication both happen inside the Edge Function.
- Update `src/lib/auth.tsx` to send identifier plus password and install only the returned Supabase session.
- Run the focused auth tests and TypeScript checks.

## Task 2: Add NAT applicant session storage

- Scaffold a Supabase migration with the CLI.
- Add `nat_applicant_sessions` with hashed tokens/browser IDs, six-hour expiry support, indexes, RLS, and service-role-only privileges.
- Leave the old per-application failure fields untouched for rollback compatibility.

## Task 3: Implement NAT login/session security

- Add failing tests for browser-scoped failure identifiers, CAPTCHA threshold behavior, opaque token issuance, fixed expiry, session validation, and revocation.
- Extract the minimum testable NAT security module.
- Reuse `edge_rate_limits` for username-plus-browser failure tracking.
- Make login the only password/CAPTCHA path; make session refresh, Time In, and Time Out token-only.
- Remove private security fields from applicant responses.

## Task 4: Update the NAT portal

- Persist the non-secret browser UUID in local storage and the opaque NAT token in session storage.
- Restore an applicant session after reload without retaining or resending the password.
- Use the token for dashboard refresh and attendance.
- Revoke the token best-effort on logout.
- Reset/remount Turnstile after a consumed failed login attempt.

## Task 5: Verify and review

- Run focused tests first, then lint/typecheck/build available in the repository.
- Inspect the final diff for unrelated changes, leaked secrets, and migration rollback concerns.
- Report files changed, commands run, results, and remaining deployment-order risks.
