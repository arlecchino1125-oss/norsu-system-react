import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EventEvaluationResultsModal from './EventEvaluationResultsModal';
import { getEvaluationResults } from '../eventEvaluationService';

vi.mock('../eventEvaluationService', () => ({
    getEvaluationResults: vi.fn()
}));

const results = {
    form: {
        id: 7,
        event_id: 3,
        title: 'Sample Evaluation',
        description: 'Evaluation description',
        is_active: true,
        created_at: '2026-07-25T12:00:00Z'
    },
    questions: [],
    responses: [{
        id: 11,
        student_id: '420135326',
        student_name: 'Renier Villegas',
        department: 'CAFF',
        course: 'Bachelor of Science in Agribusiness',
        year_level: '1st Year',
        submitted_at: '2026-07-26T12:00:00Z'
    }],
    answers: []
};

const renderModal = () => render(
    <EventEvaluationResultsModal
        open
        onClose={vi.fn()}
        formId={7}
        eventTitle="Sample Event"
        eventDate="2026-07-26"
        showToast={vi.fn()}
    />
);

describe('EventEvaluationResultsModal annotations', () => {
    beforeEach(() => {
        vi.mocked(getEvaluationResults).mockResolvedValue(results);
    });

    it('keeps the department filter without showing a department table column', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.getByRole('combobox', { name: 'Filter by department' })).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Department' })).not.toBeInTheDocument();
    });

    it('shows the event and evaluation dates in the modal header', async () => {
        renderModal();

        const eventDateLabel = await screen.findByText('Event date');
        const evaluationDateLabel = screen.getByText('Evaluation created');

        expect(eventDateLabel.parentElement).toHaveTextContent('Event date7/26/2026');
        expect(evaluationDateLabel.parentElement).toHaveTextContent('Evaluation created7/25/2026');
    });

    it('never exposes the respondent name or student ID', async () => {
        renderModal();

        await screen.findByRole('heading', { name: 'Sample Evaluation' });

        expect(screen.queryByText('Renier Villegas')).not.toBeInTheDocument();
        expect(screen.queryByText('420135326')).not.toBeInTheDocument();
        expect(screen.getByText('Anonymous response')).toBeInTheDocument();
    });
});
