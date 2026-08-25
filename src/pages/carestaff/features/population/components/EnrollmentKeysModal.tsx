import { useState, useEffect } from 'react';
import { Search, Download, UploadCloud, Info, RefreshCw, Settings, Plus, XCircle, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { AsyncButton, useAsyncHandler } from '../../../../../components/ui/Button';
import { YEAR_LEVEL_OPTIONS } from '../constants';
import { buildCareStudentPaginationItems } from '../utils';

interface EnrollmentKeysModalProps {
    allCourses: any[];
    allDepartments: any[];
    applyBulkCourseYearWindow: () => Promise<void>;
    bulkTargetCount: number;
    bulkWindowForm: any;
    clearBulkCourseYearWindow: () => Promise<void>;
    courseApplicantCounts: Record<string, number>;
    courseApplicantCountsLoading: boolean;
    courseDeptFilter: string;
    courseForm: any;
    courseRowsForManagement: any[];
    departmentNames: string[];
    enrollmentKeys: any[];
    enrollmentSearchQuery: string;
    enrollmentStatusFilter: string;
    handleAddCourse: (e: React.FormEvent) => Promise<void>;
    handleBulkUpload: (e: any) => void | Promise<void>;
    handleDeleteKey: (keyId: string) => Promise<void>;
    handleDownloadTemplate: () => void | Promise<void>;
    handleGenerateKey: (e: React.FormEvent) => Promise<void>;
    handleUpdateCourseLimit: (courseId: number, field: any, value: string) => Promise<void>;
    modalState: any;
    setBulkWindowForm: (form: any) => void;
    setCourseDeptFilter: (filter: string) => void;
    setCourseForm: (form: any) => void;
    setEnrollmentSearchQuery: (query: string) => void;
    setEnrollmentStatusFilter: (filter: string) => void;
    setSettingsTab: (tab: 'keys' | 'limits' | 'global') => void;
    setShowEnrollmentModal: (show: boolean) => void;
    settingsTab: 'keys' | 'limits' | 'global';
    syncEnrollmentKeysFromStudents: () => Promise<void>;
    totalEnrollmentKeysCount: number;
}

const KEYS_PAGE_SIZE = 8;

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
}: EnrollmentKeysModalProps) => {
    const { canArchiveRecords, isApplyingBulkWindow, isSyncingBulkKeys, showEnrollmentModal } = modalState;
    const [onGenerateKey, isGeneratingKey] = useAsyncHandler(handleGenerateKey);
    const [onAddCourse, isAddingCourse] = useAsyncHandler(handleAddCourse);

    const [keysPage, setKeysPage] = useState(1);

    // Reset keys pagination on search or filter change
    useEffect(() => {
        setKeysPage(1);
    }, [enrollmentSearchQuery, enrollmentStatusFilter]);

    if (!showEnrollmentModal) return null;

    const totalFilteredKeys = enrollmentKeys.length;
    const totalKeysPages = Math.max(1, Math.ceil(totalFilteredKeys / KEYS_PAGE_SIZE));
    const safeKeysPage = Math.min(keysPage, totalKeysPages);
    const startKeysIndex = (safeKeysPage - 1) * KEYS_PAGE_SIZE;
    const endKeysIndex = Math.min(startKeysIndex + KEYS_PAGE_SIZE, totalFilteredKeys);
    const paginatedKeys = enrollmentKeys.slice(startKeysIndex, endKeysIndex);
    const keysPaginationItems = buildCareStudentPaginationItems(safeKeysPage, totalKeysPages);

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
            {/* Click outside to close (transparent backdrop) */}
            <button
                type="button"
                aria-label="Close system settings backdrop"
                onClick={() => setShowEnrollmentModal(false)}
                className="absolute inset-0 bg-transparent focus:outline-none cursor-default"
            />

            {/* Modal Dialog with comfortable spacing from ceiling and bottom */}
            <div className="relative z-10 bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.28)] w-full max-w-4xl max-h-[calc(100%-2.5rem)] overflow-hidden flex flex-col border border-slate-200/90 animate-scale-in">
                {/* Dark Purple Gradient Header Banner */}
                <div className="bg-gradient-to-r from-[#170529] via-[#2a0b4d] to-[#170529] p-5 px-6 flex justify-between items-center text-white border-b border-purple-900/40 shrink-0">
                    <div>
                        <h3 className="font-extrabold text-lg sm:text-xl tracking-tight flex items-center gap-2.5 text-white">
                            <Settings size={20} className="text-purple-300" />
                            System Settings &amp; Enrollment Keys
                        </h3>
                        <p className="text-purple-200/80 text-xs mt-0.5 font-medium">Manage ID whitelists, course capacity limits, and confirmation windows.</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close system settings"
                        onClick={() => setShowEnrollmentModal(false)}
                        className="text-purple-200 hover:text-white transition-colors p-1.5 rounded-xl hover:bg-white/10"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200/80 px-6 pt-2 bg-slate-50/70 shrink-0">
                    <button
                        type="button"
                        onClick={() => setSettingsTab('keys')}
                        className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${settingsTab === 'keys'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Enrollment Keys
                    </button>
                    <button
                        type="button"
                        onClick={() => setSettingsTab('limits')}
                        className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${settingsTab === 'limits'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Course Limits
                    </button>
                    <button
                        type="button"
                        onClick={() => setSettingsTab('global')}
                        className={`px-4 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors ${settingsTab === 'global'
                            ? 'border-purple-600 text-purple-700'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Global Updates
                    </button>
                </div>

                {/* Tab Body */}
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar min-h-0">
                    {settingsTab === 'keys' && (
                        <div className="space-y-6">
                            <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 text-xs text-purple-900">
                                <p className="font-bold mb-1 flex items-center gap-1.5"><Info size={14} className="text-purple-600" /> How ID Whitelisting works:</p>
                                <p className="text-purple-800/80 leading-relaxed">This list acts as a <strong>whitelist of valid IDs</strong>. Student profiles will appear in the active population only <strong>after</strong> the student activates their account using one of these keys.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Manual Entry */}
                                <div className="border border-slate-200/80 rounded-2xl p-4.5 bg-slate-50/40 space-y-3">
                                    <p className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Option 1: Manual Entry</p>
                                    <form onSubmit={onGenerateKey} className="flex flex-col gap-2.5">
                                        <input
                                            required
                                            name="enrollmentId"
                                            aria-label="Student ID"
                                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs md:text-sm font-medium bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10"
                                            placeholder="Ex: 420123456"
                                            pattern="\d{9}"
                                            title="Student ID must be exactly 9 digits"
                                        />
                                        <select
                                            required
                                            name="enrollmentCourse"
                                            aria-label="Enrollment course"
                                            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs md:text-sm font-medium bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10"
                                        >
                                            <option value="">Select Course</option>
                                            {allCourses.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                                        </select>
                                        <div className="flex gap-2">
                                            <select
                                                required
                                                name="enrollmentYear"
                                                aria-label="Enrollment year"
                                                defaultValue="1st Year"
                                                className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs md:text-sm font-medium bg-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10"
                                            >
                                                {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                            <button
                                                type="submit"
                                                aria-label={isGeneratingKey ? 'Generating enrollment key' : 'Generate enrollment key'}
                                                disabled={isGeneratingKey}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition shadow-sm disabled:opacity-60 flex items-center justify-center"
                                            >
                                                {isGeneratingKey ? <RefreshCw size={15} className="animate-spin" /> : <Plus size={16} />}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Bulk Upload */}
                                <div className="border border-slate-200/80 rounded-2xl p-4.5 bg-slate-50/40 flex flex-col justify-between">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="block text-xs font-bold text-slate-800 uppercase tracking-wider">Option 2: Bulk Upload</p>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            className="text-xs text-purple-700 hover:underline font-bold flex items-center gap-1"
                                        >
                                            <Download size={13} /> Template
                                        </button>
                                    </div>
                                    <div className="relative border-2 border-dashed border-purple-200 rounded-2xl p-6 text-center hover:bg-purple-50/30 transition group cursor-pointer flex-1 flex flex-col justify-center items-center">
                                        <input
                                            type="file"
                                            aria-label="Upload enrollment keys file"
                                            accept=".csv,.txt,.xlsx,.xls"
                                            onChange={handleBulkUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="group-hover:scale-110 transition-transform duration-200 mb-1">
                                            <UploadCloud size={24} className="text-purple-600" />
                                        </div>
                                        <p className="text-xs font-bold text-slate-700">Upload CSV or Excel</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Drag and drop file here or click to browse</p>
                                    </div>
                                </div>
                            </div>

                            {/* Existing Keys Table */}
                            <div className="border border-slate-200/80 rounded-2xl p-4.5 bg-white space-y-3">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-900">Existing Keys ({totalEnrollmentKeysCount})</h4>
                                        <p className="text-[11px] text-slate-400 font-medium">
                                            Showing {totalFilteredKeys > 0 ? `${startKeysIndex + 1}-${endKeysIndex}` : '0'} of {totalFilteredKeys} filtered keys
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <div className="relative">
                                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search Student ID or Course..."
                                                value={enrollmentSearchQuery}
                                                onChange={e => setEnrollmentSearchQuery(e.target.value)}
                                                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white w-full sm:w-56"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="enrollment-status-filter" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Status:</label>
                                            <select
                                                id="enrollment-status-filter"
                                                value={enrollmentStatusFilter}
                                                onChange={e => setEnrollmentStatusFilter(e.target.value)}
                                                className="w-full sm:w-32 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                                            >
                                                <option value="All">All</option>
                                                <option value="Pending">Pending</option>
                                                <option value="Activated">Activated</option>
                                                <option value="Revoked">Revoked</option>
                                                <option value="Archived">Archived</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {paginatedKeys.map((key: any) => (
                                        <div key={key.student_id} className="flex justify-between items-center p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs hover:shadow-2xs transition-shadow">
                                            <div>
                                                <span className="font-mono font-bold text-slate-900">{key.student_id}</span>
                                                <span className="block text-slate-500 truncate max-w-[280px] text-[11px] mt-0.5" title={key.course}>{key.course} &bull; {key.year_level || 'Year not set'}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${String(key.status || '') === 'Archived'
                                                    ? 'bg-slate-100 text-slate-700'
                                                    : String(key.status || '') === 'Revoked'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200/60'
                                                        : key.is_used
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${key.is_used ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                    {key.status || (key.is_used ? 'Activated' : 'Pending')}
                                                </span>
                                                {canArchiveRecords && String(key.status || '') !== 'Archived' && String(key.status || '') !== 'Revoked' && (
                                                    <AsyncButton
                                                        onClick={() => handleDeleteKey(key.student_id)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-60"
                                                        title="Revoke Key"
                                                    >
                                                        <XCircle size={15} />
                                                    </AsyncButton>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {paginatedKeys.length === 0 && <p className="text-center text-slate-400 text-xs py-8 font-medium">No keys found.</p>}
                                </div>

                                {/* Keys Pagination */}
                                {totalFilteredKeys > 0 && (
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                                        <span className="text-slate-400 font-medium">
                                            Page {safeKeysPage} of {totalKeysPages}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setKeysPage(1)}
                                                disabled={safeKeysPage === 1}
                                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="First page"
                                            >
                                                <ChevronsLeft size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setKeysPage((p) => Math.max(1, p - 1))}
                                                disabled={safeKeysPage === 1}
                                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeft size={12} />
                                            </button>

                                            {keysPaginationItems.map((item, index) => (
                                                typeof item === 'number' ? (
                                                    <button
                                                        key={`keys-page-${item}`}
                                                        type="button"
                                                        onClick={() => setKeysPage(item)}
                                                        className={`inline-flex h-6 min-w-6 items-center justify-center rounded-lg border px-1.5 text-xs font-bold transition ${item === safeKeysPage
                                                            ? 'border-purple-600 bg-purple-600 text-white shadow-2xs'
                                                            : 'border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:text-purple-700'
                                                            }`}
                                                    >
                                                        {item}
                                                    </button>
                                                ) : (
                                                    <span key={`keys-ellipsis-${index}`} className="inline-flex h-6 min-w-6 items-center justify-center text-slate-400 text-xs">
                                                        ...
                                                    </span>
                                                )
                                            ))}

                                            <button
                                                type="button"
                                                onClick={() => setKeysPage((p) => Math.min(totalKeysPages, p + 1))}
                                                disabled={safeKeysPage === totalKeysPages}
                                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Next page"
                                            >
                                                <ChevronRight size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setKeysPage(totalKeysPages)}
                                                disabled={safeKeysPage === totalKeysPages}
                                                className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-600 transition hover:border-purple-200 hover:text-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Last page"
                                            >
                                                <ChevronsRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {settingsTab === 'limits' && (
                        <div className="space-y-5">
                            <div className="border border-slate-200/80 rounded-2xl p-4.5 bg-slate-50/40 space-y-4">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900">Course &amp; Applicant Limits</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Maintain per-course applicant and enrolled capacity limits, grouped by department.</p>
                                </div>

                                <form onSubmit={onAddCourse} className="grid grid-cols-1 md:grid-cols-8 gap-2.5">
                                    <input
                                        type="text"
                                        className="md:col-span-3 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                                        placeholder="Course name"
                                        value={courseForm.name}
                                        onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                                        required
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        className="md:col-span-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white text-center"
                                        placeholder="Capacity"
                                        value={courseForm.capacity}
                                        onChange={e => setCourseForm({ ...courseForm, capacity: parseInt(e.target.value || '0', 10) })}
                                        required
                                        title="Enrolled Student Capacity Limit"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        className="md:col-span-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white text-center"
                                        placeholder="Applicants"
                                        value={courseForm.application_limit}
                                        onChange={e => setCourseForm({ ...courseForm, application_limit: parseInt(e.target.value || '0', 10) })}
                                        required
                                        title="NAT Application Limit"
                                    />
                                    <select
                                        aria-label="Course department"
                                        className="md:col-span-2 px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                                        value={courseForm.department_id}
                                        onChange={e => setCourseForm({ ...courseForm, department_id: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled>Select department</option>
                                        {allDepartments.map((dept: any) => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                    </select>
                                    <button
                                        type="submit"
                                        disabled={isAddingCourse}
                                        className="md:col-span-1 px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition disabled:opacity-60 shadow-sm"
                                    >
                                        {isAddingCourse ? 'Adding...' : 'Add'}
                                    </button>
                                </form>

                                <div className="space-y-1">
                                    <label htmlFor="course-department-filter" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter Courses by Department</label>
                                    <select
                                        id="course-department-filter"
                                        value={courseDeptFilter}
                                        onChange={e => setCourseDeptFilter(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-500 bg-white"
                                    >
                                        <option value="All">All Departments</option>
                                        {departmentNames.map((deptName: string) => <option key={deptName} value={deptName}>{deptName}</option>)}
                                    </select>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white max-h-[380px] custom-scrollbar">
                                    <table className="w-full text-left text-xs relative">
                                        <thead className="bg-slate-50 text-slate-400 uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
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
                                                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 font-medium">No courses found.</td></tr>
                                            ) : courseRowsForManagement.map((course: any) => {
                                                const department = allDepartments.find((d: any) => d.id === course.department_id);
                                                return (
                                                    <tr key={course.id} className="odd:bg-white even:bg-slate-50/40 hover:bg-purple-50/30 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-800">{course.name}</td>
                                                        <td className="px-4 py-3 text-slate-500 font-medium">{department?.name || 'Unassigned'}</td>
                                                        <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">
                                                            {courseApplicantCountsLoading ? '...' : (courseApplicantCounts[course.name] || 0)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-semibold focus:outline-none focus:border-purple-500"
                                                                defaultValue={course.capacity ?? 500}
                                                                onBlur={e => handleUpdateCourseLimit(course.id, 'capacity', e.target.value)}
                                                                title="Change Enrolled Capacity Limit"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-center font-semibold focus:outline-none focus:border-purple-500"
                                                                defaultValue={course.application_limit ?? 200}
                                                                onBlur={e => handleUpdateCourseLimit(course.id, 'application_limit', e.target.value)}
                                                                title="Change Applicant Limit"
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
                    )}

                    {settingsTab === 'global' && (
                        <div className="space-y-6 max-w-2xl mx-auto">
                            <div className="border border-slate-200/80 rounded-2xl p-6 bg-slate-50/40 space-y-4">
                                <div>
                                    <h4 className="font-bold text-base text-slate-900">Global Course &amp; Year Confirmation Window</h4>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                        Apply a unified confirmation window to students matching current filters.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label htmlFor="bulk-window-start" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Start Time</label>
                                        <input
                                            id="bulk-window-start"
                                            type="datetime-local"
                                            value={bulkWindowForm.start}
                                            onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, start: e.target.value }))}
                                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-purple-500 font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label htmlFor="bulk-window-end" className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">End Time</label>
                                        <input
                                            id="bulk-window-end"
                                            type="datetime-local"
                                            value={bulkWindowForm.end}
                                            onChange={(e) => setBulkWindowForm((prev: any) => ({ ...prev, end: e.target.value }))}
                                            className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-purple-500 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="bg-white border border-purple-100 rounded-xl p-3.5 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-600">Target students based on current filters:</span>
                                    <span className="font-extrabold text-purple-900 text-base px-3 py-1 bg-purple-50 rounded-lg">{bulkTargetCount}</span>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={applyBulkCourseYearWindow}
                                        disabled={isApplyingBulkWindow}
                                        className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl disabled:opacity-60 transition shadow-sm"
                                    >
                                        {isApplyingBulkWindow ? 'Applying...' : 'Apply Window'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearBulkCourseYearWindow}
                                        disabled={isApplyingBulkWindow}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl disabled:opacity-60 transition"
                                    >
                                        Clear Window
                                    </button>
                                </div>
                            </div>

                            <div className="border border-purple-100 rounded-2xl p-6 bg-purple-50/40 space-y-3">
                                <h4 className="font-bold text-base text-purple-900">Sync Enrollment Keys</h4>
                                <p className="text-xs text-purple-700/80 leading-relaxed">Manually synchronize the enrollment keys whitelist with the currently active student records.</p>
                                <button
                                    type="button"
                                    onClick={syncEnrollmentKeysFromStudents}
                                    disabled={isSyncingBulkKeys}
                                    className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl disabled:opacity-60 transition shadow-sm"
                                >
                                    {isSyncingBulkKeys ? 'Syncing...' : 'Sync Keys (Optional)'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnrollmentKeysModal;
