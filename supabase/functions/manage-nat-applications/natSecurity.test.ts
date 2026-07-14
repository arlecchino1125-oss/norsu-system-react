import { describe, expect, it, vi } from 'vitest';
import {
    buildNatFailureIdentifier,
    loginNatApplicantSecurity,
    requireNatSessionSecurity,
    revokeNatSessionSecurity,
    normalizeNatUsername,
    type NatSecurityDependencies
} from './natSecurity.ts';

const browserId = '11111111-1111-4111-8111-111111111111';
const application = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', username: 'Applicant', nat_password_hash: 'hash' };

const dependencies = (overrides: Partial<NatSecurityDependencies> = {}): NatSecurityDependencies => ({
    now: () => new Date('2026-07-13T08:00:00.000Z'),
    captchaEnabled: true,
    getApplication: vi.fn().mockResolvedValue(application),
    verifyPassword: vi.fn().mockResolvedValue({ valid: true, needsUpgrade: false }),
    verifyCaptcha: vi.fn().mockResolvedValue(true),
    getFailureCount: vi.fn().mockResolvedValue(0),
    recordFailure: vi.fn().mockResolvedValue(1),
    clearFailures: vi.fn().mockResolvedValue(undefined),
    upgradePassword: vi.fn().mockResolvedValue(undefined),
    storeSession: vi.fn().mockResolvedValue(undefined),
    findSession: vi.fn().mockResolvedValue({ application, expiresAt: '2026-07-13T14:00:00.000Z' }),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    delay: vi.fn().mockResolvedValue(undefined),
    randomBytes: () => new Uint8Array(32).fill(7),
    ...overrides
});

describe('NAT applicant security', () => {
    it('normalizes usernames without interpreting PostgREST wildcard aliases', () => {
        expect(normalizeNatUsername(' Applicant_*%@Example.com '))
            .toBe('applicant_*%@example.com');
    });

    it('scopes failures to the normalized username so changing browsers cannot reset them', () => {
        expect(buildNatFailureIdentifier(' Applicant@Example.com ', browserId))
            .toBe('applicant@example.com');
        expect(buildNatFailureIdentifier('Applicant@Example.com', '22222222-2222-4222-8222-222222222222'))
            .toBe(buildNatFailureIdentifier('Applicant@Example.com', browserId));
    });

    it('records unknown-user failures against the same account-scoped key and stays generic', async () => {
        const deps = dependencies({
            getApplication: vi.fn().mockResolvedValue(null),
            verifyPassword: vi.fn().mockResolvedValue({ valid: false, needsUpgrade: false })
        });

        await expect(loginNatApplicantSecurity({
            username: 'missing@example.com',
            password: 'wrong',
            browserId
        }, deps)).rejects.toMatchObject({ message: 'Invalid credentials.', status: 401 });

        expect(deps.recordFailure).toHaveBeenCalledWith('missing@example.com');
    });

    it('requires CAPTCHA for that username after three failures', async () => {
        const deps = dependencies({
            verifyPassword: vi.fn().mockResolvedValue({ valid: false, needsUpgrade: false }),
            recordFailure: vi.fn().mockResolvedValue(3)
        });

        await expect(loginNatApplicantSecurity({
            username: 'Applicant',
            password: 'wrong',
            browserId
        }, deps)).rejects.toMatchObject({ status: 403 });
    });

    it('issues a random fixed six-hour session and clears that username failure count', async () => {
        const deps = dependencies();

        const result = await loginNatApplicantSecurity({
            username: 'Applicant',
            password: 'correct',
            browserId
        }, deps);

        expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
        expect(result.expiresAt).toBe('2026-07-13T14:00:00.000Z');
        expect(deps.clearFailures).toHaveBeenCalledWith('applicant');
        expect(deps.storeSession).toHaveBeenCalledWith(expect.objectContaining({
            applicationId: application.id,
            expiresAt: '2026-07-13T14:00:00.000Z',
            tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
            browserIdHash: expect.stringMatching(/^[0-9a-f]{64}$/)
        }));
    });

    it('validates session and browser hashes without a password', async () => {
        const deps = dependencies();

        const result = await requireNatSessionSecurity({
            token: 'opaque-session-token',
            browserId
        }, deps);

        expect(result.application).toBe(application);
        expect(deps.findSession).toHaveBeenCalledWith(expect.objectContaining({
            tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
            browserIdHash: expect.stringMatching(/^[0-9a-f]{64}$/),
            now: '2026-07-13T08:00:00.000Z'
        }));
    });

    it('revokes only the supplied token/browser session', async () => {
        const deps = dependencies();

        await revokeNatSessionSecurity({ token: 'opaque-session-token', browserId }, deps);

        expect(deps.deleteSession).toHaveBeenCalledWith(expect.objectContaining({
            tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
            browserIdHash: expect.stringMatching(/^[0-9a-f]{64}$/)
        }));
    });
});
