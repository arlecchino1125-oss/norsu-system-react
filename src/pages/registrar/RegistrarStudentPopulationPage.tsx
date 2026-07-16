import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Users, Search, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, RefreshCw, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ResolvedProfileImage } from '../../components/ResolvedProfileImage';
import { getProfileCategoryForDatabaseField } from '../../services/r2DocumentService';
import { getDepartmentNameFromCourseRecords } from '../../utils/courseDepartment';
import { openStoredAsset } from '../../utils/storageAssets';
import { getStudentsPage, getDepartments, getCoursesWithDepartments } from '../../services/careStaffService';
import type { StudentFilters } from '../../types/query';

// Registrar-safe profile categories: identity / enrollment / academic only.
// Sensitive sections (Family, Socio-Economic incl. PWD/pregnancy/4Ps/orphan,
// Guardian, Emergency, and criminal-history) are intentionally excluded — the
// Registrar has no operational need for them, and students_directory (the source
// this modal reads from) does not expose those columns.
const PROFILE_CATEGORIES = [
    {
        key: 'personal', label: 'Personal Information', icon: '\u{1F464}', gradient: 'from-teal-500 to-cyan-400', fields: [
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
        ]
    },
].filter(category => category.fields.length > 0);

const isProfileIncompleteStep1 = (student: any) => {
    if (!student) return true;
    const requiredFields = [
        student.profile_picture_url,
        student.student_id,
        student.first_name,
        student.last_name,
        student.middle_name,
        student.street,
        student.city,
        student.province,
        student.zip_code,
        student.region,
        student.mobile,
        student.dob,
        student.sex,
        student.gender_identity,
        student.nationality,
        student.facebook_url,
        student.place_of_birth,
        student.religion,
        student.year_level,
        student.department,
        student.course,
        student.civil_status
    ];
    return requiredFields.some(val => !String(val || '').trim());
};

const CARE_STUDENT_PAGE_SIZE = 10;
const CARE_STUDENT_SEARCH_DEBOUNCE_MS = 250;
const getCareStudentTotalPages = (totalItems: number) => Math.max(1, Math.ceil(Math.max(0, totalItems) / CARE_STUDENT_PAGE_SIZE));

export default function RegistrarStudentPopulationPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Filters
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Profile Modal
    const [profileViewStudent, setProfileViewStudent] = useState<any>(null);
    const [profileCategoryIndex, setProfileCategoryIndex] = useState(0);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearchTerm(searchTerm);
        }, CARE_STUDENT_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    // Reference data — fetched once, cached until page unloads
    const { data: departments = [] } = useQuery({
        queryKey: ['registrar_departments'],
        queryFn: getDepartments,
        staleTime: Infinity
    });

    const { data: courses = [] } = useQuery({
        queryKey: ['registrar_courses'],
        queryFn: getCoursesWithDepartments,
        staleTime: Infinity
    });

    // Student list — re-fetches only when a filter/page combo is new
    const studentsQuery = useQuery({
        queryKey: ['registrar_students', currentPage, debouncedSearchTerm, departmentFilter, courseFilter, yearFilter, statusFilter],
        queryFn: async () => {
            const filters: StudentFilters = {
                search: debouncedSearchTerm,
                department: departmentFilter !== 'All' ? departmentFilter : undefined,
                course: courseFilter !== 'All' ? courseFilter : undefined,
                yearLevel: yearFilter !== 'All' ? yearFilter : undefined,
                status: statusFilter !== 'All' ? statusFilter : undefined,
            };
            return getStudentsPage(filters, { page: currentPage, pageSize: CARE_STUDENT_PAGE_SIZE }, { column: 'last_name', ascending: true });
        }
    });

    const students = studentsQuery.data?.rows ?? [];
    const totalStudents = studentsQuery.data?.total ?? 0;
    const loading = studentsQuery.isLoading;

    const openProfileModal = async (student: any) => {
        setProfileLoading(true);
        setProfileCategoryIndex(0);
        try {
            const { data, error } = await supabase
                .from('students_directory')
                .select('*')
                .eq('student_id', student.student_id)
                .single();
            if (error) throw error;
            setProfileViewStudent(data);
        } catch (err) {
            console.error(err);
            setProfileViewStudent(student);
        }
        setProfileLoading(false);
    };

    const departmentNames = departments.map(d => d.name);
    const filteredCourses = departmentFilter === 'All'
        ? courses
        : courses.filter(c => getDepartmentNameFromCourseRecords(c.name, courses, departments) === departmentFilter);

    const totalPages = getCareStudentTotalPages(totalStudents);

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Left Column: Actions & Filters */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
                {/* Actions card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <button type="button"
                        onClick={() => studentsQuery.refetch()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh List
                    </button>
                </div>

                {/* Filters card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search & Filters</h3>

                    <div className="relative w-full">
                        <Search size={18} className="absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by Name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 bg-slate-50 focus:bg-white transition-all"
                        />
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">College</label>
                            <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCourseFilter('All'); setCurrentPage(1); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 truncate">
                                <option value="All">All Departments</option>
                                {departmentNames.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Program</label>
                            <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 truncate">
                                <option value="All">All Courses</option>
                                {filteredCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Year Level</label>
                            <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700">
                                <option value="All">All Years</option>
                                <option value="1st Year">1st Year</option>
                                <option value="2nd Year">2nd Year</option>
                                <option value="3rd Year">3rd Year</option>
                                <option value="4th Year">4th Year</option>
                                <option value="5th Year">5th Year</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Status</label>
                            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700">
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Incomplete">Incomplete</option>
                            </select>
                        </div>
                    </div>

                    {(searchTerm || departmentFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || statusFilter !== 'All') && (
                        <button type="button"
                            onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); setCourseFilter('All'); setYearFilter('All'); setStatusFilter('All'); setCurrentPage(1); }}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-red-100 mt-2"
                        >
                            Reset Filters
                        </button>
                    )}
                </div>
            </div>

            {/* Right Column: Student Table */}
            <div className="flex-1 min-w-0 w-full">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[28rem] flex-col">
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">ID</th>
                                    <th className="px-6 py-4">Course & Year</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">Loading students...</td></tr>
                                ) : students.length === 0 ? (
                                    <tr><td colSpan={5} className="h-[360px] p-12 text-center text-slate-500">No students found.</td></tr>
                                ) : (
                                    students.map(student => (
                                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4"><span className="font-bold text-slate-900">{student.last_name}, {student.first_name} {student.middle_name || ''}</span></td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{student.student_id}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800">{student.course || '-'}</div>
                                                <div className="text-xs text-slate-500">{student.year_level || '-'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isProfileIncompleteStep1(student) ? (
                                                    <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">Incomplete</span>
                                                ) : (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{student.status}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button type="button" onClick={() => openProfileModal(student)} className="cursor-pointer rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">View profile</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 text-xs md:flex-row md:items-center md:justify-between">
                        <span className="text-slate-500">
                            {loading ? 'Loading...' : `Showing ${(currentPage - 1) * CARE_STUDENT_PAGE_SIZE + 1}-${Math.min(currentPage * CARE_STUDENT_PAGE_SIZE, totalStudents)} of ${totalStudents} students`}
                        </span>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={currentPage === 1 || loading} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                            <span className="px-3 font-medium text-slate-700">Page {currentPage} of {totalPages}</span>
                            <button type="button" disabled={currentPage === totalPages || loading} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            {profileViewStudent && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <button type="button" aria-label="Close student profile" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400" onClick={() => setProfileViewStudent(null)} />
                        <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <button type="button"
                                        onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                        className={`w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg shadow-teal-200 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-teal-400 transition-all focus:outline-none' : 'cursor-default'}`}
                                    >
                                        {profileViewStudent.profile_picture_url ? (
                                            <ResolvedProfileImage storedValue={profileViewStudent.profile_picture_url} studentId={profileViewStudent.student_id} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" previewOnClick={false} />
                                        ) : (
                                            <span>{profileViewStudent.first_name?.[0] || 'S'}</span>
                                        )}
                                    </button>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">
                                            {profileViewStudent.last_name}, {profileViewStudent.first_name} {profileViewStudent.suffix || ''} {profileViewStudent.middle_name || ''}
                                        </h2>
                                        <p className="text-sm text-slate-500 font-mono">{profileViewStudent.student_id} &bull; {profileViewStudent.course} &bull; {profileViewStudent.year_level}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setProfileViewStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full transition shadow-sm border border-slate-100">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                                <div className="sm:w-64 bg-slate-50 border-r border-slate-100 overflow-y-auto shrink-0 py-2">
                                    <div className="flex sm:flex-col gap-1 px-2">
                                        {PROFILE_CATEGORIES.map((cat, i) => (
                                            <button type="button"
                                                key={cat.key}
                                                onClick={() => setProfileCategoryIndex(i)}
                                                className={`text-left px-4 py-3 flex items-center gap-3 text-sm transition-all rounded-lg ${profileCategoryIndex === i
                                                    ? 'bg-white text-teal-700 font-bold border border-teal-100 shadow-sm'
                                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 border border-transparent'
                                                    }`}
                                            >
                                                <span className="text-lg">{cat.icon}</span>
                                                <span className="truncate">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-white">
                                    {profileLoading ? (
                                        <div className="flex items-center justify-center h-64 text-slate-400">Loading student data...</div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-3 mb-6">
                                                <span className={`p-2 rounded-lg bg-gradient-to-br ${PROFILE_CATEGORIES[profileCategoryIndex].gradient} text-white text-lg`}>
                                                    {PROFILE_CATEGORIES[profileCategoryIndex].icon}
                                                </span>
                                                <h3 className="text-xl font-bold text-slate-900">{PROFILE_CATEGORIES[profileCategoryIndex].label}</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {PROFILE_CATEGORIES[profileCategoryIndex].fields.map((field: any, idx: number) => {
                                                    let value = field.compute ? field.compute(profileViewStudent) : profileViewStudent[field.db];
                                                    if (field.type === 'boolean') value = value ? 'Yes' : 'No';
                                                    return (
                                                        <div key={(field.db || '') + field.label + idx} className="min-w-0">
                                                            <p className="text-[11px] text-slate-500 uppercase font-bold tracking-wide mb-1">{field.label}</p>
                                                            {field.type === 'profilePhoto' && value ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShowPhotoModal(true)}
                                                                    className="inline-flex items-center rounded-lg border border-teal-100 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
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
                                                                            alert(error.message || 'Unable to open the selected file.');
                                                                        }
                                                                    }}
                                                                    className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                                                                >
                                                                    View file
                                                                </button>
                                                            ) : (
                                                                <p className="text-sm font-semibold text-slate-800 break-words">
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
                        </div>
                    </div>

                    {/* Full Size Photo Modal */}
                    <div
                        className={`fixed inset-0 z-[70] flex items-center justify-center bg-transparent p-4 transition-all duration-300 ease-out ${showPhotoModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        inert={!showPhotoModal}
                    >
                        <button type="button" aria-label="Close profile photo" className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-400" onClick={() => setShowPhotoModal(false)} />
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
        </div>
    );
}
