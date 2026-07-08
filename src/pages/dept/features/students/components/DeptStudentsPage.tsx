import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BookOpen,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    Flag,
    FlagOff,
    GraduationCap,
    Mail,
    MessageSquarePlus,
    Search,
    Users,
    X
} from 'lucide-react';
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
const getStudentDbId = (student: any) => {
    const value = Number(student?.row_id || student?.id);
    return Number.isFinite(value) && value > 0 ? value : null;
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
    const students = Array.isArray(studentsState?.rows) ? studentsState.rows : [];
    const counselingRequests = Array.isArray(filteredData?.requests) ? filteredData.requests : [];

    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [exportMode, setExportMode] = useState<'selected' | 'filtered'>('selected');
    const [annotationMap, setAnnotationMap] = useState<Record<string, DeptStudentAnnotation[]>>({});

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

    useEffect(() => {
        const studentIds = students.map(getStudentDbId).filter(Boolean) as number[];
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
        students
            .filter((student: any) => {
                const studentDbId = getStudentDbId(student);
                if (!studentDbId) return false;
                return Boolean(annotationMap[String(studentDbId)]?.some((annotation) => (
                    annotation.department === departmentName && annotation.is_at_risk
                )));
            })
            .map((student: any) => getStudentKey(student))
    ), [annotationMap, departmentName, students]);

    // Full course list for this college comes from the course→department map; page rows are the fallback
    const uniqueCourses = useMemo<string[]>(() => {
        const courseOptions: string[] = Array.isArray(filteredData?.courseOptions)
            ? filteredData.courseOptions
                .map((course: unknown) => String(course || '').trim())
                .filter((course: string) => course.length > 0)
            : [];
        if (courseOptions.length > 0) {
            return Array.from(new Set(courseOptions)).sort();
        }
        return Array.from(new Set<string>(students.map((student: any) => String(student?.course || '').trim()).filter(Boolean))).sort();
    }, [filteredData?.courseOptions, students]);

    const uniqueYears = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

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
        [...students].sort((left: any, right: any) => {
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

    const selectedFilteredStudents = filteredStudents.filter((student: any) => selectedStudentIds.includes(getStudentKey(student)));
    const selectedCurrentPageStudents = paginatedStudents.filter((student: any) => selectedStudentIds.includes(getStudentKey(student)));
    const allCurrentPageSelected = paginatedStudents.length > 0 && paginatedStudents.every((student: any) => selectedStudentIds.includes(getStudentKey(student)));

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

        setSelectedStudentIds((previous) => {
            if (allCurrentPageSelected) {
                return previous.filter((id) => !currentPageIds.includes(id));
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

    const exportStudents = async () => {
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

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/80 shadow-sm card-hover space-y-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Student Directory</h2>
                        <p className="text-sm text-gray-500 mt-1 pl-4">Filter by course, year level, and status while keeping quick student actions close at hand.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <Users size={14} />
                            {totalStudents} filtered
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                            <AlertTriangle size={14} />
                            {flaggedStudentIds.length} flagged
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                            <CheckCircle2 size={14} />
                            {selectedFilteredStudents.length} selected on this page
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))]">
                    <label className="relative block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                        <input
                            value={studentSearch}
                            onChange={(event) => setStudentSearch(event.target.value)}
                            className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
                            placeholder="Search students, course, email, or ID"
                        />
                    </label>

                    <select
                        value={courseFilter}
                        onChange={(event) => setCourseFilter(event.target.value)}
                        className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
                    >
                        <option value="All">All Courses</option>
                        {uniqueCourses.map((course) => (
                            <option key={course} value={course}>{course}</option>
                        ))}
                    </select>

                    <select
                        value={yearFilter}
                        onChange={(event) => setYearFilter(event.target.value)}
                        className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
                    >
                        <option value="All">All Year Levels</option>
                        {uniqueYears.map((year) => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 transition-all focus:bg-white focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Incomplete">Incomplete</option>
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleCurrentPageStudents}
                        disabled={paginatedStudents.length === 0}
                        className={`px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm font-bold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                    >
                        {allCurrentPageSelected ? 'Clear Page' : `Select Page (${selectedCurrentPageStudents.length}/${paginatedStudents.length})`}
                    </button>
                    <button
                        type="button"
                        onClick={flagSelectedStudents}
                        disabled={selectedFilteredStudents.length === 0}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                    >
                        <Flag size={14} />
                        Flag Selected
                    </button>

                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setExportMode('selected')}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${exportMode === 'selected' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} ${FOCUS_RING}`}
                        >
                            Export Selected
                        </button>
                        <button
                            type="button"
                            onClick={() => setExportMode('filtered')}
                            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${exportMode === 'filtered' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} ${FOCUS_RING}`}
                        >
                            Export All Filtered
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => void exportStudents()}
                        disabled={exportMode === 'selected' ? selectedFilteredStudents.length === 0 : totalStudents === 0}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                    >
                        <Download size={14} />
                        Export CSV
                    </button>
                    {(courseFilter !== 'All' || yearFilter !== 'All' || statusFilter !== 'All') && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold transition hover:bg-rose-100 ${FOCUS_RING}`}
                        >
                            <X size={14} />
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {filteredStudents.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-12 text-center">
                    <h3 className="text-lg font-bold text-gray-900">{studentsState?.isLoading ? 'Loading students...' : 'No students match the current filters'}</h3>
                    <p className="mt-2 text-sm text-gray-500">{studentsState?.isLoading ? 'Fetching the student directory for your department.' : 'Try clearing one or more filters or widening the search.'}</p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                    {paginatedStudents.map((student: any) => {
                        const studentId = getStudentKey(student);
                        const historyKey = String(student?.student_id || '').trim() || normalizeText(student?.name);
                        const counselingHistoryCount = historyCountMap.get(historyKey) || 0;
                        const annotation = getStudentAnnotation(student);
                        const isFlagged = Boolean(annotation?.is_at_risk);
                        const isSelected = selectedStudentIds.includes(studentId);
                        const isActive = String(student?.status || '').trim() === 'Active';
                        const savedNote = annotation?.note || '';

                        return (
                            <article key={studentId} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-gray-100/80 shadow-sm card-hover space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleStudentSelection(studentId)}
                                            aria-label={`Select ${student?.name || 'student'}`}
                                            className={`mt-2 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 ${FOCUS_RING}`}
                                        />
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg ${isActive ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200/60' : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200/60'}`}>
                                            {(student?.name || 'S').charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-bold text-gray-900 truncate">{student?.name || 'Unnamed Student'}</h3>
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isActive ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-slate-200 bg-slate-100 text-slate-600'}`}>
                                                    {isActive ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                                    {isActive ? 'Active' : String(student?.status || 'Inactive')}
                                                </span>
                                                {isFlagged && (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                                                        <Flag size={12} />
                                                        At-Risk
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-gray-500 break-all">
                                                <Mail size={12} />
                                                {student?.email || 'No email provided'}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                                                    <BookOpen size={12} />
                                                    {student?.course || 'Course N/A'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                                    <GraduationCap size={12} />
                                                    {student?.year_level || student?.year || 'Year N/A'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-violet-700">
                                                    <Users size={12} />
                                                    Section {student?.section || 'N/A'}
                                                </span>
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">
                                                    <MessageSquarePlus size={12} />
                                                    {counselingHistoryCount} counseling record{counselingHistoryCount === 1 ? '' : 's'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {savedNote && editingStudentId !== studentId && (
                                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Faculty Note</p>
                                        <p className="mt-1 text-sm text-emerald-900 whitespace-pre-wrap">{savedNote}</p>
                                    </div>
                                )}

                                {editingStudentId === studentId && (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 space-y-3">
                                        <label className="block text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                                            Department Note
                                        </label>
                                        <textarea
                                            rows={3}
                                            value={noteDraft}
                                            onChange={(event) => setNoteDraft(event.target.value)}
                                            className={`w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-700 resize-none transition-all focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
                                            placeholder="Add a short faculty note for follow-up, mentoring, or academic risk tracking."
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => saveStudentNote(student)}
                                                className={`px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition ${FOCUS_RING}`}
                                            >
                                                Save Note
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingStudentId(null);
                                                    setNoteDraft('');
                                                }}
                                                className={`px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 transition ${FOCUS_RING}`}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedStudent(student);
                                            setShowStudentModal(true);
                                        }}
                                        className={`inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 transition ${FOCUS_RING}`}
                                    >
                                        <Eye size={14} />
                                        View Profile
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openNoteEditor(student)}
                                        className={`inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition ${FOCUS_RING}`}
                                    >
                                        <MessageSquarePlus size={14} />
                                        {savedNote ? 'Edit Note' : 'Add Note'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleStudentFlag(student)}
                                        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${isFlagged ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'} ${FOCUS_RING}`}
                                    >
                                        {isFlagged ? <FlagOff size={14} /> : <Flag size={14} />}
                                        {isFlagged ? 'Remove At-Risk' : 'Flag as At-Risk'}
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100/80 shadow-sm p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-800">
                                Showing {startIndex + 1}-{endIndex} of {totalStudents} results
                            </p>
                            <p className="text-xs text-gray-500">
                                Page {currentPage} of {totalPages}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-semibold">Rows</span>
                                <select
                                    value={pageSize}
                                    onChange={(event) => {
                                        studentsState.setPageSize(Number(event.target.value));
                                        studentsState.setPage(1);
                                    }}
                                    className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ${FOCUS_RING}`}
                                >
                                    {PAGE_SIZE_OPTIONS.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="font-semibold">Jump to</span>
                                <input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={currentPage}
                                    onChange={(event) => goToPage(Number(event.target.value) || 1)}
                                    className={`w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ${FOCUS_RING}`}
                                />
                            </label>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
    );
};

export default DeptStudentsPage;

