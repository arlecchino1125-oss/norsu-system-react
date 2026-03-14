import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    eventsQueryMock,
    counselingQueryMock,
    attendanceQueryMock,
    notificationsQueryMock,
    supportQueryMock,
    fromMock
} = vi.hoisted(() => ({
    eventsQueryMock: {
        select: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    counselingQueryMock: {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    attendanceQueryMock: {
        select: vi.fn(),
        eq: vi.fn()
    } as any,
    notificationsQueryMock: {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    supportQueryMock: {
        select: vi.fn(),
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

import {
    getAttendanceHistory,
    getEventsPage,
    getStudentCounselingRequestsPage,
    getStudentNotificationsPage,
    getStudentSupportRequestsPage
} from './studentPortalService';

const resetMocks = () => {
    eventsQueryMock.select.mockReturnValue(eventsQueryMock);
    eventsQueryMock.order.mockReturnValue(eventsQueryMock);
    eventsQueryMock.range.mockResolvedValue({ data: [], error: null, count: 0 });

    counselingQueryMock.select.mockReturnValue(counselingQueryMock);
    counselingQueryMock.eq.mockReturnValue(counselingQueryMock);
    counselingQueryMock.order.mockReturnValue(counselingQueryMock);
    counselingQueryMock.range.mockResolvedValue({ data: [], error: null, count: 0 });

    attendanceQueryMock.select.mockReturnValue(attendanceQueryMock);
    attendanceQueryMock.eq.mockResolvedValue({ data: [], error: null });

    notificationsQueryMock.select.mockReturnValue(notificationsQueryMock);
    notificationsQueryMock.eq.mockReturnValue(notificationsQueryMock);
    notificationsQueryMock.order.mockReturnValue(notificationsQueryMock);
    notificationsQueryMock.range.mockResolvedValue({ data: [], error: null, count: 0 });

    supportQueryMock.select.mockReturnValue(supportQueryMock);
    supportQueryMock.eq.mockReturnValue(supportQueryMock);
    supportQueryMock.order.mockReturnValue(supportQueryMock);
    supportQueryMock.range.mockResolvedValue({ data: [], error: null, count: 0 });
};

describe('studentPortalService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetMocks();
        fromMock.mockImplementation((table: string) => {
            if (table === 'events') return eventsQueryMock;
            if (table === 'counseling_requests') return counselingQueryMock;
            if (table === 'event_attendance') return attendanceQueryMock;
            if (table === 'notifications') return notificationsQueryMock;
            if (table === 'support_requests') return supportQueryMock;
            throw new Error(`Unexpected table: ${table}`);
        });
    });

    it('queries events using the current schema columns', async () => {
        await getEventsPage({ page: 1, pageSize: 25 });

        expect(eventsQueryMock.select).toHaveBeenCalledWith(
            'id, created_at, title, description, type, location, event_date, event_time, end_time, attendees, latitude, longitude',
            { count: 'exact' }
        );
    });

    it('queries counseling requests with the student-facing schema fields', async () => {
        await getStudentCounselingRequestsPage('202600001', { page: 1, pageSize: 25 });

        expect(counselingQueryMock.select).toHaveBeenCalledWith(
            'id, created_at, student_id, student_name, request_type, description, department, status, course_year, contact_number, reason_for_referral, personal_actions_taken, date_duration_of_concern, referred_by, scheduled_date, resolution_notes, rating, feedback',
            { count: 'exact' }
        );
        expect(counselingQueryMock.eq).toHaveBeenCalledWith('student_id', '202600001');
    });

    it('queries attendance history without the removed status column', async () => {
        await getAttendanceHistory('202600001');

        expect(attendanceQueryMock.select).toHaveBeenCalledWith(
            'id, event_id, student_id, student_name, checked_in_at, time_in, time_out, proof_url, latitude, longitude, department'
        );
        expect(attendanceQueryMock.eq).toHaveBeenCalledWith('student_id', '202600001');
    });

    it('queries notifications using the current schema columns', async () => {
        await getStudentNotificationsPage('202600001', { page: 1, pageSize: 25 });

        expect(notificationsQueryMock.select).toHaveBeenCalledWith(
            'id, created_at, student_id, message, is_read',
            { count: 'exact' }
        );
        expect(notificationsQueryMock.eq).toHaveBeenCalledWith('student_id', '202600001');
    });

    it('queries support requests using the current schema columns', async () => {
        await getStudentSupportRequestsPage('202600001', { page: 1, pageSize: 25 });

        expect(supportQueryMock.select).toHaveBeenCalledWith(
            'id, created_at, student_id, student_name, department, status, support_type, description, documents_url, care_notes, care_documents_url, dept_notes, resolution_notes',
            { count: 'exact' }
        );
        expect(supportQueryMock.eq).toHaveBeenCalledWith('student_id', '202600001');
    });
});
