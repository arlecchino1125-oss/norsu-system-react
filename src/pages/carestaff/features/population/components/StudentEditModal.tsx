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
import { Button, useAsyncHandler } from '../../../../../components/ui/Button';
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

const StudentEditModal = ({
    allCourses,
    editForm,
    handleUpdateStudent,
    setEditForm,
    setShowEditModal,
    showEditModal
}: any) => {
    const [onUpdateStudent, isUpdatingStudent] = useAsyncHandler(handleUpdateStudent);
    return (
    <>
            {showEditModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Edit Student</h3>
                            <button type="button" aria-label="Close student editor" onClick={() => setShowEditModal(false)}>
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={onUpdateStudent} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label htmlFor="student-first-name" className="block text-xs font-bold mb-1">First Name</label>
                                <input
                                    id="student-first-name"
                                        required
                                        value={editForm.first_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                <label htmlFor="student-last-name" className="block text-xs font-bold mb-1">Last Name</label>
                                <input
                                    id="student-last-name"
                                        required
                                        value={editForm.last_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="student-course" className="block text-xs font-bold mb-1">Course</label>
                                <select
                                    id="student-course"
                                    required
                                    value={editForm.course || ''}
                                    onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                    <option value="">Select...</option>
                                    {allCourses.map((course: any) => (
                                        <option key={course.id} value={course.name}>{course.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                <label htmlFor="student-year-level" className="block text-xs font-bold mb-1">Year Level</label>
                                <select
                                    id="student-year-level"
                                        value={editForm.year_level || '1st Year'}
                                        onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                                <div>
                                <label htmlFor="student-status" className="block text-xs font-bold mb-1">Status</label>
                                <select
                                    id="student-status"
                                        value={editForm.status || 'Active'}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                        <option value="Probation">Probation</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                                <label className="flex items-start gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(editForm.course_year_update_required)}
                                        onChange={(e) => setEditForm({
                                            ...editForm,
                                            course_year_update_required: e.target.checked,
                                            course_year_window_start: e.target.checked ? editForm.course_year_window_start || '' : '',
                                            course_year_window_end: e.target.checked ? editForm.course_year_window_end || '' : '',
                                        })}
                                        className="mt-0.5"
                                    />
                                    <span>
                                        <span className="font-semibold">Require course/year confirmation</span>
                                        <span className="block text-xs text-slate-500">Student must confirm course and year within the window below.</span>
                                    </span>
                                </label>
                                {Boolean(editForm.course_year_update_required) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                        <div>
                                    <label htmlFor="student-window-start" className="block text-xs font-bold mb-1">Window Start</label>
                                    <input
                                        id="student-window-start"
                                                type="datetime-local"
                                                value={editForm.course_year_window_start || ''}
                                                onChange={(e) => setEditForm({ ...editForm, course_year_window_start: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                    <label htmlFor="student-window-end" className="block text-xs font-bold mb-1">Window End</label>
                                    <input
                                        id="student-window-end"
                                                type="datetime-local"
                                                value={editForm.course_year_window_end || ''}
                                                onChange={(e) => setEditForm({ ...editForm, course_year_window_end: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={isUpdatingStudent} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{isUpdatingStudent ? 'Updating...' : 'Update Student'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
    </>
    );
};

export default StudentEditModal;
