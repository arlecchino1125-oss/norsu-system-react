export const getSafeStudentActivationErrorMessage = (error: unknown) => {
    let rawMessage = error instanceof Error
        ? error.message
        : String(error || '').trim();

    if (!rawMessage) {
        return 'We could not complete account creation. Please check.';
    }

    if (!rawMessage.endsWith('.')) {
        rawMessage += '.';
    }

    return `${rawMessage} Please check.`;
};
