import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry for the browser app.
 *
 * This is a no-op unless VITE_SENTRY_DSN is set, so local development and any
 * environment without a DSN configured runs exactly as before (no network
 * calls, no overhead). Enable it by setting the env vars in Vercel.
 *
 * PII note: this is a healthcare / student system, so we default to the
 * privacy-safe configuration — no PII is attached to events, and Session
 * Replay (when enabled) masks all text and blocks all media.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    return;
  }

  const enableReplay = import.meta.env.VITE_SENTRY_ENABLE_REPLAY === 'true';

  Sentry.init({
    dsn,
    environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE as string | undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      ...(enableReplay
        ? [
            Sentry.replayIntegration({
              maskAllText: true,
              blockAllMedia: true,
              maskAllInputs: true,
            }),
          ]
        : []),
    ],
    // Known third-party / self-recovering noise, not app bugs:
    ignoreErrors: [
      // Android in-app browser (TikTok etc.) JS bridge GC'd mid-navigation.
      'Java object is gone',
      // Browser extensions trying to eval(); our CSP blocks them by design.
      /Content Security Policy.*unsafe-eval/,
      // Stale chunk after deploy; the vite:preloadError handler reloads.
      'Failed to fetch dynamically imported module',
      'error loading dynamically imported module',
    ],
    // Do not send request headers / IP / user identifiers by default.
    sendDefaultPii: false,
    // Sample a small share of transactions for performance monitoring.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Replay: never record whole sessions, only the moments around an error.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: enableReplay ? 1.0 : 0,
  });
}
