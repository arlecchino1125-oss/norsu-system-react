const GENERAL_ATTENDANCE_TYPES = ['Event', 'Seminar', 'Orientation', 'Meeting'] as const;
export const EVENT_ACTIVITY_TYPES = [...GENERAL_ATTENDANCE_TYPES, 'Announcement'] as const;
const EVENT_AUDIENCE_TYPES = ['all_students', 'filtered_students', 'graduating_students'] as const;
export const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
export const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

export type GeneralAttendanceType = typeof GENERAL_ATTENDANCE_TYPES[number];
export type EventAudienceType = typeof EVENT_AUDIENCE_TYPES[number];

type AudienceEvent = {
    type?: string | null;
    audience_type?: string | null;
    audience_departments?: unknown;
    audience_courses?: unknown;
    audience_year_levels?: unknown;
    audience_sections?: unknown;
};

type AudienceStudent = {
    department?: string | null;
    course?: string | null;
    year?: string | null;
    year_level?: string | null;
    section?: string | null;
    status?: string | null;
};

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

export const isAttendanceActivityType = (type: unknown) =>
    GENERAL_ATTENDANCE_TYPES.includes(String(type || '') as GeneralAttendanceType);

const normalizeAudienceValues = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.flatMap((item) => {
            const normalized = String(item || '').trim();
            return normalized ? [normalized] : [];
        });
    }

    const text = String(value ?? '').trim();
    if (!text) return [];

    if (text.startsWith('{') && text.endsWith('}')) {
        return text
            .slice(1, -1)
            .split(',')
            .map((item) => item.replace(/^"|"$/g, '').trim())
            .filter(Boolean);
    }

    return [text];
};

export const cleanAudienceValues = (values: unknown[]) =>
    values.flatMap((value) => {
        const normalized = String(value || '').trim();
        return normalized ? [normalized] : [];
    });

export const getEventAudienceType = (event: AudienceEvent): EventAudienceType => {
    const value = String(event?.audience_type || 'all_students');
    return EVENT_AUDIENCE_TYPES.includes(value as EventAudienceType)
        ? value as EventAudienceType
        : 'all_students';
};

export const getAudienceValues = (
    event: AudienceEvent,
    key: 'audience_departments' | 'audience_courses' | 'audience_year_levels' | 'audience_sections'
) => normalizeAudienceValues(event?.[key]);

const matchesCriterion = (studentValue: unknown, selectedValues: string[]) => {
    if (selectedValues.length === 0) return true;
    const normalizedStudentValue = normalize(studentValue);
    return selectedValues.some((value) => normalize(value) === normalizedStudentValue);
};

const isGraduatingStudent = (student: AudienceStudent) => {
    const status = normalize(student?.status);
    if (status === 'graduating') return true;

    const yearLevel = normalize(student?.year_level || student?.year);
    return yearLevel === '4th year' || yearLevel === '5th year';
};

export const isStudentEligibleForEvent = (event: AudienceEvent, student: AudienceStudent) => {
    const audienceType = getEventAudienceType(event);
    if (audienceType === 'all_students') return true;

    const departments = getAudienceValues(event, 'audience_departments');
    const courses = getAudienceValues(event, 'audience_courses');
    const yearLevels = getAudienceValues(event, 'audience_year_levels');
    const sections = getAudienceValues(event, 'audience_sections');

    if (audienceType === 'graduating_students' && !isGraduatingStudent(student)) {
        return false;
    }

    return (
        matchesCriterion(student?.department, departments)
        && matchesCriterion(student?.course, courses)
        && matchesCriterion(student?.year_level || student?.year, yearLevels)
        && matchesCriterion(student?.section, sections)
    );
};

/**
 * Whether a department head should see an event at all.
 *
 * Wider than isStudentEligibleForEvent on purpose: a campus-wide event is the
 * department's business too, because their students attend it and their
 * attendance is what the department reviews. Course/year/section filters are
 * ignored here -- narrowing an event to 2nd-year students does not make it stop
 * belonging to their department.
 */
export const isEventVisibleToDepartment = (event: AudienceEvent, department: unknown) => {
    if (getEventAudienceType(event) === 'all_students') return true;

    const departments = getAudienceValues(event, 'audience_departments');
    // No department named means every department is in scope (e.g. a graduating
    // -students event restricted only by year level).
    if (departments.length === 0) return true;

    const target = normalize(department);
    return departments.some((value) => normalize(value) === target);
};

export const getAudienceLabel = (event: AudienceEvent) => {
    const audienceType = getEventAudienceType(event);
    if (audienceType === 'all_students') return 'All students';

    const parts: string[] = [];
    const departments = getAudienceValues(event, 'audience_departments');
    const courses = getAudienceValues(event, 'audience_courses');
    const yearLevels = getAudienceValues(event, 'audience_year_levels');
    const sections = getAudienceValues(event, 'audience_sections');

    if (audienceType === 'graduating_students') parts.push('Graduating students');
    if (departments.length > 0) parts.push(`Dept: ${departments.join(', ')}`);
    if (courses.length > 0) parts.push(`Course: ${courses.join(', ')}`);
    if (yearLevels.length > 0) parts.push(`Year: ${yearLevels.join(', ')}`);
    if (sections.length > 0) parts.push(`Section: ${sections.join(', ')}`);

    return parts.length > 0 ? parts.join(' | ') : 'Selected students';
};

export const applyEventAudienceQuery = <T extends {
    in: (column: string, values: string[]) => T;
}>(query: T, event: AudienceEvent) => {
    let next = query;
    const audienceType = getEventAudienceType(event);

    if (audienceType === 'graduating_students') {
        next = next.in('year_level', ['4th Year', '5th Year']);
    }

    const departments = getAudienceValues(event, 'audience_departments');
    const courses = getAudienceValues(event, 'audience_courses');
    const yearLevels = getAudienceValues(event, 'audience_year_levels');
    const sections = getAudienceValues(event, 'audience_sections');

    if (departments.length > 0) next = next.in('department', departments);
    if (courses.length > 0) next = next.in('course', courses);
    if (yearLevels.length > 0) next = next.in('year_level', yearLevels);
    if (sections.length > 0) next = next.in('section', sections);

    return next;
};
