import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeptViewFormModal } from './DeptViewFormModal';

describe('DeptViewFormModal student profile', () => {
    it('organizes the directory profile in an accessible dialog', async () => {
        const user = userEvent.setup();
        const setShowStudentModal = vi.fn();

        render(
            <DeptViewFormModal
                showStudentModal
                setShowStudentModal={setShowStudentModal}
                selectedStudent={{
                    student_id: '2026-001',
                    name: 'Cejie Example',
                    email: 'cejie@example.test',
                    status: 'Active',
                    department: 'CAS (College of Arts and Sciences)',
                    course: 'Bachelor of Science in Computer Science (BSCS)',
                    year_level: '1st Year',
                    mobile: '09123456789',
                    sex: 'Female'
                }}
            />
        );

        expect(screen.getByRole('dialog', { name: 'Student profile' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Cejie Example' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Enrollment' })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Contact & personal' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Close student profile' }));
        expect(setShowStudentModal).toHaveBeenCalledWith(false);
    });
});
