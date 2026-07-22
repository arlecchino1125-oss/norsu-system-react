import React, { useEffect, useMemo, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    Flag,
    FlagOff,
    MessageSquarePlus,
    MoreHorizontal,
    Search,
    X
} from 'lucide-react';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';
import { buildCsv } from '../../../../../utils/inputSecurity';
import { getStudentsPage } from '../../../../../services/deptService';
import {
    getDeptStudentAnnotationMap,
    saveDeptStudentAnnotation,
    type DeptStudentAnnotation
} from '../../../../../services/deptStudentAnnotationService';

const ITEMS_PER_PAGE_DEFAULT = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const downloadCsv = (filename: string, headers: string[], rows: Array<Record<string, unknown>>) => {
    if (typeof window === 'undefined') return;

    const csvBody = buildCsv([
        headers,
        ...rows.map((row) => headers.map((header) => row[header]))
    ]);

    const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const normalizeText = (value: unknown) => String(value || '').trim().toLowerCase();
const getStudentKey = (student: any) => String(student?.student_id || student?.id || student?.email || student?.name || '');
const closeStudentActionMenu = (event: React.MouseEvent<HTMLButtonElement>) => event.currentTarget.closest('details')?.removeAttribute('open');
const getStudentDbId = (student: any) => {
    const value = Number(student?.row_id || student?.id);
    return Number.isFinite(value) && value > 0 ? value : null;
};

const DEPT_STUDENT_YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

const StudentsPaginationBar = ({ startIndex, endIndex, totalStudents, currentPage, totalPages, pageSize, onPageSizeChange, goToPage }: any) => (
    <footer className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <p className="text-sm text-slate-600">
                Showing <span className="font-semibold text-slate-900">{startIndex + 1}-{endIndex}</span> of {totalStudents} students
                <span className="ml-2 text-slate-400">Page {currentPage} of {totalPages}</span>
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) => onPageSizeChange(Number(event.target.value))}
                        className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${FOCUS_RING}`}
                    >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="font-medium">Jump to</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(event) => goToPage(Number(event.target.value) || 1)}
                        className={`w-16 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${FOCUS_RING}`}
                    />
                </label>

                <div className="flex items-center gap-2 sm:ml-1">
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    </footer>
);

const StudentAvatar = ({ student }: any) => (
    <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-emerald-100 text-sm font-black text-emerald-800">
        {(student?.name || 'S').charAt(0).toUpperCase()}
        {student?.profile_picture_url && (
            <ResolvedProfileImage
                storedValue={student.profile_picture_url}
                studentId={String(student.student_id || student.id || '')}
                alt=""
                className="absolute inset-0 h-full w-full"
                previewOnClick={false}
                referrerPolicy="no-referrer"
            />
        )}
    </span>
);

const DeptStudentRow = ({
    student, cardState, counselingHistoryCount, savedNote,
    noteDraft, setNoteDraft,
    onToggleSelect, onViewProfile, onOpenNoteEditor, onSaveNote, onCancelNote, onToggleFlag
}: any) => {
    const { isActive, isSelected, isFlagged, isEditingNote } = cardState;
    const studentName = student?.name || 'Unnamed Student';
    const noteId = `dept-student-note-${getStudentDbId(student) || 'student'}`;

    return (
        <article className={`relative transition-colors hover:bg-slate-50 ${isSelected ? 'bg-emerald-50/50' : 'bg-white'}`}>
            <button
                type="button"
                aria-label={`View ${studentName} profile`}
                onClick={onViewProfile}
                className={`absolute inset-0 z-0 w-full cursor-pointer rounded-2xl ${FOCUS_RING}`}
            />

            <div className="pointer-events-none relative z-10 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 px-4 py-4 md:grid-cols-[auto_minmax(0,1.35fr)_minmax(12rem,1fr)_minmax(9.5rem,auto)_auto] md:items-center md:gap-x-5">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggleSelect}
                    aria-label={`Select ${studentName}`}
                    className={`pointer-events-auto mt-3 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 md:mt-0 ${FOCUS_RING}`}
                />

                <div className="flex min-w-0 items-center gap-3 pr-10 md:pr-0">
                    <StudentAvatar student={student} />
                    <div className="min-w-0">
                        <h3 className="truncate font-bold text-slate-900">{studentName}</h3>
                    </div>
                </div>

                <div className="col-start-2 min-w-0 md:col-start-auto">
                    <p className="truncate text-sm font-semibold text-slate-700">{student?.course || 'Program not provided'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                        {student?.year_level || student?.year || 'Year not provided'}
                        <span className="mx-1.5 text-slate-300">&bull;</span>
                        Section {student?.section || 'N/A'}
                    </p>
                </div>

                <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:block">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {isActive ? 'Active' : String(student?.status || 'Inactive')}
                        </span>
                        {isFlagged && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                <Flag size={11} /> At-Risk
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-500 md:mt-1.5">
                        {counselingHistoryCount} counseling record{counselingHistoryCount === 1 ? '' : 's'}
                        {savedNote && <span className="ml-2 text-emerald-700">&bull; Note added</span>}
                    </p>
                </div>

                <details className="pointer-events-auto absolute right-3 top-3 z-20 md:static" onClick={(event) => event.stopPropagation()}>
                    <summary
                        role="button"
                        aria-label={`Actions for ${studentName}`}
                        className={`flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
                    >
                        <MoreHorizontal size={18} />
                    </summary>
                    <div role="menu" className="absolute right-0 top-11 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-md">
                        <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                                closeStudentActionMenu(event);
                                onOpenNoteEditor();
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 ${FOCUS_RING}`}
                        >
                            <MessageSquarePlus size={15} className="text-emerald-600" />
                            {savedNote ? 'Edit note' : 'Add note'}
                        </button>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={(event) => {
                                closeStudentActionMenu(event);
                                onToggleFlag();
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-slate-50 ${isFlagged ? 'text-slate-700' : 'text-amber-700'} ${FOCUS_RING}`}
                        >
                            {isFlagged ? <FlagOff size={15} /> : <Flag size={15} />}
                            {isFlagged ? 'Remove at-risk flag' : 'Flag as at-risk'}
                        </button>
                    </div>
                </details>
            </div>

            {isEditingNote && (
                <div className="pointer-events-auto relative z-20 border-t border-slate-100 bg-slate-50/70 px-4 py-4 md:pl-16">
                    <label htmlFor={noteId} className="block text-xs font-bold text-slate-700">Department note for {studentName}</label>
                    <textarea
                        id={noteId}
                        rows={3}
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        className={`mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 ${FOCUS_RING}`}
                        placeholder="Add a short faculty note for follow-up, mentoring, or academic risk tracking."
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={onSaveNote} className={`rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 ${FOCUS_RING}`}>
                            Save note
                        </button>
                        <button type="button" onClick={onCancelNote} className={`rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 ${FOCUS_RING}`}>
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </article>
    );
};

const StudentDirectoryToolbar = ({
    totalStudents, flaggedCount, selectedCount,
    studentSearch, setStudentSearch, courseFilter, setCourseFilter, uniqueCourses,
    yearFilter, setYearFilter, statusFilter, setStatusFilter,
    onTogglePage, pageCount, allPageSelected, pageSelectedCount, onFlagSelected,
    exportMode, setExportMode, onExport, onResetFilters
}: any) => (
    <header className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(20rem,0.38fr)_minmax(0,1fr)] xl:items-start xl:gap-5">
        <div className="xl:pt-1">
            <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
            <p className="mt-1 text-sm text-slate-500">Find students and open a profile without losing your place.</p>
        </div>

        <section aria-label="Student directory controls" className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(9rem,0.8fr))]">
                <label className="relative block">
                    <span className="sr-only">Search students</span>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                    <input
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                        className={`w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                        placeholder="Search name, email, program, or ID"
                    />
                </label>

                <select
                    aria-label="Filter students by course"
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                    className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                >
                    <option value="All">All Programs</option>
                    {uniqueCourses.map((course) => (
                        <option key={course} value={course}>{course}</option>
                    ))}
                </select>

                <select
                    aria-label="Filter students by year level"
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                    className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                >
                    <option value="All">All Year Levels</option>
                    {DEPT_STUDENT_YEAR_OPTIONS.map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>

                <select
                    aria-label="Filter students by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition focus:bg-white ${FOCUS_RING}`}
                >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Incomplete">Incomplete</option>
                </select>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
                <button
                    type="button"
                    onClick={onTogglePage}
                    disabled={pageCount === 0}
                    className={`rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                >
                    {allPageSelected ? 'Clear page selection' : `Select page (${pageSelectedCount}/${pageCount})`}
                </button>

                <p className="whitespace-nowrap text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{totalStudents}</span> student{totalStudents === 1 ? '' : 's'}
                    <span className="mx-2 text-slate-300">&bull;</span>
                    <span className={flaggedCount > 0 ? 'font-semibold text-amber-700' : ''}>{flaggedCount} flagged</span>
                    {selectedCount > 0 && <span className="ml-2 font-semibold text-emerald-700">&bull; {selectedCount} selected</span>}
                </p>

                {selectedCount > 0 && (
                    <button
                        type="button"
                        onClick={onFlagSelected}
                        className={`inline-flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 ${FOCUS_RING}`}
                    >
                        <Flag size={14} />
                        Flag selected
                    </button>
                )}

                {(courseFilter !== 'All' || yearFilter !== 'All' || statusFilter !== 'All') && (
                    <button
                        type="button"
                        onClick={onResetFilters}
                        className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 ${FOCUS_RING}`}
                    >
                        <X size={14} />
                        Clear filters
                    </button>
                )}

                <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
                    <label className="sr-only" htmlFor="dept-student-export-scope">Export scope</label>
                    <select
                        id="dept-student-export-scope"
                        value={exportMode}
                        onChange={(event) => setExportMode(event.target.value as 'selected' | 'filtered')}
                        className={`min-w-40 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 sm:flex-none ${FOCUS_RING}`}
                    >
                        <option value="selected">Selected students</option>
                        <option value="filtered">All filtered students</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => void onExport()}
                        disabled={exportMode === 'selected' ? selectedCount === 0 : totalStudents === 0}
                        className={`inline-flex items-center gap-2 rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS_RING}`}
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                </div>
            </div>
        </section>
    </header>
);

/** Department-scoped notes and at-risk flags for the visible student rows. */
const useDeptStudentAnnotations = (students: any[], departmentName: string, showToast: any) => {
    const [annotationMap, setAnnotationMap] = useState<Record<string, DeptStudentAnnotation[]>>({});

    useEffect(() => {
        const studentIds = students.flatMap((student) => {
            const id = getStudentDbId(student);
            return id ? [id] : [];
        }) as number[];
        if (!departmentName || studentIds.length === 0) {
            setAnnotationMap({});
            return;
        }
    
        let isMounted = true;
        getDeptStudentAnnotationMap(studentIds, departmentName)
            .then((nextMap) => {
                if (isMounted) setAnnotationMap(nextMap);
            })
            .catch((error) => {
                console.error('Failed to load department student annotations:', error);
                if (isMounted) showToast?.('Unable to load student notes and flags.', 'error');
            });
    
        return () => {
            isMounted = false;
        };
    }, [departmentName, showToast, students]);
    
    const getStudentAnnotation = (student: any) => {
        const studentDbId = getStudentDbId(student);
        if (!studentDbId) return null;
        return annotationMap[String(studentDbId)]?.find((annotation) => annotation.department === departmentName) || null;
    };
    
    const setStudentAnnotation = (studentDbId: number, annotation: DeptStudentAnnotation | null) => {
        setAnnotationMap((previous) => {
            const key = String(studentDbId);
            const otherDepartmentAnnotations = (previous[key] || []).filter((item) => item.department !== departmentName);
            if (!annotation) {
                const { [key]: _removed, ...rest } = previous;
                if (otherDepartmentAnnotations.length === 0) return rest;
                return { ...previous, [key]: otherDepartmentAnnotations };
            }
            return { ...previous, [key]: [annotation, ...otherDepartmentAnnotations] };
        });
    };
    
    const persistAnnotation = async (
        student: any,
        nextValues: { note?: string; isAtRisk?: boolean },
        successMessage?: string
    ): Promise<boolean> => {
        const studentDbId = getStudentDbId(student);
        if (!studentDbId || !departmentName) {
            showToast?.('Unable to save this student note or flag.', 'error');
            return false;
        }
    
        const previousAnnotation = getStudentAnnotation(student);
        const nextNote = nextValues.note ?? previousAnnotation?.note ?? '';
        const nextRisk = nextValues.isAtRisk ?? Boolean(previousAnnotation?.is_at_risk);
    
        try {
            const savedAnnotation = await saveDeptStudentAnnotation({
                studentId: studentDbId,
                department: departmentName,
                note: nextNote,
                isAtRisk: nextRisk
            });
            setStudentAnnotation(studentDbId, savedAnnotation);
            if (successMessage) showToast?.(successMessage, 'success');
            return true;
        } catch (error) {
            console.error('Failed to save department student annotation:', error);
            showToast?.('Unable to save this student note or flag.', 'error');
            return false;
        }
    };
    
    const flaggedStudentIds = useMemo(() => (
        students.flatMap((student: any) => {
                const studentDbId = getStudentDbId(student);
                if (!studentDbId) return [];
                const isFlagged = Boolean(annotationMap[String(studentDbId)]?.some((annotation) => (
                    annotation.department === departmentName && annotation.is_at_risk
                )));
                return isFlagged ? [getStudentKey(student)] : [];
            })
    ), [annotationMap, departmentName, students]);

    return { getStudentAnnotation, persistAnnotation, flaggedStudentIds, annotationMap };
};

const exportDeptStudents = async ({
    exportMode, selectedFilteredStudents, departmentName, studentSearch,
    courseFilter, yearFilter, statusFilter, annotationMap, historyCountMap
}: any) => {
        let exportRows: any[];
        if (exportMode === 'selected') {
            exportRows = selectedFilteredStudents;
        } else {
            // "All filtered" spans every page, so fetch the full filtered set server-side
            // ponytail: capped at 2000 rows — paginate the export if a college ever exceeds that
            const nextFilters: Record<string, string> = { department: departmentName };
            const search = String(studentSearch || '').trim();
            if (search) nextFilters.search = search;
            if (courseFilter !== 'All') nextFilters.course = courseFilter;
            if (yearFilter !== 'All') nextFilters.yearLevel = yearFilter;
            if (statusFilter !== 'All') nextFilters.status = statusFilter;
            const result = await getStudentsPage(nextFilters, { page: 1, pageSize: 2000 });
            exportRows = (result.rows || []).map((student: any) => ({
                ...student,
                row_id: student.id,
                id: student.student_id,
                name: `${student.first_name || ''} ${student.last_name || ''}`.trim()
            }));
        }
        if (exportRows.length === 0) return;
    
        const exportAnnotationMap = exportMode === 'filtered'
            ? await getDeptStudentAnnotationMap(exportRows.map(getStudentDbId), departmentName)
            : annotationMap;
    
        const headers = [
            'Student ID',
            'Full Name',
            'Email',
            'Course',
            'Year Level',
            'Section',
            'Status',
            'Counseling History',
            'At Risk',
            'Note'
        ];
    
        downloadCsv(
            'department-students.csv',
            headers,
            exportRows.map((student: any) => {
                const studentDbId = getStudentDbId(student);
                const annotation = studentDbId
                    ? exportAnnotationMap[String(studentDbId)]?.find((item) => item.department === departmentName)
                    : null;
                const historyKey = String(student?.student_id || '').trim() || normalizeText(student?.name);
    
                return {
                    'Student ID': student?.student_id || student?.id || 'N/A',
                    'Full Name': student?.name || 'Unnamed Student',
                    Email: student?.email || 'No email',
                    Course: student?.course || 'N/A',
                    'Year Level': student?.year_level || student?.year || 'N/A',
                    Section: student?.section || 'N/A',
                    Status: student?.status || 'Unknown',
                    'Counseling History': historyCountMap.get(historyKey) || 0,
                    'At Risk': annotation?.is_at_risk ? 'Yes' : 'No',
                    Note: annotation?.note || ''
                };
            })
        );
};

const DeptStudentsPage = ({
    filteredData,
    studentsState,
    studentSearch,
    setStudentSearch,
    setSelectedStudent,
    setShowStudentModal,
    showToast
}: any) => {
    // Server-paged rows — the dept can have far more students than one page holds
    const students = useMemo(() => Array.isArray(studentsState?.rows) ? studentsState.rows : [], [studentsState?.rows]);
    const counselingRequests = useMemo(() => Array.isArray(filteredData?.requests) ? filteredData.requests : [], [filteredData?.requests]);

    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [exportMode, setExportMode] = useState<'selected' | 'filtered'>('selected');

    const departmentName = String(filteredData?.profile?.department || '').trim();

    const historyCountMap = useMemo(() => {
        const counts = new Map<string, number>();

        counselingRequests.forEach((request: any) => {
            const studentIdKey = String(request?.student_id || '').trim();
            const studentNameKey = normalizeText(request?.student_name);

            if (studentIdKey) {
                counts.set(studentIdKey, (counts.get(studentIdKey) || 0) + 1);
            }

            if (studentNameKey) {
                counts.set(studentNameKey, (counts.get(studentNameKey) || 0) + 1);
            }
        });

        return counts;
    }, [counselingRequests]);

    const { getStudentAnnotation, persistAnnotation, flaggedStudentIds, annotationMap } =
        useDeptStudentAnnotations(students, departmentName, showToast);

    // Full course list for this college comes from the course→department map; page rows are the fallback
    const uniqueCourses = useMemo<string[]>(() => {
        const courseOptions: string[] = Array.isArray(filteredData?.courseOptions)
            ? filteredData.courseOptions.flatMap((course: unknown) => {
                const normalizedCourse = String(course || '').trim();
                return normalizedCourse ? [normalizedCourse] : [];
            })
            : [];
        if (courseOptions.length > 0) {
            return Array.from(new Set(courseOptions)).sort();
        }
        return Array.from(new Set<string>(students.flatMap((student: any) => {
            const course = String(student?.course || '').trim();
            return course ? [course] : [];
        }))).sort();
    }, [filteredData?.courseOptions, students]);

    // Search/course/year/status are applied server-side; debounce so typing doesn't fire a query per keystroke
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const nextFilters: Record<string, string> = {};
            const search = String(studentSearch || '').trim();
            if (search) nextFilters.search = search;
            if (courseFilter !== 'All') nextFilters.course = courseFilter;
            if (yearFilter !== 'All') nextFilters.yearLevel = yearFilter;
            if (statusFilter !== 'All') nextFilters.status = statusFilter;
            studentsState.setFilters(nextFilters);
            studentsState.setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseFilter, yearFilter, statusFilter, studentSearch]);

    // Selection only spans visible rows; changing page or filters clears stale selections
    const filteredStudents = useMemo(() => (
        students.toSorted((left: any, right: any) => {
            const leftFlagged = flaggedStudentIds.includes(getStudentKey(left)) ? 1 : 0;
            const rightFlagged = flaggedStudentIds.includes(getStudentKey(right)) ? 1 : 0;

            if (leftFlagged !== rightFlagged) return rightFlagged - leftFlagged;
            return String(left?.name || '').localeCompare(String(right?.name || ''));
        })
    ), [flaggedStudentIds, students]);

    useEffect(() => {
        const visibleIds = new Set(filteredStudents.map((student: any) => getStudentKey(student)));
        setSelectedStudentIds((previous) => {
            const next = previous.filter((id) => visibleIds.has(id));
            return next.length === previous.length ? previous : next;
        });
    }, [filteredStudents]);

    const currentPage = Number(studentsState?.page || 1);
    const pageSize = Number(studentsState?.pageSize || ITEMS_PER_PAGE_DEFAULT);
    const totalStudents = Number(studentsState?.total || 0);
    const totalPages = Math.max(1, Math.ceil(totalStudents / pageSize));
    const startIndex = totalStudents === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + filteredStudents.length, totalStudents);
    const paginatedStudents = filteredStudents;
    const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);

    const selectedFilteredStudents = filteredStudents.filter((student: any) => selectedStudentIdSet.has(getStudentKey(student)));
    const selectedCurrentPageStudents = paginatedStudents.filter((student: any) => selectedStudentIdSet.has(getStudentKey(student)));
    const allCurrentPageSelected = paginatedStudents.length > 0 && paginatedStudents.every((student: any) => selectedStudentIdSet.has(getStudentKey(student)));

    const resetFilters = () => {
        setCourseFilter('All');
        setYearFilter('All');
        setStatusFilter('All');
    };

    const goToPage = (nextPage: number) => {
        const safePage = Number.isFinite(nextPage) ? Math.min(Math.max(nextPage, 1), totalPages) : 1;
        studentsState.setPage(safePage);
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const toggleCurrentPageStudents = () => {
        const currentPageIds = paginatedStudents.map((student: any) => getStudentKey(student));
        const currentPageIdSet = new Set(currentPageIds);

        setSelectedStudentIds((previous) => {
            if (allCurrentPageSelected) {
                return previous.filter((id) => !currentPageIdSet.has(id));
            }

            return Array.from(new Set([...previous, ...currentPageIds]));
        });
    };

    const toggleStudentFlag = (student: any) => {
        const isCurrentlyFlagged = Boolean(getStudentAnnotation(student)?.is_at_risk);
        void persistAnnotation(
            student,
            { isAtRisk: !isCurrentlyFlagged },
            isCurrentlyFlagged ? 'At-risk flag removed.' : 'Student flagged as at-risk.'
        );
    };

    const flagSelectedStudents = () => {
        if (selectedFilteredStudents.length === 0) return;

        void Promise.all(
            selectedFilteredStudents.map((student: any) => (
                persistAnnotation(student, { isAtRisk: true })
            ))
        ).then((results) => {
            const successCount = results.filter(Boolean).length;
            if (successCount > 0) showToast?.(`${successCount} selected student${successCount === 1 ? '' : 's'} flagged as at-risk.`, 'success');
        });
    };

    const openNoteEditor = (student: any) => {
        const studentId = getStudentKey(student);
        setEditingStudentId(studentId);
        setNoteDraft(getStudentAnnotation(student)?.note || '');
    };

    const saveStudentNote = (student: any) => {
        void persistAnnotation(student, { note: noteDraft.trim() }, 'Student note saved.');
        setEditingStudentId(null);
        setNoteDraft('');
    };

    const exportStudents = () => exportDeptStudents({
        exportMode, selectedFilteredStudents, departmentName, studentSearch,
        courseFilter, yearFilter, statusFilter, annotationMap, historyCountMap
    });

    return (
        <div className="space-y-4 animate-fade-in">
            <StudentDirectoryToolbar
                totalStudents={totalStudents}
                flaggedCount={flaggedStudentIds.length}
                selectedCount={selectedFilteredStudents.length}
                studentSearch={studentSearch}
                setStudentSearch={setStudentSearch}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                uniqueCourses={uniqueCourses}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onTogglePage={toggleCurrentPageStudents}
                pageCount={paginatedStudents.length}
                allPageSelected={allCurrentPageSelected}
                pageSelectedCount={selectedCurrentPageStudents.length}
                onFlagSelected={flagSelectedStudents}
                exportMode={exportMode}
                setExportMode={setExportMode}
                onExport={exportStudents}
                onResetFilters={resetFilters}
            />

            {filteredStudents.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
                    <h2 className="text-base font-bold text-slate-800">{studentsState?.isLoading ? 'Loading students...' : 'No students match these filters'}</h2>
                    <p className="mt-2 text-sm text-slate-500">{studentsState?.isLoading ? 'Preparing your department directory.' : 'Clear a filter or try a broader search.'}</p>
                </div>
            ) : (
                <>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                    {paginatedStudents.map((student: any) => {
                        const studentId = getStudentKey(student);
                        const historyKey = String(student?.student_id || '').trim() || normalizeText(student?.name);
                        const counselingHistoryCount = historyCountMap.get(historyKey) || 0;
                        const annotation = getStudentAnnotation(student);
                        const isFlagged = Boolean(annotation?.is_at_risk);
                        const isSelected = selectedStudentIdSet.has(studentId);
                        const isActive = String(student?.status || '').trim() === 'Active';
                        const savedNote = annotation?.note || '';

                        return (
                            <DeptStudentRow
                                key={studentId}
                                student={student}
                                cardState={{
                                    isActive,
                                    isSelected,
                                    isFlagged,
                                    isEditingNote: editingStudentId === studentId
                                }}
                                counselingHistoryCount={counselingHistoryCount}
                                savedNote={savedNote}
                                noteDraft={noteDraft}
                                setNoteDraft={setNoteDraft}
                                onToggleSelect={() => toggleStudentSelection(studentId)}
                                onViewProfile={() => {
                                    setSelectedStudent(student);
                                    setShowStudentModal(true);
                                }}
                                onOpenNoteEditor={() => openNoteEditor(student)}
                                onSaveNote={() => saveStudentNote(student)}
                                onCancelNote={() => {
                                    setEditingStudentId(null);
                                    setNoteDraft('');
                                }}
                                onToggleFlag={() => toggleStudentFlag(student)}
                            />
                        );
                    })}
                </div>
                <StudentsPaginationBar
                    startIndex={startIndex}
                    endIndex={endIndex}
                    totalStudents={totalStudents}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    onPageSizeChange={(size: number) => {
                        studentsState.setPageSize(size);
                        studentsState.setPage(1);
                    }}
                    goToPage={goToPage}
                />
                </>
            )}
        </div>
    );
};

export default DeptStudentsPage;

