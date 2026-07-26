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
                ? [{ id: 1, title: 'System Satisfaction Survey', description: 'Active form', lastUpdated: '7/24/2026' }]
                : [{ id: 2, title: 'Archived Survey', description: 'Inactive form', lastUpdated: '7/20/2026' }],
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
        mockSupabaseFrom.mockReturnValue(query);
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
});
