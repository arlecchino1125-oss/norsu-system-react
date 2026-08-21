/**
 * Helpers to decode and encode application details inside the existing requirements text field.
 */

export function normalizeScholarshipUrl(url: string | null | undefined): string {
    if (!url) return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

export function parseScholarship(s: any): any {
    if (!s) return s;
    let application_method = s.application_method || 'portal';
    let application_url = s.application_url ? normalizeScholarshipUrl(s.application_url) : '';
    let cleanRequirements = s.requirements || '';
    let cleanDescription = s.description || '';

    const metadataRegex = /(?:\r?\n)?(?:---\s*)?METADATA:\s*/i;

    if (/METADATA:/i.test(cleanRequirements)) {
        const parts = cleanRequirements.split(metadataRegex);
        if (parts.length > 1) {
            try {
                const meta = JSON.parse(parts[1].trim());
                if (meta.application_method) application_method = meta.application_method;
                if (meta.application_url) application_url = normalizeScholarshipUrl(meta.application_url);
                cleanRequirements = parts[0].trim();
            } catch (e) {
                // Ignore parse errors
            }
        }
    }

    if (/METADATA:/i.test(cleanDescription)) {
        const parts = cleanDescription.split(metadataRegex);
        if (parts.length > 1) {
            try {
                const meta = JSON.parse(parts[1].trim());
                if (meta.application_method) application_method = meta.application_method;
                if (meta.application_url) application_url = normalizeScholarshipUrl(meta.application_url);
                cleanDescription = parts[0].trim();
            } catch (e) {
                // Ignore parse errors
            }
        }
    }

    return {
        ...s,
        requirements: cleanRequirements,
        description: cleanDescription,
        application_method,
        application_url
    };
}

export function serializeRequirements(requirements: string, method: string, url: string): string {
    const cleanRequirements = (requirements || '').split(/\n?---\n?METADATA:\s*/i)[0].trim();
    const meta = {
        application_method: method,
        application_url: method === 'external_link' ? url : ''
    };
    return `${cleanRequirements}\n---\nMETADATA:${JSON.stringify(meta)}`;
}

export function isScholarshipExpired(deadline: string | null | undefined): boolean {
    if (!deadline) return false;
    const trimmed = String(deadline).trim();
    if (!trimmed) return false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map(Number);
        const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
        return endOfDay.getTime() < Date.now();
    }
    const date = new Date(trimmed);
    return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}
