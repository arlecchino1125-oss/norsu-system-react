import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EventEvaluationPreviewModal from './EventEvaluationPreviewModal';
import { getQuestions, type DraftQuestion, type EvaluationForm } from '../eventEvaluationService';

vi.mock('../eventEvaluationService', () => ({ getQuestions: vi.fn() }));

const template: EvaluationForm = {
    id: 7,
    event_id: null,
    title: 'Participant Evaluation',
    description: 'Tell us about the activity.',
    is_active: true,
};

const question: DraftQuestion = {
    clientId: 'scale',
    id: 9,
    question_text: 'How relevant was the activity?',
    question_type: 'scale',
    scale_min: 1,
    scale_max: 5,
    scale_min_label: 'Poor',
    scale_max_label: 'Excellent',
    choices: [],
    is_required: true,
};

const questions: DraftQuestion[] = [
    question,
    { ...question, clientId: 'text', id: 4, question_text: 'What could improve?', question_type: 'text', is_required: false },
    { ...question, clientId: 'choice', id: 2, question_text: 'Would you attend again?', question_type: 'choice', choices: ['Yes', 'No'] },
];

const renderPreview = (selectedTemplate = template) => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const onClose = vi.fn();
    const view = render(
        <QueryClientProvider client={queryClient}>
            <EventEvaluationPreviewModal template={selectedTemplate} onClose={onClose} />
        </QueryClientProvider>,
    );
    return { ...view, queryClient, onClose };
};

describe('EventEvaluationPreviewModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getQuestions).mockResolvedValue(questions);
    });

    it('shows saved scale, text and choice questions in service order without editable or submission controls', async () => {
        const { container } = renderPreview();

        await screen.findByRole('heading', { name: '1. How relevant was the activity?' });

        expect(getQuestions).toHaveBeenCalledWith(template.id);
        expect(screen.getByRole('dialog', { name: 'Evaluation form preview' })).toHaveTextContent(template.title);
        expect(screen.getByText(template.description!)).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
            '1. How relevant was the activity?',
            '2. What could improve?',
            '3. Would you attend again?',
        ]);
        expect(screen.getByText('Rating scale: 1–5')).toBeInTheDocument();
        expect(screen.getByText('1 — Poor')).toBeInTheDocument();
        expect(screen.getByText('5 — Excellent')).toBeInTheDocument();
        expect(screen.getByText('Optional')).toBeInTheDocument();
        expect(screen.getAllByText('Required')).toHaveLength(2);
        expect(screen.getByText('Text answer')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
        expect(container.querySelector('input, textarea, select')).toBeNull();
        expect(screen.queryByRole('button', { name: /submit|save/i })).not.toBeInTheDocument();
    });

    it('shows loading until the saved questions arrive', async () => {
        let resolve!: (value: DraftQuestion[]) => void;
        vi.mocked(getQuestions).mockReturnValue(new Promise((done) => { resolve = done; }));
        renderPreview();

        expect(screen.getByRole('status')).toHaveTextContent('Loading evaluation form...');
        await act(async () => { resolve(questions); });
        await screen.findByRole('heading', { name: '1. How relevant was the activity?' });
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('shows an error without exposing service error details', async () => {
        vi.mocked(getQuestions).mockRejectedValue(new Error('Database connection detail'));
        renderPreview();

        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the evaluation form.');
        expect(screen.queryByText('Database connection detail')).not.toBeInTheDocument();
    });

    it('shows an empty state for a template without saved questions', async () => {
        vi.mocked(getQuestions).mockResolvedValue([]);
        renderPreview();
        expect(await screen.findByText('This template has no saved questions.')).toBeInTheDocument();
    });

    it('closes from the footer', () => {
        const { onClose } = renderPreview();
        fireEvent.click(screen.getAllByRole('button', { name: 'Close' }).at(-1)!);
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('reloads edited saved questions when reopened inside the global cache freshness window', async () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
        });
        const preview = (
            <QueryClientProvider client={queryClient}>
                <EventEvaluationPreviewModal template={template} onClose={vi.fn()} />
            </QueryClientProvider>
        );
        const firstView = render(preview);
        await screen.findByRole('heading', { name: '1. How relevant was the activity?' });
        firstView.unmount();

        let resolveUpdated!: (value: DraftQuestion[]) => void;
        vi.mocked(getQuestions).mockReturnValueOnce(new Promise((done) => { resolveUpdated = done; }));
        render(preview);

        expect(getQuestions).toHaveBeenCalledTimes(2);
        expect(screen.getByRole('status')).toHaveTextContent('Loading evaluation form...');
        expect(screen.queryByRole('heading', { name: '1. How relevant was the activity?' })).not.toBeInTheDocument();
        await act(async () => {
            resolveUpdated([{ ...question, question_text: 'Updated saved question' }]);
        });
        await screen.findByRole('heading', { name: '1. Updated saved question' });
    });

    it('does not show a late response from a previously selected template', async () => {
        let resolvePrevious!: (value: DraftQuestion[]) => void;
        vi.mocked(getQuestions)
            .mockReturnValueOnce(new Promise((done) => { resolvePrevious = done; }))
            .mockResolvedValueOnce([{ ...question, clientId: 'new', question_text: 'New template question' }]);
        const { rerender, queryClient, onClose } = renderPreview();
        const nextTemplate = { ...template, id: 8, title: 'Another Evaluation' };

        rerender(
            <QueryClientProvider client={queryClient}>
                <EventEvaluationPreviewModal template={nextTemplate} onClose={onClose} />
            </QueryClientProvider>,
        );
        await screen.findByRole('heading', { name: '1. New template question' });
        await act(async () => { resolvePrevious(questions); });

        expect(screen.getByRole('heading', { name: '1. New template question' })).toBeInTheDocument();
        expect(screen.queryByText('1. How relevant was the activity?')).not.toBeInTheDocument();
        expect(getQuestions).toHaveBeenNthCalledWith(2, nextTemplate.id);
    });
});
