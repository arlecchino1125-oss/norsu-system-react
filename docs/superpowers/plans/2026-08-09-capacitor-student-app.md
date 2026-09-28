# Capacitor Student App (OTA on Git Push) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the student portal as an installable **Capacitor Android app** that receives web updates automatically on `git push` (OTA via remote WebView), **without breaking the browser version** and **without touching the student portal's existing feature logic** except additive, native-guarded seams.

**Architecture:** The APK is a thin Android WebView shell pointing at the **canonical domain** (`https://norsugcare.space`) via `capacitor.config.ts → server.url` (remote mode). The app therefore loads the *same* deployed SPA the browser gets — so every `commit → push → Cloudflare Pages deploy` updates both. No web assets are bundled into the APK (no app-store re-release needed). All `@capacitor/*` plugin usage is gated behind `Capacitor.isNativePlatform()` + dynamic `import()` so the browser bundle never contains native code.

**Canonical host (verified 2026-08-09):** `norsugcare.space` is served by **Cloudflare Pages** (`Server: cloudflare`, `CF-RAY`, `cf-nel`; **no** `x-vercel-id` on any response). Cloudflare Pages is **git-connected to `main`** (auto-deploys on push). Vercel is a shadow deploy (also `main`) reachable only via its `*.vercel.app` URL. Both share `public/_headers` + `public/_redirects`, so headers are identical on either host.

## Global Constraints

- **Student portal only.** Do not modify staff/public portal code. Do not modify the student portal's routing, auth, or feature components except additive guarded seams below.
- **Browser must be unaffected.** No top-level `@capacitor/*` imports anywhere reachable from the browser. Rule: `isNative()` guard + dynamic `import()` only.
- **No `index.html` CSP/meta changes** unless we later adopt bundled mode (currently out of scope). Keep `vercel.json` and `public/_headers` unchanged (or additive-loosening only).
- Keep Vercel/CF build = `npm run build` → `dist/`. Do not change `vercel.json` rewrites or `outputDirectory`. Leave legacy `dist-student/` untouched.
- Auth stays in `localStorage` (works in WebView); no storage-migration work in this plan.
- Env parity: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` must match between Cloudflare Pages and Vercel (both deployed from `main` — verify values are identical in both dashboards).
- `server.url` **must not** point at the `*.vercel.app` URL; it is pinned to `https://norsugcare.space`. If the domain ever moves to Vercel, update this.
- Quality gate before every commit: `npm run check` (lint + typecheck + test + build). Current baseline: 439 tests green.
- Code style: 4-space indent, single quotes, comments explain *why*.

## Decisions (from earlier audit/verification)

- **Claude-blocker #2 (R2 CORS):** NOT a blocker in remote mode — WebView origin stays the domain, identical to the browser. Skip (`@capacitor/http` not needed). Only blocks *bundled* mode.
- **Claude-blocker #4 (CSP):** NOT a blocker in remote mode — host headers (`public/_headers`) apply to the WebView too. Do **not** add a meta CSP (rate it as a web regression risk if misconfigured).
- **Claude-blocker #1/#5/#6 (PDF preview, offline, photo capture):** real web bugs too → fixed in Phase 2 (benefits site and app).
- **Claude-blocker #3 (reset-password deep link):** requires `appUrlOpen` + App Links (assetlinks.json on the domain) to open in-app instead of Chrome.
- **Claude-blocker #7 (account deletion):** demoted; optional DPA follow-up, out of scope here.
- **Adjacent (login throttle, 15 MB video, stale-on-resume):** noted as follow-ups, not blockers. Video irrelevant in remote mode.

## File Structure

| File | Responsibility |
|---|---|
| `capacitor.config.ts` | appId (`com.norsu.carecenter`), appName, `webDir: 'dist'`, `server.url: 'https://norsugcare.space'`, `androidScheme: 'https'`, `server.cleartext: false` |
| `package.json` | deps: `@capacitor/core`, `@capacitor/app`; devDeps: `@capacitor/cli`, `@capacitor/android`, `@capacitor/status-bar`, `@capacitor/splash-screen`; scripts `mobile:student:sync`, `mobile:student:open` (README-documented) |
| `src/lib/platform.ts` | `isNative()` helper (guarded `@capacitor/core` import) + `getBackButtonHandler()` / `getAppPlugin()` lazy loaders |
| `src/lib/capacitorBootstrap.ts` | Back-button → router history; `appUrlOpen` → route `/student/reset-password?token=…` in-app (matches `StudentResetPasswordPage` token flow) |
| `src/main.tsx` | Add capped one-line bootstrap call behind `isNative()` + dynamic import |
| `src/pages/student/...` (offline banner) | Additive global `online`/`offline` listeners + banner in `StudentPortalShell` |
| `src/components/DocumentPreviewModal.tsx` | PDF `<iframe>` fallback: never hang — show panel with Download / "Open in browser"; update `DocumentPreviewModal.test.tsx` |
| `src/pages/student/features/events/...` (time-in photo) | Keep web `<input type="file">`; on `isNative()` use `@capacitor/camera` `CameraSource.Camera` (forced live capture) |
| `android/` | Generated by `npx cap add android`; gitignore `android/app/build`, `android/build`, gradle caches, and the `dist/` snapshot copy |
| `.gitignore` | New Capacitor ignore entries (build outputs) |
| `public/.well-known/assetlinks.json` | App Links for the Android package (deep links) |
| `docs/superpowers/plans/2026-08-09-capacitor-student-app.md` | This plan |

> **Open decision for reviewer:** root-level Capacitor (recommended — simplest, one `webDir: 'dist'`, app loads `/student` inside the SPA) **vs** the README's `apps/student/student` layout (requires a separate student-only Vite build + second config). Recommend root-level for v1; revisit only if bundle size / feature-gating demands a student-only bundle.

## Steps

### Phase 0 — Scaffolding (web-neutral)
- [x] Verify env parity (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) between Cloudflare Pages and Vercel dashboards.
- [x] Add Capacitor deps (pin same major; README documents Capacitor 8) + npm scripts `mobile:student:sync` / `mobile:student:open`.
- [x] Create `capacitor.config.ts` (values above) + `npx cap add android`.
- [x] Add `.gitignore` entries for Android build outputs.
- [ ] Add app icon/splash assets (replace defaults).
- [x] Run `npm run check` → must stay green; confirm `dist/` has **no** `capacitor` chunk (`Select-String 'dist/assets' 'capacitor'`). *Note: Capacitor ships only in an unreached lazy `import()` chunk; the main entry is clean.*

### Phase 1 — Native-safe seams (browser never loads Capacitor)
- [x] `src/lib/platform.ts`: `isNative()` via `Capacitor.isNativePlatform()`.
- [x] `src/lib/capacitorBootstrap.ts`: back button → `window.history.back()` or close; `appUrlOpen` → handle `/student/reset-password?token=` and root.
- [x] Call bootstrap from `main.tsx` behind `isNative()` + dynamic import.
- [x] Add `public/.well-known/assetlinks.json` (**TODO before release:** replace the SHA-256 placeholder with the app-signing fingerprint via `keytool -list -v -keystore <keystore>`) so reset links open in-app.
- [ ] Optional additive: update-available check (revalidate `index.html` ETag) → "Update available, reload" toast.

### Phase 2 — Web-first fixes (shared win; each behind its own feature/test)
- [ ] **PDF preview (#1):** `DocumentPreviewModal` PDF branch — replace hanging `<iframe>` with a fallback panel (Download + "Open in browser"); update tests.
- [ ] **Offline (#5):** `online`/`offline` listeners + non-blocking banner in `StudentPortalShell`; additive.
- [ ] **Photo capture (#6):** on native only, `@capacitor/camera` `CameraSource.Camera`; web keeps file input. (Android manifest CAMERA permission only for this path.)
- [ ] Re-run `npm run check`.

### Phase 3 — Android polish
- [ ] Splash screen + status bar config; verify safe-area CSS already used.
- [ ] Wire Android back-button behavior (via Phase 1) so it never exits while mid-flow.
- [ ] Optional: offline low-bandwidth notice via `@capacitor/network` (guarded).

### Phase 4 — Verification & rollout
- [ ] `npm run check` green.
- [ ] Browser regression on a Vercel/CF preview: app boots, student login, no console errors, no `capacitor` strings in served JS.
- [ ] Native smoke test: `npx cap run android` on a device; login, time-in photo, PDF/download fallback, reset link opens in-app.
- [ ] **OTA test:** push to `main` → confirm Cloudflare Pages deploys → relaunch app → new build visible.
- [ ] Confirm domain still shows `Server: cloudflare` + no `x-vercel-id` (host unchanged).

## Non-Goals
- Bundled/offline-first app; account deletion (DPA follow-up); realtime "stale-on-resume" (follow-up); per-student login throttle (DB follow-up); iOS.