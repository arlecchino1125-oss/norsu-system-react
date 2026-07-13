import { describe, expect, it } from 'vitest';
import { hashNatPassword, PBKDF2_ITERATIONS, verifyNatPassword } from './natPassword.ts';

const sha256Hex = async (value: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

describe('natPassword', () => {
    it('hashes and verifies a new password without requiring upgrade', async () => {
        const stored = await hashNatPassword('correct horse battery');
        expect(stored.startsWith(`pbkdf2$${PBKDF2_ITERATIONS}$`)).toBe(true);

        const check = await verifyNatPassword('correct horse battery', stored);
        expect(check).toEqual({ valid: true, needsUpgrade: false });
    });

    it('rejects a wrong password against a PBKDF2 hash', async () => {
        const stored = await hashNatPassword('right-password');
        const check = await verifyNatPassword('wrong-password', stored);
        expect(check.valid).toBe(false);
    });

    it('salts hashes so equal passwords produce different stored values', async () => {
        const first = await hashNatPassword('same-password');
        const second = await hashNatPassword('same-password');
        expect(first).not.toBe(second);
    });

    it('verifies a legacy SHA-256 hash and flags it for upgrade', async () => {
        const stored = await sha256Hex('legacy-password');
        const check = await verifyNatPassword('legacy-password', stored);
        expect(check).toEqual({ valid: true, needsUpgrade: true });
    });

    it('rejects a wrong password against a legacy hash', async () => {
        const stored = await sha256Hex('legacy-password');
        const check = await verifyNatPassword('not-it', stored);
        expect(check.valid).toBe(false);
    });

    it('rejects malformed stored hashes without throwing', async () => {
        for (const stored of ['', 'pbkdf2$abc$zz$zz', 'pbkdf2$50$deadbeef$deadbeef', 'pbkdf2$600000$$', null]) {
            const check = await verifyNatPassword('anything', stored);
            expect(check.valid).toBe(false);
        }
    });
});
