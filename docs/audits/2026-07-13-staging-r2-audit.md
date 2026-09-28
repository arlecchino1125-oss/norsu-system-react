# Staging Branch Audit — R2 Migration (2026-07-13)

Deep audit of the staging branch changes (9 commits + working tree, 137 files) covering the
Google Drive → Cloudflare R2 document migration, the NAT login hardening (PBKDF2 + Turnstile
CAPTCHA), and the new in-portal document preview modal.

## Migration state at audit time

- Full migration executed 2026-07-13 19:08 (+08): 3,122 references flipped to `r2:` object keys.
- Verification dry-run 19:44: 3,126 references already-r2, 15,388 empty fields, 2 unresolved.
- The 2 unresolved items are profile pictures on students rows 1102 and 1237 whose Google Drive
  files no longer exist ("No Drive file matched the stored reference") — broken before migration.
- Production main branch (origin/main dab86bb, Jul 10) was NOT yet merged at audit time: the
  deployed frontend cannot read `r2:` references, so production documents/avatars are degraded
  until staging merges to main.

## Findings triage

### Resolved / obsolete (dropped)

- **F1 — PDF preview CSP frame-src**: DocumentPreviewModal renders PDFs in an iframe pointing at
  the R2 host. Initially flagged because vercel.json frame-src lacked the R2 origin; verified
  already fixed in commit 6c61701 (frame-src includes the care-documents-prod R2 host).
  Residual action: the matching public/_headers change is uncommitted and must be committed.
- **F2 — Legacy Drive documents dead-end in preview modal**: obsolete. The full flip completed;
  only 2 dead Drive references remain and their source files are deleted, so no fallback could
  serve them. No Drive fallback needed in DocumentPreviewModal.

### Open — needs decision (F3)

- **F3 — NAT captcha gate can block exam time-in**: the Turnstile gate on manage-nat-applications
  applies to all password-carrying modes (login, session, time-in, time-out). The NAT dashboard
  has no Turnstile widget, so while an attacker keeps a username's captcha window alive, that
  applicant's time-in/time-out buttons fail with 403. Escape hatch: logging out and back in with
  the CAPTCHA clears the counter. Options: render the widget in the dashboard on 403, or exempt
  post-login modes. Severity LOW-MEDIUM; deliberate spec tradeoff, revisit before the next NAT
  exam day.

### Accepted / cosmetic (no action)

- **F4 — presigned URL vs cache staleTime**: useResolvedDocumentUrl staleTime 240s vs 300s R2 URL
  expiry; idle pages >5 min can show a broken thumbnail until a refetch trigger. Cosmetic.
- **F5 — migration extension resolution trusts filename over MIME**: resolveMigrationExtension
  prefers the name extension; a mislabeled legacy file migrates under its claimed extension.
  Migration-only surface; spot-check of the execute report recommended.
- **F6a — username-exists oracle**: 403-under-captcha vs 401-unknown distinguishes real NAT
  usernames. Mitigated by the 700ms failure delay; accepted.
- **F6b — sanitizeNatApplication returns failed_login_attempts/captcha_required_until** to the
  logged-in applicant. Harmless self-data; trivial strip if desired.
- **F6c — HEIC preview requires bucket CORS GET** from the exact origin; fails silently on
  non-whitelisted per-deploy preview URLs. Deployment caveat, not a code bug.

## Verified sound (looked for, not found)

- No cross-student access paths in r2DocumentPolicy (canViewR2Resource/canUploadR2Resource) or
  the objectKeyMatchesResource key-shape regexes, including migrated-key variants.
- No captcha bypass routes across NAT modes; gate runs before password verification.
- No hash downgrade path: pbkdf2$ prefix cannot collide with 64-hex legacy SHA-256 values;
  legacy hashes upgrade in place after successful login.
- Path traversal rejected at parseR2Reference and r2Client (.., backslash, double slash).

## Post-cutover cleanup backlog

- Delete src/services/driveService.ts (zero callers) and its dead import in StudentPortalPage.
- Delete the upload-to-drive edge function after merge confidence.
- Remove GOOGLE_* Supabase secrets once migration re-runs are no longer needed.
- Google Drive folder is retained untouched as the rollback/archive copy.
