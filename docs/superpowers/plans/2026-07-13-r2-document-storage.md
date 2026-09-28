# Private R2 Document Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Subagents are unavailable in this side conversation. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move every persistent document upload to private Cloudflare R2, keep legacy Google Drive and Supabase Storage references readable, and provide a resumable verified migration.

**Architecture:** One authenticated Supabase Edge Function authorizes structured document operations and signs short-lived R2 S3 requests. One frontend service performs direct browser-to-R2 uploads, while the existing stored-asset utilities gain dual resolution for HTTP, Supabase Storage, and `r2:` references. A local administrator script inventories and migrates legacy objects only after new uploads and dual reading are verified.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Supabase JS 2.95, Supabase Edge Functions on Deno 2, TanStack Query 5, Cloudflare R2 S3 API, `aws4fetch@1.0.20`, Vitest 2.

## Global Constraints

- Keep `care-documents-prod` private; never enable public `r2.dev` or a public custom domain.
- Store only `r2:<object-key>` references in database fields, never signed URLs.
- Upload URLs expire after 600 seconds; viewing URLs expire after 300 seconds.
- Every included file is nonempty, at most 1 MiB, and limited to its category's MIME allowlist.
- Use internal `students.id` in R2 keys; never names, email addresses, departments, or school student IDs.
- Derive student ownership from `students.auth_user_id` and staff identity from `staff_accounts.auth_user_id`.
- Do not expose R2 credentials in frontend code, logs, `VITE_*` variables, migration reports, or committed files.
- Do not delete or alter permissions on Google Drive, Supabase Storage, or referenced R2 objects during implementation or migration.
- Do not create commits, branches, or pull requests unless the user explicitly requests them.
- Preserve the unrelated existing `CACHING_AUDIT.md` modification.

---

### Task 1: Pure document policy and object-key contract

**Files:**
- Create: `supabase/functions/_shared/r2DocumentPolicy.ts`
- Test: `supabase/functions/_shared/r2DocumentPolicy.test.ts`

**Interfaces:**
- Produces `R2DocumentCategory`, `R2Actor`, `R2Resource`, `validateUploadMetadata`, `buildR2ObjectKey`, `parseR2Reference`, `canViewR2Resource`, and `canUploadR2Resource`.
- Later Edge Function and migration tasks consume these exact exports.

- [ ] **Step 1: Write failing policy tests**

Cover the fixed category union and exact behavior:

```ts
expect(validateUploadMetadata('profile-photo', 'image/jpeg', 1)).toEqual({ extension: 'jpg' })
expect(() => validateUploadMetadata('profile-photo', 'application/pdf', 100)).toThrow('Unsupported file type.')
expect(() => validateUploadMetadata('claim-pwd', 'application/pdf', 0)).toThrow('File is empty.')
expect(() => validateUploadMetadata('support-student', 'image/png', 1024 * 1024 + 1)).toThrow('File must be under 1 MB.')

expect(buildR2ObjectKey({
  category: 'claim-pwd', studentDbId: 245, objectId: 'fixed-uuid', extension: 'pdf'
})).toBe('students/245/profile/claims/pwd/fixed-uuid.pdf')

expect(parseR2Reference('r2:students/245/profile/photo/a.jpg'))
  .toBe('students/245/profile/photo/a.jpg')
expect(parseR2Reference('https://drive.google.com/file/d/x/view')).toBeNull()
```

Also test student ownership, Admin/Care Staff/Registrar profile access, matching Department Head access, Registrar denial for support records, and cross-department denial.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run supabase/functions/_shared/r2DocumentPolicy.test.ts`

Expected: FAIL because `r2DocumentPolicy.ts` does not exist.

- [ ] **Step 3: Implement the minimum pure policy**

Define this category contract:

```ts
export type R2DocumentCategory =
  | 'profile-photo'
  | 'claim-pwd'
  | 'claim-indigenous'
  | 'claim-four-ps'
  | 'claim-solo-parent'
  | 'claim-senior-citizen'
  | 'support-student'
  | 'support-endorsement'
  | 'attendance-proof';

export type R2ClaimCategory = Extract<R2DocumentCategory,
  | 'claim-pwd'
  | 'claim-indigenous'
  | 'claim-four-ps'
  | 'claim-solo-parent'
  | 'claim-senior-citizen'
>;

export const MAX_R2_DOCUMENT_BYTES = 1024 * 1024;
```

Map image categories to `image/jpeg`, `image/png`, and `image/webp`; map document categories to those three plus `application/pdf`. Generate extensions only from MIME type. Validate numeric positive `studentDbId`, UUID-like generated IDs, integer support/event IDs, and exact category prefixes. Authorization functions must be pure predicates over server-resolved actor/resource data.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run supabase/functions/_shared/r2DocumentPolicy.test.ts`

Expected: PASS.

---

### Task 2: R2 signing client and authenticated Edge Function

**Files:**
- Create: `supabase/functions/_shared/r2Client.ts`
- Create: `supabase/functions/manage-r2-documents/index.ts`
- Create: `supabase/functions/manage-r2-documents/handler.ts`
- Test: `supabase/functions/manage-r2-documents/handler.test.ts`

**Interfaces:**
- Consumes Task 1 policy functions.
- Produces Edge actions `create-upload`, `complete-upload`, `create-view`, and `create-view-batch`.
- `create-upload` returns `{ success: true, uploadUrl, objectKey, contentType, uploadGroupId? }`.
- `complete-upload` returns `{ success: true, storedReference: `r2:${string}` }`.
- View actions return `{ success: true, url, expiresAt }` or a keyed result map.

- [ ] **Step 1: Write failing handler tests with injected dependencies**

Use real policy code and small fake dependency functions—never real secrets. Verify:

```ts
await expect(handleR2DocumentRequest(unauthenticatedRequest, deps)).resolves.toMatchObject({ status: 401 })
await expect(handleR2DocumentRequest(crossStudentViewRequest, deps)).resolves.toMatchObject({ status: 403 })
await expect(handleR2DocumentRequest(validUploadRequest, deps)).resolves.toMatchObject({
  status: 200,
  body: { success: true, contentType: 'image/jpeg' }
})
```

Also verify the server-derived `students.id` appears in the key, a browser-supplied student ID is ignored, denied batch entries are omitted, invalid `HEAD` metadata is rejected, and no response contains an R2 secret or service-role key.

- [ ] **Step 2: Run the handler test and verify RED**

Run: `npx vitest run supabase/functions/manage-r2-documents/handler.test.ts`

Expected: FAIL because the handler is missing.

- [ ] **Step 3: Implement the pinned R2 client**

Import `AwsClient` only in the Edge/migration runtime:

```ts
import { AwsClient } from 'npm:aws4fetch@1.0.20';
```

Construct it with `service: 's3'`, `region: 'auto'`, `retries: 2`. Build path-style URLs from the configured `R2_ENDPOINT`, `R2_BUCKET`, and encoded object-key segments. For query signing, set `X-Amz-Expires` before `aws.sign(..., { aws: { signQuery: true } })`. Sign `PUT` with the exact `Content-Type`, sign `GET` for 300 seconds, and use authenticated header-signed `HEAD` internally for final verification.

- [ ] **Step 4: Implement authentication and authoritative locators**

The handler must:

```ts
type R2DocumentLocator =
  | { category: 'profile-photo' | R2ClaimCategory; studentId: string }
  | { category: 'support-student'; requestId: number; index: number }
  | { category: 'support-endorsement'; requestId: number }
  | { category: 'attendance-proof'; attendanceId: number };
```

`create-view-batch` accepts `{ entries: Array<{ key: string; locator: R2DocumentLocator }> }` with at most 100 entries and returns `{ success: true, urls: Record<string, string | null>, expiresAt: string }`. Each entry is authorized separately.

Verify the bearer token with `auth.getUser(token)`, resolve both possible account rows by `auth_user_id`, reject ambiguous/missing identities, and load the target database row before policy evaluation. For support endorsement, parse `care_notes` with the existing `{ notes, letter_path }` compatibility shape. For legacy Supabase paths, return a short Supabase signed URL; for HTTP references, return the unchanged URL; for `r2:` references, sign R2 only after row authorization.

- [ ] **Step 5: Implement the Deno entry point**

`index.ts` handles `OPTIONS`, accepts only `POST`, creates server clients from Supabase-provided secrets, checks all five R2 secrets once, calls the handler, and returns generic JSON errors. Keep JWT verification enabled by default and still verify the user inside the handler.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `npx vitest run supabase/functions/_shared/r2DocumentPolicy.test.ts supabase/functions/manage-r2-documents/handler.test.ts`

Expected: PASS.

---

### Task 3: Frontend upload service and dual asset resolver

**Files:**
- Create: `src/services/r2DocumentService.ts`
- Test: `src/services/r2DocumentService.test.ts`
- Modify: `src/utils/storageAssets.ts`
- Test: `src/utils/storageAssets.test.ts`
- Create: `src/hooks/useResolvedDocumentUrl.ts`

**Interfaces:**
- Produces `uploadR2Document(file, request): Promise<{ storedReference: string; uploadGroupId?: string }>`.
- Produces `resolveDocumentLocator(locator): Promise<string | null>` and `useResolvedDocumentUrl(locator, storedValue)`.
- Existing `resolveStoredAssetUrl`, `resolveStoredAssetUrlsBulk`, and `openStoredAsset` retain legacy behavior and gain a locator parameter required only for `r2:` values.

Use this upload request union:

```ts
type R2UploadRequest =
  | { category: 'profile-photo' | R2ClaimCategory }
  | { category: 'support-student'; uploadGroupId?: string }
  | { category: 'support-endorsement'; requestId: number }
  | { category: 'attendance-proof'; eventId: number };
```

- [ ] **Step 1: Write failing upload-service tests**

Stub `invokeEdgeFunction` and global `fetch`. Verify exact order:

```ts
create-upload -> PUT file with exact Content-Type -> complete-upload
```

Verify a failed `PUT` prevents completion, a failed completion returns no stored reference, and validation rejects bad files before any network request.

- [ ] **Step 2: Run service tests and verify RED**

Run: `npx vitest run src/services/r2DocumentService.test.ts src/utils/storageAssets.test.ts`

Expected: FAIL because the service and R2 resolver behavior are missing.

- [ ] **Step 3: Implement the minimum upload service**

Call `invokeEdgeFunction('manage-r2-documents', { requireAuth: true, body })`, perform direct `fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: file })`, require `response.ok`, then finalize. Do not store signed URLs or upload metadata in local/session storage.

- [ ] **Step 4: Extend, rather than replace, stored-asset utilities**

Add:

```ts
export const isR2Reference = (value: unknown) => String(value || '').startsWith('r2:');
```

For HTTP and legacy Supabase paths, preserve current behavior. For `r2:` values, require an authoritative locator and call `create-view`; never call `getPublicUrl`. The hook uses a TanStack query key containing only the locator and stored reference, with `staleTime` below 300 seconds and no browser persistence.

- [ ] **Step 5: Run service/resolver tests and verify GREEN**

Run: `npx vitest run src/services/r2DocumentService.test.ts src/utils/storageAssets.test.ts`

Expected: PASS.

---

### Task 4: Cut profile and claim uploads over to R2

**Files:**
- Modify: `src/pages/student/features/profile/components/ProfileCompletionModal.tsx`
- Modify: `src/pages/student/features/profile/hooks/useStudentProfileForm.ts`
- Modify: `src/pages/student/features/profile/components/ProfileView.tsx`
- Modify: `src/pages/student/features/profile/components/steps/PersonalInformationStep.tsx`
- Modify: `src/pages/carestaff/features/population/hooks/useCareStaffPopulation.ts`
- Modify: `src/pages/carestaff/features/population/components/StudentProfileModal.tsx`
- Modify: `src/pages/carestaff/features/population/components/IdSwapModal.tsx`
- Modify: `src/pages/admin/features/students/components/IdSwapModal.tsx`
- Modify: `src/pages/registrar/RegistrarStudentPopulationPage.tsx`
- Test: `src/pages/student/features/profile/components/ProfileCompletionModal.test.tsx`

**Interfaces:**
- Consumes `uploadR2Document` and locator-based resolution from Task 3.
- Keeps all existing database payload field names and managed profile update calls.

- [ ] **Step 1: Add failing regression tests**

Verify profile completion maps each field to the correct category:

```text
profile_picture_url -> profile-photo
pwd_document_url -> claim-pwd
ip_document_url -> claim-indigenous
four_ps_document_url -> claim-four-ps
solo_parent_document_url -> claim-solo-parent
senior_citizen_document_url -> claim-senior-citizen
```

Verify later profile-photo editing calls the same service and existing HTTP values still render unchanged.

- [ ] **Step 2: Run the focused profile tests and verify RED**

Run: `npx vitest run src/pages/student/features/profile/components/ProfileCompletionModal.test.tsx`

Expected: FAIL because uploads still call `driveService`.

- [ ] **Step 3: Replace only persistent profile upload calls**

Replace every `driveService.uploadFile` call in the listed profile files: profile completion photo, all claim documents, later profile-photo editing, and later claim-document editing. Callers store `result.storedReference`. Leave `driveService.ts` and `upload-to-drive` temporarily because migration and rollback still need Google compatibility. Preserve existing save payloads, notifications, toasts, and query invalidation.

- [ ] **Step 4: Resolve R2 profile images and claim links by locator**

Update profile image consumers to use resolved URLs rather than passing `r2:` directly to `<img>`. Provide `studentId` locators to profile/claim document actions and include `student_id` in any row query that lacks it. Keep local `blob:` preview URLs synchronous.

- [ ] **Step 5: Run profile tests and verify GREEN**

Run: `npx vitest run src/pages/student/features/profile/components/ProfileCompletionModal.test.tsx src/services/r2DocumentService.test.ts src/utils/storageAssets.test.ts`

Expected: PASS.

---

### Task 5: Cut support documents and endorsements over to R2

**Files:**
- Modify: `src/pages/student/features/support/components/SupportFormModal.tsx`
- Modify: `src/pages/student/features/support/components/SupportView.tsx`
- Modify: `src/pages/carestaff/features/support/hooks/useCareStaffSupport.tsx`
- Modify: `src/pages/carestaff/features/support/components/CareStaffSupportPage.tsx`
- Modify: `src/pages/dept/features/support/components/DeptSupportApprovalsPage.tsx`
- Test: `src/pages/student/features/support/components/SupportFormModal.test.tsx`
- Test: `src/pages/carestaff/features/support/hooks/useCareStaffSupport.test.tsx`

**Interfaces:**
- Student upload requests use `{ category: 'support-student', uploadGroupId? }` and reuse the first server-returned group ID for up to four files.
- Endorsements use `{ category: 'support-endorsement', requestId }`.
- Existing `documents_url` JSON arrays and `care_notes` JSON shapes remain unchanged except their stored paths become `r2:` references.

- [ ] **Step 1: Write failing support tests**

Verify up to four student documents are uploaded through R2, returned references are JSON encoded without filename leakage, and a failed file prevents support-row insertion. Verify endorsement upload includes the selected support request ID and preserves notes as:

```ts
JSON.stringify({ notes: supportForm.care_notes, letter_path: r2Reference })
```

- [ ] **Step 2: Run support tests and verify RED**

Run: `npx vitest run src/pages/student/features/support/components/SupportFormModal.test.tsx src/pages/carestaff/features/support/hooks/useCareStaffSupport.test.tsx`

Expected: FAIL because both paths still use Supabase Storage.

- [ ] **Step 3: Replace support upload calls and pass structured locators when opening**

Remove only the relevant `.storage.from('support_documents').upload(...)` calls. Preserve existing inserts and managed CARE forwarding. For viewing student documents, pass request ID and array index. For endorsement viewing, pass request ID. Do not grant Registrar access.

- [ ] **Step 4: Run support tests and verify GREEN**

Run: `npx vitest run src/pages/student/features/support/components/SupportFormModal.test.tsx src/pages/carestaff/features/support/hooks/useCareStaffSupport.test.tsx src/utils/storageAssets.test.ts`

Expected: PASS.

---

### Task 6: Cut attendance proof uploads over to R2

**Files:**
- Modify: `src/pages/student/features/events/hooks/useStudentEventActions.ts`
- Modify: `src/pages/carestaff/features/events/hooks/useCareStaffEvents.tsx`
- Test: `src/pages/student/features/events/hooks/useStudentEventActions.test.ts`

**Interfaces:**
- Upload consumes `{ category: 'attendance-proof', eventId }`.
- View consumes `{ category: 'attendance-proof', attendanceId }`.
- `event_attendance.proof_url` continues storing a string, now the returned `r2:` reference.

- [ ] **Step 1: Write a failing attendance regression test**

Verify the proof is uploaded before attendance insertion, the insert stores the returned `r2:` reference, a failed upload prevents attendance insertion, and duplicate-attendance behavior remains unchanged.

- [ ] **Step 2: Run the attendance test and verify RED**

Run: `npx vitest run src/pages/student/features/events/hooks/useStudentEventActions.test.ts`

Expected: FAIL because attendance still uses the `attendance_proofs` Supabase bucket.

- [ ] **Step 3: Replace the upload and add authorized viewing**

Replace the single Supabase upload with `uploadR2Document(proofFile, { category: 'attendance-proof', eventId: event.id })` and store `result.storedReference`. Preserve geolocation checks, duplicate checks, registration synchronization, count synchronization, and existing error messages. Resolve proofs by attendance-row ID for Care Staff and authorized Department Head views.

- [ ] **Step 4: Run the attendance test and verify GREEN**

Run: `npx vitest run src/pages/student/features/events/hooks/useStudentEventActions.test.ts`

Expected: PASS.

---

### Task 7: Resumable Google Drive and Supabase Storage migration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/r2-migration/model.mjs`
- Create: `scripts/r2-migration/model.node-test.mjs`
- Create: `scripts/migrate-documents-to-r2.mjs`
- Create: `.env.r2-migration.example`

**Interfaces:**
- Command: `npm run migrate:r2:dry-run`
- Command: `npm run migrate:r2 -- --execute`
- Default mode writes a private inventory/manifest under ignored `backups/r2-migration/` and performs no database writes or R2 uploads.
- Execute mode requires the literal `--execute` flag.

- [ ] **Step 1: Install the one justified zero-dependency signer**

Run: `npm install aws4fetch@1.0.20`

Expected: `package.json` and `package-lock.json` record exactly `aws4fetch@1.0.20`. It is used by the administrator migration script; the frontend does not import it.

- [ ] **Step 2: Write failing migration-model tests with Node's built-in runner**

Test Drive ID extraction, thumbnail normalization, Supabase source classification, deterministic destination keys, JSON array replacement, CARE notes replacement without losing `notes`, existing `r2:` skip behavior, and unresolved/multiple-match refusal.

Run: `node --test scripts/r2-migration/model.node-test.mjs`

Expected: FAIL because `model.mjs` is missing.

- [ ] **Step 3: Implement pure migration modeling and verify GREEN**

Implement pure functions only, then run:

`node --test scripts/r2-migration/model.node-test.mjs`

Expected: PASS.

- [ ] **Step 4: Implement inventory and dry-run as the default**

Read these exact fields and classify every reference:

```text
students.profile_picture_url
students.pwd_document_url
students.ip_document_url
students.four_ps_document_url
students.solo_parent_document_url
students.senior_citizen_document_url
support_requests.documents_url
support_requests.care_documents_url
support_requests.care_notes letter_path/letter_url
event_attendance.proof_url
```

Use native `fetch` for Google OAuth refresh/list/download, the installed Supabase client for database and legacy Storage downloads, and `aws4fetch` for R2. The report contains identifiers, original value, planned key, byte size/checksum when known, status, and error—never credentials or file bytes.

- [ ] **Step 5: Implement guarded execute mode**

Process batches of 20 with three concurrent items and at most three attempts. Per item: download, validate, upload deterministic key, authenticated `HEAD`, compare size/checksum where available, update only the exact field/JSON entry, append manifest result. Failures keep the original value. Skip existing `r2:` references and already verified manifest entries.

- [ ] **Step 6: Add ignored environment template and package commands**

The committed example contains names only:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=care-documents-prod
R2_ENDPOINT=
```

Real `.env.r2-migration.local` remains ignored by the existing `.env.*` rule. Commands use Node's `--env-file=.env.r2-migration.local` support.

- [ ] **Step 7: Run a dry-run only**

Run: `npm run migrate:r2:dry-run`

Expected: inventory report written under `backups/r2-migration/`, zero database updates, zero R2 uploads. If credentials are unavailable, stop after local unit tests and report the exact missing variables; never fabricate success.

Do not run `--execute` without a separate user approval after the dry-run report is reviewed.

---

### Task 8: Full verification and deployment handoff

**Files:**
- Modify only files required by failures caused by Tasks 1–7.

- [ ] **Step 1: Run focused security tests**

Run:

```text
npx vitest run supabase/functions/_shared/r2DocumentPolicy.test.ts supabase/functions/manage-r2-documents/handler.test.ts src/services/r2DocumentService.test.ts src/utils/storageAssets.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the repository check suite**

Run: `npm run check`

Expected: lint, typecheck, all Vitest tests, and production build pass.

- [ ] **Step 3: Inspect the final diff and secret safety**

Run:

```text
git diff --check
git diff --stat
rg -n "R2_SECRET_ACCESS_KEY|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_REFRESH_TOKEN" src supabase scripts docs --glob '!*.example'
```

Expected: no secret values, only environment-variable name lookups; no unrelated changes.

- [ ] **Step 4: Stop for deployment approval after local checks**

Report the local check results and request explicit approval before changing the linked production project. After approval, discover the current CLI command with `npx supabase functions deploy --help`, then deploy only `manage-r2-documents` without changing secrets.

- [ ] **Step 5: Run non-production live smoke tests**

With test accounts/files, verify private direct access fails; signed upload, `HEAD` finalization, and signed view succeed; expiry and all cross-role denials work; browser network output contains no credentials. Confirm one new upload in every category before allowing migration execution.

- [ ] **Step 6: Stop at the migration approval gate**

Report changed files, commands, check results, live test results, dry-run counts, unresolved Drive matches, and remaining risks. Request explicit approval before `npm run migrate:r2 -- --execute`. Cleanup of old providers remains a later, separate approval.
