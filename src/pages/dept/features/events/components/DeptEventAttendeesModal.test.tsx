import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeptEventAttendeesModal } from './DeptEventAttendeesModal';

vi.mock('../../../../../components/AttendanceProofButton', () => ({
    AttendanceProofButton: () => null
}));

describe('DeptEventAttendeesModal', () => {
    it('shows at most 20 attendees per page', async () => {
        const user = userEvent.setup();
        const attendees = Array.from({ length: 45 }, (_, index) => ({
            id: index + 1,
            student_id: String(index + 1),
            student_name: `Student ${index + 1}`
        }));

        render(
            <DeptEventAttendeesModal
                showEventAttendees={{ title: 'Foundation Day' }}
                setShowEventAttendees={vi.fn()}
                deptAttendees={attendees}
                yearLevelFilter="All"
                setYearLevelFilter={vi.fn()}
                deptCourseFilter="All"
                setDeptCourseFilter={vi.fn()}
                deptSectionFilter="All"
                setDeptSectionFilter={vi.fn()}
                exportToExcel={vi.fn()}
            />
        );

        expect(screen.getByText('Showing 1-20 of 45 attendees')).toBeInTheDocument();
        expect(screen.getByText('Student 20')).toBeInTheDocument();
        expect(screen.queryByText('Student 21')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Next page' }));

        expect(screen.getByText('Showing 21-40 of 45 attendees')).toBeInTheDocument();
        expect(screen.getByText('Student 21')).toBeInTheDocument();
        expect(screen.queryByText('Student 20')).not.toBeInTheDocument();
    });
});
