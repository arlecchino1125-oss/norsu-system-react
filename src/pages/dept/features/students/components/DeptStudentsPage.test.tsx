import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import DeptStudentsPage from './DeptStudentsPage';
import { getDeptStudentAnnotationMap } from '../../../../../services/deptStudentAnnotationService';

vi.mock('../../../../../services/deptService', () => ({
    getStudentsPage: vi.fn()
}));

vi.mock('../../../../../services/deptStudentAnnotationService', () => ({
    getDeptStudentAnnotationMap: vi.fn(),
    saveDeptStudentAnnotation: vi.fn()
}));

const renderDirectory = (overrides: Record<string, unknown> = {}) => {
    const props: any = {
        filteredData: {
            profile: { department: 'College of Arts and Sciences' },
            requests: [],
            courseOptions: ['Bachelor of Science in Computer Science (BSCS)']
        },
        studentsState: {
            rows: [{
                row_id: 1,
                id: '2026-001',
                student_id: '2026-001',
                name: 'Cejie Example',
                first_name: 'Cejie',
                last_name: 'Example',
                email: 'cejie@example.test',
                course: 'Bachelor of Science in Computer Science (BSCS)',
                year_level: '1st Year',
                status: 'Active',
                department: 'College of Arts and Sciences'
            }],
            total: 1,
            page: 1,
            pageSize: 15,
            setFilters: vi.fn(),
            setPage: vi.fn(),
            setPageSize: vi.fn(),
            isLoading: false
        },
        studentSearch: '',
        setStudentSearch: vi.fn(),
        setSelectedStudent: vi.fn(),
        setShowStudentModal: vi.fn(),
        showToast: vi.fn(),
        ...overrides
    };

    render(<DeptStudentsPage {...props} />);
    return props;
};

describe('DeptStudentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getDeptStudentAnnotationMap).mockResolvedValue({});
    });

    it('renders the directory without repeatedly reloading annotations', async () => {
        renderDirectory();

        expect(screen.getByText('Student Directory')).toBeInTheDocument();
        expect(screen.getByText('Cejie Example')).toBeInTheDocument();
        expect(screen.queryByText('cejie@example.test')).not.toBeInTheDocument();
        await waitFor(() => expect(getDeptStudentAnnotationMap).toHaveBeenCalledTimes(1));
    });

    it('opens a student profile from the clickable row', async () => {
        const user = userEvent.setup();
        const setSelectedStudent = vi.fn();
        const setShowStudentModal = vi.fn();
        renderDirectory({ setSelectedStudent, setShowStudentModal });

        await user.click(screen.getByRole('button', { name: 'View Cejie Example profile' }));

        expect(setSelectedStudent).toHaveBeenCalledWith(expect.objectContaining({ student_id: '2026-001' }));
        expect(setShowStudentModal).toHaveBeenCalledWith(true);
    });

    it('keeps compact actions independent from profile navigation', async () => {
        const user = userEvent.setup();
        const setShowStudentModal = vi.fn();
        renderDirectory({ setShowStudentModal });

        await user.click(screen.getByRole('button', { name: 'Actions for Cejie Example' }));
        await user.click(screen.getByRole('menuitem', { name: 'Add note' }));

        expect(screen.getByPlaceholderText(/Add a short faculty note/i)).toBeInTheDocument();
        expect(setShowStudentModal).not.toHaveBeenCalled();
    });
});
