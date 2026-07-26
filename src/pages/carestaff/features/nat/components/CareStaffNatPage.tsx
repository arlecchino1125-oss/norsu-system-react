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
    ListChecks,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Trash2,
    Upload,
    Users,
    XCircle
} from 'lucide-react';
import { m } from 'framer-motion';
import { formatDate, formatDateTime, formatTime } from '../../../../../utils/formatters';
import StatusBadge from '../../../../../components/StatusBadge';
import { AsyncButton, Button } from '../../../../../components/ui/Button';
import SearchableSelect from '../../../../../components/ui/SearchableSelect';

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
    buildApplicantName,
    getApplicantRouteLabel,
    canMarkNatPassed,
    filterNatCoursesByDepartment,
    getNatCourseDepartment,
    paginateLocalRows
} from '../utils';

const TH_CLASS = 'px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400/80 border-b border-slate-100 bg-slate-50/40';
const TD_CLASS = 'px-4 py-2.5 align-middle text-sm font-semibold text-slate-700';
const ROW_CLASS = 'group border-b border-slate-100/70 cursor-pointer transition-all duration-200 hover:bg-purple-50/20';
const TOOLBAR_CLASS = 'flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center';
const SELECT_CLASS = 'cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100';
const INPUT_CLASS = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition hover:border-slate-300 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100';
const ROW_ACTION_CLASS = 'min-h-9 cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold transition-colors';

const EmptyState = ({ icon, title, hint }: any) => (
    <m.div
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
    </m.div>
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
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
            <div className="h-9 w-72 animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="divide-y divide-gray-50 px-4">
            {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-3">
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
const NatLimitsTab = ({
    courseLimits, limitsPage, setLimitsPage
}: any) => {
    const [departmentFilter, setDepartmentFilter] = React.useState('All');
    const departmentOptions = Array.from(
        new Set<string>(courseLimits.map((course: any) => getNatCourseDepartment(course)))
    ).sort((a, b) => a.localeCompare(b));
    const filteredCourseLimits = filterNatCoursesByDepartment(courseLimits, departmentFilter);
    const visibleCourseLimits = paginateLocalRows(filteredCourseLimits, limitsPage);

    return (
        <m.div
            key="limits"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="hidden"
            className="flex min-h-0 flex-1 flex-col gap-3"
        >
            <div className={NAT_TABLE_SHELL_CLASS}>
                <div className={TOOLBAR_CLASS}>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Course Limits</h3>
                        <p className="mt-0.5 text-xs text-gray-500">Review course quotas by college department.</p>
                    </div>
                    <SearchableSelect
                        label="College department"
                        value={departmentFilter}
                        options={[
                            { label: 'All college departments', value: 'All' },
                            ...departmentOptions.map((department) => ({ label: department, value: department }))
                        ]}
                        onChange={(value) => {
                            setDepartmentFilter(value);
                            setLimitsPage(1);
                        }}
                        placeholder="Select college department"
                        searchable={false}
                        className="w-full sm:w-72"
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50">
                            <tr>
                                <th className={TH_CLASS}>Course</th>
                                <th className={TH_CLASS}>College Department</th>
                                <th className={`${TH_CLASS} text-center`}>Course Capacity</th>
                                <th className={`${TH_CLASS} text-center`}>App Limit</th>
                                <th className={TH_CLASS}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {visibleCourseLimits.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <EmptyState
                                            icon={<ListChecks size={24} />}
                                            title="No courses found"
                                            hint={departmentFilter === 'All'
                                                ? 'Courses added under Student Population enrollment keys will appear here.'
                                                : 'No courses are assigned to this college department.'}
                                        />
                                    </td>
                                </tr>
                            ) : visibleCourseLimits.map((course) => {
                                const isClosed = course.status === 'Closed';
                                return (
                                    <tr key={course.id} className="border-b border-slate-100/70 transition-colors hover:bg-purple-50/20">
                                        <td className={`${TD_CLASS} font-bold text-gray-900`}>{course.name}</td>
                                        <td className={`${TD_CLASS} text-gray-600`}>{getNatCourseDepartment(course)}</td>
                                        <td className={`${TD_CLASS} text-center font-mono tabular-nums`}>{course.capacity ?? 500}</td>
                                        <td className={`${TD_CLASS} text-center font-mono tabular-nums`}>{course.application_limit ?? 200}</td>
                                        <td className={TD_CLASS}>
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${isClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {course.status || 'Open'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <NatPaginationControls
                    page={limitsPage}
                    totalItems={filteredCourseLimits.length}
                    currentRowsCount={visibleCourseLimits.length}
                    onPageChange={setLimitsPage}
                    itemLabel="courses"
                />
            </div>
        </m.div>
    );
};

const NatRequirementsTab = ({
    canArchiveRecords, natRequirements, inactiveNatRequirements, newRequirementName, setNewRequirementName, isSavingRequirement, pendingRequirementDeleteId, requirementsPage, setRequirementsPage, handleAddRequirement, handleDeleteRequirement, paginatedRequirements
}: any) => (
    <m.div
        key="requirements"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        exit="hidden"
        className="space-y-4"
    >
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
                        className="shrink-0"
                    >
                        {isSavingRequirement ? 'Adding' : 'Add'}
                    </Button>
                </form>
            </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {natRequirements.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <EmptyState
                        icon={<ClipboardList size={24} />}
                        title="No NAT requirements yet"
                        hint="Add requirement items above and they will show up in the applicant portal and confirmation emails."
                    />
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {paginatedRequirements.map((requirement: any) => (
                        <m.div
                            key={requirement.id}
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:bg-purple-50/30"
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
                        </m.div>
                    ))}
                </div>
            )}

            <div className="mt-4">
                <NatPaginationControls
                    page={requirementsPage}
                    totalItems={natRequirements.length}
                    currentRowsCount={paginatedRequirements.length}
                    onPageChange={setRequirementsPage}
                    itemLabel="requirements"
                />
            </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
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
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {inactiveNatRequirements.map((requirement: any) => (
                        <div key={`inactive-requirement-${requirement.id}`} className="rounded-xl border border-slate-200 bg-slate-100/40 px-4 py-3">
                            <p className="font-semibold text-slate-700">{requirement.name}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-400">Created {formatDateTime(requirement.created_at)}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </m.div>
);

const NatSchedulesTab = ({
    canArchiveRecords, schedules, normalizeTimeSlots, toggleSchedule, dateApplicantCounts, dateTimeApplicantCounts, openAddScheduleModal, openEditScheduleModal, handleDeleteSchedule, formatTime12h
}: any) => (
    <m.div
        key="schedules"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        exit="hidden"
        className="space-y-4"
    >
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
                <h3 className="text-lg font-black text-slate-900">Test Schedules</h3>
                <p className="mt-1 text-xs font-semibold text-slate-505">Manage NAT test dates, venues, and time-slot capacity.</p>
            </div>
            <Button variant="primary" size="md" onClick={openAddScheduleModal} leftIcon={<Plus size={16} />}>Add Schedule</Button>
        </div>
        {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-white py-10">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-400">
                    <CalendarDays size={20} />
                </div>
                <div className="text-center">
                    <p className="text-sm font-bold text-gray-600">No schedules yet</p>
                    <p className="mt-1 text-xs text-gray-400">Create a test schedule so applicants can book a NAT slot.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={openAddScheduleModal} leftIcon={<Plus size={14} />}>Add your first schedule</Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {schedules.map(sch => {
                    const totalSlots = sch.slots || 0;
                    const usedSlots = Math.min(dateApplicantCounts[sch.date] || 0, totalSlots);
                    const remainingSlots = Math.max(totalSlots - usedSlots, 0);
                    const usedPercent = totalSlots > 0 ? Math.min(100, Math.round((usedSlots / totalSlots) * 100)) : 0;
                    return (
                        <m.div
                            key={sch.id}
                            className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
                                    <button type="button" onClick={() => toggleSchedule(sch)} className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${sch.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{sch.is_active ? 'Active' : 'Closed'}</button>
                                ) : (
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${sch.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{sch.is_active ? 'Active' : 'Closed'}</span>
                                )}
                            </div>

                            <div className="mt-4">
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
                                <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                                    {normalizeTimeSlots(sch.time_windows).map((slot: any) => {
                                        const key = `${sch.date}|${slot.start}-${slot.end}`;
                                        const used = dateTimeApplicantCounts[key] || 0;
                                        const remaining = Math.max(slot.slots - used, 0);
                                        return (
                                            <div key={key} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-3.5 py-2.5 text-xs">
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

                            <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
                                <button
                                    type="button"
                                    onClick={() => openEditScheduleModal(sch)}
                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-50/65 text-blue-750 hover:bg-blue-100/80 px-3 py-2.5 text-xs font-bold transition duration-200"
                                >
                                    <Pencil size={12} /> Edit
                                </button>
                                {canArchiveRecords && (
                                    <AsyncButton
                                        type="button"
                                        onClick={() => handleDeleteSchedule(sch)}
                                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50/65 text-amber-750 hover:bg-amber-100/80 px-3 py-2.5 text-xs font-bold transition duration-200 disabled:opacity-60"
                                    >
                                        <Trash2 size={12} /> {sch.is_active ? 'Close' : 'Reopen'}
                                    </AsyncButton>
                                )}
                            </div>
                        </m.div>
                    );
                })}
            </div>
        )}
    </m.div>
);

const NatCompletedTab = ({
    canArchiveRecords, completedApplications, completedFilter, setCompletedFilter, completedPage, setCompletedPage, completedTotal, openApplicantDetails, archiveApplication, getNatCompletedDateLabel
}: any) => (
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
                <select aria-label="Filter completed NAT records by status" value={completedFilter} onChange={e => setCompletedFilter(e.target.value)} className={SELECT_CLASS}>
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
                                            <button type="button" onClick={(e) => { e.stopPropagation(); void openApplicantDetails(app); }} className={`${ROW_ACTION_CLASS} text-blue-600 hover:bg-blue-50`}>View</button>
                                            {app.isArchivedRecord ? (
                                                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">Archived</span>
                                            ) : canArchiveRecords && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); archiveApplication(app.id); }} className={`${ROW_ACTION_CLASS} text-amber-600 hover:bg-amber-50`}>Archive</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
);

const NatStatusBoardTab = ({
    statusBoardPage, setStatusBoardPage, setStatusBoardFilter, openApplicantDetails, statusSections, activeStatusSection, activeStatusRows, paginatedStatusRows
}: any) => (
    <div className="flex min-h-0 flex-1 flex-col gap-3 animate-fade-in">
        <div className="rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <div className="flex flex-wrap items-center gap-1">
            {statusSections.map((section) => {
                const isActive = activeStatusSection?.id === section.id;
                return (
                    <button
                        key={section.id}
                        type="button"
                        onClick={() => setStatusBoardFilter(section.id)}
                        className={`flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 ${isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <span>{section.label}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{section.rows.length}</span>
                    </button>
                );
            })}
            </div>
        </div>

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
);

const NatTestTakersTab = ({
    courseLimits, supportsAttendance, testTakersCourseFilter, setTestTakersCourseFilter, testTakersPage, setTestTakersPage, testTakersTotal, bulkPassInputRef, openApplicantDetails, updateStatus, filteredResults, formatAssignedSlot, handleDownloadBulkPassTemplate
}: any) => (
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
                <select aria-label="Filter NAT test takers by course" value={testTakersCourseFilter} onChange={e => setTestTakersCourseFilter(e.target.value)} className={SELECT_CLASS}>
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
                                            <button
                                                type="button"
                                                disabled={!canMarkNatPassed(r)}
                                                onClick={(e) => { e.stopPropagation(); updateStatus(r, PASS_STATUS); }}
                                                className={`${ROW_ACTION_CLASS} ${canMarkNatPassed(r) ? 'text-green-600 hover:bg-green-50' : 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none hover:scale-100'}`}
                                                title={canMarkNatPassed(r) ? 'Mark as passed' : 'Time In and Time Out are required before passing'}
                                            >Pass</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(r, FAIL_STATUS); }} className={`${ROW_ACTION_CLASS} text-red-500 hover:bg-red-50`}>Fail</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
);

const NatApplicationsTab = ({
    canArchiveRecords, applications, searchTerm, setSearchTerm, applicationsPage, setApplicationsPage, applicationsTotal, openApplicantDetails, updateStatus, archiveApplication, filteredApplications, handleExportPDF, handleExportCSV
}: any) => (
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
                                            <button
                                                type="button"
                                                disabled={!canMarkNatPassed(app)}
                                                onClick={(e) => { e.stopPropagation(); updateStatus(app, PASS_STATUS); }}
                                                className={`${ROW_ACTION_CLASS} ${canMarkNatPassed(app) ? 'text-green-600 hover:bg-green-50' : 'cursor-not-allowed bg-slate-100 text-slate-400 shadow-none hover:scale-100'}`}
                                                title={canMarkNatPassed(app) ? 'Mark as passed' : 'Time In and Time Out are required before passing'}
                                            >Pass</button>
                                            <button type="button" onClick={(e) => { e.stopPropagation(); updateStatus(app, FAIL_STATUS); }} className={`${ROW_ACTION_CLASS} text-red-600 hover:bg-red-50`}>Fail</button>
                                            {canArchiveRecords && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); archiveApplication(app.id); }} className={`${ROW_ACTION_CLASS} text-slate-500 hover:bg-amber-50 hover:text-amber-700`}>Archive</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
);

const NatBulkPassModal = ({ bulkPassRows, bulkPassFileName, bulkPassApplying, bulkPassSummary, closeBulkPassModal, applyBulkPassList }: any) => (
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
);

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
        handleAddRequirement,
        handleDeleteRequirement,
        filteredApplications,
        filteredResults,
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
        paginatedRequirements
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
        <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                    <ClipboardCheck size={24} className="mt-0.5 shrink-0 text-purple-600" />
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">NORSU Admission Test Dashboard</h1>
                        <p className="mt-0.5 text-sm text-gray-500">Manage NAT applications, schedules, and course quotas.</p>
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

            <div className="max-w-full overflow-x-auto">
                <div className="inline-flex min-w-max items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                type="button"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${isActive
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                    }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? <LoadingSkeleton /> :
                activeTab === 'applications' ? (
                    <NatApplicationsTab
                        canArchiveRecords={canArchiveRecords} applications={applications} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                        applicationsPage={applicationsPage} setApplicationsPage={setApplicationsPage} applicationsTotal={applicationsTotal} openApplicantDetails={openApplicantDetails}
                        updateStatus={updateStatus} archiveApplication={archiveApplication} filteredApplications={filteredApplications} handleExportPDF={handleExportPDF}
                        handleExportCSV={handleExportCSV}
                    />
                ) : activeTab === 'test takers' ? (
                    <NatTestTakersTab
                        courseLimits={courseLimits} supportsAttendance={supportsAttendance} testTakersCourseFilter={testTakersCourseFilter} setTestTakersCourseFilter={setTestTakersCourseFilter}
                        testTakersPage={testTakersPage} setTestTakersPage={setTestTakersPage} testTakersTotal={testTakersTotal} bulkPassInputRef={bulkPassInputRef}
                        openApplicantDetails={openApplicantDetails} updateStatus={updateStatus} filteredResults={filteredResults} formatAssignedSlot={formatAssignedSlot}
                        handleDownloadBulkPassTemplate={handleDownloadBulkPassTemplate}
                    />
                ) : activeTab === 'status board' ? (
                    <NatStatusBoardTab
                        statusBoardPage={statusBoardPage} setStatusBoardPage={setStatusBoardPage} setStatusBoardFilter={setStatusBoardFilter} openApplicantDetails={openApplicantDetails}
                        statusSections={statusSections} activeStatusSection={activeStatusSection} activeStatusRows={activeStatusRows} paginatedStatusRows={paginatedStatusRows}
                    />
                ) : activeTab === 'completed' ? (
                    <NatCompletedTab
                        canArchiveRecords={canArchiveRecords} completedApplications={completedApplications} completedFilter={completedFilter} setCompletedFilter={setCompletedFilter}
                        completedPage={completedPage} setCompletedPage={setCompletedPage} completedTotal={completedTotal} openApplicantDetails={openApplicantDetails}
                        archiveApplication={archiveApplication} getNatCompletedDateLabel={getNatCompletedDateLabel}
                    />
                ) : activeTab === 'schedules' ? (
                    <NatSchedulesTab
                        canArchiveRecords={canArchiveRecords} schedules={schedules} normalizeTimeSlots={normalizeTimeSlots} toggleSchedule={toggleSchedule}
                        dateApplicantCounts={dateApplicantCounts} dateTimeApplicantCounts={dateTimeApplicantCounts} openAddScheduleModal={openAddScheduleModal} openEditScheduleModal={openEditScheduleModal}
                        handleDeleteSchedule={handleDeleteSchedule} formatTime12h={formatTime12h}
                    />
                ) : activeTab === 'requirements' ? (
                    <NatRequirementsTab
                        canArchiveRecords={canArchiveRecords} natRequirements={natRequirements} inactiveNatRequirements={inactiveNatRequirements} newRequirementName={newRequirementName}
                        setNewRequirementName={setNewRequirementName} isSavingRequirement={isSavingRequirement} pendingRequirementDeleteId={pendingRequirementDeleteId} requirementsPage={requirementsPage}
                        setRequirementsPage={setRequirementsPage} handleAddRequirement={handleAddRequirement} handleDeleteRequirement={handleDeleteRequirement} paginatedRequirements={paginatedRequirements}
                    />
                ) : (
                    <NatLimitsTab
                        courseLimits={courseLimits} limitsPage={limitsPage} setLimitsPage={setLimitsPage}
                    />
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

            {showBulkPassModal && (
                <NatBulkPassModal
                    bulkPassRows={bulkPassRows}
                    bulkPassFileName={bulkPassFileName}
                    bulkPassApplying={bulkPassApplying}
                    bulkPassSummary={bulkPassSummary}
                    closeBulkPassModal={closeBulkPassModal}
                    applyBulkPassList={applyBulkPassList}
                />
            )}

            <NatScheduleModal
                addTimeSlotRow={addTimeSlotRow}
                closeScheduleModal={closeScheduleModal}
                editingSchedule={editingSchedule}
                handleSaveSchedule={handleSaveSchedule}
                modalState={{
                    isEditingLegacySchedule,
                    isSavingSchedule,
                    isScheduleDateLocked,
                    showScheduleModal
                }}
                normalizeTimeSlots={normalizeTimeSlots}
                removeTimeSlotRow={removeTimeSlotRow}
                scheduleForm={scheduleForm}
                setScheduleForm={setScheduleForm}
                updateTimeSlotRow={updateTimeSlotRow}
            />

        </div>
    );
};

export default CareStaffNatPage;
