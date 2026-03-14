import { describe, expect, it } from 'vitest';
import { getDepartmentNameFromCourseRecords } from './courseDepartment';

describe('courseDepartment', () => {
    it('returns the joined department name for a mapped course', () => {
        expect(
            getDepartmentNameFromCourseRecords(
                'BS Computer Science',
                [{ name: 'BS Computer Science', department_id: 1, departments: { name: 'CCS' } }],
                []
            )
        ).toBe('CCS');
    });

    it('falls back to department lookup by department_id when join data is missing', () => {
        expect(
            getDepartmentNameFromCourseRecords(
                'BS Psychology',
                [{ name: 'BS Psychology', department_id: 2 }],
                [{ id: 2, name: 'CAS' }]
            )
        ).toBe('CAS');
    });

    it('returns the fallback when the course is not found', () => {
        expect(getDepartmentNameFromCourseRecords('Unknown Course', [], [], 'Current Dept')).toBe('Current Dept');
    });
});
