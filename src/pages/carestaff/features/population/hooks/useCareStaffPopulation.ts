import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
    buildStudentAnnotationMap,
    getCareAnnotationStudentIds,
    getDeptStudentAnnotations,
    type DeptStudentAnnotation
} from '../../../../../services/deptStudentAnnotationService';
import { getDepartmentNameFromCourseRecords } from '../../../../../utils/courseDepartment';
import { isR2Reference, openStoredAsset, resolveStoredAssetUrl, resolveStoredAssetUrlsBulk } from '../../../../../utils/storageAssets';
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

const POPULATION_SORT_COLUMN_MAP: Record<string, string> = {
    name: 'last_name',
    student_id: 'student_id',
    course: 'course',
    status: 'status',
    created_at: 'created_at'
};

const updateStudentsByIds = async (targetIds: Array<string | number>, payload: any) => {
    const batches = Array.from(
        { length: Math.ceil(targetIds.length / 500) },
        (_, index) => targetIds.slice(index * 500, (index + 1) * 500)
    );
    const updatedCounts = await Promise.all(batches.map(async (batchIds) => {
        const { data, error } = await supabase
            .from('students')
            .update(payload)
            .in('id', batchIds.map(Number))
            .select('id');
        if (error) throw error;
        return data?.length || 0;
    }));
    return updatedCounts.reduce((total, count) => total + count, 0);
};

const handleDownloadTemplate = () => {
    const csvContent = "Student ID,Course,Year Level\n2026-1001,BS Information Technology,1st Year\n2026-1002,BS Civil Engineering,2nd Year\n2026-1003,BS Nursing,1st Year";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "student_ids_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
};

export function useCareStaffPopulation({
    functions,
    pendingProfileId,
    onProfileOpened,
    refreshSignal = 0
}: {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    pendingProfileId?: string | null;
    onProfileOpened?: () => void;
    refreshSignal?: number;
}) {
    const { showToast } = functions || {};
    const { canPerformAction } = usePermissions();
    const queryClient = useQueryClient();
    const canArchiveRecords = canPerformAction('archive_records');
    const canRestoreRecords = canPerformAction('restore_records');

    const [populationOverview, setPopulationOverview] = useState<CareStudentPopulationOverview>(EMPTY_POPULATION_OVERVIEW);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [allCourses, setAllCourses] = useState<any[]>([]);
    const [allDepartments, setAllDepartments] = useState<any[]>([]);
    const [lookupsLoading, setLookupsLoading] = useState(true);
    const [archivedStudentsList, setArchivedStudentsList] = useState<any[]>([]);
    const [archivedStudentsLoading, setArchivedStudentsLoading] = useState(false);
    const [archivedStudentsLoaded, setArchivedStudentsLoaded] = useState(false);
    const [historicalStudents, setHistoricalStudents] = useState<any[]>([]);
    const [historicalStudentsLoading, setHistoricalStudentsLoading] = useState(false);
    const [availableSections, setAvailableSections] = useState<string[]>([]);
    const [courseYearCounts, setCourseYearCounts] = useState<CareStudentCourseYearCount[]>([]);
    const [courseYearCountsLoading, setCourseYearCountsLoading] = useState(false);
    const [courseYearCountsLoaded, setCourseYearCountsLoaded] = useState(false);
    const [courseApplicantCounts, setCourseApplicantCounts] = useState<Record<string, number>>({});
    const [courseApplicantCountsLoading, setCourseApplicantCountsLoading] = useState(false);
    const [courseApplicantCountsLoaded, setCourseApplicantCountsLoaded] = useState(false);
    const refreshInFlightRef = useRef(false);

    // Modals
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [showArchivedStudentsModal, setShowArchivedStudentsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<any>(null);
    const [archivedSearchTerm, setArchivedSearchTerm] = useState('');
    const [restoringStudentId, setRestoringStudentId] = useState<string | number | null>(null);

    const openEditModal = async (student: any) => {
        let fullStudent = student;
        if (student?.student_id) {
            try {
                fullStudent = await getStudentByStudentId(student.student_id) || student;
            } catch (error) {
                if (showToast) showToast("Couldn't load complete student details for editing.", 'error');
            }
        }
        setEditForm({
            ...fullStudent,
            course_year_update_required: Boolean(fullStudent.course_year_update_required),
            course_year_window_start: toDateTimeLocal(fullStudent.course_year_window_start),
            course_year_window_end: toDateTimeLocal(fullStudent.course_year_window_end),
        });
        setShowEditModal(true);
    };

    const handleUpdateStudent = async (e: any) => {
        e.preventDefault();
        const requiresUpdate = Boolean(editForm.course_year_update_required);
        const windowStart = editForm.course_year_window_start ? new Date(editForm.course_year_window_start) : null;
        const windowEnd = editForm.course_year_window_end ? new Date(editForm.course_year_window_end) : null;

        if (requiresUpdate) {
            if (!windowStart || !windowEnd || Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
                if (showToast) showToast('Set both start and end for required course/year update window.', 'error');
                return;
            }
            if (windowStart >= windowEnd) {
                if (showToast) showToast('Update window end must be later than start.', 'error');
                return;
            }
        }

        try {
            const nextDepartment = getDepartmentNameFromCourseRecords(
                editForm.course || '',
                allCourses || [],
                allDepartments || [],
                editForm.department || 'Unassigned'
            );
            const { error } = await supabase.from('students').update({
                first_name: editForm.first_name, last_name: editForm.last_name, middle_name: editForm.middle_name,
                suffix: editForm.suffix, dob: editForm.dob, place_of_birth: editForm.place_of_birth,
                sex: editForm.sex, gender_identity: editForm.gender_identity, civil_status: editForm.civil_status,
                nationality: editForm.nationality, street: editForm.street, city: editForm.city, province: editForm.province,
                zip_code: editForm.zip_code, mobile: editForm.mobile, email: editForm.email, facebook_url: editForm.facebook_url,
                course: editForm.course, year_level: editForm.year_level, department: nextDepartment, status: requiresUpdate ? 'Inactive' : (editForm.status || 'Active'),
                course_year_update_required: requiresUpdate,
                course_year_window_start: requiresUpdate && windowStart ? windowStart.toISOString() : null,
                course_year_window_end: requiresUpdate && windowEnd ? windowEnd.toISOString() : null,
                course_year_confirmed_at: requiresUpdate ? null : editForm.course_year_confirmed_at || null,
            }).eq('id', editForm.id);

            if (error) throw error;

            const { error: enrollmentSyncError } = await supabase
                .from('enrolled_students')
                .update({
                    course: editForm.course,
                    year_level: editForm.year_level
                })
                .eq('student_id', editForm.student_id);
            if (enrollmentSyncError) {
                console.warn('Failed to sync enrollment record after student edit.', enrollmentSyncError);
            }

            if (showToast) showToast("Student updated.");
            setShowEditModal(false);
            void refreshPopulationAfterStudentMutation();
        } catch (error: any) {
            if (showToast) showToast("Error updating student: ", 'error');
        }
    };

    const confirmDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            await managedArchiveService.archiveStudent(
                Number(studentToDelete.id),
                String(studentToDelete.student_id || ''),
                'Archived from the CARE Staff student population page.',
                null
            );
            if (showToast) showToast("Student archived and linked key marked inactive.");
            setShowDeleteModal(false);
            setStudentToDelete(null);
            void refreshPopulationAfterStudentMutation();
            if (archivedStudentsLoaded) {
                queryClient.invalidateQueries({ queryKey: ['care_staff_population_archived'] });
            }
            if (showEnrollmentModal) {
                fetchEnrollmentKeys();
            }
        } catch (error: any) {
            if (showToast) showToast("Error archiving student: ", 'error');
        }
    };

    const handleRestoreStudent = async (student: any) => {
        if (!student?.id || !canRestoreRecords) return;
        if (!window.confirm(`Unarchive and restore ${student.first_name} ${student.last_name} to the active roster?`)) return;

        setRestoringStudentId(student.id);
        try {
            await managedArchiveService.restoreStudent(
                Number(student.id),
                String(student.student_id || '').trim()
            );
            if (showToast) showToast('Student unarchived and restored to the active roster.');
            void refreshPopulationAfterStudentMutation();
            queryClient.invalidateQueries({ queryKey: ['care_staff_population_archived'] });
            if (showEnrollmentModal) {
                fetchEnrollmentKeys();
            }
        } catch (error: any) {
            if (showToast) showToast("Couldn't restore student. ", 'error');
        } finally {
            setRestoringStudentId(null);
        }
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('All');
    const [enrollmentSearchQuery, setEnrollmentSearchQuery] = useState('');
    const [totalEnrollmentKeysCount, setTotalEnrollmentKeysCount] = useState(0);
    const [courseFilter, setCourseFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseDeptFilter, setCourseDeptFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [schoolYearFilter, setSchoolYearFilter] = useState('All');
    const [sectionFilter, setSectionFilter] = useState('All');
    const [hasNoteFilter, setHasNoteFilter] = useState(false);
    const [atRiskFilter, setAtRiskFilter] = useState(false);
    const [filtersExpanded, setFiltersExpanded] = useState(false);

    const activeFilterCount = [departmentFilter, courseFilter, yearFilter, statusFilter, schoolYearFilter, sectionFilter]
        .filter(v => v !== 'All').length + (searchTerm ? 1 : 0) + (hasNoteFilter ? 1 : 0) + (atRiskFilter ? 1 : 0);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'stats'
    const itemsPerPage = CARE_STUDENT_PAGE_SIZE;
    const [tableStudents, setTableStudents] = useState<any[]>([]);
    const [tableStudentsTotal, setTableStudentsTotal] = useState(0);
    const [tableLoading, setTableLoading] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [tableRefreshTick, setTableRefreshTick] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [enrollmentKeys, setEnrollmentKeys] = useState<any[]>([]);
    const [courseForm, setCourseForm] = useState({ name: '', capacity: 500, application_limit: 200, department_id: '' });
    const [bulkWindowForm, setBulkWindowForm] = useState<any>({
        start: '',
        end: ''
    });
    const [isApplyingBulkWindow, setIsApplyingBulkWindow] = useState(false);
    const [isSyncingBulkKeys, setIsSyncingBulkKeys] = useState(false);
    const [settingsTab, setSettingsTab] = useState<'keys' | 'limits' | 'global'>('keys');
    const [showIdSwapModal, setShowIdSwapModal] = useState<boolean>(false);
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [isSwappingIds, setIsSwappingIds] = useState<boolean>(false);
    const [sourceStudent, setSourceStudent] = useState<any | null>(null);
    const [targetStudent, setTargetStudent] = useState<any | null>(null);
    const [sourceLoading, setSourceLoading] = useState<boolean>(false);
    const [targetLoading, setTargetLoading] = useState<boolean>(false);
    const studentTableRequestIdRef = useRef(0);
    const lastExternalRefreshSignalRef = useRef(refreshSignal);

    useEffect(() => {
        if (!showIdSwapModal) {
            setSourceStudent(null);
            setTargetStudent(null);
            setSourceLoading(false);
            setTargetLoading(false);
            return;
        }

        const fetchSource = async () => {
            const trimmed = sourceId.trim();
            if (!trimmed) {
                setSourceStudent(null);
                return;
            }
            setSourceLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setSourceStudent(data);
            } catch (err) {
                console.error(err);
                setSourceStudent(null);
            } finally {
                setSourceLoading(false);
            }
        };

        const timer = setTimeout(fetchSource, 250);
        return () => clearTimeout(timer);
    }, [sourceId, showIdSwapModal]);

    useEffect(() => {
        if (!showIdSwapModal) {
            setSourceStudent(null);
            setTargetStudent(null);
            setSourceLoading(false);
            setTargetLoading(false);
            return;
        }

        const fetchTarget = async () => {
            const trimmed = targetId.trim();
            if (!trimmed) {
                setTargetStudent(null);
                return;
            }
            setTargetLoading(true);
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('student_id, first_name, middle_name, last_name, suffix, course, year_level, profile_picture_url, is_archived')
                    .eq('student_id', trimmed)
                    .maybeSingle();
                if (error) throw error;
                setTargetStudent(data);
            } catch (err) {
                console.error(err);
                setTargetStudent(null);
            } finally {
                setTargetLoading(false);
            }
        };

        const timer = setTimeout(fetchTarget, 250);
        return () => clearTimeout(timer);
    }, [targetId, showIdSwapModal]);
    // Profile view modal state
    const [profileViewStudent, setProfileViewStudent] = useState<any>(null);
    const [profileCategoryIndex, setProfileCategoryIndex] = useState(0);
    const [profileLoading, setProfileLoading] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const archiveRpcStateRef = useRef<'unknown' | 'available' | 'missing'>(
        sessionStorage.getItem(ARCHIVE_RPC_MISSING_CACHE_KEY) === '1' ? 'missing' : 'unknown'
    );

    // Population Overview Query
    const { data: qOverview, isLoading: qOverviewLoading } = useQuery({
        queryKey: ['care_staff_population_overview'],
        queryFn: getCareStudentPopulationOverview
    });

    useEffect(() => {
        if (qOverview) {
            setPopulationOverview(qOverview);
        }
        setOverviewLoading(qOverviewLoading);
    }, [qOverview, qOverviewLoading]);

    // Lookup Data Query
    const { data: qLookupData, isLoading: qLookupLoading } = useQuery({
        queryKey: ['care_staff_population_lookup_data'],
        queryFn: async () => {
            const [courses, departments] = await Promise.all([
                getCoursesWithDepartments(),
                getDepartments()
            ]);
            return { courses: courses || [], departments: departments || [] };
        }
    });

    useEffect(() => {
        if (qLookupData) {
            setAllCourses(qLookupData.courses);
            setAllDepartments(qLookupData.departments);
        }
        setLookupsLoading(qLookupLoading);
    }, [qLookupData, qLookupLoading]);

    // Sections Caching Query (Phase 4)
    const { data: qSections } = useQuery({
        queryKey: ['care_staff_population_sections', courseFilter, yearFilter],
        queryFn: () => getCareStudentSections({ course: courseFilter, yearLevel: yearFilter }),
        enabled: schoolYearFilter === 'All'
    });

    // Archived Students Query
    const { data: qArchivedStudents, isLoading: qArchivedStudentsLoading } = useQuery({
        queryKey: ['care_staff_population_archived'],
        queryFn: getArchivedCareStudents,
        enabled: showArchivedStudentsModal || archivedStudentsLoaded
    });

    useEffect(() => {
        if (qArchivedStudents) {
            setArchivedStudentsList(qArchivedStudents);
            setArchivedStudentsLoaded(true);
        }
        setArchivedStudentsLoading(qArchivedStudentsLoading);
    }, [qArchivedStudents, qArchivedStudentsLoading]);

    // Historical Students Query
    const { data: qHistoricalStudents, isLoading: qHistoricalStudentsLoading } = useQuery({
        queryKey: ['care_staff_population_historical'],
        queryFn: getActiveStudentsForLocalFiltering,
        enabled: schoolYearFilter !== 'All'
    });

    useEffect(() => {
        if (schoolYearFilter === 'All') {
            setHistoricalStudents([]);
            setHistoricalStudentsLoading(false);
            return;
        }
        if (qHistoricalStudents) {
            setHistoricalStudents(qHistoricalStudents);
        }
        setHistoricalStudentsLoading(qHistoricalStudentsLoading);
    }, [qHistoricalStudents, qHistoricalStudentsLoading, schoolYearFilter]);

    // Course Year Counts Query (Stats)
    const { data: qCourseYearCounts, isLoading: qCourseYearCountsLoading } = useQuery({
        queryKey: ['care_staff_population_course_year_counts'],
        queryFn: getCareStudentCourseYearCounts,
        enabled: viewMode === 'stats' || courseYearCountsLoaded
    });

    useEffect(() => {
        if (qCourseYearCounts) {
            setCourseYearCounts(qCourseYearCounts);
            setCourseYearCountsLoaded(true);
        }
        setCourseYearCountsLoading(qCourseYearCountsLoading);
    }, [qCourseYearCounts, qCourseYearCountsLoading]);

    // Course Applicant Counts Query (Limits)
    const { data: qCourseApplicantCounts, isLoading: qCourseApplicantCountsLoading } = useQuery({
        queryKey: ['care_staff_population_course_applicant_counts'],
        queryFn: getNatApplicationCourseCounts,
        enabled: (showEnrollmentModal && settingsTab === 'limits') || courseApplicantCountsLoaded
    });

    useEffect(() => {
        if (qCourseApplicantCounts) {
            const counts = (qCourseApplicantCounts || []).reduce((acc: Record<string, number>, app: any) => {
                if (app.priority_course) {
                    acc[app.priority_course] = (acc[app.priority_course] || 0) + 1;
                }
                return acc;
            }, {});
            setCourseApplicantCounts(counts);
            setCourseApplicantCountsLoaded(true);
        }
        setCourseApplicantCountsLoading(qCourseApplicantCountsLoading);
    }, [qCourseApplicantCounts, qCourseApplicantCountsLoading]);

    const refreshPopulationAfterStudentMutation = useCallback(async () => {
        setTableRefreshTick((current) => current + 1);
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['care_staff_population_overview'] }),
            queryClient.invalidateQueries({ queryKey: ['care_staff_population_paged_students'] }),
            schoolYearFilter !== 'All' ? queryClient.invalidateQueries({ queryKey: ['care_staff_population_historical'] }) : Promise.resolve()
        ]);
    }, [queryClient, schoolYearFilter]);

    // Obsolete useEffect mounts deleted (handled by useQuery configuration automatically)

    const openProfileModal = useCallback(async (student: any) => {
        setProfileLoading(true);
        setProfileCategoryIndex(0);
        try {
            const data = await getStudentByStudentId(student.student_id || student);
            if (!data) throw new Error('Student not found');
            setProfileViewStudent(data);
        } catch (err: any) {
            // Fallback to the student object we already have (if it's an object)
            if (typeof student === 'object') setProfileViewStudent(student);
        }
        setProfileLoading(false);
    }, []);
    /* Lifted to Parent
    const fetchStudents = async () => { ... };
    const fetchCourses = async () => { ... };
    useEffect(() => { fetchStudents(); fetchCourses(); ... }, []);
    */

    const fetchEnrollmentKeys = useCallback(async () => {
        try {
            let query = supabase
                .from('enrolled_students')
                .select('student_id, course, year_level, is_used, status, assigned_to_email, created_at', { count: 'exact' });

            if (enrollmentStatusFilter !== 'All') {
                query = query.eq('status', enrollmentStatusFilter);
            }

            if (enrollmentSearchQuery.trim()) {
                const search = `%${enrollmentSearchQuery.trim()}%`;
                query = query.or(`student_id.ilike.${search},course.ilike.${search}`);
            }

            const { data, count, error } = await query
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;
            setEnrollmentKeys(data || []);
            setTotalEnrollmentKeysCount(count || 0);
        } catch (error) {
            console.error('Error fetching enrollment keys:', error);
            showToast?.("Couldn't load enrollment keys.", 'error');
        }
    }, [enrollmentSearchQuery, enrollmentStatusFilter, showToast]);

    const cleanupExpiredCourseYearWindows = useCallback(async (silent = true) => {
        try {
            if (archiveRpcStateRef.current !== 'missing') {
                const { data, error } = await supabase.rpc('archive_and_reset_expired_course_year');
                if (error) {
                    const errorText = String(error.message || '').toLowerCase();
                    const rpcMissing = errorText.includes('archive_and_reset_expired_course_year');
                    if (!rpcMissing) throw error;
                    archiveRpcStateRef.current = 'missing';
                    sessionStorage.setItem(ARCHIVE_RPC_MISSING_CACHE_KEY, '1');
                } else {
                    archiveRpcStateRef.current = 'available';
                    sessionStorage.removeItem(ARCHIVE_RPC_MISSING_CACHE_KEY);

                    const cleanedCount = Number(data || 0);
                    if (cleanedCount > 0) {
                        if (!silent) {
                            showToast?.(`School-year windows were updated for ${cleanedCount} students.`, 'info');
                        }
                        void refreshPopulationAfterStudentMutation();
                    }
                    return;
                }
            }

            // Fallback for environments where migration is not yet applied.
            const nowIso = new Date().toISOString();
            const { data: fallbackData, error: fallbackError } = await supabase
                .from('students')
                .update({
                    course: null,
                    year_level: null,
                    status: 'Inactive',
                    course_year_confirmed_at: null,
                    course_year_update_required: false,
                    course_year_window_start: null,
                    course_year_window_end: null
                })
                .lt('course_year_window_end', nowIso)
                .select('id');
            if (fallbackError) throw fallbackError;

            const fallbackCount = fallbackData?.length || 0;
            if (fallbackCount > 0) {
                if (!silent) {
                    showToast?.(`Expired windows processed for ${fallbackCount} students.`, 'info');
                }
                void refreshPopulationAfterStudentMutation();
            }
        } catch (error: any) {
            console.error('Error cleaning expired course/year windows:', error);
            if (!silent) {
                showToast?.("Couldn't update windows. ", 'error');
            }
        }
    }, [refreshPopulationAfterStudentMutation, showToast]);

    const handleRefreshData = useCallback(async () => {
        if (refreshInFlightRef.current) return;
        refreshInFlightRef.current = true;
        const refreshStartedAt = Date.now();
        setIsRefreshingData(true);
        try {
            const refreshJobs = [
                queryClient.refetchQueries({ queryKey: ['care_staff_population_overview'] }),
                queryClient.refetchQueries({ queryKey: ['care_staff_population_lookup_data'] }),
                cleanupExpiredCourseYearWindows(true)
            ];
            if (schoolYearFilter !== 'All') {
                refreshJobs.push(queryClient.refetchQueries({ queryKey: ['care_staff_population_historical'] }));
            }
            if (showArchivedStudentsModal || archivedStudentsLoaded) {
                refreshJobs.push(queryClient.refetchQueries({ queryKey: ['care_staff_population_archived'] }));
            }
            if (courseYearCountsLoaded) {
                refreshJobs.push(queryClient.refetchQueries({ queryKey: ['care_staff_population_course_year_counts'] }));
            }
            if (courseApplicantCountsLoaded) {
                refreshJobs.push(queryClient.refetchQueries({ queryKey: ['care_staff_population_course_applicant_counts'] }));
            }
            if (showEnrollmentModal) {
                refreshJobs.push(fetchEnrollmentKeys());
            }
            if (schoolYearFilter === 'All') {
                refreshJobs.push(queryClient.refetchQueries({ queryKey: ['care_staff_population_paged_students'] }));
            }
            await Promise.all(refreshJobs);
            setTableRefreshTick((current) => current + 1);
            showToast?.('Student data refreshed.', 'success');
        } finally {
            const remainingAnimationMs = CARE_STUDENT_REFRESH_MIN_MS - (Date.now() - refreshStartedAt);
            if (remainingAnimationMs > 0) {
                await waitForCareStudentRefreshAnimation(remainingAnimationMs);
            }
            refreshInFlightRef.current = false;
            setIsRefreshingData(false);
        }
    }, [
        archivedStudentsLoaded,
        cleanupExpiredCourseYearWindows,
        courseApplicantCountsLoaded,
        courseYearCountsLoaded,
        fetchEnrollmentKeys,
        queryClient,
        schoolYearFilter,
        showArchivedStudentsModal,
        showEnrollmentModal,
        showToast
    ]);

    useEffect(() => {
        if (refreshSignal === lastExternalRefreshSignalRef.current) return;
        lastExternalRefreshSignalRef.current = refreshSignal;
        void handleRefreshData();
    }, [handleRefreshData, refreshSignal]);

    // Handle pending profile view from other pages
    useEffect(() => {
        if (pendingProfileId) {
            openProfileModal(pendingProfileId);
            onProfileOpened?.();
        }
    }, [onProfileOpened, openProfileModal, pendingProfileId]);

    useEffect(() => {
        if (showEnrollmentModal) {
            cleanupExpiredCourseYearWindows(false);
        }
    }, [cleanupExpiredCourseYearWindows, showEnrollmentModal]);

    useEffect(() => {
        if (showEnrollmentModal) {
            fetchEnrollmentKeys();
        }
    }, [fetchEnrollmentKeys, showEnrollmentModal]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearchTerm(searchTerm);
        }, CARE_STUDENT_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [departmentFilter, courseFilter, yearFilter, statusFilter, sectionFilter, schoolYearFilter, hasNoteFilter, atRiskFilter]);

    const annotationFilterActive = hasNoteFilter || atRiskFilter;
    const {
        data: qAnnotationStudentIds = [],
        isLoading: qAnnotationStudentIdsLoading,
        error: qAnnotationStudentIdsError
    } = useQuery({
        queryKey: ['care_staff_population_annotation_student_ids', hasNoteFilter, atRiskFilter, tableRefreshTick],
        queryFn: () => getCareAnnotationStudentIds({ hasNote: hasNoteFilter, atRisk: atRiskFilter }),
        enabled: annotationFilterActive
    });
    const annotationStudentIds = annotationFilterActive ? qAnnotationStudentIds : undefined;
    const annotationStudentIdsKey = annotationFilterActive ? qAnnotationStudentIds.join(',') : 'all';

    useEffect(() => {
        if (qAnnotationStudentIdsError) {
            showToast?.('Unable to load department notes and flags.', 'error');
        }
    }, [qAnnotationStudentIdsError, showToast]);

    const { data: qStudentsData, isLoading: qStudentsLoading } = useQuery({
        queryKey: [
            'care_staff_population_paged_students',
            debouncedSearchTerm,
            departmentFilter,
            courseFilter,
            yearFilter,
            statusFilter,
            sectionFilter,
            currentPage,
            sortConfig.key,
            sortConfig.direction,
            annotationStudentIdsKey,
            tableRefreshTick
        ],
        queryFn: () => getStudentsPage(
            {
                search: debouncedSearchTerm,
                department: departmentFilter,
                course: courseFilter,
                yearLevel: yearFilter,
                status: statusFilter,
                section: sectionFilter,
                annotationStudentIds
            },
            { page: currentPage, pageSize: itemsPerPage },
            {
                column: POPULATION_SORT_COLUMN_MAP[sortConfig.key] || 'created_at',
                ascending: sortConfig.direction === 'asc'
            }
        ),
        enabled: schoolYearFilter === 'All' && (!annotationFilterActive || !qAnnotationStudentIdsLoading)
    });

    useEffect(() => {
        if (schoolYearFilter === 'All' && qStudentsData) {
            setTableStudents(qStudentsData.rows || []);
            setTableStudentsTotal(qStudentsData.total || 0);
        }
        if (schoolYearFilter === 'All') {
            setTableLoading(qStudentsLoading);
        }
    }, [qStudentsData, qStudentsLoading, schoolYearFilter]);

    /* handlers lifted */

    const handleDeleteKey = async (studentId) => {
        if (!window.confirm(`Revoke the enrollment key for ${studentId}?`)) return;
        try {
            await managedArchiveService.revokeEnrollmentKey(String(studentId || '').trim());
            functions.showToast("Enrollment key revoked.");
            fetchEnrollmentKeys();
        } catch (err) {
            functions.showToast(err.message, 'error');
        }
    };

    const handleGenerateKey = async (e) => {
        e.preventDefault();
        const id = e.target.enrollmentId.value;
        const course = e.target.enrollmentCourse.value;
        const year = e.target.enrollmentYear.value;
        try {
            const { error } = await supabase
                .from('enrolled_students')
                .upsert([{
                    student_id: id,
                    course: course,
                    year_level: year,
                    is_used: false
                }], { onConflict: 'student_id' });

            if (error) throw error;
            functions.showToast(`Enrollment Key Added/Updated: ${id} (${course})`);
            e.target.reset();
            fetchEnrollmentKeys();
        } catch (error) {
            functions.showToast('Something went wrong.', 'error');
        }
    };

    const getCurrentStudentFilters = (search = debouncedSearchTerm) => ({
        search,
        department: departmentFilter,
        course: courseFilter,
        yearLevel: yearFilter,
        status: statusFilter,
        section: sectionFilter,
        annotationStudentIds
    });

    const getBulkTargetStudents = async () => {
        if (schoolYearFilter !== 'All') {
            return filteredStudents;
        }
        return getCareStudentBulkTargets(getCurrentStudentFilters(searchTerm));
    };

    const applyBulkCourseYearWindow = async () => {
        const start = bulkWindowForm.start ? new Date(bulkWindowForm.start) : null;
        const end = bulkWindowForm.end ? new Date(bulkWindowForm.end) : null;
        if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            functions.showToast('Please set both start and end date-time.', 'error');
            return;
        }
        if (start >= end) {
            functions.showToast('End date-time must be later than start date-time.', 'error');
            return;
        }

        const targets = await getBulkTargetStudents();
        if (targets.length === 0) {
            functions.showToast('No students match the selected filter.', 'info');
            return;
        }
        const targetIds = targets.flatMap((student: any) => student.id ? [student.id] : []);
        if (targetIds.length === 0) {
            functions.showToast('No valid student IDs found for the selected filter.', 'error');
            return;
        }
        if (!window.confirm(`Apply course/year update window to ${targets.length} students?`)) return;

        setIsApplyingBulkWindow(true);
        try {
            const updatedCount = await updateStudentsByIds(targetIds, {
                course_year_update_required: true,
                course_year_window_start: start.toISOString(),
                course_year_window_end: end.toISOString(),
                course_year_confirmed_at: null,
                course_year_profile_edited: false,
                status: 'Inactive'
            });
            functions.showToast(`Update applied to ${updatedCount || targets.length} students.`);
            await refreshPopulationAfterStudentMutation();
        } catch (error: any) {
            functions.showToast("Couldn't apply window. ", 'error');
        } finally {
            setIsApplyingBulkWindow(false);
        }
    };

    const clearBulkCourseYearWindow = async () => {
        const targets = await getBulkTargetStudents();
        if (targets.length === 0) {
            functions.showToast('No students match the selected filter.', 'info');
            return;
        }
        const targetIds = targets.flatMap((student: any) => student.id ? [student.id] : []);
        if (targetIds.length === 0) {
            functions.showToast('No valid student IDs found for the selected filter.', 'error');
            return;
        }
        if (!window.confirm(`Clear course/year update window for ${targets.length} students?`)) return;

        setIsApplyingBulkWindow(true);
        try {
            const updatedCount = await updateStudentsByIds(targetIds, {
                course_year_update_required: false,
                course_year_window_start: null,
                course_year_window_end: null,
                course_year_confirmed_at: null,
                course_year_profile_edited: false
            });
            functions.showToast(`Window cleared for ${updatedCount || targets.length} students.`);
            await refreshPopulationAfterStudentMutation();
        } catch (error: any) {
            functions.showToast("Couldn't clear window. ", 'error');
        } finally {
            setIsApplyingBulkWindow(false);
        }
    };

    const syncEnrollmentKeysFromStudents = async () => {
        const targets = (await getBulkTargetStudents()).filter((student: any) => student.student_id && student.course);
        if (targets.length === 0) {
            functions.showToast('No students with valid Student ID and Course in the selected filter.', 'info');
            return;
        }
        if (!window.confirm(`Sync enrollment keys from ${targets.length} student records?`)) return;

        setIsSyncingBulkKeys(true);
        try {
            const targetIds = targets.map((student: any) => student.student_id);
            const existingMap = new Map<string, any>();
            const targetIdBatches = Array.from(
                { length: Math.ceil(targetIds.length / 500) },
                (_, index) => targetIds.slice(index * 500, (index + 1) * 500)
            );
            const existingKeyBatches = await Promise.all(targetIdBatches.map(async (batchIds) => {
                const { data: existingKeys, error: existingError } = await supabase
                    .from('enrolled_students')
                    .select('student_id, is_used, status, assigned_to_email')
                    .in('student_id', batchIds);
                if (existingError) throw existingError;
                return existingKeys || [];
            }));
            for (const existingKeys of existingKeyBatches) {
                (existingKeys || []).forEach((row: any) => existingMap.set(row.student_id, row));
            }

            const rows = targets.map((student: any) => {
                const existing = existingMap.get(student.student_id);
                const row: any = {
                    student_id: student.student_id,
                    course: student.course,
                    year_level: student.year_level
                };
                if (existing) {
                    row.is_used = Boolean(existing.is_used);
                    row.status = existing.status || (existing.is_used ? 'Activated' : 'Pending');
                    if (existing.assigned_to_email) row.assigned_to_email = existing.assigned_to_email;
                } else {
                    row.is_used = false;
                    row.status = 'Pending';
                }
                return row;
            });

            const rowBatches = Array.from(
                { length: Math.ceil(rows.length / 500) },
                (_, index) => rows.slice(index * 500, (index + 1) * 500)
            );
            await Promise.all(rowBatches.map(async (batch) => {
                const { error } = await supabase
                    .from('enrolled_students')
                    .upsert(batch, { onConflict: 'student_id' });
                if (error) throw error;
            }));

            functions.showToast(`Enrollment keys updated for ${rows.length} students.`);
            fetchEnrollmentKeys();
        } catch (error: any) {
            functions.showToast("Couldn't update enrollment keys. ", 'error');
        } finally {
            setIsSyncingBulkKeys(false);
        }
    };

    const handleAddCourse = async (e: any) => {
        e.preventDefault();
        const capacity = parseInt(String(courseForm.capacity), 10);
        const limit = parseInt(String(courseForm.application_limit), 10);

        if (!courseForm.department_id) {
            functions.showToast('Select a department.', 'error');
            return;
        }
        if (!courseForm.name.trim()) {
            functions.showToast('Enter a course name.', 'error');
            return;
        }
        if (!Number.isFinite(limit) || limit < 0) {
            functions.showToast('Enter a valid applicant limit.', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('courses').insert({
                name: courseForm.name.trim(),
                capacity: capacity,
                application_limit: limit,
                status: 'Open',
                department_id: parseInt(courseForm.department_id, 10)
            });

            if (error) throw error;
            functions.showToast('Course added.');
            setCourseForm({ name: '', capacity: 500, application_limit: 200, department_id: '' });
            await queryClient.invalidateQueries({ queryKey: ['care_staff_population_lookup_data'] });
        } catch (error: any) {
            functions.showToast("Couldn't add course. ", 'error');
        }
    };

    const handleUpdateCourseLimit = async (courseId: number, field: 'capacity' | 'application_limit', value: string) => {
        const parsed = parseInt(String(value), 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
            functions.showToast(`${field === 'capacity' ? 'Capacity' : 'Applicant'} limit must be 0 or higher.`, 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('courses')
                .update(field === 'capacity' ? { capacity: parsed } : { application_limit: parsed })
                .eq('id', courseId);

            if (error) throw error;
            functions.showToast(`${field === 'capacity' ? 'Capacity' : 'Applicant'} limit updated!`);
            await queryClient.invalidateQueries({ queryKey: ['care_staff_population_lookup_data'] });
        } catch (error: any) {
            functions.showToast("Couldn't update limit. ", 'error');
        }
    };

    // Note: Bulk Upload logic requires FileReader, similar to html version.
    // Supports both CSV and Excel (.xlsx/.xls) files.
    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        const processRows = async (rows: Array<{ id?: unknown; course?: unknown; year?: unknown }>) => {
            // Excel parses numeric cells as numbers; enrolled_students.student_id is text
            const rawIds = rows.flatMap((row) => {
                const id = String(row.id ?? '').trim();
                return id ? [id] : [];
            });
            if (rawIds.length === 0) { functions.showToast("No valid IDs found in the file.", 'error'); return; }

            const uniqueIds = [...new Set(rawIds)];

            try {
                const { data: existing, error: checkError } = await supabase
                    .from('enrolled_students')
                    .select('student_id')
                    .in('student_id', uniqueIds);

                if (checkError) throw checkError;

                const existingIdSet = new Set(existing.map(row => row.student_id));
                const newIds = uniqueIds.filter(id => !existingIdSet.has(id));

                if (newIds.length === 0) { functions.showToast("All IDs in this file already exist.", 'info'); e.target.value = ''; return; }

                if (!confirm(`Found ${newIds.length} new IDs to upload. Proceed?`)) { e.target.value = ''; return; }

                const validCourses = new Set(allCourses.map(c => c.name));
                const newIdSet = new Set(newIds);
                const updates = rows.flatMap(row => {
                    const studentId = String(row.id ?? '').trim();
                    const course = String(row.course ?? '').trim();
                    if (!newIdSet.has(studentId) || !validCourses.has(course)) return [];
                    return [{
                        student_id: studentId,
                        course,
                        year_level: YEAR_LEVEL_OPTIONS.includes(String(row.year || '').trim()) ? String(row.year).trim() : null,
                        is_used: false
                    }];
                });
                const { error } = await supabase.from('enrolled_students').insert(updates);
                if (error) throw error;
                functions.showToast(`Successfully added ${updates.length} new enrollment keys!`);
                fetchEnrollmentKeys();
                e.target.value = '';
            } catch (error) { functions.showToast("Upload failed: ", 'error'); e.target.value = ''; }
        };

        if (isExcel) {
            // Read Excel file using XLSX library
            const reader = new FileReader();
            reader.onload = async (event: any) => {
                try {
                    const data = new Uint8Array(event.target.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    // Skip header row, parse remaining
                    const rows = jsonData.slice(1).flatMap(row => {
                        const parsedRow = {
                            id: String(row[0] || '').trim(),
                            course: String(row[1] || '').trim(),
                            year: String(row[2] || '').trim()
                        };
                        return parsedRow.id && parsedRow.id.toLowerCase() !== 'student_id' ? [parsedRow] : [];
                    });

                    await processRows(rows);
                } catch (err) {
                    functions.showToast("Failed to read Excel file: ", 'error');
                    e.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            // Read CSV/text file
            const reader = new FileReader();
            reader.onload = async (event: any) => {
                const text = event.target.result as string;
                const rows = text.split(/\r?\n/)
                    .map(line => {
                        const [id, course, year] = line.split(',');
                        return { id: id?.trim(), course: course?.trim(), year: year?.trim() };
                    })
                    .filter(row => row.id && row.id.toLowerCase() !== 'student_id');

                await processRows(rows);
            };
            reader.readAsText(file);
        }
    };

    // Derive unique departments from the departments table (always available)
    const departmentNames = (allDepartments || []).map((d: any) => d.name).sort() as string[];

    // Cascade: filter courses by selected department using department_id relationship
    const filteredCourseOptions = departmentFilter === 'All'
        ? allCourses
        : allCourses.filter((c: any) => {
            const dept = (allDepartments || []).find((d: any) => d.id === c.department_id);
            return dept && dept.name === departmentFilter;
        });

    const schoolYearOptions = populationOverview.schoolYears;

    const getStudentCourseYearForFilter = useCallback((student: any) => {
        if (schoolYearFilter === 'All') {
            return {
                course: student.course || '',
                yearLevel: student.year_level || '',
                snapshot: null
            };
        }
        const snapshot = getArchivedSnapshotForSchoolYear(student, schoolYearFilter);
        return {
            course: snapshot?.course || '',
            yearLevel: snapshot?.year_level || '',
            snapshot
        };
    }, [schoolYearFilter]);

    const courseRowsForManagement = (courseDeptFilter === 'All'
        ? allCourses
        : allCourses.filter((course: any) => {
            const department = (allDepartments || []).find((d: any) => d.id === course.department_id);
            return department?.name === courseDeptFilter;
        })
    ) as any[];
    const annotationStudentIdSet = new Set((annotationStudentIds || []).map((id) => Number(id)));

    const filteredStudents = historicalStudents.filter((s: any) => {
        const values = getStudentCourseYearForFilter(s);
        const matchesSearch = studentMatchesSearch(s, searchTerm);
        const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;
        const matchesCourse = courseFilter === 'All' || values.course === courseFilter;
        const matchesYear = yearFilter === 'All' || values.yearLevel === yearFilter;
        const matchesStatus = statusFilter === 'All'
            || (statusFilter === 'Incomplete'
                ? s.profile_completed === false || (s.profile_completed == null && isProfileIncompleteStep1(s))
                : s.status === statusFilter);
        const matchesSection = sectionFilter === 'All' || s.section === sectionFilter;
        const matchesSchoolYear = schoolYearFilter === 'All' || Boolean(values.snapshot);
        const matchesAnnotations = !annotationFilterActive || annotationStudentIdSet.has(Number(s.id));
        return matchesSearch && matchesDept && matchesCourse && matchesYear && matchesStatus && matchesSection && matchesSchoolYear && matchesAnnotations;
    });

    const bulkTargetCount = schoolYearFilter === 'All' ? tableStudentsTotal : filteredStudents.length;

    useEffect(() => {
        if (schoolYearFilter !== 'All') {
            const nextSections = [...new Set(
                historicalStudents.flatMap((student: any) => {
                        const values = getStudentCourseYearForFilter(student);
                        const matchesSchoolYear = Boolean(values.snapshot);
                        const matchesCourse = courseFilter === 'All' || values.course === courseFilter;
                        const matchesYear = yearFilter === 'All' || values.yearLevel === yearFilter;
                        const section = student.section;
                        return matchesSchoolYear && matchesCourse && matchesYear && section ? [section] : [];
                    })
            )].sort() as string[];
            setAvailableSections(nextSections);
            return;
        }

        if (qSections) {
            setAvailableSections(qSections);
        }
    }, [courseFilter, getStudentCourseYearForFilter, historicalStudents, qSections, schoolYearFilter, yearFilter]);

    const filteredArchivedStudents = archivedStudentsList.filter((student: any) => {
        const needle = archivedSearchTerm.trim().toLowerCase();
        if (!needle) return true;

        return [
            student.first_name,
            student.last_name,
            student.student_id,
            student.course,
            student.email
        ]
            .map((value) => String(value || '').toLowerCase())
            .join(' ')
            .includes(needle);
    });

    const handleExportExcel = async () => {
        if (typeof XLSX === 'undefined') { functions.showToast('Excel library not loaded. Please refresh the page.', 'error'); return; }
        functions.showToast('Preparing your Excel file...', 'info');
        try {
            const allStudents = await getAllStudentsForExport();
            if (!allStudents || allStudents.length === 0) { functions.showToast('No students to export.', 'info'); return; }

            const exportColumns: any[] = PROFILE_CATEGORIES.flatMap(category =>
                category.fields.map((field: any) => ({
                    header: field.label,
                    db: field.db,
                    compute: field.compute,
                    type: field.type === 'document' || field.type === 'profilePhoto' ? 'file' : field.type,
                    bucket: field.type === 'profilePhoto' ? 'profile-pictures' : 'support_documents',
                }))
            );

            // Group paths by bucket to resolve them in bulk
            const pathsByBucket: Record<string, string[]> = {};
            for (const student of allStudents) {
                for (const col of exportColumns) {
                    if (col.type === 'file') {
                        const val = col.compute ? col.compute(student) : student[col.db];
                        const rawValue = String(val || '').trim();
                        if (rawValue) {
                            const bucket = col.bucket || 'support_documents';
                            if (!pathsByBucket[bucket]) {
                                pathsByBucket[bucket] = [];
                            }
                            pathsByBucket[bucket].push(rawValue);
                        }
                    }
                }
            }

            // Resolve URLs in parallel per bucket
            const resolvedUrlsMapByBucket: Record<string, Record<string, string | null>> = {};
            const bucketNames = Object.keys(pathsByBucket);
            const bulkPromises = bucketNames.map(async (bucket) => {
                const uniquePaths = pathsByBucket[bucket];
                const resolvedMap = await resolveStoredAssetUrlsBulk(
                    bucket,
                    uniquePaths,
                    STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS
                );
                resolvedUrlsMapByBucket[bucket] = resolvedMap;
            });
            await Promise.all(bulkPromises);

            const headers = exportColumns.map(c => c.header);
            const fileColumnIndexes = exportColumns.reduce((indexes: number[], col: any, index: number) => {
                if (col.type === 'file') indexes.push(index);
                return indexes;
            }, []);
            const rows = [];
            for (const student of allStudents) {
                const row = [];
                for (const col of exportColumns) {
                    const val = col.compute ? col.compute(student) : student[col.db];
                    if (col.type === 'boolean') {
                        row.push(val ? 'Yes' : 'No');
                    } else if (col.type === 'file') {
                        const rawValue = String(val || '').trim();
                        const bucket = col.bucket || 'support_documents';
                        const resolvedUrl = rawValue
                            ? (resolvedUrlsMapByBucket[bucket]?.[rawValue] || (isR2Reference(rawValue) ? 'Available in portal' : rawValue))
                            : '';
                        row.push(escapeSpreadsheetFormula(resolvedUrl));
                    } else {
                        row.push(escapeSpreadsheetFormula(val ?? ''));
                    }
                }
                rows.push(row);
            }

            const wsData = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            fileColumnIndexes.forEach((columnIndex: number) => {
                rows.forEach((row, rowIndex) => {
                    const fileUrl = String(row[columnIndex] || '').trim();
                    if (!/^https?:\/\//i.test(fileUrl)) return;

                    const cellRef = XLSX.utils.encode_cell({ r: rowIndex + 1, c: columnIndex });
                    if (ws[cellRef]) {
                        ws[cellRef].l = {
                            Target: fileUrl,
                            Tooltip: 'Open uploaded file'
                        };
                    }
                });
            });
            // Auto-size columns
            ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length, 18) }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Student Data');
            XLSX.writeFile(wb, `SDAF_Student_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
            functions.showToast(`Exported ${allStudents.length} students to Excel!`, 'success');
        } catch (err: any) {
            console.error('Export error:', err);
            functions.showToast('Export failed: ', 'error');
        }
    };

    const handleSwapIds = async (e: React.FormEvent) => {
        e.preventDefault();
        const src = sourceId.trim();
        const dest = targetId.trim();
        if (!src || !dest) {
            functions.showToast('Both Source and Target Student IDs are required.', 'error');
            return;
        }
        if (src === dest) {
            functions.showToast('Source and Target Student IDs must be different.', 'error');
            return;
        }

        setIsSwappingIds(true);
        try {
            const result = await invokeEdgeFunction('manage-student-accounts', {
                body: {
                    mode: 'swap-student-ids',
                    sourceStudentId: src,
                    targetStudentId: dest
                },
                requireAuth: true,
                non2xxMessage: 'Your CARE Staff session could not be verified. Sign in again.',
                fallbackMessage: 'Failed to update student IDs.'
            });
            functions.showToast(result?.message || 'Student IDs updated successfully.', 'success');
            setShowIdSwapModal(false);
            setSourceId('');
            setTargetId('');
            setSourceStudent(null);
            setTargetStudent(null);
            void handleRefreshData();
        } catch (error: any) {
            functions.showToast('Failed to update student IDs.', 'error');
        } finally {
            setIsSwappingIds(false);
        }
    };

    const handleSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const visibleTableStudents = schoolYearFilter === 'All'
        ? tableStudents
        : filteredStudents;

    const shouldUseServiceSearchOrder = schoolYearFilter === 'All' && debouncedSearchTerm.trim().length > 0;

    const sortedStudents = shouldUseServiceSearchOrder ? visibleTableStudents : visibleTableStudents.toSorted((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (sortConfig.key === 'name') {
            aVal = `${a.last_name} ${a.first_name}`.toLowerCase();
            bVal = `${b.last_name} ${b.first_name}`.toLowerCase();
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const effectiveTotal = schoolYearFilter === 'All' ? tableStudentsTotal : sortedStudents.length;
    const isStudentTableLoading = (schoolYearFilter === 'All' ? tableLoading : historicalStudentsLoading) || qAnnotationStudentIdsLoading;
    const totalPages = getCareStudentTotalPages(effectiveTotal);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = schoolYearFilter === 'All'
        ? sortedStudents
        : sortedStudents.slice(startIndex, startIndex + itemsPerPage);
    const paginationItems = buildCareStudentPaginationItems(currentPage, totalPages);
    const visibleStudentCount = effectiveTotal === 0
        ? 0
        : paginatedStudents.length > 0
            ? paginatedStudents.length
            : Math.min(itemsPerPage, Math.max(effectiveTotal - startIndex, 0));
    const endIndex = effectiveTotal === 0 ? 0 : Math.min(effectiveTotal, startIndex + visibleStudentCount);

    const paginatedStudentIds = paginatedStudents.flatMap((student: any) => {
        const id = Number(student?.id);
        return Number.isFinite(id) && id > 0 ? [id] : [];
    });
    const paginatedStudentIdsKey = paginatedStudentIds.join(',');
    const { data: qVisibleAnnotations = [] } = useQuery({
        queryKey: ['care_staff_population_visible_annotations', paginatedStudentIdsKey, tableRefreshTick],
        queryFn: () => getDeptStudentAnnotations(paginatedStudentIds),
        enabled: paginatedStudentIds.length > 0
    });
    const profileStudentNumericId = Number(profileViewStudent?.id);
    const shouldLoadProfileAnnotations = Number.isFinite(profileStudentNumericId)
        && profileStudentNumericId > 0
        && !paginatedStudentIds.includes(profileStudentNumericId);
    const { data: qProfileAnnotations = [] } = useQuery({
        queryKey: ['care_staff_population_profile_annotations', profileStudentNumericId, tableRefreshTick],
        queryFn: () => getDeptStudentAnnotations([profileStudentNumericId]),
        enabled: shouldLoadProfileAnnotations
    });
    const studentAnnotationsById: Record<string, DeptStudentAnnotation[]> = buildStudentAnnotationMap([
        ...qVisibleAnnotations,
        ...qProfileAnnotations
    ]);

    useEffect(() => {
        setCurrentPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);

    const courseYearCountMap = courseYearCounts.reduce((acc: Record<string, Record<string, number>>, row) => {
        const course = row.course || '';
        const year = row.year_level || '';
        if (!acc[course]) acc[course] = {};
        acc[course][year] = Number(row.student_count || 0);
        return acc;
    }, {});

    const openArchivedStudentsModal = () => {
        setShowArchivedStudentsModal(true);
        queryClient.invalidateQueries({ queryKey: ['care_staff_population_archived'] });
    };

    return {
        showToast,
        canPerformAction,
        canArchiveRecords,
        canRestoreRecords,
        populationOverview,
        setPopulationOverview,
        overviewLoading,
        setOverviewLoading,
        allCourses,
        setAllCourses,
        allDepartments,
        setAllDepartments,
        lookupsLoading,
        setLookupsLoading,
        archivedStudentsList,
        setArchivedStudentsList,
        archivedStudentsLoading,
        setArchivedStudentsLoading,
        archivedStudentsLoaded,
        setArchivedStudentsLoaded,
        historicalStudents,
        setHistoricalStudents,
        historicalStudentsLoading,
        setHistoricalStudentsLoading,
        availableSections,
        setAvailableSections,
        courseYearCounts,
        setCourseYearCounts,
        courseYearCountsLoading,
        setCourseYearCountsLoading,
        courseYearCountsLoaded,
        setCourseYearCountsLoaded,
        courseApplicantCounts,
        setCourseApplicantCounts,
        courseApplicantCountsLoading,
        setCourseApplicantCountsLoading,
        courseApplicantCountsLoaded,
        setCourseApplicantCountsLoaded,
        refreshInFlightRef,
        showEnrollmentModal,
        setShowEnrollmentModal,
        showArchivedStudentsModal,
        setShowArchivedStudentsModal,
        showEditModal,
        setShowEditModal,
        editForm,
        setEditForm,
        showDeleteModal,
        setShowDeleteModal,
        studentToDelete,
        setStudentToDelete,
        archivedSearchTerm,
        setArchivedSearchTerm,
        restoringStudentId,
        setRestoringStudentId,
        openEditModal,
        handleUpdateStudent,
        confirmDeleteStudent,
        handleRestoreStudent,
        searchTerm,
        setSearchTerm,
        debouncedSearchTerm,
        setDebouncedSearchTerm,
        currentPage,
        setCurrentPage,
        enrollmentStatusFilter,
        setEnrollmentStatusFilter,
        enrollmentSearchQuery,
        setEnrollmentSearchQuery,
        totalEnrollmentKeysCount,
        setTotalEnrollmentKeysCount,
        courseFilter,
        setCourseFilter,
        departmentFilter,
        setDepartmentFilter,
        courseDeptFilter,
        setCourseDeptFilter,
        yearFilter,
        setYearFilter,
        statusFilter,
        setStatusFilter,
        schoolYearFilter,
        setSchoolYearFilter,
        sectionFilter,
        setSectionFilter,
        hasNoteFilter,
        setHasNoteFilter,
        atRiskFilter,
        setAtRiskFilter,
        filtersExpanded,
        setFiltersExpanded,
        activeFilterCount,
        viewMode,
        setViewMode,
        itemsPerPage,
        tableStudents,
        setTableStudents,
        tableStudentsTotal,
        setTableStudentsTotal,
        tableLoading,
        setTableLoading,
        isRefreshingData,
        setIsRefreshingData,
        tableRefreshTick,
        setTableRefreshTick,
        sortConfig,
        setSortConfig,
        enrollmentKeys,
        setEnrollmentKeys,
        courseForm,
        setCourseForm,
        bulkWindowForm,
        setBulkWindowForm,
        isApplyingBulkWindow,
        setIsApplyingBulkWindow,
        isSyncingBulkKeys,
        setIsSyncingBulkKeys,
        settingsTab,
        setSettingsTab,
        showIdSwapModal,
        setShowIdSwapModal,
        sourceId,
        setSourceId,
        targetId,
        setTargetId,
        isSwappingIds,
        setIsSwappingIds,
        sourceStudent,
        setSourceStudent,
        targetStudent,
        setTargetStudent,
        sourceLoading,
        setSourceLoading,
        targetLoading,
        setTargetLoading,
        studentTableRequestIdRef,
        lastExternalRefreshSignalRef,
        profileViewStudent,
        setProfileViewStudent,
        profileCategoryIndex,
        setProfileCategoryIndex,
        profileLoading,
        setProfileLoading,
        showPhotoModal,
        setShowPhotoModal,
        loadPopulationOverview: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_overview'] }),
        loadLookupData: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_lookup_data'] }),
        loadArchivedStudents: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_archived'] }),
        loadHistoricalStudents: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_historical'] }),
        loadCourseYearCounts: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_course_year_counts'] }),
        loadCourseApplicantCounts: () => queryClient.invalidateQueries({ queryKey: ['care_staff_population_course_applicant_counts'] }),
        refreshPopulationAfterStudentMutation,
        openProfileModal,
        fetchEnrollmentKeys,
        handleRefreshData,
        cleanupExpiredCourseYearWindows,
        handleDeleteKey,
        handleGenerateKey,
        getCurrentStudentFilters,
        getBulkTargetStudents,
        updateStudentsByIds,
        applyBulkCourseYearWindow,
        clearBulkCourseYearWindow,
        syncEnrollmentKeysFromStudents,
        handleAddCourse,
        handleUpdateCourseLimit,
        handleBulkUpload,
        handleDownloadTemplate,
        departmentNames,
        filteredCourseOptions,
        schoolYearOptions,
        getStudentCourseYearForFilter,
        courseRowsForManagement,
        filteredStudents,
        bulkTargetCount,
        filteredArchivedStudents,
        handleExportExcel,
        handleSwapIds,
        handleSort,
        visibleTableStudents,
        shouldUseServiceSearchOrder,
        sortedStudents,
        effectiveTotal,
        isStudentTableLoading,
        totalPages,
        startIndex,
        paginatedStudents,
        studentAnnotationsById,
        paginationItems,
        visibleStudentCount,
        endIndex,
        courseYearCountMap,
        openArchivedStudentsModal,
        archiveRpcStateRef
    };
}
