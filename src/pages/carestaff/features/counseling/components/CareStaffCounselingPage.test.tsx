import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffCounselingPage from './CareStaffCounselingPage';
import { COUNSELING_STATUS } from '../../../../../utils/workflow';

const { mockUseCareStaffCounseling } = vi.hoisted(() => ({
    mockUseCareStaffCounseling: vi.fn()
}));

vi.mock('../hooks/useCareStaffCounseling', () => ({
    useCareStaffCounseling: mockUseCareStaffCounseling
}));

describe('CareStaffCounselingPage', () => {
    beforeEach(() => {
        const request = {
            id: 1,
            student_id: '42010001',
            student_name: 'Alex Reyes',
            request_type: 'Self-referral',
            status: COUNSELING_STATUS.REFERRED,
            created_at: '2026-07-26T08:00:00.000Z'
        };

        mockUseCareStaffCounseling.mockReturnValue({
            handleViewProfile: vi.fn(),
            getCounselingStatusTone: vi.fn(() => ''),
            getCounselingStatusLabel: vi.fn((status) => status),
            counselingReqs: [request],
            counselingTotal: 1,
            counselingCounts: {
                awaitingDept: 0,
                [COUNSELING_STATUS.REFERRED]: 1,
                [COUNSELING_STATUS.STAFF_SCHEDULED]: 0,
                [COUNSELING_STATUS.SUBMITTED]: 0,
                [COUNSELING_STATUS.SCHEDULED]: 0,
                [COUNSELING_STATUS.COMPLETED]: 0,
                [COUNSELING_STATUS.REJECTED]: 0,
                Calendar: 0
            },
            currentPage: 1,
            setCurrentPage: vi.fn(),
            loading: false,
            counselingTab: COUNSELING_STATUS.REFERRED,
            setCounselingTab: vi.fn(),
            isRefreshingData: false,
            viewFormReq: null,
            setViewFormReq: vi.fn(),
            showCounselingFormModal: false,
            setShowCounselingFormModal: vi.fn(),
            formModalView: 'referral',
            setFormModalView: vi.fn(),
            showScheduleModal: false,
            setShowScheduleModal: vi.fn(),
            scheduleData: { date: '', time: '', location: '', notes: '' },
            setScheduleData: vi.fn(),
            setSelectedApp: vi.fn(),
            isSchedulingSession: false,
            showCompleteModal: false,
            setShowCompleteModal: vi.fn(),
            completionForm: { id: null, student_id: null, publicNotes: '', privateNotes: '' },
            setCompletionForm: vi.fn(),
            isCompletingSession: false,
            handleRefreshData: vi.fn(),
            handleScheduleSubmit: vi.fn(),
            handleCompleteSession: vi.fn(),
            handleDownloadReferralForm: vi.fn(),
            totalRequestCount: 1,
            visibleCounselingReqs: [request]
        });
    });

    it('presents counseling requests as a compact semantic list with their actions', () => {
        render(<CareStaffCounselingPage functions={{} as any} />);

        expect(screen.getByRole('table', { name: 'Counseling requests' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'View Form' })).toBeInTheDocument();
    });
});
