import React from 'react';
import {
    ArrowRightLeft,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    ClipboardList,
    Clock,
    Download,
    FileText,
    Inbox,
    Info,
    ListChecks,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Send,
    Trash2,
    Upload,
    Users,
    XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate, formatDateTime, formatTime } from '../../../../../utils/formatters';
import StatusBadge from '../../../../../components/StatusBadge';
import { Button } from '../../../../../components/ui/Button';

const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.05 } }
} as const;

const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 28 } }
} as const;

import NatPaginationControls from './NatPaginationControls';
import { useCareStaffNat } from '../hooks/useCareStaffNat';
import NatApplicationDetailsModal from './NatApplicationDetailsModal';
import NatScheduleModal from './NatScheduleModal';
import {
    PASS_STATUS,
    FAIL_STATUS,
    INTERVIEW_STATUS,
    NAT_TABLE_SHELL_CLASS
} from '../constants';
import {
    renderTablePaddingRows,
    isNatFinalizedStatus,
    buildApplicantName,
    getApplicantRouteLabel
} from '../utils';

const TH_CLASS = 'px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400/80 border-b border-slate-100 bg-slate-50/40';
const TD_CLASS = 'px-4 py-2.5 align-middle text-sm font-semibold text-slate-700';
const ROW_CLASS = 'group border-b border-slate-100/70 cursor-pointer transition-all duration-200 hover:bg-purple-50/20';
const TOOLBAR_CLASS = 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 backdrop-blur-md px-4 py-3 border-b border-slate-100/60 rounded-t-[2.5rem]';
const SELECT_CLASS = 'rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-705 font-bold transition focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/5 hover:border-slate-300 cursor-pointer';
const INPUT_CLASS = 'w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 font-semibold transition focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-500/5 hover:border-slate-300';
const ROW_ACTION_CLASS = 'cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 shadow-sm border border-slate-100 hover:scale-[1.03] active:scale-[0.97]';

const StatCard = ({ icon, label, value, hint, gradient, shadow, delay }: any) => (
    <motion.div
        variants={fadeUp}
        whileHover={{ y: -3, scale: 1.01, transition: { type: "spring", stiffness: 450, damping: 24 } }}
        className="group relative flex items-center gap-4 bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-purple-200/60 transition-all duration-300 overflow-hidden px-5 py-4 cursor-default"
        style={{ animationDelay: delay }}
    >
        <div className={`absolute -right-6 -top-6 w-20 h-20 bg-gradient-to-br ${gradient} rounded-full opacity-0 group-hover:opacity-10 group-hover:scale-[2.5] transition-all duration-700 ease-out`} />
        <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`shrink-0 w-10 h-10 flex items-center justify-center bg-gradient-to-br ${gradient} rounded-xl text-white shadow-md ${shadow}`}
        >
            {React.cloneElement(icon, { size: 17 })}
        </motion.div>
        <div className="relative z-10 min-w-0">
            <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider block">{label}</span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-purple-900 transition-colors tabular-nums leading-tight">{value}</h3>
            <p className="text-[10px] font-medium text-slate-400">{hint}</p>
        </div>
    </motion.div>
);

const EmptyState = ({ icon, title, hint }: any) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-3 py-8 text-center"
    >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-400">
            {React.cloneElement(icon, { size: 22 })}
        </div>
        <div className="space-y-0.5">
            <h4 className="text-sm font-extrabold text-slate-800">{title}</h4>
            <p className="mx-auto max-w-xs text-xs font-semibold text-slate-400 leading-relaxed">{hint}</p>
        </div>
    </motion.div>
);

const ApplicantAvatar = ({ name }: { name: string }) => {
    const initials = String(name || '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || '?';
    return (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-xs font-bold text-purple-700">
            {initials}
        </div>
    );
};

const LoadingSkeleton = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-4">
            <div className="h-10 w-72 animate-pulse rounded-xl bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-50 px-6">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-4 py-5">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-48 animate-pulse rounded-full bg-gray-100" />
                        <div className="h-3 w-32 animate-pulse rounded-full bg-gray-50" />
                    </div>
                    <div className="hidden h-6 w-28 animate-pulse rounded-full bg-gray-100 sm:block" />
                    <div className="hidden h-6 w-20 animate-pulse rounded-full bg-gray-50 md:block" />
                </div>
            ))}
        </div>
    </div>
);

// PAGE 5: NAT Management
const CareStaffNatPage = ({ showToast }: any) => {
    const {
        canPerformAction,
        canArchiveRecords,
        activeTab,
        setActiveTab,
        applications,
        setApplications,
        completedApplications,
        setCompletedApplications,
        testTakers,
        setTestTakers,
        summaryApplications,
        setSummaryApplications,
        schedules,
        setSchedules,
        courseLimits,
        setCourseLimits,
        natRequirements,
        setNatRequirements,
        inactiveNatRequirements,
        setInactiveNatRequirements,
        supportsAttendance,
        setSupportsAttendance,
        loading,
        setLoading,
        isRefreshingData,
        setIsRefreshingData,
        newRequirementName,
        setNewRequirementName,
        isSavingRequirement,
        setIsSavingRequirement,
        pendingRequirementDeleteId,
        setPendingRequirementDeleteId,
        searchTerm,
        setSearchTerm,
        testTakersCourseFilter,
        setTestTakersCourseFilter,
        completedFilter,
        setCompletedFilter,
        applicationsPage,
        setApplicationsPage,
        completedPage,
        setCompletedPage,
        testTakersPage,
        setTestTakersPage,
        statusBoardPage,
        setStatusBoardPage,
        requirementsPage,
        setRequirementsPage,
        limitsPage,
        setLimitsPage,
        applicationsTotal,
        setApplicationsTotal,
        completedTotal,
        setCompletedTotal,
        testTakersTotal,
        setTestTakersTotal,
        showModal,
        setShowModal,
        selectedApp,
        setSelectedApp,
        isLoadingSelectedApp,
        setIsLoadingSelectedApp,
        showScheduleModal,
        setShowScheduleModal,
        editingSchedule,
        setEditingSchedule,
        isScheduleDateLocked,
        setIsScheduleDateLocked,
        isSavingSchedule,
        setIsSavingSchedule,
        showBulkPassModal,
        setShowBulkPassModal,
        bulkPassRows,
        setBulkPassRows,
        bulkPassFileName,
        setBulkPassFileName,
        bulkPassApplying,
        setBulkPassApplying,
        statusBoardFilter,
        setStatusBoardFilter,
        scheduleForm,
        setScheduleForm,
        bulkPassInputRef,
        normalizeTimeSlots,
        parseTimeToMinutes,
        fetchData,
        handleRefreshData,
        closeSelectedAppModal,
        openApplicantDetails,
        updateStatus,
        archiveApplication,
        closeScheduleModal,
        handleSaveSchedule,
        addTimeSlotRow,
        updateTimeSlotRow,
        removeTimeSlotRow,
        toggleSchedule,
        handleUpdateLimit,
        handleDeleteCourse,
        handleAddRequirement,
        handleDeleteRequirement,
        filteredApplications,
        filteredResults,
        hasCompletedAttendance,
        isCompletedNatRecord,
        getNatCompletedDateLabel,
        dateApplicantCounts,
        dateTimeApplicantCounts,
        openAddScheduleModal,
        openEditScheduleModal,
        handleDeleteSchedule,
        isEditingLegacySchedule,
        formatTime12h,
        formatAssignedSlot,
        handleExportPDF,
        handleExportCSV,
        handleDownloadBulkPassTemplate,
        closeBulkPassModal,
        handleBulkPassFileChange,
        applyBulkPassList,
        bulkPassSummary,
        statusSections,
        activeStatusSection,
        activeStatusRows,
        paginatedStatusRows,
        paginatedRequirements,
        paginatedCourseLimits
    } = useCareStaffNat({ showToast });

    const tabs = [
        { id: 'applications', label: 'Applications', count: applicationsTotal },
        { id: 'test takers', label: 'Test Takers', count: testTakersTotal },
        { id: 'status board', label: 'Status Board', count: statusSections.reduce((sum: number, section: any) => sum + section.rows.length, 0) },
        { id: 'completed', label: 'Completed Logs', count: completedTotal },
        { id: 'schedules', label: 'Schedules', count: schedules.length },
        { id: 'requirements', label: 'Requirements', count: natRequirements.length },
        { id: 'limits', label: 'Limits', count: courseLimits.length }
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 sm:flex">
                        <ClipboardCheck size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">NORSU Admission Test Dashboard</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage NAT applications, schedules, and course quotas.</p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    size="md"
                    onClick={handleRefreshData}
                    isLoading={isRefreshingData}
                    leftIcon={<RefreshCw size={16} />}
                    className="shrink-0 hover:text-purple-600"
                >
                    {isRefreshingData ? 'Refreshing...' : 'Refresh Data'}
                </Button>
            </div>

            <input
                ref={bulkPassInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleBulkPassFileChange}
            />

            <motion.div
                initial="hidden"
                animate="show"
                variants={stagger}
                className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            >
                <StatCard
                    icon={<ClipboardList />}
                    gradient="from-purple-400 to-indigo-650"
                    shadow="shadow-purple-500/20"
                    label="Total Applications"
                    value={summaryApplications.length}
                    hint="All NAT records this cycle"
                    delay="0ms"
                />
                <StatCard
                    icon={<Send />}
                    gradient="from-blue-400 to-indigo-650"
                    shadow="shadow-blue-500/20"
                    label="Submitted"
                    value={summaryApplications.filter(a => a.status === 'Scheduled' || a.status === 'Submitted').length}
                    hint="Awaiting/assigned slot"
                    delay="60ms"
                />
                <StatCard
                    icon={<Users />}
                    gradient="from-indigo-400 to-violet-650"
                    shadow="shadow-indigo-500/20"
                    label="Test Takers"
                    value={summaryApplications.filter(isCompletedNatRecord).length}
                    hint="Finished taking the NAT"
                    delay="120ms"
                />
                <StatCard
                    icon={<CheckCircle2 />}
                    gradient="from-emerald-400 to-teal-650"
                    shadow="shadow-emerald-500/20"
                    label="Processed Results"
                    value={summaryApplications.filter(a => isNatFinalizedStatus(a.status)).length}
                    hint="Finalized admission outcomes"
                    delay="180ms"
                />
            </motion.div>

            <div className="w-fit max-w-full overflow-x-auto bg-slate-100/50 rounded-full p-1.5 shadow-sm">
                <div className="flex items-center justify-start gap-1">
                    <AnimatePresence>
                        {tabs.map(tab => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors z-10 ${isActive
                                        ? 'text-white'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="natActiveTab"
                                            className="absolute inset-0 bg-purple-600 rounded-full shadow-md shadow-purple-200 -z-10"
                                            transition={{ type: "spring", stiffness: 450, damping: 30 }}
                                        />
                                    )}
                                    <span className="relative z-10">{tab.label}</span>
                                    <span className={`relative z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </AnimatePresence>
                </div>
            </div>

            {loading ? <LoadingSkeleton /> :
                activeTab === 'applications' ? (
                    <div className={`${NAT_TABLE_SHELL_CLASS} animate-fade-in`}>
                        <div className={TOOLBAR_CLASS}>
                            <div className="relative">
                                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or reference ID..."
                                    className={`${INPUT_CLASS} w-72 pl-10`}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleExportCSV} leftIcon={<Download size={14} />}>CSV</Button>
                                <Button variant="ghost" size="sm" onClick={handleExportPDF} leftIcon={<FileText size={14} />}>PDF</Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-100 bg-gray-50/70">
                                    <tr>
                                        <th className={TH_CLASS}>Student</th>
                                        <th className={TH_CLASS}>Status</th>
                                        <th className={TH_CLASS}>Course</th>
                                        <th className={TH_CLASS}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredApplications.length === 0 ? (
                                        <tr>
                                            <td colSpan={4}>
                                                <EmptyState
                                                    icon={<Inbox size={24} />}
                                                    title="No applications found"
                                                    hint="Try a different search, or refresh the data to pull in the latest NAT applications."
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {filteredApplications.map(app => (
                                                <tr key={app.id} className={ROW_CLASS} onClick={() => { void openApplicantDetails(app); }}>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex items-center gap-3">
                                                            <ApplicantAvatar name={`${app.first_name} ${app.last_name}`} />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900">{app.first_name} {app.last_name}</p>
                                                                <p className="font-mono text-xs text-gray-400">{app.reference_id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={TD_CLASS}><StatusBadge status={app.status} /></td>
                                                    <td className={`${TD_CLASS} text-gray-700`}>{app.priority_course}</td>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex gap-1.5">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className={`${ROW_ACTION_CLASS} text-blue-600 hover:bg-blue-50`}>View</button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app, PASS_STATUS); }} className={`${ROW_ACTION_CLASS} text-green-600 hover:bg-green-50`}>Pass</button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app, FAIL_STATUS); }} className={`${ROW_ACTION_CLASS} text-red-600 hover:bg-red-50`}>Fail</button>
                                                            {canArchiveRecords && (
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); archiveApplication(app.id); }} className={`${ROW_ACTION_CLASS} text-slate-500 hover:bg-amber-50 hover:text-amber-700`}>Archive</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {renderTablePaddingRows(4, filteredApplications.length)}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <NatPaginationControls
                            page={applicationsPage}
                            totalItems={applicationsTotal}
                            currentRowsCount={filteredApplications.length}
                            onPageChange={setApplicationsPage}
                            itemLabel="applications"
                        />
                    </div>
                ) : activeTab === 'test takers' ? (
                    <div className={`${NAT_TABLE_SHELL_CLASS} animate-fade-in`}>
                        <div className={TOOLBAR_CLASS}>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Test Takers</h3>
                                <p className="mt-0.5 text-xs text-gray-500">{supportsAttendance ? 'Applicants who timed in and timed out on their assigned test day.' : 'Applicants who finished the NAT and are awaiting result tagging.'}</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2.5">
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                                    {testTakersTotal} applicant{testTakersTotal !== 1 ? 's' : ''}
                                </span>
                                <select value={testTakersCourseFilter} onChange={e => setTestTakersCourseFilter(e.target.value)} className={SELECT_CLASS}>
                                    <option value="All">All Courses</option>
                                    {courseLimits.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDownloadBulkPassTemplate}
                                    leftIcon={<FileText size={14} />}
                                >
                                    Template
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => bulkPassInputRef.current?.click()}
                                    leftIcon={<Upload size={14} />}
                                >
                                    Bulk Pass
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-100 bg-gray-50/70">
                                    <tr>
                                        <th className={TH_CLASS}>Student</th>
                                        <th className={TH_CLASS}>Course</th>
                                        <th className={TH_CLASS}>Test Date</th>
                                        {supportsAttendance ? (
                                            <>
                                                <th className={TH_CLASS}>Time In</th>
                                                <th className={TH_CLASS}>Time Out</th>
                                            </>
                                        ) : (
                                            <th className={TH_CLASS}>Test Slot</th>
                                        )}
                                        <th className={TH_CLASS}>Status</th>
                                        <th className={TH_CLASS}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredResults.length === 0 ? (
                                        <tr>
                                            <td colSpan={supportsAttendance ? 7 : 6}>
                                                <EmptyState
                                                    icon={<Users size={24} />}
                                                    title="No test takers yet"
                                                    hint={supportsAttendance ? 'Applicants appear here after they time in and time out on their test day.' : 'Applicants move here after they are marked as "Test Taken".'}
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {filteredResults.map(r => (
                                                <tr key={r.id} className={ROW_CLASS} onClick={() => { void openApplicantDetails(r); }}>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex items-center gap-3">
                                                            <ApplicantAvatar name={`${r.first_name} ${r.last_name}`} />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900">{r.first_name} {r.last_name}</p>
                                                                <p className="font-mono text-xs text-gray-400">{r.reference_id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${TD_CLASS} text-gray-700`}>{r.priority_course}</td>
                                                    <td className={`${TD_CLASS} text-gray-600`}>{formatDate(r.test_date)}</td>
                                                    {supportsAttendance ? (
                                                        <>
                                                            <td className={`${TD_CLASS} font-mono text-xs text-green-600`}>{formatTime(r.time_in, '-')}</td>
                                                            <td className={`${TD_CLASS} font-mono text-xs text-red-500`}>{formatTime(r.time_out, '-')}</td>
                                                        </>
                                                    ) : (
                                                        <td className={`${TD_CLASS} text-xs font-medium text-gray-600`}>{formatAssignedSlot(r.test_time)}</td>
                                                    )}
                                                    <td className={TD_CLASS}><StatusBadge status={r.status} /></td>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex gap-1.5">
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(r); }} className={`${ROW_ACTION_CLASS} text-blue-600 hover:bg-blue-50`}>View</button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r, PASS_STATUS); }} className={`${ROW_ACTION_CLASS} text-green-600 hover:bg-green-50`}>Pass</button>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r, FAIL_STATUS); }} className={`${ROW_ACTION_CLASS} text-red-500 hover:bg-red-50`}>Fail</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {renderTablePaddingRows(supportsAttendance ? 7 : 6, filteredResults.length)}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <NatPaginationControls
                            page={testTakersPage}
                            totalItems={testTakersTotal}
                            currentRowsCount={filteredResults.length}
                            onPageChange={setTestTakersPage}
                            itemLabel="test takers"
                        />
                    </div>
                ) : activeTab === 'status board' ? (
                    <div className="animate-fade-in space-y-6">
                        <motion.div
                            initial="hidden"
                            animate="show"
                            variants={stagger}
                            className="grid grid-cols-1 gap-5 md:grid-cols-3"
                        >
                            {statusSections.map((section) => {
                                const isActive = activeStatusSection?.id === section.id;
                                return (
                                    <motion.button
                                        variants={fadeUp}
                                        whileHover={{ y: -4, scale: 1.015, transition: { type: "spring", stiffness: 450, damping: 24 } }}
                                        key={section.id}
                                        type="button"
                                        onClick={() => setStatusBoardFilter(section.id)}
                                        className={`relative overflow-hidden rounded-[2rem] border p-6 text-left transition-all duration-300 ${isActive
                                            ? 'border-purple-400 bg-purple-50/45 shadow-md ring-1 ring-purple-400/30'
                                            : 'border-slate-200/70 bg-white/80 backdrop-blur-xl shadow-sm hover:border-purple-200/60 hover:shadow-lg hover:shadow-purple-500/5'
                                            }`}
                                    >
                                        {isActive && (
                                            <div className="absolute -right-6 -top-6 w-20 h-20 bg-purple-100 rounded-full blur-2xl opacity-60 pointer-events-none" />
                                        )}
                                        <div className="flex items-center justify-between gap-3 relative z-10">
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-purple-700' : 'text-slate-500'}`}>{section.label}</p>
                                            {isActive && <span className="rounded-full bg-purple-600 px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm shadow-purple-500/20">Viewing</span>}
                                        </div>
                                        <p className="mt-4 text-3xl font-black tracking-tight tabular-nums text-slate-800 relative z-10">{section.rows.length}</p>
                                        <p className="mt-2 text-xs font-semibold text-slate-450 leading-relaxed relative z-10">{section.description}</p>
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        <div className={NAT_TABLE_SHELL_CLASS}>
                            <div className={TOOLBAR_CLASS}>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900">{activeStatusSection?.label || 'Status Board'}</h3>
                                    <p className="mt-0.5 text-xs text-gray-500">{activeStatusSection?.description || 'Review released NAT outcomes and admissions routing.'}</p>
                                </div>
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                                    {activeStatusRows.length} applicant{activeStatusRows.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-gray-100 bg-gray-50/70">
                                        <tr>
                                            <th className={TH_CLASS}>Applicant</th>
                                            <th className={TH_CLASS}>Current Route</th>
                                            <th className={TH_CLASS}>Status</th>
                                            <th className={TH_CLASS}>Schedule / Test Date</th>
                                            <th className={TH_CLASS}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {activeStatusRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={5}>
                                                    <EmptyState
                                                        icon={<ListChecks size={24} />}
                                                        title="No applicants in this status"
                                                        hint="Applicants will appear here as their NAT results and admissions routing are updated."
                                                    />
                                                </td>
                                            </tr>
                                        ) : (
                                            <>
                                                {paginatedStatusRows.map((app: any) => (
                                                    <tr key={app.id} className={ROW_CLASS} onClick={() => { void openApplicantDetails(app); }}>
                                                        <td className={TD_CLASS}>
                                                            <div className="flex items-center gap-3">
                                                                <ApplicantAvatar name={buildApplicantName(app)} />
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-900">{buildApplicantName(app)}</p>
                                                                    <p className="font-mono text-xs text-gray-400">{app.reference_id}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={`${TD_CLASS} text-gray-700`}>{getApplicantRouteLabel(app)}</td>
                                                        <td className={TD_CLASS}><StatusBadge status={app.status} /></td>
                                                        <td className={`${TD_CLASS} text-xs text-gray-600`}>
                                                            {String(app.status || '') === INTERVIEW_STATUS
                                                                ? (app.interview_date || 'Interview date pending')
                                                                : formatDate(app.test_date)}
                                                        </td>
                                                        <td className={TD_CLASS}>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className={`${ROW_ACTION_CLASS} text-blue-600 hover:bg-blue-50`}>View</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {renderTablePaddingRows(5, paginatedStatusRows.length)}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <NatPaginationControls
                                page={statusBoardPage}
                                totalItems={activeStatusRows.length}
                                currentRowsCount={paginatedStatusRows.length}
                                onPageChange={setStatusBoardPage}
                                itemLabel="applicants"
                            />
                        </div>
                    </div>
                ) : activeTab === 'completed' ? (
                    <div className={`${NAT_TABLE_SHELL_CLASS} animate-fade-in`}>
                        <div className={TOOLBAR_CLASS}>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Completed Logs</h3>
                                <p className="mt-0.5 text-xs text-gray-500">Released NAT results and department admissions outcomes.</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700">
                                    {completedTotal} record{completedTotal !== 1 ? 's' : ''}
                                </span>
                                <select value={completedFilter} onChange={e => setCompletedFilter(e.target.value)} className={SELECT_CLASS}>
                                    <option value="All">All Status</option>
                                    <option value="Passed">Passed NAT (Legacy)</option>
                                    <option value="Qualified for Interview (1st Choice)">Passed NAT (Interview Prep)</option>
                                    <option value="Interview Scheduled">Interview Scheduled</option>
                                    <option value="Approved for Enrollment">Approved for Enrollment</option>
                                    <option value="Enrolled">Enrolled</option>
                                    <option value="Forwarded to 2nd Choice for Interview">Forwarded to 2nd Choice</option>
                                    <option value="Forwarded to 3rd Choice for Interview">Forwarded to 3rd Choice</option>
                                    <option value="Application Unsuccessful">Unsuccessful</option>
                                    <option value="Failed">Failed NAT</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-gray-100 bg-gray-50/70">
                                    <tr>
                                        <th className={TH_CLASS}>Student</th>
                                        <th className={TH_CLASS}>Course</th>
                                        <th className={TH_CLASS}>Status</th>
                                        <th className={TH_CLASS}>Date Completed</th>
                                        <th className={TH_CLASS}>Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {completedApplications.length === 0 ? (
                                        <tr>
                                            <td colSpan={5}>
                                                <EmptyState
                                                    icon={<ClipboardCheck size={24} />}
                                                    title="No completed logs yet"
                                                    hint="Finalized NAT results and enrollment outcomes will be listed here once released."
                                                />
                                            </td>
                                        </tr>
                                    ) : (
                                        <>
                                            {completedApplications.map(app => (
                                                <tr key={app.id} className={ROW_CLASS} onClick={() => { void openApplicantDetails(app); }}>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex items-center gap-3">
                                                            <ApplicantAvatar name={`${app.first_name} ${app.last_name}`} />
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-gray-900">{app.first_name} {app.last_name}</p>
                                                                <p className="font-mono text-xs text-gray-400">{app.reference_id}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`${TD_CLASS} text-gray-700`}>{app.activated_course || app.priority_course}</td>
                                                    <td className={TD_CLASS}><StatusBadge status={app.status} /></td>
                                                    <td className={`${TD_CLASS} text-xs text-gray-500`}>{getNatCompletedDateLabel(app)}</td>
                                                    <td className={TD_CLASS}>
                                                        <div className="flex gap-1.5">
                                                            <button onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className={`${ROW_ACTION_CLASS} text-blue-600 hover:bg-blue-50`}>View</button>
                                                            {app.isArchivedRecord ? (
                                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">Archived</span>
                                                            ) : canArchiveRecords && (
                                                                <button onClick={(e) => { e.stopPropagation(); archiveApplication(app.id); }} className={`${ROW_ACTION_CLASS} text-amber-600 hover:bg-amber-50`}>Archive</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {renderTablePaddingRows(5, completedApplications.length)}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <NatPaginationControls
                            page={completedPage}
                            totalItems={completedTotal}
                            currentRowsCount={completedApplications.length}
                            onPageChange={setCompletedPage}
                            itemLabel="completed records"
                        />
                    </div>
                ) : activeTab === 'schedules' ? (
                    <motion.div
                        key="schedules"
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="space-y-6"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6 md:p-8">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Test Schedules</h3>
                                <p className="mt-1 text-xs font-semibold text-slate-505">Manage NAT test dates, venues, and time-slot capacity.</p>
                            </div>
                            <Button variant="primary" size="md" onClick={openAddScheduleModal} leftIcon={<Plus size={16} />} className="shadow-lg shadow-purple-500/20">Add Schedule</Button>
                        </div>
                        {schedules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white/50 backdrop-blur-xl py-16">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 text-gray-300">
                                    <CalendarDays size={24} />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-gray-600">No schedules yet</p>
                                    <p className="mt-1 text-xs text-gray-400">Create a test schedule so applicants can book a NAT slot.</p>
                                </div>
                                <Button variant="secondary" size="sm" onClick={openAddScheduleModal} leftIcon={<Plus size={14} />}>Add your first schedule</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                {schedules.map(sch => {
                                    const totalSlots = sch.slots || 0;
                                    const usedSlots = Math.min(dateApplicantCounts[sch.date] || 0, totalSlots);
                                    const remainingSlots = Math.max(totalSlots - usedSlots, 0);
                                    const usedPercent = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;
                                    return (
                                        <motion.div
                                            key={sch.id}
                                            whileHover={{ scale: 1.01, y: -2 }}
                                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                            className="flex flex-col bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100/50 text-purple-700">
                                                        <CalendarDays size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800">{formatDate(sch.date)}</p>
                                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                            <MapPin size={12} className="shrink-0 text-slate-400" />
                                                            {sch.venue}
                                                        </p>
                                                    </div>
                                                </div>
                                                {canArchiveRecords ? (
                                                    <button onClick={() => toggleSchedule(sch)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${sch.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                                ) : (
                                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</span>
                                                )}
                                            </div>

                                            <div className="mt-5">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-slate-500">Slots Used</span>
                                                    <span className="font-bold text-slate-800 tabular-nums">{usedSlots} / {totalSlots}</span>
                                                </div>
                                                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                                        style={{ width: `${usedPercent}%` }}
                                                    />
                                                </div>
                                                <p className="mt-1.5 text-[11px] font-semibold text-slate-400">{remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining</p>
                                            </div>

                                            {Array.isArray(sch.time_windows) && sch.time_windows.length > 0 && (
                                                <div className="mt-5 space-y-2 border-t border-slate-100/60 pt-4">
                                                    {normalizeTimeSlots(sch.time_windows).map((slot: any, index: number) => {
                                                        const key = `${sch.date}|${slot.start}-${slot.end}`;
                                                        const used = dateTimeApplicantCounts[key] || 0;
                                                        const remaining = Math.max(slot.slots - used, 0);
                                                        return (
                                                            <div key={`${slot.start}-${slot.end}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-xs">
                                                                <span className="flex items-center gap-1.5 font-bold text-slate-600">
                                                                    <Clock size={12} className="shrink-0 text-slate-400" />
                                                                    {formatTime12h(slot.start)} - {formatTime12h(slot.end)}
                                                                </span>
                                                                <span className={`font-mono font-black tabular-nums ${remaining === 0 ? 'text-rose-600' : 'text-purple-700'}`}>{remaining}/{slot.slots}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div className="mt-auto pt-4 flex gap-2 border-t border-slate-100/60">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditScheduleModal(sch)}
                                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50/65 text-blue-750 hover:bg-blue-100/80 px-3 py-2.5 text-xs font-bold transition duration-200"
                                                >
                                                    <Pencil size={12} /> Edit
                                                </button>
                                                {canArchiveRecords && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSchedule(sch)}
                                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50/65 text-amber-750 hover:bg-amber-100/80 px-3 py-2.5 text-xs font-bold transition duration-200"
                                                    >
                                                        <Trash2 size={12} /> {sch.is_active ? 'Close' : 'Reopen'}
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                ) : activeTab === 'requirements' ? (
                    <motion.div
                        key="requirements"
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="space-y-6"
                    >
                        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6 md:p-8">
                            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">NAT Requirements</h3>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        These items appear in the applicant NAT portal dashboard and in the NAT application received email.
                                    </p>
                                </div>
                                <form onSubmit={handleAddRequirement} className="flex w-full gap-3 md:max-w-xl">
                                    <input
                                        value={newRequirementName}
                                        onChange={(e) => setNewRequirementName(e.target.value)}
                                        placeholder="Add requirement name..."
                                        className={INPUT_CLASS}
                                    />
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="md"
                                        disabled={!String(newRequirementName || '').trim() || isSavingRequirement}
                                        isLoading={isSavingRequirement}
                                        leftIcon={<Plus size={16} />}
                                        className="shrink-0 shadow-lg shadow-purple-500/20"
                                    >
                                        {isSavingRequirement ? 'Adding' : 'Add'}
                                    </Button>
                                </form>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6 md:p-8">
                            {natRequirements.length === 0 ? (
                                <div className="h-[240px] flex items-center justify-center">
                                    <EmptyState
                                        icon={<ClipboardList size={24} />}
                                        title="No NAT requirements yet"
                                        hint="Add requirement items above and they will show up in the applicant portal and confirmation emails."
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {paginatedRequirements.map((requirement: any) => (
                                        <motion.div
                                            key={requirement.id}
                                            whileHover={{ scale: 1.01 }}
                                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                            className="flex items-center justify-between bg-slate-50/50 hover:bg-purple-50/30 transition-all border border-slate-100 rounded-2xl p-5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <p className="font-bold text-slate-800 truncate">{requirement.name}</p>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    Created {formatDateTime(requirement.created_at)}
                                                </p>
                                            </div>
                                            {canArchiveRecords && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRequirement(requirement)}
                                                    disabled={pendingRequirementDeleteId === requirement.id}
                                                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 px-3 py-2 text-xs font-bold text-amber-700 transition disabled:opacity-60"
                                                >
                                                    <Trash2 size={12} />
                                                    {pendingRequirementDeleteId === requirement.id ? 'Deactivating' : 'Deactivate'}
                                                </button>
                                            )}
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 border-t border-slate-100/60 pt-4">
                                <NatPaginationControls
                                    page={requirementsPage}
                                    totalItems={natRequirements.length}
                                    currentRowsCount={paginatedRequirements.length}
                                    onPageChange={setRequirementsPage}
                                    itemLabel="requirements"
                                />
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-slate-200/50 bg-slate-50/40 backdrop-blur-xl p-6 md:p-8">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900">Inactive Requirements</h4>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">These requirements are hidden from the NAT portal but kept for reference.</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-slate-200/60 px-3.5 py-1 text-xs font-bold text-slate-700">
                                    {inactiveNatRequirements.length} archived
                                </span>
                            </div>
                            {inactiveNatRequirements.length === 0 ? (
                                <p className="mt-4 text-sm font-semibold text-slate-400">No inactive NAT requirements yet.</p>
                            ) : (
                                <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {inactiveNatRequirements.map((requirement: any) => (
                                        <div key={`inactive-requirement-${requirement.id}`} className="rounded-xl border border-slate-200 bg-slate-100/40 px-4 py-3">
                                            <p className="font-semibold text-slate-700">{requirement.name}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-400">Created {formatDateTime(requirement.created_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="limits"
                        variants={fadeUp}
                        initial="hidden"
                        animate="show"
                        exit="hidden"
                        className="space-y-6"
                    >
                        <div className="flex items-start gap-4 rounded-[2rem] border border-blue-100 bg-blue-50/40 backdrop-blur-md p-6">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                <Info size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-blue-800">Course Creation Moved</h3>
                                <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-blue-700">
                                    Add new courses in Student Population &rarr; Enrollment Keys &rarr; Course &amp; Applicant Limits. NAT keeps quota/status monitoring and lifecycle controls.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-xl shadow-purple-500/5 ring-1 ring-slate-200/50 p-6 md:p-8">
                            {courseLimits.length === 0 ? (
                                <div className="h-[240px] flex items-center justify-center">
                                    <EmptyState
                                        icon={<ListChecks size={24} />}
                                        title="No courses found"
                                        hint="Courses added under Student Population enrollment keys will appear here for NAT quota monitoring."
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {paginatedCourseLimits.map(c => (
                                        <motion.div
                                            key={c.id}
                                            whileHover={{ scale: 1.01 }}
                                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                            className="flex flex-col bg-slate-50/50 hover:bg-purple-50/30 transition-all border border-slate-100 rounded-2xl p-6"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="font-extrabold text-slate-800 text-base">{c.name}</div>
                                                {canArchiveRecords ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUpdateLimit(c.id, 'status', c.status === 'Closed' ? 'Open' : 'Closed')}
                                                        className={`rounded-full px-3 py-1 text-[10px] font-extrabold transition ${c.status === 'Closed' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                                                    >
                                                        {c.status || 'Open'}
                                                    </button>
                                                ) : (
                                                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${c.status === 'Closed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{c.status || 'Open'}</span>
                                                )}
                                            </div>

                                            <div className="mt-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Course Capacity</label>
                                                    <input
                                                        type="number"
                                                        className="h-10 w-full rounded-lg border border-slate-200/80 bg-white text-center text-sm font-bold tabular-nums transition focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                                                        defaultValue={c.capacity || 500}
                                                        onBlur={e => handleUpdateLimit(c.id, 'capacity', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">App Limit</label>
                                                    <input
                                                        type="number"
                                                        className="h-10 w-full rounded-lg border border-slate-200/80 bg-white text-center text-sm font-bold tabular-nums transition focus:border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-100"
                                                        defaultValue={c.application_limit || 200}
                                                        onBlur={e => handleUpdateLimit(c.id, 'application_limit', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100/60 flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-400">Actions</span>
                                                {canArchiveRecords && c.status !== 'Closed' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteCourse(c.name, c.id)}
                                                        className="rounded-xl bg-amber-50 hover:bg-amber-100 px-4 py-2 text-xs font-bold text-amber-600 transition hover:text-amber-750"
                                                    >
                                                        Close Course
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}

                            <div className="mt-6 border-t border-slate-100/60 pt-4">
                                <NatPaginationControls
                                    page={limitsPage}
                                    totalItems={courseLimits.length}
                                    currentRowsCount={paginatedCourseLimits.length}
                                    onPageChange={setLimitsPage}
                                    itemLabel="courses"
                                />
                            </div>
                        </div>
                    </motion.div>
                )
            }

            <NatApplicationDetailsModal
                closeSelectedAppModal={closeSelectedAppModal}
                formatAssignedSlot={formatAssignedSlot}
                isLoadingSelectedApp={isLoadingSelectedApp}
                selectedApp={selectedApp}
                showModal={showModal}
                supportsAttendance={supportsAttendance}
                updateStatus={updateStatus}
            />

            {
                showBulkPassModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-fade-in">
                        <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl animate-scale-in">
                            <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/70 p-6">
                                <div>
                                    <h3 className="text-lg font-extrabold text-gray-900">Bulk Pass Preview</h3>
                                    <p className="mt-1 text-xs text-gray-500">
                                        File: <span className="font-semibold text-gray-700">{bulkPassFileName || 'Uploaded list'}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">Matching uses <span className="font-bold">reference_id</span> only. Applicant name is shown only for checking.</p>
                                </div>
                                <Button type="button" variant="ghost" size="sm" onClick={closeBulkPassModal} className="text-gray-400 hover:text-gray-600"><XCircle /></Button>
                            </div>

                            <div className="flex-1 space-y-5 overflow-y-auto p-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
                                        <p className="text-xs font-bold uppercase tracking-wide text-green-700">Ready to Pass</p>
                                        <p className="mt-2 text-3xl font-extrabold tabular-nums text-green-900">{bulkPassSummary.ready || 0}</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Already Finalized</p>
                                        <p className="mt-2 text-3xl font-extrabold tabular-nums text-amber-900">{bulkPassSummary.already_finalized || 0}</p>
                                    </div>
                                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Not Ready Yet</p>
                                        <p className="mt-2 text-3xl font-extrabold tabular-nums text-blue-900">{bulkPassSummary.not_ready || 0}</p>
                                    </div>
                                    <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5">
                                        <p className="text-xs font-bold uppercase tracking-wide text-rose-700">Missing / Invalid</p>
                                        <p className="mt-2 text-3xl font-extrabold tabular-nums text-rose-900">{(bulkPassSummary.missing_reference || 0) + (bulkPassSummary.duplicate_reference || 0) + (bulkPassSummary.not_found || 0)}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2.5 rounded-2xl border border-purple-100 bg-purple-50 px-5 py-4 text-xs text-purple-900">
                                    <ArrowRightLeft size={14} className="mt-0.5 shrink-0" />
                                    <p className="leading-relaxed">
                                        Uploaded names will never override the system record. They are displayed only to help staff confirm that the uploaded reference list matches the intended applicants.
                                    </p>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-gray-100">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-gray-100 bg-gray-50/70">
                                            <tr>
                                                <th className={TH_CLASS}>Row</th>
                                                <th className={TH_CLASS}>Reference ID</th>
                                                <th className={TH_CLASS}>Uploaded Name</th>
                                                <th className={TH_CLASS}>Matched Applicant</th>
                                                <th className={TH_CLASS}>Current Route</th>
                                                <th className={TH_CLASS}>Current Status</th>
                                                <th className={TH_CLASS}>Preview</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {bulkPassRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-8">
                                                        <EmptyState
                                                            icon={<Upload size={24} />}
                                                            title="No parsed rows found"
                                                            hint="The uploaded file did not contain any readable rows. Check that it follows the template format."
                                                        />
                                                    </td>
                                                </tr>
                                            ) : bulkPassRows.map((row: any) => (
                                                <tr key={`${row.referenceId || 'row'}-${row.rowNumber}`} className="transition-colors hover:bg-purple-50/40">
                                                    <td className={`${TD_CLASS} font-mono text-xs text-gray-500`}>{row.rowNumber}</td>
                                                    <td className={`${TD_CLASS} font-mono text-xs text-gray-700`}>{row.referenceId || '—'}</td>
                                                    <td className={`${TD_CLASS} text-gray-700`}>{row.applicantName || '—'}</td>
                                                    <td className={`${TD_CLASS} font-medium text-gray-800`}>{row.systemName || 'No match found'}</td>
                                                    <td className={`${TD_CLASS} text-gray-600`}>{row.routeLabel || '—'}</td>
                                                    <td className={TD_CLASS}>{row.currentStatus ? <StatusBadge status={row.currentStatus} /> : '—'}</td>
                                                    <td className={TD_CLASS}>
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.matchStatus === 'ready'
                                                                ? 'bg-green-100 text-green-700'
                                                                : row.matchStatus === 'already_finalized'
                                                                    ? 'bg-amber-100 text-amber-700'
                                                                    : row.matchStatus === 'not_ready'
                                                                        ? 'bg-blue-100 text-blue-700'
                                                                        : 'bg-rose-100 text-rose-700'
                                                                }`}>
                                                                {row.matchStatus === 'ready' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                                {row.matchStatus === 'ready'
                                                                    ? 'Ready'
                                                                    : row.matchStatus === 'already_finalized'
                                                                        ? 'Finalized'
                                                                        : row.matchStatus === 'not_ready'
                                                                            ? 'Not Ready'
                                                                            : 'Needs Review'}
                                                            </span>
                                                            <p className="text-xs leading-relaxed text-gray-500">{row.note}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex flex-col justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4 sm:flex-row">
                                <Button type="button" variant="secondary" size="md" onClick={closeBulkPassModal}>Close</Button>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="md"
                                    onClick={applyBulkPassList}
                                    isLoading={bulkPassApplying}
                                    disabled={!(bulkPassSummary.ready > 0)}
                                >
                                    Apply Bulk Pass ({bulkPassSummary.ready || 0})
                                </Button>
                            </div>
                        </div>
                    </div>
                )
            }

            <NatScheduleModal
                addTimeSlotRow={addTimeSlotRow}
                closeScheduleModal={closeScheduleModal}
                editingSchedule={editingSchedule}
                handleSaveSchedule={handleSaveSchedule}
                isEditingLegacySchedule={isEditingLegacySchedule}
                isSavingSchedule={isSavingSchedule}
                isScheduleDateLocked={isScheduleDateLocked}
                normalizeTimeSlots={normalizeTimeSlots}
                removeTimeSlotRow={removeTimeSlotRow}
                scheduleForm={scheduleForm}
                setScheduleForm={setScheduleForm}
                showScheduleModal={showScheduleModal}
                updateTimeSlotRow={updateTimeSlotRow}
            />

        </div>
    );
};

export default CareStaffNatPage;
