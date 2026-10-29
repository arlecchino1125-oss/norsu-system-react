import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Download, XCircle, Edit, Trash2, Plus, Key, Archive,
    PieChart, List, UploadCloud, Info, ArrowUpDown, Activity, TrendingUp,
    Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, RefreshCw, User, Settings, Flag, MessageSquareMore, X
} from 'lucide-react';
import { supabase } from '../../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { usePermissions } from '../../../../../hooks/usePermissions';
import { managedArchiveService } from '../../../../../services/managedArchiveService';
import { Button } from '../../../../../components/ui/Button';
import Modal from '../../../../../components/ui/Modal';
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
import { toTitleCase } from '../../../../../utils/formatters';


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
    isProfileIncompleteStep1,
    abbreviateCourseName
} from '../utils';

const MOBILE_CATEGORY_LABELS: Record<string, string> = {
    personal: 'Personal',
    family: 'Family',
    socioEconomic: 'Socio-Economic',
    guardian: 'Guardian',
    emergency: 'Emergency',
    education: 'Education',
    extracurricular: 'Extra-Curricular',
    scholarships: 'Scholarships',
};

const MOBILE_FIELD_LABELS: Record<string, string> = {
    'Permanent Address - Street/Sitio & Barangay': 'Street / Sitio & Barangay',
    'Permanent Address - Town/City Municipality': 'Town / City',
    'Permanent Address - Province': 'Province',
    'Permanent Address - Zip Code': 'Zip Code',
    'Permanent Address - Region': 'Region',
    'Sex Assigned at Birth': 'Sex at Birth',
    'Facebook Account Link': 'Facebook Link',
    "Spouse's Employer/Business Name": "Spouse's Employer",
    "Spouse's Employer/Business Address": "Spouse's Work Address",
    'Number of Children Your Parents Have': 'Parents Total Children',
    'Your Birth Order in the Family': 'Birth Order',
    'Person/Agency Who Supports Your Studies Financially Other Than Yourself': 'Financial Supporter / Agency',
    'Contact Information of the Person/Agency Who Supports Your Studies Financially Other Than Yourself': 'Supporter Contact Info',
    'Are You a Working Student': 'Working Student',
    'Are You a Person With Disability (PWD)': 'PWD Status',
    'Are You a Member of Any Indigenous Group & Cultural Communities': 'Indigenous Group Member',
    'Are You a Member of 4Ps': '4Ps Member',
    'Are You a Rebel Returnee': 'Rebel Returnee',
    'Are You a Son/Daughter of a Solo Parent': 'Child of Solo Parent',
    'Are You a Solo Parent Yourself': 'Solo Parent',
    'Are You an Orphan': 'Orphan',
    'Are You a Homeless Citizen': 'Homeless Citizen',
    'Are You a Senior Citizen': 'Senior Citizen',
    'Person to Contact (In Case of Emergency)': 'Emergency Contact',
    'Elementary Inclusive Years Attended': 'Elementary Years',
    'Junior High Inclusive Years Attended': 'Junior High Years',
    'Senior High Inclusive Years Attended': 'Senior High Years',
    'Transferee College Inclusive Years Attended': 'College Years',
    'TESDA NC II Acquired - Date Acquired - Validity': 'TESDA NC II & Validity',
    'Eligibility Acquired - Date Acquired': 'Eligibility & Date',
    'Do You Hold a Local/National Position in Public Service': 'Holds Public Service Position',
    'Have You Been Criminally Charged Before Any Court': 'Criminally Charged',
    'Have You Been Convicted of Any Crime': 'Convicted of a Crime',
};

const MOBILE_FULL_WIDTH_FIELDS = new Set([
    'street',
    'email',
    'facebook_url',
    'place_of_birth',
    'department',
    'course',
    'spouse_employer_name',
    'spouse_employer_address',
    'children_names_birthdates',
    'mother_address',
    'father_address',
    'supporter',
    'supporter_contact',
    'employer_name',
    'employer_address',
    'work_experiences',
    'guardian_address',
    'emergency_address',
    'elem_school',
    'junior_high_school',
    'senior_high_school',
    'college_school',
    'honors_awards',
    'tesda_nc2_acquired',
    'eligibility_acquired',
    'special_trainings_attended',
    'extracurricular_activities',
    'organizations_memberships',
    'sports_skills',
    'other_talents',
    'scholarships_availed',
]);

const getMobileCategoryLabel = (cat: { key: string; label: string }) =>
    MOBILE_CATEGORY_LABELS[cat.key] || cat.label;

const getMobileFieldLabel = (label: string) =>
    MOBILE_FIELD_LABELS[label] || label;

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
}: any) => {
    const mobileCategoryBarRef = useRef<HTMLDivElement | null>(null);
    const isDraggingTabsRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragScrollLeftRef = useRef(0);

    useEffect(() => {
        if (!profileViewStudent || !mobileCategoryBarRef.current) return;
        const container = mobileCategoryBarRef.current;
        const activeBtn = container.querySelector<HTMLButtonElement>(`[data-mobile-cat-index="${profileCategoryIndex}"]`);
        if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
            activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, [profileCategoryIndex, profileViewStudent]);

    return (
    <>
        {profileViewStudent && (
            <Modal
                open
                onClose={() => setProfileViewStudent(null)}
                anchorId="staff-content-region"
                size="full"
                title={toTitleCase(`${profileViewStudent.last_name}, ${profileViewStudent.first_name} ${profileViewStudent.suffix || ''} ${profileViewStudent.middle_name || ''}`)}
                subtitle={`${profileViewStudent.student_id} · ${profileViewStudent.course} · ${profileViewStudent.year_level}`}
                headerMeta={(
                    <div className="flex items-center gap-3">
                        <Button variant="primary" size="sm" leftIcon={<Edit size={14} />} onClick={() => { openEditModal(profileViewStudent); setProfileViewStudent(null); }}>
                            Edit
                        </Button>
                    </div>
                )}
                footer={(
                    <div className="flex w-full items-center justify-between">
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
                )}
                customMobileLayout={(
                    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
                        {/* Mobile Compact Student Header */}
                        <div className="flex items-start gap-2.5 border-b border-slate-100 bg-white px-3 py-2.5 shrink-0">
                            <button
                                type="button"
                                onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                aria-label="View student photo"
                                className={`w-11 h-11 rounded-xl overflow-hidden bg-gradient-to-br from-purple-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-xs ring-2 ring-purple-100 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer active:scale-95 transition-transform' : 'cursor-default'}`}
                            >
                                {profileViewStudent.profile_picture_url ? (
                                    <ResolvedProfileImage
                                        storedValue={profileViewStudent.profile_picture_url}
                                        studentId={profileViewStudent.student_id}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                        previewOnClick={false}
                                    />
                                ) : (
                                    <User size={18} className="text-white/90" />
                                )}
                            </button>

                            <div className="min-w-0 flex-1">
                                {/* Top row: Name extends across toward the X/Close button */}
                                <div className="flex items-start justify-between gap-1.5">
                                    <h2 className="min-w-0 flex-1 text-[13.5px] font-extrabold text-slate-900 leading-snug break-words">
                                        {toTitleCase(`${profileViewStudent.last_name}, ${profileViewStudent.first_name} ${profileViewStudent.suffix || ''} ${profileViewStudent.middle_name || ''}`)}
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={() => setProfileViewStudent(null)}
                                        aria-label="Close profile modal"
                                        className="-mr-1 -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Second row: Student ID / Course / Year on left, Photo & Edit buttons slightly below on right */}
                                <div className="mt-1 flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex flex-wrap items-center gap-1 text-[10.5px] font-semibold text-slate-500">
                                        <span className="font-mono font-bold text-slate-600">{profileViewStudent.student_id}</span>
                                        <span>·</span>
                                        <span className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[9.5px] font-bold text-purple-700 border border-purple-100/80 leading-none">
                                            {abbreviateCourseName(profileViewStudent.course)}
                                        </span>
                                        <span>·</span>
                                        <span className="text-[10px] font-bold uppercase text-slate-500">{profileViewStudent.year_level}</span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        {profileViewStudent.profile_picture_url && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPhotoModal(true)}
                                                className="inline-flex items-center rounded-lg border border-blue-200/80 bg-blue-50 px-2 py-1 text-[10.5px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                                            >
                                                Photo
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => { openEditModal(profileViewStudent); setProfileViewStudent(null); }}
                                            className="inline-flex items-center gap-1 rounded-lg bg-purple-600 hover:bg-purple-700 px-2.5 py-1 text-[10.5px] font-bold text-white shadow-2xs transition-colors"
                                        >
                                            <Edit size={11} />
                                            <span>Edit</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Horizontally Scrollable Category Pills */}
                        <div
                            ref={mobileCategoryBarRef}
                            onWheel={(e) => {
                                if (mobileCategoryBarRef.current && e.deltaY !== 0) {
                                    mobileCategoryBarRef.current.scrollLeft += e.deltaY;
                                }
                            }}
                            onMouseDown={(e) => {
                                if (!mobileCategoryBarRef.current) return;
                                isDraggingTabsRef.current = true;
                                dragStartXRef.current = e.pageX - mobileCategoryBarRef.current.offsetLeft;
                                dragScrollLeftRef.current = mobileCategoryBarRef.current.scrollLeft;
                            }}
                            onMouseLeave={() => {
                                isDraggingTabsRef.current = false;
                            }}
                            onMouseUp={() => {
                                isDraggingTabsRef.current = false;
                            }}
                            onMouseMove={(e) => {
                                if (!isDraggingTabsRef.current || !mobileCategoryBarRef.current) return;
                                e.preventDefault();
                                const x = e.pageX - mobileCategoryBarRef.current.offsetLeft;
                                const walk = (x - dragStartXRef.current) * 1.2;
                                mobileCategoryBarRef.current.scrollLeft = dragScrollLeftRef.current - walk;
                            }}
                            className="w-full max-w-full min-w-0 border-b border-slate-100 bg-slate-50/90 px-2 py-1.5 overflow-x-auto touch-pan-x overscroll-x-contain select-none shrink-0 [-webkit-overflow-scrolling:touch]"
                        >
                            <div className="flex items-center gap-1.5 w-max pr-2">
                                {PROFILE_CATEGORIES.map((cat, i) => {
                                    const isActive = profileCategoryIndex === i;
                                    return (
                                        <button
                                            type="button"
                                            key={cat.key}
                                            data-mobile-cat-index={i}
                                            onClick={() => setProfileCategoryIndex(i)}
                                            className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-all ${isActive
                                                ? 'bg-purple-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-600 border border-slate-200/70 hover:text-slate-900'
                                                }`}
                                        >
                                            <span className="text-xs leading-none">{cat.icon}</span>
                                            <span>{getMobileCategoryLabel(cat)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mobile Compact Scrollable Fields Content */}
                        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                            {profileLoading ? (
                                <div className="flex items-center justify-center h-48 text-xs font-medium text-slate-400">
                                    Loading student data...
                                </div>
                            ) : (
                                <>
                                    {/* Department Notes & Risk Flags */}
                                    {profileStudentAnnotations.length > 0 && (
                                        <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-2.5">
                                            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold text-purple-900">
                                                <MessageSquareMore size={13} />
                                                <span>Department Notes &amp; Risk Flags</span>
                                            </div>
                                            <div className="space-y-1.5">
                                                {profileStudentAnnotations.map((annotation: any) => (
                                                    <div key={annotation.id} className="rounded-lg border border-white/80 bg-white/90 px-2.5 py-1.5">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                                                {annotation.department}
                                                            </span>
                                                            {annotation.is_at_risk && (
                                                                <span className="inline-flex items-center gap-0.5 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                                                                    <Flag size={9} />
                                                                    At-Risk
                                                                </span>
                                                            )}
                                                        </div>
                                                        {annotation.note ? (
                                                            <p className="mt-1 whitespace-pre-wrap text-[11px] font-medium leading-snug text-slate-700">
                                                                {annotation.note}
                                                            </p>
                                                        ) : (
                                                            <p className="mt-1 text-[11px] italic text-slate-400">No note provided.</p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Active Category Subheader */}
                                    <div className="flex items-center justify-between px-0.5 pt-0.5">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs leading-none">{PROFILE_CATEGORIES[profileCategoryIndex].icon}</span>
                                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                                                {PROFILE_CATEGORIES[profileCategoryIndex].label}
                                            </h3>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400">
                                            Section {profileCategoryIndex + 1} of {PROFILE_CATEGORIES.length}
                                        </span>
                                    </div>

                                    {/* 2-Column Mobile Compact Info Grid */}
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {PROFILE_CATEGORIES[profileCategoryIndex].fields
                                            .filter((field: any) => field.type !== 'profilePhoto')
                                            .map((field: any, idx: number) => {
                                                let value = field.compute ? field.compute(profileViewStudent) : profileViewStudent[field.db];
                                                if (field.type === 'boolean') value = value ? 'Yes' : 'No';
                                                const stringVal = String(value ?? '').trim();
                                                const isFullWidth =
                                                    MOBILE_FULL_WIDTH_FIELDS.has(field.db) ||
                                                    (field.type !== 'document' && stringVal.length > 22);
                                                const labelText = getMobileFieldLabel(field.label);

                                                return (
                                                    <div
                                                        key={(field.db || '') + field.label + idx}
                                                        className={`min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 ${isFullWidth ? 'col-span-2' : 'col-span-1'}`}
                                                    >
                                                        <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 leading-tight">
                                                            {labelText}
                                                        </p>
                                                        {field.type === 'document' && value ? (
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
                                                                className="mt-1 inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10.5px] font-bold text-indigo-700 hover:bg-indigo-100"
                                                            >
                                                                View file
                                                            </button>
                                                        ) : (
                                                            <p
                                                                className={`mt-0.5 text-[11.5px] font-bold leading-snug break-words ${field.type === 'boolean' && value === 'Yes'
                                                                    ? 'text-emerald-700'
                                                                    : 'text-slate-800'
                                                                    }`}
                                                                title={stringVal}
                                                            >
                                                                {stringVal || <span className="text-slate-300 italic font-normal">—</span>}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Mobile Compact Footer Navigation */}
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setProfileCategoryIndex((i: number) => Math.max(0, i - 1))}
                                disabled={profileCategoryIndex === 0}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ChevronLeft size={14} />
                                <span>Back</span>
                            </button>

                            <span className="min-w-0 truncate text-[11px] font-extrabold text-slate-600">
                                {profileCategoryIndex + 1} / {PROFILE_CATEGORIES.length} · {getMobileCategoryLabel(PROFILE_CATEGORIES[profileCategoryIndex])}
                            </span>

                            <button
                                type="button"
                                onClick={() => setProfileCategoryIndex((i: number) => Math.min(PROFILE_CATEGORIES.length - 1, i + 1))}
                                disabled={profileCategoryIndex === PROFILE_CATEGORIES.length - 1}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <span>Next</span>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            >
                {/* Body with sidebar + content */}
                <div className="flex h-full flex-col sm:flex-row -mx-6 -my-5 overflow-hidden">
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
                                    {PROFILE_CATEGORIES[profileCategoryIndex].key === 'personal' ? (
                                        <button
                                            type="button"
                                            onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                            className={`w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg shadow-blue-200 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none' : 'cursor-default'}`}
                                        >
                                            {profileViewStudent.profile_picture_url ? (
                                                <ResolvedProfileImage storedValue={profileViewStudent.profile_picture_url} studentId={profileViewStudent.student_id} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" previewOnClick={false} />
                                            ) : (
                                                <User size={30} className="text-white/90" />
                                            )}
                                        </button>
                                    ) : (
                                        <span className={`p-2 rounded-lg bg-gradient-to-br ${PROFILE_CATEGORIES[profileCategoryIndex].gradient} text-white text-lg`}>
                                            {PROFILE_CATEGORIES[profileCategoryIndex].icon}
                                        </span>
                                    )}
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
            </Modal>
        )}
{/* Full Size Photo Modal - portaled to body so it always overlays */}
        {profileViewStudent && typeof document !== 'undefined' && createPortal((
            <div
                className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 transition-all duration-300 ease-out ${showPhotoModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                inert={!showPhotoModal}
            >
                <button type="button" aria-label="Close profile photo" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400" onClick={() => setShowPhotoModal(false)} />
                <div
                    className={`z-10 bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xs sm:max-w-md overflow-hidden flex flex-col relative transition-all duration-300 ease-out delay-75 ${showPhotoModal ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
                >
                    <button
                        type="button"
                        onClick={() => setShowPhotoModal(false)}
                        aria-label="Close photo preview"
                        className="absolute right-3 top-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
                    >
                        <X size={16} />
                    </button>
                    <div className="w-full aspect-square flex items-center justify-center bg-slate-100 flex-shrink-0">
                        {profileViewStudent.profile_picture_url ? (
                            <ResolvedProfileImage storedValue={profileViewStudent.profile_picture_url} studentId={profileViewStudent.student_id} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" previewOnClick={false} />
                        ) : (
                            <User size={80} className="text-slate-300" />
                        )}
                    </div>

                    <div className="p-4 sm:p-6 text-center bg-white border-t border-slate-100">
                        <h3 className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight">
                            {toTitleCase([profileViewStudent.first_name, profileViewStudent.middle_name, profileViewStudent.last_name, profileViewStudent.suffix].filter(Boolean).join(' '))}
                        </h3>
                        <p className="font-mono text-sm sm:text-base text-blue-600 font-bold mt-1 sm:mt-1.5">
                            {profileViewStudent.student_id}
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 font-medium mt-1">
                            <span>{profileViewStudent.course}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span>{profileViewStudent.year_level}</span>
                        </div>
                    </div>
                </div>
            </div>
        ), document.body)}
    </>
    );
};

export default StudentProfileModal;
