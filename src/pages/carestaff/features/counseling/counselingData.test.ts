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

        // Exactly one table touch, filtered to the clicked tab — this is what a
        // tab click should cost after the split.
        expect(fromMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledWith('counseling_requests');
        expect(builder.eq).toHaveBeenCalledWith('status', COUNSELING_STATUS.REFERRED);
        expect(rpcMock).not.toHaveBeenCalled();
        // Rows come back sorted by created_at desc.
        expect(result.reqs.map((r: any) => r.id)).toEqual([1, 2]);
        expect(result.total).toBe(2);
    });
});

describe('fetchCounselingCounts', () => {
    it('uses ONE grouped-count RPC and buckets statuses (no per-status fan-out)', async () => {
        rpcMock.mockResolvedValue({
            data: [
                { status: 'Submitted', count: 1 },
                { status: 'Pending', count: 2 },
                { status: 'Referred', count: 3 },
                { status: 'Staff_Scheduled', count: 4 },
                { status: 'Scheduled', count: 5 },
                { status: 'Completed', count: 6 },
                { status: 'Rejected', count: 7 }
            ],
            error: null
        });

        const counts = await fetchCounselingCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(rpcMock).toHaveBeenCalledWith('get_counseling_status_counts');
        expect(fromMock).not.toHaveBeenCalled(); // the 6-request fan-out is gone
        expect(counts.awaitingDept).toBe(3); // Submitted + Pending
        expect(counts[COUNSELING_STATUS.REFERRED]).toBe(3);
        expect(counts[COUNSELING_STATUS.STAFF_SCHEDULED]).toBe(4);
        expect(counts[COUNSELING_STATUS.SCHEDULED]).toBe(5);
        expect(counts[COUNSELING_STATUS.COMPLETED]).toBe(6);
        expect(counts[COUNSELING_STATUS.REJECTED]).toBe(7);
        expect(counts.Calendar).toBe(9); // Staff_Scheduled + Scheduled
    });

    it('falls back to per-status head counts when the RPC is unavailable', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
        // countForTab is called in this order: Submitted, Referred, Staff_Scheduled,
        // Scheduled, Completed, Rejected — each awaits a fresh builder.
        const countQueue = [1, 3, 4, 5, 6, 7];
        fromMock.mockImplementation(() => makeBuilder({ count: countQueue.shift() ?? 0, error: null }));

        const counts = await fetchCounselingCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledTimes(6); // fallback fan-out
        expect(counts.awaitingDept).toBe(1);
        expect(counts[COUNSELING_STATUS.REFERRED]).toBe(3);
        expect(counts.Calendar).toBe(9); // 4 + 5
    });
});
