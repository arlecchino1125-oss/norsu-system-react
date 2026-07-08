import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Download, XCircle, Edit, Trash2, Plus, Key, Archive,
    PieChart, List, UploadCloud, Info, ArrowUpDown, Activity, TrendingUp,
    Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, RefreshCw, User, Settings
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { Button } from '../../../../../components/ui/Button';
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
    getArchivedSnapshotForSchoolYear,
    isProfileIncompleteStep1
} from '../utils';

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
}: any) => (
    <>
            {showArchivedStudentsModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start gap-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Archived Students</h3>
                                <p className="text-sm text-slate-500 mt-1">Student records stay preserved here until they are restored to the active roster.</p>
                            </div>
                            <button onClick={() => setShowArchivedStudentsModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
                            <div className="relative w-full md:w-96">
                                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search archived students..."
                                    value={archivedSearchTerm}
                                    onChange={(e) => setArchivedSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white"
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Showing {filteredArchivedStudents.length} of {archivedStudentsList.length} archived students.
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-6 space-y-3">
                            {archivedStudentsLoading ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                    Loading archived students...
                                </div>
                            ) : filteredArchivedStudents.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                                    No archived students found.
                                </div>
                            ) : (
                                filteredArchivedStudents.map((student: any) => (
                                    <div key={student.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                            <div className="min-w-0 space-y-3">
                                                <div>
                                                    <p className="font-semibold text-slate-900">
                                                        {student.first_name} {student.last_name}
                                                    </p>
                                                    <p className="font-mono text-sm text-slate-500">{student.student_id}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                                        {student.course || 'Course not set'}
                                                    </span>
                                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700">
                                                        {student.year_level || 'Year not set'}
                                                    </span>
                                                    <span className={`rounded-full px-2.5 py-1 font-medium ${student.status === 'Active'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {student.status || 'Inactive'}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 text-xs text-slate-500">
                                                    <p>Archived: {formatDateTimeDisplay(student.archived_at)}</p>
                                                    {student.archived_reason && <p>Reason: {student.archived_reason}</p>}
                                                    {student.archive_note && <p>Note: {student.archive_note}</p>}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 md:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => openProfileModal(student)}
                                                    className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
                                                >
                                                    View Profile
                                                </button>
                                                {canRestoreRecords && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRestoreStudent(student)}
                                                        disabled={restoringStudentId === student.id}
                                                        className="px-3 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60"
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
                    </div>
                </div>
            )}
    </>
);

export default ArchivedStudentsModal;
