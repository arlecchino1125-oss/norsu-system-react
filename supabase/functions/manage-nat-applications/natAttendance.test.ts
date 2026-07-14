import { describe, expect, it } from 'vitest';
import { buildNatAttendanceUpdate } from './natAttendance.ts';

const insideAssignedWindow = new Date('2026-07-14T01:00:00.000Z'); // 09:00 Asia/Manila

describe('NAT attendance policy', () => {
    it('allows the first time-in on the assigned Manila date and time window', () => {
        expect(buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: '08:00-12:00',
            time_in: null,
            time_out: null
        }, 'time-in', insideAssignedWindow)).toEqual({
            time_in: insideAssignedWindow.toISOString(),
            status: 'Ongoing'
        });
    });

    it('rejects time-in on a different test date', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-15',
            test_time: '08:00-12:00'
        }, 'time-in', insideAssignedWindow)).toThrow('Time In is available only on your assigned test date.');
    });

    it('rejects time-in outside the assigned time window', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: '13:00-17:00'
        }, 'time-in', insideAssignedWindow)).toThrow('Time In is not available during this time window.');
    });

    it('rejects a malformed non-empty assigned time window', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: 'not-a-time-window'
        }, 'time-in', insideAssignedWindow)).toThrow('Time In is not available during this time window.');
    });

    it('rejects a time window with trailing components', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: '08:00-12:00-extra'
        }, 'time-in', insideAssignedWindow)).toThrow('Time In is not available during this time window.');
    });

    it('keeps the legacy daytime fallback when no time window was stored', () => {
        expect(buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: null
        }, 'time-in', insideAssignedWindow)).toMatchObject({ status: 'Ongoing' });
    });

    it('never overwrites an existing time-in', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: '08:00-12:00',
            time_in: '2026-07-14T00:30:00.000Z'
        }, 'time-in', insideAssignedWindow)).toThrow('Time In has already been recorded.');
    });

    it('rejects time-in after time-out has already been recorded', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            test_date: '2026-07-14',
            test_time: '08:00-12:00',
            time_in: null,
            time_out: '2026-07-14T02:00:00.000Z'
        }, 'time-in', insideAssignedWindow)).toThrow('Time Out has already been recorded.');
    });

    it('requires time-in before the first time-out', () => {
        expect(() => buildNatAttendanceUpdate({ status: 'Ongoing', time_in: null }, 'time-out', insideAssignedWindow))
            .toThrow('Record Time In before recording Time Out.');
    });

    it('never overwrites an existing time-out', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Ongoing',
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: '2026-07-14T02:00:00.000Z'
        }, 'time-out', insideAssignedWindow)).toThrow('Time Out has already been recorded.');
    });

    it('allows the first time-out after time-in', () => {
        expect(buildNatAttendanceUpdate({
            status: 'Ongoing',
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: null
        }, 'time-out', insideAssignedWindow)).toEqual({
            time_out: insideAssignedWindow.toISOString(),
            status: 'Test Taken'
        });
    });

    it('requires Submitted status before time-in', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Qualified for Interview (1st Choice)',
            test_date: '2026-07-14',
            test_time: '08:00-12:00',
            time_in: null,
            time_out: null
        }, 'time-in', insideAssignedWindow)).toThrow('Time In is available only for submitted applications.');
    });

    it('requires Ongoing status before time-out', () => {
        expect(() => buildNatAttendanceUpdate({
            status: 'Submitted',
            time_in: '2026-07-14T00:30:00.000Z',
            time_out: null
        }, 'time-out', insideAssignedWindow)).toThrow('Time Out is available only after Time In.');
    });
});
