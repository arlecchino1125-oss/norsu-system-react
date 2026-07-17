import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentFormsData } from './useStudentFormsData';

const serviceMocks = vi.hoisted(() => ({
    getActiveFormsPage: vi.fn(),
    getCompletedFormIds: vi.fn(),
}));

vi.mock('../../../../../services/studentPortalService', () => serviceMocks);

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('useStudentFormsData', () => {
    beforeEach(() => {
        serviceMocks.getActiveFormsPage.mockReset().mockResolvedValue({ rows: [{ id: 'form-1' }] });
        serviceMocks.getCompletedFormIds.mockReset().mockResolvedValue(['form-1']);
    });

    it('returns fetched forms and completion state to its caller', async () => {
        const { result } = renderHook(
            () => useStudentFormsData({ studentId: 'student-1' }),
            { wrapper: createWrapper() },
        );

        await waitFor(() => expect(result.current.formsList).toEqual([{ id: 'form-1' }]));
        expect(result.current.completedForms).toEqual(new Set(['form-1']));
        expect(result.current.loadingForm).toBe(false);
    });
});
