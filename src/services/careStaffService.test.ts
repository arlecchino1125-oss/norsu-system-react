import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, fromMock } = vi.hoisted(() => ({
    queryMock: {
        select: vi.fn(),
        or: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    fromMock: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: fromMock
    }
}));

import { getStudentsPage, STUDENT_LIST_COLUMNS, STUDENT_TABLE_COLUMNS } from './careStaffService';

const resetQueryMock = () => {
    queryMock.select.mockReturnValue(queryMock);
    queryMock.or.mockReturnValue(queryMock);
    queryMock.eq.mockReturnValue(queryMock);
    queryMock.order.mockReturnValue(queryMock);
    queryMock.range.mockResolvedValue({ data: [], error: null, count: 12 });
};

describe('careStaffService.getStudentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('applies filter + page range', async () => {
        await getStudentsPage(
            { search: '2026', department: 'CCS', yearLevel: '1st Year' },
            { page: 3, pageSize: 10 }
        );

        expect(queryMock.select).toHaveBeenCalledWith(
            STUDENT_TABLE_COLUMNS,
            { count: 'exact' }
        );
        expect(queryMock.or).toHaveBeenCalled();
        expect(queryMock.eq).toHaveBeenCalledWith('department', 'CCS');
        expect(queryMock.eq).toHaveBeenCalledWith('year_level', '1st Year');
        expect(queryMock.range).toHaveBeenCalledWith(20, 29);
    });

    it('includes profile completion flags in the shared student select list', () => {
        expect(STUDENT_LIST_COLUMNS).toContain('profile_completed');
        expect(STUDENT_LIST_COLUMNS).toContain('has_seen_tour');
        expect(STUDENT_LIST_COLUMNS).toContain('address');
        expect(STUDENT_LIST_COLUMNS).toContain('sex');
        expect(STUDENT_LIST_COLUMNS).toContain('gender_identity');
        expect(STUDENT_LIST_COLUMNS).toContain('emergency_contact');
        expect(STUDENT_LIST_COLUMNS).not.toContain('password');
    });

    it('keeps the paginated table select intentionally small', () => {
        expect(STUDENT_TABLE_COLUMNS).toContain('student_id');
        expect(STUDENT_TABLE_COLUMNS).toContain('course_year_archive');
        expect(STUDENT_TABLE_COLUMNS).toContain('archived_reason');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('pwd_document_url');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('children_names_birthdates');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('special_trainings_attended');
    });
});
