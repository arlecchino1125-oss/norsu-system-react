const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

const SENSITIVE_ACTIVATION_PATTERNS = [
    'supabase auth account',
    'already been registered',
    'already exists',
    'duplicate',
    'use a different email',
    'reset the existing auth account',
    'email address not authorized',
    'already been activated',
    'sign in instead'
];

export const getSafeStudentActivationErrorMessage = (error: unknown) => {
    const rawMessage = error instanceof Error
        ? error.message
        : String(error || '').trim();

    const normalizedMessage = rawMessage.toLowerCase();

    if (!rawMessage) {
        return 'We could not complete account activation. Please try again or contact the office for assistance.';
    }

    const containsSensitiveDetail = EMAIL_PATTERN.test(rawMessage)
        || SENSITIVE_ACTIVATION_PATTERNS.some((pattern) => normalizedMessage.includes(pattern));

    if (containsSensitiveDetail) {
        return 'We could not complete account activation. Please verify your details or contact the office for assistance.';
    }

    return rawMessage;
};
