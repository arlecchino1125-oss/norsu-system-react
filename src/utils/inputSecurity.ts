export type TextRuleKey =
    | 'shortText'
    | 'mediumText'
    | 'longText'
    | 'name'
    | 'email'
    | 'phone'
    | 'studentId'
    | 'url'
    | 'notes'
    | 'otp';

export type TextInputRule = {
    maxLength: number;
    pattern?: RegExp;
    label: string;
};

export const TEXT_INPUT_RULES: Record<TextRuleKey, TextInputRule> = {
    shortText: { label: 'Text', maxLength: 80 },
    mediumText: { label: 'Text', maxLength: 255 },
    longText: { label: 'Long text', maxLength: 1500 },
    name: { label: 'Name', maxLength: 80 },
    email: { label: 'Email', maxLength: 254, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { label: 'Contact number', maxLength: 24, pattern: /^[0-9+()\-\s.]+$/ },
    studentId: { label: 'Student ID', maxLength: 32, pattern: /^[A-Za-z0-9\-_]+$/ },
    url: { label: 'URL', maxLength: 2048, pattern: /^https?:\/\/[^\s]+$/i },
    notes: { label: 'Notes', maxLength: 1500 },
    otp: { label: 'OTP', maxLength: 6, pattern: /^\d{6}$/ },
};

const SPREADSHEET_FORMULA_PATTERN = /^[\s]*[=+\-@]/;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const isValidEmailDomain = (email: string): boolean => {
    if (!email) return false;
    const parts = String(email).split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase().trim();

    // Accept any structurally valid domain (dot-separated labels ending in a
    // 2+ letter TLD). Previously this was an allowlist of common providers,
    // which locked out students with other legitimate email addresses.
    return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/.test(domain);
};

// Providers our students actually use. This is NOT an allowlist — anything not listed still
// validates. It is the reference set for spotting typos, because a misspelled domain means the
// student never receives their reset link and can never recover the account on their own.
const KNOWN_EMAIL_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'yahoo.com.ph',
    'outlook.com',
    'outlook.ph',
    'hotmail.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'aol.com',
    'proton.me',
    'protonmail.com',
    'zoho.com',
    'yandex.com',
    'gmx.com',
    'mail.com',
    // Close enough to gmail.com to be flagged as a typo otherwise, and it is a real provider.
    'email.com',
    'norsu.edu.ph',
];

const getEmailDomain = (email: string) => {
    const parts = String(email || '').split('@');
    return parts.length === 2 ? parts[1].toLowerCase().trim() : '';
};

// Plain Levenshtein rather than a hardcoded list of misspellings: transpositions (gmial),
// drops (gmai), and wrong last letters (gmail.con) are all covered by one rule instead of a
// list that is permanently one typo behind.
const editDistance = (a: string, b: string) => {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i += 1) {
        const current = [i];
        for (let j = 1; j <= b.length; j += 1) {
            current[j] = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        previous = current;
    }

    return previous[b.length];
};

export type EmailDomainCheck =
    | { status: 'ok' }
    | { status: 'typo'; suggestion: string; suggestedDomain: string }
    | { status: 'uncommon'; domain: string };

/**
 * Classifies an address by how much its domain looks like a mistake.
 * - 'typo'     : within 2 edits of a known provider. Treated as an error by validateTextInput.
 * - 'uncommon' : structurally fine but unrecognised. Callers may warn; never blocks.
 */
export const checkEmailDomain = (email: string): EmailDomainCheck => {
    const domain = getEmailDomain(email);
    if (!domain) return { status: 'ok' };

    // Institutional addresses come in too many variants to enumerate, and are legitimate here.
    if (KNOWN_EMAIL_DOMAINS.includes(domain) || domain.endsWith('.edu.ph')) {
        return { status: 'ok' };
    }

    let closest = '';
    let closestDistance = Infinity;
    for (const candidate of KNOWN_EMAIL_DOMAINS) {
        const distance = editDistance(domain, candidate);
        if (distance < closestDistance) {
            closestDistance = distance;
            closest = candidate;
        }
    }

    // 2 covers swapped letters (gmial.com); beyond that the guesses stop being trustworthy.
    if (closestDistance <= 2) {
        const localPart = String(email).split('@')[0];
        return { status: 'typo', suggestion: `${localPart}@${closest}`, suggestedDomain: closest };
    }

    return { status: 'uncommon', domain };
};

export const normalizePlainTextInput = (value: unknown, multiline = false) => {
    const normalized = String(value ?? '').replace(/\r\n/g, '\n');
    const withoutControls = normalized.replace(
        multiline ? CONTROL_CHARS_PATTERN : /[\u0000-\u001F\u007F]/g,
        ''
    );
    return withoutControls.replace(/[<>]/g, '').trim();
};

export const validateTextInput = (
    value: unknown,
    ruleKey: TextRuleKey,
    options: { required?: boolean; multiline?: boolean; label?: string } = {}
) => {
    const rule = TEXT_INPUT_RULES[ruleKey];
    const label = options.label || rule.label;
    const text = normalizePlainTextInput(value, options.multiline);

    if (options.required && !text) {
        return { valid: false, value: text, error: `${label} is required.` };
    }

    if (text.length > rule.maxLength) {
        return {
            valid: false,
            value: text,
            error: `${label} must be ${rule.maxLength} characters or fewer.`,
        };
    }

    if (text && rule.pattern && !rule.pattern.test(text)) {
        return { valid: false, value: text, error: `${label} has an invalid format.` };
    }

    if (text && ruleKey === 'email') {
        if (!isValidEmailDomain(text)) {
            return { valid: false, value: text, error: `Invalid email provider. Please use a recognized email domain (e.g., gmail.com, yahoo.com).` };
        }

        // Blocks only near-misses of a known provider. Unrecognised domains still pass — see
        // checkEmailDomain, whose 'uncommon' result is a UI warning, never a hard stop.
        const domainCheck = checkEmailDomain(text);
        if (domainCheck.status === 'typo') {
            return {
                valid: false,
                value: text,
                error: `Did you mean ${domainCheck.suggestion}? Please check the spelling of your email domain.`,
            };
        }
    }

    return { valid: true, value: text, error: null };
};

export const getTextInputLimitProps = (ruleKey: TextRuleKey) => ({
    maxLength: TEXT_INPUT_RULES[ruleKey].maxLength,
});

export const escapeSpreadsheetFormula = (value: unknown) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number' || typeof value === 'boolean') return value;

    const text = String(value);
    return SPREADSHEET_FORMULA_PATTERN.test(text) ? `'${text}` : text;
};

const escapeCsvCell = (value: unknown) =>
    String(escapeSpreadsheetFormula(value) ?? '').replace(/"/g, '""');

export const buildCsv = (rows: unknown[][]) =>
    rows.map(row => row.map(cell => `"${escapeCsvCell(cell)}"`).join(',')).join('\n');

export const escapeSpreadsheetRows = (rows: unknown[][]) =>
    rows.map(row => row.map(escapeSpreadsheetFormula));

// Support-document upload rules — shared contract between the student
// submission form and the care-staff upload flow; keep in one place.
export const MAX_SUPPORT_DOCUMENT_BYTES = 1024 * 1024;
export const SUPPORT_DOCUMENT_ACCEPT = 'image/*,application/pdf';
export const isSupportedDocumentFile = (file: File) =>
    file.type.startsWith('image/') || file.type === 'application/pdf';
