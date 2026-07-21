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
import { AsyncButton, Button, useAsyncHandler } from '../../../../../components/ui/Button';
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

const EnrollmentKeysModal = ({
    allCourses,
    allDepartments,
    applyBulkCourseYearWindow,
    bulkTargetCount,
    bulkWindowForm,
    clearBulkCourseYearWindow,
    courseApplicantCounts,
    courseApplicantCountsLoading,
    courseDeptFilter,
    courseForm,
    courseRowsForManagement,
    departmentNames,
    enrollmentKeys,
    enrollmentSearchQuery,
    enrollmentStatusFilter,
    handleAddCourse,
    handleBulkUpload,
    handleDeleteKey,
    handleDownloadTemplate,
    handleGenerateKey,
    handleUpdateCourseLimit,
    modalState,
    setBulkWindowForm,
    setCourseDeptFilter,
    setCourseForm,
    setEnrollmentSearchQuery,
    setEnrollmentStatusFilter,
    setSettingsTab,
    setShowEnrollmentModal,
    settingsTab,
    syncEnrollmentKeysFromStudents,
    totalEnrollmentKeysCount
}: any) => {
    const { canArchiveRecords, isApplyingBulkWindow, isSyncingBulkKeys, showEnrollmentModal } = modalState;
    const [onGenerateKey, isGeneratingKey] = useAsyncHandler(handleGenerateKey);
    const [onAddCourse, isAddingCourse] = useAsyncHandler(handleAddCourse);
    return (
    <>
            {showEnrollmentModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Manage System Settings</h3>
                            <button type="button" aria-label="Close system settings" onClick={() => setShowEnrollmentModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>
                        
                        <div className="flex border-b border-slate-200 px-6 pt-2 bg-slate-50/50">
                            <button type="button" 
                                onClick={() => setSettingsTab('keys')} 
                                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${settingsTab === 'keys' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Enrollment Keys
                            </button>
                            <button type="button" 
                                onClick={() => setSettingsTab('limits')} 
                                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${settingsTab === 'limits' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Course Limits
                            </button>
                            <button type="button" 
                                onClick={() => setSettingsTab('global')} 
                                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${settingsTab === 'global' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                Global Updates
                            </button>
                        </div>

                        <div className="p-6">
                            {settingsTab === 'keys' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                                        <p className="font-bold mb-1"><Info size={12} className="inline mr-1" /> How this works:</p>
                                        <p>This list acts as a <strong>whitelist of valid IDs</strong>. Student profiles will only appear in the main list <strong>after</strong> the student successfully activates their account using one of these IDs.</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                                            <p className="block text-xs font-bold text-slate-700 mb-2">Option 1: Manual Entry</p>
                                            <form onSubmit={onGenerateKey} className="flex flex-col gap-2">
                                                <input required name="enrollmentId" aria-label="Student ID" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600" placeholder="Ex: 202612345" pattern="\d{9}" title="Student ID must be exactly 9 digits" />
                                                <select required name="enrollmentCourse" aria-label="Enrollment course" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                                    <option value="">Select Course</option>
                                                    {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                                <div className="flex gap-2">
                                                    <select required name="enrollmentYear" aria-label="Enrollment year" defaultValue="1st Year" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                                    </select>
                                                    <button type="submit" aria-label={isGeneratingKey ? 'Generating enrollment key' : 'Generate enrollment key'} disabled={isGeneratingKey} className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition shadow-md disabled:opacity-60">{isGeneratingKey ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}</button>
                                                </div>
                                            </form>
                                        </div>
                                        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                                            <div className="flex justify-between items-center mb-2">
                                                <p className="block text-xs font-bold text-slate-700">Option 2: Bulk Upload</p>
                                                <button type="button" onClick={handleDownloadTemplate} className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                                                    <Download size={12} /> Template
                                                </button>
                                            </div>
                                            <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition group cursor-pointer h-[122px] flex flex-col justify-center">
                                                <input type="file" aria-label="Upload enrollment keys file" accept=".csv,.txt,.xlsx,.xls" onChange={handleBulkUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                                <div className="group-hover:scale-110 transition-transform duration-200"><UploadCloud size={24} className="text-purple-600 mb-2 mx-auto" /></div>
                                                <p className="text-sm text-slate-700 font-medium">Upload CSV or Excel</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-4 bg-white">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                                            <h4 className="font-bold text-sm text-slate-700">Existing Keys ({totalEnrollmentKeysCount})</h4>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Search Student ID or Course..."
                                                    value={enrollmentSearchQuery}
                                                    onChange={e => setEnrollmentSearchQuery(e.target.value)}
                                                    className="px-3 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:border-purple-600 bg-white w-full sm:w-56"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <label htmlFor="enrollment-status-filter" className="text-xs text-slate-500 whitespace-nowrap">Filter Status:</label>
                                                    <select id="enrollment-status-filter" value={enrollmentStatusFilter} onChange={e => setEnrollmentStatusFilter(e.target.value)} className="w-full sm:w-32 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:border-purple-600 bg-white">
                                                        <option value="All">All</option><option value="Pending">Pending</option><option value="Activated">Activated</option><option value="Revoked">Revoked</option><option value="Archived">Archived</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                                            {enrollmentKeys.map(key => (
                                                <div key={key.student_id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm hover:shadow-sm transition-shadow">
                                                    <div>
                                                        <span className="font-mono font-bold text-slate-800">{key.student_id}</span>
                                                        <span className="block text-slate-500 truncate max-w-[200px] text-xs mt-0.5" title={key.course}>{key.course} &bull; {key.year_level || 'Year not set'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${String(key.status || '') === 'Archived' ? 'bg-slate-100 text-slate-700' : String(key.status || '') === 'Revoked' ? 'bg-red-100 text-red-700' : key.is_used ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {key.status || (key.is_used ? 'Activated' : 'Pending')}
                                                        </span>
                                                        {canArchiveRecords && String(key.status || '') !== 'Archived' && String(key.status || '') !== 'Revoked' && (
                                                            <AsyncButton onClick={() => handleDeleteKey(key.student_id)} className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors disabled:opacity-60" title="Revoke Key"><XCircle size={16} /></AsyncButton>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {enrollmentKeys.length === 0 && <p className="text-center text-slate-400 text-sm py-8">No keys found.</p>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'limits' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                                        <div className="mb-4">
                                            <h4 className="font-bold text-sm text-slate-800">Course &amp; Applicant Limits</h4>
                                            <p className="text-xs text-slate-500 mt-1">Add courses here and maintain per-course applicant and capacity limits, grouped by department.</p>
                                        </div>
                                        <form onSubmit={onAddCourse} className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-4">
                                            <input type="text" className="md:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white" placeholder="Course name" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} required />
                                            <input type="number" min={0} className="md:col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white" placeholder="Capacity" value={courseForm.capacity} onChange={e => setCourseForm({ ...courseForm, capacity: parseInt(e.target.value || '0', 10) })} required title="Enrolled Student Capacity Limit" />
                                            <input type="number" min={0} className="md:col-span-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white" placeholder="Applicants" value={courseForm.application_limit} onChange={e => setCourseForm({ ...courseForm, application_limit: parseInt(e.target.value || '0', 10) })} required title="NAT Application Limit" />
                                            <select aria-label="Course department" className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white" value={courseForm.department_id} onChange={e => setCourseForm({ ...courseForm, department_id: e.target.value })} required >
                                                <option value="" disabled>Select department</option>
                                                {allDepartments.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                            </select>
                                            <button type="submit" disabled={isAddingCourse} className="md:col-span-1 px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition disabled:opacity-60">{isAddingCourse ? 'Adding...' : 'Add'}</button>
                                        </form>
                                        <div className="mb-3">
                                            <label htmlFor="course-department-filter" className="block text-xs font-bold text-slate-700 mb-1">Filter Courses by Department</label>
                                            <select id="course-department-filter" value={courseDeptFilter} onChange={e => setCourseDeptFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                                <option value="All">All Departments</option>
                                                {departmentNames.map((deptName: string) => <option key={deptName} value={deptName}>{deptName}</option>)}
                                            </select>
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white max-h-[400px]">
                                            <table className="w-full text-left text-sm relative">
                                                <thead className="bg-slate-100 text-slate-600 uppercase text-xs sticky top-0 z-10">
                                                    <tr>
                                                        <th className="px-4 py-3">Course</th>
                                                        <th className="px-4 py-3">Department</th>
                                                        <th className="px-4 py-3 text-center">Applicants</th>
                                                        <th className="px-4 py-3 text-center">Capacity Limit</th>
                                                        <th className="px-4 py-3 text-center">Applicant Limit</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {courseRowsForManagement.length === 0 ? (
                                                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">No courses found.</td></tr>
                                                    ) : courseRowsForManagement.map((course: any) => {
                                                        const department = allDepartments.find((d: any) => d.id === course.department_id);
                                                        return (
                                                            <tr key={course.id} className="hover:bg-slate-50/50">
                                                                <td className="px-4 py-3 font-semibold text-slate-800">{course.name}</td>
                                                                <td className="px-4 py-3 text-slate-600 text-xs">{department?.name || 'Unassigned'}</td>
                                                                <td className="px-4 py-3 text-center font-mono text-blue-700">
                                                                    {courseApplicantCountsLoading ? '...' : (courseApplicantCounts[course.name] || 0)}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <input type="number" min={0} className="w-20 px-2 py-1.5 border border-slate-300 rounded text-center focus:outline-none focus:border-purple-600" defaultValue={course.capacity ?? 500} onBlur={e => handleUpdateCourseLimit(course.id, 'capacity', e.target.value)} title="Change Enrolled Capacity Limit" />
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <input type="number" min={0} className="w-20 px-2 py-1.5 border border-slate-300 rounded text-center focus:outline-none focus:border-purple-600" defaultValue={course.application_limit ?? 200} onBlur={e => handleUpdateCourseLimit(course.id, 'application_limit', e.target.value)} title="Change Applicant Limit" />
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsTab === 'global' && (
                                <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
                                    <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/40">
                                        <h4 className="font-bold text-base text-slate-800 mb-2">Global Course/Year Update Window</h4>
                                        <p className="text-sm text-slate-600 mb-6">Apply one start/end window to many students at once. When the end time passes, course/year values are auto-reset while Student IDs stay active. This applies to all students.</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label htmlFor="bulk-window-start" className="block text-xs font-semibold text-slate-500 mb-1">Start Time</label>
                                                <input id="bulk-window-start" type="datetime-local" value={bulkWindowForm.start} onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, start: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-600" />
                                            </div>
                                            <div>
                                                <label htmlFor="bulk-window-end" className="block text-xs font-semibold text-slate-500 mb-1">End Time</label>
                                                <input id="bulk-window-end" type="datetime-local" value={bulkWindowForm.end} onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, end: e.target.value }))} className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:border-purple-600" />
                                            </div>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between mb-6">
                                            <span className="text-sm text-slate-600">Target students based on current filters:</span>
                                            <span className="font-bold text-slate-800 text-lg px-3 py-1 bg-slate-100 rounded-md">{bulkTargetCount}</span>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button type="button" onClick={applyBulkCourseYearWindow} disabled={isApplyingBulkWindow} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition shadow-sm">
                                                {isApplyingBulkWindow ? 'Applying...' : 'Apply Window'}
                                            </button>
                                            <button type="button" onClick={clearBulkCourseYearWindow} disabled={isApplyingBulkWindow} className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-60 transition">
                                                Clear Window
                                            </button>
                                        </div>
                                    </div>
                                    <div className="border border-slate-200 rounded-xl p-6 bg-purple-50/30">
                                        <h4 className="font-bold text-base text-purple-900 mb-2">Sync Enrollment Keys</h4>
                                        <p className="text-sm text-purple-700/80 mb-4">Manually synchronize the enrollment keys whitelist with the currently imported student records.</p>
                                        <button type="button" onClick={syncEnrollmentKeysFromStudents} disabled={isSyncingBulkKeys} className="w-full px-4 py-2.5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60 transition shadow-sm">
                                            {isSyncingBulkKeys ? 'Syncing...' : 'Sync Keys (Optional)'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
    </>
    );
};

export default EnrollmentKeysModal;
