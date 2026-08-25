import { useState, useEffect } from 'react';
import { Search, Archive, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatDateTimeDisplay, buildCareStudentPaginationItems } from '../utils';

interface ArchivedStudentsModalProps {
    archivedSearchTerm: string;
    archivedStudentsList: any[];
    archivedStudentsLoading: boolean;
    canRestoreRecords: boolean;
    filteredArchivedStudents: any[];
    handleRestoreStudent: (student: any) => Promise<void>;
    openProfileModal: (student: any) => void;
    restoringStudentId: string | number | null;
    setArchivedSearchTerm: (term: string) => void;
    setShowArchivedStudentsModal: (show: boolean) => void;
    showArchivedStudentsModal: boolean;
}

const ARCHIVE_PAGE_SIZE = 5;

const ArchivedStudentsModal = ({
    archivedSearchTerm,
    archivedStudentsList,
    archivedStudentsLoading,
    canRestoreRecords,
    filteredArchivedStudents,
    handleRestoreStudent,
    openProfileModal,
    restoringStudentId,
    setArchivedSearchTerm,
    setShowArchivedStudentsModal,
    showArchivedStudentsModal
}: ArchivedStudentsModalProps) => {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [archivedSearchTerm]);

    if (!showArchivedStudentsModal) return null;

    const totalStudents = filteredArchivedStudents.length;
    const totalPages = Math.max(1, Math.ceil(totalStudents / ARCHIVE_PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = (safePage - 1) * ARCHIVE_PAGE_SIZE;
    const endIndex = Math.min(startIndex + ARCHIVE_PAGE_SIZE, totalStudents);
    const paginatedStudents = filteredArchivedStudents.slice(startIndex, endIndex);
    const paginationItems = buildCareStudentPaginationItems(safePage, totalPages);

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            {/* Click outside to close (transparent backdrop) */}
            <button
                type="button"
                aria-label="Close archived students backdrop"
                onClick={() => setShowArchivedStudentsModal(false)}
                className="absolute inset-0 bg-transparent focus:outline-none cursor-default"
            />

            {/* Modal Dialog with comfortable spacing from ceiling and bottom */}
            <div className="relative z-10 bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] w-full max-w-4xl max-h-[calc(100%-2.5rem)] overflow-hidden flex flex-col border border-slate-200/90 animate-scale-in">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] p-5 px-6 flex justify-between items-center text-white border-b border-purple-900/40 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2.5 text-white">
                            <Archive size={20} className="text-amber-400" />
                            Archived Students
                        </h3>
                        <p className="text-purple-200/80 text-xs mt-0.5 font-medium">
                            Student records remain preserved here until restored to the active roster.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close archived students"
                        onClick={() => setShowArchivedStudentsModal(false)}
                        className="text-purple-200 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search Toolbar */}
                <div className="px-6 py-3.5 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <div className="relative w-full sm:w-80">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search archived students..."
                            value={archivedSearchTerm}
                            onChange={(e) => setArchivedSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs md:text-sm font-medium bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10"
                        />
                    </div>
                    <p className="text-xs text-slate-500 font-semibold">
                        Showing {totalStudents > 0 ? `${startIndex + 1}-${endIndex}` : '0'} of {totalStudents} archived students ({archivedStudentsList.length} total)
                    </p>
                </div>

                {/* List Body */}
                <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50/40 p-5 md:p-6 space-y-3 custom-scrollbar">
                    {archivedStudentsLoading ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400">
                            Loading archived students...
                        </div>
                    ) : paginatedStudents.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs font-semibold text-slate-400">
                            No archived students found.
                        </div>
                    ) : (
                        paginatedStudents.map((student: any) => (
                            <div key={student.id} className="rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-2xs hover:border-purple-200 transition-colors">
                                <div className="flex flex-col gap-3.5 md:flex-row md:items-start md:justify-between">
                                    <div className="min-w-0 space-y-2.5">
                                        <div>
                                            <p className="font-bold text-sm text-slate-900">
                                                {student.first_name} {student.last_name}
                                            </p>
                                            <p className="font-mono text-xs font-semibold text-slate-500 mt-0.5">{student.student_id}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2 text-xs">
                                            <span className="rounded-full bg-purple-50 text-purple-700 border border-purple-100 px-2.5 py-0.5 text-[11px] font-bold">
                                                {student.course || 'Course not set'}
                                            </span>
                                            <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[11px] font-semibold">
                                                {student.year_level || 'Year not set'}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${student.status === 'Active'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                {student.status || 'Inactive'}
                                            </span>
                                        </div>

                                        <div className="space-y-0.5 text-[11.5px] text-slate-500 font-medium">
                                            <p>Archived: {formatDateTimeDisplay(student.archived_at)}</p>
                                            {student.archived_reason && <p>Reason: {student.archived_reason}</p>}
                                            {student.archive_note && <p>Note: {student.archive_note}</p>}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 md:justify-end shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => openProfileModal(student)}
                                            className="px-3.5 py-2 border border-slate-200 bg-white hover:bg-purple-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs"
                                        >
                                            View Profile
                                        </button>
                                        {canRestoreRecords && (
                                            <button
                                                type="button"
                                                onClick={() => handleRestoreStudent(student)}
                                                disabled={restoringStudentId === student.id}
                                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-60"
                                            >
                                                {restoringStudentId === student.id ? 'Unarchiving...' : 'Unarchive'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Sticky Pagination Footer */}
                {totalStudents > 0 && (
                    <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 bg-white px-6 py-3 text-xs">
                        <span className="font-semibold text-slate-500">
                            Page {safePage} of {totalPages}
                        </span>

                        <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                disabled={safePage === 1}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="First page"
                            >
                                <ChevronsLeft size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={safePage === 1}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={13} />
                            </button>

                            {paginationItems.map((item, index) => (
                                typeof item === 'number' ? (
                                    <button
                                        key={`archive-page-${item}`}
                                        type="button"
                                        onClick={() => setCurrentPage(item)}
                                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${item === safePage
                                            ? 'border-purple-600 bg-purple-600 text-white shadow-2xs'
                                            : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ) : (
                                    <span key={`archive-ellipsis-${index}`} className="inline-flex h-7 min-w-7 items-center justify-center text-slate-400 text-xs">
                                        ...
                                    </span>
                                )
                            ))}

                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={safePage === totalPages}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={safePage === totalPages}
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-1.5 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Last page"
                            >
                                <ChevronsRight size={13} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchivedStudentsModal;
