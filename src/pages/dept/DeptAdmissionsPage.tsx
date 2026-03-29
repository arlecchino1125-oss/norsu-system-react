import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, Mail, MapPin, Phone, Users, XCircle } from 'lucide-react';
import { getApplicationDetailsById } from '../../services/applicationDetailsService';

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

const getApplicantFullName = (app: any) => [
    app?.first_name,
    app?.middle_name,
    app?.last_name,
    app?.suffix
]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

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
    const [isLoadingApplicantDetails, setIsLoadingApplicantDetails] = useState(false);

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

    const closeApplicantDetails = () => {
        setSelectedApplicantDetails(null);
        setIsLoadingApplicantDetails(false);
    };

    const openApplicantDetails = async (application: any) => {
        const applicationId = String(application?.id || '').trim();
        if (!applicationId) return;

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
                                                onClick={() => { void openApplicantDetails(app); }}
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
                                                onClick={() => { void openApplicantDetails(app); }}
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
                const applicantFullName = getApplicantFullName(selectedApplicantDetails) || 'Applicant';

                return (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
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
                                    onClick={closeApplicantDetails}
                                    className="text-gray-400 hover:text-gray-600"
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
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">First Name</label><p className="text-sm font-bold text-gray-800">{selectedApplicantDetails?.first_name || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Last Name</label><p className="text-sm font-bold text-gray-800">{selectedApplicantDetails?.last_name || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Middle Name</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.middle_name || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Suffix</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.suffix || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Student ID</label><p className="text-sm font-mono text-gray-700">{selectedApplicantDetails?.student_id || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Date of Birth</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.dob || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Age</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.age || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Place of Birth</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.place_of_birth || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Nationality</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.nationality || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Sex</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.sex || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Gender Identity</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.gender_identity || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Civil Status</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.civil_status || '—'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Address</p>
                                                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Street</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.street || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">City/Municipality</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.city || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Province</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.province || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Zip Code</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.zip_code || '—'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Contact Information</p>
                                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Mobile</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.mobile || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Email</label><p className="text-sm break-all text-gray-700">{selectedApplicantDetails?.email || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Facebook URL</label><p className="text-sm break-all text-gray-700">{selectedApplicantDetails?.facebook_url || '—'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Educational Background</p>
                                                    <div className="mt-3 grid grid-cols-1 gap-3">
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Reason for Applying</label><p className="text-sm whitespace-pre-wrap text-gray-700">{selectedApplicantDetails?.reason || '—'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Course Preferences</p>
                                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                        <div className="md:col-span-2"><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Priority Course</label><p className="text-sm font-bold text-purple-700">{selectedApplicantDetails?.priority_course || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 1</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.alt_course_1 || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Alternative Course 2</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.alt_course_2 || '—'}</p></div>
                                                    </div>
                                                </div>

                                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Test Schedule</p>
                                                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Date</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.test_date || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Test Slot</label><p className="text-sm text-gray-700">{selectedApplicantDetails?.test_time || '—'}</p></div>
                                                        <div><label className="block text-[10px] font-bold text-gray-400 mb-0.5">Date Submitted</label><p className="text-sm text-gray-700">{formatCreatedAtLabel(selectedApplicantDetails?.created_at)}</p></div>
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
            })()}
        </div>
    );
};

export default DeptAdmissionsPage;
