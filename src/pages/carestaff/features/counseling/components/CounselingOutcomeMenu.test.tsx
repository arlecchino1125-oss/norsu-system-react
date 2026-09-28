import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CounselingOutcomeMenu from './CounselingOutcomeMenu';

describe('CounselingOutcomeMenu', () => {
    const mockRequest = {
        id: 123,
        student_id: '2023-0001',
        student_name: 'Maria Clara',
        status: 'Completed'
    };

    it('renders the 5 menu items when open', () => {
        render(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={vi.fn()}
                onSelectOutcome={vi.fn()}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        expect(screen.getByText('Mark as Counseled')).toBeInTheDocument();
        expect(screen.getByText('Set to Monitoring')).toBeInTheDocument();
        expect(screen.getByText('Mark as Subject for 2nd')).toBeInTheDocument();
        expect(screen.getByText('Reschedule Session')).toBeInTheDocument();
        expect(screen.getByText('Schedule 2nd Session')).toBeInTheDocument();
    });

    it('disables outcome items when canManageOutcome is false', () => {
        render(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={vi.fn()}
                onSelectOutcome={vi.fn()}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={false}
                canManageCounseling={true}
            />
        );

        expect(screen.getByText('Mark as Counseled').closest('button')).toBeDisabled();
        expect(screen.getByText('Set to Monitoring').closest('button')).toBeDisabled();
        expect(screen.getByText('Mark as Subject for 2nd').closest('button')).toBeDisabled();
        expect(screen.getByText('Reschedule Session').closest('button')).not.toBeDisabled();
        expect(screen.getByText('Schedule 2nd Session').closest('button')).not.toBeDisabled();
    });

    it('disables scheduling items when canManageCounseling is false', () => {
        render(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={vi.fn()}
                onSelectOutcome={vi.fn()}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={true}
                canManageCounseling={false}
            />
        );

        expect(screen.getByText('Mark as Counseled').closest('button')).not.toBeDisabled();
        expect(screen.getByText('Reschedule Session').closest('button')).toBeDisabled();
        expect(screen.getByText('Schedule 2nd Session').closest('button')).toBeDisabled();
    });

    it('opens confirm modal when an outcome is clicked and calls onSelectOutcome on confirm', async () => {
        const onSelectOutcome = vi.fn().mockResolvedValue(undefined);
        const onClose = vi.fn();

        render(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={onClose}
                onSelectOutcome={onSelectOutcome}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        fireEvent.click(screen.getByText('Mark as Counseled'));

        expect(screen.getByText('Confirm Status')).toBeInTheDocument();

        const notesInput = screen.getByPlaceholderText('Enter clinical notes or observations for this outcome...');
        fireEvent.change(notesInput, { target: { value: 'Student handled issues well.' } });

        fireEvent.click(screen.getByText('Confirm Status'));

        await waitFor(() => {
            expect(onSelectOutcome).toHaveBeenCalledWith(mockRequest, 'Counseled', 'Student handled issues well.');
            expect(onClose).toHaveBeenCalled();
        });
    });

    it('calls onReschedule and onScheduleFollowUp on click', () => {
        const onReschedule = vi.fn();
        const onScheduleFollowUp = vi.fn();
        const onClose = vi.fn();

        const { rerender } = render(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={onClose}
                onSelectOutcome={vi.fn()}
                onReschedule={onReschedule}
                onScheduleFollowUp={onScheduleFollowUp}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        fireEvent.click(screen.getByText('Reschedule Session'));
        expect(onReschedule).toHaveBeenCalledWith(mockRequest);
        expect(onClose).toHaveBeenCalled();

        rerender(
            <CounselingOutcomeMenu
                request={mockRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={onClose}
                onSelectOutcome={vi.fn()}
                onReschedule={onReschedule}
                onScheduleFollowUp={onScheduleFollowUp}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        fireEvent.click(screen.getByText('Schedule 2nd Session'));
        expect(onScheduleFollowUp).toHaveBeenCalledWith(mockRequest);
    });

    it('hides Reschedule Session and disables outcomes on Counseled requests', () => {
        const counseledRequest = {
            ...mockRequest,
            status: 'Counseled'
        };

        render(
            <CounselingOutcomeMenu
                request={counseledRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={vi.fn()}
                onSelectOutcome={vi.fn()}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        expect(screen.queryByText('Reschedule Session')).not.toBeInTheDocument();
        expect(screen.getByText('Schedule 2nd Session')).toBeInTheDocument();
        expect(screen.getByText('Mark as Counseled').closest('button')).toBeDisabled();
        expect(screen.getByText('Set to Monitoring').closest('button')).toBeDisabled();
        expect(screen.getByText('Mark as Subject for 2nd').closest('button')).toBeDisabled();
    });

    it('shows Reschedule Session and hides follow-up on Rescheduled requests', () => {
        const rescheduledRequest = {
            ...mockRequest,
            status: 'Rescheduled'
        };

        render(
            <CounselingOutcomeMenu
                request={rescheduledRequest}
                open={true}
                position={{ x: 100, y: 100 }}
                onClose={vi.fn()}
                onSelectOutcome={vi.fn()}
                onReschedule={vi.fn()}
                onScheduleFollowUp={vi.fn()}
                canManageOutcome={true}
                canManageCounseling={true}
            />
        );

        expect(screen.getByText('Reschedule Session')).toBeInTheDocument();
        expect(screen.queryByText('Schedule 2nd Session')).not.toBeInTheDocument();
        expect(screen.getByText('Mark as Counseled').closest('button')).toBeDisabled();
    });
});
