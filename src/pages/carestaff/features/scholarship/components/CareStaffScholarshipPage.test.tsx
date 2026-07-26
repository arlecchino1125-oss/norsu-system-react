import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffScholarshipPage from './CareStaffScholarshipPage';

const { mockUseCareStaffScholarship } = vi.hoisted(() => ({
    mockUseCareStaffScholarship: vi.fn()
}));

vi.mock('../hooks/useCareStaffScholarship', () => ({
    useCareStaffScholarship: mockUseCareStaffScholarship
}));

describe('CareStaffScholarshipPage', () => {
    beforeEach(() => {
        mockUseCareStaffScholarship.mockReturnValue({
            loading: false,
            isRefreshingData: false,
            isEditing: false,
            setIsEditing: vi.fn(),
            parsedScholarships: [{ id: '1', title: 'Active Scholarship', deadline: '2026-07-31' }],
            parsedClosedScholarships: [{ id: '2', title: 'Closed Scholarship', deadline: '2026-06-30' }],
            showScholarshipModal: true,
            setShowScholarshipModal: vi.fn(),
            showApplicantModal: true,
            setShowApplicantModal: vi.fn(),
            applicantsLoading: false,
            applicantsError: '',
            scholarshipForm: {
                title: '',
                description: '',
                requirements: '',
                deadline: '',
                application_method: 'portal',
                application_url: '',
                is_active: true
            },
            setScholarshipForm: vi.fn(),
            applicantsList: [],
            selectedScholarship: { id: '3', title: 'Applicant Scholarship', deadline: '2026-08-31' },
            detailScholarship: { id: '4', title: 'Detail Scholarship', deadline: '2026-09-30' },
            setDetailScholarship: vi.fn(),
            handleSaveScholarship: vi.fn(),
            handleViewApplicants: vi.fn(),
            handleRefreshData: vi.fn(),
            getStudentFullName: vi.fn(),
            handleExportApplicants: vi.fn(),
            handleExportApplicantsForScholarship: vi.fn()
        });
    });

    it('anchors every scholarship modal as a full content-region panel', () => {
        render(<CareStaffScholarshipPage functions={{ showToast: vi.fn() }} />);

        ['Add New Scholarship', 'Applicants List', 'Detail Scholarship'].forEach((title) => {
            const shell = screen.getByRole('heading', { name: title }).closest('.absolute');

            expect(shell).toHaveClass('inset-x-0', 'bottom-0', 'top-[4.25rem]');
            expect(shell?.firstElementChild).toHaveClass('h-full', 'w-full', 'rounded-2xl');
        });
    });

    it('switches between dedicated active and closed sections without deletion controls', () => {
        render(<CareStaffScholarshipPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByText('Active Scholarship')).toBeInTheDocument();
        expect(screen.queryByText('Closed Scholarship')).not.toBeInTheDocument();
        expect(screen.queryByTitle('Close Scholarship')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('tab', { name: 'Closed (1)' }));

        expect(screen.getByText('Closed Scholarship')).toBeInTheDocument();
        expect(screen.queryByText('Active Scholarship')).not.toBeInTheDocument();
    });

    it('gives long scholarship fields enough editable space', () => {
        render(<CareStaffScholarshipPage functions={{ showToast: vi.fn() }} />);

        ['Description', 'Requirements'].forEach((label) => {
            const field = screen.getByLabelText(label);

            expect(field).toHaveAttribute('rows', '8');
            expect(field).toHaveClass('resize-y');
        });
    });
});
