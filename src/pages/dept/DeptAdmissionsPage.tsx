import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Mail, MapPin, Phone, Users, XCircle } from 'lucide-react';

const SCHEDULABLE_STATUSES = new Set([
    'Qualified for Interview (1st Choice)',
    'Forwarded to 2nd Choice for Interview',
    'Forwarded to 3rd Choice for Interview'
]);

const DECISION_READY_STATUSES = new Set([
    'Interview Scheduled'
]);

const isBulkSelectableApplicant = (app: any) => {
    const currentStatus = String(app?.status || '').trim();
    const isAbsent = String(app?.interview_queue_status || '').trim() === 'Absent';
    return DECISION_READY_STATUSES.has(currentStatus) && !isAbsent;
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

const DeptAdmissionsPage = ({
    applicants,
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

    const allApplicants = Array.isArray(applicants) ? applicants : [];

    useEffect(() => {
        const selectableApplicantIds = new Set(
            allApplicants
                .filter((app: any) => isBulkSelectableApplicant(app))
                .map((app: any) => String(app.id))
        );
        setSelectedApplicantIds((prev) => prev.filter((id) => selectableApplicantIds.has(id)));
    }, [allApplicants]);

    const uniqueCourses = [...new Set(allApplicants.map((app: any) => getActiveCourseName(app)).filter(Boolean))].sort();

    const filteredApplicants = allApplicants.filter((app: any) => {
        const searchString = `${app.first_name || ''} ${app.last_name || ''} ${app.reference_id || ''}`.toLowerCase();
        const matchesSearch = !searchTerm || searchString.includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
        const matchesCourse = courseFilter === 'All' || getActiveCourseName(app) === courseFilter;
        return matchesSearch && matchesStatus && matchesCourse;
    });

    const filteredSchedulableApplicants = filteredApplicants.filter((app: any) =>
        SCHEDULABLE_STATUSES.has(String(app?.status || '').trim())
    );
    const filteredDecisionApplicants = filteredApplicants.filter((app: any) =>
        DECISION_READY_STATUSES.has(String(app?.status || '').trim())
    );
    const filteredSelectableApplicants = filteredApplicants.filter((app: any) => isBulkSelectableApplicant(app));

    const selectedFilteredApplicants = filteredSchedulableApplicants.filter((app: any) =>
        selectedApplicantIds.includes(String(app.id))
    );
    const selectedFilteredDecisionApplicants = filteredDecisionApplicants.filter((app: any) =>
        selectedApplicantIds.includes(String(app.id))
    );

    const allFilteredSelectableSelected = filteredSelectableApplicants.length > 0
        && filteredSelectableApplicants.every((app: any) => selectedApplicantIds.includes(String(app.id)));
    const isBulkBusy = Boolean(isSchedulingApplicant || isProcessingBulkApplicantAction);

    const toggleApplicantSelection = (applicationId: string) => {
        setSelectedApplicantIds((prev) => (
            prev.includes(applicationId)
                ? prev.filter((id) => id !== applicationId)
                : [...prev, applicationId]
        ));
    };

    const toggleAllFilteredSelectableApplicants = () => {
        const filteredIds = filteredSelectableApplicants.map((app: any) => String(app.id));
        setSelectedApplicantIds((prev) => {
            if (allFilteredSelectableSelected) {
                return prev.filter((id) => !filteredIds.includes(id));
            }

            return Array.from(new Set([...prev, ...filteredIds]));
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 border-l-4 border-emerald-500 pl-3">Admissions Screening</h2>
                    <p className="text-sm text-gray-500 mt-1 pl-4">Minimal applicant list for faster department screening and interview actions.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={toggleAllFilteredSelectableApplicants}
                        disabled={filteredSelectableApplicants.length === 0 || isBulkBusy}
                        className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {allFilteredSelectableSelected ? 'Clear Filtered' : 'Select Filtered'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleBulkScheduleInterviews(selectedFilteredApplicants)}
                        disabled={selectedFilteredApplicants.length === 0 || isBulkBusy}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSchedulingApplicant ? 'Scheduling...' : `Bulk Schedule${selectedFilteredApplicants.length > 0 ? ` (${selectedFilteredApplicants.length})` : ''}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleBulkApproveApplicants(selectedFilteredDecisionApplicants)}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isProcessingBulkApplicantAction ? 'Working...' : `Bulk Approve${selectedFilteredDecisionApplicants.length > 0 ? ` (${selectedFilteredDecisionApplicants.length})` : ''}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleBulkForwardApplicants(selectedFilteredDecisionApplicants)}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isProcessingBulkApplicantAction ? 'Working...' : `Bulk Forward${selectedFilteredDecisionApplicants.length > 0 ? ` (${selectedFilteredDecisionApplicants.length})` : ''}`}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleBulkMarkApplicantsUnsuccessful(selectedFilteredDecisionApplicants)}
                        disabled={selectedFilteredDecisionApplicants.length === 0 || isBulkBusy}
                        className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isProcessingBulkApplicantAction ? 'Working...' : `Bulk Unsuccessful${selectedFilteredDecisionApplicants.length > 0 ? ` (${selectedFilteredDecisionApplicants.length})` : ''}`}
                    </button>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                        placeholder="Search name or reference ID"
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Qualified for Interview (1st Choice)">1st Choice Pending</option>
                        <option value="Forwarded to 2nd Choice for Interview">2nd Choice Pending</option>
                        <option value="Forwarded to 3rd Choice for Interview">3rd Choice Pending</option>
                        <option value="Interview Scheduled">Interview Scheduled</option>
                    </select>
                    <select
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                        <option value="All">All Courses</option>
                        {uniqueCourses.map((course: string) => (
                            <option key={course} value={course}>{course}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                {filteredApplicants.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-gray-500">
                        No applicants found for the current filters.
                    </div>
                ) : filteredApplicants.map((app: any, index: number) => {
                    const applicationId = String(app?.id || '');
                    const isPendingApplicantAction = pendingApplicantActionId === applicationId;
                    const currentStatus = String(app?.status || '').trim();
                    const isSchedulable = SCHEDULABLE_STATUSES.has(currentStatus);
                    const isInterviewScheduled = DECISION_READY_STATUSES.has(currentStatus);
                    const isAbsent = String(app?.interview_queue_status || '').trim() === 'Absent';
                    const isSelectable = isBulkSelectableApplicant(app);
                    const isSelected = selectedApplicantIds.includes(applicationId);
                    const activeCourse = getActiveCourseName(app) || 'Course not set';
                    const fullName = `${app?.first_name || ''} ${app?.last_name || ''}`.trim() || 'Applicant';

                    return (
                        <div
                            key={applicationId}
                            className={`px-4 py-3 ${index !== filteredApplicants.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {isSelectable && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleApplicantSelection(applicationId)}
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                        )}
                                        <p className="text-sm font-semibold text-gray-900">{fullName}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isInterviewScheduled ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                            {getStatusLabel(currentStatus)}
                                        </span>
                                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                                            Priority {app?.current_choice || 1}
                                        </span>
                                        {isAbsent && (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                                                Marked Absent
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                                        <span>{app?.reference_id || 'No reference ID'}</span>
                                        <span>{activeCourse}</span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
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

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                        {!isAbsent && app?.interview_date && (
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                                                <Calendar size={12} />
                                                {app.interview_date}
                                            </span>
                                        )}
                                        {!isAbsent && app?.interview_venue && (
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700">
                                                <MapPin size={12} />
                                                {app.interview_venue}
                                            </span>
                                        )}
                                        {!isAbsent && app?.interview_panel && (
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                                                <Users size={12} />
                                                {app.interview_panel}
                                            </span>
                                        )}
                                        {isAbsent && (
                                            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-semibold text-amber-700">
                                                Schedule cleared. Awaiting reschedule.
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 xl:justify-end">
                                    {!isInterviewScheduled ? (
                                        <>
                                            <button
                                                onClick={() => handleScheduleInterview(app)}
                                                className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                Schedule Interview
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedApplicantDetails(app)}
                                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                disabled={isPendingApplicantAction}
                                                onClick={() => handleApproveApplicant(app)}
                                                className="px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm font-semibold hover:bg-green-600 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-green-50 disabled:hover:text-green-700"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <CheckCircle size={14} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                                    {isPendingApplicantAction ? 'Working...' : 'Approve'}
                                                </span>
                                            </button>
                                            <button
                                                disabled={isPendingApplicantAction}
                                                onClick={() => handleRejectApplicant(app)}
                                                className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold hover:bg-red-600 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-red-50 disabled:hover:text-red-700"
                                            >
                                                <span className="inline-flex items-center gap-1.5">
                                                    <XCircle size={14} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                                    {isPendingApplicantAction ? 'Working...' : 'Reject'}
                                                </span>
                                            </button>
                                            {isAbsent ? (
                                                <button
                                                    disabled={isPendingApplicantAction}
                                                    onClick={() => handleRescheduleInterview(app)}
                                                    className="px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-blue-50 disabled:hover:text-blue-700"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Calendar size={14} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                                        {isPendingApplicantAction ? 'Working...' : 'Reschedule'}
                                                    </span>
                                                </button>
                                            ) : (
                                                <button
                                                    disabled={isPendingApplicantAction}
                                                    onClick={() => handleMarkApplicantAbsent(app)}
                                                    className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-600 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-amber-50 disabled:hover:text-amber-700"
                                                >
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <XCircle size={14} className={isPendingApplicantAction ? 'animate-spin' : ''} />
                                                        {isPendingApplicantAction ? 'Working...' : 'Mark Absent'}
                                                    </span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setSelectedApplicantDetails(app)}
                                                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
                                            >
                                                View Details
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedApplicantDetails && (() => {
                const applicantTimeline = buildApplicantTimeline(selectedApplicantDetails);

                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
                            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {`${selectedApplicantDetails?.first_name || ''} ${selectedApplicantDetails?.last_name || ''}`.trim() || 'Applicant'}
                                    </h3>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {selectedApplicantDetails?.reference_id || 'No reference ID'} | {getStatusLabel(String(selectedApplicantDetails?.status || '').trim())}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedApplicantDetails(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <XCircle size={22} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[1fr_1.2fr]">
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Applicant Details</p>
                                        <div className="mt-3 space-y-2 text-sm text-gray-700">
                                            <p><span className="font-semibold text-gray-900">Course:</span> {getActiveCourseName(selectedApplicantDetails) || 'Not set'}</p>
                                            <p><span className="font-semibold text-gray-900">Priority:</span> {selectedApplicantDetails?.current_choice || 1}</p>
                                            <p><span className="font-semibold text-gray-900">Email:</span> {selectedApplicantDetails?.email || 'Not set'}</p>
                                            <p><span className="font-semibold text-gray-900">Mobile:</span> {selectedApplicantDetails?.mobile || 'Not set'}</p>
                                            <p><span className="font-semibold text-gray-900">Submitted:</span> {formatCreatedAtLabel(selectedApplicantDetails?.created_at)}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Current Interview Details</p>
                                        <div className="mt-3 space-y-2 text-sm text-gray-700">
                                            <p><span className="font-semibold text-gray-900">Schedule:</span> {selectedApplicantDetails?.interview_date ? formatDateTimeLabel(selectedApplicantDetails?.interview_date) : 'No active interview schedule'}</p>
                                            <p><span className="font-semibold text-gray-900">Venue:</span> {selectedApplicantDetails?.interview_venue || 'Not set'}</p>
                                            <p><span className="font-semibold text-gray-900">Panel:</span> {selectedApplicantDetails?.interview_panel || 'Not set'}</p>
                                            <p><span className="font-semibold text-gray-900">Attendance:</span> {String(selectedApplicantDetails?.interview_queue_status || '').trim() === 'Absent' ? 'Marked Absent' : 'Not marked absent'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-xl border border-gray-200 bg-white p-4">
                                        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Applicant Timeline / History</p>
                                        <div className="mt-4 space-y-4">
                                            {applicantTimeline.map((item, index) => (
                                                <div key={`${item.title}-${index}`} className="relative pl-6">
                                                    <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                                    {index !== applicantTimeline.length - 1 && (
                                                        <div className="absolute left-[4px] top-4 h-[calc(100%+0.5rem)] w-px bg-emerald-200" />
                                                    )}
                                                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                                    <p className="mt-1 text-sm text-gray-600">{item.detail}</p>
                                                    <p className="mt-1 text-xs font-medium text-gray-400">{item.timestamp}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default DeptAdmissionsPage;
