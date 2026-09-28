# Secure Portal Login and NAT Session Design

## Goal

Remove all pre-authentication email disclosure and prevent failed NAT login attempts from disrupting an applicant's active dashboard or exam attendance.

## Scope

This change covers:

- staff username login;
- student ID and student email login;
- NAT applicant login CAPTCHA tracking;
- NAT dashboard refresh, Time In, Time Out, session restoration, and logout; and
- regression tests for the security boundaries above.

It does not change student activation policy, staff permissions, NAT password hashing, attendance business rules, or production deployment configuration.

## Constraints

- NAT sessions have a fixed six-hour lifetime and do not extend on refresh.
- Shared-IP blocking is not introduced because Piso WiFi and campus networks can place unrelated users behind one address.
- No new runtime dependency is added. Web Crypto, the existing Supabase client, the existing rate-limit table/RPC, and Cloudflare Turnstile are reused.
- Raw passwords, Turnstile tokens, Supabase refresh tokens, and NAT session tokens must not be logged.
- Production deployment remains a separate explicitly approved operation.

## Staff and Student Login

### Request

The browser sends the complete login attempt to `resolve-auth-login` in one request:

- staff: mode, username, password, and required portal role;
- student: mode, student ID or email, login mode, and password.

The Edge Function normalizes and validates these inputs. It uses the service-role client only for the private account lookup and a non-persisting publishable/anon-key client for `signInWithPassword`.

### Private authentication

The Edge Function:

1. Looks up the account email and linked Auth user ID without returning either value.
2. Calls Supabase Auth with the resolved email and submitted password.
3. For an unknown, unlinked, archived, inactive, or wrong-role account, calls Auth using a fixed dummy email so missing accounts do not skip the expensive authentication step.
4. Requires the authenticated user ID to match the private profile row.
5. Requires the staff profile to match the requested portal role and remain active/non-archived.
6. Revokes the newly created local Auth session before returning a failure if post-auth linkage or role validation fails.

### Response

Successful authentication returns only the Supabase session required by the browser. The browser installs it with `supabase.auth.setSession`, then loads the profile using the existing authenticated profile queries.

All credential and account-state failures return the same status and message for that portal:

- student: HTTP 401, `Student ID/email or password is incorrect.`
- staff: HTTP 401, `Username or password is incorrect.`

No unsuccessful response returns email, role, status, Auth user ID, or an account object. Rate-limit responses may remain HTTP 429, and operational outages may return a generic HTTP 5xx message.

The final secure modes are `authenticate-staff-login` and `authenticate-student-login`. The insecure resolver modes are removed from the final implementation.

## NAT Browser Identity and CAPTCHA

The browser creates a random UUID once and stores it under a NAT-specific local-storage key. This value is not authentication and is not trusted as identity; it only separates CAPTCHA counters for different browsers sharing an account name or IP address.

Failed-login tracking reuses `edge_rate_limits` and `consume_edge_rate_limit` with a scope dedicated to NAT login failures. The identifier seed contains the normalized submitted username and browser UUID. The same key is used whether or not the username exists, preventing HTTP 401/403 differences from becoming a username-existence oracle.

Flow:

1. Before password verification, check whether the username/browser failure window already requires CAPTCHA.
2. When required, validate the Turnstile token with Siteverify before checking the password.
3. On any invalid username/password combination, atomically increment that username/browser pair.
4. At three failures within 15 minutes, return HTTP 403 so that browser renders CAPTCHA.
5. On successful login, delete that pair's failure counter.

An attacker using another browser UUID can trigger CAPTCHA only for their own username/browser pair. They cannot change another browser's counter or invalidate an already-issued NAT session. Browser UUID rotation can evade this CAPTCHA counter; that is the accepted trade-off for avoiding unfair shared-IP blocking.

The old `applications.failed_login_attempts` and `applications.captcha_required_until` columns are no longer read or written. They remain temporarily for rollback and can be removed in a later separately approved cleanup migration.

## NAT Opaque Sessions

### Database

Create `public.nat_applicant_sessions` with:

- `id uuid` primary key;
- `application_id uuid` referencing `applications(id)` with `ON DELETE CASCADE`;
- `token_hash text` unique, containing a lowercase SHA-256 hex digest only;
- `browser_id_hash text`, containing a lowercase SHA-256 hex digest only;
- `expires_at timestamptz`;
- `created_at timestamptz` defaulting to the current UTC time; and
- checks requiring 64-character token and browser hashes.

The unique constraint indexes `token_hash`; separate indexes cover `application_id` and `expires_at`. RLS is enabled with no browser-facing policies. `PUBLIC`, `anon`, and `authenticated` receive no table privileges; only `service_role` receives the minimum select, insert, and delete privileges used by the Edge Function.

### Issuance

After a valid password and any required CAPTCHA:

1. Generate 32 cryptographically random bytes with Web Crypto.
2. Encode the raw token as base64url.
3. Hash the raw token with SHA-256.
4. Hash the browser UUID with SHA-256.
5. Insert only the hashes, application ID, and an expiry exactly six hours in the future.
6. Return the raw token and expiry once with the sanitized application.

Expired session rows are deleted opportunistically during successful login. Multiple unexpired sessions per applicant are allowed so a legitimate second login does not interrupt an active exam session.

### Browser storage and use

The NAT token is stored in `sessionStorage`, not `localStorage`, so it survives a same-tab reload but closes with the tab. The NAT password is not retained after login and is never used for dashboard refresh or attendance.

The browser sends the NAT token and browser UUID for:

- `session` refresh;
- `time-in`;
- `time-out`; and
- `logout`.

The Edge Function hashes both values, finds an unexpired matching session, and derives the application from the session row. These operations never call password verification or CAPTCHA.

On page reload, the portal restores the token from `sessionStorage`, calls `session`, and returns to the dashboard when valid. An invalid, expired, revoked, or browser-mismatched token returns HTTP 401. The browser clears its token and returns to the login screen without changing saved attendance.

Logout deletes the server-side session row on a best-effort basis and always clears the browser token and private NAT state.

## Turnstile Lifecycle

Turnstile tokens are single-use. The widget receives an explicit reset signal after every CAPTCHA-protected failed submission, including a correct CAPTCHA followed by a wrong password. Reset clears the consumed token and produces a fresh challenge, preventing the login button from remaining disabled until reload.

Success hides and removes the widget. Expiry and widget errors also clear the stored token.

## Error Handling

- Credential failures remain generic and never disclose account data.
- Missing or malformed NAT browser IDs, NAT tokens, or login fields are rejected without database mutation beyond the applicable generic failure counter.
- Token expiry and revocation return HTTP 401.
- CAPTCHA-required responses return HTTP 403.
- Rate-limit infrastructure failure fails closed with HTTP 503 rather than silently disabling protection.
- Database/Auth/Turnstile operational errors are captured without request secrets and return generic user-facing messages.
- Time In and Time Out preserve the existing attendance fallback for deployments that lack timestamp columns.

## Tests

### Staff/student authentication

- Unknown identifier, wrong password, unlinked profile, archived/inactive profile, linkage mismatch, and wrong staff role produce the same portal-specific 401 response.
- No failed response contains email, role, status, Auth user ID, account, access token, or refresh token.
- Unknown accounts still execute the dummy Auth attempt.
- Successful authentication returns a session only after the Auth user ID matches the profile.
- The browser calls `setSession` and does not perform a pre-auth email lookup.

### NAT sessions and CAPTCHA

- Three failures require CAPTCHA for the same normalized username/browser pair.
- Unknown and existing usernames follow the same status transition.
- A different browser UUID is unaffected by another browser's failures.
- A successful login clears only its own failure counter.
- The database stores token and browser hashes, never raw values.
- Valid tokens authorize refresh, Time In, and Time Out without password verification.
- Expired, revoked, unknown, and browser-mismatched tokens are rejected.
- Failed logins do not invalidate an existing token.
- Two legitimate sessions for one applicant can remain valid concurrently.
- Reload restoration succeeds from `sessionStorage`; logout clears and revokes the token.
- A consumed Turnstile token is reset after a failed password attempt.

## Implementation Boundaries

Expected production files include:

- `supabase/functions/resolve-auth-login/index.ts` plus a testable handler module;
- `src/lib/auth.tsx` and focused authentication tests;
- one generated Supabase migration for `nat_applicant_sessions` and grants;
- `supabase/functions/manage-nat-applications/index.ts` plus focused token/session tests; and
- `src/pages/NATPortal.tsx` plus focused NAT login/widget tests.

No unrelated warning cleanup, portal refactor, new authentication library, custom JWT implementation, or production deployment is included.

## Deployment and Rollback

Deployment must be coordinated because the secure request/response contracts change:

1. Apply the database migration.
2. Deploy both updated Edge Functions.
3. Deploy/promote the matching frontend immediately in the same maintenance window.
4. Verify staff, student-ID, student-email, NAT login, CAPTCHA, session restore, Time In, Time Out, and logout with non-production test accounts.

Rollback restores the prior frontend and Edge Function versions. The additive session table and old CAPTCHA columns may remain in place; no destructive rollback is required. Production deployment or rollback requires explicit user approval.
