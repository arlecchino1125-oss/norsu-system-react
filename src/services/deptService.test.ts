import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, fromMock } = vi.hoisted(() => ({
    queryMock: {
        select: vi.fn(),
        or: vi.fn(),
        eq: vi.fn(),
        in: vi.fn(),
        gte: vi.fn(),
        lt: vi.fn(),
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

import { getCounselingRequestsPage, getStudentsPage } from './deptService';

const resetQueryMock = () => {
    queryMock.select.mockReturnValue(queryMock);
    queryMock.or.mockReturnValue(queryMock);
    queryMock.eq.mockReturnValue(queryMock);
    queryMock.in.mockReturnValue(queryMock);
    queryMock.gte.mockReturnValue(queryMock);
    queryMock.lt.mockReturnValue(queryMock);
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

        expect(fromMock).toHaveBeenCalledWith('students_directory');
        expect(queryMock.select).toHaveBeenCalledWith(
            'id, student_id, first_name, middle_name, last_name, suffix, email, mobile, sex, address, street, city, province, zip_code, year_level, status, profile_completed, department, course, section',
            { count: 'exact' }
        );
        expect(queryMock.eq).toHaveBeenCalledWith('department', 'CAS');
        expect(queryMock.or).toHaveBeenCalled();
    });

    it('filters incomplete students by profile completion state', async () => {
        await getStudentsPage(
            { status: 'Incomplete', department: 'CAS' },
            { page: 1, pageSize: 10 }
        );

        expect(queryMock.or).toHaveBeenCalledWith('profile_completed.eq.false,profile_completed.is.null');
        expect(queryMock.eq).not.toHaveBeenCalledWith('status', 'Incomplete');
    });

    it('strips PostgREST filter delimiters from student search terms', async () => {
        await getStudentsPage(
            { search: 'Noel%),student_id.ilike.%999', department: 'CAS' },
            { page: 1, pageSize: 10 }
        );

        const searchFilter = queryMock.or.mock.calls[0]?.[0] || '';
        expect(searchFilter).not.toContain('),');
        expect(searchFilter).not.toContain('student_id.ilike.%999');
        expect(searchFilter).toContain('Noel');
    });
});

describe('deptService.getCounselingRequestsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('bounds scheduledOn to the requested day, exclusive of the next day', async () => {
        await getCounselingRequestsPage(
            { department: 'CAS', scheduledOn: '2026-12-31' },
            { page: 1, pageSize: 50 }
        );

        expect(queryMock.gte).toHaveBeenCalledWith('scheduled_date', '2026-12-31 00:00:00');
        expect(queryMock.lt).toHaveBeenCalledWith('scheduled_date', '2027-01-01 00:00:00');
    });

    it('ignores malformed scheduledOn values', async () => {
        await getCounselingRequestsPage(
            { department: 'CAS', scheduledOn: 'not-a-date' },
            { page: 1, pageSize: 50 }
        );

        expect(queryMock.gte).not.toHaveBeenCalled();
        expect(queryMock.lt).not.toHaveBeenCalled();
    });
});
