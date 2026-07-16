import { describe, expect, it } from 'vitest';
import { paginateRows } from '../../../../components/shared/tables/paginateRows';

describe('paginateRows', () => {
    it('returns the requested page and total page count', () => {
        const result = paginateRows(Array.from({ length: 12 }, (_, index) => index + 1), 2, 5);

        expect(result.rows).toEqual([6, 7, 8, 9, 10]);
        expect(result.page).toBe(2);
        expect(result.totalPages).toBe(3);
    });
});
