import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffCounselingPage from './CareStaffCounselingPage';
import { COUNSELING_STATUS } from '../../../../../utils/workflow';

const { mockUseCareStaffCounseling } = vi.hoisted(() => ({
    mockUseCareStaffCounseling: vi.fn()
}));

vi.mock('../hooks/useCareStaffCounseling', () => ({
    useCareStaffCounseling: mockUseCareStaffCounseling
}));

vi.mock('../../../../../hooks/usePermissions', () => ({
    usePermissions: () => ({
        getPermissionAccessState: () => ({ isAllowed: true, status: 'enabled' }),
        canPerformAction: () => true,
        canAccessFeature: () => true
    })
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
                awaitingCare: 0,
                awaitingDept: 0,
                [COUNSELING_STATUS.RETURNED_TO_CARE]: 0,
                [COUNSELING_STATUS.REFERRED]: 1,
                [COUNSELING_STATUS.STAFF_SCHEDULED]: 0,
                [COUNSELING_STATUS.SUBMITTED]: 0,
                [COUNSELING_STATUS.SCHEDULED]: 0,
                [COUNSELING_STATUS.COMPLETED]: 0,
                [COUNSELING_STATUS.COUNSELED]: 0,
                [COUNSELING_STATUS.MONITORING]: 0,
                [COUNSELING_STATUS.SUBJECT_FOR_2ND_COUNSELING]: 0,
                [COUNSELING_STATUS.RESCHEDULED]: 0,
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
            handleApproveRequest: vi.fn(),
            handleRejectRequest: vi.fn(),
            handleSetOutcome: vi.fn(),
            handleRescheduleSession: vi.fn(),
            handleScheduleFollowUp: vi.fn(),
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

    it('renders the status pills toolbar with all v2 tabs and displays the pagination footer', () => {
        render(<CareStaffCounselingPage functions={{} as any} />);

        // Status pills toolbar
        expect(screen.getByRole('button', { name: /Needs Review 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /College Review 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Returned to CARE 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Forwarded 1/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Staff Scheduled 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /College Scheduled 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Completed 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Counseled 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Monitoring 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Subject for 2nd 0/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Rescheduled 0/i })).toBeInTheDocument();

        // No rejected tab
        expect(screen.queryByRole('button', { name: /Rejected/i })).not.toBeInTheDocument();

        // Student details and avatar
        expect(screen.getByText('Alex Reyes')).toBeInTheDocument();
        expect(screen.getByText('AR')).toBeInTheDocument();
        expect(screen.getByText(/42010001/)).toBeInTheDocument();

        // Pagination footer
        expect(screen.getByText(/Showing/i)).toBeInTheDocument();
        expect(screen.getByText('1–1')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    });
});
