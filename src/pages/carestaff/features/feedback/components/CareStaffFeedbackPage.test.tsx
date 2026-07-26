import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CareStaffFeedbackPage from './CareStaffFeedbackPage';
import { exportToExcel } from '../../../../../utils/dashboardUtils';
import { useCareStaffFeedback } from '../hooks/useCareStaffFeedback';

vi.mock('../../../../../utils/dashboardUtils', () => ({ exportToExcel: vi.fn() }));
vi.mock('../hooks/useCareStaffFeedback', () => ({
    FEEDBACK_PAGE_SIZE: 12,
    useCareStaffFeedback: vi.fn()
}));

const identifyingFeedback = {
    id: 'feedback-1',
    student_id: '202600001',
    student_name: 'Named Student',
    client_type: 'Student',
    sex: 'Female',
    age: 20,
    region: 'VII',
    service_availed: 'Counseling',
    cc1: 1,
    cc2: 1,
    cc3: 1,
    sqd0: 5,
    sqd1: 5,
    sqd2: 5,
    sqd3: 5,
    sqd4: 5,
    sqd5: 5,
    sqd6: 5,
    sqd7: 5,
    sqd8: 5,
    suggestions: 'More appointment slots',
    email: 'student@example.com',
    created_at: '2026-07-26T12:00:00Z'
};

describe('CareStaffFeedbackPage privacy', () => {
    beforeEach(() => {
        vi.mocked(useCareStaffFeedback).mockReturnValue({
            currentView: 'General',
            setCurrentView: vi.fn(),
            eventFilter: 'All Events',
            setEventFilter: vi.fn(),
            currentPage: 1,
            setCurrentPage: vi.fn(),
            feedbackTotal: 1,
            items: [{
                id: 'feedback-1',
                student: 'Named Student',
                rating: 5,
                comment: 'More appointment slots',
                date: '2026-07-26T12:00:00Z',
                context: 'Counseling',
                hasEvaluation: false
            }],
            rawEventData: [],
            loading: false,
            stats: { avg: 5, total: 1, distribution: [0, 0, 0, 0, 1] },
            viewingEval: null,
            setViewingEval: vi.fn(),
            rawGeneralData: [identifyingFeedback],
            viewingCSM: identifyingFeedback,
            setViewingCSM: vi.fn(),
            printRef: { current: null },
            criteriaLabels: [],
            ccQuestions: [],
            getCcAnswerText: vi.fn(),
            getEventName: vi.fn(),
            getEventRating: vi.fn(),
            handleViewEvaluation: vi.fn(),
            eventOptions: ['All Events'],
            filteredEventRows: [],
            eventCriteriaStats: [],
            eventOpenText: { best: [], suggestions: [], comments: [] },
            handlePrintEval: vi.fn()
        } as any);
    });

    it('hides respondent identity from cards, details, and exports', () => {
        render(<CareStaffFeedbackPage functions={{ showToast: vi.fn() }} />);

        expect(screen.queryByText('Named Student')).not.toBeInTheDocument();
        expect(screen.queryByText('student@example.com')).not.toBeInTheDocument();
        expect(screen.getAllByText('Anonymous').length).toBeGreaterThan(0);

        fireEvent.click(screen.getByRole('button', { name: 'Export Excel' }));

        const [headers, rows] = vi.mocked(exportToExcel).mock.calls[0];
        expect(headers).not.toContain('Student');
        expect(headers).not.toContain('Email');
        expect(rows.flat()).not.toContain('Named Student');
        expect(rows.flat()).not.toContain('student@example.com');
    });
});
