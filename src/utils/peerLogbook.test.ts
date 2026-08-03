import { describe, expect, it } from 'vitest';
import {
    entryInitials,
    facilitatorName,
    initialsFrom,
    monthKeyOf,
    monthLabelOf,
    monthStartOf,
    sanitizeSearchTerm,
    shouldPromptSubmit,
    todayIso
} from './peerLogbook';

describe('peerLogbook helpers', () => {
    it('derives the month key from local time, not UTC', () => {
        // 2026-07-01 07:30 local. A UTC-based key would read 2026-06 for anyone
        // east of Greenwich, filing the entry into the wrong month.
        expect(monthKeyOf(new Date(2026, 6, 1, 7, 30))).toBe('2026-07');
    });

    it('maps a month key to the first of that month', () => {
        expect(monthStartOf('2026-07')).toBe('2026-07-01');
    });

    it('labels a month for display', () => {
        expect(monthLabelOf('2026-07')).toBe('July 2026');
    });

    it('formats a local calendar date', () => {
        expect(todayIso(new Date(2026, 6, 29, 23, 30))).toBe('2026-07-29');
    });

    it('prompts a draft to be submitted only in the last five days', () => {
        expect(shouldPromptSubmit(new Date(2026, 6, 31), 'draft')).toBe(true);
        expect(shouldPromptSubmit(new Date(2026, 6, 27), 'draft')).toBe(true);
        expect(shouldPromptSubmit(new Date(2026, 6, 26), 'draft')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 1), 'draft')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'submitted')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'approved')).toBe(false);
    });

    // Short months still get five days, not a date-arithmetic surprise.
    it('measures the window from the real last day of the month', () => {
        expect(shouldPromptSubmit(new Date(2026, 1, 24), 'draft')).toBe(true);
        expect(shouldPromptSubmit(new Date(2026, 1, 23), 'draft')).toBe(false);
    });

    it('formats a roster name with a middle initial', () => {
        expect(facilitatorName({ first_name: 'Reynel', middle_name: 'Cruz', last_name: 'Repaso' })).toBe('Reynel C. Repaso');
        expect(facilitatorName(null)).toBe('—');
    });

    it('builds initials from a name', () => {
        expect(initialsFrom('Reynel', 'Repaso')).toBe('R.R.');
        expect(initialsFrom('Reynel', null)).toBe('R.');
        expect(initialsFrom(null, null)).toBe('');
    });

    // Initials are written onto the entry when the student is picked, so display
    // never reaches for a student record the viewer may not be allowed to read.
    it('shows the initials stored on the entry, and nothing else', () => {
        expect(entryInitials({ assisted_initials: 'X.Y.' })).toBe('X.Y.');
        expect(entryInitials({ assisted_initials: '  R.R. ' })).toBe('R.R.');
        expect(entryInitials({ assisted_initials: null })).toBe('');
        expect(entryInitials({})).toBe('');
    });

    // These characters delimit the PostgREST or() grammar. Left in, a surname
    // like "Dela Cruz, Jr." makes the request 400 and the picker silently
    // reports no matches.
    it('strips the characters that would break a PostgREST or() term', () => {
        expect(sanitizeSearchTerm('Dela Cruz, Jr.')).toBe('Dela Cruz  Jr.');
        expect(sanitizeSearchTerm('(Reyes)')).toBe('Reyes');
        expect(sanitizeSearchTerm('a*b')).toBe('a b');
        expect(sanitizeSearchTerm('  Santos  ')).toBe('Santos');
    });
});
