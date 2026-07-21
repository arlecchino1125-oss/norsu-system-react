import { describe, expect, it } from 'vitest';
import { mergePendingProfileIntoProfileForm } from './profileFormUtils';

describe('mergePendingProfileIntoProfileForm', () => {
    it('fills missing profile fields without overwriting existing values', () => {
        const result = mergePendingProfileIntoProfileForm(
            { firstName: 'Existing', lastName: '', email: '' },
            { firstName: 'Pending', lastName: 'Student', email: 'student@example.com' }
        );

        expect(result).toMatchObject({
            firstName: 'Existing',
            lastName: 'Student',
            email: 'student@example.com'
        });
    });

    it('returns the original form when there is no pending profile', () => {
        const form = { firstName: 'Existing' };

        expect(mergePendingProfileIntoProfileForm(form, null)).toBe(form);
    });
});
