# NORSU G CARE System

A multi-portal student welfare and admissions management system for NORSU-Guihulngan,
built as a React single-page application backed by Supabase.

## Portals

| Portal | Route | Who uses it |
|---|---|---|
| Public landing | `/` | Everyone |
| Admin | `/admin` → `/admin/dashboard` | System administrators (incl. role permissions at `/admin/permissions`) |
| Department | `/department/login` → `/department/dashboard` | Department heads (admissions, counseling, events, students, support approvals, reports) |
| Care Staff | `/care-staff` → `/care-staff/dashboard` | CARE office staff (population, NAT, events, support, analytics, feedback) |
| Registrar | `/registrar/login` → `/registrar/dashboard` | Registrar (student population directory) |
| Student | `/student/login` → `/student` | Students (profile, events, support requests, feedback) |
| NAT | `/nat` | Self-contained NAT (admission test) portal |

The student portal also ships as a standalone Capacitor mobile app (Android/iOS)
from [apps/student/student](apps/student/student).

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 7, Tailwind CSS, TanStack Query v5,
  React Router 7, framer-motion, Chart.js, lucide-react
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Mobile:** Capacitor 8 (student portal only)
- **Testing:** Vitest + Testing Library + MSW
- **Hosting:** Vercel (SPA rewrites in `vercel.json`)

## Getting started

Prerequisites: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
npm run dev            # main app at http://localhost:5173
```

Environment variables (see [.env.example](.env.example)):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (RLS enforces real access control) |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the main app dev server |
| `npm run dev:student` | Start the standalone student app dev server |
| `npm run build` / `build:student` | Production builds |
| `npm run lint` | ESLint over the source |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm test` | Run the Vitest suite once |
| `npm run test:coverage` | Tests with coverage report |
| `npm run check` | lint + typecheck + test + build (the full quality gate) |
| `npm run mobile:student:sync` | Build student app and sync into Capacitor |
| `npm run db:dump` | Snapshot the remote DB schema + RLS policies into `supabase/schema.sql` |
| `npm run db:types` | Regenerate `src/types/database.ts` from the live database |
| `npm run sanitize:storage` | Empty production storage buckets (see `scripts/`) |

## Project structure

```
src/
  App.tsx              # Routes: lazy-loaded, role-guarded via ProtectedRoute
  components/          # Shared UI, layout, permissions components
  hooks/               # Cross-portal hooks
  lib/                 # Auth, Supabase client, edge-function invocation, audit
  pages/
    admin|dept|carestaff|registrar|student/
      features/<name>/ # Feature-first: components/ + hooks/ per feature
  services/            # Data access per portal (Supabase queries)
  types/               # Shared models, pagination, permissions types
  utils/               # Validation, formatting, error masking, workflow
apps/student/student/  # Capacitor wrapper app (Android/iOS)
docs/                  # Refactor plans, parity notes, changelogs
```

Conventions:

- **Feature-first layout** — every portal follows `features/<name>/{components,hooks}`;
  see [docs/portal-structure-refactor-plan.md](docs/portal-structure-refactor-plan.md).
- **Single caching layer** — TanStack Query owns all server-state caching;
  `sessionCache` is only for static lookups.
- **Errors shown to users** must pass through `getSafeErrorMessage`
  ([src/utils/errorMasking.ts](src/utils/errorMasking.ts)) — raw DB/edge errors are never displayed.
- **Text inputs** are validated/sanitized via [src/utils/inputSecurity.ts](src/utils/inputSecurity.ts).

## Testing

```bash
npm test
```

Unit tests live next to the code they test (`*.test.ts`). Current coverage focuses on
services, auth/edge-function libs, and utils.

## Deployment

Pushed builds deploy via Vercel; `vercel.json` rewrites all routes to `index.html`
(client-side routing). The student mobile app is built with
`npm run mobile:student:sync` and opened via Android Studio / Xcode
(`mobile:student:open:android` / `:ios`).
