import { describe, expect, it } from 'vitest';
import { isMissingEnrollmentActivationError } from './studentActivationErrors';

describe('student activation errors', () => {
    it('recognizes only the missing enrollment-list error', () => {
        expect(isMissingEnrollmentActivationError(
            new Error('Student ID not found in the enrollment list.')
        )).toBe(true);
        expect(isMissingEnrollmentActivationError(
            new Error('This student ID is already activated.')
        )).toBe(false);
    });
});
