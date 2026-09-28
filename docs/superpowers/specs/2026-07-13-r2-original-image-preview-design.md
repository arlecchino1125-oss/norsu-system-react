# Private Document Viewer and Local Archive Design

## Goal

Keep student documents private and preserve every original file unchanged. Normal portal access must display files inside an authorized modal without offering a Download button or triggering a browser download prompt. The only intentional bulk download is a CARE Staff local archive export.

## In-Portal Viewer

Use one shared modal for every portal that can view private documents. Existing role, ownership, and department checks remain in `manage-r2-documents`; the browser never receives R2 credentials or unrestricted object keys.

- JPG, PNG, WebP, and ICO images display in the modal.
- HEIC and HEIF files are fetched through a five-minute authorized URL, converted to a temporary JPEG in browser memory, and displayed in the same modal.
- PDFs display in an embedded PDF viewer inside the modal.
- Loading, conversion, unsupported-file, expired-link, and access-denied states appear inside the modal.
- Closing the modal revokes generated Blob URLs and releases temporary file memory.
- The modal has no Download button and does not navigate to the signed R2 URL.
- Clicking a profile photo opens it in the same modal used for profile documents.
- Profile photos, claim documents, support documents, endorsement letters, and attendance proofs use the shared viewer only where the current role is already authorized to see them.

Viewing necessarily transfers file bytes to the authorized browser. The portal can prevent automatic downloads and omit download controls, but it cannot prevent screenshots, developer tools, or the browser's own save features.

## Original File Rules

- Never overwrite, convert in place, delete, or replace an original file.
- Browser-generated previews are temporary and are not uploaded to R2.
- Existing JPG, PNG, WebP, PDF, HEIC, HEIF, and ICO R2 objects remain unchanged.
- Database references continue to point to the original private object.
- Legacy Google Drive and Supabase references retain their current fallback until their database references are migrated to R2.

## CARE Staff Local Archive

Replace expiring document links in the population export with an offline ZIP archive:

```text
NORSU_CARE_Student_Archive_YYYY-MM-DD.zip
|-- Students.xlsx
|-- manifest.json
`-- students/
    `-- {student_id}-{students.id}/
        |-- profile/
        |   `-- photo/{original-file}
        |-- claims/
        |   |-- pwd/{original-file}
        |   |-- indigenous/{original-file}
        |   |-- four-ps/{original-file}
        |   |-- solo-parent/{original-file}
        |   `-- senior-citizen/{original-file}
        |-- support/{request-id}/
        |   |-- student-documents/{original-files}
        |   `-- endorsement/{original-file}
        `-- attendance/{event-id}/{original-file}
```

`Students.xlsx` keeps the existing active-student profile columns. File cells contain relative archive paths instead of temporary URLs. `manifest.json` records the export time, counts, source database IDs, relative paths, sizes, hashes when available, and any failed items.

The archive streams directly to a file selected by CARE Staff so the browser does not hold the full archive in memory. It requests authorized URLs in batches, fetches files sequentially with bounded concurrency, and writes original bytes into the ZIP. The UI shows discovered files, completed files, transferred bytes, failures, and Cancel.

The first version does not resume after closing or refreshing the browser. A failed export produces an incomplete manifest and must be restarted.

## Security

- Only authenticated CARE Staff with the existing export permission may create the complete archive. Registrar, Department Head, Admin, and Student accounts do not receive this bulk-download action.
- Registrar keeps the existing student-profile viewing scope: profile information, profile photos, and authorized profile claim documents. The modal changes presentation only and does not grant Registrar access to CARE support documents, endorsement letters, or attendance proofs.
- Department Head access and department restrictions remain unchanged.
- Use the existing authorization resolver for every file; do not expose service-role or R2 credentials to the frontend.
- Generate signed links shortly before each batch is downloaded so five-minute expiry does not invalidate the full export.
- Spreadsheet file cells contain safe relative paths, not formulas or expiring URLs.
- Do not change database references or R2 objects during viewing or export.

## Verification

Add focused checks proving that:

- allowed images open in the shared modal without `window.open`;
- HEIC and HEIF produce temporary previews and release Blob URLs on close;
- PDFs remain inside the modal;
- unauthorized and malformed locators never expose a preview;
- the modal provides no Download control;
- the archive uses the documented per-student paths;
- Excel contains relative paths and no signed URLs;
- archive creation preserves original bytes and records failures; and
- canceling an export stops additional file retrieval.

Run lint, typecheck, tests, and build. Live Preview verification must cover an R2 JPG, migrated HEIC claim document, PDF, expired link renewal, role restrictions, and a small test archive before attempting the complete archive.
