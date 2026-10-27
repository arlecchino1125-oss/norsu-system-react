import { useState, useCallback, useEffect, useRef } from 'react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { getStudentsPage } from '../../../../../services/deptService';
import { COUNSELING_STATUS } from '../../../../../utils/workflow';

export function useDeptCounseling({
    data,
    filteredData,
    counselingState,
    showToastMessage,
    updateGlobalRows
}: any) {
    const [counselingTab, setCounselingTab] = useState<string>(COUNSELING_STATUS.APPROVED);
    const [selectedCounselingReq, setSelectedCounselingReq] = useState<any>(null);
    const [showCounselingViewModal, setShowCounselingViewModal] = useState<boolean>(false);
    const [deptFormModalView, setDeptFormModalView] = useState<string>('referral');
    const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
    const [scheduleData, setScheduleData] = useState<any>({ date: '', time: '', notes: '' });
    const [forwardingToStaff, setForwardingToStaff] = useState<boolean>(false);
    const [isSubmittingCounselingSchedule, setIsSubmittingCounselingSchedule] = useState(false);
    const [pendingCounselingCompletionId, setPendingCounselingCompletionId] = useState<string | null>(null);
    const [isSubmittingReferral, setIsSubmittingReferral] = useState(false);
    const [referralSearchQuery, setReferralSearchQuery] = useState<string>('');
    const [referralStudentOptions, setReferralStudentOptions] = useState<any[]>([]);
    const [isReferralStudentSearchLoading, setIsReferralStudentSearchLoading] = useState(false);
    const [selectedReferralStudent, setSelectedReferralStudent] = useState<any>(null);

    const [showReferralModal, setShowReferralModal] = useState<boolean>(false);
    const [referralForm, setReferralForm] = useState<any>({
        student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: ''
    });

    const sigCanvasRef = useRef<any>(null);

    // Server-side student search - the loaded students page only holds 25 rows,
    // so the referral picker must query the full directory
    useEffect(() => {
        const query = String(referralSearchQuery || '').trim();
        const department = String(data?.profile?.department || '').trim();
        if (!query || referralForm.student || !department) {
            setReferralStudentOptions([]);
            setIsReferralStudentSearchLoading(false);
            return;
        }
        setReferralStudentOptions([]);
        setIsReferralStudentSearchLoading(true);
        let isCancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const result = await getStudentsPage(
                    { department, search: query },
                    { page: 1, pageSize: 8 }
                );
                if (isCancelled) return;
                setReferralStudentOptions((result.rows || []).map((student: any) => ({
                    ...student,
                    id: student.student_id,
                    name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
                    year: student.year_level
                })));
            } catch {
                if (!isCancelled) {
                    setReferralStudentOptions([]);
                }
            } finally {
                if (!isCancelled) {
                    setIsReferralStudentSearchLoading(false);
                }
            }
        }, 300);
        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [data?.profile?.department, referralSearchQuery, referralForm.student]);

    const selectReferralStudent = useCallback((student: any) => {
        setSelectedReferralStudent(student);
        setReferralForm((prev: any) => ({ ...prev, student: student?.name || '' }));
        setReferralSearchQuery(student?.name || '');
        setIsReferralStudentSearchLoading(false);
    }, []);

    const invokeManagedDepartmentServicesFunction = useCallback(async (body: any) => {
        return invokeEdgeFunction('manage-department-services', {
            body,
            requireAuth: true,
            non2xxMessage: 'Your department session could not be verified. Sign in again.',
            fallbackMessage: 'Failed to manage department services.'
        });
    }, []);

    const queueProcessEmailNotification = useCallback((payload: any, context: string) => {
        if (!payload) return;
        void sendTransactionalEmailNotification(payload).then((emailResult) => {
            if (emailResult.emailSent === false) {
                showToastMessage(`${context} Email failed: ${emailResult.emailError || 'Unknown email error.'}`, 'error');
            }
        });
    }, [showToastMessage]);

    const patchCounselingRows = useCallback((updater: (rows: any[]) => any[]) => {
        counselingState.setFilters((prev: any) => prev); // dummy trigger if needed
        if (typeof counselingState.refresh === 'function') {
            // we rely on global state update but patch local memory
            // the God Hook used `setCounselingRequests` from `useDeptData`
        }
    }, [counselingState]);
    const [showCompleteModal, setShowCompleteModal] = useState<boolean>(false);
    const [completeNotes, setCompleteNotes] = useState<string>('');
    const [isSubmittingCounselingComplete, setIsSubmittingCounselingComplete] = useState(false);

    const openCompleteModal = useCallback((req: any) => {
        setSelectedCounselingReq(req);
        setCompleteNotes('');
        setShowCompleteModal(true);
        setShowCounselingViewModal(false);
    }, []);

    const openRescheduleModal = useCallback((req: any) => {
        setSelectedCounselingReq(req);
        const scheduled = req?.scheduled_date || req?.schedule_date || '';
        let d = '', t = '';
        if (scheduled) {
            const parts = String(scheduled).split(' ');
            d = parts[0] || '';
            t = parts[1] || '';
        }
        setScheduleData({ date: d, time: t, notes: req?.resolution_notes || '' });
        setShowScheduleModal(true);
        setShowCounselingViewModal(false);
    }, []);

    const handleApproveAndSchedule = async (e: any) => {
        e.preventDefault();
        if (!selectedCounselingReq || isSubmittingCounselingSchedule) return;
        setIsSubmittingCounselingSchedule(true);
        try {
            const isReschedule = selectedCounselingReq.status === COUNSELING_STATUS.SCHEDULED;
            const scheduledDate = `${scheduleData.date} ${scheduleData.time}`;
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'schedule-counseling',
                requestId: selectedCounselingReq.id,
                date: scheduleData.date,
                time: scheduleData.time,
                notes: scheduleData.notes
            });
            updateGlobalRows((rows: any[]) => rows.map((row: any) => (
                String(row.id) === String(selectedCounselingReq.id)
                    ? {
                        ...row,
                        status: COUNSELING_STATUS.SCHEDULED,
                        scheduled_date: scheduledDate,
                        resolution_notes: scheduleData.notes || null
                    }
                    : row
            )));
            counselingState.refresh();
            const successMsg = isReschedule ? 'Session rescheduled successfully.' : 'Request approved and session scheduled.';
            showToastMessage(successMsg, 'success');
            queueProcessEmailNotification(result?.emailPayload, successMsg);
            setShowScheduleModal(false);
            setShowCounselingViewModal(false);
            setScheduleData({ date: '', time: '', notes: '' });
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingCounselingSchedule(false);
        }
    };

    const handleCompleteRequest = async (e?: any) => {
        if (e?.preventDefault) e.preventDefault();
        const nextRequestId = String(selectedCounselingReq?.id || '').trim();
        if (!nextRequestId || isSubmittingCounselingComplete) return;
        if (!completeNotes.trim()) {
            showToastMessage('Resolution notes are required to complete counseling.', 'error');
            return;
        }
        setIsSubmittingCounselingComplete(true);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'complete-counseling',
                requestId: nextRequestId,
                notes: completeNotes.trim()
            });
            updateGlobalRows((rows: any[]) => rows.map((row: any) => (
                String(row.id) === nextRequestId
                    ? { ...row, status: COUNSELING_STATUS.COMPLETED, resolution_notes: completeNotes.trim() }
                    : row
            )));
            counselingState.refresh();
            showToastMessage('Request marked as completed.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request marked as completed.');
            setShowCompleteModal(false);
            setShowCounselingViewModal(false);
            setCompleteNotes('');
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingCounselingComplete(false);
        }
    };

    const handleStartForward = (req: any) => {
        setForwardingToStaff(true);
        setSelectedCounselingReq(req);
        setShowCounselingViewModal(false);
        setReferralForm({
            student: req.student_name,
            type: req.request_type || 'Self-Referral',
            notes: req.reason_for_referral || req.description || '',
            referrer_contact_number: '',
            relationship_with_student: 'Dean',
            reason_for_referral: req.reason_for_referral || req.description || '',
            actions_made: `Scheduled a meeting with the student. Issue was not fully resolved at department level.`,
            date_duration_of_observations: req.date_duration_of_concern || ''
        });
        setShowReferralModal(true);
    };

    const handleReferralSubmit = async (e: any) => {
        e.preventDefault();
        if (isSubmittingReferral) return;
        setIsSubmittingReferral(true);
        try {
            if (forwardingToStaff && selectedCounselingReq) {
                const signatureData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                if (!signatureData) {
                    throw new Error('Please add your signature.');
                }
                const result = await invokeManagedDepartmentServicesFunction({
                    mode: 'forward-counseling-to-care',
                    requestId: selectedCounselingReq.id,
                    referrerContactNumber: referralForm.referrer_contact_number,
                    relationshipWithStudent: referralForm.relationship_with_student,
                    reasonForReferral: referralForm.reason_for_referral,
                    actionsMade: referralForm.actions_made,
                    dateDurationOfObservations: referralForm.date_duration_of_observations,
                    referrerSignature: signatureData
                });
                updateGlobalRows((rows: any[]) => rows.map((row: any) => (
                    String(row.id) === String(selectedCounselingReq.id)
                        ? {
                            ...row,
                            status: COUNSELING_STATUS.REFERRED,
                            referred_by: data?.profile?.name,
                            referrer_contact_number: referralForm.referrer_contact_number || null,
                            relationship_with_student: referralForm.relationship_with_student || null,
                            reason_for_referral: referralForm.reason_for_referral || row.reason_for_referral || row.description || null,
                            actions_made: referralForm.actions_made || null,
                            date_duration_of_observations: referralForm.date_duration_of_observations || null,
                            referrer_signature: signatureData || null
                        }
                        : row
                )));
                counselingState.refresh();
                showToastMessage('Request forwarded to CARE Staff.', 'success');
                queueProcessEmailNotification(result?.emailPayload, 'Request forwarded to CARE Staff.');
            } else {
                const studentObj = selectedReferralStudent?.name === referralForm.student
                    ? selectedReferralStudent
                    : (filteredData.students || []).find((s: any) => s.name === referralForm.student);
                if (!studentObj?.id || !String(referralForm.student || '').trim()) {
                    throw new Error('Select a valid student from the search results.');
                }
                if (!String(referralForm.actions_made || '').trim()) {
                    throw new Error('Actions made are required.');
                }
                const sigData = sigCanvasRef.current && !sigCanvasRef.current.isEmpty() ? sigCanvasRef.current.getCanvas().toDataURL('image/png') : null;
                if (!sigData) {
                    throw new Error('Please add your signature.');
                }
                const result = await invokeManagedDepartmentServicesFunction({
                    mode: 'create-counseling-referral',
                    studentId: studentObj?.id || '',
                    studentName: referralForm.student,
                    courseYear: studentObj ? `${studentObj.course || ''} - ${studentObj.year || ''}` : '',
                    contactNumber: studentObj?.mobile || '',
                    reasonForReferral: referralForm.reason_for_referral,
                    referrerContactNumber: referralForm.referrer_contact_number,
                    relationshipWithStudent: referralForm.relationship_with_student,
                    actionsMade: referralForm.actions_made,
                    dateDurationOfObservations: referralForm.date_duration_of_observations,
                    referrerSignature: sigData
                });
                await counselingState.refresh();
                showToastMessage('Referral submitted.');
                queueProcessEmailNotification(result?.emailPayload, 'Referral submitted.');
            }
            setShowReferralModal(false);
            setForwardingToStaff(false);
            setSelectedCounselingReq(null);
            setSelectedReferralStudent(null);
            setReferralSearchQuery('');
            setReferralForm({ student: '', type: '', notes: '', referrer_contact_number: '', relationship_with_student: '', reason_for_referral: '', actions_made: '', date_duration_of_observations: '' });
            if (sigCanvasRef.current) sigCanvasRef.current.clear();
        } catch (err: any) {
            showToastMessage(err?.message || 'Something went wrong.', 'error');
        } finally {
            setIsSubmittingReferral(false);
        }
    };

    return {
        counselingTab, setCounselingTab,
        selectedCounselingReq, setSelectedCounselingReq,
        showCounselingViewModal, setShowCounselingViewModal,
        deptFormModalView, setDeptFormModalView,
        showScheduleModal, setShowScheduleModal,
        scheduleData, setScheduleData,
        forwardingToStaff, setForwardingToStaff,
        isSubmittingCounselingSchedule,
        pendingCounselingCompletionId,
        isSubmittingReferral,
        referralSearchQuery, setReferralSearchQuery,
        referralStudentOptions,
        isReferralStudentSearchLoading,
        selectedReferralStudent,
        selectReferralStudent,
        showReferralModal, setShowReferralModal,
        referralForm, setReferralForm,
        showCompleteModal, setShowCompleteModal,
        completeNotes, setCompleteNotes,
        isSubmittingCounselingComplete,
        openCompleteModal,
        openRescheduleModal,
        handleApproveAndSchedule,
        handleCompleteRequest,
        handleStartForward,
        handleReferralSubmit,
        sigCanvasRef
    };
}
