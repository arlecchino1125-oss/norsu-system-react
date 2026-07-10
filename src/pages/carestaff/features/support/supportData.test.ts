import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fromMock, rpcMock } = vi.hoisted(() => ({
    fromMock: vi.fn(),
    rpcMock: vi.fn()
}));

vi.mock('../../../../lib/supabase', () => ({
    supabase: { from: fromMock, rpc: rpcMock }
}));

import { fetchSupportCounts, fetchSupportListPage } from './supportData';
import { SUPPORT_STATUS } from '../../../../utils/workflow';

// A Supabase query-builder stand-in: chainable, and thenable so that both the
// list path (`await ...range()`) and the head-count path (`await builder`) resolve
// to `result`.
const makeBuilder = (result: any) => {
    const builder: any = {
        select: vi.fn(() => builder),
        in: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        ilike: vi.fn(() => builder),
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

describe('fetchSupportListPage', () => {
    it('fetches only the list for the selected tab — no counts, no RPC', async () => {
        const rows = [
            { id: 2, status: 'Submitted', created_at: '2026-01-02' },
            { id: 1, status: 'Submitted', created_at: '2026-01-03' }
        ];
        const builder = makeBuilder({ data: rows, error: null, count: 2 });
        fromMock.mockReturnValue(builder);

        const result = await fetchSupportListPage(SUPPORT_STATUS.SUBMITTED, 'All', 1);

        // Exactly one table touch, filtered to the clicked tab — this is what a
        // tab click should cost after the split.
        expect(fromMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledWith('support_requests');
        expect(builder.eq).toHaveBeenCalledWith('status', SUPPORT_STATUS.SUBMITTED);
        expect(builder.ilike).not.toHaveBeenCalled(); // 'All' category adds no filter
        expect(rpcMock).not.toHaveBeenCalled();
        expect(result.reqs.map((r: any) => r.id)).toEqual([1, 2]); // created_at desc
        expect(result.total).toBe(2);
    });

    it('applies the category filter when one is selected', async () => {
        const builder = makeBuilder({ data: [], error: null, count: 0 });
        fromMock.mockReturnValue(builder);

        await fetchSupportListPage('dept_updates', 'Financial', 1);

        expect(builder.in).toHaveBeenCalled(); // dept_updates = status set
        expect(builder.ilike).toHaveBeenCalledWith('support_type', '%Financial%');
    });
});

describe('fetchSupportCounts', () => {
    it('uses ONE grouped-count RPC and buckets statuses (no per-status fan-out)', async () => {
        rpcMock.mockResolvedValue({
            data: [
                { status: 'Submitted', count: 1 },
                { status: 'Forwarded to Dept', count: 2 },
                { status: 'Visit Scheduled', count: 3 },
                { status: 'Resolved by Dept', count: 4 },
                { status: 'Referred to CARE', count: 5 },
                { status: 'Rejected', count: 6 },
                { status: 'Approved', count: 7 },
                { status: 'Completed', count: 8 }
            ],
            error: null
        });

        const counts = await fetchSupportCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(rpcMock).toHaveBeenCalledWith('get_support_status_counts');
        expect(fromMock).not.toHaveBeenCalled(); // the 5-request fan-out is gone
        expect(counts[SUPPORT_STATUS.SUBMITTED]).toBe(1);
        expect(counts[SUPPORT_STATUS.FORWARDED_TO_DEPT]).toBe(2);
        expect(counts[SUPPORT_STATUS.VISIT_SCHEDULED]).toBe(3);
        // dept_updates = Visit Scheduled + Resolved by Dept + Referred to CARE + Rejected + Approved
        expect(counts.dept_updates).toBe(3 + 4 + 5 + 6 + 7);
        expect(counts[SUPPORT_STATUS.COMPLETED]).toBe(8);
    });

    it('falls back to per-status head counts when the RPC is unavailable', async () => {
        rpcMock.mockResolvedValue({ data: null, error: { message: 'function does not exist' } });
        // countForTab order: Submitted, Forwarded to Dept, Visit Scheduled, dept_updates, Completed.
        const countQueue = [1, 2, 3, 25, 8];
        fromMock.mockImplementation(() => makeBuilder({ count: countQueue.shift() ?? 0, error: null }));

        const counts = await fetchSupportCounts();

        expect(rpcMock).toHaveBeenCalledTimes(1);
        expect(fromMock).toHaveBeenCalledTimes(5); // fallback fan-out
        expect(counts[SUPPORT_STATUS.SUBMITTED]).toBe(1);
        expect(counts.dept_updates).toBe(25);
        expect(counts[SUPPORT_STATUS.COMPLETED]).toBe(8);
    });
});
