import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCareStaffEvents, suggestCloseDate, suggestExtendDate, shiftAttendanceCloseDate } from './useCareStaffEvents';
import { supabase } from '../../../../../lib/supabase';

vi.mock('../../../../../hooks/usePermissions', () => ({
    usePermissions: () => ({ canPerformAction: () => false })
}));

vi.mock('../../../../../hooks/useEventsData', () => ({
    useEventsData: () => ({ events: [], archivedEvents: [], refetchEvents: vi.fn() })
}));

vi.mock('../../../../../services/careStaffService', () => ({
    getDepartments: vi.fn().mockResolvedValue([]),
    getCoursesWithDepartments: vi.fn().mockResolvedValue([])
}));

vi.mock('../../../../../lib/supabase', () => ({
    supabase: { from: vi.fn() }
}));

const event = {
    id: 3,
    title: 'Sample event',
    type: 'Event',
    attendance_required: true,
    audience_type: 'all_students'
} as any;

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
    return { promise, resolve };
};

describe('useCareStaffEvents attendance modal loading', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    it.each([
        ['attendees', 'showAttendeesModal'],
        ['absent', 'showAbsentModal']
    ] as const)('opens the %s modal before attendance data resolves', async (target, modalState) => {
        const attendanceRequest = deferred<{ data: any[]; error: null }>();
        const attendanceQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnValue(attendanceRequest.promise)
        };
        const studentsQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            range: vi.fn().mockResolvedValue({ data: [], error: null })
        };
        vi.mocked(supabase.from).mockImplementation((table: string) =>
            (table === 'event_attendance' ? attendanceQuery : studentsQuery) as any
        );

        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        act(() => {
            void result.current.handleViewAttendees(event, target);
        });

        expect(result.current[modalState]).toBe(true);
        expect(result.current.isAttendanceLoading).toBe(true);

        await act(async () => {
            attendanceRequest.resolve({ data: [], error: null });
            await attendanceRequest.promise;
        });

        expect(result.current.isAttendanceLoading).toBe(false);
    });
});

describe('suggestExtendDate', () => {
    afterEach(() => vi.useRealTimers());

    it('never suggests a date already in the past for an event that has closed', () => {
        vi.setSystemTime(new Date('2026-08-03T10:00:00'));
        // The creation default is anchored to the event, so it lands three weeks ago.
        expect(suggestCloseDate('2026-07-13', '16:00')).toBe('2026-07-16T16:00');
        // Extend has to clear now, or accepting it would reopen nothing.
        expect(suggestExtendDate('2026-07-13', '16:00')).toBe('2026-08-06T10:00');
    });

    it('keeps the event-anchored default when it is still ahead of now', () => {
        vi.setSystemTime(new Date('2026-08-03T10:00:00'));
        expect(suggestExtendDate('2026-08-10', '12:00')).toBe('2026-08-13T12:00');
    });

    it('still clears now when the event has no parseable date', () => {
        vi.setSystemTime(new Date('2026-08-03T10:00:00'));
        expect(suggestCloseDate('', '')).toBe('');
        expect(suggestExtendDate('', '')).toBe('2026-08-06T10:00');
    });
});

describe('useCareStaffEvents extend attendance', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    it('pushes the close date forward and un-archives the event', async () => {
        const eq = vi.fn().mockResolvedValue({ error: null });
        const update = vi.fn().mockReturnValue({ eq });
        vi.mocked(supabase.from).mockReturnValue({ update } as any);

        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        await act(async () => {
            await result.current.handleExtendAttendance({ id: 42 } as any, '2026-08-10T17:00');
        });

        expect(update).toHaveBeenCalledWith({
            attendance_closes_at: new Date('2026-08-10T17:00').toISOString(),
            is_archived: false
        });
        expect(eq).toHaveBeenCalledWith('id', 42);
    });

    it('refuses a blank date without touching the database', async () => {
        const showToast = vi.fn();
        const { result } = renderHook(() => useCareStaffEvents({ functions: { showToast } }));

        await act(async () => {
            await result.current.handleExtendAttendance({ id: 42 } as any, '');
        });

        expect(supabase.from).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('Pick a valid closing date.', 'error');
    });
});

describe('shiftAttendanceCloseDate', () => {
    it('keeps the NULL default when there was no explicit close date', () => {
        expect(shiftAttendanceCloseDate(null, { event_date: '2026-08-10', event_time: '09:00' }, { event_date: '2026-08-17', event_time: '09:00' })).toBeNull();
        expect(shiftAttendanceCloseDate(undefined, { event_date: '2026-08-10', event_time: '09:00' }, { event_date: '2026-08-17', event_time: '09:00' })).toBeNull();
    });

    it('shifts an explicit close date by the same offset the event start moved', () => {
        expect(
            shiftAttendanceCloseDate(
                '2026-08-13T04:00:00.000Z',
                { event_date: '2026-08-10', event_time: '09:00' },
                { event_date: '2026-08-17', event_time: '09:00' }
            )
        ).toBe('2026-08-20T04:00:00.000Z');
    });

    it('shifts by time-of-day changes too', () => {
        expect(
            shiftAttendanceCloseDate(
                '2026-08-13T04:00:00.000Z',
                { event_date: '2026-08-10', event_time: '09:00' },
                { event_date: '2026-08-10', event_time: '11:00' }
            )
        ).toBe('2026-08-13T06:00:00.000Z');
    });

    it('returns the original close date when the schedule is not parseable', () => {
        expect(
            shiftAttendanceCloseDate(
                '2026-08-13T04:00:00.000Z',
                { event_date: '', event_time: '' },
                { event_date: '2026-08-17', event_time: '09:00' }
            )
        ).toBe('2026-08-13T04:00:00.000Z');
    });
});

describe('useCareStaffEvents close-date awareness', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    const editableEvent = {
        id: 3,
        title: 'Sample event',
        type: 'Event',
        event_date: '2026-08-10',
        event_time: '09:00',
        end_time: '12:00',
        attendance_closes_at: '2026-08-13T04:00:00.000Z',
        attendance_required: true,
        audience_type: 'all_students'
    } as any;

    it('re-anchors an untouched close date when the schedule date moves', () => {
        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        act(() => {
            result.current.handleEditEvent(editableEvent);
        });

        const before = result.current.newEvent.attendance_closes_at as string;
        expect(before).toBeTruthy();

        act(() => {
            result.current.applyScheduleField('event_date', '2026-08-17');
        });

        const after = result.current.newEvent.attendance_closes_at as string;
        const [beforeDate, beforeTime] = before.split('T');
        const [afterDate, afterTime] = after.split('T');

        // Same wall-clock time, seven days later (no TZ surprises in mid-August).
        expect(afterTime).toBe(beforeTime);
        const expected = new Date(`${beforeDate}T00:00`);
        expected.setDate(expected.getDate() + 7);
        const pad = (n: number) => String(n).padStart(2, '0');
        expect(afterDate).toBe(`${expected.getFullYear()}-${pad(expected.getMonth() + 1)}-${pad(expected.getDate())}`);
    });

    it('keeps a manually-set close date as the staff member typed it', () => {
        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        act(() => {
            result.current.handleEditEvent(editableEvent);
        });

        act(() => {
            result.current.setNewEvent((prev: any) => ({ ...prev, attendance_closes_at: '2026-08-16T18:00' }));
        });
        act(() => {
            result.current.applyScheduleField('event_date', '2026-08-17');
        });

        expect(result.current.newEvent.attendance_closes_at).toBe('2026-08-16T18:00');
    });
});

describe('useCareStaffEvents reschedule event', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    it('updates only the schedule fields and resets the close date', async () => {
        const eq = vi.fn().mockResolvedValue({ error: null });
        const update = vi.fn().mockReturnValue({ eq });
        vi.mocked(supabase.from).mockReturnValue({ update } as any);

        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        await act(async () => {
            await result.current.handleRescheduleEvent(
                { id: 42, title: 'Sample event', type: 'Event' } as any,
                { event_date: '2026-08-20', event_time: '13:00', end_time: '15:00' }
            );
        });

        expect(update).toHaveBeenCalledWith({
            event_date: '2026-08-20',
            event_time: '13:00',
            end_time: '15:00',
            attendance_closes_at: null
        });
        expect(eq).toHaveBeenCalledWith('id', 42);
    });

    it('refuses a blank date or start time without touching the database', async () => {
        const showToast = vi.fn();
        const { result } = renderHook(() => useCareStaffEvents({ functions: { showToast } }));

        await act(async () => {
            await result.current.handleRescheduleEvent({ id: 42, type: 'Event' } as any, { event_date: '', event_time: '' });
        });

        expect(supabase.from).not.toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith('Pick a valid date and start time.', 'error');
    });
});

describe('useCareStaffEvents void attendance', () => {
    beforeEach(() => {
        vi.mocked(supabase.from).mockReset();
    });

    it('deletes the attendance rows and resets the denormalized counter', async () => {
        const deleteEq = vi.fn().mockResolvedValue({ data: null, error: null });
        const resetEq = vi.fn().mockResolvedValue({ data: null, error: null });
        const del = vi.fn().mockReturnValue({ eq: deleteEq });
        const update = vi.fn().mockReturnValue({ eq: resetEq });
        vi.mocked(supabase.from).mockImplementation((table: string) =>
            (table === 'event_attendance' ? { delete: del } : { update }) as any
        );

        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        await act(async () => {
            await result.current.handleVoidAttendance(7);
        });

        expect(del).toHaveBeenCalled();
        expect(deleteEq).toHaveBeenCalledWith('event_id', 7);
        expect(update).toHaveBeenCalledWith({ attendees: 0 });
        expect(resetEq).toHaveBeenCalledWith('id', 7);
        expect(result.current.attendees).toEqual([]);
    });

    it('does nothing when there is no event id', async () => {
        const { result } = renderHook(() => useCareStaffEvents({ functions: {} }));

        await act(async () => {
            await result.current.handleVoidAttendance(undefined);
        });

        expect(supabase.from).not.toHaveBeenCalled();
    });
});
