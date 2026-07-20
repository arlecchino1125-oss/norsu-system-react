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
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';
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

const IdSwapModal = ({
    handleSwapIds,
    isSwappingIds,
    setShowIdSwapModal,
    setSourceId,
    setSourceStudent,
    setTargetId,
    setTargetStudent,
    showIdSwapModal,
    sourceId,
    sourceLoading,
    sourceStudent,
    targetId,
    targetLoading,
    targetStudent
}: any) => (
    <>
            {showIdSwapModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[80] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 border border-slate-200/80">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                                Rename or Swap Student ID
                            </h3>
                            <button type="button" aria-label="Close student ID dialog" onClick={() => { setShowIdSwapModal(false); setSourceId(''); setTargetId(''); setSourceStudent(null); setTargetStudent(null); }} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={22} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">
                            This will safely update or swap student IDs. If the Target ID is occupied, their IDs will be swapped. All referencing tables and auth metadata will cascade and update.
                        </p>
                        <form onSubmit={handleSwapIds} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="source-student-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Source Student ID</label>
                                    <input
                                        id="source-student-id"
                                        required
                                        type="text"
                                        value={sourceId}
                                        onChange={(e) => setSourceId(e.target.value)}
                                        placeholder="e.g. 420133463"
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="target-student-id" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Student ID</label>
                                    <input
                                        id="target-student-id"
                                        required
                                        type="text"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        placeholder="e.g. 420133462"
                                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                                    />
                                </div>
                            </div>

                            {/* Review Preview Comparison */}
                            {(sourceId || targetId) && (
                                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        <span>Review Operation Preview</span>
                                        {sourceStudent && targetStudent ? (
                                            <span className="text-amber-600 font-semibold bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <RefreshCw size={10} className="animate-spin" /> Swap IDs
                                            </span>
                                        ) : sourceStudent && !targetStudent && targetId.trim() ? (
                                            <span className="text-blue-600 font-semibold bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-full">
                                                Rename ID
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Source Student Preview */}
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Source Student (From)</span>
                                            {sourceLoading ? (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                    Loading student details...
                                                </div>
                                            ) : sourceStudent ? (
                                                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30 flex items-start gap-3 min-h-[100px]">
                                                    {sourceStudent.profile_picture_url ? (
                                                        <ResolvedProfileImage
                                                            storedValue={sourceStudent.profile_picture_url}
                                                            studentId={sourceStudent.student_id}
                                                            alt="Profile"
                                                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                            <User size={20} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 truncate">
                                                            {[sourceStudent.first_name, sourceStudent.middle_name, sourceStudent.last_name, sourceStudent.suffix].filter(Boolean).join(' ')}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-blue-600 font-semibold mt-0.5">{sourceStudent.student_id}</p>
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{sourceStudent.course || 'No course assigned'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sourceStudent.year_level || 'No year level'}</p>
                                                        {sourceStudent.is_archived && (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : sourceId.trim() ? (
                                                <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/50 flex items-center justify-center text-center text-xs text-rose-600 min-h-[100px] border-dashed">
                                                    Student ID not found
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                    Enter a Source Student ID
                                                </div>
                                            )}
                                        </div>

                                        {/* Target Student Preview */}
                                        <div>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Target Student (To)</span>
                                            {targetLoading ? (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                    Loading student details...
                                                </div>
                                            ) : targetStudent ? (
                                                <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-start gap-3 min-h-[100px]">
                                                    {targetStudent.profile_picture_url ? (
                                                        <ResolvedProfileImage
                                                            storedValue={targetStudent.profile_picture_url}
                                                            studentId={targetStudent.student_id}
                                                            alt="Profile"
                                                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-700 font-bold shrink-0">
                                                            <User size={20} />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold text-slate-800 truncate">
                                                            {[targetStudent.first_name, targetStudent.middle_name, targetStudent.last_name, targetStudent.suffix].filter(Boolean).join(' ')}
                                                        </p>
                                                        <p className="text-[11px] font-mono text-amber-600 font-semibold mt-0.5">{targetStudent.student_id}</p>
                                                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{targetStudent.course || 'No course assigned'}</p>
                                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">{targetStudent.year_level || 'No year level'}</p>
                                                        {targetStudent.is_archived && (
                                                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded">
                                                                Archived
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : targetId.trim() ? (
                                                <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30 flex flex-col justify-center items-center text-center min-h-[100px] border-dashed">
                                                    <p className="text-xs font-bold text-emerald-700">ID is Vacant</p>
                                                    <p className="text-[10px] text-emerald-600/80 mt-1">This will rename the source student's ID.</p>
                                                </div>
                                            ) : (
                                                <div className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-center text-xs text-slate-400 min-h-[100px] border-dashed">
                                                    Enter a Target Student ID
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={isSwappingIds}
                                    onClick={() => { setShowIdSwapModal(false); setSourceId(''); setTargetId(''); setSourceStudent(null); setTargetStudent(null); }}
                                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSwappingIds || !sourceStudent}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-60"
                                >
                                    {isSwappingIds ? 'Updating...' : (sourceStudent && targetStudent ? 'Swap Student IDs' : (sourceStudent && !targetStudent && targetId.trim() ? 'Rename Student ID' : 'Update / Swap'))}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
    </>
);

export default IdSwapModal;
