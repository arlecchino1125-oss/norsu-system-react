import { useMemo, useState } from 'react';
import { Download, MapPin, Search, X } from 'lucide-react';

import { AttendanceProofButton } from '../../../../../components/AttendanceProofButton';

const formatClock = (value?: string | null) => {
    if (!value) return null;
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const selectClass =
    'rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200';

const th = 'whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-black uppercase tracking-wide';
const ATTENDEES_PER_PAGE = 20;

export function DeptEventAttendeesModal(props: any) {
    const {
        showEventAttendees, setShowEventAttendees, deptAttendees = [],
        yearLevelFilter, setYearLevelFilter,
        deptCourseFilter, setDeptCourseFilter,
        deptSectionFilter, setDeptSectionFilter,
        exportToExcel, showToastMessage
    } = props;

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    // Option lists carry their own counts so the dropdown says how many rows a
    // choice will leave behind before it is chosen.
    const options = useMemo(() => {
        const tally = (key: string) => {
            const counts = new Map<string, number>();
            for (const row of deptAttendees as any[]) {
                const value = row?.[key];
                if (!value) continue;
                counts.set(value, (counts.get(value) ?? 0) + 1);
            }
            return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        };
        return { years: tally('year_level'), courses: tally('course'), sections: tally('section') };
    }, [deptAttendees]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return (deptAttendees as any[]).filter((row) => {
            if (yearLevelFilter !== 'All' && row.year_level !== yearLevelFilter) return false;
            if (deptCourseFilter !== 'All' && row.course !== deptCourseFilter) return false;
            if (deptSectionFilter !== 'All' && row.section !== deptSectionFilter) return false;
            if (!term) return true;
            return `${row.student_name ?? ''} ${row.student_id ?? ''}`.toLowerCase().includes(term);
        });
    }, [deptAttendees, yearLevelFilter, deptCourseFilter, deptSectionFilter, search]);

    const completedCount = useMemo(
        () => (deptAttendees as any[]).filter((row) => row.time_out).length,
        [deptAttendees]
    );

    const hasFilters = yearLevelFilter !== 'All' || deptCourseFilter !== 'All' || deptSectionFilter !== 'All' || search.trim() !== '';
    const totalPages = Math.max(1, Math.ceil(filtered.length / ATTENDEES_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageStart = (currentPage - 1) * ATTENDEES_PER_PAGE;
    const pageEnd = Math.min(pageStart + ATTENDEES_PER_PAGE, filtered.length);
    const visibleAttendees = filtered.slice(pageStart, pageEnd);

    const resetFilters = () => {
        setYearLevelFilter('All');
        setDeptCourseFilter('All');
        setDeptSectionFilter('All');
        setSearch('');
        setPage(1);
    };

    const close = () => {
        resetFilters();
        setShowEventAttendees(null);
    };

    const handleExport = () => {
        if (filtered.length === 0) return;
        const headers = ['Student ID', 'Student Name', 'Department', 'Course', 'Year Level', 'Section', 'Time In', 'Time Out', 'Status'];
        const rows = filtered.map((a: any) => [
            a.student_id || '',
            a.student_name || '',
            a.department || '',
            a.course || '',
            a.year_level || '',
            a.section || '',
            a.time_in ? new Date(a.time_in).toLocaleString() : '',
            a.time_out ? new Date(a.time_out).toLocaleString() : '-',
            a.time_out ? 'Completed' : 'Still In'
        ]);
        exportToExcel(headers, rows, `${showEventAttendees.title}_attendees`);
    };

    if (!showEventAttendees) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 p-4 animate-backdrop">
            {/* Wide enough that an eight-column table is not squeezed into 672px,
                which is what forced course names to wrap over six lines. */}
            <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in dark:bg-gray-800">
                <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-5 py-4 dark:border-gray-600 dark:bg-gray-700">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Attendees List</h3>
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{showEventAttendees.title}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={handleExport}
                                disabled={filtered.length === 0}
                                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200"
                            >
                                <Download size={13} /> Export Excel
                            </button>
                            <button
                                type="button"
                                aria-label="Close attendees list"
                                onClick={close}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{deptAttendees.length} Total</span>
                        <span className="rounded-full bg-green-100 px-2.5 py-1 font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">{completedCount} Completed</span>
                        <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">{deptAttendees.length - completedCount} Still In</span>
                    </div>

                    {/* One row of dropdowns instead of three rows of chips: a course
                        named "Bachelor of Science in Computer Science (BSCS)" is
                        unreadable as a chip and wrapped the header badly. */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="relative">
                            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Search name or ID"
                                aria-label="Search attendees by name or ID"
                                className="w-48 rounded-lg border border-gray-200 bg-white py-1.5 pl-7 pr-2.5 text-xs font-semibold text-gray-700 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                            />
                        </div>

                        <select aria-label="Filter by year level" className={selectClass} value={yearLevelFilter} onChange={(e) => { setYearLevelFilter(e.target.value); setPage(1); }}>
                            <option value="All">All years</option>
                            {options.years.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}
                        </select>

                        <select aria-label="Filter by course" className={`${selectClass} max-w-[16rem]`} value={deptCourseFilter} onChange={(e) => { setDeptCourseFilter(e.target.value); setPage(1); }}>
                            <option value="All">All courses</option>
                            {options.courses.map(([value, count]) => <option key={value} value={value}>{value} ({count})</option>)}
                        </select>

                        <select aria-label="Filter by section" className={selectClass} value={deptSectionFilter} onChange={(e) => { setDeptSectionFilter(e.target.value); setPage(1); }}>
                            <option value="All">All sections</option>
                            {options.sections.map(([value, count]) => <option key={value} value={value}>Sec {value} ({count})</option>)}
                        </select>

                        {hasFilters && (
                            <button type="button" onClick={resetFilters} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-500 underline-offset-2 hover:underline dark:text-gray-400">
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
                    {filtered.length === 0 ? (
                        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                            {deptAttendees.length === 0 ? 'No attendees yet.' : 'No attendees match these filters.'}
                        </p>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 shadow-sm dark:bg-gray-700 dark:text-gray-300">
                                <tr>
                                    <th scope="col" className={th}>Student</th>
                                    <th scope="col" className={th}>Course</th>
                                    <th scope="col" className={th}>Year / Sec</th>
                                    <th scope="col" className={th}>Time In</th>
                                    <th scope="col" className={th}>Time Out</th>
                                    <th scope="col" className={th}>Status</th>
                                    <th scope="col" className={th}>Location</th>
                                    <th scope="col" className={th}>Proof</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {visibleAttendees.map((att: any) => (
                                    <tr key={att.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-2.5">
                                            <p className="font-bold text-gray-900 dark:text-white">{att.student_name}</p>
                                            {/* Student ID, not department: every row in this view shares
                                                the same department, so printing it was pure noise. */}
                                            <p className="text-xs text-gray-400">{att.student_id}</p>
                                        </td>
                                        <td className="max-w-[18rem] px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            <span className="block truncate" title={att.course || undefined}>{att.course || '-'}</span>
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                            {att.year_level || '-'}{att.section ? ` — ${att.section}` : ''}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600 dark:text-gray-400">{formatClock(att.time_in) || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600 dark:text-gray-400">{formatClock(att.time_out) || '-'}</td>
                                        <td className="whitespace-nowrap px-4 py-2.5">
                                            {att.time_out
                                                ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">Completed</span>
                                                : <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-bold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Still In</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                                            {att.latitude
                                                ? <a href={`https://maps.google.com/?q=${att.latitude},${att.longitude}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"><MapPin size={12} />Map</a>
                                                : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                                            <AttendanceProofButton
                                                storedReference={att.proof_url}
                                                attendanceId={Number(att.id)}
                                                onError={(message) => showToastMessage?.(message, 'error')}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-5 py-2.5 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                    <span>
                        Showing {filtered.length === 0 ? 0 : pageStart + 1}-{pageEnd} of {filtered.length} attendee{filtered.length === 1 ? '' : 's'}
                    </span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                aria-label="Previous page"
                                onClick={() => setPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200"
                            >
                                Previous
                            </button>
                            <span className="tabular-nums">{currentPage} / {totalPages}</span>
                            <button
                                type="button"
                                aria-label="Next page"
                                onClick={() => setPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-500 dark:bg-gray-600 dark:text-gray-200"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
