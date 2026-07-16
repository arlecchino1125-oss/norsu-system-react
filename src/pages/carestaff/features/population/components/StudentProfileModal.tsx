import { useState, useEffect, useRef } from 'react';
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
import { Button } from '../../../../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../../components/ui/Card';
import { ResolvedProfileImage } from '../../../../../components/ResolvedProfileImage';
import { getProfileCategoryForDatabaseField } from '../../../../../services/r2DocumentService';
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

const StudentProfileModal = ({
    openEditModal,
    profileCategoryIndex,
    profileLoading,
    profileStudentAnnotations = [],
    profileViewStudent,
    setProfileCategoryIndex,
    setProfileViewStudent,
    setShowPhotoModal,
    showPhotoModal,
    showToast
}: any) => (
    <>
            {profileViewStudent && typeof document !== 'undefined' && createPortal(
                <>
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-2 sm:p-6">
                    <button type="button" aria-label="Close student profile" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" onClick={() => setProfileViewStudent(null)} />
                    <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <button type="button"
                                    onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-xl sm:text-2xl font-black text-white shrink-0 shadow-lg shadow-blue-200 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none' : 'cursor-default'}`}
                                >
                                    {profileViewStudent.profile_picture_url ? (
                                        <ResolvedProfileImage storedValue={profileViewStudent.profile_picture_url} studentId={profileViewStudent.student_id} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" previewOnClick={false} />
                                    ) : (
                                        <span>{profileViewStudent.first_name?.[0] || 'S'}</span>
                                    )}
                                </button>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">
                                        {profileViewStudent.last_name}, {profileViewStudent.first_name} {profileViewStudent.suffix || ''} {profileViewStudent.middle_name || ''}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500 font-mono truncate">{profileViewStudent.student_id} &bull; {profileViewStudent.course} &bull; {profileViewStudent.year_level}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button type="button" onClick={() => { openEditModal(profileViewStudent); setProfileViewStudent(null); }} className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-md">
                                    <Edit size={14} /> Edit
                                </button>
                                <button type="button" onClick={() => setProfileViewStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
                                    <XCircle size={22} />
                                </button>
                            </div>
                        </div>

                        {/* Body with sidebar + content */}
                        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                            {/* Category Sidebar — horizontal scroll on mobile, vertical sidebar on desktop */}
                            <div className="sm:w-56 bg-slate-50 border-b sm:border-b-0 sm:border-r border-slate-100 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto shrink-0 py-1 sm:py-2">
                                <div className="flex sm:flex-col gap-0.5 px-1 sm:px-0 min-w-max sm:min-w-0">
                                    {PROFILE_CATEGORIES.map((cat, i) => (
                                        <button type="button"
                                            key={cat.key}
                                            onClick={() => setProfileCategoryIndex(i)}
                                            className={`text-left px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm transition-all whitespace-nowrap sm:whitespace-normal rounded-lg sm:rounded-none sm:w-full ${profileCategoryIndex === i
                                                ? 'bg-white text-blue-700 font-bold sm:border-r-2 border-blue-600 shadow-sm'
                                                : 'text-slate-600 hover:bg-white/80 hover:text-slate-900'
                                                }`}
                                        >
                                            <span className="text-base sm:text-lg">{cat.icon}</span>
                                            <span className="truncate">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {profileLoading ? (
                                    <div className="flex items-center justify-center h-64 text-slate-400">Loading student data...</div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className={`p-2 rounded-lg bg-gradient-to-br ${PROFILE_CATEGORIES[profileCategoryIndex].gradient} text-white text-lg`}>
                                                {PROFILE_CATEGORIES[profileCategoryIndex].icon}
                                            </span>
                                            <h3 className="text-lg font-bold text-slate-900">{PROFILE_CATEGORIES[profileCategoryIndex].label}</h3>
                                        </div>
                                        {/* Profile picture — shown only inside Personal Information */}
                                        {profileStudentAnnotations.length > 0 && (
                                            <div className="mb-6 rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                                                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-purple-900">
                                                    <MessageSquareMore size={16} />
                                                    Department Notes & Risk Flags
                                                </div>
                                                <div className="space-y-3">
                                                    {profileStudentAnnotations.map((annotation: any) => (
                                                        <div key={annotation.id} className="rounded-lg border border-white/70 bg-white/80 p-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                                                                    {annotation.department}
                                                                </span>
                                                                {annotation.is_at_risk && (
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
                                                                        <Flag size={11} />
                                                                        At-Risk
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {annotation.note ? (
                                                                <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-700">{annotation.note}</p>
                                                            ) : (
                                                                <p className="mt-2 text-sm italic text-slate-400">No note provided.</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                            {PROFILE_CATEGORIES[profileCategoryIndex].fields.map((field: any, idx: number) => {
                                                let value = field.compute ? field.compute(profileViewStudent) : profileViewStudent[field.db];
                                                if (field.type === 'boolean') value = value ? 'Yes' : 'No';
                                                return (
                                                    <div key={(field.db || '') + field.label + idx} className="min-w-0">
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-0.5">{field.label}</p>
                                                        {field.type === 'profilePhoto' && value ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowPhotoModal(true)}
                                                                className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                                            >
                                                                View photo
                                                            </button>
                                                        ) : field.type === 'document' && value ? (
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    try {
                                                                        await openStoredAsset('support_documents', String(value), 300, {
                                                                            category: getProfileCategoryForDatabaseField(field.db),
                                                                            studentId: profileViewStudent.student_id
                                                                        });
                                                                    } catch (error: any) {
                                                                        showToast?.(error.message || 'Unable to open the selected file.', 'error');
                                                                    }
                                                                }}
                                                                className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                                            >
                                                                View file
                                                            </button>
                                                        ) : (
                                                            <p className="text-sm font-semibold text-slate-800 break-words" title={String(value || '')}>
                                                                {value || <span className="text-slate-300 italic font-normal">—</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer with navigation */}
                        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                            <button type="button"
                                onClick={() => setProfileCategoryIndex(i => Math.max(0, i - 1))}
                                disabled={profileCategoryIndex === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            <span className="text-xs text-slate-400 font-medium">
                                {profileCategoryIndex + 1} / {PROFILE_CATEGORIES.length} — {PROFILE_CATEGORIES[profileCategoryIndex].label}
                            </span>
                            <button type="button"
                                onClick={() => setProfileCategoryIndex(i => Math.min(PROFILE_CATEGORIES.length - 1, i + 1))}
                                disabled={profileCategoryIndex === PROFILE_CATEGORIES.length - 1}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Next <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Full Size Photo Modal */}
                <div
                    className={`fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 transition-all duration-300 ease-out ${showPhotoModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    inert={!showPhotoModal}
                >
                    <button type="button" aria-label="Close profile photo" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" onClick={() => setShowPhotoModal(false)} />
                    <div
                        className={`z-10 bg-white rounded-3xl shadow-2xl w-full max-w-sm sm:max-w-md overflow-hidden flex flex-col relative transition-all duration-300 ease-out delay-75 ${showPhotoModal ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
                    >
                        <button type="button"
                            onClick={() => setShowPhotoModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-10 border border-white/20"
                        >
                            <XCircle size={20} />
                        </button>

                        <div className="w-full aspect-square flex items-center justify-center bg-slate-100 flex-shrink-0">
                            {profileViewStudent.profile_picture_url ? (
                                <ResolvedProfileImage storedValue={profileViewStudent.profile_picture_url} studentId={profileViewStudent.student_id} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" previewOnClick={false} />
                            ) : (
                                <User size={80} className="text-slate-300" />
                            )}
                        </div>

                        <div className="p-6 text-center bg-white border-t border-slate-100">
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">
                                {[profileViewStudent.first_name, profileViewStudent.middle_name, profileViewStudent.last_name, profileViewStudent.suffix].filter(Boolean).join(' ')}
                            </h3>
                            <p className="font-mono text-base text-blue-600 font-bold mt-1.5">
                                {profileViewStudent.student_id}
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-slate-500 font-medium mt-1">
                                <span>{profileViewStudent.course}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                <span>{profileViewStudent.year_level}</span>
                            </div>
                        </div>
                    </div>
                </div>

                </>,
                document.body
            )}
    </>
);

export default StudentProfileModal;
