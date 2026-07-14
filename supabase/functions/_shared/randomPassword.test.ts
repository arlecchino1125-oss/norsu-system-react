import { describe, expect, it } from 'vitest';
import { generateRandomPassword } from './randomPassword.ts';

describe('generateRandomPassword', () => {
    it('builds the requested password from cryptographic random bytes', () => {
        const password = generateRandomPassword(12, () => new Uint8Array(12).fill(1));

        expect(password).toHaveLength(12);
        expect(password).toMatch(/^[A-Za-z0-9!@#$%^&*]+$/);
    });
});
