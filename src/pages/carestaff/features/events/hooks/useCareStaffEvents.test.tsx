import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCareStaffEvents, suggestCloseDate, suggestExtendDate } from './useCareStaffEvents';
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
