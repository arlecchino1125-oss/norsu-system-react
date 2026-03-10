import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, fromMock } = vi.hoisted(() => ({
    queryMock: {
        select: vi.fn(),
        neq: vi.fn(),
        not: vi.fn(),
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

import { getApplicationsPage } from './natService';

const resetQueryMock = () => {
    queryMock.select.mockReturnValue(queryMock);
    queryMock.neq.mockReturnValue(queryMock);
    queryMock.not.mockReturnValue(queryMock);
    queryMock.or.mockReturnValue(queryMock);
    queryMock.eq.mockReturnValue(queryMock);
    queryMock.order.mockReturnValue(queryMock);
    queryMock.range.mockResolvedValue({ data: [], error: null, count: 0 });
};

describe('natService.getApplicationsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('applies server-side range from page params', async () => {
        await getApplicationsPage(
            { mode: 'applications', search: 'juan' },
            { page: 2, pageSize: 25 }
        );

        expect(queryMock.range).toHaveBeenCalledWith(25, 49);
        expect(queryMock.or).toHaveBeenCalled();
    });

    it('applies exact status filter when provided', async () => {
        await getApplicationsPage(
            { mode: 'completed', status: 'Approved for Enrollment' },
            { page: 1, pageSize: 25 }
        );

        expect(queryMock.eq).toHaveBeenCalledWith('status', 'Approved for Enrollment');
        expect(queryMock.range).toHaveBeenCalledWith(0, 24);
    });
});
