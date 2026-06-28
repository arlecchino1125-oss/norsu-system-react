/**
 * Utility to mask raw database, edge function, and system error messages
 * before displaying them to the user in a toast notification.
 */

export const getSafeErrorMessage = (rawMessage: unknown): string => {
    const msg = String(rawMessage || '').trim();

    // 1. Constraint / Database Violations
    if (msg.includes('duplicate key value')) {
        return 'This record already exists.';
    }
    if (msg.includes('violates foreign key constraint') || msg.includes('violates not-null constraint')) {
        return 'Action failed because related data is missing or incomplete.';
    }

    // 2. Auth / Security Errors
    if (msg.includes('violates row-level security policy') || msg.includes('permission denied')) {
        return 'You do not have permission to perform this action.';
    }
    if (msg.includes('JWT expired') || msg.includes('Auth session missing') || msg.includes('Invalid token')) {
        return 'Your session has expired. Sign in again.';
    }
    if (msg.includes('Invalid login credentials')) {
        return 'Invalid email or password.';
    }

    // 3. Network / Edge Function Errors
    if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('Failed to send a request')) {
        return 'Network error. Please check your internet connection.';
    }
    if (msg.includes('Edge Function returned') || msg.includes('500 Internal Server Error')) {
        return 'An unexpected server error occurred. Please try again later.';
    }

    // 4. Raw SQL / Code Errors
    if (
        msg.includes('column') && msg.includes('does not exist') ||
        msg.includes('relation') && msg.includes('does not exist') ||
        msg.includes('syntax error') ||
        msg.includes('TypeError') ||
        msg.includes('undefined is not an object') ||
        msg.includes('Unexpected token') ||
        msg.includes('JSON.parse')
    ) {
        return 'An unexpected system error occurred. Please try again.';
    }

    // If no raw error pattern is matched, return the original message.
    // It's likely already a user-friendly message (e.g., "Course is required.")
    return msg || 'An unknown error occurred.';
};
