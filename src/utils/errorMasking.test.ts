import { describe, it, expect } from 'vitest';
import { getSafeErrorMessage } from './errorMasking';

describe('getSafeErrorMessage', () => {
    it('masks database constraint violations', () => {
        expect(getSafeErrorMessage('duplicate key value violates unique constraint "students_pkey"'))
            .toBe('This record already exists.');
        expect(getSafeErrorMessage('insert violates foreign key constraint'))
            .toBe('Action failed because related data is missing or incomplete.');
    });

    it('masks auth and permission errors', () => {
        expect(getSafeErrorMessage('new row violates row-level security policy for table "students"'))
            .toBe('You do not have permission to perform this action.');
        expect(getSafeErrorMessage('JWT expired'))
            .toBe('Your session has expired. Sign in again.');
        expect(getSafeErrorMessage('Invalid login credentials'))
            .toBe('Invalid email or password.');
    });

    it('masks network and server errors', () => {
        expect(getSafeErrorMessage('TypeError: Failed to fetch'))
            .toBe('Network error. Please check your internet connection.');
        expect(getSafeErrorMessage('Edge Function returned a non-2xx status code'))
            .toBe('An unexpected server error occurred. Please try again later.');
    });

    it('masks raw SQL and code errors', () => {
        expect(getSafeErrorMessage('column "studnt_id" does not exist'))
            .toBe('An unexpected system error occurred. Please try again.');
        expect(getSafeErrorMessage('syntax error at or near "SELCT"'))
            .toBe('An unexpected system error occurred. Please try again.');
    });

    it('passes through already-friendly messages', () => {
        expect(getSafeErrorMessage('Course is required.')).toBe('Course is required.');
    });

    it('handles empty and non-string input', () => {
        expect(getSafeErrorMessage('')).toBe('An unknown error occurred.');
        expect(getSafeErrorMessage(null)).toBe('An unknown error occurred.');
        expect(getSafeErrorMessage(undefined)).toBe('An unknown error occurred.');
    });
});
