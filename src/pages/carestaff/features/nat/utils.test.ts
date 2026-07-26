import { describe, expect, it } from 'vitest';
import { canMarkNatPassed, filterNatCoursesByDepartment, getTotalPages, paginateLocalRows } from './utils';

describe('NAT result eligibility', () => {
    it('allows Pass only after both attendance timestamps exist', () => {
        expect(canMarkNatPassed({
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: '2026-07-14T02:00:00.000Z'
        })).toBe(true);

        expect(canMarkNatPassed({
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: null
        })).toBe(false);

        expect(canMarkNatPassed({
            time_in: null,
            time_out: '2026-07-14T02:00:00.000Z'
        })).toBe(false);
    });
});

describe('NAT list pagination', () => {
    it('shows at most 25 entries per page', () => {
        const rows = Array.from({ length: 26 }, (_, index) => index + 1);

        expect(paginateLocalRows(rows, 1)).toEqual(rows.slice(0, 25));
        expect(paginateLocalRows(rows, 2)).toEqual([26]);
        expect(getTotalPages(rows.length)).toBe(2);
    });
});

describe('NAT course department filtering', () => {
    it('returns only courses in the selected college department', () => {
        const courses = [
            { id: 1, name: 'Agribusiness', departments: { name: 'CAFF' } },
            { id: 2, name: 'Computer Science', departments: { name: 'CAS' } },
            { id: 3, name: 'Midwifery', departments: { name: 'CNPAHS' } }
        ];
        expect(filterNatCoursesByDepartment(courses, 'CAS')).toEqual([courses[1]]);
    });
});
