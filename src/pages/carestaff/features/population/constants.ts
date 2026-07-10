import type { CareStudentPopulationOverview } from '../../../../services/careStaffService';

export const STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

export const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
export { ARCHIVE_RPC_MISSING_CACHE_KEY } from '../../../../utils/archiveRpc';
export const CARE_STUDENT_PAGE_SIZE = 5;
export const CARE_STUDENT_TABLE_SHELL_CLASS = 'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[28rem] flex-col';
export const CARE_STUDENT_SEARCH_DEBOUNCE_MS = 250;
export const CARE_STUDENT_REFRESH_MIN_MS = 900;
export const EMPTY_POPULATION_OVERVIEW: CareStudentPopulationOverview = {
    totalPopulation: 0,
    activeStudents: 0,
    archivedStudents: 0,
    schoolYears: []
};
