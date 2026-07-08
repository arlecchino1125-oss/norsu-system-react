import {
    COUNSELING_STATUS,
    SUPPORT_STATUS,
    isCounselingAwaitingDept,
    isWithCareStaffCounseling
} from '../../utils/workflow';

export const READY_FOR_INTERVIEW_STATUSES = [
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview'
];

export const DEPT_MODULE_FEATURES: Partial<Record<string, string>> = {
    admissions: 'admissions',
    interview_queue: 'interview_queue',
    calendar: 'calendar',
    export_center: 'export_center',
    counseling_queue: 'counseling_queue',
    events: 'events',
    support_approvals: 'support_approvals',
    settings: 'settings',
    students: 'students',
    counseled: 'counseled',
    reports: 'reports'
};

// Module label map for header
export const moduleLabels = {
    dashboard: 'Home',
    admissions: 'Admissions Screening',
    interview_queue: 'Interview Queue',
    calendar: 'Calendar',
    export_center: 'Export Center',
    counseling_queue: 'Counseling',
    events: 'College Events',
    support_approvals: 'Additional Support',
    settings: 'Settings',
    students: 'Students',
    counseled: 'Counseled Students',
    reports: 'Reports',
};

export const getFilteredDeptData = (
    data: any,
    counselingRequests: any[],
    populationByYear?: Record<string, number> | null,
    populationTotal?: number | null
) => {
    const dept = String(data?.profile?.department || '').trim();
    const students = Array.isArray(data?.students) ? data.students : [];
    const filteredStudents = students.filter((s: any) =>
        s.department === dept
        && Boolean(s.course)
        && Boolean(s.year)
    );

    // Fallback only while server stats load — page-derived counts cover just the loaded page
    const pagePopulationByYear = {
        '1st Year': filteredStudents.filter((s: any) => s.year === '1st Year').length,
        '2nd Year': filteredStudents.filter((s: any) => s.year === '2nd Year').length,
        '3rd Year': filteredStudents.filter((s: any) => s.year === '3rd Year').length,
        '4th Year': filteredStudents.filter((s: any) => s.year === '4th Year').length,
        '5th Year': filteredStudents.filter((s: any) => s.year === '5th Year').length,
    };

    return {
        ...(data || {}),
        students: filteredStudents,
        requests: Array.isArray(counselingRequests) ? counselingRequests : [],
        populationTotal: populationTotal ?? filteredStudents.length,
        populationStats: populationByYear ?? pagePopulationByYear
    };
};

export const buildDepartmentAlertItems = ({
    admissionsReadyCount,
    admissionsAbsentCount,
    counselingAwaitingCount,
    supportForwardedCount
}: {
    admissionsReadyCount: number;
    admissionsAbsentCount: number;
    counselingAwaitingCount: number;
    supportForwardedCount: number;
}) => [
    {
        key: 'admissions-ready',
        label: 'Admissions ready for interview scheduling',
        count: admissionsReadyCount,
        module: 'admissions',
        tone: 'border-blue-200 bg-blue-50 text-blue-700'
    },
    {
        key: 'admissions-absent',
        label: 'Applicants marked absent',
        count: admissionsAbsentCount,
        module: 'admissions',
        tone: 'border-amber-200 bg-amber-50 text-amber-700'
    },
    {
        key: 'counseling-review',
        label: 'Counseling awaiting department review',
        count: counselingAwaitingCount,
        module: 'counseling_queue',
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    },
    {
        key: 'support-forwarded',
        label: 'Additional support cases forwarded to the department',
        count: supportForwardedCount,
        module: 'support_approvals',
        tone: 'border-purple-200 bg-purple-50 text-purple-700'
    }
];

// Chart Data Preparation — counselingCounts comes from department-wide server totals;
// the filteredData.requests fallback only covers the loaded page while stats load
export const buildDeptChartData = (filteredData: any, counselingCounts?: { awaiting: number; scheduled: number; withCare: number; completed: number; rejected: number } | null) => {
    const awaitingReview = counselingCounts?.awaiting ?? filteredData.requests.filter((r: any) => isCounselingAwaitingDept(r.status)).length;
    const deptScheduled = counselingCounts?.scheduled ?? filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.SCHEDULED).length;
    const withCareStaff = counselingCounts?.withCare ?? filteredData.requests.filter((r: any) => isWithCareStaffCounseling(r.status)).length;
    const completed = counselingCounts?.completed ?? filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.COMPLETED).length;
    const rejected = counselingCounts?.rejected ?? filteredData.requests.filter((r: any) => r.status === COUNSELING_STATUS.REJECTED).length;

    return {
        labels: ['Awaiting Review', 'Dept Scheduled', 'With CARE Staff', 'Completed', 'Rejected'],
        datasets: [{
            label: 'Requests',
            data: [awaitingReview, deptScheduled, withCareStaff, completed, rejected],
            backgroundColor: ['rgba(234, 179, 8, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(34, 197, 94, 0.7)', 'rgba(239, 68, 68, 0.7)'],
            borderColor: ['rgb(234, 179, 8)', 'rgb(59, 130, 246)', 'rgb(168, 85, 247)', 'rgb(34, 197, 94)', 'rgb(239, 68, 68)'],
            borderWidth: 1
        }]
    };
};
