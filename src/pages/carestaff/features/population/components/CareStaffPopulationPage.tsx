import { useState, useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import {
    Users, Search, Download, XCircle, Edit, Trash2, Plus, Key, Archive,
    PieChart, List, UploadCloud, Info, ArrowUpDown, Activity, TrendingUp,
    Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, RefreshCw, User, Settings, Flag, MessageSquareMore
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { AsyncButton, Button } from '../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card';
import { getValidProfileImageUrl } from '../../../../../utils/formatters';
import type { CareStaffDashboardFunctions } from '../../../types';
import {
    getActiveStudentsForLocalFiltering,
    getAllStudentsForExport,
    getArchivedCareStudents,
    getCareStudentBulkTargets,
    getCareStudentCourseYearCounts,
    getCareStudentPopulationOverview,
    getCareStudentSections,
    getCoursesWithDepartments,
    getDepartments,
    getNatApplicationCourseCounts,
    getStudentByStudentId,
    getStudentsPage,
    studentMatchesSearch,
    type CareStudentCourseYearCount,
    type CareStudentPopulationOverview
} from '../../../../../services/careStaffService';
import { getDepartmentNameFromCourseRecords } from '../../../../../utils/courseDepartment';
import { openStoredAsset, resolveStoredAssetUrl, resolveStoredAssetUrlsBulk } from '../../../../../utils/storageAssets';
import { escapeSpreadsheetFormula } from '../../../../../utils/inputSecurity';

import { useCareStaffPopulation } from '../hooks/useCareStaffPopulation';
import StudentEditModal from './StudentEditModal';
import ArchivedStudentsModal from './ArchivedStudentsModal';
import EnrollmentKeysModal from './EnrollmentKeysModal';
import StudentProfileModal from './StudentProfileModal';
import IdSwapModal from './IdSwapModal';

declare const XLSX: any;

import { PROFILE_CATEGORIES } from '../profileCategories';
import {
    STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS,
    YEAR_LEVEL_OPTIONS,
    ARCHIVE_RPC_MISSING_CACHE_KEY,
    CARE_STUDENT_PAGE_SIZE,
    CARE_STUDENT_TABLE_SHELL_CLASS,
    CARE_STUDENT_SEARCH_DEBOUNCE_MS,
    CARE_STUDENT_REFRESH_MIN_MS,
    EMPTY_POPULATION_OVERVIEW
} from '../constants';
import {
    getCareStudentTotalPages,
    waitForCareStudentRefreshAnimation,
    buildCareStudentPaginationItems,
    renderCareStudentPaddingRows,
    toDateTimeLocal,
    formatDateTimeDisplay,
    parseArchiveEntries,
    deriveSchoolYearLabel,
    getArchivedSnapshotForSchoolYear
} from '../utils';


interface CareStaffPopulationPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    pendingProfileId?: string | null;
    onProfileOpened?: () => void;
    refreshSignal?: number;
}

const PopulationTables = ({
    viewMode, courseYearCountsLoading, allCourses, courseYearCountMap, sortConfig, handleSort, isStudentTableLoading, effectiveTotal, paginatedStudents, studentAnnotationsById, schoolYearFilter, getArchivedSnapshotForSchoolYear, canArchiveRecords, openProfileModal, openEditModal, setStudentToDelete, setShowDeleteModal, renderCareStudentPaddingRows, startIndex, endIndex, currentPage, setCurrentPage, totalPages, paginationItems
}: any) => (
viewMode === 'stats' ? (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} data-refresh-surface className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 overflow-hidden p-8 mb-6">
        <h3 className="font-bold text-xl text-slate-900 mb-6 flex items-center gap-2"><PieChart size={20} className="text-purple-600" /> Live Student Population Counter</h3>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
                <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200/60 uppercase tracking-widest text-[10px] text-slate-500">
                        <th className="p-4 font-bold">Course</th>
                        <th className="p-4 font-bold text-center">1st Year</th>
                        <th className="p-4 font-bold text-center">2nd Year</th>
                        <th className="p-4 font-bold text-center">3rd Year</th>
                        <th className="p-4 font-bold text-center">4th Year</th>
                        <th className="p-4 font-bold text-center bg-blue-50/50 text-blue-700">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                    {courseYearCountsLoading ? (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-400">Loading student population stats...</td></tr>
                    ) : allCourses.map(course => {
                        const courseCounts = courseYearCountMap[course.name] || {};
                        const y1 = courseCounts['1st Year'] || 0;
                        const y2 = courseCounts['2nd Year'] || 0;
                        const y3 = courseCounts['3rd Year'] || 0;
                        const y4 = courseCounts['4th Year'] || 0;
                        const total = y1 + y2 + y3 + y4;
                        return (
                            <m.tr whileHover={{ scale: 1.005, backgroundColor: 'rgba(250, 245, 255, 0.4)' }} transition={{ type: 'spring', stiffness: 400 }} key={course.id} className="cursor-pointer group">
                                <td className="p-4 font-bold text-slate-800 group-hover:text-purple-700 transition-colors">{course.name}</td>
                                <td className="p-4 text-center font-medium text-slate-600">{y1}</td>
                                <td className="p-4 text-center font-medium text-slate-600">{y2}</td>
                                <td className="p-4 text-center font-medium text-slate-600">{y3}</td>
                                <td className="p-4 text-center font-medium text-slate-600">{y4}</td>
                                <td className="p-4 text-center font-black text-blue-700 bg-blue-50/30">{total}</td>
                            </m.tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </m.div>
) : (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} data-refresh-surface className={`${CARE_STUDENT_TABLE_SHELL_CLASS} flex min-h-[500px] flex-col overflow-hidden rounded-xl bg-white shadow-sm`}>
        <div className="flex-1 overflow-x-auto">
            <table className="w-full border-collapse text-left text-[13px]">
                <thead className="bg-slate-50/80 border-b border-slate-200/60 text-[10px] uppercase text-slate-500 font-bold tracking-widest backdrop-blur-sm">
                    <tr>
                        <th scope="col" aria-sort={sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0"><button type="button" className="w-full cursor-pointer px-6 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('name')}>Student <ArrowUpDown size={12} className="inline ml-1 text-purple-400" /></button></th>
                        <th scope="col" aria-sort={sortConfig.key === 'student_id' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0"><button type="button" className="w-full cursor-pointer px-6 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('student_id')}>ID <ArrowUpDown size={12} className="inline ml-1 text-purple-400" /></button></th>
                        <th scope="col" aria-sort={sortConfig.key === 'course' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0"><button type="button" className="w-full cursor-pointer px-6 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('course')}>Course & Year <ArrowUpDown size={12} className="inline ml-1 text-purple-400" /></button></th>
                        <th scope="col" aria-sort={sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'} className="p-0"><button type="button" className="w-full cursor-pointer px-6 py-5 text-left hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500" onClick={() => handleSort('status')}>Status <ArrowUpDown size={12} className="inline ml-1 text-purple-400" /></button></th>
                        <th className="px-6 py-5 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60">
                    {isStudentTableLoading ? (
                        <tr>
                            <td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">Loading students...</td>
                        </tr>
                    ) : effectiveTotal === 0 ? (
                        <tr>
                            <td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">No students found.</td>
                        </tr>
                    ) : (
                        <AnimatePresence mode="wait">
                            {paginatedStudents.map((student, idx) => (
                                (() => {
                                    const annotations = studentAnnotationsById[String(student.id)] || [];
                                    const hasDeptNote = annotations.some((annotation: any) => String(annotation.note || '').trim());
                                    const isDeptFlagged = annotations.some((annotation: any) => annotation.is_at_risk);
                                    return (
                                <m.tr
                                    key={student.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ delay: idx * 0.02, type: 'spring', stiffness: 400, damping: 25 }}
                                    className="border-b border-transparent hover:border-purple-200 transition-colors"
                                >
                                    <td className="px-6 py-4"><span className="text-[13px] font-semibold text-slate-900">{student.first_name} {student.last_name}</span></td>
                                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">{student.student_id}</td>
                                    <td className="px-6 py-4">
                                        {(() => {
                                            const filteredSnapshot = schoolYearFilter === 'All'
                                                ? null
                                                : getArchivedSnapshotForSchoolYear(student, schoolYearFilter);
                                            const displayCourse = filteredSnapshot?.course || student.course || '-';
                                            const displayYear = filteredSnapshot?.year_level || student.year_level || '-';
                                            return (
                                                <>
                                                    <div className="text-[13px] font-medium leading-snug text-slate-700">{displayCourse}</div>
                                                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                        {displayYear}{student.section ? ` — Sec ${student.section}` : ''}
                                                        {filteredSnapshot && <span className="ml-1 text-[10px] text-indigo-600">({schoolYearFilter})</span>}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {student.status === 'Inactive' || student.profile_completed !== true ? (
                                                <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-100 text-amber-700 border border-amber-200/50 shadow-inner">Incomplete</span>
                                            ) : (
                                                <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-inner ${student.status === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200/50' : 'bg-rose-100 text-rose-700 border-rose-200/50'}`}>{student.status}</span>
                                            )}
                                            {hasDeptNote && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 bg-purple-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-purple-700">
                                                    <MessageSquareMore size={11} />
                                                    Note
                                                </span>
                                            )}
                                            {isDeptFlagged && (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                                                    <Flag size={11} />
                                                    At-Risk
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button type="button" aria-label={`View profile for ${student.first_name} ${student.last_name}`} onClick={() => openProfileModal(student)} className="text-purple-500 hover:text-purple-700 p-2 bg-purple-50 rounded-lg mr-2 transition-colors"><Eye size={16} /></button>
                                        <m.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="text-blue-500 hover:text-blue-700 p-2 bg-blue-50 rounded-lg mr-2 transition-colors"><Edit size={16} /></m.button>
                                        {canArchiveRecords && (
                                            <m.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setShowDeleteModal(true); }} className="text-amber-600 hover:text-amber-800 p-2 bg-amber-50 rounded-lg transition-colors" title="Archive Student"><Archive size={16} /></m.button>
                                        )}
                                    </td>
                                </m.tr>
                                    );
                                })()
                            ))}
                            {renderCareStudentPaddingRows(5, paginatedStudents.length)}
                        </AnimatePresence>
                    )}
                </tbody>
            </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs md:flex-row md:items-center md:justify-between">
            <span className="text-slate-500">
                {isStudentTableLoading
                    ? 'Loading students...'
                    : effectiveTotal === 0
                        ? 'No students found.'
                        : `Showing ${startIndex + 1}-${endIndex} of ${effectiveTotal} students`}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-1">
                <button
                    type="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={isStudentTableLoading || currentPage === 1}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="First page"
                >
                    <ChevronsLeft size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={isStudentTableLoading || currentPage === 1}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={14} />
                </button>
                {paginationItems.map((item, index) => (
                    typeof item === 'number' ? (
                        <button
                            key={`student-page-${item}`}
                            type="button"
                            onClick={() => setCurrentPage(item)}
                            disabled={isStudentTableLoading}
                            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-semibold transition ${item === currentPage
                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                : 'border-slate-300 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                                }`}
                            aria-current={item === currentPage ? 'page' : undefined}
                        >
                            {item}
                        </button>
                    ) : (
                        <span key={`student-ellipsis-${index}`} className="inline-flex h-8 min-w-8 items-center justify-center text-slate-400">
                            ...
                        </span>
                    )
                ))}
                <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={isStudentTableLoading || currentPage === totalPages}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={isStudentTableLoading || currentPage === totalPages}
                    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Last page"
                >
                    <ChevronsRight size={14} />
                </button>
            </div>
        </div>
    </m.div>
)
);

const PopulationFilters = ({
    searchTerm, setSearchTerm, filtersExpanded, setFiltersExpanded, departmentFilter, setDepartmentFilter, courseFilter, setCourseFilter, schoolYearFilter, setSchoolYearFilter, sectionFilter, setSectionFilter, statusFilter, setStatusFilter, atRiskFilter, setAtRiskFilter, yearFilter, setYearFilter, hasNoteFilter, setHasNoteFilter, departmentNames, filteredCourseOptions, schoolYearOptions, availableSections, setCurrentPage, activeFilterCount, overviewLoading, populationOverview
}: any) => (
<m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} data-refresh-surface className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
    {/* Search bar + filter toggle */}
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <div className="relative w-full shrink-0 xl:w-96">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <label htmlFor="population-search" className="sr-only">Search students by name or ID</label>
            <input
                id="population-search"
                type="text"
                placeholder="Search by Name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm transition-[border-color,box-shadow] focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/10"
            />
        </div>
        <PopulationStatCards overviewLoading={overviewLoading} populationOverview={populationOverview} />
        <div className="flex shrink-0 items-center gap-2 self-end xl:self-auto">
            <button
                type="button"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${filtersExpanded
                    ? 'border-purple-200 bg-purple-50 text-purple-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h12M4 8h8M6 12h4" />
                </svg>
                Filters
                {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1.5 text-[10px] font-bold text-white">
                        {activeFilterCount}
                    </span>
                )}
            </button>
            {activeFilterCount > 0 && (
                <button type="button"
                    onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); setCourseFilter('All'); setYearFilter('All'); setStatusFilter('All'); setSchoolYearFilter('All'); setSectionFilter('All'); setHasNoteFilter(false); setAtRiskFilter(false); }}
                    className="text-sm font-medium text-red-600 transition-colors hover:text-red-700"
                >
                    Clear all
                </button>
            )}
        </div>
    </div>

    {/* Active filter chips */}
    {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400">Active:</span>
            {departmentFilter !== 'All' && (
                <span className="filter-chip">
                    Dept: {departmentFilter}
                    <button type="button" onClick={() => { setDepartmentFilter('All'); setCourseFilter('All'); setYearFilter('All'); setSectionFilter('All'); }}>&times;</button>
                </span>
            )}
            {courseFilter !== 'All' && (
                <span className="filter-chip">
                    Course: {courseFilter}
                    <button type="button" onClick={() => { setCourseFilter('All'); setYearFilter('All'); setSectionFilter('All'); }}>&times;</button>
                </span>
            )}
            {yearFilter !== 'All' && (
                <span className="filter-chip">
                    Year: {yearFilter}
                    <button type="button" onClick={() => { setYearFilter('All'); setSectionFilter('All'); }}>&times;</button>
                </span>
            )}
            {statusFilter !== 'All' && (
                <span className="filter-chip">
                    Status: {statusFilter}
                    <button type="button" onClick={() => setStatusFilter('All')}>&times;</button>
                </span>
            )}
            {schoolYearFilter !== 'All' && (
                <span className="filter-chip">
                    SY: {schoolYearFilter}
                    <button type="button" onClick={() => { setSchoolYearFilter('All'); setSectionFilter('All'); }}>&times;</button>
                </span>
            )}
            {sectionFilter !== 'All' && (
                <span className="filter-chip">
                    Section: {sectionFilter}
                    <button type="button" onClick={() => setSectionFilter('All')}>&times;</button>
                </span>
            )}
            {hasNoteFilter && (
                <span className="filter-chip">
                    Has Note
                    <button type="button" onClick={() => setHasNoteFilter(false)}>&times;</button>
                </span>
            )}
            {atRiskFilter && (
                <span className="filter-chip">
                    At-Risk
                    <button type="button" onClick={() => setAtRiskFilter(false)}>&times;</button>
                </span>
            )}
        </div>
    )}

    {/* Collapsible filter panel */}
    <div className={`collapsible-panel ${filtersExpanded ? 'collapsible-panel-open' : 'collapsible-panel-closed'}`}>
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-col gap-1">
                <label htmlFor="population-department-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Dept</label>
                <select id="population-department-filter" value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCourseFilter('All'); setYearFilter('All'); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[170px] truncate">
                    <option value="All">All Departments</option>
                    {departmentNames.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="population-course-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Course</label>
                <select id="population-course-filter" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setYearFilter('All'); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[170px] truncate">
                    <option value="All">All Courses</option>
                    {filteredCourseOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="population-year-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Year</label>
                <select id="population-year-filter" value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[120px]">
                    <option value="All">All Years</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="5th Year">5th Year</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="population-status-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Status</label>
                <select id="population-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[140px]">
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Incomplete">Incomplete</option>
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="population-school-year-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">School Year</label>
                <select id="population-school-year-filter" value={schoolYearFilter} onChange={(e) => { setSchoolYearFilter(e.target.value); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[150px] truncate">
                    <option value="All">All School Years</option>
                    {schoolYearOptions.map((sy: string) => <option key={sy} value={sy}>{sy}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="population-section-filter" className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Section</label>
                <select id="population-section-filter" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500 bg-white text-slate-700 w-[120px]">
                    <option value="All">All Sections</option>
                    {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Dept Annotations</p>
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
                    <button
                        type="button"
                        onClick={() => setHasNoteFilter((value: boolean) => !value)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${hasNoteFilter ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <MessageSquareMore size={13} />
                        Has Note
                    </button>
                    <button
                        type="button"
                        onClick={() => setAtRiskFilter((value: boolean) => !value)}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition ${atRiskFilter ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Flag size={13} />
                        At-Risk
                    </button>
                </div>
            </div>
        </div>
    </div>
</m.div>
);

const RefreshingOverlay = () => (
<div className="pointer-events-none fixed left-1/2 top-24 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 lg:left-auto lg:right-8 lg:translate-x-0" role="status" aria-live="polite">
    <div className="care-refresh-card relative overflow-hidden rounded-xl border border-violet-100 bg-white/95 p-4 shadow-2xl shadow-violet-200/40 backdrop-blur-md">
        <div className="care-refresh-scan" aria-hidden="true" />
        <div className="relative flex items-center gap-3">
            <div className="care-refresh-core relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-300/60">
                <span className="care-refresh-ring care-refresh-ring-one" aria-hidden="true" />
                <span className="care-refresh-ring care-refresh-ring-two" aria-hidden="true" />
                <RefreshCw size={20} className="care-refresh-icon" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Refreshing student data</p>
                    <span className="care-refresh-dot" aria-hidden="true" />
                    <span className="care-refresh-dot care-refresh-dot-delay-one" aria-hidden="true" />
                    <span className="care-refresh-dot care-refresh-dot-delay-two" aria-hidden="true" />
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Syncing totals, filters, and the current page.</p>
            </div>
            <Activity size={18} className="shrink-0 text-violet-500" />
        </div>
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="care-refresh-progress h-full rounded-full" />
        </div>
    </div>
</div>
);

const PopulationStatCards = ({ overviewLoading, populationOverview }: any) => (
<m.div
    initial="hidden"
    animate="show"
    variants={{
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    }}
    className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3 xl:flex-1"
>
    <m.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} data-refresh-surface className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Users size={18} />
        </div>
        <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">Total Population</p>
            <p className="text-2xl font-black leading-none tracking-tight text-slate-900">{overviewLoading ? '...' : populationOverview.totalPopulation}</p>
        </div>
    </m.div>

    <m.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} data-refresh-surface className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp size={18} />
        </div>
        <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">Active Students</p>
            <p className="text-2xl font-black leading-none tracking-tight text-slate-900">{overviewLoading ? '...' : populationOverview.activeStudents}</p>
        </div>
    </m.div>

    <m.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} data-refresh-surface className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Archive size={18} />
        </div>
        <div className="min-w-0">
            <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500">Archived Students</p>
            <p className="text-2xl font-black leading-none tracking-tight text-slate-900">{overviewLoading ? '...' : populationOverview.archivedStudents}</p>
        </div>
    </m.div>
</m.div>
);

const PopulationHeader = ({
    isRefreshingData, handleRefreshData, handleExportExcel, canExportStudents, canArchiveRecords, canRestoreRecords,
    overviewLoading, populationOverview, openArchivedStudentsModal, setShowIdSwapModal,
    setShowEnrollmentModal, viewMode, setViewMode
}: any) => (
<m.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-6"
>
    <div className="lg:w-[330px] lg:shrink-0">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Student Population</h1>
        <p className="text-slate-500 text-sm mt-1">Comprehensive management and analytics for the student body.</p>
    </div>
    <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleRefreshData} disabled={isRefreshingData} leftIcon={<RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                {isRefreshingData ? 'Refreshing...' : 'Refresh'}
            </Button>
            {canExportStudents && (
                <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={16} />} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    Export Excel
                </Button>
            )}
            {(canArchiveRecords || canRestoreRecords) && (
                <Button variant="secondary" onClick={openArchivedStudentsModal} leftIcon={<Archive size={16} />} className="rounded-xl shadow-sm transition-shadow text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:shadow-md">
                    Archived ({overviewLoading ? '...' : populationOverview.archivedStudents})
                </Button>
            )}
            <Button variant="secondary" onClick={() => setShowIdSwapModal(true)} leftIcon={<RefreshCw size={16} />} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                Swap IDs
            </Button>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setShowEnrollmentModal(true)} leftIcon={<Settings size={16} />} className="rounded-xl shadow-md shadow-purple-500/30 hover:shadow-lg hover:shadow-purple-500/40 transition-[box-shadow]">
                System Settings
            </Button>
            <Button variant="secondary" onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')} leftIcon={viewMode === 'list' ? <PieChart size={16} /> : <List size={16} />} className="rounded-xl shadow-sm border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:shadow-md transition-[background-color,box-shadow]">
                {viewMode === 'list' ? 'View Stats' : 'View List'}
            </Button>
        </div>
    </div>
</m.div>
);

const CareStaffPopulationPage = ({ functions, pendingProfileId, onProfileOpened, refreshSignal = 0 }: CareStaffPopulationPageProps) => {
    const {
        showToast, canPerformAction, canArchiveRecords, canRestoreRecords, populationOverview, setPopulationOverview,
        overviewLoading, setOverviewLoading, allCourses, setAllCourses, allDepartments, setAllDepartments,
        lookupsLoading, setLookupsLoading, archivedStudentsList, setArchivedStudentsList, archivedStudentsLoading, setArchivedStudentsLoading,
        archivedStudentsLoaded, setArchivedStudentsLoaded, historicalStudents, setHistoricalStudents, historicalStudentsLoading, setHistoricalStudentsLoading,
        availableSections, setAvailableSections, courseYearCounts, setCourseYearCounts, courseYearCountsLoading, setCourseYearCountsLoading,
        courseYearCountsLoaded, setCourseYearCountsLoaded, courseApplicantCounts, setCourseApplicantCounts, courseApplicantCountsLoading, setCourseApplicantCountsLoading,
        courseApplicantCountsLoaded, setCourseApplicantCountsLoaded, refreshInFlightRef, showEnrollmentModal, setShowEnrollmentModal, showArchivedStudentsModal,
        setShowArchivedStudentsModal, showEditModal, setShowEditModal, editForm, setEditForm, showDeleteModal,
        setShowDeleteModal, studentToDelete, setStudentToDelete, archivedSearchTerm, setArchivedSearchTerm, restoringStudentId,
        setRestoringStudentId, openEditModal, handleUpdateStudent, confirmDeleteStudent, handleRestoreStudent, searchTerm,
        setSearchTerm, debouncedSearchTerm, setDebouncedSearchTerm, currentPage, setCurrentPage, enrollmentStatusFilter,
        setEnrollmentStatusFilter, enrollmentSearchQuery, setEnrollmentSearchQuery, totalEnrollmentKeysCount, setTotalEnrollmentKeysCount, courseFilter,
        setCourseFilter, departmentFilter, setDepartmentFilter, courseDeptFilter, setCourseDeptFilter, yearFilter,
        setYearFilter, statusFilter, setStatusFilter, schoolYearFilter, setSchoolYearFilter, sectionFilter,
        setSectionFilter, hasNoteFilter, setHasNoteFilter, atRiskFilter, setAtRiskFilter, filtersExpanded,
        setFiltersExpanded, activeFilterCount, viewMode, setViewMode, itemsPerPage, tableStudents,
        setTableStudents, tableStudentsTotal, setTableStudentsTotal, tableLoading, setTableLoading, isRefreshingData,
        setIsRefreshingData, tableRefreshTick, setTableRefreshTick, sortConfig, setSortConfig, enrollmentKeys,
        setEnrollmentKeys, courseForm, setCourseForm, bulkWindowForm, setBulkWindowForm, isApplyingBulkWindow,
        setIsApplyingBulkWindow, isSyncingBulkKeys, setIsSyncingBulkKeys, settingsTab, setSettingsTab, showIdSwapModal,
        setShowIdSwapModal, sourceId, setSourceId, targetId, setTargetId, isSwappingIds,
        setIsSwappingIds, sourceStudent, setSourceStudent, targetStudent, setTargetStudent, sourceLoading,
        setSourceLoading, targetLoading, setTargetLoading, studentTableRequestIdRef, lastExternalRefreshSignalRef, profileViewStudent,
        setProfileViewStudent, profileCategoryIndex, setProfileCategoryIndex, profileLoading, setProfileLoading, showPhotoModal,
        setShowPhotoModal, archiveRpcStateRef, loadPopulationOverview, loadLookupData, loadArchivedStudents, loadHistoricalStudents,
        loadCourseYearCounts, loadCourseApplicantCounts, refreshPopulationAfterStudentMutation, openProfileModal, fetchEnrollmentKeys, handleRefreshData,
        cleanupExpiredCourseYearWindows, handleDeleteKey, handleGenerateKey, getCurrentStudentFilters, getBulkTargetStudents, updateStudentsByIds,
        applyBulkCourseYearWindow, clearBulkCourseYearWindow, syncEnrollmentKeysFromStudents, handleAddCourse, handleUpdateCourseLimit, handleBulkUpload,
        handleDownloadTemplate, departmentNames, filteredCourseOptions, schoolYearOptions, getStudentCourseYearForFilter, courseRowsForManagement,
        filteredStudents, bulkTargetCount, filteredArchivedStudents, handleExportExcel, canExportStudents, handleSwapIds, handleSort,
        visibleTableStudents, shouldUseServiceSearchOrder, sortedStudents, effectiveTotal, isStudentTableLoading, totalPages,
        startIndex, paginatedStudents, studentAnnotationsById, paginationItems, endIndex,
        courseYearCountMap, openArchivedStudentsModal,
    } = useCareStaffPopulation({ functions, pendingProfileId, onProfileOpened, refreshSignal });
    return (
        <div className={`relative min-h-screen space-y-4 ${isRefreshingData ? 'care-student-refreshing' : ''}`}>
            {isRefreshingData && <RefreshingOverlay />}
            <PopulationHeader
                isRefreshingData={isRefreshingData}
                handleRefreshData={handleRefreshData}
                handleExportExcel={handleExportExcel}
                canExportStudents={canExportStudents}
                canArchiveRecords={canArchiveRecords}
                canRestoreRecords={canRestoreRecords}
                overviewLoading={overviewLoading}
                populationOverview={populationOverview}
                openArchivedStudentsModal={openArchivedStudentsModal}
                setShowIdSwapModal={setShowIdSwapModal}
                setShowEnrollmentModal={setShowEnrollmentModal}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            <PopulationFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filtersExpanded={filtersExpanded}
                setFiltersExpanded={setFiltersExpanded}
                departmentFilter={departmentFilter}
                setDepartmentFilter={setDepartmentFilter}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                schoolYearFilter={schoolYearFilter}
                setSchoolYearFilter={setSchoolYearFilter}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                atRiskFilter={atRiskFilter}
                setAtRiskFilter={setAtRiskFilter}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                hasNoteFilter={hasNoteFilter}
                setHasNoteFilter={setHasNoteFilter}
                departmentNames={departmentNames}
                filteredCourseOptions={filteredCourseOptions}
                schoolYearOptions={schoolYearOptions}
                availableSections={availableSections}
                setCurrentPage={setCurrentPage}
                activeFilterCount={activeFilterCount}
                overviewLoading={overviewLoading}
                populationOverview={populationOverview}
            />

            <PopulationTables
                viewMode={viewMode}
                courseYearCountsLoading={courseYearCountsLoading}
                allCourses={allCourses}
                courseYearCountMap={courseYearCountMap}
                sortConfig={sortConfig}
                handleSort={handleSort}
                isStudentTableLoading={isStudentTableLoading}
                effectiveTotal={effectiveTotal}
                paginatedStudents={paginatedStudents}
                studentAnnotationsById={studentAnnotationsById}
                schoolYearFilter={schoolYearFilter}
                getArchivedSnapshotForSchoolYear={getArchivedSnapshotForSchoolYear}
                canArchiveRecords={canArchiveRecords}
                openProfileModal={openProfileModal}
                openEditModal={openEditModal}
                setStudentToDelete={setStudentToDelete}
                setShowDeleteModal={setShowDeleteModal}
                renderCareStudentPaddingRows={renderCareStudentPaddingRows}
                startIndex={startIndex}
                endIndex={endIndex}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalPages={totalPages}
                paginationItems={paginationItems}
            />

            <StudentEditModal
                allCourses={allCourses}
                editForm={editForm}
                handleUpdateStudent={handleUpdateStudent}
                setEditForm={setEditForm}
                setShowEditModal={setShowEditModal}
                showEditModal={showEditModal}
            />

            {/* Delete Student Modal */}
            {
                showDeleteModal && studentToDelete && canArchiveRecords && (
                    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="px-6 py-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-lg">Archive Student</h3>
                                <button type="button" aria-label="Close archive student dialog" onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}>
                                    <XCircle size={24} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-slate-700">
                                    Archive <span className="font-semibold">{studentToDelete.first_name} {studentToDelete.last_name}</span> and mark the linked enrollment key as archived?
                                </p>
                                <p className="text-xs text-slate-500">The student record stays in the database but is removed from the active roster.</p>
                                <div className="pt-2 flex gap-3">
                                    <button type="button" onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                    <AsyncButton type="button" onClick={confirmDeleteStudent} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60 inline-flex items-center justify-center">Archive</AsyncButton>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            <ArchivedStudentsModal
                archivedSearchTerm={archivedSearchTerm}
                archivedStudentsList={archivedStudentsList}
                archivedStudentsLoading={archivedStudentsLoading}
                canRestoreRecords={canRestoreRecords}
                filteredArchivedStudents={filteredArchivedStudents}
                handleRestoreStudent={handleRestoreStudent}
                openProfileModal={openProfileModal}
                restoringStudentId={restoringStudentId}
                setArchivedSearchTerm={setArchivedSearchTerm}
                setShowArchivedStudentsModal={setShowArchivedStudentsModal}
                showArchivedStudentsModal={showArchivedStudentsModal}
            />

            <EnrollmentKeysModal
                allCourses={allCourses}
                allDepartments={allDepartments}
                applyBulkCourseYearWindow={applyBulkCourseYearWindow}
                bulkTargetCount={bulkTargetCount}
                bulkWindowForm={bulkWindowForm}
                clearBulkCourseYearWindow={clearBulkCourseYearWindow}
                courseApplicantCounts={courseApplicantCounts}
                courseApplicantCountsLoading={courseApplicantCountsLoading}
                courseDeptFilter={courseDeptFilter}
                courseForm={courseForm}
                courseRowsForManagement={courseRowsForManagement}
                departmentNames={departmentNames}
                enrollmentKeys={enrollmentKeys}
                enrollmentSearchQuery={enrollmentSearchQuery}
                enrollmentStatusFilter={enrollmentStatusFilter}
                handleAddCourse={handleAddCourse}
                handleBulkUpload={handleBulkUpload}
                handleDeleteKey={handleDeleteKey}
                handleDownloadTemplate={handleDownloadTemplate}
                handleGenerateKey={handleGenerateKey}
                handleUpdateCourseLimit={handleUpdateCourseLimit}
                modalState={{
                    canArchiveRecords,
                    isApplyingBulkWindow,
                    isSyncingBulkKeys,
                    showEnrollmentModal
                }}
                setBulkWindowForm={setBulkWindowForm}
                setCourseDeptFilter={setCourseDeptFilter}
                setCourseForm={setCourseForm}
                setEnrollmentSearchQuery={setEnrollmentSearchQuery}
                setEnrollmentStatusFilter={setEnrollmentStatusFilter}
                setSettingsTab={setSettingsTab}
                setShowEnrollmentModal={setShowEnrollmentModal}
                settingsTab={settingsTab}
                syncEnrollmentKeysFromStudents={syncEnrollmentKeysFromStudents}
                totalEnrollmentKeysCount={totalEnrollmentKeysCount}
            />

            <StudentProfileModal
                openEditModal={openEditModal}
                profileCategoryIndex={profileCategoryIndex}
                profileLoading={profileLoading}
                profileStudentAnnotations={profileViewStudent ? studentAnnotationsById[String(profileViewStudent.id)] || [] : []}
                profileViewStudent={profileViewStudent}
                setProfileCategoryIndex={setProfileCategoryIndex}
                setProfileViewStudent={setProfileViewStudent}
                setShowPhotoModal={setShowPhotoModal}
                showPhotoModal={showPhotoModal}
                showToast={showToast}
            />

            <IdSwapModal
                handleSwapIds={handleSwapIds}
                isSwappingIds={isSwappingIds}
                setShowIdSwapModal={setShowIdSwapModal}
                setSourceId={setSourceId}
                setSourceStudent={setSourceStudent}
                setTargetId={setTargetId}
                setTargetStudent={setTargetStudent}
                showIdSwapModal={showIdSwapModal}
                sourceId={sourceId}
                sourceLoading={sourceLoading}
                sourceStudent={sourceStudent}
                targetId={targetId}
                targetLoading={targetLoading}
                targetStudent={targetStudent}
            />
        </div >
    );
};

export default CareStaffPopulationPage;
