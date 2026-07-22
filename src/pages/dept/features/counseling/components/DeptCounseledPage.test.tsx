import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeptCounseledPage from './DeptCounseledPage';

describe('DeptCounseledPage', () => {
    it('lists each counseled student once and keeps history as the only action', () => {
        render(
            <DeptCounseledPage
                filteredData={{
                    requests: [
                        { id: 1, student_id: '2026-001', student_name: 'Cejie Bustamante', created_at: '2026-07-10T08:00:00.000Z', request_type: 'Self-Referral', status: 'Completed' },
                        { id: 2, student_id: '2026-001', student_name: 'Cejie Bustamante', created_at: '2026-07-02T08:00:00.000Z', request_type: 'Self-Referral', status: 'Completed' },
                        { id: 3, student_id: '2026-001', student_name: 'Cejie Bustamante', created_at: '2026-07-01T08:00:00.000Z', request_type: 'Referral', status: 'Completed' }
                    ]
                }}
                counseledSearch=""
                setCounseledSearch={vi.fn()}
                counseledDate=""
                setCounseledDate={vi.fn()}
                deptCourseFilter="All"
                setDeptCourseFilter={vi.fn()}
                deptYearFilter="All"
                setYearLevelFilter={vi.fn()}
                deptSectionFilter="All"
                setDeptSectionFilter={vi.fn()}
                deptCourses={['Bachelor of Science in Computer Science (BSCS)']}
                matchesCascadeFilters={() => true}
                getStudentForRequest={() => ({
                    student_id: '2026-001',
                    email: 'cejie@example.test',
                    course: 'Bachelor of Science in Computer Science (BSCS)',
                    year: '1st Year',
                    section: 'A'
                })}
                setSelectedHistoryStudent={vi.fn()}
                setShowHistoryModal={vi.fn()}
            />
        );

        expect(screen.getByRole('heading', { name: 'Counseled Students' })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Counseled student controls' })).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(1);
        expect(screen.getByRole('article', { name: 'Cejie Bustamante counseled student' })).toBeInTheDocument();
        expect(screen.getByText('3 counseling records')).toBeInTheDocument();
        expect(screen.getAllByRole('button')).toHaveLength(1);
        expect(screen.getByRole('button', { name: 'View History' })).toBeInTheDocument();
    });
});
