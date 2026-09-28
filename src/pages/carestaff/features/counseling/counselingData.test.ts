import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
    rpcMock: vi.fn()
}));

vi.mock('../../../../lib/supabase', () => ({
    supabase: { from: fromMock, rpc: rpcMock }
}));

import { fetchCounselingCounts, fetchCounselingListPage } from './counselingData';
import { COUNSELING_STATUS } from '../../../../utils/workflow';

// A Supabase query-builder stand-in: chainable, and thenable so that both the
// list path (`await ...range()`) and the head-count path (`await builder`) resolve
// to `result`.
const makeBuilder = (result: any) => {
    const builder: any = {
        select: vi.fn(() => builder),
        in: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        order: vi.fn(() => builder),
        range: vi.fn(() => Promise.resolve(result)),
        then: (resolve: any) => resolve(result)
    };
    return builder;
};

beforeEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
});

describe('fetchCounselingListPage', () => {
    it('fetches only the list for the selected tab — no counts, no RPC', async () => {
        const rows = [
            { id: 2, status: 'Referred', created_at: '2026-01-02' },
            { id: 1, status: 'Referred', created_at: '2026-01-03' }
        ];
        const builder = makeBuilder({ data: rows, error: null, count: 2 });
        fromMock.mockReturnValue(builder);

        const result = await fetchCounselingListPage(COUNSELING_STATUS.REFERRED, 1);

        expect(fromMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledWith('counseling_requests');
        expect(builder.eq).toHaveBeenCalledWith('status', COUNSELING_STATUS.REFERRED);
        expect(rpcMock).not.toHaveBeenCalled();
        expect(result.reqs.map((r: any) => r.id)).toEqual([1, 2]);
        expect(result.total).toBe(2);
    });

    it('filters correctly for NeedsReview and Calendar tabs', async () => {
        const builder = makeBuilder({ data: [], error: null, count: 0 });
        fromMock.mockReturnValue(builder);

        await fetchCounselingListPage(COUNSELING_STATUS.SUBMITTED, 1);
        expect(builder.in).toHaveBeenCalledWith('status', ['Submitted', 'Pending']);

        await fetchCounselingListPage('Calendar', 1);
        expect(builder.in).toHaveBeenCalledWith('status', ['Scheduled', 'Staff_Scheduled', 'Rescheduled']);
    });
});

describe('fetchCounselingCounts', () => {
    it('uses ONE grouped-count RPC and buckets all statuses', async () => {
        rpcMock.mockResolvedValue({
            data: [
                { status: 'Submitted', count: 1 },
                { status: 'Pending', count: 2 },
                { status: 'Approved', count: 8 },
                { status: 'Returned_To_Care', count: 2 },
                { status: 'Referred', count: 3 },
                { status: 'Staff_Scheduled', count: 4 },
                { status: 'Scheduled', count: 5 },
                { status: 'Rescheduled', count: 1 },
                { status: 'Completed', count: 6 },
                { status: 'Counseled', count: 3 },
                { status: 'Monitoring', count: 2 },
                { status: 'Subject_For_2nd_Counseling', count: 1 },
                { status: 'Rejected', count: 7 }
            ],
            error: null
        });

        const counts = await fetchCounselingCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(rpcMock).toHaveBeenCalledWith('get_counseling_status_counts');
        expect(fromMock).not.toHaveBeenCalled();
        expect(counts.awaitingCare).toBe(3); // Submitted + Pending
        expect(counts.awaitingDept).toBe(8); // Approved
        expect(counts[COUNSELING_STATUS.RETURNED_TO_CARE]).toBe(2);
        expect(counts[COUNSELING_STATUS.REFERRED]).toBe(3);
        expect(counts[COUNSELING_STATUS.STAFF_SCHEDULED]).toBe(4);
        expect(counts[COUNSELING_STATUS.SCHEDULED]).toBe(5);
        expect(counts[COUNSELING_STATUS.RESCHEDULED]).toBe(1);
        expect(counts[COUNSELING_STATUS.COMPLETED]).toBe(6);
        expect(counts[COUNSELING_STATUS.COUNSELED]).toBe(3);
        expect(counts[COUNSELING_STATUS.MONITORING]).toBe(2);
        expect(counts[COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING]).toBe(1);
        expect(counts[COUNSELING_STATUS.REJECTED]).toBe(7);
        expect(counts.Calendar).toBe(10); // Staff_Scheduled + Scheduled + Rescheduled
    });

    it('falls back to per-status head counts when the RPC is unavailable', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
        const countQueue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        fromMock.mockImplementation(() => makeBuilder({ count: countQueue.shift() ?? 0, error: null }));

        const counts = await fetchCounselingCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledTimes(12);
        expect(counts.awaitingCare).toBe(1);
        expect(counts.awaitingDept).toBe(2);
        expect(counts[COUNSELING_STATUS.RETURNED_TO_CARE]).toBe(3);
        expect(counts.Calendar).toBe(5 + 6 + 11); // staffScheduled + deptScheduled + rescheduled
    });
});
