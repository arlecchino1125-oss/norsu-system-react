import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearNatApplicantSession,
    didNatApplicantStatusChange,
    getOrCreateNatBrowserId,
    loadNatApplicantSession,
    saveNatApplicantSession
} from './natApplicantSession';

describe('NAT applicant browser session storage', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('keeps one non-secret browser UUID in local storage', () => {
        const first = getOrCreateNatBrowserId();
        const second = getOrCreateNatBrowserId();

        expect(first).toMatch(/^[0-9a-f-]{36}$/);
        expect(second).toBe(first);
    });

    it('keeps the opaque applicant token only in session storage', () => {
        saveNatApplicantSession({ token: 'opaque-token', expiresAt: '2099-01-01T00:00:00.000Z' });

        expect(loadNatApplicantSession()).toEqual({
            token: 'opaque-token',
            expiresAt: '2099-01-01T00:00:00.000Z'
        });
        expect(JSON.stringify({ ...localStorage })).not.toContain('opaque-token');
    });

    it('clears an expired token without deleting the browser UUID', () => {
        const id = getOrCreateNatBrowserId();
        saveNatApplicantSession({ token: 'expired', expiresAt: '2000-01-01T00:00:00.000Z' });

        expect(loadNatApplicantSession()).toBeNull();
        clearNatApplicantSession();
        expect(getOrCreateNatBrowserId()).toBe(id);
    });

    it('recognizes only a real applicant status transition', () => {
        expect(didNatApplicantStatusChange('Submitted', 'Ongoing')).toBe(true);
        expect(didNatApplicantStatusChange('Submitted', 'Submitted')).toBe(false);
        expect(didNatApplicantStatusChange('', 'Submitted')).toBe(false);
    });
});
