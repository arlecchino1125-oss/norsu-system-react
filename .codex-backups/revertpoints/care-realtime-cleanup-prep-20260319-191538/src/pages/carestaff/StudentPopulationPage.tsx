import { useState, useEffect, useRef } from 'react';
import {
    Users, Search, Download, XCircle, Edit, Trash2, Plus, Key,
    PieChart, List, UploadCloud, Info, ArrowUpDown, Activity, TrendingUp,
    Eye, ChevronLeft, ChevronRight, FileSpreadsheet, User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabaseData } from '../../hooks/useSupabaseData';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import type { CareStaffDashboardFunctions } from './types';
import { getAllStudentsForExport, getStudentByStudentId, getStudentsPage, STUDENT_LIST_COLUMNS } from '../../services/careStaffService';
import { getDepartmentNameFromCourseRecords } from '../../utils/courseDepartment';

declare const XLSX: any;

// Profile category definitions — exact sdaf.txt labels & order
// Fields with `db` read directly; fields with `compute` derive the value from the student object
const PROFILE_CATEGORIES = [
    {
        key: 'personal', label: 'Personal Information', icon: '\u{1F464}', gradient: 'from-blue-500 to-sky-400', fields: [
            { label: "STUDENT'S I.D. NO.", db: 'student_id' },
            { label: 'FULL NAME', compute: (s: any) => [s.last_name, s.first_name, s.suffix, s.middle_name || 'N/A'].filter(Boolean).join(', ') },
            { label: 'ADDRESS', compute: (s: any) => [s.street, s.city, s.province, s.zip_code].filter(Boolean).join(', ') },
            { label: 'CONTACT NUMBER', db: 'mobile' },
            { label: 'AGE', db: 'age' },
            { label: 'BIRTHDAY', db: 'dob' },
            { label: 'SEX ASSIGNED AT BIRTH', db: 'sex' },
            { label: 'GENDER', db: 'gender_identity' },
            { label: 'YEAR LEVEL', db: 'year_level' },
            { label: 'Complete Program', db: 'course' },
            { label: 'CIVIL STATUS', db: 'civil_status' },
            { label: 'FB ACCOUNT LINK', db: 'facebook_url' },
            { label: 'PLACE OF BIRTH', db: 'place_of_birth' },
            { label: 'RELIGION', db: 'religion' },
            { label: 'SCHOOL LAST ATTENDED', db: 'school_last_attended' },
            { label: 'PERSON WHO SUPPORTED YOUR STUDIES ASIDE FROM YOUR PARENTS', db: 'supporter' },
            { label: 'ARE YOU A WORKING STUDENT?', db: 'is_working_student', type: 'boolean' },
            { label: 'If YES, please select one that applies', db: 'working_student_type' },
            { label: 'CONTACT INFORMATION OF THE PERSON WHO SUPPORTS YOUR STUDIES ASIDE FROM YOUR PARENTS', db: 'supporter_contact' },
            { label: 'ARE YOU A PERSON WITH A DISABILITY (PWD)?', db: 'is_pwd', type: 'boolean' },
            { label: 'If YES, please select your type of disability', db: 'pwd_type' },
            { label: 'Are you a member of any Indigenous Group?', db: 'is_indigenous', type: 'boolean' },
            { label: 'If YES, please choose below', db: 'indigenous_group' },
            { label: 'Have you ever witnessed or been aware of any incidents related to armed conflict or insurgency in your community?', db: 'witnessed_conflict', type: 'boolean' },
            { label: 'Do you feel safe in your community, or are there situations involving conflict or violence that concern you?', db: 'is_safe_in_community', type: 'boolean' },
            { label: 'ARE YOU A SOLO PARENT?', db: 'is_solo_parent', type: 'boolean' },
            { label: 'ARE YOU A SON/DAUGHTER OF A SOLO PARENT?', db: 'is_child_of_solo_parent', type: 'boolean' },
        ]
    },
    {
        key: 'family', label: 'Family Background', icon: '👨‍👩‍👧', gradient: 'from-amber-400 to-orange-500', fields: [
            { label: "MOTHER'S NAME", db: 'mother_name' },
            { label: "MOTHER'S OCCUPATION", db: 'mother_occupation' },
            { label: "MOTHER'S CONTACT NUMBER", db: 'mother_contact' },
            { label: "FATHER'S NAME", db: 'father_name' },
            { label: "FATHER'S OCCUPATION", db: 'father_occupation' },
            { label: "FATHER'S CONTACT NUMBER", db: 'father_contact' },
            { label: "PARENT'S ADDRESS", db: 'parent_address' },
            { label: 'NUMBER OF BROTHERS', db: 'num_brothers' },
            { label: 'NUMBER OF SISTERS', db: 'num_sisters' },
            { label: 'YOUR BIRTH ORDER IN THE FAMILY', db: 'birth_order' },
            { label: 'IF MARRIED, NAME OF SPOUSE', db: 'spouse_name' },
            { label: 'OCCUPATION', db: 'spouse_occupation' },
            { label: 'NUMBER OF CHILDREN', db: 'num_children' },
        ]
    },
    {
        key: 'guardian', label: 'Guardian', icon: '🛡️', gradient: 'from-indigo-400 to-violet-500', fields: [
            { label: 'FULL NAME', db: 'guardian_name' },
            { label: 'ADDRESS', db: 'guardian_address' },
            { label: 'CONTACT NUMBER', db: 'guardian_contact' },
            { label: 'RELATION TO THE GUARDIAN', db: 'guardian_relation' },
        ]
    },
    {
        key: 'emergency', label: 'Person to Contact (In Case of Emergency)', icon: '🚨', gradient: 'from-rose-400 to-red-500', fields: [
            { label: 'FULL NAME', db: 'emergency_name' },
            { label: 'ADDRESS', db: 'emergency_address' },
            { label: 'RELATIONSHIP', db: 'emergency_relationship' },
            { label: 'CONTACT NUMBER', db: 'emergency_number' },
        ]
    },
    {
        key: 'education', label: 'Educational Background', icon: '🎓', gradient: 'from-cyan-400 to-blue-500', fields: [
            { label: 'ELEMENTARY', db: 'elem_school' },
            { label: 'YEAR GRADUATED', db: 'elem_year_graduated' },
            { label: 'JUNIOR HIGH SCHOOL', db: 'junior_high_school' },
            { label: 'YEAR GRADUATED', db: 'junior_high_year_graduated' },
            { label: 'SENIOR HIGH SCHOOL', db: 'senior_high_school' },
            { label: 'YEAR GRADUATED', db: 'senior_high_year_graduated' },
            { label: 'COLLEGE', db: 'college_school' },
            { label: 'YEAR GRADUATED/CONTINUING', db: 'college_year_graduated' },
            { label: 'HONOR/AWARD RECEIVED', db: 'honors_awards' },
        ]
    },
    {
        key: 'extracurricular', label: 'Extra-Curricular Involvement', icon: '⚽', gradient: 'from-pink-400 to-rose-500', fields: [
            { label: 'NAME OF ACTIVITIES', db: 'extracurricular_activities' },
        ]
    },
    {
        key: 'scholarships', label: 'Scholarships', icon: '🏆', gradient: 'from-yellow-400 to-amber-500', fields: [
            { label: 'NAME OF SCHOLARSHIP AVAILED', db: 'scholarships_availed' },
        ]
    },
    {
        key: 'additional', label: 'Additional Information', icon: 'ℹ️', gradient: 'from-slate-500 to-slate-700', fields: [
            { label: 'Department', db: 'department' },
            { label: 'Section', db: 'section' },
            { label: 'Status', db: 'status' },
            { label: 'Email', db: 'email' },
            { label: 'Nationality', db: 'nationality' },
            { label: 'Street', db: 'street' },
            { label: 'City / Municipality', db: 'city' },
            { label: 'Province', db: 'province' },
            { label: 'Zip Code', db: 'zip_code' },
            { label: 'Priority Course', db: 'priority_course' },
            { label: 'Alt Course 1', db: 'alt_course_1' },
            { label: 'Alt Course 2', db: 'alt_course_2' },
        ]
    },
];

const YEAR_LEVEL_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const ARCHIVE_RPC_MISSING_CACHE_KEY = 'norsu_archive_rpc_missing';

const toDateTimeLocal = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
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

    // Use custom hook for data fetching & real-time updates
    const { data: studentsList, refetch: refetchStudents } = useSupabaseData({
        table: 'students',
        select: STUDENT_LIST_COLUMNS,
        order: { column: 'created_at', ascending: false },
        subscribe: true
    });

    const { data: allCourses, refetch: refetchCourses } = useSupabaseData({
        table: 'courses',
        select: 'id, name, application_limit, status, department_id, departments(name)',
        order: { column: 'name', ascending: true },
        subscribe: true
    });

    const { data: allDepartments } = useSupabaseData({
        table: 'departments',
        order: { column: 'name', ascending: true }
    });

    const { data: natApplications } = useSupabaseData({
        table: 'applications',
        select: 'id, priority_course',
        subscribe: true
    });

    // Modals
    const [showModal, setShowModal] = useState(false);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<any>(null);

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
            const { error: keyError } = await supabase.from('enrolled_students').delete().eq('student_id', studentToDelete.student_id);
            if (keyError) console.warn("Could not delete enrollment key:", keyError.message);

            const { error } = await supabase.from('students').delete().eq('id', studentToDelete.id);
            if (error) throw error;

            if (showToast) showToast("Student and enrollment key deleted successfully.");
            setShowDeleteModal(false);
            setStudentToDelete(null);
            refetchStudents();
        } catch (error: any) {
            if (showToast) showToast("Error deleting student: " + error.message, 'error');
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
    const itemsPerPage = 25;
    const [tableStudents, setTableStudents] = useState<any[]>([]);
    const [tableStudentsTotal, setTableStudentsTotal] = useState(0);
    const [tableLoading, setTableLoading] = useState(false);
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
    }, [searchTerm, departmentFilter, courseFilter, yearFilter, sectionFilter, currentPage, sortConfig.key, sortConfig.direction]);

    const [studentForm, setStudentForm] = useState<any>({
        firstName: '', lastName: '', studentId: '', course: '', year: '1st Year', status: 'Active'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setStudentForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const selectedCourseData = allCourses.find(c => c.name === studentForm.course);
        const selectedDepartment = allDepartments.find((d: any) => d.id === selectedCourseData?.department_id);
        const departmentName = selectedCourseData?.departments?.name || selectedDepartment?.name || 'Unassigned';

        try {
            const { error } = await supabase
                .from('students')
                .insert([{
                    first_name: studentForm.firstName,
                    last_name: studentForm.lastName,
                    student_id: studentForm.studentId,
                    course: studentForm.course,
                    year_level: studentForm.year,
                    status: studentForm.status,
                    department: departmentName
                }]);

            if (error) throw error;

            await supabase.from('enrolled_students').upsert([
                {
                    student_id: studentForm.studentId,
                    course: studentForm.course,
                    year_level: studentForm.year,
                    is_used: false
                }
            ], { onConflict: 'student_id' });

            functions.showToast("Student saved successfully!");
            setShowModal(false);
            setStudentForm({ firstName: '', lastName: '', studentId: '', course: '', year: '1st Year', status: 'Active' });
            refetchStudents();
        } catch (error) {
            functions.showToast("Error saving student: " + error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    /* handlers lifted */

    const handleDeleteKey = async (studentId) => {
        if (!window.confirm(`Delete enrollment key for ${studentId}?`)) return;
        try {
            const { error } = await supabase.from('enrolled_students').delete().eq('student_id', studentId);
            if (error) throw error;
            functions.showToast("Enrollment key deleted.");
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

    const handleExportExcel = async () => {
        if (typeof XLSX === 'undefined') { functions.showToast('Excel library not loaded. Please refresh the page.', 'error'); return; }
        functions.showToast('Preparing Excel export...', 'info');
        try {
            const allStudents = await getAllStudentsForExport();
            if (!allStudents || allStudents.length === 0) { functions.showToast('No students to export.', 'info'); return; }

            // STRICT sdaf.txt fields — exact headers and order
            const exportColumns: any[] = [
                // ===== PERSONAL INFORMATION =====
                { header: "STUDENT'S I.D. NO.", db: 'student_id' },
                { header: 'FULL NAME', compute: (s: any) => [s.last_name, s.first_name, s.suffix, s.middle_name || 'N/A'].filter(Boolean).join(', ') },
                { header: 'ADDRESS', compute: (s: any) => [s.street, s.city, s.province, s.zip_code].filter(Boolean).join(', ') },
                { header: 'CONTACT NUMBER', db: 'mobile' },
                { header: 'AGE', db: 'age' },
                { header: 'BIRTHDAY', db: 'dob' },
                { header: 'SEX ASSIGNED AT BIRTH', db: 'sex' },
                { header: 'GENDER', db: 'gender_identity' },
                { header: 'YEAR LEVEL', db: 'year_level' },
                { header: 'Complete Program', db: 'course' },
                { header: 'CIVIL STATUS', db: 'civil_status' },
                { header: 'FB ACCOUNT LINK', db: 'facebook_url' },
                { header: 'PLACE OF BIRTH', db: 'place_of_birth' },
                { header: 'RELIGION', db: 'religion' },
                { header: 'SCHOOL LAST ATTENDED', db: 'school_last_attended' },
                { header: 'PERSON WHO SUPPORTED YOUR STUDIES ASIDE FROM YOUR PARENTS', db: 'supporter' },
                { header: 'ARE YOU A WORKING STUDENT?', db: 'is_working_student', type: 'boolean' },
                { header: 'If YES, please select one that applies', db: 'working_student_type' },
                { header: 'CONTACT INFORMATION OF THE PERSON WHO SUPPORTS YOUR STUDIES ASIDE FROM YOUR PARENTS', db: 'supporter_contact' },
                { header: 'ARE YOU A PERSON WITH A DISABILITY (PWD)?', db: 'is_pwd', type: 'boolean' },
                { header: 'If YES, please select your type of disability', db: 'pwd_type' },
                { header: 'Are you a member of any Indigenous Group?', db: 'is_indigenous', type: 'boolean' },
                { header: 'If YES, please choose below', db: 'indigenous_group' },
                { header: 'Have you ever witnessed or been aware of any incidents related to armed conflict or insurgency in your community?', db: 'witnessed_conflict', type: 'boolean' },
                { header: 'Do you feel safe in your community, or are there situations involving conflict or violence that concern you?', db: 'is_safe_in_community', type: 'boolean' },
                { header: 'ARE YOU A SOLO PARENT?', db: 'is_solo_parent', type: 'boolean' },
                { header: 'ARE YOU A SON/DAUGHTER OF A SOLO PARENT?', db: 'is_child_of_solo_parent', type: 'boolean' },
                // ===== FAMILY BACKGROUND =====
                { header: "MOTHER'S NAME", db: 'mother_name' },
                { header: "MOTHER'S OCCUPATION", db: 'mother_occupation' },
                { header: "MOTHER'S CONTACT NUMBER", db: 'mother_contact' },
                { header: "FATHER'S NAME", db: 'father_name' },
                { header: "FATHER'S OCCUPATION", db: 'father_occupation' },
                { header: "FATHER'S CONTACT NUMBER", db: 'father_contact' },
                { header: "PARENT'S ADDRESS", db: 'parent_address' },
                { header: 'NUMBER OF BROTHERS', db: 'num_brothers' },
                { header: 'NUMBER OF SISTERS', db: 'num_sisters' },
                { header: 'YOUR BIRTH ORDER IN THE FAMILY', db: 'birth_order' },
                { header: 'IF MARRIED, NAME OF SPOUSE', db: 'spouse_name' },
                { header: 'OCCUPATION', db: 'spouse_occupation' },
                { header: 'NUMBER OF CHILDREN', db: 'num_children' },
                // ===== GUARDIAN =====
                { header: 'FULL NAME', db: 'guardian_name' },
                { header: 'ADDRESS', db: 'guardian_address' },
                { header: 'CONTACT NUMBER', db: 'guardian_contact' },
                { header: 'RELATION TO THE GUARDIAN', db: 'guardian_relation' },
                // ===== PERSON TO CONTACT (IN CASE OF EMERGENCY) =====
                { header: 'FULL NAME', db: 'emergency_name' },
                { header: 'ADDRESS', db: 'emergency_address' },
                { header: 'RELATIONSHIP', db: 'emergency_relationship' },
                { header: 'CONTACT NUMBER', db: 'emergency_number' },
                // ===== EDUCATIONAL BACKGROUND =====
                { header: 'ELEMENTARY', db: 'elem_school' },
                { header: 'YEAR GRADUATED', db: 'elem_year_graduated' },
                { header: 'JUNIOR HIGH SCHOOL', db: 'junior_high_school' },
                { header: 'YEAR GRADUATED', db: 'junior_high_year_graduated' },
                { header: 'SENIOR HIGH SCHOOL', db: 'senior_high_school' },
                { header: 'YEAR GRADUATED', db: 'senior_high_year_graduated' },
                { header: 'COLLEGE', db: 'college_school' },
                { header: 'YEAR GRADUATED/CONTINUING', db: 'college_year_graduated' },
                { header: 'HONOR/AWARD RECEIVED', db: 'honors_awards' },
                // ===== EXTRA-CURRICULAR INVOLVEMENT =====
                { header: 'NAME OF ACTIVITIES', db: 'extracurricular_activities' },
                // ===== SCHOLARSHIPS =====
                { header: 'NAME OF SCHOLARSHIP AVAILED', db: 'scholarships_availed' },
            ];

            const headers = exportColumns.map(c => c.header);
            const rows = allStudents.map(s => exportColumns.map((col: any) => {
                const val = col.compute ? col.compute(s) : s[col.db];
                if (col.type === 'boolean') return val ? 'Yes' : 'No';
                return val ?? '';
            }));

            const wsData = [headers, ...rows];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
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
        : tableStudents.filter((student: any) => Boolean(getArchivedSnapshotForSchoolYear(student, schoolYearFilter)));

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
    const totalPages = Math.max(1, Math.ceil(effectiveTotal / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = sortedStudents;

    return (
        <div className="space-y-6 relative min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Population</h1>
                    <p className="text-slate-500 text-sm mt-1">Comprehensive management and analytics for the student body.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleExportExcel} leftIcon={<FileSpreadsheet size={16} />}>
                        Export Excel
                    </Button>
                    <Button variant="primary" onClick={() => setShowEnrollmentModal(true)} leftIcon={<Key size={16} />}>
                        Enrollment Keys
                    </Button>
                    <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 shadow-blue-200" onClick={() => setShowModal(true)} leftIcon={<Plus size={16} />}>
                        Add Student
                    </Button>
                    <Button variant="secondary" onClick={() => setViewMode(viewMode === 'list' ? 'stats' : 'list')} leftIcon={viewMode === 'list' ? <PieChart size={16} /> : <List size={16} />}>
                        {viewMode === 'list' ? 'View Stats' : 'View List'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Users size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Total Population</p>
                    <p className="text-2xl font-bold text-slate-900">{studentsList.length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-4"><TrendingUp size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Active Students</p>
                    <p className="text-2xl font-bold text-slate-900">{studentsList.filter(s => s.status === 'Active').length}</p>
                </div>
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center mb-4"><Activity size={24} /></div>
                    <p className="text-slate-600 text-sm mb-1">Support Requests</p>
                    <p className="text-2xl font-bold text-slate-900">-</p>
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
                tableLoading ? <div className="p-12 text-center text-slate-500">Loading students...</div> :
                    effectiveTotal === 0 ? <div className="p-12 text-center text-slate-500">No students found.</div> :
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                                                <button onClick={(e) => { e.stopPropagation(); setStudentToDelete(student); setShowDeleteModal(true); }} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {/* Pagination Controls */}
                            {effectiveTotal > 0 && (
                                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                                    <span className="text-xs text-slate-500">Showing {startIndex + 1} to {Math.min(startIndex + paginatedStudents.length, effectiveTotal)} of {effectiveTotal}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-50">Previous</button>
                                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 rounded border border-slate-300 bg-white text-xs disabled:opacity-50">Next</button>
                                    </div>
                                </div>
                            )}
                        </div>
            )}

            {/* Edit Student Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
            {showDeleteModal && studentToDelete && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Delete Student</h3>
                            <button onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }}>
                                <XCircle size={24} className="text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-700">
                                Delete <span className="font-semibold">{studentToDelete.first_name} {studentToDelete.last_name}</span> and their enrollment key?
                            </p>
                            <p className="text-xs text-slate-500">This action cannot be undone.</p>
                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => { setShowDeleteModal(false); setStudentToDelete(null); }} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="button" onClick={confirmDeleteStudent} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Student Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b flex justify-between items-center"><h3 className="font-bold text-lg">Add New Student</h3><button onClick={() => setShowModal(false)}><XCircle size={24} className="text-slate-400" /></button></div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-xs font-bold mb-1">First Name</label><input required name="firstName" value={studentForm.firstName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                                <div><label className="block text-xs font-bold mb-1">Last Name</label><input required name="lastName" value={studentForm.lastName} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            </div>
                            <div><label className="block text-xs font-bold mb-1">Student ID</label><input required name="studentId" pattern="\d{9}" title="Student ID must be exactly 9 digits" placeholder="Ex: 202612345" value={studentForm.studentId} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
                            <div><label className="block text-xs font-bold mb-1">Course</label><select required name="course" value={studentForm.course} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select...</option>{allCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold mb-1">Year Level</label>
                                    <select name="year" value={studentForm.year} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm">
                                        {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                    </select>
                                </div>
                                <div><label className="block text-xs font-bold mb-1">Status</label><select name="status" value={studentForm.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg text-sm"><option>Active</option><option>Inactive</option><option>Probation</option></select></div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border rounded-lg">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{isSubmitting ? 'Saving...' : 'Save Student'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enrollment Keys Modal */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                                        <select value={enrollmentStatusFilter} onChange={e => setEnrollmentStatusFilter(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-600 bg-white"><option value="All">All Statuses</option><option value="Pending">Pending</option><option value="Activated">Activated</option></select>
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
                                                        <span className={`px-2 py-1 rounded font-bold ${key.is_used ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{key.is_used ? 'Activated' : 'Pending'}</span>
                                                        <button onClick={() => handleDeleteKey(key.student_id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Key">
                                                            <Trash2 size={14} />
                                                        </button>
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
            {profileViewStudent && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-6" onClick={() => setProfileViewStudent(null)}>
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
                                                        <p className="text-sm font-semibold text-slate-800 break-words" title={String(value || '')}>
                                                            {value || <span className="text-slate-300 italic font-normal">—</span>}
                                                        </p>
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
            )}

            {/* Full Size Photo Modal */}
            {profileViewStudent && (
                <div
                    className={`fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 transition-all duration-300 ease-out ${showPhotoModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
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
            )}
        </div>
    );
};

export default StudentPopulationPage;


