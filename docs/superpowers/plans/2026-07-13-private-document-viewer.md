# Private Document Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace document new-tab/download behavior with one authorized in-portal modal that previews R2 images, migrated HEIC/HEIF files, and PDFs, and make profile photos open the same modal.

**Architecture:** Keep every existing caller on the shared `openStoredAsset` path. After resolving an authorized URL, that function dispatches one typed browser event instead of calling `window.open`; a single modal mounted in `App` handles direct images, browser-memory HEIC/HEIF conversion, PDFs, loading, and errors. Existing Edge Function permissions remain authoritative.

**Tech Stack:** React 19, TypeScript, existing `Modal`, Vitest/Testing Library, dynamically imported `heic2any`.

## Global Constraints

- Do not change database references, R2 objects, role permissions, or department restrictions.
- Registrar keeps existing profile access only: profile photos and authorized profile claim documents open in the modal, with no bulk archive action.
- CARE Staff uses the modal for every document category it is already authorized to view; its complete local archive ZIP remains the separate follow-up phase described in the approved design.
- Department Head behavior and department restrictions remain unchanged.
- Profile photos open in the shared modal everywhere `ResolvedProfileImage` is already authorized and rendered.
- Do not add a Download button or navigate to the signed R2 URL.
- Keep original HEIC/HEIF bytes unchanged; previews exist only in browser memory.
- Preserve legacy URL resolution until all references are migrated.
- Do not implement the CARE Staff ZIP archive in this plan.
- Do not commit, push, or create a branch.

---

### Task 1: Route shared file opens into a preview request

**Files:**
- Modify: `src/utils/storageAssets.ts`
- Modify: `src/utils/storageAssets.test.ts`

**Interfaces:**
- Produces: `DOCUMENT_PREVIEW_EVENT` and `DocumentPreviewRequest`.
- Produces: `openStoredAsset(...)` resolving authorization exactly as before, dispatching `{ url, storedValue, label, locator }`, and returning the resolved URL.

- [ ] **Step 1: Add a failing regression test**

Test that `openStoredAsset` dispatches `DOCUMENT_PREVIEW_EVENT`, includes the authorized signed URL, and never calls `window.open`.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/utils/storageAssets.test.ts`

Expected: failure because `openStoredAsset` still calls `window.open` and dispatches no preview event.

- [ ] **Step 3: Implement the minimum shared event behavior**

Add:

```ts
export const DOCUMENT_PREVIEW_EVENT = 'care:document-preview';

export type DocumentPreviewRequest = {
    url: string;
    storedValue: string;
    label: string;
    locator?: R2DocumentLocator;
};
```

Replace `window.open` in `openStoredAsset` with:

```ts
window.dispatchEvent(new CustomEvent<DocumentPreviewRequest>(DOCUMENT_PREVIEW_EVENT, {
    detail: {
        url: resolvedUrl,
        storedValue: String(value || '').trim(),
        label: getStoredAssetLabel(value),
        locator
    }
}));
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `npx vitest run src/utils/storageAssets.test.ts`

Expected: all tests pass.

---

### Task 2: Add the shared modal with HEIC/HEIF conversion

**Files:**
- Create: `src/components/DocumentPreviewModal.tsx`
- Create: `src/components/DocumentPreviewModal.test.tsx`
- Create: `src/types/heic2any.d.ts`
- Modify: `src/App.tsx`
- Modify: `vercel.json`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `DOCUMENT_PREVIEW_EVENT` and `DocumentPreviewRequest`.
- Produces: one app-level `DocumentPreviewModal` with direct image, converted image, PDF, loading, and error states.

- [ ] **Step 1: Install the one required decoder**

Run: `npm install heic2any@0.0.4`

The decoder must be dynamically imported so ordinary JPG/PNG/WebP/PDF viewing does not load it.

- [ ] **Step 2: Add failing modal tests**

Cover these observable behaviors:

```ts
it('shows ordinary images in the modal without a download control');
it('converts HEIC to an object URL and revokes it when closed');
it('shows PDFs in an iframe inside the modal');
it('shows a useful error when conversion fails');
```

Mock `heic2any`, `fetch`, `URL.createObjectURL`, and `URL.revokeObjectURL`; do not test the decoder internals.

- [ ] **Step 3: Run the modal test and confirm it fails**

Run: `npx vitest run src/components/DocumentPreviewModal.test.tsx`

Expected: failure because the component does not exist.

- [ ] **Step 4: Implement the modal**

The component must:

- listen for `DOCUMENT_PREVIEW_EVENT`;
- detect the extension from `storedValue`, falling back to the signed URL path;
- display JPG/JPEG/PNG/WebP/ICO with `<img>`;
- fetch and convert HEIC/HEIF with `heic2any({ blob, toType: 'image/jpeg', quality: 0.9 })`;
- display PDF with a titled `<iframe>`;
- revoke only generated Blob URLs on close or replacement;
- show loading and error messages inside the existing `Modal`;
- provide only the existing modal Close control; and
- use responsive dimensions capped by the viewport.

Declare only the decoder signature used by the component in `src/types/heic2any.d.ts`.

- [ ] **Step 5: Mount the modal once**

Render `<DocumentPreviewModal />` inside `ToastProvider` and outside `Routes` in `src/App.tsx`.

Add the existing private R2 endpoint to CSP `frame-src` in `vercel.json` so authorized PDFs can render inside the modal. Keep every existing CSP source.

- [ ] **Step 6: Run focused tests**

Run: `npx vitest run src/components/DocumentPreviewModal.test.tsx src/utils/storageAssets.test.ts`

Expected: all tests pass.

---

### Task 3: Make resolved profile photos open the shared modal

**Files:**
- Modify: `src/components/ResolvedProfileImage.tsx`
- Create: `src/components/ResolvedProfileImage.test.tsx`

**Interfaces:**
- Consumes: existing `storedValue`, `studentId`, and `openStoredAsset`.
- Produces: mouse and keyboard activation that requests the authorized profile-photo preview.

- [ ] **Step 1: Add a failing accessibility regression test**

Render a resolved profile image and assert that click and Enter call:

```ts
openStoredAsset('profile-pictures', storedValue, 300, {
    category: 'profile-photo',
    studentId
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/components/ResolvedProfileImage.test.tsx`

Expected: failure because the image has no preview activation.

- [ ] **Step 3: Implement accessible activation**

Preserve caller props, add `role="button"`, `tabIndex={0}`, a zoom cursor, and Enter/Space handling. Compose any caller-provided click and key handlers; do not open when the caller prevents the event.

- [ ] **Step 4: Run focused tests**

Run: `npx vitest run src/components/ResolvedProfileImage.test.tsx src/components/DocumentPreviewModal.test.tsx src/utils/storageAssets.test.ts`

Expected: all tests pass.

---

### Task 4: Verify Step 16 viewer behavior

**Files:**
- Verify only; no additional production files.

- [ ] **Step 1: Confirm R2 CORS supports authenticated browser GET requests**

Read the bucket CORS policy and confirm the stable Vercel staging origin is allowed for `GET`.

Audit every `openStoredAsset` caller and confirm profile claims, student support documents, CARE endorsements, attendance proofs, and role-authorized profile documents all use the shared path. Search for remaining direct `window.open` document behavior and keep unrelated navigation unchanged.

Confirm the existing Edge Function regression suite still proves that students cannot view CARE endorsements, Registrar receives no CARE-support expansion, and Department Head access stays department-restricted. Do not replace authorization tests with frontend-only assertions.

- [ ] **Step 2: Run repository checks**

Run:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: no errors; existing unrelated lint warnings may remain documented.

- [ ] **Step 3: Deploy Preview frontend if git-connected**

Use the existing Vercel staging-branch deployment flow. Do not promote to main.

- [ ] **Step 4: Manually verify the migrated PWD case**

In Vercel Preview as CARE Staff, open student `420132728` and click the PWD document. Confirm:

- `manage-r2-documents` returns `200`;
- the HEIC displays inside the modal;
- no browser download prompt appears;
- no Download control appears;
- closing releases the preview; and
- the profile photo opens in the same modal.
