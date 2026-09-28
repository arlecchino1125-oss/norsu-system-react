# Private R2 Document Storage and Migration Design

## Scope

Move every persistent student-uploaded or staff-uploaded document to one private Cloudflare R2 bucket. Preserve existing records during a dual-read transition, then migrate files from both current storage providers.

Included categories:

- student profile photos from profile completion and later editing;
- PWD, Indigenous/IP, 4Ps, Solo Parent, and Senior Citizen claim documents;
- student additional-support documents;
- CARE staff endorsement letters; and
- event attendance proof images.

Current migration sources are:

- Google Drive for profile photos and profile claim documents; and
- Supabase Storage buckets `support_documents`, `attendance_proofs`, and any remaining `profile-pictures` objects referenced by records.

Spreadsheet imports, generated exports, form-question files parsed only in the browser, and other non-persistent files are excluded.

## Architecture

Add one authenticated Supabase Edge Function named `manage-r2-documents` and one frontend document-storage service. The browser uploads file bytes directly to the private R2 bucket with a short-lived presigned URL. File bytes do not pass through Vercel or Supabase Edge Functions, and R2 credentials remain only in server-side secrets.

The Edge Function derives the caller from the verified Supabase JWT. Student ownership is resolved through `students.auth_user_id`; staff identity, role, and department are resolved through `staff_accounts.auth_user_id`. The browser is never trusted to establish ownership, role, department, or an unrestricted object key.

Use these object-key formats:

```text
students/{students.id}/profile/photo/{uuid}.{extension}
students/{students.id}/profile/claims/{claim-category}/{uuid}.{extension}
students/{students.id}/support/{upload-group-uuid}/student-documents/{uuid}.{extension}
students/{students.id}/support/{support-request-id}/endorsement/{uuid}.{extension}
students/{students.id}/events/{event-id}/attendance/{uuid}.{extension}
```

Store the completed object as:

```text
r2:students/{students.id}/profile/photo/{uuid}.{extension}
```

The internal numeric `students.id` prevents names, emails, and school student IDs from appearing in storage paths. Department is excluded because it can change.

A support request does not have a database ID until its form is inserted, so new student support documents use a server-generated upload-group UUID. The database record becomes the authoritative association after insertion. CARE endorsements use the existing support-request ID because it is already known at upload time.

## Edge Function Operations

The function accepts JSON requests with an `action` field.

### `create-upload`

1. Require a valid Supabase user JWT.
2. Resolve the authenticated student or staff account server-side.
3. Accept a fixed document category and, where required, a support-request or event ID.
4. Check ownership, role, department, workflow state, and referenced database record.
5. Apply the category's allowed MIME types and existing 1 MiB limit.
6. Reject empty or oversized declared files.
7. Generate the extension from the accepted MIME type, never from the submitted filename.
8. Generate the complete object key server-side.
9. Return a presigned R2 `PUT` URL valid for ten minutes, the object key, and the exact required `Content-Type`.

Allowed uploaders:

- profile photo and claim documents: the student owner;
- student support documents: the student owner;
- endorsement letter: Care Staff handling the existing request; and
- attendance proof: the student owner for the referenced event.

### `complete-upload`

1. Repeat authentication and student lookup.
2. Re-resolve the caller and referenced student/entity.
3. Accept only an object key under the exact prefix issued for that caller, category, and entity.
4. Send an authenticated `HEAD` request to R2.
5. Reject missing objects, disallowed MIME types, or objects larger than 1 MiB; delete an invalid uploaded object when safe.
6. Return the stored value in `r2:<object-key>` form.

Existing application workflows remain responsible for writing their database rows after verification. This preserves current profile audit behavior, support status transitions, event attendance logic, and RLS enforcement. A failed upload or finalization must not update a database field.

### `create-view`

1. Require a valid Supabase user JWT.
2. Accept a structured locator such as document category, database record ID, field, and optional array index; do not accept a free-form R2 key.
3. Read the stored reference from the authoritative database row.
4. Apply the row's ownership, role, department, and workflow-state rules.
5. Return the unchanged HTTP URL for a legacy external file, resolve a legacy Supabase Storage path during transition, or return a presigned R2 `GET` URL valid for five minutes.

The endpoint may accept a bounded list of structured locators for screens that render many profile photos. It must authorize every result independently and omit denied entries.

Access rules:

| Document | Authorized viewers |
| --- | --- |
| Profile photo and claim documents | Student owner, Care Staff, Admin, Registrar, matching Department Head |
| Student support documents | Student owner, Care Staff, Admin, matching Department Head after the request reaches that department |
| CARE endorsement letter | Care Staff, Admin, matching Department Head |
| Event attendance proof | Student owner, Care Staff/Admin with event access, and matching Department Head where the existing attendance workflow permits it |

Registrar does not receive support, endorsement, or attendance documents. The implementation uses the project's actual role name `Department Head` for the previously described department staff.

## Frontend Flow

Create one focused document-storage service:

1. Validate the category's file type and the existing 1 MiB limit.
2. Request `create-upload` from the Edge Function.
3. Upload the `File` directly to the returned R2 URL using `PUT` with the exact signed `Content-Type`.
4. Request `complete-upload` using the returned object key.
5. Return the resulting `r2:` value to the existing caller.

Replace these new-upload paths with the service:

- profile completion photo and all five claim-document uploads;
- later profile-photo editing;
- student additional-support document uploads;
- CARE endorsement-letter uploads; and
- event attendance-proof uploads.

Extend the existing stored-asset utilities rather than creating a second resolver. During transition:

- ordinary Google Drive and other `http://` or `https://` values remain readable;
- existing Supabase Storage paths continue to receive Supabase signed URLs;
- `r2:` values receive five-minute R2 signed URLs through the Edge Function; and
- failed or expired resolutions show the existing fallback/error state without revealing storage details.

Use the existing TanStack Query cache for short-lived resolved URLs. Refresh shortly before expiry or on the next view action; do not persist signed URLs in browser storage or database columns.

## Failure and Data-Safety Rules

- If signing fails, do not upload and do not update the database.
- If the direct R2 upload fails, do not call completion and do not update the database.
- If verification fails, leave the existing database value unchanged.
- Do not delete or change permissions on previous Google Drive, Supabase Storage, or R2 objects during the upload cutover.
- Error responses must be generic to users and must not contain credentials, bucket endpoints, or internal authorization details.
- R2 secrets must never enter `VITE_*` variables or browser bundles.

An upload that reaches R2 but is never referenced may remain orphaned. This is accepted initially because files are capped at 1 MiB. Add scheduled orphan cleanup only if measurements show meaningful accumulation.

## Signing Implementation

Use a small, pinned AWS Signature Version 4 implementation compatible with Deno to generate R2 S3 presigned requests. Do not implement SigV4 cryptography manually and do not add the full AWS SDK solely for signing.

Required server secrets:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_ENDPOINT
```

## Migration Design

Migration begins only after every new-upload path writes to R2 and dual reading is verified.

### Inventory and Backup

Create a local administrator script that reads, but does not commit, credentials from an ignored environment file. Before moving bytes, export a private rollback manifest containing table, row ID, student ID, field, original value, and parsed references.

Inventory these fields:

```text
students.profile_picture_url
students.pwd_document_url
students.ip_document_url
students.four_ps_document_url
students.solo_parent_document_url
students.senior_citizen_document_url
support_requests.documents_url
support_requests.care_documents_url
support_requests.care_notes (JSON letter_path/letter_url)
event_attendance.proof_url
```

Count each source type: Google URL, Supabase Storage path/URL, existing `r2:` key, empty value, malformed value, and unresolved value. Empty categories are skipped.

### Source Resolution

For Google Drive `webViewLink` values, extract the file ID. For Google thumbnail/direct links, list the configured Drive folder with authenticated Drive API metadata and match normalized `thumbnailLink` or `webViewLink`. Never guess when zero or multiple files match.

For Supabase Storage references, derive the bucket and object path from the field/category and download with the service-role client. Do not use public URLs for migration.

### Dry Run and Execution

Use deterministic destination names based on the source provider and source object ID so reruns are idempotent. Example:

```text
students/245/profile/photo/drive-1AbCDefG.jpg
students/245/events/52/attendance/supabase-old-object-name.jpg
```

The script runs in dry-run mode by default. In execute mode it processes batches of 20 with at most three concurrent transfers and three attempts per item:

1. Resolve and authenticate the source.
2. Download and validate bytes, MIME type, and size.
3. Upload to the deterministic R2 key.
4. Verify the R2 object using `HEAD`, byte size, and checksum where available.
5. Update only the specific database field or JSON entry to `r2:<key>`.
6. Append the outcome to the private manifest.

Failures leave the original database value unchanged. Existing `r2:` values are skipped. JSON arrays and CARE note objects are updated one successful entry at a time without discarding unrelated text.

Migration order:

1. profile photos;
2. profile claim documents;
3. student support documents;
4. CARE endorsement letters and any nonempty `care_documents_url` references; and
5. attendance proofs.

### Validation, Rollback, and Cleanup

After each category, compare source counts, successful manifest entries, database `r2:` references, and actual R2 objects. Test representative Student, Care Staff, Admin, Registrar, and Department Head accounts, including cross-student and cross-department denial.

Rollback restores original field values from the private manifest. Old files remain unchanged for at least seven days of monitoring. After successful monitoring, remove public Google sharing but retain private originals for approximately 30 days. Deletion from Google Drive or Supabase Storage requires separate explicit approval and a final manifest-to-object verification.

## Tests and Verification

Add focused automated tests before production code for:

- per-category MIME and 1 MiB validation;
- server-derived student prefixes and category-specific paths;
- rejection of arbitrary keys, cross-student access, and cross-department access;
- support, endorsement, and event entity association;
- dual resolution of HTTP URLs, Supabase paths, and `r2:` references;
- JSON array and CARE note reference replacement without text loss;
- deterministic migration keys and safe resume/skip behavior; and
- failure behavior that preserves the original database value.

Then run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

Then perform a live test with non-production sample files: direct bucket access denied, signed upload succeeds, signed view succeeds, expiry works, and secrets remain absent from browser output. Deployment and live R2 verification require the configured Supabase project secrets and will be reported separately from local automated checks.

## Acceptance Criteria

- Every persistent upload category listed in scope writes new files to private R2.
- Database fields store `r2:` references, never public or temporary signed URLs.
- Existing Google Drive and Supabase Storage references remain readable during migration.
- Authorized students and staff can view or download files through temporary URLs.
- Invalid, oversized, unauthenticated, cross-student, cross-department, and arbitrary-key requests are rejected.
- Migration dry-run changes no database values.
- Execute mode updates a reference only after its R2 object is verified.
- Failed items retain their original references and can be retried safely.
- No old object is deleted without separate explicit approval.
