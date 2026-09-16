import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EventEvaluationResultsModal from './EventEvaluationResultsModal';
import { getEvaluationResults } from '../eventEvaluationService';
import { exportToExcel } from '../../../../../utils/dashboardUtils';

vi.mock('../eventEvaluationService', () => ({
    getEvaluationResults: vi.fn()
}));

vi.mock('../../../../../utils/dashboardUtils', () => ({
    exportToExcel: vi.fn()
}));

const results = {
    form: {
        id: 7,
        title: 'Sample Evaluation',
        description: 'Feedback form',
        event_id: 1,
        is_active: true,
        created_at: '2026-07-25T10:00:00Z'
    },
    questions: [],
    responses: [{
        id: 1,
        student_id: '420135326',
        student_name: 'Dela Cruz, Juan',
        department: 'CAFF',
        course: 'Bachelor of Science in Agribusiness',
        year_level: '1st Year',
        sex: 'Female',
        gender_identity: 'CIS Gender',
        submitted_at: '2026-07-26T12:00:00Z'
    }],
    answers: []
};

const renderModal = () => render(
    <EventEvaluationResultsModal
        open
        onClose={vi.fn()}
        formId={7}
        eventTitle="Campus Seminar"
        eventDate="2026-07-25"
        showToast={vi.fn()}
    />
);

describe('EventEvaluationResultsModal annotations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getEvaluationResults).mockResolvedValue(results);
    });

    it('keeps the department filter without showing a department table column', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.getByRole('combobox', { name: 'Filter by department' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Department' })).not.toBeInTheDocument();
    });

    it('renders evaluation created date and event date in header meta', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        const eventDateLabel = screen.getByText('Event date');
        expect(eventDateLabel).toBeInTheDocument();
        expect(eventDateLabel.parentElement).toHaveTextContent('Event date7/25/2026');

        const evaluationDateLabel = screen.getByText('Evaluation created');
        expect(evaluationDateLabel).toBeInTheDocument();
        expect(evaluationDateLabel.parentElement).toHaveTextContent('Evaluation created7/25/2026');
    });

    it('shows student name column and displays female and gender identity pills', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.getByRole('columnheader', { name: 'Student Name' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Gender' })).toBeInTheDocument();
        expect(screen.getByText('Female')).toBeInTheDocument();
        expect(screen.getByText('CIS Gender')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Filter by gender' })).toBeInTheDocument();
    });

    it('toggles respondent demographics breakdown panel', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        const toggleBtn = screen.getByRole('button', { name: /Respondent Demographics/i });
        expect(screen.queryByText('Sex Assigned at Birth')).not.toBeInTheDocument();

        fireEvent.click(toggleBtn);
        expect(screen.getByText('Sex Assigned at Birth')).toBeInTheDocument();
        expect(screen.getAllByText('Female').length).toBeGreaterThanOrEqual(1);
    });

    it('includes Sex Assigned at Birth and Gender Identity in exported excel headers and rows', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        const exportBtn = screen.getByRole('button', { name: /Export all/i });
        await act(async () => {
            fireEvent.click(exportBtn);
        });

        expect(exportToExcel).toHaveBeenCalledTimes(1);
        const [headers, rows] = vi.mocked(exportToExcel).mock.calls[0];
        expect(headers).toContain('Sex Assigned at Birth');
        expect(headers).toContain('Gender Identity');
        expect(rows[0]).toContain('Female');
        expect(rows[0]).toContain('CIS Gender');
    });

    it('displays Sex and Gender Identity in respondent detail view when a row is clicked', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        const row = screen.getByText('Dela Cruz, Juan').closest('tr');
        expect(row).toBeInTheDocument();
        fireEvent.click(row!);

        expect(screen.getByText('Student ID')).toBeInTheDocument();
        expect(screen.getByText('420135326')).toBeInTheDocument();
        expect(screen.getByText('Sex')).toBeInTheDocument();
        expect(screen.getByText('Gender Identity')).toBeInTheDocument();

        const backBtn = screen.getByRole('button', { name: /Back to list/i });
        fireEvent.click(backBtn);
        expect(screen.getByRole('columnheader', { name: 'Student Name' })).toBeInTheDocument();
    });

    it('filters responses when gender filter is selected', async () => {
        vi.mocked(getEvaluationResults).mockResolvedValue({
            ...results,
            responses: [
                {
                    id: 1,
                    student_id: '420135326',
                    student_name: 'Dela Cruz, Juan',
                    department: 'CAFF',
                    course: 'BS Agribusiness',
                    year_level: '1st Year',
                    sex: 'Female',
                    gender_identity: 'CIS Gender',
                    submitted_at: '2026-07-26T12:00:00Z'
                },
                {
                    id: 2,
                    student_id: '420135327',
                    student_name: 'Smith, John',
                    department: 'CAS',
                    course: 'BSCS',
                    year_level: '2nd Year',
                    sex: 'Male',
                    gender_identity: 'CIS Gender',
                    submitted_at: '2026-07-26T12:05:00Z'
                }
            ]
        });

        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.getByText('Dela Cruz, Juan')).toBeInTheDocument();
        expect(screen.getByText('Smith, John')).toBeInTheDocument();

        const filterSelect = screen.getByRole('combobox', { name: 'Filter by gender' });
        fireEvent.change(filterSelect, { target: { value: 'Male' } });

        expect(screen.queryByText('Dela Cruz, Juan')).not.toBeInTheDocument();
        expect(screen.getByText('Smith, John')).toBeInTheDocument();
    });

    it('paginates responses when there are more than 20 responses', async () => {
        const manyResponses = Array.from({ length: 25 }, (_, idx) => ({
            id: idx + 1,
            student_id: `STUDENT-${idx + 1}`,
            student_name: `Student ${idx + 1}`,
            department: 'CAFF',
            course: 'Bachelor of Science in Agribusiness',
            year_level: '1st Year',
            sex: idx % 2 === 0 ? 'Female' : 'Male',
            gender_identity: 'CIS Gender',
            submitted_at: '2026-07-26T12:00:00Z'
        }));

        vi.mocked(getEvaluationResults).mockResolvedValue({
            ...results,
            responses: manyResponses
        });

        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.getByText((_content, element) => element?.textContent === 'Showing 1-20 of 25')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
        expect(screen.getByText((_content, element) => element?.textContent === 'Showing 21-25 of 25')).toBeInTheDocument();
    });
});
