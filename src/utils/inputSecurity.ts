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
