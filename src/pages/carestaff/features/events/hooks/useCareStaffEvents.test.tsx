import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCareStaffEvents } from './useCareStaffEvents';
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
