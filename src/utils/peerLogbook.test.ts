import { describe, expect, it } from 'vitest';
import {
    daysLeftInMonth,
    entryInitials,
    initialsFrom,
    monthKeyOf,
    monthLabelOf,
    monthStartOf,
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

    it('counts the days left including today', () => {
        expect(daysLeftInMonth(new Date(2026, 6, 29))).toBe(3);
        expect(daysLeftInMonth(new Date(2026, 6, 31))).toBe(1);
        expect(daysLeftInMonth(new Date(2026, 6, 1))).toBe(31);
    });

    it('prompts a draft to be submitted only near month end', () => {
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'draft')).toBe(true);
        expect(shouldPromptSubmit(new Date(2026, 6, 10), 'draft')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'submitted')).toBe(false);
        expect(shouldPromptSubmit(new Date(2026, 6, 29), 'approved')).toBe(false);
    });

    it('builds initials from a name', () => {
        expect(initialsFrom('Reynel', 'Repaso')).toBe('R.R.');
        expect(initialsFrom('Reynel', null)).toBe('R.');
        expect(initialsFrom(null, null)).toBe('');
    });

    it('prefers typed initials over a linked student', () => {
        expect(entryInitials({ assisted_initials: 'X.Y.', students: { first_name: 'Reynel', last_name: 'Repaso' } })).toBe('X.Y.');
        expect(entryInitials({ assisted_initials: null, students: { first_name: 'Reynel', last_name: 'Repaso' } })).toBe('R.R.');
        expect(entryInitials({ assisted_initials: null, students: null })).toBe('');
    });
});
