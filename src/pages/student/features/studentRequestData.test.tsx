import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CounselingView from './counseling/components/CounselingView';
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

    it('renders referral records and status in CounselingView even when rawCounselingRequests is passed as empty array', async () => {
        serviceMocks.getStudentCounselingRequestsPage.mockResolvedValue({
            rows: [{
                id: 'counsel-referral-1',
                request_type: 'Dean Referral',
                status: 'Referred',
                reason_for_referral: 'Needs academic guidance',
                referred_by: 'Dean Smith',
                created_at: '2026-03-20T10:00:00Z'
            }],
        });

        const Wrapper = createWrapper();
        render(
            <Wrapper>
                <CounselingView
                    personalInfo={{ studentId: 'student-1' }}
                    formatFullDate={(d: Date) => d.toISOString()}
                    showToast={vi.fn()}
                    counselingRequests={[]}
                    Icons={{ Counseling: () => null, Clock: () => null, CheckCircle: () => null }}
                />
            </Wrapper>
        );

        expect(await screen.findAllByText('Counseling Session')).toBeDefined();
        expect(await screen.findByText('Dean Referral')).toBeDefined();
        expect(await screen.findByText('Referred for Counseling')).toBeDefined();
        expect(await screen.findByText('Needs academic guidance')).toBeDefined();
    });
});
