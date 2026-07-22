import { describe, expect, it } from 'vitest';

import { isEventVisibleToDepartment } from './eventAudience';

const CAS = 'CAS (College of Arts and Sciences)';
const CBA = 'CBA (College of Business Administration)';

describe('isEventVisibleToDepartment', () => {
    it('shows campus-wide events to every department', () => {
        // Their students attend it, so its attendance is theirs to review.
        expect(isEventVisibleToDepartment({ audience_type: 'all_students' }, CAS)).toBe(true);
    });

    it('lets all_students win over a stale department list', () => {
        // The Care Staff save path blanks audience_departments when the audience
        // is all_students, so this shape cannot come from the UI -- but a row
        // written by SQL or an older build can carry both. audience_type must
        // decide, otherwise a campus-wide event silently vanishes from every
        // department except the stale one. Without this case the all_students
        // short-circuit is untested: an event with no departments returns true
        // from the empty-list branch anyway.
        expect(isEventVisibleToDepartment(
            { audience_type: 'all_students', audience_departments: [CBA] },
            CAS
        )).toBe(true);
    });

    it('shows an event that names the department', () => {
        expect(isEventVisibleToDepartment(
            { audience_type: 'filtered_students', audience_departments: [CAS] },
            CAS
        )).toBe(true);
    });

    it('hides an event aimed at a different department', () => {
        expect(isEventVisibleToDepartment(
            { audience_type: 'filtered_students', audience_departments: [CBA] },
            CAS
        )).toBe(false);
    });

    it('shows a graduating-students event that names no department', () => {
        expect(isEventVisibleToDepartment(
            { audience_type: 'graduating_students', audience_departments: [] },
            CAS
        )).toBe(true);
    });

    it('still matches when the event narrows by year level as well', () => {
        // Narrowing to 2nd years does not stop the event belonging to the dept.
        expect(isEventVisibleToDepartment(
            { audience_type: 'filtered_students', audience_departments: [CAS], audience_year_levels: ['2nd Year'] },
            CAS
        )).toBe(true);
    });

    it('ignores casing and surrounding whitespace', () => {
        expect(isEventVisibleToDepartment(
            { audience_type: 'filtered_students', audience_departments: [`  ${CAS.toUpperCase()}  `] },
            CAS
        )).toBe(true);
    });

    it('handles the Postgres array literal shape the API can return', () => {
        // audience_departments arrives as '{"CAS (...)"}' rather than a JS array
        // when the column is read back as raw text.
        expect(isEventVisibleToDepartment(
            { audience_type: 'filtered_students', audience_departments: `{"${CAS}"}` },
            CAS
        )).toBe(true);
    });
});
