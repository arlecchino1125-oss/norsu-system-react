import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentEventsData } from './useStudentEventsData';

const serviceMocks = vi.hoisted(() => ({
    getEventsPage: vi.fn(),
}));

vi.mock('../../../../../services/studentPortalService', () => serviceMocks);

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useStudentEventsData', () => {
    beforeEach(() => {
        serviceMocks.getEventsPage.mockReset().mockResolvedValue({
            rows: [{ id: 'event-1', event_date: '2999-01-01', type: 'Announcement' }],
        });
    });

    it('returns eligible active events to its caller', async () => {
        const { result } = renderHook(
            () => useStudentEventsData({ personalInfo: {} }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.eventsList).toHaveLength(1));
        expect(result.current.eventsList[0].id).toBe('event-1');
    });
});
