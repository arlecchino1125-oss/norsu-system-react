import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentProfileData } from './useStudentProfileData';

const serviceMocks = vi.hoisted(() => ({
    getActiveOfficeVisit: vi.fn(),
    getOfficeVisitReasons: vi.fn(),
    getStudentNotificationsPage: vi.fn(),
}));

vi.mock('../../../../../services/studentPortalService', () => serviceMocks);

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useStudentProfileData', () => {
    beforeEach(() => {
        serviceMocks.getActiveOfficeVisit.mockReset().mockResolvedValue({ id: 'visit-1' });
        serviceMocks.getOfficeVisitReasons.mockReset().mockResolvedValue([{ id: 'reason-1' }]);
        serviceMocks.getStudentNotificationsPage.mockReset().mockResolvedValue({ rows: [{ id: 'notice-1' }] });
    });

    it('returns profile-side query data to its caller', async () => {
        const { result } = renderHook(
            () => useStudentProfileData({ studentId: 'student-1' }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.activeVisit).toEqual({ id: 'visit-1' }));
        expect(result.current.visitReasons).toEqual([{ id: 'reason-1' }]);
        expect(result.current.notifications).toEqual([{ id: 'notice-1' }]);
    });
});
