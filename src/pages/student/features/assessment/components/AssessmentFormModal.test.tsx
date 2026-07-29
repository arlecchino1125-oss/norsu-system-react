import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AssessmentFormModal from './AssessmentFormModal';

const { mockFrom, answerInserts } = vi.hoisted(() => ({
    mockFrom: vi.fn(),
    answerInserts: [] as any[]
}));

vi.mock('../../../../../lib/supabase', () => ({
    supabase: { from: mockFrom }
}));

const FORM = { id: 9, title: 'Needs Inventory', description: 'Rate each statement from 1 to 5.' };

const QUESTIONS = [
    { id: 1, form_id: 9, question_text: 'I feel supported.', question_type: 'scale', order_index: 0 },
    { id: 2, form_id: 9, question_text: 'Others, please specify:', question_type: 'text', order_index: 1 }
];

const renderModal = () => render(
    <AssessmentFormModal
        form={FORM}
        isOpen
        studentId="student-1"
        onClose={vi.fn()}
        onSubmitted={vi.fn()}
        showToast={vi.fn()}
    />
);

describe('AssessmentFormModal', () => {
    beforeEach(() => {
        answerInserts.length = 0;
        mockFrom.mockImplementation((table: string) => {
            if (table === 'needs_assessment_questions') {
                const query: any = {};
                query.select = () => query;
                query.eq = () => query;
                query.order = () => Promise.resolve({ data: QUESTIONS, error: null });
                return query;
            }
            if (table === 'needs_assessment_submissions') {
                return {
                    insert: () => ({
                        select: () => ({ single: () => Promise.resolve({ data: { id: 77 }, error: null }) })
                    })
                };
            }
            return {
                insert: (rows: any[]) => {
                    answerInserts.push(...rows);
                    return Promise.resolve({ error: null });
                }
            };
        });
    });

    it('sends scale answers as answer_value and text answers as answer_text', async () => {
        renderModal();

        fireEvent.click(await screen.findByRole('button', { name: '4' }));
        fireEvent.change(screen.getByPlaceholderText('Type your answer here...'), {
            target: { value: 'Financial assistance' }
        });

        expect(screen.getByText('2/2')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /Submit Assessment/ }));

        await waitFor(() => expect(answerInserts).toHaveLength(2));
        expect(answerInserts).toEqual([
            { submission_id: 77, question_id: 1, answer_value: 4, answer_text: null },
            { submission_id: 77, question_id: 2, answer_value: null, answer_text: 'Financial assistance' }
        ]);
    });

    it('drops a cleared text answer from progress instead of counting it', async () => {
        renderModal();

        const textarea = await screen.findByPlaceholderText('Type your answer here...');
        fireEvent.change(textarea, { target: { value: 'Something' } });
        expect(screen.getByText('1/2')).toBeInTheDocument();

        fireEvent.change(textarea, { target: { value: '' } });
        expect(screen.getByText('0/2')).toBeInTheDocument();
    });

    it('keeps the instructions in the scrolling body so they cannot fill a phone screen', async () => {
        renderModal();

        const instructions = await screen.findByText(FORM.description);
        expect(instructions.closest('.student-mobile-modal-scroll-panel')).not.toBeNull();
    });
});
