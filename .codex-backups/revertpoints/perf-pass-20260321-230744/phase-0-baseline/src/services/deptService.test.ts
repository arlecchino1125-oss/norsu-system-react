import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, fromMock } = vi.hoisted(() => ({
    queryMock: {
        select: vi.fn(),
        or: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    fromMock: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: fromMock
    }
}));

import { getStudentsPage } from './deptService';

const resetQueryMock = () => {
    queryMock.select.mockReturnValue(queryMock);
    queryMock.or.mockReturnValue(queryMock);
    queryMock.eq.mockReturnValue(queryMock);
    queryMock.order.mockReturnValue(queryMock);
    queryMock.range.mockResolvedValue({ data: [], error: null, count: 1 });
};

describe('deptService.getStudentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('queries the student list with the dean profile modal fields', async () => {
        await getStudentsPage(
            { search: 'Noel', department: 'CAS' },
            { page: 1, pageSize: 10 }
        );

        expect(queryMock.select).toHaveBeenCalledWith(
            'id, student_id, first_name, middle_name, last_name, suffix, email, mobile, sex, address, street, city, province, zip_code, year_level, status, department, course, section',
            { count: 'exact' }
        );
        expect(queryMock.eq).toHaveBeenCalledWith('department', 'CAS');
        expect(queryMock.or).toHaveBeenCalled();
    });
});
