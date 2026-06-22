import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, Search, XCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, FileSpreadsheet, RefreshCw, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getValidProfileImageUrl } from '../../utils/formatters';
import { getDepartmentNameFromCourseRecords } from '../../utils/courseDepartment';
import { openStoredAsset, resolveStoredAssetUrl } from '../../utils/storageAssets';
import { escapeSpreadsheetFormula } from '../../utils/inputSecurity';
import { getAllStudentsForExport, getStudentsPage, getDepartments, getCoursesWithDepartments } from '../../services/careStaffService';
import type { StudentFilters } from '../../types/query';

declare const XLSX: any;

const STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS = 60 * 60 * 24 * 7;

// Exact PROFILE_CATEGORIES from care staff student population page
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
].filter(category => category.fields.length > 0);

const CARE_STUDENT_PAGE_SIZE = 10;
const getCareStudentTotalPages = (totalItems: number) => Math.max(1, Math.ceil(Math.max(0, totalItems) / CARE_STUDENT_PAGE_SIZE));

export default function RegistrarStudentPopulationPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Filters
    const [departmentFilter, setDepartmentFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [yearFilter, setYearFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

    // Reference data
    const [departments, setDepartments] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    
    // Profile Modal
    const [profileViewStudent, setProfileViewStudent] = useState<any>(null);
    const [profileCategoryIndex, setProfileCategoryIndex] = useState(0);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const depts = await getDepartments();
                const crs = await getCoursesWithDepartments();
                setDepartments(depts);
                setCourses(crs);
            } catch (err) {
                console.error('Error fetching filter data:', err);
            }
        };
        fetchFilters();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const filters: StudentFilters = {
                search: searchTerm,
                department: departmentFilter !== 'All' ? departmentFilter : undefined,
                course: courseFilter !== 'All' ? courseFilter : undefined,
                yearLevel: yearFilter !== 'All' ? yearFilter : undefined,
                status: statusFilter !== 'All' ? statusFilter : undefined,
            };
            const result = await getStudentsPage(filters, { page: currentPage, pageSize: CARE_STUDENT_PAGE_SIZE }, { column: 'last_name', ascending: true });
            setStudents(result.rows);
            setTotalStudents(result.total);
        } catch (error) {
            console.error('Error fetching students:', error);
            alert('Failed to load students');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [currentPage, searchTerm, departmentFilter, courseFilter, yearFilter, statusFilter]);

    const handleExportExcel = async () => {
        if (typeof XLSX === 'undefined') {
            alert('Excel library not loaded. Please try again.');
            return;
        }
        setIsExporting(true);
        try {
            const allStudents = await getAllStudentsForExport();
            if (!allStudents || allStudents.length === 0) {
                alert('No students to export.');
                setIsExporting(false);
                return;
            }

            const fileLinkCache = new Map<string, string>();
            const resolveExportFileLink = async (bucket: string, value: unknown) => {
                const rawValue = String(value || '').trim();
                if (!rawValue) return '';
                const cacheKey = `${bucket}:${rawValue}`;
                if (fileLinkCache.has(cacheKey)) return fileLinkCache.get(cacheKey) || '';
                
                const resolvedUrl = await resolveStoredAssetUrl(bucket, rawValue, STUDENT_PROFILE_EXPORT_LINK_EXPIRES_SECONDS);
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
                        ws[cellRef].l = { Target: fileUrl, Tooltip: 'Open uploaded file' };
                    }
                });
            });
            
            ws['!cols'] = headers.map((h: string) => ({ wch: Math.max(h.length, 18) }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Student Profiles');
            XLSX.writeFile(wb, `Registrar_Student_Profiles_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err: any) {
            console.error('Export error:', err);
            alert('Export failed: ' + err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const openProfileModal = async (student: any) => {
        setProfileLoading(true);
        setProfileCategoryIndex(0);
        try {
            const { data, error } = await supabase
                .from('students')
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
    const filteredCourses = courseFilter === 'All' 
        ? courses 
        : courses.filter(c => getDepartmentNameFromCourseRecords(c.department_id, departments) === departmentFilter);

    const totalPages = getCareStudentTotalPages(totalStudents);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                <div className="flex gap-3 w-full md:w-auto">
                    <button 
                        onClick={handleExportExcel} 
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                    >
                        {isExporting ? <RefreshCw size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                        Export Profiles to Excel
                    </button>
                    <button 
                        onClick={fetchStudents} 
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh List
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm flex flex-col gap-4">
                <div className="relative w-full">
                    <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by Name or ID..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setCourseFilter('All'); setCurrentPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 w-full sm:w-[180px] truncate">
                        <option value="All">All Departments</option>
                        {departmentNames.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 w-full sm:w-[180px] truncate">
                        <option value="All">All Courses</option>
                        {filteredCourses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 w-[120px]">
                        <option value="All">All Years</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="5th Year">5th Year</option>
                    </select>
                    <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }} className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-slate-700 w-[120px]">
                        <option value="All">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    {(searchTerm || departmentFilter !== 'All' || courseFilter !== 'All' || yearFilter !== 'All' || statusFilter !== 'All') && (
                        <button onClick={() => { setSearchTerm(''); setDepartmentFilter('All'); setCourseFilter('All'); setYearFilter('All'); setStatusFilter('All'); setCurrentPage(1); }} className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">Reset</button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[28rem] flex-col">
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Course & Year</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan={4} className="h-[360px] p-12 text-center text-slate-500">Loading students...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan={4} className="h-[360px] p-12 text-center text-slate-500">No students found.</td></tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} onClick={() => openProfileModal(student)} className="hover:bg-slate-50 cursor-pointer transition-colors">
                                        <td className="px-6 py-4"><span className="font-bold text-slate-900">{student.last_name}, {student.first_name} {student.middle_name || ''}</span></td>
                                        <td className="px-6 py-4 font-mono text-slate-600">{student.student_id}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-800">{student.course || '-'}</div>
                                            <div className="text-xs text-slate-500">{student.year_level || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${student.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{student.status}</span>
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
                        <button disabled={currentPage === 1 || loading} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronLeft size={16} /></button>
                        <span className="px-3 font-medium text-slate-700">Page {currentPage} of {totalPages}</span>
                        <button disabled={currentPage === totalPages || loading} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="px-2 py-1 border rounded bg-white hover:bg-slate-50 disabled:opacity-50"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            {profileViewStudent && typeof document !== 'undefined' && createPortal(
                <>
                <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setProfileViewStudent(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => profileViewStudent?.profile_picture_url && setShowPhotoModal(true)}
                                    className={`w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg shadow-teal-200 ${profileViewStudent?.profile_picture_url ? 'cursor-pointer hover:opacity-90 hover:ring-2 hover:ring-teal-400 transition-all focus:outline-none' : 'cursor-default'}`}
                                >
                                    {profileViewStudent.profile_picture_url ? (
                                        <img src={getValidProfileImageUrl(profileViewStudent.profile_picture_url)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                            <button onClick={() => setProfileViewStudent(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full transition shadow-sm border border-slate-100">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
                            <div className="sm:w-64 bg-slate-50 border-r border-slate-100 overflow-y-auto shrink-0 py-2">
                                <div className="flex sm:flex-col gap-1 px-2">
                                    {PROFILE_CATEGORIES.map((cat, i) => (
                                        <button
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
                                                                        await openStoredAsset('support_documents', String(value));
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

                {/* Photo Modal */}
                {showPhotoModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowPhotoModal(false)}>
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => setShowPhotoModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center z-10">
                                <XCircle size={20} />
                            </button>
                            <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
                                {profileViewStudent.profile_picture_url ? (
                                    <img src={getValidProfileImageUrl(profileViewStudent.profile_picture_url)} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                    <User size={80} className="text-slate-300" />
                                )}
                            </div>
                        </div>
                    </div>
                )}
                </>,
                document.body
            )}
        </div>
    );
}
