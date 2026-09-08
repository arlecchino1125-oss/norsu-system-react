import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffSupportPage from './CareStaffSupportPage';
import { SUPPORT_STATUS } from '../../../../../utils/workflow';

const { mockUseCareStaffSupport } = vi.hoisted(() => ({
    mockUseCareStaffSupport: vi.fn()
}));

vi.mock('../hooks/useCareStaffSupport', () => ({
    useCareStaffSupport: mockUseCareStaffSupport
}));

describe('CareStaffSupportPage', () => {
    const sampleRequest = {
        id: 1,
        student_id: '420133853',
        student_name: 'Junemi Gelacio',
        support_type: 'Working Student Support',
        status: SUPPORT_STATUS.SUBMITTED,
        created_at: '2026-06-28T08:00:00.000Z'
    };

    beforeEach(() => {
        mockUseCareStaffSupport.mockReturnValue({
            showToast: vi.fn(),
            supportTotal: 1,
            currentPage: 1,
            setCurrentPage: vi.fn(),
            supportLoading: false,
            supportTab: SUPPORT_STATUS.SUBMITTED,
            setSupportTab: vi.fn(),
            supportCategory: 'All',
            setSupportCategory: vi.fn(),
            isRefreshingData: false,
            showSupportModal: false,
            setShowSupportModal: vi.fn(),
            selectedSupportReq: null,
            selectedStudent: null,
            supportForm: { care_notes: '', resolution_notes: '' },
            setSupportForm: vi.fn(),
            letterFile: null,
            setLetterFile: vi.fn(),
            isForwardingSupport: false,
            isFinalizingSupport: false,
            parseDeptNotes: vi.fn(),
            supportTabs: [
                { id: SUPPORT_STATUS.SUBMITTED, label: 'Submitted', count: 1 },
                { id: SUPPORT_STATUS.FORWARDED_TO_DEPT, label: 'Forwarded to College', count: 1 },
                { id: SUPPORT_STATUS.VISIT_SCHEDULED, label: 'Visit Scheduled', count: 0 },
                { id: 'dept_updates', label: 'College Updates', count: 0 },
                { id: SUPPORT_STATUS.COMPLETED, label: 'Completed', count: 0 }
            ],
            visibleSupportReqs: [sampleRequest],
            handleRefreshData: vi.fn(),
            openSupportModal: vi.fn(),
            handleForwardSupport: vi.fn(),
            handleLetterFileChange: vi.fn(),
            handleFinalizeSupport: vi.fn(),
            handlePrintSupport: vi.fn(),
            renderDetailedDescription: vi.fn()
        });
    });

    it('renders the header, toolbar status pills, student row, and pagination footer', () => {
        render(<CareStaffSupportPage />);

        // Header
        expect(screen.getByRole('heading', { level: 1, name: 'Additional Support Management' })).toBeInTheDocument();
        expect(screen.getByText('Manage and respond to student support requests across all categories.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh data/i })).toBeInTheDocument();

        // Toolbar Status Pills & Filter
        expect(screen.getByRole('button', { name: /submitted/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /forwarded to college/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /filter support requests by category/i })).toBeInTheDocument();

        // Student row
        expect(screen.getByText('JG')).toBeInTheDocument();
        expect(screen.getByText('Junemi Gelacio')).toBeInTheDocument();
        expect(screen.getByText('420133853')).toBeInTheDocument();
        expect(screen.getAllByText('Working Student Support').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByRole('button', { name: /manage/i })).toBeInTheDocument();

        // Pagination
        expect(screen.getByText(/showing/i)).toBeInTheDocument();
        expect(screen.getByText('1 / 1')).toBeInTheDocument();
    });

    it('displays the empty state when no records match', () => {
        mockUseCareStaffSupport.mockReturnValue({
            ...mockUseCareStaffSupport(),
            supportTotal: 0,
            visibleSupportReqs: []
        });

        render(<CareStaffSupportPage />);

        expect(screen.getByText('No requests found')).toBeInTheDocument();
        expect(screen.getByText('No records currently match this filter.')).toBeInTheDocument();
    });
});
