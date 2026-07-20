import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentCounselingData } from './counseling/hooks/useStudentCounselingData';
import { useStudentSupportData } from './support/hooks/useStudentSupportData';

const serviceMocks = vi.hoisted(() => ({
    getStudentCounselingRequestsPage: vi.fn(),
    getStudentSupportRequestsPage: vi.fn(),
}));

vi.mock('../../../services/studentPortalService', () => serviceMocks);

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('student request data hooks', () => {
    beforeEach(() => {
        serviceMocks.getStudentCounselingRequestsPage.mockReset().mockResolvedValue({
            rows: [{ id: 'counseling-1' }],
        });
        serviceMocks.getStudentSupportRequestsPage.mockReset().mockResolvedValue({
            rows: [{ id: 'support-1' }],
        });
    });

    it('returns counseling rows from the query cache', async () => {
        const { result } = renderHook(() => useStudentCounselingData({
            studentId: 'student-1',
        }), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.counselingRequests).toEqual([{ id: 'counseling-1' }]));
    });

    it('returns support rows from the query cache', async () => {
        const { result } = renderHook(() => useStudentSupportData({
            studentId: 'student-1',
        }), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.supportRequests).toEqual([{ id: 'support-1' }]));
    });
});
