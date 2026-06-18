# NORSU Student Portal App

This folder is the standalone student-facing React app. It has its own Vite entry point and build output, while reusing the shared student portal pages, auth provider, Supabase client, services, hooks, components, and assets from the main system.

## Local Commands

Run from the repository root:

```bash
npm run dev:student
npm run build:student
npm run preview:student
npm run typecheck:student
npm run mobile:student:sync
npm run mobile:student:open:android
npm run mobile:student:open:ios
```

## Routes

- `/` redirects to `/student/login`
- `/student/login` shows student login and activation
- `/student` shows the protected student portal

## Database

The app still reads the root `.env` file through `envDir` in `vite.config.js`, so it uses the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as the main web system.

## Native Mobile

This app uses Capacitor for Android and iOS. The native app wraps the built student portal from `dist-student`.

Native projects have already been generated:

- `apps/student/android`
- `apps/student/ios`

Use this after changing student app code:

```bash
npm run mobile:student:sync
```

Then open the native project:

```bash
npm run mobile:student:open:android
npm run mobile:student:open:ios
```

Android builds require Android Studio or the Android SDK plus a compatible JDK. Use JDK 21 if Java 25 causes Gradle errors. iOS builds require macOS, Xcode, and an Apple Developer account for device/App Store distribution.
