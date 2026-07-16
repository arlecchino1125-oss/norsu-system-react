const NAT_BROWSER_ID_KEY = 'norsu-nat-browser-id-v1';
const NAT_SESSION_KEY = 'norsu-nat-applicant-session-v1';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type NatApplicantSession = {
    token: string;
    expiresAt: string;
};

export const didNatApplicantStatusChange = (previousStatus?: string | null, nextStatus?: string | null) =>
    Boolean(previousStatus && nextStatus && previousStatus !== nextStatus);

const createUuid = () => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const getOrCreateNatBrowserId = () => {
    const existing = String(localStorage.getItem(NAT_BROWSER_ID_KEY) || '').trim().toLowerCase();
    if (UUID_PATTERN.test(existing)) return existing;
    const browserId = createUuid();
    localStorage.setItem(NAT_BROWSER_ID_KEY, browserId);
    return browserId;
};

export const saveNatApplicantSession = (session: NatApplicantSession) => {
    sessionStorage.setItem(NAT_SESSION_KEY, JSON.stringify(session));
};

export const clearNatApplicantSession = () => {
    sessionStorage.removeItem(NAT_SESSION_KEY);
};

export const loadNatApplicantSession = (): NatApplicantSession | null => {
    try {
        const parsed = JSON.parse(String(sessionStorage.getItem(NAT_SESSION_KEY) || 'null'));
        const token = String(parsed?.token || '').trim();
        const expiresAt = String(parsed?.expiresAt || '').trim();
        if (!token || !expiresAt || Date.parse(expiresAt) <= Date.now()) {
            clearNatApplicantSession();
            return null;
        }
        return { token, expiresAt };
    } catch {
        clearNatApplicantSession();
        return null;
    }
};
