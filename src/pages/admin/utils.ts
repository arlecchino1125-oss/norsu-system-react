export const sanitizeAuditSearchTerm = (value: string) =>
    String(value || '').replace(/[%(),'"]/g, ' ').trim();

export const isFunctionUnavailableError = (message: string, status?: number | null, errorName?: string | null) => {
    const normalized = String(message || '').toLowerCase();
    if (status === 404) return true;
    if (errorName === 'FunctionsFetchError' || errorName === 'FunctionsRelayError') return true;
    return normalized.includes('failed to send a request to the edge function')
        || normalized.includes('failed to fetch')
        || normalized.includes('fetch failed')
        || normalized.includes('cors')
        || normalized.includes('not found');
};

export const getArchiveSchemaErrorMessage = (error: any, fallback: string) => {
    const message = String(error || '');
    const normalized = message.toLowerCase();
    const mentionsArchiveColumn = normalized.includes('is_archived')
        || normalized.includes('archived_at')
        || normalized.includes('archive_note');
    const looksLikeMissingColumn = normalized.includes('schema cache')
        || normalized.includes('column')
        || normalized.includes('does not exist');

    if (mentionsArchiveColumn && looksLikeMissingColumn) {
        return "This feature isn't available yet.";
    }

    return message || fallback;
};

export const getStaffRoleBadgeClass = (role: string | null | undefined) => {
    if (role === 'Admin') return 'bg-rose-50 text-rose-700 ring-rose-200';
    if (role === 'Care Staff') return 'bg-sky-50 text-sky-700 ring-sky-200';
    if (role === 'Registrar') return 'bg-teal-50 text-teal-700 ring-teal-200';
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
};
