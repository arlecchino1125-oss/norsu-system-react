type SanitizeOptions = {
    maxLength?: number;
    multiline?: boolean;
};

const DEFAULT_MAX_LENGTH = 255;

export const sanitizePlainText = (value: unknown, options: SanitizeOptions = {}) => {
    const multiline = options.multiline === true;
    const maxLength = Number.isFinite(options.maxLength)
        ? Math.max(0, Number(options.maxLength))
        : DEFAULT_MAX_LENGTH;

    let text = String(value ?? '');
    text = text.replace(/\r\n/g, '\n');
    text = text.replace(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, '');
    text = text.replace(/[<>]/g, '');

    if (multiline) {
        text = text
            .split('\n')
            .map((line) => line.replace(/\s+/g, ' ').trim())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n');
    } else {
        text = text.replace(/\s+/g, ' ');
    }

    text = text.trim();

    if (maxLength > 0 && text.length > maxLength) {
        text = text.slice(0, maxLength).trim();
    }

    return text;
};

export const sanitizeOptionalPlainText = (value: unknown, options: SanitizeOptions = {}) => {
    const sanitized = sanitizePlainText(value, options);
    return sanitized || null;
};
