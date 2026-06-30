import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, fromMock, rpcMock } = vi.hoisted(() => ({
    queryMock: {
        select: vi.fn(),
        or: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
        range: vi.fn()
    } as any,
    fromMock: vi.fn(),
    rpcMock: vi.fn()
}));

vi.mock('../lib/supabase', () => ({
    supabase: {
        from: fromMock,
        rpc: rpcMock
    }
}));

import {
    getCareStudentCourseYearCounts,
    getCareStudentPopulationOverview,
    getStudentSearchTokens,
    getStudentsPage,
    studentMatchesSearch,
    STUDENT_LIST_COLUMNS,
    STUDENT_TABLE_COLUMNS
} from './careStaffService';

const resetQueryMock = () => {
    queryMock.select.mockReturnValue(queryMock);
    queryMock.or.mockReturnValue(queryMock);
    queryMock.eq.mockReturnValue(queryMock);
    queryMock.order.mockReturnValue(queryMock);
    queryMock.range.mockResolvedValue({ data: [], error: null, count: 12 });
    rpcMock.mockResolvedValue({ data: [], error: null });
};

describe('careStaffService.getStudentsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('uses the student RPC for filtered pages without search text', async () => {
        await getStudentsPage(
            { department: 'CCS', yearLevel: '1st Year' },
            { page: 3, pageSize: 10 }
        );

        expect(rpcMock).toHaveBeenCalledWith('search_care_students', {
            p_search: '',
            p_department: 'CCS',
            p_course: null,
            p_year_level: '1st Year',
            p_section: null,
            p_status: null,
            p_page: 3,
            p_page_size: 10,
            p_sort_column: 'created_at',
            p_sort_ascending: false
        });
    });

    it('uses the ranked student search RPC for searched pages', async () => {
        rpcMock.mockResolvedValueOnce({
            data: [
                {
                    id: 1,
                    first_name: 'Nico',
                    last_name: 'Faburada',
                    student_id: '420132727',
                    total_count: 19
                }
            ],
            error: null
        });

        const result = await getStudentsPage(
            { search: 'Nicolas Lastname' },
            { page: 1, pageSize: 5 }
        );

        expect(rpcMock).toHaveBeenCalledWith('search_care_students', {
            p_search: 'Nicolas Lastname',
            p_department: null,
            p_course: null,
            p_year_level: null,
            p_section: null,
            p_status: null,
            p_page: 1,
            p_page_size: 5,
            p_sort_column: 'created_at',
            p_sort_ascending: false
        });
        expect(result.total).toBe(19);
        expect(result.rows).toEqual([
            {
                id: 1,
                first_name: 'Nico',
                last_name: 'Faburada',
                student_id: '420132727'
            }
        ]);
    });

    it('falls back to the narrow REST query if the search RPC is not deployed yet', async () => {
        rpcMock.mockResolvedValueOnce({
            data: null,
            error: { code: '42883', message: 'function public.search_care_students does not exist' }
        });

        await getStudentsPage(
            { search: 'Nico' },
            { page: 1, pageSize: 5 },
            { column: 'last_name', ascending: true }
        );

        expect(queryMock.select).toHaveBeenCalledWith(
            STUDENT_TABLE_COLUMNS,
            { count: 'exact' }
        );
        expect(queryMock.or).toHaveBeenCalledWith(
            'first_name.ilike.%Nico%,last_name.ilike.%Nico%,student_id.ilike.%Nico%'
        );
        expect(queryMock.order).toHaveBeenCalledWith('last_name', { ascending: true });
        expect(queryMock.range).toHaveBeenCalledWith(0, 4);
    });

    it('sanitizes punctuation that would break Supabase OR syntax', () => {
        expect(getStudentSearchTokens('Lastname, Nicolas')).toEqual(['Lastname', 'Nicolas']);
    });

    it('matches student names locally without case sensitivity', () => {
        const student = {
            first_name: 'NICOLAS',
            last_name: 'LASTNAME',
            student_id: '2026-001'
        };

        expect(studentMatchesSearch(student, 'Ni')).toBe(true);
        expect(studentMatchesSearch(student, 'Nicolas Lastname')).toBe(true);
        expect(studentMatchesSearch(student, 'nicolas lastname')).toBe(true);
        expect(studentMatchesSearch(student, 'Nicolas Missing')).toBe(false);
    });

    it('does not match hidden middle-name or email values in the main table search', () => {
        const student = {
            first_name: 'ZALMAE',
            middle_name: 'NICOLE',
            last_name: 'APATAN',
            student_id: '420134601',
            email: 'nicole@example.test'
        };

        expect(studentMatchesSearch(student, 'Nic')).toBe(false);
        expect(studentMatchesSearch(student, 'Zal')).toBe(true);
    });

    it('includes profile completion flags in the shared student select list', () => {
        expect(STUDENT_LIST_COLUMNS).toContain('profile_completed');
        expect(STUDENT_LIST_COLUMNS).toContain('has_seen_tour');
        expect(STUDENT_LIST_COLUMNS).toContain('address');
        expect(STUDENT_LIST_COLUMNS).toContain('sex');
        expect(STUDENT_LIST_COLUMNS).toContain('gender_identity');
        expect(STUDENT_LIST_COLUMNS).not.toContain('password');
    });

    it('keeps the paginated table select intentionally small', () => {
        expect(STUDENT_TABLE_COLUMNS).toContain('student_id');
        expect(STUDENT_TABLE_COLUMNS).toContain('course_year_archive');
        expect(STUDENT_TABLE_COLUMNS).toContain('archived_reason');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('dob');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('street');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('pwd_document_url');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('children_names_birthdates');
        expect(STUDENT_TABLE_COLUMNS).not.toContain('special_trainings_attended');
    });
});

describe('careStaffService student population lightweight loaders', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetQueryMock();
        fromMock.mockReturnValue(queryMock);
    });

    it('loads normalized student population overview from RPC', async () => {
        rpcMock.mockResolvedValueOnce({
            data: [{
                total_population: 2538,
                active_students: 2530,
                archived_students: 34,
                school_years: ['SY 2025-2026']
            }],
            error: null
        });

        await expect(getCareStudentPopulationOverview()).resolves.toEqual({
            totalPopulation: 2538,
            activeStudents: 2530,
            archivedStudents: 34,
            schoolYears: ['SY 2025-2026']
        });
        expect(rpcMock).toHaveBeenCalledWith('get_care_student_population_overview');
    });

    it('loads normalized course/year counts from RPC', async () => {
        rpcMock.mockResolvedValueOnce({
            data: [{
                course: 'BSCS',
                year_level: '1st Year',
                student_count: '12'
            }],
            error: null
        });

        await expect(getCareStudentCourseYearCounts()).resolves.toEqual([{
            course: 'BSCS',
            year_level: '1st Year',
            student_count: 12
        }]);
        expect(rpcMock).toHaveBeenCalledWith('get_care_student_course_year_counts');
    });
});
