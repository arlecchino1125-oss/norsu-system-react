/**
 * Helpers to decode and encode application details inside the existing requirements text field.
 */

export function parseScholarship(s: any): any {
    if (!s) return s;
    const requirements = s.requirements || '';
    // Splitting by '---' and 'METADATA:' ignoring any whitespace or newlines
    const parts = requirements.split(/\n?---\n?METADATA:\s*/i);
    let application_method = 'portal';
    let application_url = '';
    let cleanRequirements = requirements;
    if (parts.length > 1) {
        try {
            const meta = JSON.parse(parts[1].trim());
            application_method = meta.application_method || 'portal';
            application_url = meta.application_url || '';
            cleanRequirements = parts[0].trim();
        } catch (e) {
            // Fail-safe: keep original text if JSON parsing fails
        }
    }
    return {
        ...s,
        requirements: cleanRequirements,
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
