import { render, screen, waitFor } from '@testing-library/react';
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

describe('DeptStudentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getDeptStudentAnnotationMap).mockResolvedValue({});
    });

    it('renders the directory without repeatedly reloading annotations', async () => {
        render(
            <DeptStudentsPage
                filteredData={{
                    profile: { department: 'College of Arts and Sciences' },
                    requests: [],
                    courseOptions: ['Bachelor of Science in Computer Science (BSCS)']
                }}
                studentsState={{
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
                }}
                studentSearch=""
                setStudentSearch={vi.fn()}
                setSelectedStudent={vi.fn()}
                setShowStudentModal={vi.fn()}
                showToast={vi.fn()}
            />
        );

        expect(screen.getByText('Student Directory')).toBeInTheDocument();
        expect(screen.getByText('Cejie Example')).toBeInTheDocument();
        await waitFor(() => expect(getDeptStudentAnnotationMap).toHaveBeenCalledTimes(1));
    });
});
