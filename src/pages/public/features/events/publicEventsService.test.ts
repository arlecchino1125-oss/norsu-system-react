import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('../../../../lib/supabase', () => ({ supabase: { rpc: (...args: any[]) => rpcMock(...args) } }));

import { verifyPublicStudent, getPublicEvents, timeInPublicEvent } from './publicEventsService';

describe('publicEventsService sends an id and never an email', () => {
    beforeEach(() => rpcMock.mockReset());

    it('verifies with the student id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true, student: { student_id: '202600001' } }, error: null });
        await verifyPublicStudent(' 202600001 ');
        expect(rpcMock).toHaveBeenCalledWith('public_verify_student', { p_student_id: '202600001' });
    });

    it('passes the id to the event list so the server narrows the audience', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents('202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: '202600001' });
    });

    it('sends no id at all for a signed-out guest', async () => {
        rpcMock.mockResolvedValue({ data: [], error: null });
        await getPublicEvents();
        expect(rpcMock).toHaveBeenCalledWith('public_get_active_events', { p_student_id: null });
    });

    it('times in with the id alone', async () => {
        rpcMock.mockResolvedValue({ data: { success: true }, error: null });
        await timeInPublicEvent(7, '202600001');
        expect(rpcMock).toHaveBeenCalledWith('public_event_time_in', { p_event_id: 7, p_student_id: '202600001' });
    });
});