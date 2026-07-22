import { describe, expect, it } from 'vitest';

import { formatAuditDetails } from './staffAudit';

describe('staffAudit formatAuditDetails', () => {
    it('parses stringified db trigger details into a friendly label', () => {
        const details = JSON.stringify({
            source: 'db_trigger',
            operation: 'INSERT',
            table: 'scholarships',
            record_id: '14',
            label: 'DOST-SEI Undergraduate Scholarship Program',
            summary: 'Ser Joe created scholarships for DOST-SEI Undergraduate Scholarship Program.'
        });

        expect(formatAuditDetails(details)).toBe('DOST-SEI Undergraduate Scholarship Program');
    });

    it('shows question status changes in a shorter, calmer format', () => {
        expect(formatAuditDetails({
            source: 'db_trigger',
            operation: 'UPDATE',
            table: 'questions',
            record_id: '44',
            label: '44',
            previous_status: 'draft',
            status: 'published'
        })).toBe('Question 44 (Published)');
    });

    it('formats question status changes under the renamed table too', () => {
        // Every audit row written from now on carries the renamed table; the row
        // above carries the pre-rename name. Both must read the same to a human.
        expect(formatAuditDetails({
            source: 'db_trigger',
            operation: 'UPDATE',
            table: 'needs_assessment_questions',
            record_id: '44',
            label: '44',
            previous_status: 'draft',
            status: 'published'
        })).toBe('Question 44 (Published)');
    });

    it('keeps manual audit summaries when they are already plain text', () => {
        expect(formatAuditDetails({
            summary: 'Updated the staff password.'
        })).toBe('Updated the staff password.');
    });
});
