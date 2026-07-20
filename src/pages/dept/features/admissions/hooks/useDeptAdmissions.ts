import { useState, useCallback } from 'react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';

function useDeptAdmissionsUtils(data: any) {
    const getApplicantFullName = useCallback((application: any) =>
        [application?.first_name, application?.last_name]
            .map((value) => String(value || '').trim())
            .filter(Boolean)
            .join(' ')
        || 'Applicant', []);

    const getCourseNameForChoice = useCallback((application: any, choice?: number) => {
        const currentChoice = Number(choice || application?.current_choice || 1);
        if (currentChoice === 2) return String(application?.alt_course_1 || '').trim() || null;
        if (currentChoice === 3) return String(application?.alt_course_2 || '').trim() || null;
        return String(application?.priority_course || '').trim() || null;
    }, []);

    const getChoiceLabel = useCallback((choice: number) => {
        if (choice === 2) return '2nd Choice';
        if (choice === 3) return '3rd Choice';
        return '1st Choice';
    }, []);

    const shouldKeepAdmissionRow = useCallback((nextStatus: string, application: any, nextChoice?: number) => {
        const normalizedStatus = String(nextStatus || '').trim();
        if (normalizedStatus === 'Interview Scheduled') return true;
        if (normalizedStatus === 'Approved for Enrollment') return false;
        if (normalizedStatus === 'Application Unsuccessful') return false;
        if (!normalizedStatus.includes('Forwarded to')) return true;

        const routedChoice = Number(nextChoice || application?.current_choice || 1);
        const routedCourse = getCourseNameForChoice(application, routedChoice);
        const normalizedCourse = String(routedCourse || '').trim().toLowerCase();
        const routedDepartment = data?.courseMap?.[normalizedCourse];

        if (!routedCourse || !routedDepartment) {
            return true;
        }

        return String(routedDepartment || '').trim() === String(data?.profile?.department || '').trim();
    }, [data?.courseMap, data?.profile?.department, getCourseNameForChoice]);

    const parseInterviewDateTime = useCallback((value: unknown) => {
        const text = String(value || '').trim();
        if (!text) {
            return { date: '', time: '' };
        }

        const [datePart, ...timeParts] = text.split(' ');
        return {
            date: datePart || '',
            time: timeParts.join(' ').trim()
        };
    }, []);

    return {
        getApplicantFullName,
        getCourseNameForChoice,
        getChoiceLabel,
        shouldKeepAdmissionRow,
        parseInterviewDateTime
    };
}

export function useDeptAdmissions({
    data,
    admissionsState,
    showToastMessage,
    openAdmissionsEmailPreview,
    refreshAdmissionsDashboardCounts,
    interviewQueueDate,
    refreshInterviewQueue,
    setInterviewQueueRows,
    matchesInterviewQueueDate,
    shouldRefreshInterviewQueueForDateChange
}: any) {
    const {
        getApplicantFullName,
        getCourseNameForChoice,
        getChoiceLabel,
        shouldKeepAdmissionRow,
        parseInterviewDateTime
    } = useDeptAdmissionsUtils(data);

    const [showApplicantScheduleModal, setShowApplicantScheduleModal] = useState<boolean>(false);
    const [applicantScheduleMode, setApplicantScheduleMode] = useState<'schedule' | 'reschedule'>('schedule');
    const [applicantScheduleData, setApplicantScheduleData] = useState<any>({ date: '', time: '', venue: '', panel: '', notes: '' });
    const [isSchedulingApplicant, setIsSchedulingApplicant] = useState(false);
    const [isProcessingBulkApplicantAction, setIsProcessingBulkApplicantAction] = useState(false);
    const [pendingApplicantActionId, setPendingApplicantActionId] = useState<string | null>(null);
    const [selectedApplicants, setSelectedApplicants] = useState<any[]>([]);

    const invokeManagedAdmissionsFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-department-admissions', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage department admissions.'
        });
    }, []);

    const sendAdmissionsEmailNotification = useCallback(async (payload: any) => {
        return sendTransactionalEmailNotification(payload, 'Failed to send applicant email.');
    }, []);

    const patchAdmissionRows = useCallback((updater: (rows: any[]) => any[]) => {
        admissionsState.setRows((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [admissionsState]);

    const closeApplicantScheduleModal = useCallback(() => {
        setShowApplicantScheduleModal(false);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setSelectedApplicants([]);
    }, []);

    const handleScheduleInterview = useCallback((app: any) => {
        setSelectedApplicants(app ? [app] : []);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setShowApplicantScheduleModal(true);
    }, []);

    const handleBulkScheduleInterviews = useCallback((applications: any[]) => {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0) {
            showToastMessage('Select at least one applicant to bulk schedule.', 'error');
            return;
        }

        setSelectedApplicants(nextApplicants);
        setApplicantScheduleMode('schedule');
        setApplicantScheduleData({ date: '', time: '', venue: '', panel: '', notes: '' });
        setShowApplicantScheduleModal(true);
    }, [showToastMessage]);

    const handleRescheduleInterview = useCallback((app: any) => {
        const nextApplicant = app || null;
        if (!nextApplicant) return;
        if (String(nextApplicant?.interview_queue_status || '').trim() !== 'Absent') {
            showToastMessage('Only applicants marked absent can be rescheduled.', 'error');
            return;
        }

        const { date, time } = parseInterviewDateTime(nextApplicant?.interview_date);
        setSelectedApplicants([nextApplicant]);
        setApplicantScheduleMode('reschedule');
        setApplicantScheduleData({
            date,
            time,
            venue: String(nextApplicant?.interview_venue || ''),
            panel: String(nextApplicant?.interview_panel || ''),
            notes: ''
        });
        setShowApplicantScheduleModal(true);
    }, [parseInterviewDateTime, showToastMessage]);

    const buildScheduleEmailPayloads = useCallback(() => {
        if (selectedApplicants.length === 0) {
            throw new Error('No applicant is selected for scheduling.');
        }
        if (!applicantScheduleData.date || !applicantScheduleData.time) {
            throw new Error('Interview date and time are required.');
        }

        const isReschedule = applicantScheduleMode === 'reschedule';
        const interviewDate = `${applicantScheduleData.date} ${applicantScheduleData.time}`;
        const interviewVenue = String(applicantScheduleData.venue || '').trim();
        const interviewPanel = String(applicantScheduleData.panel || '').trim();

        return selectedApplicants.map((application: any) => ({
            type: isReschedule ? 'APPLICANT_INTERVIEW_RESCHEDULED' : 'APPLICANT_INTERVIEW_SCHEDULED',
            email: application?.email,
            name: getApplicantFullName(application),
            referenceId: application?.reference_id,
            course: getCourseNameForChoice(application),
            interviewDate,
            department: data?.profile?.department,
            venue: interviewVenue,
            panel: interviewPanel
        }));
    }, [applicantScheduleData.date, applicantScheduleData.panel, applicantScheduleData.time, applicantScheduleData.venue, applicantScheduleMode, data?.profile?.department, getApplicantFullName, getCourseNameForChoice, selectedApplicants]);

    const executeApplicantSchedule = useCallback(async () => {
        if (isSchedulingApplicant) return;
        setIsSchedulingApplicant(true);
        try {
            if (selectedApplicants.length === 0) {
                throw new Error('No applicant is selected for scheduling.');
            }

            const interviewDate = `${applicantScheduleData.date} ${applicantScheduleData.time}`;
            const interviewVenue = String(applicantScheduleData.venue || '').trim();
            const interviewPanel = String(applicantScheduleData.panel || '').trim();
            const selectedApplicationIds = selectedApplicants.flatMap((app: any) => {
                const id = String(app?.id || '').trim();
                return id ? [id] : [];
            });

            let scheduledIds: string[] = [];
            let skipped: Array<Record<string, unknown>> = [];
            const isReschedule = applicantScheduleMode === 'reschedule';

            if (isReschedule) {
                await invokeManagedAdmissionsFunction({
                    mode: 'reschedule-interview',
                    applicationId: selectedApplicationIds[0],
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = selectedApplicationIds;
            } else if (selectedApplicants.length === 1) {
                await invokeManagedAdmissionsFunction({
                    mode: 'schedule-interview',
                    applicationId: selectedApplicationIds[0],
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = selectedApplicationIds;
            } else {
                const result = await invokeManagedAdmissionsFunction({
                    mode: 'bulk-schedule-interviews',
                    applicationIds: selectedApplicationIds,
                    date: applicantScheduleData.date,
                    time: applicantScheduleData.time,
                    venue: interviewVenue,
                    panel: interviewPanel
                });
                scheduledIds = Array.isArray(result?.scheduledIds)
                    ? result.scheduledIds.flatMap((id: unknown) => {
                        const normalizedId = String(id || '').trim();
                        return normalizedId ? [normalizedId] : [];
                    })
                    : [];
                skipped = Array.isArray(result?.skipped) ? result.skipped : [];
            }

            if (scheduledIds.length === 0) {
                const skippedMessage = skipped.length > 0
                    ? String(skipped[0]?.reason || 'No applicants could be scheduled.')
                    : 'No applicants could be scheduled.';
                throw new Error(skippedMessage);
            }

            const scheduledIdSet = new Set(scheduledIds.map((id) => String(id)));
            const scheduledApplicants = selectedApplicants.filter((app: any) => scheduledIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.map((row: any) => (
                scheduledIdSet.has(String(row?.id || ''))
                    ? {
                        ...row,
                        status: 'Interview Scheduled',
                        interview_date: interviewDate,
                        interview_venue: interviewVenue || null,
                        interview_panel: interviewPanel || null,
                        interview_queue_status: null
                    }
                    : row
            )));

            const successMessage = isReschedule
                ? 'Interview rescheduled successfully.'
                : scheduledApplicants.length === 1
                    ? 'Interview scheduled successfully.'
                    : `${scheduledApplicants.length} interviews scheduled successfully.`;
            showToastMessage(successMessage, 'success');

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped because they were no longer schedulable.`, 'error');
            }

            closeApplicantScheduleModal();

            if (
                isReschedule
                    ? shouldRefreshInterviewQueueForDateChange(selectedApplicants[0]?.interview_date, interviewDate)
                    : applicantScheduleData.date === interviewQueueDate
            ) {
                void refreshInterviewQueue();
            }

            if (scheduledApplicants.length > 0) {
                void refreshAdmissionsDashboardCounts();
                void Promise.allSettled(scheduledApplicants.map((application: any) => (
                    sendAdmissionsEmailNotification({
                        type: isReschedule ? 'APPLICANT_INTERVIEW_RESCHEDULED' : 'APPLICANT_INTERVIEW_SCHEDULED',
                        email: application?.email,
                        name: getApplicantFullName(application),
                        referenceId: application?.reference_id,
                        course: getCourseNameForChoice(application),
                        interviewDate,
                        department: data?.profile?.department,
                        venue: interviewVenue,
                        panel: interviewPanel
                    })
                ))).then((results) => {
                    const failedCount = results.filter((result) =>
                        result.status === 'fulfilled'
                            ? (result.value as any)?.emailSent === false
                            : true
                    ).length;

                    if (failedCount > 0) {
                        showToastMessage(
                            `${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`,
                            'error'
                        );
                    }
                });
            }
        } catch (err: any) {
            console.error('[DEPT] Schedule exception:', err);
            showToastMessage(err.message, 'error');
        } finally {
            setIsSchedulingApplicant(false);
        }
    }, [applicantScheduleData.date, applicantScheduleData.panel, applicantScheduleData.time, applicantScheduleData.venue, applicantScheduleMode, closeApplicantScheduleModal, data?.profile?.department, getApplicantFullName, getCourseNameForChoice, interviewQueueDate, invokeManagedAdmissionsFunction, isSchedulingApplicant, patchAdmissionRows, refreshAdmissionsDashboardCounts, refreshInterviewQueue, selectedApplicants, sendAdmissionsEmailNotification, shouldRefreshInterviewQueueForDateChange, showToastMessage]);

    const confirmApplicantSchedule = useCallback(async (e: any) => {
        e.preventDefault();
        try {
            const isReschedule = applicantScheduleMode === 'reschedule';
            const previewPayloads = buildScheduleEmailPayloads();
            await openAdmissionsEmailPreview({
                title: isReschedule
                    ? 'Preview Reschedule Email'
                    : selectedApplicants.length > 1
                        ? 'Preview Bulk Schedule Emails'
                        : 'Preview Schedule Email',
                confirmLabel: isReschedule ? 'Confirm Reschedule and Send' : 'Confirm Schedule and Send',
                payloads: previewPayloads,
                onConfirm: executeApplicantSchedule
            });
        } catch (error: any) {
            showToastMessage('Failed to open email preview.', 'error');
        }
    }, [applicantScheduleMode, buildScheduleEmailPayloads, executeApplicantSchedule, openAdmissionsEmailPreview, selectedApplicants.length, showToastMessage]);

    async function handleBulkApproveApplicants(
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Approval Emails',
                confirmLabel: 'Confirm Approval and Send',
                payloads: nextApplicants.map((application: any) => ({
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application),
                    department: data?.profile?.department
                })),
                onConfirm: () => handleBulkApproveApplicants(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants.flatMap((app: any) => {
                const id = String(app?.id || '').trim();
                return id ? [id] : [];
            });
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-approve-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.flatMap((id: unknown) => {
                    const normalizedId = String(id || '').trim();
                    return normalizedId ? [normalizedId] : [];
                })
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be approved.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));
            setInterviewQueueRows((rows: any[]) => rows.map((row: any) => (
                updatedIdSet.has(String(row?.id || ''))
                    ? { ...row, status: 'Approved for Enrollment', interview_queue_status: null }
                    : row
            )));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} approved for enrollment.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk approval.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => (
                sendAdmissionsEmailNotification({
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application),
                    department: data?.profile?.department
                })
            ))).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? (emailResult.value as any)?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage('Failed to bulk approve applicants.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    }

    async function handleBulkForwardApplicants(
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Forward Emails',
                confirmLabel: 'Confirm Forward and Send',
                payloads: nextApplicants.map((application: any) => {
                    const currentChoice = Number(application?.current_choice || 1);
                    const nextChoice = currentChoice + 1;
                    return {
                        type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                        email: application?.email,
                        name: getApplicantFullName(application),
                        referenceId: application?.reference_id,
                        fromChoice: getChoiceLabel(currentChoice),
                        toChoice: getChoiceLabel(nextChoice),
                        nextCourse: getCourseNameForChoice(application, nextChoice),
                        department: data?.profile?.department
                    };
                }),
                onConfirm: () => handleBulkForwardApplicants(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants.flatMap((app: any) => {
                const id = String(app?.id || '').trim();
                return id ? [id] : [];
            });
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-forward-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.flatMap((id: unknown) => {
                    const normalizedId = String(id || '').trim();
                    return normalizedId ? [normalizedId] : [];
                })
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be forwarded.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.flatMap((row: any) => {
                if (!updatedIdSet.has(String(row?.id || ''))) {
                    return [row];
                }

                const nextChoice = Number(row?.current_choice || 1) + 1;
                const nextStatus = nextChoice === 2
                    ? 'Forwarded to 2nd Choice for Interview'
                    : 'Forwarded to 3rd Choice for Interview';

                return shouldKeepAdmissionRow(nextStatus, row, nextChoice)
                    ? [{
                        ...row,
                        status: nextStatus,
                        current_choice: nextChoice,
                        interview_queue_status: null
                    }]
                    : [];
            }));
            setInterviewQueueRows((rows: any[]) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} forwarded to the next course choice.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk forwarding.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => {
                const currentChoice = Number(application?.current_choice || 1);
                const nextChoice = currentChoice + 1;

                return sendAdmissionsEmailNotification({
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    fromChoice: getChoiceLabel(currentChoice),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(application, nextChoice),
                    department: data?.profile?.department
                });
            })).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? (emailResult.value as any)?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage('Failed to bulk forward applicants.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    }

    async function handleBulkMarkApplicantsUnsuccessful(
        applications: any[],
        options: { skipPreview?: boolean } = {}
    ) {
        const nextApplicants = Array.isArray(applications) ? applications.filter(Boolean) : [];
        if (nextApplicants.length === 0 || isProcessingBulkApplicantAction) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Bulk Unsuccessful Emails',
                confirmLabel: 'Confirm Unsuccessful and Send',
                payloads: nextApplicants.map((application: any) => ({
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application, application?.current_choice || 1),
                    department: data?.profile?.department
                })),
                onConfirm: () => handleBulkMarkApplicantsUnsuccessful(nextApplicants, { skipPreview: true })
            });
            return;
        }

        setIsProcessingBulkApplicantAction(true);
        try {
            const applicationIds = nextApplicants.flatMap((app: any) => {
                const id = String(app?.id || '').trim();
                return id ? [id] : [];
            });
            const result = await invokeManagedAdmissionsFunction({
                mode: 'bulk-mark-unsuccessful-applications',
                applicationIds
            });
            const updatedIds = Array.isArray(result?.updatedIds)
                ? result.updatedIds.flatMap((id: unknown) => {
                    const normalizedId = String(id || '').trim();
                    return normalizedId ? [normalizedId] : [];
                })
                : [];
            const skipped = Array.isArray(result?.skipped) ? result.skipped : [];

            if (updatedIds.length === 0) {
                throw new Error(String(skipped[0]?.reason || 'No applicants could be marked unsuccessful.'));
            }

            const updatedIdSet = new Set(updatedIds);
            const updatedApplicants = nextApplicants.filter((app: any) => updatedIdSet.has(String(app?.id || '')));

            patchAdmissionRows((rows) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));
            setInterviewQueueRows((rows: any[]) => rows.filter((row: any) => !updatedIdSet.has(String(row?.id || ''))));

            if (updatedApplicants.some((app: any) => matchesInterviewQueueDate(app?.interview_date))) {
                void refreshInterviewQueue();
            }

            const successMessage = `${updatedApplicants.length} applicant${updatedApplicants.length !== 1 ? 's' : ''} marked unsuccessful.`;
            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();

            if (skipped.length > 0) {
                showToastMessage(`${skipped.length} applicant${skipped.length !== 1 ? 's were' : ' was'} skipped during bulk unsuccessful marking.`, 'error');
            }

            void Promise.allSettled(updatedApplicants.map((application: any) => (
                sendAdmissionsEmailNotification({
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: application?.email,
                    name: getApplicantFullName(application),
                    referenceId: application?.reference_id,
                    course: getCourseNameForChoice(application, application?.current_choice || 1),
                    department: data?.profile?.department
                })
            ))).then((results) => {
                const failedCount = results.filter((emailResult) =>
                    emailResult.status === 'fulfilled'
                        ? (emailResult.value as any)?.emailSent === false
                        : true
                ).length;

                if (failedCount > 0) {
                    showToastMessage(`${successMessage} ${failedCount} applicant email${failedCount !== 1 ? 's' : ''} failed to send.`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage('Failed to bulk mark applicants unsuccessful.', 'error');
        } finally {
            setIsProcessingBulkApplicantAction(false);
        }
    }

    async function handleApproveApplicant(
        app: any,
        options: { skipPreview?: boolean } = {}
    ) {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        if (!options.skipPreview) {
            await openAdmissionsEmailPreview({
                title: 'Preview Approval Email',
                confirmLabel: 'Confirm Approval and Send',
                payloads: [{
                    type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app),
                    department: data?.profile?.department
                }],
                onConfirm: () => handleApproveApplicant(app, { skipPreview: true })
            });
            return;
        }
        setPendingApplicantActionId(nextApplicationId);
        try {
            const emailPayload = {
                type: 'APPLICANT_APPROVED_FOR_ENROLLMENT',
                email: app?.email,
                name: getApplicantFullName(app),
                referenceId: app?.reference_id,
                course: getCourseNameForChoice(app),
                department: data?.profile?.department
            };
            await invokeManagedAdmissionsFunction({
                mode: 'approve-application',
                applicationId: app.id
            });
            showToastMessage('Applicant approved for enrollment.', 'success');
            void refreshAdmissionsDashboardCounts();
            patchAdmissionRows((rows) => rows.filter((row: any) => String(row.id) !== String(app.id)));
            setInterviewQueueRows((rows: any[]) => rows.map((row: any) => (
                String(row.id) === String(app.id)
                    ? { ...row, status: 'Approved for Enrollment' }
                    : row
            )));
            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }
            void sendAdmissionsEmailNotification(emailPayload).then((emailResult) => {
                if (emailResult.emailSent === false) {
                    showToastMessage(`Applicant approved, but email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    }

    const handleMarkApplicantAbsent = useCallback(async (app: any) => {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        if (!window.confirm(`Mark ${app.first_name} as absent for the scheduled interview?`)) return;

        setPendingApplicantActionId(nextApplicationId);
        try {
            await invokeManagedAdmissionsFunction({
                mode: 'set-interview-queue-status',
                applicationId: nextApplicationId,
                queueStatus: 'Absent'
            });

            patchAdmissionRows((rows) => rows.map((row: any) => (
                String(row.id) === nextApplicationId
                    ? { ...row, interview_date: null, interview_queue_status: 'Absent' }
                    : row
            )));
            setInterviewQueueRows((rows: any[]) => rows.filter((row: any) => String(row?.id || '') !== nextApplicationId));

            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }

            showToastMessage('Applicant marked absent.', 'success');
        } catch (err: any) {
            showToastMessage('Failed to mark applicant absent.', 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    }, [invokeManagedAdmissionsFunction, matchesInterviewQueueDate, patchAdmissionRows, pendingApplicantActionId, refreshInterviewQueue, setInterviewQueueRows, showToastMessage]);

    async function handleRejectApplicant(
        app: any,
        options: { skipPreview?: boolean } = {}
    ) {
        const nextApplicationId = String(app?.id || '').trim();
        if (!nextApplicationId || pendingApplicantActionId === nextApplicationId) return;
        const nextChoice = (app.current_choice || 1) + 1;
        const previewStatus = nextChoice === 2 && app.alt_course_1
            ? 'Forwarded to 2nd Choice for Interview'
            : nextChoice === 3 && app.alt_course_2
                ? 'Forwarded to 3rd Choice for Interview'
                : 'Application Unsuccessful';
        if (!options.skipPreview) {
            const previewPayload = previewStatus === 'Application Unsuccessful'
                ? {
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app, app.current_choice || 1),
                    department: data?.profile?.department
                }
                : {
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    fromChoice: getChoiceLabel(app.current_choice || 1),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(app, nextChoice),
                    department: data?.profile?.department
                };
            await openAdmissionsEmailPreview({
                title: previewStatus === 'Application Unsuccessful'
                    ? 'Preview Unsuccessful Email'
                    : 'Preview Forward Email',
                confirmLabel: previewStatus === 'Application Unsuccessful'
                    ? 'Confirm Unsuccessful and Send'
                    : 'Confirm Forward and Send',
                payloads: [previewPayload],
                onConfirm: () => handleRejectApplicant(app, { skipPreview: true })
            });
            return;
        }
        setPendingApplicantActionId(nextApplicationId);
        try {
            let newStatus = '';

            if (nextChoice === 2 && app.alt_course_1) {
                newStatus = 'Forwarded to 2nd Choice for Interview';
            } else if (nextChoice === 3 && app.alt_course_2) {
                newStatus = 'Forwarded to 3rd Choice for Interview';
            } else {
                newStatus = 'Application Unsuccessful';
            }

            await invokeManagedAdmissionsFunction({
                mode: 'reject-application',
                applicationId: app.id
            });

            const emailPayload = newStatus === 'Application Unsuccessful'
                ? {
                    type: 'APPLICANT_UNSUCCESSFUL',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    course: getCourseNameForChoice(app, app.current_choice || 1),
                    department: data?.profile?.department
                }
                : {
                    type: 'APPLICANT_FORWARDED_TO_NEXT_CHOICE',
                    email: app?.email,
                    name: getApplicantFullName(app),
                    referenceId: app?.reference_id,
                    fromChoice: getChoiceLabel(app.current_choice || 1),
                    toChoice: getChoiceLabel(nextChoice),
                    nextCourse: getCourseNameForChoice(app, nextChoice),
                    department: data?.profile?.department
                };

            const successMessage = newStatus === 'Application Unsuccessful'
                ? 'Applicant marked unsuccessful.'
                : 'Applicant forwarded to next choice.';

            showToastMessage(successMessage, 'success');
            void refreshAdmissionsDashboardCounts();
            patchAdmissionRows((rows) => {
                if (!shouldKeepAdmissionRow(newStatus, app, nextChoice)) {
                    return rows.filter((row: any) => String(row.id) !== String(app.id));
                }

                return rows.map((row: any) => (
                    String(row.id) === String(app.id)
                        ? {
                            ...row,
                            status: newStatus,
                            current_choice: nextChoice,
                            interview_queue_status: null
                        }
                        : row
                ));
            });
            setInterviewQueueRows((rows: any[]) => rows.filter((row: any) => String(row.id) !== String(app.id)));
            if (matchesInterviewQueueDate(app?.interview_date)) {
                void refreshInterviewQueue();
            }
            void sendAdmissionsEmailNotification(emailPayload).then((backgroundEmailResult) => {
                if (backgroundEmailResult.emailSent === false) {
                    showToastMessage(`${successMessage} Email failed: ${backgroundEmailResult.emailError || 'Unknown email error.'}`, 'error');
                }
            });
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setPendingApplicantActionId(null);
        }
    }

    return {
        showApplicantScheduleModal,
        applicantScheduleMode,
        applicantScheduleData,
        isSchedulingApplicant,
        isProcessingBulkApplicantAction,
        pendingApplicantActionId,
        selectedApplicants,

        setShowApplicantScheduleModal,
        setApplicantScheduleMode,
        setApplicantScheduleData,
        setSelectedApplicants,

        closeApplicantScheduleModal,
        handleScheduleInterview,
        handleBulkScheduleInterviews,
        handleRescheduleInterview,
        confirmApplicantSchedule,
        handleBulkApproveApplicants,
        handleBulkForwardApplicants,
        handleBulkMarkApplicantsUnsuccessful,
        handleApproveApplicant,
        handleMarkApplicantAbsent,
        handleRejectApplicant
    };
}
