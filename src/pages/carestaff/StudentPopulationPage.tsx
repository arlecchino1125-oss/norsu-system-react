import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Users, Search, Download, XCircle, Edit, Trash2, Plus, Key, Archive,
    PieChart, List, UploadCloud, Info, ArrowUpDown, Activity, TrendingUp,
    Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileSpreadsheet, RefreshCw, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePermissions } from '../../hooks/usePermissions';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { managedArchiveService } from '../../services/managedArchiveService';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import type { CareStaffDashboardFunctions } from './types';
import { getAllStudentsForExport, getStudentByStudentId, getStudentsPage, STUDENT_TABLE_COLUMNS } from '../../services/careStaffService';
import { getDepartmentNameFromCourseRecords } from '../../utils/courseDepartment';
import { openStoredAsset, resolveStoredAssetUrl } from '../../utils/storageAssets';
import { escapeSpreadsheetFormula } from '../../utils/inputSecurity';

declare const XLSX: any;

const STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

// Profile category definitions — exact sdaf.txt labels & order
// Fields with `db` read directly; fields with `compute` derive the value from the student object
const PROFILE_CATEGORIES = [
    {
        key: 'personal', label: 'Personal Information', icon: '\u{1F464}', gradient: 'from-blue-500 to-sky-400', fields: [
            { label: 'Photo/Portrait', db: 'profile_picture_url', type: 'profilePhoto' },
            { label: 'Student ID No.', db: 'student_id' },
            { label: 'Last Name', db: 'last_name' },
            { label: 'Given Name', db: 'first_name' },
            { label: 'Extension Name', db: 'suffix' },
            { label: 'Middle Name', db: 'middle_name' },
            { label: 'Permanent Address - Street/Sitio & Barangay', db: 'street' },
            { label: 'Permanent Address - Town/City Municipality', db: 'city' },
            { label: 'Permanent Address - Province', db: 'province' },
            { label: 'Permanent Address - Zip Code', db: 'zip_code' },
            { label: 'Permanent Address - Region', db: 'region' },
            { label: 'Contact Number', db: 'mobile' },
            { label: 'Age', db: 'age' },
            { label: 'Birthday', db: 'dob' },
            { label: 'Sex Assigned at Birth', db: 'sex' },
            { label: 'Gender', db: 'gender_identity' },
            { label: 'Citizenship', db: 'nationality' },
            { label: 'Facebook Account Link', db: 'facebook_url' },
            { label: 'Place of Birth', db: 'place_of_birth' },
            { label: 'Religion', db: 'religion' },
            { label: 'Year Level', db: 'year_level' },
            { label: 'College', db: 'department' },
            { label: 'Program', db: 'course' },
            { label: 'Civil Status', db: 'civil_status' },
        ]
    },
    {
        key: 'family', label: 'Family Background', icon: '👨‍👩‍👧', gradient: 'from-amber-400 to-orange-500', fields: [
            { label: 'Name of Spouse', db: 'spouse_name' },
            { label: "Spouse's Occupation", db: 'spouse_occupation' },
            { label: "Spouse's Employer/Business Name", db: 'spouse_employer_name' },
            { label: "Spouse's Employer/Business Address", db: 'spouse_employer_address' },
            { label: "Spouse's Contact Number", db: 'spouse_contact' },
            { label: 'Number of Children', db: 'num_children' },
            { label: 'Name of Children - Date of Birth', db: 'children_names_birthdates' },
            { label: 'Currently Pregnant', db: 'currently_pregnant' },
            { label: "Mother's Maiden Last Name", db: 'mother_last_name' },
            { label: "Mother's Given Name", db: 'mother_given_name' },
            { label: "Mother's Maiden Middle Name", db: 'mother_middle_name' },
            { label: "Mother's Occupation", db: 'mother_occupation' },
            { label: "Mother's Status", db: 'mother_status' },
            { label: "Mother's Contact Number", db: 'mother_contact' },
            { label: "Mother's Address", db: 'mother_address' },
            { label: "Father's Last Name", db: 'father_last_name' },
            { label: "Father's Given Name", db: 'father_given_name' },
            { label: "Father's Middle Name", db: 'father_middle_name' },
            { label: "Father's Occupation", db: 'father_occupation' },
            { label: "Father's Status", db: 'father_status' },
            { label: "Father's Contact Number", db: 'father_contact' },
            { label: "Father's Address", db: 'father_address' },
            { label: 'Number of Children Your Parents Have', db: 'parents_num_children' },
            { label: 'Your Birth Order in the Family', db: 'birth_order' },
        ]
    },
    {
        key: 'socioEconomic', label: 'Socio-Economic Background', icon: 'ℹ️', gradient: 'from-indigo-400 to-violet-500', fields: [
            { label: 'Person/Agency Who Supports Your Studies Financially Other Than Yourself', db: 'supporter' },
            { label: 'Contact Information of the Person/Agency Who Supports Your Studies Financially Other Than Yourself', db: 'supporter_contact' },
            { label: 'Are You a Working Student', db: 'is_working_student', type: 'boolean' },
            { label: 'Type of Work', db: 'working_student_type' },
            { label: 'Name of Employer', db: 'employer_name' },
            { label: 'Address of Employer', db: 'employer_address' },
            { label: 'Are You a Person With Disability (PWD)', db: 'is_pwd', type: 'boolean' },
            { label: 'PWD Number', db: 'pwd_number' },
            { label: 'Type of Disability', db: 'pwd_type' },
            { label: 'Cause of Disability', db: 'disability_cause' },
            { label: 'PWD Document', db: 'pwd_document_url', type: 'document' },
            { label: 'Are You a Member of Any Indigenous Group & Cultural Communities', db: 'is_indigenous', type: 'boolean' },
            { label: 'Indigenous Group', db: 'indigenous_group' },
            { label: 'Indigenous Group Document', db: 'ip_document_url', type: 'document' },
            { label: 'Are You a Member of 4Ps', db: 'is_four_ps_member', type: 'boolean' },
            { label: '4Ps Document', db: 'four_ps_document_url', type: 'document' },
            { label: 'Are You a Rebel Returnee', db: 'is_rebel_returnee', type: 'boolean' },
            { label: 'Are You a Son/Daughter of a Solo Parent', db: 'is_child_of_solo_parent', type: 'boolean' },
            { label: 'Are You a Solo Parent Yourself', db: 'is_solo_parent', type: 'boolean' },
            { label: 'Solo Parent Document', db: 'solo_parent_document_url', type: 'document' },
            { label: 'Are You an Orphan', db: 'is_orphan', type: 'boolean' },
            { label: 'Cause of Being an Orphan', db: 'orphan_cause' },
            { label: 'Are You a Homeless Citizen', db: 'is_homeless_citizen', type: 'boolean' },
            { label: 'Are You a Senior Citizen', db: 'is_senior_citizen', type: 'boolean' },
            { label: 'Senior Citizen Document', db: 'senior_citizen_document_url', type: 'document' },
            { label: 'Work Experiences', db: 'work_experiences' },
        ]
    },
    {
        key: 'guardian', label: 'Guardian', icon: '🛡️', gradient: 'from-slate-500 to-slate-700', fields: [
            { label: 'Guardian Full Name', db: 'guardian_name' },
            { label: 'Guardian Address', db: 'guardian_address' },
            { label: 'Guardian Contact Number', db: 'guardian_contact' },
            { label: 'Relation to the Guardian', db: 'guardian_relation' },
        ]
    },
    {
        key: 'emergency', label: 'Person to Contact (In Case of Emergency)', icon: '🚨', gradient: 'from-rose-400 to-red-500', fields: [
            { label: 'Emergency Contact Full Name', db: 'emergency_name' },
            { label: 'Emergency Contact Address', db: 'emergency_address' },
            { label: 'Emergency Contact Relationship', db: 'emergency_relationship' },
            { label: 'Emergency Contact Number', db: 'emergency_number' },
        ]
    },
    {
        key: 'education', label: 'Educational Background', icon: '🎓', gradient: 'from-cyan-400 to-blue-500', fields: [
            { label: 'Elementary School', db: 'elem_school' },
            { label: 'Elementary Inclusive Years Attended', db: 'elem_year_graduated' },
            { label: 'Junior High School', db: 'junior_high_school' },
            { label: 'Junior High Inclusive Years Attended', db: 'junior_high_year_graduated' },
            { label: 'Senior High School', db: 'senior_high_school' },
            { label: 'Senior High Inclusive Years Attended', db: 'senior_high_year_graduated' },
            { label: 'Transferee College', db: 'college_school' },
            { label: 'Transferee College Inclusive Years Attended', db: 'college_year_graduated' },
            { label: 'Honor/Award Received', db: 'honors_awards' },
            { label: 'TESDA NC II Acquired - Date Acquired - Validity', db: 'tesda_nc2_acquired' },
            { label: 'Eligibility Acquired - Date Acquired', db: 'eligibility_acquired' },
            { label: 'Special Trainings Attended', db: 'special_trainings_attended' },
        ]
    },
    {
        key: 'extracurricular', label: 'Extra-Curricular Involvement', icon: '⚽', gradient: 'from-pink-400 to-rose-500', fields: [
            { label: 'Name of Voluntary Activities', db: 'extracurricular_activities' },
            { label: 'Do You Hold a Local/National Position in Public Service', db: 'holds_public_service_position', type: 'boolean' },
            { label: 'Position in Public Service', db: 'public_service_position' },
            { label: 'Organizations You Are a Member Of', db: 'organizations_memberships' },
            { label: 'Sports You Are Good At', db: 'sports_skills' },
            { label: 'Other Talent/s', db: 'other_talents' },
        ]
    },
    {
        key: 'scholarships', label: 'Scholarships', icon: '🏆', gradient: 'from-yellow-400 to-amber-500', fields: [
            { label: 'Name of Scholarship Availed & Sponsor', db: 'scholarships_availed' },
            { label: 'Have You Been Criminally Charged Before Any Court', db: 'has_been_criminally_charged', type: 'boolean' },
            { label: 'Have You Been Convicted of Any Crime', db: 'has_been_convicted_of_crime', type: 'boolean' },
        ]
    },
    {
        key: 'additional', label: 'Additional Information', icon: 'ℹ️', gradient: 'from-slate-500 to-slate-700', fields: [
        ]
    },
].filter(category => category.fields.length > 0);

const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', '6th Year', 'Other'];
const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';
const CARE_STUDENT_PAGE_SIZE = 5;
const CARE_STUDENT_TABLE_SHELL_CLASS = 'bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[28rem] flex-col';

const getCareStudentTotalPages = (totalItems: number) => Math.max(1, Math.ceil(Math.max(0, totalItems) / CARE_STUDENT_PAGE_SIZE));

const buildCareStudentPaginationItems = (page: number, totalPages: number) => {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const items: Array<number | string> = [1];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    if (start > 2) items.push('left-ellipsis');
    for (let current = start; current <= end; current += 1) {
        items.push(current);
    }
    if (end < totalPages - 1) items.push('right-ellipsis');

    items.push(totalPages);
    return items;
};

const renderCareStudentPaddingRows = (columnCount: number, visibleRowCount: number) => (
    Array.from({ length: Math.max(0, CARE_STUDENT_PAGE_SIZE - visibleRowCount) }, (_, index) => (
        <tr key={`student-table-padding-${columnCount}-${index}`} aria-hidden="true">
            <td colSpan={columnCount} className="h-[72px] bg-white">&nbsp;</td>
        </tr>
    ))
);

const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
};

const formatDateTimeDisplay = (value?: string | null) => {
    if (!value) return 'Not recorded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not recorded';
    return date.toLocaleString();
};

const parseArchiveEntries = (value: any) => {
    if (!value) return [] as any[];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const deriveSchoolYearLabel = (entry: any) => {
    if (entry?.school_year && String(entry.school_year).trim()) {
        const raw = String(entry.school_year).trim();
        return raw.replace(/^AY\b/, 'SY');
    }
    const start = entry?.window_start ? new Date(entry.window_start) : null;
    const end = entry?.window_end ? new Date(entry.window_end) : null;
    if (start && !Number.isNaN(start.getTime()) && end && !Number.isNaN(end.getTime())) {
        return `SY ${Math.min(start.getFullYear(), end.getFullYear())}-${Math.max(start.getFullYear(), end.getFullYear())}`;
    }
    return '';
};

const getArchivedSnapshotForSchoolYear = (student: any, schoolYear: string) => {
    if (!student || schoolYear === 'All') return null;
    const entries = parseArchiveEntries(student.course_year_archive);
    const matches = entries.filter((entry: any) => deriveSchoolYearLabel(entry) === schoolYear);
    if (matches.length === 0) return null;
    const sorted = [...matches].sort((a: any, b: any) => {
        const aTime = a?.archived_at ? new Date(a.archived_at).getTime() : 0;
        const bTime = b?.archived_at ? new Date(b.archived_at).getTime() : 0;
        return bTime - aTime;
    });
    return sorted[0];
};

interface StudentPopulationPageProps {
    functions: Pick<CareStaffDashboardFunctions, 'showToast'>;
    pendingProfileId?: string | null;
    onProfileOpened?: () => void;
}

const StudentPopulationPage = ({ functions, pendingProfileId, onProfileOpened }: StudentPopulationPageProps) => {
    const { showToast } = functions || {};
    const { canPerformAction } = usePermissions();
    const canArchiveRecords = canPerformAction('archive_records');
    const canRestoreRecords = canPerformAction('restore_records');

    // Use custom hook for data fetching & real-time updates
    const { data: studentsList, refetch: refetchStudents } = useSupabaseData({
        table: 'students',
        select: STUDENT_TABLE_COLUMNS,
        eq: { column: 'is_archived', value: false },
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });

    const {
        data: archivedStudentsList,
        loading: archivedStudentsLoading,
        refetch: refetchArchivedStudents
    } = useSupabaseData({
        table: 'students',
        select: STUDENT_TABLE_COLUMNS,
        eq: { column: 'is_archived', value: true },
        order: { column: 'archived_at', ascending: false },
        subscribe: true
    });

    const { data: allCourses, refetch: refetchCourses } = useSupabaseData({
        table: 'courses',
        select: 'id, name, application_limit, status, department_id, departments(name)',
        order: { column: 'name', ascending: true }
    });

    const { data: departmentRows } = useSupabaseData({
        table: 'departments',
        select: 'id, name, is_archived',
        order: { column: 'name', ascending: true },
        subscribe: true
    });
    const allDepartments = departmentRows.filter((department: any) => !department?.is_archived);

    const { data: natApplications, refetch: refetchNatApplications } = useSupabaseData({
        table: 'applications',
        select: 'id, priority_course',
        subscribe: true
    });

    // Modals
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [showArchivedStudentsModal, setShowArchivedStudentsModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<any>(null);
    const [archivedSearchTerm, setArchivedSearchTerm] = useState('');
    const [restoringStudentId, setRestoringStudentId] = useState<string | number | null>(null);

    const openEditModal = (student: any) => {
        setEditForm({
            ...student,
            course_year_update_required: Boolean(student.course_year_update_required),
            course_year_window_start: toDateTimeLocal(student.course_year_window_start),
            course_year_window_end: toDateTimeLocal(student.course_year_window_end),
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

            if (showToast) showToast("Student updated successfully!");
            setShowEditModal(false);
            refetchStudents();
        } catch (error: any) {
            if (showToast) showToast("Error updating student: " + error.message, 'error');
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
            refetchStudents();
            setTableRefreshTick((current) => current + 1);
            if (showEnrollmentModal) {
                fetchEnrollmentKeys();
            }
        } catch (error: any) {
            if (showToast) showToast("Error archiving student: " + error.message, 'error');
        }
    };

    const handleRestoreStudent = async (student: any) => {
        if (!student?.id || !canRestoreRecords) return;
        if (!window.confirm(`Restore ${student.first_name} ${student.last_name} to the active roster?`)) return;

        setRestoringStudentId(student.id);
        try {
            await managedArchiveService.restoreStudent(
                Number(student.id),
                String(student.student_id || '').trim()
            );
            if (showToast) showToast('Student restored to the active roster.');
            refetchStudents();
            refetchArchivedStudents();
            setTableRefreshTick((current) => current + 1);
            if (showEnrollmentModal) {
                fetchEnrollmentKeys();
            }
        } catch (error: any) {
            if (showToast) showToast('Error restoring student: ' + error.message, 'error');
        } finally {
            setRestoringStudentId(null);
        }
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseDeptFilter, setCourseDeptFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [schoolYearFilter, setSchoolYearFilter] = useState('All');
    const [sectionFilter, setSectionFilter] = useState('All');
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'stats'
    const itemsPerPage = CARE_STUDENT_PAGE_SIZE;
    const [tableStudents, setTableStudents] = useState<any[]>([]);
    const [tableStudentsTotal, setTableStudentsTotal] = useState(0);
    const [tableLoading, setTableLoading] = useState(false);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [tableRefreshTick, setTableRefreshTick] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
    const [enrollmentKeys, setEnrollmentKeys] = useState<any[]>([]);
    const [courseForm, setCourseForm] = useState({ name: '', application_limit: 200, department_id: '' });
    const [bulkWindowForm, setBulkWindowForm] = useState<any>({
        start: '',
        end: ''
    });
    const [isApplyingBulkWindow, setIsApplyingBulkWindow] = useState(false);
    const [isSyncingBulkKeys, setIsSyncingBulkKeys] = useState(false);
    // Profile view modal state
    const [profileViewStudent, setProfileViewStudent] = useState<any>(null);
    const [profileCategoryIndex, setProfileCategoryIndex] = useState(0);
    const [profileLoading, setProfileLoading] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const archiveRpcStateRef = useRef<'unknown' | 'available' | 'missing'>(
        sessionStorage.getItem(ARCHIVE_RPC_MISSING_CACHE_KEY) === '1' ? 'missing' : 'unknown'
    );

    const openProfileModal = async (student: any) => {
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
    };
    /* Lifted to Parent
    const fetchStudents = async () => { ... };
    const fetchCourses = async () => { ... };
    useEffect(() => { fetchStudents(); fetchCourses(); ... }, []);
    */

    const fetchEnrollmentKeys = async () => {
        try {
            const { data, error } = await supabase
                .from('enrolled_students')
                .select('student_id, course, year_level, is_used, status, assigned_to_email, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEnrollmentKeys(data || []);
        } catch (error) {
            console.error('Error fetching enrollment keys:', error);
            functions.showToast('Failed to fetch enrollment keys', 'error');
        }
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await Promise.all([
                refetchStudents(),
                refetchCourses(),
                refetchNatApplications(),
                fetchEnrollmentKeys()
            ]);
            setTableRefreshTick((current) => current + 1);
            functions.showToast('Student data refreshed.', 'success');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const cleanupExpiredCourseYearWindows = async (silent = true) => {
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
                            functions.showToast(`Expired school-year windows closed for ${cleanedCount} students. Course/year fields were archived and reset.`, 'info');
                        }
                        refetchStudents();
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
                    functions.showToast(`Expired windows processed for ${fallbackCount} students.`, 'info');
                }
                refetchStudents();
            }
        } catch (error: any) {
            console.error('Error cleaning expired course/year windows:', error);
            if (!silent) {
                functions.showToast('Failed to process expired course/year windows: ' + error.message, 'error');
            }
        }
    };

    useEffect(() => {
        cleanupExpiredCourseYearWindows(true);
    }, []);

    // Handle pending profile view from other pages
    useEffect(() => {
        if (pendingProfileId) {
            openProfileModal(pendingProfileId);
            onProfileOpened?.();
        }
    }, [pendingProfileId]);

    useEffect(() => {
        if (showEnrollmentModal) {
            cleanupExpiredCourseYearWindows(false);
            fetchEnrollmentKeys();
        }
    }, [showEnrollmentModal]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, departmentFilter, courseFilter, yearFilter, sectionFilter, schoolYearFilter]);

    useEffect(() => {
        const fetchPagedStudents = async () => {
            setTableLoading(true);
            try {
                const sortColumnMap: Record<string, string> = {
                    name: 'last_name',
                    student_id: 'student_id',
                    course: 'course',
                    status: 'status',
                    created_at: 'created_at'
                };

                const result = await getStudentsPage(
                    {
                        search: searchTerm,
                        department: departmentFilter,
                        course: courseFilter,
                        yearLevel: yearFilter,
                        section: sectionFilter
                    },
                    { page: currentPage, pageSize: itemsPerPage },
                    {
                        column: sortColumnMap[sortConfig.key] || 'created_at',
                        ascending: sortConfig.direction === 'asc'
                    }
                );
                setTableStudents(result.rows);
                setTableStudentsTotal(result.total);
            } catch (error: any) {
                if (showToast) showToast('Error loading students list: ' + error.message, 'error');
            } finally {
                setTableLoading(false);
            }
        };

        fetchPagedStudents();
    }, [searchTerm, departmentFilter, courseFilter, yearFilter, sectionFilter, currentPage, sortConfig.key, sortConfig.direction, tableRefreshTick]);

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
            functions.showToast("Error: " + error.message, 'error');
        }
    };

    const getBulkTargetStudents = () => {
        return studentsList;
    };

    const updateStudentsByIds = async (targetIds: Array<string | number>, payload: any) => {
        let updatedCount = 0;
        for (let i = 0; i < targetIds.length; i += 500) {
            const batchIds = targetIds.slice(i, i + 500);
            const { data, error } = await supabase
                .from('students')
                .update(payload)
                .in('id', batchIds)
                .select('id');
            if (error) throw error;
            updatedCount += data?.length || 0;
        }
        return updatedCount;
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

        const targets = getBulkTargetStudents();
        if (targets.length === 0) {
            functions.showToast('No students match the selected filter.', 'info');
            return;
        }
        const targetIds = targets.map((student: any) => student.id).filter(Boolean);
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
                status: 'Inactive'
            });
            functions.showToast(`Window applied to ${updatedCount || targets.length} students.`);
            refetchStudents();
        } catch (error: any) {
            functions.showToast('Error applying window: ' + error.message, 'error');
        } finally {
            setIsApplyingBulkWindow(false);
        }
    };

    const clearBulkCourseYearWindow = async () => {
        const targets = getBulkTargetStudents();
        if (targets.length === 0) {
            functions.showToast('No students match the selected filter.', 'info');
            return;
        }
        const targetIds = targets.map((student: any) => student.id).filter(Boolean);
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
                course_year_confirmed_at: null
            });
            functions.showToast(`Window cleared for ${updatedCount || targets.length} students.`);
            refetchStudents();
        } catch (error: any) {
            functions.showToast('Error clearing window: ' + error.message, 'error');
        } finally {
            setIsApplyingBulkWindow(false);
        }
    };

    const syncEnrollmentKeysFromStudents = async () => {
        const targets = getBulkTargetStudents().filter((student: any) => student.student_id && student.course);
        if (targets.length === 0) {
            functions.showToast('No students with valid Student ID and Course in the selected filter.', 'info');
            return;
        }
        if (!window.confirm(`Sync enrollment keys from ${targets.length} student records?`)) return;

        setIsSyncingBulkKeys(true);
        try {
            const targetIds = targets.map((student: any) => student.student_id);
            const existingMap = new Map<string, any>();
            for (let i = 0; i < targetIds.length; i += 500) {
                const batchIds = targetIds.slice(i, i + 500);
                const { data: existingKeys, error: existingError } = await supabase
                    .from('enrolled_students')
                    .select('student_id, is_used, status, assigned_to_email')
                    .in('student_id', batchIds);
                if (existingError) throw existingError;
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

            for (let i = 0; i < rows.length; i += 500) {
                const batch = rows.slice(i, i + 500);
                const { error } = await supabase
                    .from('enrolled_students')
                    .upsert(batch, { onConflict: 'student_id' });
                if (error) throw error;
            }

            functions.showToast(`Enrollment keys synced for ${rows.length} students.`);
            fetchEnrollmentKeys();
        } catch (error: any) {
            functions.showToast('Error syncing enrollment keys: ' + error.message, 'error');
        } finally {
            setIsSyncingBulkKeys(false);
        }
    };

    const handleAddCourse = async (e: any) => {
        e.preventDefault();
        const limit = parseInt(String(courseForm.application_limit), 10);

        if (!courseForm.department_id) {
            functions.showToast('Please select a department.', 'error');
            return;
        }
        if (!courseForm.name.trim()) {
            functions.showToast('Please enter a course name.', 'error');
            return;
        }
        if (!Number.isFinite(limit) || limit < 0) {
            functions.showToast('Please provide a valid applicant limit.', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('courses').insert({
                name: courseForm.name.trim(),
                application_limit: limit,
                status: 'Open',
                department_id: parseInt(courseForm.department_id, 10)
            });

            if (error) throw error;
            functions.showToast('Course added successfully!');
            setCourseForm({ name: '', application_limit: 200, department_id: '' });
            refetchCourses();
        } catch (error: any) {
            functions.showToast('Error adding course: ' + error.message, 'error');
        }
    };

    const handleUpdateCourseLimit = async (courseId: number, value: string) => {
        const parsed = parseInt(String(value), 10);
        if (!Number.isFinite(parsed) || parsed < 0) {
            functions.showToast('Applicant limit must be 0 or higher.', 'error');
            return;
        }

        try {
            const { error } = await supabase
                .from('courses')
                .update({ application_limit: parsed })
                .eq('id', courseId);

            if (error) throw error;
            functions.showToast('Applicant limit updated!');
            refetchCourses();
        } catch (error: any) {
            functions.showToast('Error updating limit: ' + error.message, 'error');
        }
    };

    // Note: Bulk Upload logic requires FileReader, similar to html version.
    // Supports both CSV and Excel (.xlsx/.xls) files.
    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        const processRows = async (rows) => {
            const rawIds = rows.map(r => r.id);
            if (rawIds.length === 0) { functions.showToast("No valid IDs found in the file.", 'error'); return; }

            const uniqueIds = [...new Set(rawIds)];

            try {
                const { data: existing, error: checkError } = await supabase
                    .from('enrolled_students')
                    .select('student_id')
                    .in('student_id', uniqueIds);

                if (checkError) throw checkError;

                const existingIds = existing.map(row => row.student_id);
                const newIds = uniqueIds.filter(id => !existingIds.includes(id));

                if (newIds.length === 0) { functions.showToast("All IDs in this file already exist.", 'info'); e.target.value = ''; return; }

                if (!confirm(`Found ${newIds.length} new IDs to upload. Proceed?`)) { e.target.value = ''; return; }

                const validCourses = new Set(allCourses.map(c => c.name));
                const updates = rows.filter(r => newIds.includes(r.id)).map(r => ({
                    student_id: r.id,
                    course: validCourses.has(r.course) ? r.course : null,
                    year_level: YEAR_LEVEL_OPTIONS.includes(String(r.year || '').trim()) ? String(r.year).trim() : null,
                    is_used: false
                })).filter(r => r.course);
                const { error } = await supabase.from('enrolled_students').insert(updates);
                if (error) throw error;
                functions.showToast(`Successfully added ${updates.length} new enrollment keys!`);
                fetchEnrollmentKeys();
                e.target.value = '';
            } catch (error) { functions.showToast("Upload failed: " + error.message, 'error'); e.target.value = ''; }
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
                    const rows = jsonData.slice(1)
                        .map(row => ({
                            id: String(row[0] || '').trim(),
                            course: String(row[1] || '').trim(),
                            year: String(row[2] || '').trim()
                        }))
                        .filter(row => row.id && row.id.toLowerCase() !== 'student_id');

                    await processRows(rows);
                } catch (err) {
                    functions.showToast("Failed to read Excel file: " + err.message, 'error');
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

    const bulkTargetCount = getBulkTargetStudents().length;

    const schoolYearOptions = [...new Set(
        studentsList.flatMap((student: any) =>
            parseArchiveEntries(student.course_year_archive)
                .map((entry: any) => deriveSchoolYearLabel(entry))
                .filter(Boolean)
        )
    )].sort().reverse() as string[];

    const getStudentCourseYearForFilter = (student: any) => {
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
    };

    const courseApplicantCounts = (natApplications || []).reduce((acc: Record<string, number>, app: any) => {
        if (app.priority_course) {
            acc[app.priority_course] = (acc[app.priority_course] || 0) + 1;
        }
        return acc;
    }, {});

    const courseRowsForManagement = (courseDeptFilter === 'All'
        ? allCourses
        : allCourses.filter((course: any) => {
            const department = (allDepartments || []).find((d: any) => d.id === course.department_id);
            return department?.name === courseDeptFilter;
        })
    ) as any[];

    // Derive unique sections from filtered students (scoped by course + year)
    const availableSections = [...new Set(
        studentsList
            .filter((s: any) => {
                const values = getStudentCourseYearForFilter(s);
                const matchesCourse = courseFilter === 'All' || values.course === courseFilter;
                const matchesYear = yearFilter === 'All' || values.yearLevel === yearFilter;
                return matchesCourse && matchesYear;
            })
            .map(s => s.section)
            .filter(Boolean)
    )].sort() as string[];

    const filteredStudents = studentsList.filter((s: any) => {
        const values = getStudentCourseYearForFilter(s);
        const matchesSearch = (s.first_name + ' ' + s.last_name + ' ' + s.student_id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = departmentFilter === 'All' || s.department === departmentFilter;
        const matchesCourse = courseFilter === 'All' || values.course === courseFilter;
        const matchesYear = yearFilter === 'All' || values.yearLevel === yearFilter;
        const matchesSection = sectionFilter === 'All' || s.section === sectionFilter;
        const matchesSchoolYear = schoolYearFilter === 'All' || Boolean(values.snapshot);
        return matchesSearch && matchesDept && matchesCourse && matchesYear && matchesSection && matchesSchoolYear;
    });

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
        functions.showToast('Preparing Excel export...', 'info');
        try {
            const allStudents = await getAllStudentsForExport();
            if (!allStudents || allStudents.length === 0) { functions.showToast('No students to export.', 'info'); return; }

            // STRICT sdaf.txt fields — exact headers and order
            const fileLinkCache = new Map<string, string>();
            const resolveExportFileLink = async (bucket: string, value: unknown) => {
                const rawValue = String(value || '').trim();
                if (!rawValue) return '';

                const cacheKey = `${bucket}:${rawValue}`;
                if (fileLinkCache.has(cacheKey)) {
                    return fileLinkCache.get(cacheKey) || '';
                }

                const resolvedUrl = await resolveStoredAssetUrl(
                    bucket,
                    rawValue,
                    STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS
                );
                const nextValue = resolvedUrl || rawValue;
                fileLinkCache.set(cacheKey, nextValue);
                return nextValue;
            };

            const exportColumns: any[] = PROFILE_CATEGORIES.flatMap(category =>
                category.fields.map((field: any) => ({
                    header: field.label,
                    db: field.db,
                    compute: field.compute,
                    type: field.type === 'document' || field.type === 'profilePhoto' ? 'file' : field.type,
                    bucket: field.type === 'profilePhoto' ? 'profile-pictures' : 'support_documents',
                }))
            );

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
                        row.push(escapeSpreadsheetFormula(await resolveExportFileLink(col.bucket || 'support_documents', val)));
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
            functions.showToast('Export failed: ' + err.message, 'error');
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

    const sortedStudents = [...visibleTableStudents].sort((a, b) => {
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

    useEffect(() => {
        setCurrentPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);

    return (
        <div className="space-y-6 relative min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Population</h1>
                    <p className="text-slate-500 text-sm mt-1">Comprehensive management and analytics for the student body.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleRefreshData} disabled={isRefreshingData} leftIcon={<RefreshCw size={16} className={isRefreshingData ? 'animate-spin' : ''} />}>
                        {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                    </Button>
                    <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={16} />}>
                        Export Excel
                    </Button>
                    {(canArchiveRecords || canRestoreRecords) && (
                        <Button variant="secondary" onClick={() => setShowArchivedStudentsModal(true)} leftIcon={<Archive size={16} />}>
                            Archived Students ({archivedStudentsList.length})
                        </Button>
                    )}
                    <Button variant="primary" onClick={() => setShowEnrollmentModal(true)} leftIcon={<Key size={16} />}>
                        Enrollment Keys
                    </Button>
                    <Button variant="secondary" onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')} leftIcon={viewMode === 'list' ? <PieChart size={16} /> : <List size={16} />}>
                        {viewMode === 'list' ? 'View Stats' : 'View List'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Users size={18} /></div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">Total Population</p>
                        <p className="text-xl font-bold leading-tight text-slate-900">{studentsList.length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600"><TrendingUp size={18} /></div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">Active Students</p>
                        <p className="text-xl font-bold leading-tight text-slate-900">{studentsList.filter(s => s.status === 'Active').length}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><Archive size={18} /></div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-500">Archived Students</p>
                        <p className="text-xl font-bold leading-tight text-slate-900">{archivedStudentsList.length}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-col gap-3">
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input type="text" placeholder="Search by Name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-sm font-medium text-slate-600">Filter:</label>
                        <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCourseFilter('All'); setYearFilter('All'); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 w-[180px] truncate">
                            <option value="All">All Departments</option>
                            {departmentNames.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setYearFilter('All'); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 w-[180px] truncate">
                            <option value="All">All Courses</option>
                            {filteredCourseOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 w-[120px]">
                            <option value="All">All Years</option>
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                            <option value="5th Year">5th Year</option>
                        </select>
                        <select value={schoolYearFilter} onChange={(e) => { setSchoolYearFilter(e.target.value); setSectionFilter('All'); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 w-[150px] truncate">
                            <option value="All">All School Years</option>
                            {schoolYearOptions.map((sy: string) => <option key={sy} value={sy}>{sy}</option>)}
                        </select>
                        <select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-600 bg-white text-slate-700 w-[120px]">
                            <option value="All">All Sections</option>
                            {availableSections.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {(searchTerm || departmentFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || schoolYearFilter !== 'All' || sectionFilter !== 'All') && (
                            <button onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); setCourseFilter('All'); setYearFilter('All'); setSchoolYearFilter('All'); setSectionFilter('All'); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 font-medium">Reset</button>
                        )}
                    </div>
                </div>
            </div>

            {viewMode === 'stats' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
                    <h3 className="font-bold text-lg text-slate-900 mb-4">Live Student Population Counter</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-3 font-bold text-slate-600">Course</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">1st Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">2nd Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">3rd Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center">4th Year</th>
                                    <th className="p-3 font-bold text-slate-600 text-center bg-blue-50 text-blue-700">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allCourses.map(course => {
                                    const courseStudents = studentsList.filter(s => s.course === course.name && s.status === 'Active');
                                    const y1 = courseStudents.filter(s => s.year_level === '1st Year').length;
                                    const y2 = courseStudents.filter(s => s.year_level === '2nd Year').length;
                                    const y3 = courseStudents.filter(s => s.year_level === '3rd Year').length;
                                    const y4 = courseStudents.filter(s => s.year_level === '4th Year').length;
                                    const total = y1 + y2 + y3 + y4;
                                    return (
                                        <tr key={course.id} className="hover:bg-slate-50">
                                            <td className="p-3 font-medium text-slate-900">{course.name}</td>
                                            <td className="p-3 text-center text-slate-600">{y1}</td>
                                            <td className="p-3 text-center text-slate-600">{y2}</td>
                                            <td className="p-3 text-center text-slate-600">{y3}</td>
                                            <td className="p-3 text-center text-slate-600">{y4}</td>
                                            <td className="p-3 text-center font-bold text-blue-700 bg-blue-50/30">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className={CARE_STUDENT_TABLE_SHELL_CLASS}>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('name')}>Student <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('student_id')}>ID <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('course')}>Course & Year <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>Status <ArrowUpDown size={12} className="inline ml-1" /></th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {tableLoading ? (
                                        <tr>
                                            <td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">Loading students...</td>
                                        </tr>
                                    ) : effectiveTotal === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">No students found.</td>
                                        </tr>
                                    ) : (
                                        <>
                                            {paginatedStudents.map(student => (
                                        <tr key={student.id} onClick={() => openProfileModal(student)} className="hover:bg-slate-50 cursor-pointer">
                                            <td className="px-6 py-4"><span className="font-bold text-slate-900">{student.first_name} {student.last_name}</span></td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{student.student_id}</td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const filteredSnapshot = schoolYearFilter === 'All'
                                                        ? null
                                                        : getArchivedSnapshotForSchoolYear(student, schoolYearFilter);
                                                    const displayCourse = filteredSnapshot?.course || student.course || '-';
                                                    const displayYear = filteredSnapshot?.year_level || student.year_level || '-';
                                                    return (
                                                        <>
                                                            <div>{displayCourse}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {displayYear}{student.section ? ` — Sec ${student.section}` : ''}
                                                                {filteredSnapshot && <span className="ml-1 text-[10px] text-indigo-600">({schoolYearFilter})</span>}
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{student.status}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(student); }} className="text-blue-600 hover:text-blue-800 p-2"><Edit size={16} /></button>
                                                {canArchiveRecords && (
                                                    <button onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setShowDeleteModal(true); }} className="text-slate-400 hover:text-amber-700 p-2" title="Archive Student"><Archive size={16} /></button>
                                                )}
                                            </td>
                                        </tr>
                                            ))}
                                            {renderCareStudentPaddingRows(5, paginatedStudents.length)}
                                        </>
                                    )}
                                </tbody>
                            </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs md:flex-row md:items-center md:justify-between">
                        <span className="text-slate-500">
                            {tableLoading
                                ? 'Loading students...'
                                : effectiveTotal === 0
                                ? 'No students found.'
                                : `Showing ${startIndex + 1}-${endIndex} of ${effectiveTotal} students`}
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                disabled={tableLoading || currentPage === 1}
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="First page"
                            >
                                <ChevronsLeft size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={tableLoading || currentPage === 1}
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
                                        disabled={tableLoading}
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
                                disabled={tableLoading || currentPage === totalPages}
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Next page"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={tableLoading || currentPage === totalPages}
                                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Last page"
                            >
                                <ChevronsRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Edit Student</h3>
                            <button onClick={() => setShowEditModal(false)}>
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateStudent} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">First Name</label>
                                    <input
                                        required
                                        value={editForm.first_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Last Name</label>
                                    <input
                                        required
                                        value={editForm.last_name || ''}
                                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold mb-1">Course</label>
                                <select
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
                                    <label className="block text-xs font-bold mb-1">Year Level</label>
                                    <select
                                        value={editForm.year_level || '1st Year'}
                                        onChange={(e) => setEditForm({ ...editForm, year_level: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg text-sm"
                                    >
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold mb-1">Status</label>
                                    <select
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
                                            <label className="block text-xs font-bold mb-1">Window Start</label>
                                            <input
                                                type="datetime-local"
                                                value={editForm.course_year_window_start || ''}
                                                onChange={(e) => setEditForm({ ...editForm, course_year_window_start: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold mb-1">Window End</label>
                                            <input
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
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update Student</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Student Modal */}
            {showDeleteModal && studentToDelete && canArchiveRecords && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Archive Student</h3>
                            <button onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}>
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
                                <button type="button" onClick={confirmDeleteStudent} className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Archive</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                                                        {restoringStudentId === student.id ? 'Restoring...' : 'Restore'}
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

            {/* Enrollment Keys Modal */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-y-auto animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Manage Enrollment Keys</h3>
                            <button onClick={() => setShowEnrollmentModal(false)} className="text-slate-400 hover:text-slate-600"><XCircle size={24} /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 text-xs text-blue-800">
                                <p className="font-bold mb-1"><Info size={12} className="inline mr-1" /> How this works:</p>
                                <p>This list acts as a <strong>whitelist of valid IDs</strong>. Student profiles will only appear in the main list <strong>after</strong> the student successfully activates their account using one of these IDs.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                                        <h4 className="font-bold text-sm text-slate-800">Global Course/Year Update Window</h4>
                                        <p className="text-xs text-slate-500 mt-1">Apply one start/end window to many students at once. When the end time passes, course/year values are auto-reset while Student IDs stay active.</p>
                                        <p className="text-xs text-slate-500 mt-3">This applies to all students.</p>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                            <input
                                                type="datetime-local"
                                                value={bulkWindowForm.start}
                                                onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, start: e.target.value }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                            />
                                            <input
                                                type="datetime-local"
                                                value={bulkWindowForm.end}
                                                onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, end: e.target.value }))}
                                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                            />
                                        </div>

                                        <p className="text-xs text-slate-500 mt-2">Target students: <span className="font-bold text-slate-700">{bulkTargetCount}</span></p>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                                            <button
                                                type="button"
                                                onClick={applyBulkCourseYearWindow}
                                                disabled={isApplyingBulkWindow}
                                                className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {isApplyingBulkWindow ? 'Applying...' : 'Apply Window'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearBulkCourseYearWindow}
                                                disabled={isApplyingBulkWindow}
                                                className="px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-100 disabled:opacity-60"
                                            >
                                                Clear Window
                                            </button>
                                            <button
                                                type="button"
                                                onClick={syncEnrollmentKeysFromStudents}
                                                disabled={isSyncingBulkKeys}
                                                className="px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-60"
                                            >
                                                {isSyncingBulkKeys ? 'Syncing...' : 'Sync Keys (Optional)'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="border-b border-slate-100 pb-6">
                                        <label className="block text-xs font-bold text-slate-700 mb-2">Option 1: Manual Entry</label>
                                        <form onSubmit={handleGenerateKey} className="flex flex-wrap gap-2">
                                            <input required name="enrollmentId" className="w-1/3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600" placeholder="Ex: 202612345" pattern="\d{9}" title="Student ID must be exactly 9 digits" />
                                            <select required name="enrollmentCourse" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                                <option value="">Select Course</option>
                                                {allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                            <select required name="enrollmentYear" defaultValue="1st Year" className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white">
                                                {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                            <button type="submit" className="px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition shadow-md"><Plus size={16} /></button>
                                        </form>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-slate-700">Option 2: Bulk Upload (CSV / Excel)</label>
                                            <button onClick={handleDownloadTemplate} className="text-xs text-blue-600 hover:underline font-medium flex items-center gap-1">
                                                <Download size={12} /> Download Template
                                            </button>
                                        </div>
                                        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition group cursor-pointer">
                                            <input type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleBulkUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="group-hover:scale-110 transition-transform duration-200"><UploadCloud size={32} className="text-purple-600 mb-2 mx-auto" /></div>
                                            <p className="text-sm text-slate-700 font-medium">Click to upload CSV or Excel file</p>
                                            <p className="text-xs text-slate-400 mt-1">Format: Student ID, Course, Year Level</p>
                                        </div>
                                    </div>

                                    <div className="mb-3 mt-6">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Filter by Status</label>
                                        <select value={enrollmentStatusFilter} onChange={e => setEnrollmentStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"><option value="All">All Statuses</option><option value="Pending">Pending</option><option value="Activated">Activated</option><option value="Revoked">Revoked</option><option value="Archived">Archived</option></select>
                                    </div>

                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        <h4 className="font-bold text-sm text-slate-700 mb-3">Existing Keys ({enrollmentKeys.length})</h4>
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                            {enrollmentKeys.filter(key => enrollmentStatusFilter === 'All' || (key.status || 'Pending') === enrollmentStatusFilter).map(key => (
                                                <div key={key.student_id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-100 text-xs">
                                                    <div>
                                                        <span className="font-mono font-bold text-slate-700">{key.student_id}</span>
                                                        <span className="block text-slate-500 truncate max-w-[150px]" title={key.course}>{key.course}</span>
                                                        <span className="block text-slate-400">{key.year_level || 'Year not set'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-1 rounded font-bold ${String(key.status || '') === 'Archived'
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : String(key.status || '') === 'Revoked'
                                                                ? 'bg-red-100 text-red-700'
                                                                : key.is_used
                                                                    ? 'bg-green-100 text-green-700'
                                                                    : 'bg-yellow-100 text-yellow-700'
                                                            }`}>{key.status || (key.is_used ? 'Activated' : 'Pending')}</span>
                                                        {canArchiveRecords && String(key.status || '') !== 'Archived' && String(key.status || '') !== 'Revoked' && (
                                                            <button onClick={() => handleDeleteKey(key.student_id)} className="p-1.5 text-slate-400 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors" title="Revoke Key">
                                                                <XCircle size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {enrollmentKeys.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No keys generated yet.</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40">
                                    <div className="mb-4">
                                        <h4 className="font-bold text-sm text-slate-800">Course &amp; Applicant Limits</h4>
                                        <p className="text-xs text-slate-500 mt-1">Add courses here and maintain per-course NAT applicant limits, grouped by department.</p>
                                    </div>

                                    <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-8 gap-2 mb-4">
                                        <input
                                            type="text"
                                            className="md:col-span-3 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"
                                            placeholder="Course name"
                                            value={courseForm.name}
                                            onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                                            required
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"
                                            placeholder="Applicant limit"
                                            value={courseForm.application_limit}
                                            onChange={e => setCourseForm({ ...courseForm, application_limit: parseInt(e.target.value || '0', 10) })}
                                            required
                                        />
                                        <select
                                            className="md:col-span-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"
                                            value={courseForm.department_id}
                                            onChange={e => setCourseForm({ ...courseForm, department_id: e.target.value })}
                                            required
                                        >
                                            <option value="" disabled>Select department</option>
                                            {allDepartments.map((dept: any) => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                        <button type="submit" className="md:col-span-1 px-3 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition">
                                            Add
                                        </button>
                                    </form>

                                    <div className="mb-3">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Filter Courses by Department</label>
                                        <select
                                            value={courseDeptFilter}
                                            onChange={e => setCourseDeptFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"
                                        >
                                            <option value="All">All Departments</option>
                                            {departmentNames.map((deptName: string) => (
                                                <option key={deptName} value={deptName}>{deptName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-100 text-slate-600 uppercase">
                                                <tr>
                                                    <th className="px-3 py-2">Course</th>
                                                    <th className="px-3 py-2">Department</th>
                                                    <th className="px-3 py-2 text-center">Applicants</th>
                                                    <th className="px-3 py-2 text-center">Limit</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {courseRowsForManagement.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-3 py-4 text-center text-slate-400">No courses found for this department.</td>
                                                    </tr>
                                                ) : courseRowsForManagement.map((course: any) => {
                                                    const department = allDepartments.find((d: any) => d.id === course.department_id);
                                                    return (
                                                        <tr key={course.id}>
                                                            <td className="px-3 py-2 font-semibold text-slate-800">{course.name}</td>
                                                            <td className="px-3 py-2 text-slate-600">{department?.name || 'Unassigned'}</td>
                                                            <td className="px-3 py-2 text-center font-mono text-blue-700">{courseApplicantCounts[course.name] || 0}</td>
                                                            <td className="px-3 py-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    className="w-20 px-2 py-1 border border-slate-300 rounded text-center text-xs focus:outline-none focus:border-purple-600"
                                                                    defaultValue={course.application_limit ?? 200}
                                                                    onBlur={e => handleUpdateCourseLimit(course.id, e.target.value)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== FULL STUDENT PROFILE MODAL ===== */}
            {profileViewStudent && typeof document !== 'undefined' && createPortal(
                <>
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 p-2 sm:p-6" onClick={() => setProfileViewStudent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                <button
                                    onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center text-xl sm:text-2xl font-black text-white shrink-0 shadow-lg shadow-blue-200 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-blue-400 transition-all focus:outline-none' : 'cursor-default'}`}
                                >
                                    {profileViewStudent.profile_picture_url ? (
                                        <img src={profileViewStudent.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
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
                                <button onClick={() => { openEditModal(profileViewStudent); setProfileViewStudent(null); }} className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-lg hover:bg-blue-700 transition shadow-md">
                                    <Edit size={14} /> Edit
                                </button>
                                <button onClick={() => setProfileViewStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
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
                                        <button
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
                                                                        await openStoredAsset('support_documents', String(value));
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
                            <button
                                onClick={() => setProfileCategoryIndex(i => Math.max(0, i - 1))}
                                disabled={profileCategoryIndex === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} /> Back
                            </button>
                            <span className="text-xs text-slate-400 font-medium">
                                {profileCategoryIndex + 1} / {PROFILE_CATEGORIES.length} — {PROFILE_CATEGORIES[profileCategoryIndex].label}
                            </span>
                            <button
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
                    onClick={() => setShowPhotoModal(false)}
                >
                    <div
                        className={`bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col relative transition-all duration-300 ease-out delay-75 ${showPhotoModal ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowPhotoModal(false)}
                            className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-full flex items-center justify-center transition-colors z-10 border border-white/20"
                        >
                            <XCircle size={20} />
                        </button>

                        <div className="w-80 h-80 sm:w-96 sm:h-96 flex items-center justify-center bg-slate-100 flex-shrink-0">
                            {profileViewStudent.profile_picture_url ? (
                                <img src={profileViewStudent.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={80} className="text-slate-300" />
                            )}
                        </div>

                        <div className="p-6 text-center bg-white border-t border-slate-100">
                            <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-tight">
                                {profileViewStudent.first_name} {profileViewStudent.last_name} {profileViewStudent.suffix}
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
        </div>
    );
};

export default StudentPopulationPage;
