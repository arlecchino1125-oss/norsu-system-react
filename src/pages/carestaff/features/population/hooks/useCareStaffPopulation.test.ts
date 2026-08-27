import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../lib/supabase', () => ({ supabase: {} }));

const { buildZipDocumentPath } = await import('./useCareStaffPopulation');

// The workbook cell and the ZIP entry both come from this function. If it stops
// being deterministic, or a stored value escapes the documents/ prefix, the
// spreadsheet starts pointing at files the archive does not contain.
describe('buildZipDocumentPath', () => {
    it('derives the path from the student id, column label and stored filename', () => {
        expect(buildZipDocumentPath('2026-0001', 'PWD Document', 'r2:students/1/profile/claims/pwd/id-card.jpg'))
            .toBe('documents/2026-0001/PWD_Document/id-card.jpg');
    });

    it('is stable across calls so the cell and the archive entry always agree', () => {
        const args = ['2026-0042', '4Ps Document', 'r2:students/42/profile/claims/four-ps/proof.pdf'] as const;
        expect(buildZipDocumentPath(...args)).toBe(buildZipDocumentPath(...args));
    });

    it('falls back to a label-and-id name when the stored value has no filename', () => {
        expect(buildZipDocumentPath('2026-0007', 'Solo Parent Document', ''))
            .toBe('documents/2026-0007/Solo_Parent_Document/Solo_Parent_Document-2026-0007');
    });

    it('keeps traversal and separator characters out of the entry path', () => {
        const path = buildZipDocumentPath('../../etc', 'Senior Citizen Document', 'r2:a/b/../../../passwd');
        expect(path.startsWith('documents/')).toBe(true);
        expect(path.split('/')).toHaveLength(4);
        expect(path.split('/').slice(1)).not.toContain('..');
    });
});
