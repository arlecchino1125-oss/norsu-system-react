import { Search } from 'lucide-react';
import {
    COUNSELING_STATUS,
    isWithCareStaffCounseling
} from '../../../../../utils/workflow';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E'];
const getCounseledStudentKey = (request: any) => String(request?.student_id || request?.student_name || request?.id || '').trim().toLowerCase();

const DeptCounseledPage = ({
    filteredData,
    counseledSearch,
    setCounseledSearch,
    counseledDate,
    setCounseledDate,
    deptCourseFilter,
    setDeptCourseFilter,
    deptYearFilter,
    setYearLevelFilter,
    deptSectionFilter,
    setDeptSectionFilter,
    deptCourses,
    matchesCascadeFilters,
    getStudentForRequest,
    setSelectedHistoryStudent,
    setShowHistoryModal
}: any) => {
    const counseledRows = (Array.isArray(filteredData?.requests) ? filteredData.requests : [])
        .filter((request: any) => {
            const status = String(request?.status || '').trim();
            const studentName = String(request?.student_name || '').toLowerCase();
            return (
                (status === COUNSELING_STATUS.COMPLETED || isWithCareStaffCounseling(status))
                && studentName.includes(String(counseledSearch || '').toLowerCase())
                && (!counseledDate || String(request?.created_at || '').startsWith(counseledDate))
                && matchesCascadeFilters(getStudentForRequest(request))
            );
        });
    const groupedStudents = new Map<string, { request: any; recordCount: number }>();
    counseledRows.forEach((request: any) => {
        const studentKey = getCounseledStudentKey(request);
        const existing = groupedStudents.get(studentKey);
        if (existing) {
            existing.recordCount += 1;
        } else {
            groupedStudents.set(studentKey, { request, recordCount: 1 });
        }
    });
    const counseledStudents = Array.from(groupedStudents.values());

    return (
        <div className="space-y-4 animate-fade-in">
            <header className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(20rem,0.38fr)_minmax(0,1fr)] xl:items-start xl:gap-5">
                <div className="xl:pt-1">
                    <h1 className="text-2xl font-bold text-slate-900">Counseled Students</h1>
                    <p className="mt-1 text-sm text-slate-500">Review counseling records without losing your place.</p>
                </div>

                <section aria-label="Counseled student controls" className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.3fr)_minmax(10rem,0.8fr)_repeat(3,minmax(7rem,0.7fr))]">
                        <label className="relative block">
                            <span className="sr-only">Search counseled students</span>
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                            <input
                                value={counseledSearch}
                                onChange={(event) => setCounseledSearch(event.target.value)}
                                className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                                placeholder="Search by student name"
                            />
                        </label>

                        <label>
                            <span className="sr-only">Counseled date</span>
                            <input
                                aria-label="Counseled date"
                                type="date"
                                value={counseledDate}
                                onChange={(event) => setCounseledDate(event.target.value)}
                                className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                            />
                        </label>

                        <select
                            aria-label="Filter counseled students by course"
                            value={deptCourseFilter}
                            onChange={(event) => {
                                setDeptCourseFilter(event.target.value);
                                setYearLevelFilter('All');
                                setDeptSectionFilter('All');
                            }}
                            className={`w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                        >
                            <option value="All">All Courses</option>
                            {deptCourses.map((course: string) => <option key={course} value={course}>{course}</option>)}
                        </select>

                        <select
                            aria-label="Filter counseled students by year"
                            value={deptYearFilter}
                            onChange={(event) => {
                                setYearLevelFilter(event.target.value);
                                setDeptSectionFilter('All');
                            }}
                            className={`w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                        >
                            <option value="All">All Years</option>
                            {YEAR_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>

                        <select
                            aria-label="Filter counseled students by section"
                            value={deptSectionFilter}
                            onChange={(event) => setDeptSectionFilter(event.target.value)}
                            className={`w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                        >
                            <option value="All">All Sections</option>
                            {SECTION_OPTIONS.map((section) => <option key={section} value={section}>Section {section}</option>)}
                        </select>
                    </div>

                    <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-800">{counseledRows.length}</span> counseling record{counseledRows.length === 1 ? '' : 's'}
                        <span className="mx-2 text-slate-300">&bull;</span>
                        <span className="font-semibold text-slate-800">{counseledStudents.length}</span> student{counseledStudents.length === 1 ? '' : 's'}
                    </p>
                </section>
            </header>

            {counseledStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <h2 className="text-base font-bold text-slate-800">No counseled students found</h2>
                    <p className="mt-2 text-sm text-slate-500">Adjust the search, date, or filters to find a record.</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                    {counseledStudents.map(({ request, recordCount }) => {
                        const studentName = request?.student_name || 'Student';
                        const studentKey = getCounseledStudentKey(request);

                        return (
                            <article
                                key={studentKey}
                                aria-label={`${studentName} counseled student`}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1.35fr)_minmax(10rem,0.55fr)_auto] md:items-center md:gap-x-5"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-800">
                                        {String(studentName).charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-bold text-slate-900">{studentName}</h2>
                                        <p className="mt-1 truncate text-xs text-slate-500">{request?.student_id || 'Student record'}</p>
                                    </div>
                                </div>

                                <div className="col-start-1 min-w-0 md:col-start-auto">
                                    <p className="text-sm font-semibold text-slate-700">{recordCount} counseling record{recordCount === 1 ? '' : 's'}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedHistoryStudent(request);
                                        setShowHistoryModal(true);
                                    }}
                                    className={`col-start-2 row-start-1 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 md:col-start-auto md:row-start-auto ${FOCUS_RING}`}
                                >
                                    View History
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default DeptCounseledPage;
