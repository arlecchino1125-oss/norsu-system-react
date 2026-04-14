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

const DEPT_STUDENT_NOTES_STORAGE_KEY = 'dept-student-notes-v1';
const DEPT_STUDENT_FLAGS_STORAGE_KEY = 'dept-student-flags-v1';
const ITEMS_PER_PAGE_DEFAULT = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const readStoredJson = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;

    try {
        const rawValue = window.localStorage.getItem(key);
        return rawValue ? JSON.parse(rawValue) as T : fallback;
    } catch {
        return fallback;
    }
};

const persistStoredJson = (key: string, value: unknown) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
};

const escapeCsvValue = (value: unknown) => {
    const text = String(value ?? '');
    if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Record<string, unknown>>) => {
    if (typeof window === 'undefined') return;

    const csvBody = [
        headers.join(','),
        ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(','))
    ].join('\n');

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

const DeptStudentsPage = ({
    filteredData,
    studentSearch,
    setStudentSearch,
    setSelectedStudent,
    setShowStudentModal
}: any) => {
    const students = Array.isArray(filteredData?.students) ? filteredData.students : [];
    const counselingRequests = Array.isArray(filteredData?.requests) ? filteredData.requests : [];

    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
    const [noteDraft, setNoteDraft] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE_DEFAULT);
    const [exportMode, setExportMode] = useState<'selected' | 'filtered'>('selected');
    const [studentNotes, setStudentNotes] = useState<Record<string, string>>(
        () => readStoredJson<Record<string, string>>(DEPT_STUDENT_NOTES_STORAGE_KEY, {})
    );
    const [flaggedStudentIds, setFlaggedStudentIds] = useState<string[]>(
        () => readStoredJson<string[]>(DEPT_STUDENT_FLAGS_STORAGE_KEY, [])
    );

    useEffect(() => {
        persistStoredJson(DEPT_STUDENT_NOTES_STORAGE_KEY, studentNotes);
    }, [studentNotes]);

    useEffect(() => {
        persistStoredJson(DEPT_STUDENT_FLAGS_STORAGE_KEY, flaggedStudentIds);
    }, [flaggedStudentIds]);

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

    const uniqueCourses = useMemo<string[]>(
        () => Array.from(new Set<string>(students.map((student: any) => String(student?.course || '').trim()).filter(Boolean))).sort(),
        [students]
    );

    const uniqueYears = useMemo<string[]>(
        () => Array.from(new Set<string>(students.map((student: any) => String(student?.year_level || student?.year || '').trim()).filter(Boolean))).sort(),
        [students]
    );

    const filteredStudents = useMemo(() => (
        students
            .filter((student: any) => {
                const searchTarget = `${student?.name || ''} ${student?.email || ''} ${student?.course || ''} ${student?.student_id || student?.id || ''}`.toLowerCase();
                const yearValue = String(student?.year_level || student?.year || '').trim();
                const statusValue = String(student?.status || '').trim();
                const courseValue = String(student?.course || '').trim();

                return searchTarget.includes(String(studentSearch || '').trim().toLowerCase())
                    && (courseFilter === 'All' || courseValue === courseFilter)
                    && (yearFilter === 'All' || yearValue === yearFilter)
                    && (statusFilter === 'All' || statusValue === statusFilter);
            })
            .sort((left: any, right: any) => {
                const leftFlagged = flaggedStudentIds.includes(getStudentKey(left)) ? 1 : 0;
                const rightFlagged = flaggedStudentIds.includes(getStudentKey(right)) ? 1 : 0;

                if (leftFlagged !== rightFlagged) return rightFlagged - leftFlagged;
                return String(left?.name || '').localeCompare(String(right?.name || ''));
            })
    ), [courseFilter, flaggedStudentIds, statusFilter, studentSearch, students, yearFilter]);

    useEffect(() => {
        const visibleIds = new Set(filteredStudents.map((student: any) => getStudentKey(student)));
        setSelectedStudentIds((previous) => previous.filter((id) => visibleIds.has(id)));
    }, [filteredStudents]);

    useEffect(() => {
        setCurrentPage(1);
    }, [courseFilter, yearFilter, statusFilter, studentSearch]);

    const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
    const startIndex = filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const selectedFilteredStudents = filteredStudents.filter((student: any) => selectedStudentIds.includes(getStudentKey(student)));
    const selectedCurrentPageStudents = paginatedStudents.filter((student: any) => selectedStudentIds.includes(getStudentKey(student)));
    const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student: any) => selectedStudentIds.includes(getStudentKey(student)));
    const allCurrentPageSelected = paginatedStudents.length > 0 && paginatedStudents.every((student: any) => selectedStudentIds.includes(getStudentKey(student)));

    const resetFilters = () => {
        setCourseFilter('All');
        setYearFilter('All');
        setStatusFilter('All');
    };

    const goToPage = (nextPage: number) => {
        const safePage = Number.isFinite(nextPage) ? Math.min(Math.max(nextPage, 1), totalPages) : 1;
        setCurrentPage(safePage);
    };

    const toggleStudentSelection = (studentId: string) => {
        setSelectedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const toggleAllFilteredStudents = () => {
        const filteredIds = filteredStudents.map((student: any) => getStudentKey(student));

        setSelectedStudentIds((previous) => {
            if (allFilteredSelected) {
                return previous.filter((id) => !filteredIds.includes(id));
            }

            return Array.from(new Set([...previous, ...filteredIds]));
        });
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

    const toggleStudentFlag = (studentId: string) => {
        setFlaggedStudentIds((previous) => (
            previous.includes(studentId)
                ? previous.filter((id) => id !== studentId)
                : [...previous, studentId]
        ));
    };

    const flagSelectedStudents = () => {
        if (selectedFilteredStudents.length === 0) return;

        setFlaggedStudentIds((previous) => Array.from(new Set([
            ...previous,
            ...selectedFilteredStudents.map((student: any) => getStudentKey(student))
        ])));
    };

    const openNoteEditor = (student: any) => {
        const studentId = getStudentKey(student);
        setEditingStudentId(studentId);
        setNoteDraft(studentNotes[studentId] || '');
    };

    const saveStudentNote = (studentId: string) => {
        setStudentNotes((previous) => ({
            ...previous,
            [studentId]: noteDraft.trim()
        }));
        setEditingStudentId(null);
        setNoteDraft('');
    };

    const exportStudents = () => {
        const exportRows = exportMode === 'selected' ? selectedFilteredStudents : filteredStudents;
        if (exportRows.length === 0) return;

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
                const studentId = getStudentKey(student);
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
                    'At Risk': flaggedStudentIds.includes(studentId) ? 'Yes' : 'No',
                    Note: studentNotes[studentId] || ''
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
                            {filteredStudents.length} filtered
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                            <AlertTriangle size={14} />
                            {flaggedStudentIds.length} flagged
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
                            <CheckCircle2 size={14} />
                            {selectedFilteredStudents.length} selected of {filteredStudents.length}
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
                    </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleAllFilteredStudents}
                        disabled={filteredStudents.length === 0}
                        className={`px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
                    >
                        {allFilteredSelected ? 'Clear Filtered' : 'Select Filtered'}
                    </button>
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
                        onClick={exportStudents}
                        disabled={exportMode === 'selected' ? selectedFilteredStudents.length === 0 : filteredStudents.length === 0}
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
                    <h3 className="text-lg font-bold text-gray-900">No students match the current filters</h3>
                    <p className="mt-2 text-sm text-gray-500">Try clearing one or more filters or widening the search.</p>
                </div>
            ) : (
                <>
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                    {paginatedStudents.map((student: any) => {
                        const studentId = getStudentKey(student);
                        const historyKey = String(student?.student_id || '').trim() || normalizeText(student?.name);
                        const counselingHistoryCount = historyCountMap.get(historyKey) || 0;
                        const isFlagged = flaggedStudentIds.includes(studentId);
                        const isSelected = selectedStudentIds.includes(studentId);
                        const isActive = String(student?.status || '').trim() === 'Active';
                        const savedNote = studentNotes[studentId] || '';

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
                                                onClick={() => saveStudentNote(studentId)}
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
                                        onClick={() => toggleStudentFlag(studentId)}
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
                                Showing {startIndex + 1}-{endIndex} of {filteredStudents.length} results
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
                                        setPageSize(Number(event.target.value));
                                        setCurrentPage(1);
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
