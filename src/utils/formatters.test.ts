import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatTime, generateExportFilename, getValidProfileImageUrl, toTitleCase } from './formatters';

describe('formatters', () => {
    describe('toTitleCase', () => {
        it('formats uppercase names to title case', () => {
            expect(toTitleCase('JUAN DELA CRUZ')).toBe('Juan Dela Cruz');
            expect(toTitleCase('MARY JANE WATSON')).toBe('Mary Jane Watson');
        });

        it('formats lowercase names to title case', () => {
            expect(toTitleCase('john doe')).toBe('John Doe');
        });

        it('should correctly format strings with multiple boundaries', () => {
            expect(toTitleCase('MARY-ANNE O\'CONNOR')).toBe('Mary-Anne O\'Connor');
            expect(toTitleCase('mary-anne o\'connor')).toBe('Mary-Anne O\'Connor');
        });

        it('should correctly format strings with parentheses', () => {
            expect(toTitleCase('JOHN DOE (STUDENT)')).toBe('John Doe (Student)');
            expect(toTitleCase('john doe (student)')).toBe('John Doe (Student)');
        });

        it('should strip common invalid suffixes like "0" or "none"', () => {
            expect(toTitleCase('John Doe 0')).toBe('John Doe');
            expect(toTitleCase('Jane Doe NONE')).toBe('Jane Doe');
            expect(toTitleCase('Jack Doe N/A')).toBe('Jack Doe');
            expect(toTitleCase('Jill Doe NA')).toBe('Jill Doe');
            // But shouldn't strip if it's not the end
            expect(toTitleCase('None of the above')).toBe('None Of The Above');
        });

        it('should handle null, undefined, or empty strings gracefully', () => {
            expect(toTitleCase(null)).toBe('');
            expect(toTitleCase(undefined, '—')).toBe('—');
            expect(toTitleCase('   ', 'Default')).toBe('Default');
        });
    });

    describe('date and time formatters', () => {
        it('handles empty dates gracefully with fallback', () => {
            expect(formatDate(null)).toBe('—');
            expect(formatTime(null)).toBe('—');
            expect(formatDateTime(null)).toBe('—');
        });

        it('generates export filename with today date', () => {
            const filename = generateExportFilename('export', 'xlsx');
            expect(filename).toMatch(/^export_\d{4}-\d{2}-\d{2}\.xlsx$/);
        });
    });

    describe('getValidProfileImageUrl', () => {
        it('converts google drive links', () => {
            expect(getValidProfileImageUrl('https://drive.google.com/file/d/12345abc/view')).toBe('https://lh3.googleusercontent.com/d/12345abc');
            expect(getValidProfileImageUrl('')).toBe('');
        });
    });
});
