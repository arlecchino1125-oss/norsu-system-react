const NAT_SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const CAPTCHA_FAIL_THRESHOLD = 3;
const INVALID_LOGIN_MESSAGE = 'Invalid credentials.';
const CAPTCHA_REQUIRED_MESSAGE = 'Please complete the security check to continue.';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Application = { id: string; nat_password_hash?: unknown; [key: string]: unknown };
type PasswordCheck = { valid: boolean; needsUpgrade: boolean };

export type NatSecurityDependencies = {
    now: () => Date;
    captchaEnabled: boolean;
    getApplication: (username: string) => Promise<Application | null>;
    verifyPassword: (password: string, hash: unknown) => Promise<PasswordCheck>;
    verifyCaptcha: (token: string) => Promise<boolean>;
    getFailureCount: (identifier: string) => Promise<number>;
    recordFailure: (identifier: string) => Promise<number>;
    clearFailures: (identifier: string) => Promise<void>;
    upgradePassword: (application: Application, password: string) => Promise<void>;
    storeSession: (session: {
        applicationId: string;
        tokenHash: string;
        browserIdHash: string;
        expiresAt: string;
    }) => Promise<void>;
    findSession: (input: {
        tokenHash: string;
        browserIdHash: string;
        now: string;
    }) => Promise<{ application: Application; expiresAt: string } | null>;
    deleteSession: (input: { tokenHash: string; browserIdHash: string }) => Promise<void>;
    delay: () => Promise<void>;
    randomBytes: () => Uint8Array;
};

const withStatus = (message: string, status: number) => {
    const error = new Error(message) as Error & { status?: number };
    error.status = status;
    return error;
};

const normalizeBrowserId = (value: unknown) => String(value || '').trim().toLowerCase();

export const buildNatFailureIdentifier = (username: unknown, browserId: unknown) =>
    `${String(username || '').trim().toLowerCase()}\n${normalizeBrowserId(browserId)}`;

const toHex = (bytes: Uint8Array) => Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const sha256Hex = async (value: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return toHex(new Uint8Array(digest));
};

export const hashNatIdentifier = sha256Hex;

const toBase64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const validateBrowserId = (browserId: unknown) => {
    const normalized = normalizeBrowserId(browserId);
    return UUID_PATTERN.test(normalized) ? normalized : null;
};

export const loginNatApplicantSecurity = async (
    input: { username?: unknown; password?: unknown; browserId?: unknown; captchaToken?: unknown },
    dependencies: NatSecurityDependencies
) => {
    const username = String(input.username || '').trim();
    const password = String(input.password || '');
    const browserId = validateBrowserId(input.browserId);
    if (!username || !password || !browserId) {
        await dependencies.delay();
        throw withStatus(INVALID_LOGIN_MESSAGE, 401);
    }

    const failureIdentifier = buildNatFailureIdentifier(username, browserId);
    const failureCount = await dependencies.getFailureCount(failureIdentifier);
    if (dependencies.captchaEnabled && failureCount >= CAPTCHA_FAIL_THRESHOLD) {
        const captchaToken = String(input.captchaToken || '').trim();
        if (!captchaToken || !(await dependencies.verifyCaptcha(captchaToken))) {
            throw withStatus(CAPTCHA_REQUIRED_MESSAGE, 403);
        }
    }

    const application = await dependencies.getApplication(username);
    const passwordCheck = application
        ? await dependencies.verifyPassword(password, application.nat_password_hash)
        : { valid: false, needsUpgrade: false };

    if (!application || !passwordCheck.valid) {
        const attempts = await dependencies.recordFailure(failureIdentifier);
        await dependencies.delay();
        throw withStatus(
            INVALID_LOGIN_MESSAGE,
            dependencies.captchaEnabled && attempts >= CAPTCHA_FAIL_THRESHOLD ? 403 : 401
        );
    }

    await dependencies.clearFailures(failureIdentifier);
    if (passwordCheck.needsUpgrade) {
        await dependencies.upgradePassword(application, password);
    }

    const token = toBase64Url(dependencies.randomBytes());
    const expiresAt = new Date(dependencies.now().getTime() + NAT_SESSION_TTL_MS).toISOString();
    await dependencies.storeSession({
        applicationId: application.id,
        tokenHash: await sha256Hex(token),
        browserIdHash: await sha256Hex(browserId),
        expiresAt
    });

    return { application, token, expiresAt };
};

export const requireNatSessionSecurity = async (
    input: { token?: unknown; browserId?: unknown },
    dependencies: NatSecurityDependencies
) => {
    const token = String(input.token || '').trim();
    const browserId = validateBrowserId(input.browserId);
    if (!token || !browserId) {
        throw withStatus('NAT session expired. Sign in again.', 401);
    }

    const session = await dependencies.findSession({
        tokenHash: await sha256Hex(token),
        browserIdHash: await sha256Hex(browserId),
        now: dependencies.now().toISOString()
    });
    if (!session) {
        throw withStatus('NAT session expired. Sign in again.', 401);
    }
    return session;
};

export const revokeNatSessionSecurity = async (
    input: { token?: unknown; browserId?: unknown },
    dependencies: NatSecurityDependencies
) => {
    const token = String(input.token || '').trim();
    const browserId = validateBrowserId(input.browserId);
    if (!token || !browserId) return;
    await dependencies.deleteSession({
        tokenHash: await sha256Hex(token),
        browserIdHash: await sha256Hex(browserId)
    });
};
