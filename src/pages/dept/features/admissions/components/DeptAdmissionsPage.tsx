import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CalendarClock,
    CheckCircle2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Download,
    Eye,
    Mail,
    MapPin,
    MoreHorizontal,
    Phone,
    Users,
    XCircle
} from 'lucide-react';
import { getApplicationDetailsById } from '../../../../../services/applicationDetailsService';
import { getDepartmentApplicationsPage, getDepartmentCourseNames } from '../../../../../services/deptService';
import { buildCsv } from '../../../../../utils/inputSecurity';

const SCHEDULABLE_STATUSES = new Set([
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview'
]);

const DECISION_READY_STATUSES = new Set([
    'Interview Scheduled'
]);

const isSchedulableApplicant = (app: any) => {
    const currentStatus = String(app?.status || '').trim();
    return SCHEDULABLE_STATUSES.has(currentStatus);
};

const isDecisionReadyApplicant = (app: any) => {
    const currentStatus = String(app?.status || '').trim();
    const isAbsent = String(app?.interview_queue_status || '').trim() === 'Absent';
    return DECISION_READY_STATUSES.has(currentStatus) && !isAbsent;
};

const isBulkSelectableApplicant = (app: any) => {
    return isSchedulableApplicant(app) || isDecisionReadyApplicant(app);
};

const getActiveCourseName = (app: any) => {
    const currentChoice = Number(app?.current_choice || 1);
    if (currentChoice === 2) return app?.alt_course_1;
    if (currentChoice === 3) return app?.alt_course_2;
    return app?.priority_course;
};

const getStatusLabel = (status: string) => {
    if (status === 'Qualified for Interview (1st Choice)') return '1st Choice Pending';
    if (status === 'Forwarded to 2nd Choice for Interview') return '2nd Choice Pending';
    if (status === 'Forwarded to 3rd Choice for Interview') return '3rd Choice Pending';
    return status;
};

const formatDateTimeLabel = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return 'Not set';

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    return parsed.toLocaleString();
};

const formatCreatedAtLabel = (value: unknown) => {
    const text = String(value || '').trim();
    if (!text) return 'Date unavailable';

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
        return text;
    }

    return parsed.toLocaleString();
};

const getApplicantFullName = (app: any) => [
    app?.first_name,
    app?.middle_name,
    app?.last_name,
    app?.suffix
]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const ITEMS_PER_PAGE_DEFAULT = 15;
const PAGE_SIZE_OPTIONS = [10, 15, 25, 50];
const EXPORT_PAGE_LIMIT = 2000;

const buildAdmissionsFilters = (searchTerm: string, statusFilter: string, courseFilter: string) => {
    const filters: Record<string, unknown> = {};
    const search = searchTerm.trim();

    if (search) filters.search = search;
    if (statusFilter !== 'All') filters.status = [statusFilter];
    if (courseFilter !== 'All') filters.course = courseFilter;

    return filters;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Record<string, unknown>>) => {
    if (typeof window === 'undefined') return;

    const csvBody = buildCsv([
        headers,
        ...rows.map((row) => headers.map((header) => row[header]))
    ]);

    const blob = new Blob([csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

const getApplicantDecisionLabel = (app: any) => {
    const nextChoice = Number(app?.current_choice || 1) + 1;
    if (nextChoice === 2 && app?.alt_course_1) return 'Forward to 2nd Choice';
    if (nextChoice === 3 && app?.alt_course_2) return 'Forward to 3rd Choice';
    return 'Mark Unsuccessful';
};

const getApplicantStatusMeta = (status: string) => {
    if (status === 'Qualified for Interview (1st Choice)') {
        return { label: '1st Choice Pending', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <Clock3 size={12} /> };
    }
    if (status === 'Forwarded to 2nd Choice for Interview') {
        return { label: '2nd Choice Pending', tone: 'border-amber-200 bg-amber-50 text-amber-700', icon: <ArrowRight size={12} /> };
    }
    if (status === 'Forwarded to 3rd Choice for Interview') {
        return { label: '3rd Choice Pending', tone: 'border-amber-200 bg-amber-50 text-amber-700', icon: <ArrowRight size={12} /> };
    }
    if (status === 'Interview Scheduled') {
        return { label: 'Interview Scheduled', tone: 'border-blue-200 bg-blue-50 text-blue-700', icon: <CalendarClock size={12} /> };
    }
    if (status === 'Approved for Enrollment') {
        return { label: 'Approved', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} /> };
    }
    if (status === 'Application Unsuccessful') {
        return { label: 'Unsuccessful', tone: 'border-rose-200 bg-rose-50 text-rose-700', icon: <AlertTriangle size={12} /> };
    }
    return { label: getStatusLabel(status), tone: 'border-slate-200 bg-slate-50 text-slate-700', icon: <Clock3 size={12} /> };
};

const buildApplicantTimeline = (app: any) => {
    const currentChoice = Number(app?.current_choice || 1);
    const currentStatus = String(app?.status || '').trim();
    const isAbsent = String(app?.interview_queue_status || '').trim() === 'Absent';
    const timeline = [
        {
            title: 'Application Submitted',
            detail: 'Applicant submitted the admission application.',
            timestamp: formatCreatedAtLabel(app?.created_at)
        }
    ];

    if (currentChoice >= 1) {
        timeline.push({
            title: currentChoice === 1 ? 'Qualified for Interview' : `Routed to ${currentChoice}${currentChoice === 2 ? 'nd' : 'rd'} Choice`,
            detail: currentChoice === 1
                ? `Applicant is under ${app?.priority_course || 'the first-choice course'} for interview screening.`
                : `Applicant was forwarded and is now under ${getActiveCourseName(app) || 'the next course choice'}.`,
            timestamp: 'Admissions routing'
        });
    }

    if (app?.interview_date) {
        timeline.push({
            title: 'Interview Scheduled',
            detail: [
                `Schedule: ${app.interview_date}`,
                app?.interview_venue ? `Venue: ${app.interview_venue}` : null,
                app?.interview_panel ? `Panel: ${app.interview_panel}` : null
            ].filter(Boolean).join(' | '),
            timestamp: 'Current interview'
        });
    } else if (isAbsent) {
        timeline.push({
            title: 'Interview Marked Absent',
            detail: 'The current interview schedule was cleared after the applicant was marked absent.',
            timestamp: 'Attendance update'
        });
    }

    if (currentStatus === 'Approved for Enrollment') {
        timeline.push({
            title: 'Approved for Enrollment',
            detail: 'Applicant was approved by the department for enrollment.',
            timestamp: 'Latest decision'
        });
    } else if (currentStatus === 'Application Unsuccessful') {
        timeline.push({
            title: 'Application Unsuccessful',
            detail: 'Applicant was not advanced by the department.',
            timestamp: 'Latest decision'
        });
    } else if (currentStatus === 'Forwarded to 2nd Choice for Interview' || currentStatus === 'Forwarded to 3rd Choice for Interview') {
        timeline.push({
            title: 'Forwarded to Next Choice',
            detail: `Current status: ${currentStatus}.`,
            timestamp: 'Latest decision'
        });
    } else if (currentStatus === 'Interview Scheduled') {
        timeline.push({
            title: isAbsent ? 'Awaiting Reschedule' : 'Awaiting Interview Decision',
            detail: isAbsent
                ? 'Applicant is waiting for a department reschedule after being marked absent.'
                : 'Applicant is scheduled and waiting for the department interview decision.',
            timestamp: 'Current state'
        });
    }

    return timeline;
};

const ApplicantDetailsModal = ({ selectedApplicantDetails, getStatusLabel, closeApplicantDetails, isLoadingApplicantDetails }: any) => {
const applicantFullName = getApplicantFullName(selectedApplicantDetails) || 'Applicant';

return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-transparent p-4">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">
                        {applicantFullName}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                        {selectedApplicantDetails?.reference_id || 'No reference ID'} | {getStatusLabel(String(selectedApplicantDetails?.status || '').trim())}
                    </p>
                </div>
                <button
                    type="button"
                    aria-label="Close applicant details"
                    onClick={closeApplicantDetails}
                    className={`rounded-xl p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 ${FOCUS_RING}`}
                >
                    <XCircle size={22} />
                </button>
            </div>

            <div className="px-5 py-5">
                {isLoadingApplicantDetails ? (
                    <div className="py-16 text-center text-sm font-medium text-gray-500">Loading applicant details...</div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                            <div className="space-y-4">
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Personal Information</p>
                                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">First Name</p><p className="text-sm font-bold text-gray-800">{selectedApplicantDetails?.first_name || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Last Name</p><p className="text-sm font-bold text-gray-800">{selectedApplicantDetails?.last_name || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Middle Name</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.middle_name || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Suffix</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.suffix || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Date of Birth</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.dob || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Age</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.age || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Place of Birth</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.place_of_birth || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Nationality</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.nationality || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Sex</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.sex || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Gender Identity</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.gender_identity || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Civil Status</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.civil_status || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Address</p>
                                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Street</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.street || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">City/Municipality</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.city || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Province</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.province || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Zip Code</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.zip_code || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Contact Information</p>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Mobile</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.mobile || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Email</p><p className="text-sm break-all text-gray-700">{selectedApplicantDetails?.email || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Facebook URL</p><p className="text-sm break-all text-gray-700">{selectedApplicantDetails?.facebook_url || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Educational Background</p>
                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Reason for Applying</p><p className="text-sm whitespace-pre-wrap text-gray-700">{selectedApplicantDetails?.reason || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Course Preferences</p>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                        <div className="md:col-span-2"><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Priority Course</p><p className="text-sm font-bold text-purple-700">{selectedApplicantDetails?.priority_course || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 1</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.alt_course_1 || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 2</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.alt_course_2 || '—'}</p></div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Test Schedule</p>
                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Date</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.test_date || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Slot</p><p className="text-sm text-gray-700">{selectedApplicantDetails?.test_time || '—'}</p></div>
                                        <div><p className="block text-[10px] font-bold text-gray-400 mb-0.5">Date Submitted</p><p className="text-sm text-gray-700">{formatCreatedAtLabel(selectedApplicantDetails?.created_at)}</p></div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 h-fit">
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Interview Details</p>
                                <div className="mt-3 space-y-2 text-sm text-gray-700">
                                    <p><span className="font-semibold text-gray-900">Interview Schedule:</span> {selectedApplicantDetails?.interview_date ? formatDateTimeLabel(selectedApplicantDetails?.interview_date) : 'Not set'}</p>
                                    <p><span className="font-semibold text-gray-900">Interview Venue:</span> {selectedApplicantDetails?.interview_venue || 'Not set'}</p>
                                    <p><span className="font-semibold text-gray-900">Interview Panel:</span> {selectedApplicantDetails?.interview_panel || 'Not set'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);
};

const ApplicantCard = ({
    app, index, totalCount, pendingApplicantActionId, isBulkSelectableApplicant, selectedApplicantIds, openRowActionId, setOpenRowActionId, toggleApplicantSelection, openApplicantDetails, setIsBulkActionMenuOpen, handleScheduleInterview, handleApproveApplicant, handleRejectApplicant, handleMarkApplicantAbsent, handleRescheduleInterview
}: any) => {
const applicationId = String(app?.id || '');
const isPendingApplicantAction = pendingApplicantActionId === applicationId;
const currentStatus = String(app?.status || '').trim();
const isInterviewScheduled = DECISION_READY_STATUSES.has(currentStatus);
const isAbsent = String(app?.interview_queue_status || '').trim() === 'Absent';
const isSelectable = isBulkSelectableApplicant(app);
const isSelected = selectedApplicantIds.includes(applicationId);
const activeCourse = getActiveCourseName(app) || 'Course not set';
const fullName = getApplicantFullName(app) || 'Applicant';
const statusMeta = getApplicantStatusMeta(currentStatus);

return (
    <article
        key={applicationId}
        className={`relative card-hover rounded-2xl border border-gray-100 bg-white/80 backdrop-blur-sm px-4 py-4 shadow-sm ${openRowActionId === applicationId ? 'z-20' : 'z-0'} ${index !== totalCount - 1 ? '' : ''}`}
    >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    {isSelectable && (
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleApplicantSelection(applicationId)}
                            aria-label={`Select ${fullName}`}
                            className={`h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 ${FOCUS_RING}`}
                        />
                    )}
                    <p className="text-base font-bold text-gray-900">{fullName}</p>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusMeta.tone}`}>
                        {statusMeta.icon}
                        {statusMeta.label}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                        Priority {app?.current_choice || 1}
                    </span>
                    {isAbsent && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                            <AlertTriangle size={12} />
                            Marked Absent
                        </span>
                    )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{app?.reference_id || 'No reference ID'}</span>
                    <span>{activeCourse}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    {app?.email && (
                        <span className="inline-flex items-center gap-1.5">
                            <Mail size={12} />
                            {app.email}
                        </span>
                    )}
                    {app?.mobile && (
                        <span className="inline-flex items-center gap-1.5">
                            <Phone size={12} />
                            {app.mobile}
                        </span>
                    )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {!isAbsent && app?.interview_date && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700">
                            <Calendar size={12} />
                            {app.interview_date}
                        </span>
                    )}
                    {!isAbsent && app?.interview_venue && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-semibold text-emerald-700">
                            <MapPin size={12} />
                            {app.interview_venue}
                        </span>
                    )}
                    {!isAbsent && app?.interview_panel && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 font-semibold text-violet-700">
                            <Users size={12} />
                            {app.interview_panel}
                        </span>
                    )}
                    {isAbsent && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 font-semibold text-amber-700">
                            <AlertTriangle size={12} />
                            Schedule cleared. Awaiting reschedule.
                        </span>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button
                    type="button"
                    onClick={() => { void openApplicantDetails(app); }}
                    className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition ${FOCUS_RING}`}
                >
                    <Eye size={14} />
                    View Details
                </button>

                <div className="relative">
                    <button
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={openRowActionId === applicationId}
                        onClick={(event) => {
                            event.stopPropagation();
                            setIsBulkActionMenuOpen(false);
                            setOpenRowActionId((previous) => previous === applicationId ? null : applicationId);
                        }}
                        className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition ${FOCUS_RING}`}
                    >
                        <MoreHorizontal size={14} />
                        Actions
                        <ChevronDown size={14} />
                    </button>

                    {openRowActionId === applicationId && (
                        <div
                            role="menu"
                            onClick={(event) => event.stopPropagation()}
                            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl"
                        >
                            {!isInterviewScheduled ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        setOpenRowActionId(null);
                                        handleScheduleInterview(app);
                                    }}
                                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 ${FOCUS_RING}`}
                                >
                                    <CalendarClock size={15} />
                                    Schedule Interview
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isPendingApplicantAction}
                                        onClick={() => {
                                            setOpenRowActionId(null);
                                            handleApproveApplicant(app);
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                                    >
                                        <CheckCircle2 size={15} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                        {isPendingApplicantAction ? 'Working...' : 'Approve Applicant'}
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isPendingApplicantAction}
                                        onClick={() => {
                                            setOpenRowActionId(null);
                                            if (isAbsent) {
                                                handleRescheduleInterview(app);
                                                return;
                                            }
                                            handleMarkApplicantAbsent(app);
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                                    >
                                        <AlertTriangle size={15} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                        {isAbsent ? 'Reschedule Interview' : 'Mark Absent'}
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        disabled={isPendingApplicantAction}
                                        onClick={() => {
                                            setOpenRowActionId(null);
                                            handleRejectApplicant(app);
                                        }}
                                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                                    >
                                        <ArrowRight size={15} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                        {isPendingApplicantAction ? 'Working...' : getApplicantDecisionLabel(app)}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </article>
);
};

const AdmissionsPagination = ({ startIndex, endIndex, totalApplicants, currentPage, totalPages, pageSize, setAdmissionsPageSize, setAdmissionsPage, goToPage }: any) => (
    <div className="rounded-2xl border border-gray-100/80 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-800">
                    Showing {startIndex + 1}-{endIndex} of {totalApplicants} results
                </p>
                <p className="text-xs text-gray-500">
                    Page {currentPage} of {totalPages}
                </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold">Rows</span>
                    <select
                        value={pageSize}
                        onChange={(event) => {
                            if (setAdmissionsPageSize) {
                                setAdmissionsPageSize(Number(event.target.value));
                            }
                            if (setAdmissionsPage) {
                                setAdmissionsPage(1);
                            }
                        }}
                        className={`rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ${FOCUS_RING}`}
                    >
                        {PAGE_SIZE_OPTIONS.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-semibold">Jump to</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(event) => goToPage(Number(event.target.value) || 1)}
                        className={`w-20 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 ${FOCUS_RING}`}
                    />
                </label>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        <ChevronLeft size={16} />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>
);

const AdmissionsFilters = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, courseFilter, setCourseFilter, activeCourseOptions }: any) => (
<div className="relative z-0 rounded-2xl border border-gray-100/80 bg-white/80 backdrop-blur-sm p-4 shadow-sm">
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
            placeholder="Search name or reference ID"
        />
        <select
            aria-label="Filter applicants by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
        >
            <option value="All">All Statuses</option>
            <option value="Qualified for Interview (1st Choice)">1st Choice Pending</option>
            <option value="Forwarded to 2nd Choice for Interview">2nd Choice Pending</option>
            <option value="Forwarded to 3rd Choice for Interview">3rd Choice Pending</option>
            <option value="Interview Scheduled">Interview Scheduled</option>
        </select>
        <select
            aria-label="Filter applicants by course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className={`w-full px-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-sm text-gray-700 focus:ring-2 focus:ring-emerald-500/40 ${FOCUS_RING}`}
        >
            <option value="All">All Courses</option>
            {activeCourseOptions.map((course: string) => (
                <option key={course} value={course}>{course}</option>
            ))}
        </select>
    </div>
</div>
);

const AdmissionsToolbar = ({
    selectedFilteredApplicantCount, filteredDecisionApplicants, filteredSchedulableApplicants, toggleCurrentPageSelectableApplicants, filteredSelectableApplicants, isBulkBusy, allCurrentPageSelectableSelected, selectedCurrentPageApplicantCount, currentPageSelectableApplicants, exportMode, setExportMode, exportApplicants, selectedFilteredDecisionApplicants, isBulkActionMenuOpen, setIsBulkActionMenuOpen, handleBulkApproveApplicants, handleBulkForwardApplicants, handleBulkMarkApplicantsUnsuccessful, handleBulkScheduleInterviews, isExportingApplicants, setOpenRowActionId, selectedFilteredApplicants, totalApplicants
}: any) => (
<div className={`relative rounded-2xl border border-gray-100/80 bg-white/80 backdrop-blur-sm p-5 shadow-sm card-hover ${isBulkActionMenuOpen ? 'z-30' : 'z-10'}`}>
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Admissions Screening</h2>
            <p className="text-sm text-gray-500 mt-1 pl-4">Bulk review stays compact here, while detailed actions live under a single row menu.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={14} />
                {selectedFilteredApplicantCount} selected on page
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                <CalendarClock size={14} />
                {filteredDecisionApplicants.length} decision-ready
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                <Clock3 size={14} />
                {filteredSchedulableApplicants.length} awaiting schedule
            </span>
        </div>
    </div>

    <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
            type="button"
            onClick={toggleCurrentPageSelectableApplicants}
            disabled={filteredSelectableApplicants.length === 0 || isBulkBusy}
            className={`px-4 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-bold hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
        >
            {allCurrentPageSelectableSelected ? 'Clear Page' : `Select Page (${selectedCurrentPageApplicantCount}/${currentPageSelectableApplicants.length})`}
        </button>

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
                type="button"
                onClick={() => setExportMode('selected')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${exportMode === 'selected' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} ${FOCUS_RING}`}
            >
                Export Selected
            </button>
            <button
                type="button"
                onClick={() => setExportMode('filtered')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${exportMode === 'filtered' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} ${FOCUS_RING}`}
            >
                Export All Filtered
            </button>
        </div>

        <button
            type="button"
            onClick={() => { void exportApplicants(); }}
            disabled={isExportingApplicants || (exportMode === 'selected' ? selectedFilteredApplicantCount === 0 : totalApplicants === 0)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed ${FOCUS_RING}`}
        >
            <Download size={14} className={isExportingApplicants ? 'animate-spin' : ''} />
            {isExportingApplicants ? 'Exporting...' : 'Export CSV'}
        </button>

        <div className="relative">
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={isBulkActionMenuOpen}
                onClick={(event) => {
                    event.stopPropagation();
                    setOpenRowActionId(null);
                    setIsBulkActionMenuOpen((previous) => !previous);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition disabled:opacity-60 ${FOCUS_RING}`}
            >
                Actions
                <ChevronDown size={14} />
            </button>

            {isBulkActionMenuOpen && (
                <div
                    role="menu"
                    onClick={(event) => event.stopPropagation()}
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setIsBulkActionMenuOpen(false);
                            handleBulkScheduleInterviews(selectedFilteredApplicants);
                        }}
                        disabled={selectedFilteredApplicants.length === 0 || isBulkBusy}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                    >
                        <span className="inline-flex items-center gap-2"><CalendarClock size={15} /> Bulk Schedule</span>
                        <span>{selectedFilteredApplicants.length}</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setIsBulkActionMenuOpen(false);
                            handleBulkApproveApplicants(selectedFilteredDecisionApplicants);
                        }}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                    >
                        <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} /> Bulk Approve</span>
                        <span>{selectedFilteredDecisionApplicants.length}</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setIsBulkActionMenuOpen(false);
                            handleBulkForwardApplicants(selectedFilteredDecisionApplicants);
                        }}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                    >
                        <span className="inline-flex items-center gap-2"><ArrowRight size={15} /> Bulk Forward</span>
                        <span>{selectedFilteredDecisionApplicants.length}</span>
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setIsBulkActionMenuOpen(false);
                            handleBulkMarkApplicantsUnsuccessful(selectedFilteredDecisionApplicants);
                        }}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-45 ${FOCUS_RING}`}
                    >
                        <span className="inline-flex items-center gap-2"><AlertTriangle size={15} /> Bulk Mark Unsuccessful</span>
                        <span>{selectedFilteredDecisionApplicants.length}</span>
                    </button>
                </div>
            )}
        </div>
    </div>
</div>
);

const exportAdmissionsApplicants = async ({
    filteredApplicants, selectedApplicantIds, exportMode, departmentName, activeFilters,
    setExportError, setIsExportingApplicants
}: any) => {
        setExportError('');
        const selectedApplicantIdSet = new Set(selectedApplicantIds);
        const selectedVisibleApplicants = filteredApplicants.filter((app: any) =>
            selectedApplicantIdSet.has(String(app?.id || ''))
        );
        let exportRows = exportMode === 'selected' ? selectedVisibleApplicants : filteredApplicants;
    
        if (exportMode === 'filtered' && departmentName) {
            setIsExportingApplicants(true);
            try {
                const result = await getDepartmentApplicationsPage(
                    departmentName,
                    activeFilters,
                    { page: 1, pageSize: EXPORT_PAGE_LIMIT },
                    { column: 'created_at', ascending: false }
                );
                exportRows = result.rows || [];
            } catch (error: any) {
                setExportError(String(error?.message || 'Failed to export filtered applicants.'));
                return;
            } finally {
                setIsExportingApplicants(false);
            }
        }
    
        if (exportRows.length === 0) return;
    
        const headers = [
            'Reference ID',
            'Applicant Name',
            'Status',
            'Current Choice',
            'Active Course',
            'Email',
            'Mobile',
            'Interview Schedule',
            'Interview Venue',
            'Interview Panel',
            'Queue Status',
            'Submitted At'
        ];
    
        downloadCsv(
            'department-admissions.csv',
            headers,
            exportRows.map((app: any) => ({
                'Reference ID': app?.reference_id || 'N/A',
                'Applicant Name': getApplicantFullName(app) || 'Applicant',
                Status: getStatusLabel(String(app?.status || '').trim()),
                'Current Choice': `Priority ${app?.current_choice || 1}`,
                'Active Course': getActiveCourseName(app) || 'Course not set',
                Email: app?.email || 'N/A',
                Mobile: app?.mobile || 'N/A',
                'Interview Schedule': app?.interview_date || 'Not set',
                'Interview Venue': app?.interview_venue || 'Not set',
                'Interview Panel': app?.interview_panel || 'Not set',
                'Queue Status': app?.interview_queue_status || 'Active',
                'Submitted At': formatCreatedAtLabel(app?.created_at)
            }))
        );
};

const DeptAdmissionsPage = ({
    applicants,
    admissionsState,
    departmentName,
    courseOptions = [],
    handleApproveApplicant,
    handleRejectApplicant,
    handleMarkApplicantAbsent,
    handleBulkApproveApplicants,
    handleBulkForwardApplicants,
    handleBulkMarkApplicantsUnsuccessful,
    handleRescheduleInterview,
    handleScheduleInterview,
    handleBulkScheduleInterviews,
    pendingApplicantActionId,
    isSchedulingApplicant,
    isProcessingBulkApplicantAction
}: any) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [courseFilter, setCourseFilter] = useState('All');
    const [selectedApplicantIds, setSelectedApplicantIds] = useState<string[]>([]);
    const [selectedApplicantDetails, setSelectedApplicantDetails] = useState<any>(null);
    const [isLoadingApplicantDetails, setIsLoadingApplicantDetails] = useState(false);
    const [isBulkActionMenuOpen, setIsBulkActionMenuOpen] = useState(false);
    const [openRowActionId, setOpenRowActionId] = useState<string | null>(null);
    const [exportMode, setExportMode] = useState<'selected' | 'filtered'>('selected');
    const [isExportingApplicants, setIsExportingApplicants] = useState(false);
    const [exportError, setExportError] = useState('');
    const [departmentCourseOptions, setDepartmentCourseOptions] = useState<string[]>([]);

    const pageApplicants = useMemo(() => (
        Array.isArray(admissionsState?.rows)
            ? admissionsState.rows
            : Array.isArray(applicants)
                ? applicants
                : []
    ), [admissionsState?.rows, applicants]);
    const setAdmissionsFilters = admissionsState?.setFilters;
    const setAdmissionsPage = admissionsState?.setPage;
    const setAdmissionsPageSize = admissionsState?.setPageSize;
    const currentPage = Number(admissionsState?.page || 1);
    const pageSize = Number(admissionsState?.pageSize || ITEMS_PER_PAGE_DEFAULT);
    const totalApplicants = Number(admissionsState?.total ?? pageApplicants.length);
    const isAdmissionsLoading = Boolean(admissionsState?.isLoading);
    const admissionsError = admissionsState?.error ? String(admissionsState.error) : '';
    const activeFilters = buildAdmissionsFilters(searchTerm, statusFilter, courseFilter);
    const activeCourseOptions = (departmentCourseOptions.length > 0
        ? departmentCourseOptions
        : Array.isArray(courseOptions) && courseOptions.length > 0
        ? courseOptions
        : [...new Set(pageApplicants.flatMap((app: any) => {
            const courseName = getActiveCourseName(app);
            return courseName ? [courseName] : [];
        }))]
    ).toSorted();

    useEffect(() => {
        const selectableApplicantIds = new Set(
            pageApplicants.flatMap((app: any) => isBulkSelectableApplicant(app) ? [String(app.id)] : [])
        );
        setSelectedApplicantIds((prev) => prev.filter((id) => selectableApplicantIds.has(id)));
    }, [pageApplicants]);

    useEffect(() => {
        if (!setAdmissionsFilters || !setAdmissionsPage) return;

        const timeout = window.setTimeout(() => {
            setAdmissionsFilters(buildAdmissionsFilters(searchTerm, statusFilter, courseFilter));
            setAdmissionsPage(1);
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [searchTerm, statusFilter, courseFilter, setAdmissionsFilters, setAdmissionsPage]);

    useEffect(() => {
        if (!departmentName) {
            setDepartmentCourseOptions([]);
            return;
        }

        let cancelled = false;
        getDepartmentCourseNames(departmentName)
            .then((courses) => {
                if (!cancelled) setDepartmentCourseOptions(courses);
            })
            .catch(() => {
                if (!cancelled) setDepartmentCourseOptions([]);
            });

        return () => {
            cancelled = true;
        };
    }, [departmentName]);

    useEffect(() => {
        if (!isBulkActionMenuOpen && !openRowActionId) return;

        const handleGlobalClick = () => {
            setIsBulkActionMenuOpen(false);
            setOpenRowActionId(null);
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsBulkActionMenuOpen(false);
                setOpenRowActionId(null);
            }
        };

        document.addEventListener('click', handleGlobalClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('click', handleGlobalClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isBulkActionMenuOpen, openRowActionId]);

    const filteredApplicants = pageApplicants;

    const filteredSchedulableApplicants = filteredApplicants.filter((app: any) => isSchedulableApplicant(app));
    const filteredDecisionApplicants = filteredApplicants.filter((app: any) => isDecisionReadyApplicant(app));
    const filteredSelectableApplicants = filteredApplicants.filter((app: any) => isBulkSelectableApplicant(app));

    const totalPages = Math.max(1, Math.ceil(totalApplicants / pageSize));
    const startIndex = totalApplicants === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + filteredApplicants.length, totalApplicants);
    const paginatedApplicants = filteredApplicants;
    const currentPageSelectableApplicants = paginatedApplicants.filter((app: any) => isBulkSelectableApplicant(app));
    const selectedApplicantIdSet = useMemo(() => new Set(selectedApplicantIds), [selectedApplicantIds]);

    const selectedFilteredApplicants = filteredSchedulableApplicants.filter((app: any) =>
        selectedApplicantIdSet.has(String(app.id))
    );
    const selectedFilteredDecisionApplicants = filteredDecisionApplicants.filter((app: any) =>
        selectedApplicantIdSet.has(String(app.id))
    );
    const selectedFilteredApplicantCount = filteredSelectableApplicants.filter((app: any) =>
        selectedApplicantIdSet.has(String(app.id))
    ).length;
    const selectedCurrentPageApplicantCount = currentPageSelectableApplicants.filter((app: any) =>
        selectedApplicantIdSet.has(String(app.id))
    ).length;

    const allCurrentPageSelectableSelected = currentPageSelectableApplicants.length > 0
        && currentPageSelectableApplicants.every((app: any) => selectedApplicantIdSet.has(String(app.id)));
    const isBulkBusy = Boolean(isSchedulingApplicant || isProcessingBulkApplicantAction);

    const goToPage = (nextPage: number) => {
        const safePage = Number.isFinite(nextPage) ? Math.min(Math.max(nextPage, 1), totalPages) : 1;
        if (setAdmissionsPage) {
            setAdmissionsPage(safePage);
        }
    };

    const toggleApplicantSelection = (applicationId: string) => {
        setSelectedApplicantIds((prev) => (
            prev.includes(applicationId)
                ? prev.filter((id) => id !== applicationId)
                : [...prev, applicationId]
        ));
    };

    const toggleCurrentPageSelectableApplicants = () => {
        const pageIds = currentPageSelectableApplicants.map((app: any) => String(app.id));
        const pageIdSet = new Set(pageIds);
        setSelectedApplicantIds((prev) => {
            if (allCurrentPageSelectableSelected) {
                return prev.filter((id) => !pageIdSet.has(id));
            }

            return Array.from(new Set([...prev, ...pageIds]));
        });
    };

    const closeApplicantDetails = () => {
        setSelectedApplicantDetails(null);
        setIsLoadingApplicantDetails(false);
    };

    const openApplicantDetails = async (application: any) => {
        const applicationId = String(application?.id || '').trim();
        if (!applicationId) return;

        setOpenRowActionId(null);
        setSelectedApplicantDetails(application);
        setIsLoadingApplicantDetails(true);

        try {
            const details = await getApplicationDetailsById(applicationId);
            setSelectedApplicantDetails(details);
        } catch (error) {
            console.error('Failed to load department applicant details:', error);
        } finally {
            setIsLoadingApplicantDetails(false);
        }
    };

    const exportApplicants = () => exportAdmissionsApplicants({
        filteredApplicants, selectedApplicantIds, exportMode, departmentName, activeFilters,
        setExportError, setIsExportingApplicants
    });

    return (
        <div className="relative isolate">
            <div className="dept-admissions-compact space-y-4">
            <AdmissionsToolbar
                selectedFilteredApplicantCount={selectedFilteredApplicantCount} filteredDecisionApplicants={filteredDecisionApplicants} filteredSchedulableApplicants={filteredSchedulableApplicants} toggleCurrentPageSelectableApplicants={toggleCurrentPageSelectableApplicants}
                filteredSelectableApplicants={filteredSelectableApplicants} isBulkBusy={isBulkBusy} allCurrentPageSelectableSelected={allCurrentPageSelectableSelected} selectedCurrentPageApplicantCount={selectedCurrentPageApplicantCount}
                currentPageSelectableApplicants={currentPageSelectableApplicants} exportMode={exportMode} setExportMode={setExportMode} exportApplicants={exportApplicants}
                selectedFilteredDecisionApplicants={selectedFilteredDecisionApplicants} isBulkActionMenuOpen={isBulkActionMenuOpen} setIsBulkActionMenuOpen={setIsBulkActionMenuOpen} handleBulkApproveApplicants={handleBulkApproveApplicants}
                handleBulkForwardApplicants={handleBulkForwardApplicants} handleBulkMarkApplicantsUnsuccessful={handleBulkMarkApplicantsUnsuccessful} handleBulkScheduleInterviews={handleBulkScheduleInterviews} isExportingApplicants={isExportingApplicants}
                setOpenRowActionId={setOpenRowActionId} selectedFilteredApplicants={selectedFilteredApplicants} totalApplicants={totalApplicants}
            />

            <AdmissionsFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                courseFilter={courseFilter}
                setCourseFilter={setCourseFilter}
                activeCourseOptions={activeCourseOptions}
            />

            {admissionsError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {admissionsError}
                </div>
            )}
            {exportError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                    {exportError}
                </div>
            )}

            <div className="space-y-3">
                {isAdmissionsLoading ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        Loading applicants...
                    </div>
                ) : filteredApplicants.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        No applicants found for the current filters.
                    </div>
                ) : (
                    <>
                {paginatedApplicants.map((app: any, index: number) => (
                    <ApplicantCard
                        key={String(app?.id || '')} app={app} index={index} totalCount={paginatedApplicants.length}
                        pendingApplicantActionId={pendingApplicantActionId} isBulkSelectableApplicant={isBulkSelectableApplicant} selectedApplicantIds={selectedApplicantIds} openRowActionId={openRowActionId}
                        setOpenRowActionId={setOpenRowActionId} toggleApplicantSelection={toggleApplicantSelection} openApplicantDetails={openApplicantDetails} setIsBulkActionMenuOpen={setIsBulkActionMenuOpen}
                        handleScheduleInterview={handleScheduleInterview} handleApproveApplicant={handleApproveApplicant} handleRejectApplicant={handleRejectApplicant} handleMarkApplicantAbsent={handleMarkApplicantAbsent}
                        handleRescheduleInterview={handleRescheduleInterview}
                    />
                ))}
                    <AdmissionsPagination
                        startIndex={startIndex}
                        endIndex={endIndex}
                        totalApplicants={totalApplicants}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        setAdmissionsPageSize={setAdmissionsPageSize}
                        setAdmissionsPage={setAdmissionsPage}
                        goToPage={goToPage}
                    />
                    </>
                )}
            </div>
            </div>

            {selectedApplicantDetails && (
                <ApplicantDetailsModal
                    selectedApplicantDetails={selectedApplicantDetails}
                    getStatusLabel={getStatusLabel}
                    closeApplicantDetails={closeApplicantDetails}
                    isLoadingApplicantDetails={isLoadingApplicantDetails}
                />
            )}
        </div>
    );
};

export default DeptAdmissionsPage;
