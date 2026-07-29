import { describe, expect, it } from 'vitest';
import { LOGBOOK_COLUMNS, buildLogbookRows } from './peerLogbookPdf';

const entry = {
    id: 'entry-1',
    logbook_id: 'book-1',
    logbook_month: '2026-07-01',
    entry_date: '2026-07-14',
    logged_at: '2026-07-14T06:30:00.000Z',
    activity_type: 'One-on-one peer support',
    assisted_student_id: '420135501',
    assisted_initials: null,
    concern: 'Struggling with academic load',
    action_taken: 'Listened and shared study planning',
    remarks: 'Check back next week',
    referred: true,
    students: { first_name: 'Reynel', last_name: 'Repaso' }
} as any;

describe('peer logbook PDF rows', () => {
    it('keeps the eight columns in the source form order', () => {
        expect(LOGBOOK_COLUMNS).toEqual([
            'Date',
            'Type of Activity/Interaction',
            'Name of Student Assisted',
            'Concern/Topic Discussed',
            'Action Taken/Assistance Provided',
            'Referred to Guidance (Yes/No)',
            'Remarks/Follow-up Plan',
            'Signature of PEERkada'
        ]);
    });

    it('prints initials rather than the linked student name', () => {
        const [row] = buildLogbookRows([entry]);
        expect(row[2]).toBe('R.R.');
        expect(row.join(' ')).not.toContain('Reynel');
    });

    it('renders the referral flag as the form asks it', () => {
        expect(buildLogbookRows([entry])[0][5]).toBe('Yes');
        expect(buildLogbookRows([{ ...entry, referred: false }])[0][5]).toBe('No');
    });

    // The office signs the printed sheet by hand; the app captures no signature.
    it('leaves the PEERkada signature column blank', () => {
        expect(buildLogbookRows([entry])[0][7]).toBe('');
    });

    it('leaves an unrecorded student blank rather than inventing initials', () => {
        const anonymous = { ...entry, assisted_student_id: null, students: null };
        expect(buildLogbookRows([anonymous])[0][2]).toBe('');
    });
});
