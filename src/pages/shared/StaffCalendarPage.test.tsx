import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import StaffCalendarPage from './StaffCalendarPage';

const { mockSupabaseFrom } = vi.hoisted(() => ({
    mockSupabaseFrom: vi.fn()
}));

vi.mock('../../lib/supabase', () => ({
    supabase: {
        from: mockSupabaseFrom
    }
}));

vi.mock('../../services/deptService', () => ({
    getDepartmentInterviewQueue: vi.fn().mockResolvedValue([])
}));

const createSupabaseQueryMock = (data: any[] = []) => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.not = vi.fn(() => builder);
    builder.order = vi.fn(() => Promise.resolve({ data, error: null }));
    return builder;
};

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false
            }
        }
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('StaffCalendarPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSupabaseFrom.mockImplementation(() => createSupabaseQueryMock([]));
    });

    it('renders the header banner, KPI cards, filter toolbar, and empty state matching the design', async () => {
        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <StaffCalendarPage scope="care" accent="purple" />
            </Wrapper>
        );

        // Header
        expect(screen.getByRole('heading', { level: 1, name: 'Calendar View' })).toBeInTheDocument();
        expect(screen.getByText('Simple upcoming list for interviews, counseling schedules, and events.')).toBeInTheDocument();

        // Wait for queries to finish loading
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Refresh Calendar/i })).toBeInTheDocument();
        });

        // 3 KPI Cards
        expect(screen.getByText('INTERVIEWS')).toBeInTheDocument();
        expect(screen.getByText('COUNSELING')).toBeInTheDocument();
        expect(screen.getByText('EVENTS')).toBeInTheDocument();
        expect(screen.getAllByText('upcoming')).toHaveLength(3);

        // Filter toolbar
        expect(screen.getByLabelText('Filter calendar items by type')).toBeInTheDocument();
        expect(screen.getByLabelText('Filter calendar items by date')).toBeInTheDocument();

        // Section header
        expect(screen.getByRole('heading', { level: 2, name: 'Upcoming Schedule' })).toBeInTheDocument();

        // Empty state
        await waitFor(() => {
            expect(screen.getByText('No upcoming items found for the selected filters.')).toBeInTheDocument();
            expect(screen.getByText('Try changing the type or clearing the date filter.')).toBeInTheDocument();
        });
    });

    it('renders scheduled items in table and updates KPI counters', async () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        mockSupabaseFrom.mockImplementation((table: string) => {
            if (table === 'applications') {
                return createSupabaseQueryMock([{
                    id: 101,
                    first_name: 'Maria',
                    last_name: 'Santos',
                    reference_id: 'REF-2026-001',
                    priority_course: 'BSIT',
                    current_choice: 1,
                    status: 'Interview Scheduled',
                    interview_date: futureDate,
                    interview_venue: 'Room 301',
                    interview_panel: 'Panel A',
                    interview_queue_status: 'Waiting'
                }]);
            }
            if (table === 'counseling_requests') {
                return createSupabaseQueryMock([{
                    id: 201,
                    student_name: 'Juan Dela Cruz',
                    department: 'CAS',
                    request_type: 'Career Guidance',
                    status: 'Scheduled',
                    scheduled_date: futureDate,
                    created_at: futureDate
                }]);
            }
            if (table === 'events') {
                return createSupabaseQueryMock([{
                    id: 301,
                    title: 'Campus Career Fair',
                    type: 'Activity',
                    location: 'Gymnasium',
                    event_date: futureDate.slice(0, 10),
                    event_time: '10:00',
                    created_at: futureDate
                }]);
            }
            return createSupabaseQueryMock([]);
        });

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <StaffCalendarPage scope="care" accent="purple" />
            </Wrapper>
        );

        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Refresh Calendar/i })).toBeInTheDocument();
        });

        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
        expect(screen.getByText('Campus Career Fair')).toBeInTheDocument();

        // Check table headers
        expect(screen.getByText('Date')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
        expect(screen.getByText('Item')).toBeInTheDocument();
        expect(screen.getByText('Location / Notes')).toBeInTheDocument();
        expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('filters items by selected type and clears with reset button', async () => {
        const futureDate = new Date(Date.now() + 86400000).toISOString();
        mockSupabaseFrom.mockImplementation((table: string) => {
            if (table === 'applications') {
                return createSupabaseQueryMock([{
                    id: 101,
                    first_name: 'Maria',
                    last_name: 'Santos',
                    reference_id: 'REF-2026-001',
                    status: 'Interview Scheduled',
                    interview_date: futureDate,
                    interview_venue: 'Room 301',
                    interview_panel: 'Panel A'
                }]);
            }
            if (table === 'counseling_requests') {
                return createSupabaseQueryMock([{
                    id: 201,
                    student_name: 'Juan Dela Cruz',
                    department: 'CAS',
                    request_type: 'Career Guidance',
                    status: 'Scheduled',
                    scheduled_date: futureDate
                }]);
            }
            return createSupabaseQueryMock([]);
        });

        const Wrapper = createWrapper();
        const { default: userEvent } = await import('@testing-library/user-event');
        const user = userEvent.setup();

        render(
            <Wrapper>
                <StaffCalendarPage scope="care" accent="purple" />
            </Wrapper>
        );

        await waitFor(() => {
            expect(screen.getByText('Maria Santos')).toBeInTheDocument();
            expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
        });

        const select = screen.getByLabelText('Filter calendar items by type');
        await user.selectOptions(select, 'Interview');

        expect(screen.getByText('Maria Santos')).toBeInTheDocument();
        expect(screen.queryByText('Juan Dela Cruz')).not.toBeInTheDocument();

        // Reset Filters button should be visible
        const resetBtn = screen.getByRole('button', { name: /Reset Filters/i });
        expect(resetBtn).toBeInTheDocument();

        await user.click(resetBtn);
        expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    });
});
