# NAT Portal Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development for each behavior change. Work in the existing workspace because the user explicitly prohibited creating branches or commits unless requested.

**Goal:** Harden the public NAT Portal against direct database bypasses, bot/login abuse, sessionless activation, invalid attendance transitions, and shared-browser PII leakage without adding Student ID ownership checks or changing staff ID swap/rename operations.

**Architecture:** Keep the public React flow and existing Supabase Edge Functions. Make Edge Functions the only anonymous write boundary, reuse the existing NAT opaque session for activation, put workflow invariants in small testable policy helpers, and use one forward-only Postgres migration for grants, RLS, privileged RPC grants, and atomic application-capacity checks.

**Tech Stack:** React 19, TypeScript, Vitest, Supabase Edge Functions (Deno), Supabase Postgres/RLS.

## Global Constraints

- NAT remains open intake; no registrar lookup, OTP, or Student ID ownership proof.
- Wrong or already-used Student IDs remain staff-correctable through the existing swap/rename workflow.
- Visitors keep seeing only active courses and active admission schedules before applying.
- Reuse the existing NAT password hashing, applicant session, Turnstile widget, and Edge rate limiter.
- Add no dependency, branch, commit, production migration, Edge deployment, or production secret change.
- Preserve unrelated changes in `src/lib/sentry.ts`, `src/main.tsx`, and `supabase/migrations/20260714055251_revoke_authenticated_swap_student_ids.sql`.

---

### Task 1: Public database boundary and atomic submission constraints

**Files:**
- Modify: `supabase/migrations/20260714062703_harden_nat_portal.sql`
- Modify: `src/pages/NATPortal.tsx`
- Modify: `supabase/CHANGELOG.md`

**Interfaces:**
- Anonymous clients may select `courses(id,name,application_limit,status)` only where `status = 'Open'`.
- Anonymous clients may select `admission_schedules(id,date,venue,slots,is_active,time_windows)` only where `is_active IS TRUE`.
- Anonymous clients have no direct privilege or RLS policy on `applications` and no table privilege on `departments`.
- `consume_edge_rate_limit` and `finalize_application` remain executable only by `service_role`.
- A `BEFORE INSERT` trigger serializes on the selected course and schedule rows, then rejects closed/full courses, inactive/full schedules, invalid time windows, and full time windows.

- [ ] **Step 1: Record the pre-migration exposure with read-only SQL**

```sql
select policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('applications', 'courses', 'admission_schedules');

select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in ('applications', 'courses', 'admission_schedules', 'departments', 'role_permissions');
```

Expected before migration: `applications_anon_submit`, public unrestricted read policies, and broad anonymous table grants are present.

- [ ] **Step 2: Add the minimum forward migration**

The migration must:

```sql
drop policy if exists applications_anon_submit on public.applications;
revoke all on table public.applications from anon;

drop policy if exists courses_public_read on public.courses;
create policy courses_anon_read_open on public.courses
  for select to anon using (status = 'Open');
create policy courses_authenticated_read on public.courses
  for select to authenticated using (true);
revoke all on table public.courses from anon;
grant select (id, name, application_limit, status) on table public.courses to anon;

drop policy if exists admission_schedules_public_read on public.admission_schedules;
create policy admission_schedules_anon_read_active on public.admission_schedules
  for select to anon using (is_active is true);
create policy admission_schedules_authenticated_read on public.admission_schedules
  for select to authenticated using (true);
revoke all on table public.admission_schedules from anon;
grant select (id, date, venue, slots, is_active, time_windows)
  on table public.admission_schedules to anon;

drop policy if exists departments_public_read on public.departments;
create policy departments_authenticated_read on public.departments
  for select to authenticated using (true);
revoke all on table public.departments from anon;

revoke all on table public.role_permissions from anon;
grant select on table public.role_permissions to anon;

revoke execute on function public.consume_edge_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text, text, integer, integer)
  to service_role;
revoke execute on function public.finalize_application(uuid, text, bigint, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_application(uuid, text, bigint, text, text)
  to service_role;
```

It must also create the trigger described in **Interfaces**, with `SET search_path = public`, and revoke direct execution of the trigger function from `PUBLIC` and `anon`.

- [ ] **Step 3: Make the public schedule query compatible with column grants**

Change `.select('*')` to:

```ts
.select('id, date, venue, slots, is_active, time_windows')
```

- [ ] **Step 4: Document rollback considerations**

Append a changelog entry naming the migration and state that rollback would restore the old policies/grants and drop the trigger, but doing so reopens the anonymous write bypass.

---

### Task 2: Session-bound NAT activation

**Files:**
- Create: `supabase/functions/activate-student-account/natActivation.ts`
- Create: `supabase/functions/activate-student-account/natActivation.test.ts`
- Modify: `supabase/functions/activate-student-account/index.ts`
- Modify: `supabase/functions/manage-nat-applications/natSecurity.ts`
- Modify: `src/pages/NATPortal.tsx`
- Modify: `src/lib/studentActivationErrors.ts`
- Create: `src/lib/studentActivationErrors.test.ts`

**Interfaces:**
- `requireApprovedNatActivation(input, requireSession)` returns the application resolved from `token + browserId` only.
- It rejects missing/invalid sessions through the existing `requireNatSessionSecurity` behavior and rejects any status other than `Approved for Enrollment` with HTTP 403.
- The activation function ignores any client-supplied `applicationId`; Student ID and course handling remain unchanged.

- [ ] **Step 1: Write failing activation-policy tests**

```ts
it('resolves activation from the NAT token and browser instead of applicationId', async () => {
  const requireSession = vi.fn().mockResolvedValue({
    application: { id: 'application-a', status: 'Approved for Enrollment' }
  });
  const result = await requireApprovedNatActivation({
    token: 'token', browserId: 'browser', applicationId: 'application-b'
  }, requireSession);
  expect(requireSession).toHaveBeenCalledWith({ token: 'token', browserId: 'browser' });
  expect(result.id).toBe('application-a');
});

it('rejects activation before approval', async () => {
  const requireSession = vi.fn().mockResolvedValue({ application: { id: 'a', status: 'Submitted' } });
  await expect(requireApprovedNatActivation({ token: 't', browserId: 'b' }, requireSession))
    .rejects.toMatchObject({ status: 403 });
});
```

Run: `npm test -- supabase/functions/activate-student-account/natActivation.test.ts`

Expected: FAIL because `natActivation.ts` does not exist.

- [ ] **Step 2: Implement the minimal activation policy and verify green**

Use the existing session helper; do not create a second token type. The Edge function constructs the database-backed `findSession` dependency, obtains the application, then continues the existing activation flow. Deleting the application already cascades deletion of its NAT sessions.

Run: `npm test -- supabase/functions/activate-student-account/natActivation.test.ts supabase/functions/manage-nat-applications/natSecurity.test.ts`

Expected: PASS.

- [ ] **Step 3: Send the existing NAT session from the browser**

The activation body becomes:

```ts
{
  mode: 'nat-application-activation',
  token: natSession.token,
  browserId: natBrowserId,
  studentId,
  course,
  allowEnrollmentCreate
}
```

- [ ] **Step 4: Add and fix the missing-enrollment regression test**

Add `isMissingEnrollmentActivationError(error)` to the existing activation-error helper and test that the exact server error is recognized while unrelated errors are not. Replace the current `String('').includes(...)` call with this helper so approved applicants can use the existing enrollment-create confirmation.

---

### Task 3: Server-generated NAT credentials and optional submission CAPTCHA

**Files:**
- Create: `supabase/functions/_shared/randomPassword.ts`
- Create: `supabase/functions/_shared/randomPassword.test.ts`
- Create: `supabase/functions/_shared/turnstile.ts`
- Create: `supabase/functions/_shared/turnstile.test.ts`
- Modify: `supabase/functions/submit-nat-application/index.ts`
- Modify: `supabase/functions/manage-nat-applications/index.ts`
- Modify: `src/pages/NATPortal.tsx`
- Modify: `src/pages/public/nat/components/ApplicationWizard.tsx`
- Modify: `.env.example`

**Interfaces:**
- `generateRandomPassword(length, randomBytes?)` uses `crypto.getRandomValues`, never `Math.random`.
- Submission ignores a client password, generates it server-side, hashes it, emails it using the existing flow, and returns it once in the successful response.
- When `TURNSTILE_SECRET_KEY` exists, submission requires and server-verifies `captchaToken`; when absent, current local/development behavior remains available.

- [ ] **Step 1: Write and run failing password and Turnstile tests**

```ts
it('generates a password from cryptographic bytes', () => {
  expect(generateRandomPassword(12, () => new Uint8Array(12).fill(1))).toHaveLength(12);
});

it('rejects a missing token when Turnstile is configured', async () => {
  await expect(requireValidTurnstile('', 'secret', vi.fn())).rejects.toMatchObject({ status: 403 });
});
```

Run: `npm test -- supabase/functions/_shared/randomPassword.test.ts supabase/functions/_shared/turnstile.test.ts`

Expected: FAIL because the helpers do not exist.

- [ ] **Step 2: Implement the two focused helpers and verify green**

The Turnstile verifier posts only `secret` and `response` to Cloudflare and treats non-2xx/malformed responses as failure.

- [ ] **Step 3: Move NAT password creation to the submission server**

Remove the browser `Math.random()` password and use `submission.password` for the one-time success display. Keep the existing PBKDF2 storage and email flow.

- [ ] **Step 4: Reuse the existing Turnstile widget on application step 3**

Pass a React node and disabled state into `ApplicationWizard`; render the check immediately above the final submit button only when `VITE_TURNSTILE_SITE_KEY` is configured. Reset the token after a failed submission.

---

### Task 4: Login throttling, public-stat throttling, and attendance invariants

**Files:**
- Create: `supabase/functions/manage-nat-applications/natAttendance.ts`
- Create: `supabase/functions/manage-nat-applications/natAttendance.test.ts`
- Modify: `supabase/functions/manage-nat-applications/index.ts`

**Interfaces:**
- Login calls the existing shared Edge limiter with normalized username as its seed, independent of the client-controlled browser UUID.
- `public-stats` has an IP/request limiter; aggregation remains in memory until volume shows caching/RPC is necessary.
- `buildNatAttendanceUpdate(application, action, now)` uses `Asia/Manila`, permits time-in only on the assigned date and window, forbids duplicate time-in, requires time-in before time-out, and forbids duplicate time-out.
- Database updates include `IS NULL` conditions so concurrent repeats cannot overwrite timestamps.

- [ ] **Step 1: Write failing attendance tests**

```ts
it('allows first time-in inside the assigned Manila window', () => {
  expect(buildNatAttendanceUpdate({ test_date: '2026-07-14', test_time: '08:00-12:00', time_in: null }, 'time-in', new Date('2026-07-14T01:00:00Z')))
    .toMatchObject({ status: 'Ongoing' });
});

it('rejects time-in outside the assigned date or window', () => {
  expect(() => buildNatAttendanceUpdate({ test_date: '2026-07-15', test_time: '08:00-12:00' }, 'time-in', new Date('2026-07-14T01:00:00Z'))).toThrow();
});

it('requires time-in before time-out and never overwrites time-out', () => {
  expect(() => buildNatAttendanceUpdate({ time_in: null }, 'time-out', new Date())).toThrow();
  expect(() => buildNatAttendanceUpdate({ time_in: 'x', time_out: 'y' }, 'time-out', new Date())).toThrow();
});
```

Run: `npm test -- supabase/functions/manage-nat-applications/natAttendance.test.ts`

Expected: FAIL because `natAttendance.ts` does not exist.

- [ ] **Step 2: Implement the pure attendance policy and verify green**

Use `Intl.DateTimeFormat(..., { timeZone: 'Asia/Manila' }).formatToParts(now)` and the existing `HH:mm-HH:mm` test-time format. Keep the existing 08:00-12:00 and 13:00-17:00 fallback when no time window is stored.

- [ ] **Step 3: Apply rate limits and atomic conditional updates**

Import `enforceRateLimit` and `LOGIN_RATE_LIMIT` from `_shared/rateLimit.ts`. Run the seeded login limiter before password work and a separate public-stat limiter before aggregation. Replace unconditional attendance overwrites with the pure policy plus `.is('time_in', null)` or `.is('time_out', null)`.

---

### Task 5: Shared-browser draft privacy

**Files:**
- Modify: `src/pages/NATPortal.tsx`
- Modify: `src/pages/public/nat/components/ApplicationWizard.tsx`

**Interfaces:**
- Full NAT drafts live in `sessionStorage`, not persistent `localStorage`.
- Drafts still restore within the same tab and still clear after successful submission.

- [ ] **Step 1: Replace draft storage with tab-scoped storage**

```ts
window.sessionStorage.getItem(NAT_APPLICATION_DRAFT_STORAGE_KEY);
window.sessionStorage.setItem(NAT_APPLICATION_DRAFT_STORAGE_KEY, JSON.stringify(payload));
window.sessionStorage.removeItem(NAT_APPLICATION_DRAFT_STORAGE_KEY);
```

- [ ] **Step 2: Update the user-facing draft copy**

Say “this browser tab” rather than “this device.” No extra draft abstraction or inactivity timer is needed because closing the tab already clears the data.

---

### Task 6: Verification and review

**Files:**
- Review all files changed by Tasks 1-5; do not modify unrelated dirty files.

- [ ] **Step 1: Run targeted security tests after each red/green cycle**

```powershell
npm test -- supabase/functions/activate-student-account/natActivation.test.ts `
  supabase/functions/manage-nat-applications/natSecurity.test.ts `
  supabase/functions/manage-nat-applications/natAttendance.test.ts `
  supabase/functions/_shared/randomPassword.test.ts `
  supabase/functions/_shared/turnstile.test.ts `
  src/lib/studentActivationErrors.test.ts
```

- [ ] **Step 2: Run repository checks**

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

- [ ] **Step 3: Validate migration syntax locally if Docker is available**

```powershell
npx --no-install supabase db reset --local
npx --no-install supabase migration list --local
```

If Docker/local Supabase is unavailable, report that precisely and perform read-only production metadata checks without applying the migration.

- [ ] **Step 4: Review the final diff and Supabase advisors**

Confirm no Student ID verification was added, direct anon application insertion is gone, activation derives the application from the NAT session, and no secret or production resource changed. Run read-only security advisors against project `ydbpzzbbiwhlwqmweqzj`; do not apply or deploy anything.

