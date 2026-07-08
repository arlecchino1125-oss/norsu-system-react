import * as Sentry from 'npm:@sentry/deno';

/**
 * Sentry for Supabase Edge Functions (Deno).
 *
 * Everything here is a no-op unless the SENTRY_DSN secret is set on the
 * function, so functions behave exactly as before until Sentry is configured:
 *   supabase secrets set SENTRY_DSN="https://...ingest.sentry.io/..."
 *
 * Usage inside a function's catch block:
 *   await captureEdgeException(error, { endpoint: 'resolve-auth-login' });
 */

let initialized = false;

const getDsn = () => Deno.env.get('SENTRY_DSN') || null;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const redactEmailAddresses = (value: string) =>
  value.replace(EMAIL_PATTERN, '[redacted-email]');

const redactContextValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return redactEmailAddresses(value);
  }

  if (Array.isArray(value)) {
    return value.map(redactContextValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        redactContextValue(entry),
      ]),
    );
  }

  return value;
};

const redactError = (error: unknown): unknown => {
  if (!(error instanceof Error)) {
    return redactContextValue(error);
  }

  const redacted = new Error(redactEmailAddresses(error.message));
  redacted.name = error.name;
  if (error.stack) {
    redacted.stack = redactEmailAddresses(error.stack);
  }
  return redacted;
};

const ensureInitialized = () => {
  if (initialized) {
    return true;
  }

  const dsn = getDsn();
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment: Deno.env.get('SENTRY_ENVIRONMENT') || 'production',
    // Do not attach request headers / IP by default (student PII).
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });

  initialized = true;
  return true;
};

/**
 * Report an exception to Sentry and flush before the function returns.
 *
 * Edge Functions can be frozen immediately after the response is sent, so we
 * await flush to make sure the event is actually delivered.
 */
export const captureEdgeException = async (
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> => {
  if (!ensureInitialized()) {
    return;
  }

  try {
    Sentry.captureException(
      redactError(error),
      context ? { extra: redactContextValue(context) as Record<string, unknown> } : undefined,
    );
    await Sentry.flush(2000);
  } catch {
    // Never let error-reporting break the request handling.
  }
};
