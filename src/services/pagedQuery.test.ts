import { describe, expect, it } from 'vitest';
import { resolvePageParams, toPageResult } from './pagedQuery';

describe('pagedQuery helpers', () => {
    it('resolves and clamps page parameters', () => {
        const result = resolvePageParams({ page: -3, pageSize: 9999 });
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(100);
        expect(result.from).toBe(0);
        expect(result.to).toBe(99);
    });

    it('maps rows and count to a page result', () => {
        const output = toPageResult([{ id: 1 }, { id: 2 }], 40, { page: 2, pageSize: 20 });
        expect(output.rows).toHaveLength(2);
        expect(output.total).toBe(40);
        expect(output.page).toBe(2);
        expect(output.pageSize).toBe(20);
        expect(output.from).toBe(20);
        expect(output.to).toBe(39);
    });
});

