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
    if (role === 'Admin') return 'bg-violet-50 text-violet-700 border border-violet-200';
    if (role === 'Care Staff') return 'bg-sky-50 text-sky-700 border border-sky-200';
    if (role === 'Registrar') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
};

const KNOWN_COLLEGE_CODES: Record<string, string> = {
    'College of Teacher Education': 'CTED',
    'College of Criminal Justice Education': 'CCJE',
    'College of Business Administration': 'CBA',
    'College of Industrial Technology': 'CIT',
    'College of Arts and Sciences': 'CAS',
    'College of Agriculture and Forestry': 'CAF',
};

export const getCollegeCode = (name: string): string => {
    if (!name) return 'COL';
    const trimmed = name.trim();
    if (KNOWN_COLLEGE_CODES[trimmed]) return KNOWN_COLLEGE_CODES[trimmed];
    const match = trimmed.match(/^([A-Z]{2,6})\s*[-–—]/);
    if (match) return match[1];
    const words = trimmed.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(w => !['of', 'and', 'the', 'in', 'for'].includes(w.toLowerCase()));
    if (words.length >= 2) return words.map(w => w[0]?.toUpperCase()).join('');
    return trimmed.slice(0, 4).toUpperCase();
};
