import type { CareStudentPopulationOverview } from '../../../../services/careStaffService';

export const STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

export const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
export { ARCHIVE_RPC_MISSING_CACHE_KEY } from '../../../../utils/archiveRpc';
export const CARE_STUDENT_PAGE_SIZE = 5;
export const CARE_STUDENT_TABLE_SHELL_CLASS = 'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col';
export const CARE_STUDENT_SEARCH_DEBOUNCE_MS = 250;
export const CARE_STUDENT_REFRESH_MIN_MS = 900;

/**
 * "Background" advanced filter options for the student population page.
 * Each maps to a boolean column on the `students` table. When more than one is
 * selected the list matches students satisfying ANY of the flags (OR semantics),
 * e.g. selecting PWD + Indigenous => students who are PWD or Indigenous.
 */
export const STUDENT_BACKGROUND_FILTERS = [
    { db: 'is_pwd', label: 'PWD' },
    { db: 'is_indigenous', label: 'Indigenous' },
    { db: 'is_four_ps_member', label: '4Ps Member' },
    { db: 'is_rebel_returnee', label: 'Rebel Returnee' },
    { db: 'is_child_of_solo_parent', label: 'Child of Solo Parent' },
    { db: 'is_solo_parent', label: 'Solo Parent' },
    { db: 'is_orphan', label: 'Orphan' },
    { db: 'is_homeless_citizen', label: 'Homeless' },
    { db: 'is_senior_citizen', label: 'Senior Citizen' },
    { db: 'is_working_student', label: 'Working Student' },
] as const;

export const EMPTY_POPULATION_OVERVIEW: CareStudentPopulationOverview = {
    totalPopulation: 0,
    activeStudents: 0,
    archivedStudents: 0,
    schoolYears: []
};
