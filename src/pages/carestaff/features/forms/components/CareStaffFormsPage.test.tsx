import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CareStaffFormsPage from './CareStaffFormsPage';

const { mockUseQuery, mockSupabaseFrom } = vi.hoisted(() => ({
    mockUseQuery: vi.fn(),
    mockSupabaseFrom: vi.fn()
}));

vi.mock('@tanstack/react-query', () => ({
    useQuery: mockUseQuery
}));

vi.mock('../../../../../hooks/usePermissions', () => ({
    usePermissions: () => ({ canPerformAction: () => true })
}));

vi.mock('../../../../../lib/supabase', () => ({
    supabase: { from: mockSupabaseFrom }
}));

describe('CareStaffFormsPage', () => {
    beforeEach(() => {
        mockUseQuery.mockImplementation(({ queryKey }) => ({
            data: queryKey[0] === 'care-staff-active-forms'
                ? [{ id: 1, title: 'System Satisfaction Survey', description: 'Active form', lastUpdated: '7/24/2026', responses: 3 }]
                : [{ id: 2, title: 'Archived Survey', description: 'Inactive form', lastUpdated: '7/20/2026', responses: 0 }],
            isLoading: false,
            refetch: vi.fn()
        }));

        const query = {
            select: vi.fn(),
            eq: vi.fn(),
            order: vi.fn().mockResolvedValue({
                data: [{ id: 10, form_id: 1, question_text: 'I feel supported.', order_index: 0 }],
                error: null
            })
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        // The fixture question already collected two answers, which is what the
        // destructive-edit guard counts before it lets a delete through.
        mockSupabaseFrom.mockImplementation((table: string) => (
            table === 'needs_assessment_answers'
                ? { select: () => ({ eq: () => Promise.resolve({ count: 2, error: null }) }) }
                : query
        ));
    });

    it('keeps every form action while opening all modals as full content-region panels', async () => {
        render(<CareStaffFormsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByRole('button', { name: 'Preview' })).toHaveTextContent('Preview');
        expect(screen.getByRole('button', { name: 'Deactivate Form' })).toHaveTextContent('Deactivate');

        fireEvent.click(screen.getByRole('button', { name: 'Create New Form' }));
        const editorShell = screen.getByRole('heading', { name: 'Create Form' }).closest('.absolute');
        expect(editorShell).toHaveClass('inset-x-0', 'bottom-0', 'top-[4.25rem]');
        expect(editorShell?.firstElementChild).toHaveClass('h-full', 'w-full', 'rounded-2xl');
        ['Download Template', 'Upload Questions', 'Add Question', 'Cancel', 'Save Changes'].forEach((name) => {
            expect(screen.getByText(name)).toBeInTheDocument();
        });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        fireEvent.click(screen.getByRole('button', { name: 'Inactive Forms (1)' }));
        const inactiveShell = screen.getByRole('heading', { name: 'Inactive Forms' }).closest('.absolute');
        expect(inactiveShell).toHaveClass('inset-x-0', 'bottom-0', 'top-[4.25rem]');
        fireEvent.click(screen.getByRole('button', { name: 'Close inactive forms' }));

        fireEvent.click(screen.getByRole('button', { name: 'Preview' }));
        const previewHeading = await screen.findByRole('heading', { name: 'Preview: System Satisfaction Survey' });
        expect(previewHeading.closest('.absolute')).toHaveClass('inset-x-0', 'bottom-0', 'top-[4.25rem]');
        fireEvent.click(screen.getByRole('button', { name: 'Close Preview' }));

        fireEvent.click(screen.getByRole('button', { name: 'Deactivate Form' }));
        const deactivateShell = screen.getByRole('heading', { name: 'Deactivate Form' }).closest<HTMLElement>('.absolute');
        expect(deactivateShell).toHaveClass('inset-x-0', 'bottom-0', 'top-[4.25rem]');
        expect(within(deactivateShell!).getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(within(deactivateShell!).getByRole('button', { name: 'Deactivate Form' })).toBeInTheDocument();
    });

    it('shows how many responses each form has collected', () => {
        render(<CareStaffFormsPage functions={{ showToast: vi.fn() }} />);

        expect(screen.getByText('3 responses')).toBeInTheDocument();
    });

    it('appends one required scale question per uploaded line', async () => {
        render(<CareStaffFormsPage functions={{ showToast: vi.fn() }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Create New Form' }));
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = new File(['I feel stressed often\nI need financial assistance'], 'questions.txt', { type: 'text/plain' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(await screen.findByDisplayValue('I feel stressed often')).toBeInTheDocument();
        expect(screen.getByDisplayValue('I need financial assistance')).toBeInTheDocument();
        const requiredBoxes = screen.getAllByRole('checkbox');
        expect(requiredBoxes).toHaveLength(2);
        requiredBoxes.forEach((box) => expect(box).toBeChecked());
    });

    it('duplicates a form with its questions so a later run stays comparable', async () => {
        render(<CareStaffFormsPage functions={{ showToast: vi.fn() }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

        expect(await screen.findByDisplayValue('System Satisfaction Survey (Copy)')).toBeInTheDocument();
        expect(screen.getByDisplayValue('I feel supported.')).toBeInTheDocument();
    });

    it('warns before deleting a question that already has recorded answers', async () => {
        render(<CareStaffFormsPage functions={{ showToast: vi.fn() }} />);

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        fireEvent.click(await screen.findByRole('button', { name: 'Remove question 1' }));

        expect(await screen.findByRole('heading', { name: 'Delete question?' })).toBeInTheDocument();
        expect(screen.getByText('2 recorded answers will be deleted permanently, including from reports.')).toBeInTheDocument();

        const confirmShell = screen.getByRole('heading', { name: 'Delete question?' }).closest('.absolute') as HTMLElement;
        fireEvent.click(within(confirmShell).getByRole('button', { name: 'Cancel' }));
        expect(screen.queryByRole('heading', { name: 'Delete question?' })).not.toBeInTheDocument();
    });
});
