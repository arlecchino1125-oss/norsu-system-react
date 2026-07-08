import { useState, useCallback, useRef } from 'react';
import { invokeEdgeFunction } from '../../../../../lib/invokeEdgeFunction';
import { sendTransactionalEmailNotification } from '../../../../../lib/transactionalEmail';
import { SUPPORT_STATUS } from '../../../../../utils/workflow';

export function useDeptSupport({
    data,
    supportState,
    showToastMessage,
    updateGlobalRows
}: any) {
    const [showApproveScheduleModal, setShowApproveScheduleModal] = useState<boolean>(false);
    const [approveScheduleData, setApproveScheduleData] = useState<any>({ id: null, student_id: null, date: '', time: '', notes: '' });
    const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
    const [resolveData, setResolveData] = useState<any>({ id: null, student_id: null, notes: '' });
    const [showReferCareModal, setShowReferCareModal] = useState<boolean>(false);
    const [referCareForm, setReferCareForm] = useState<any>({ id: null, student_id: null, student_name: '', date_acted: '', actions_taken: '', comments: '' });
    const [pendingSupportRejectId, setPendingSupportRejectId] = useState<string | null>(null);

    const [isSubmittingSupportSchedule, setIsSubmittingSupportSchedule] = useState(false);
    const [isSubmittingSupportResolve, setIsSubmittingSupportResolve] = useState(false);
    const [isSubmittingSupportRefer, setIsSubmittingSupportRefer] = useState(false);

    const sigCanvasRefSupport = useRef<any>(null);

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

    const handleSupportApproveAndSchedule = async () => {
        const { id, date, time, notes } = approveScheduleData;
        if (isSubmittingSupportSchedule) return;
        if (!date || !time) { showToastMessage('Please select date and time.', 'error'); return; }
        setIsSubmittingSupportSchedule(true);
        try {
            const scheduledDate = `${date} ${time}`;
            const deptNotes = JSON.stringify({
                scheduled_date: scheduledDate,
                approval_notes: notes
            });
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'approve-support-and-schedule',
                requestId: id,
                date,
                time,
                notes
            });
            supportState.refresh();
            showToastMessage('Visit scheduled successfully.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Visit scheduled successfully.');
            setShowApproveScheduleModal(false);
            setApproveScheduleData({ id: null, student_id: null, date: '', time: '', notes: '' });
            updateGlobalRows((rows: any[]) => rows.map((row: any) => (
                String(row.id) === String(id)
                    ? {
                        ...row,
                        status: SUPPORT_STATUS.VISIT_SCHEDULED,
                        dept_notes: deptNotes
                    }
                    : row
            )));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportSchedule(false);
        }
    };

    const handleRejectSupport = async (id: string, notes: string) => {
        const nextRequestId = String(id || '').trim();
        if (!nextRequestId || pendingSupportRejectId === nextRequestId) return;
        setPendingSupportRejectId(nextRequestId);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'reject-support',
                requestId: nextRequestId,
                notes
            });
            supportState.refresh();
            showToastMessage('Request rejected.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request rejected.');
            updateGlobalRows((rows: any[]) => rows.map((r: any) => (
                String(r.id) === nextRequestId
                    ? { ...r, status: SUPPORT_STATUS.REJECTED, dept_notes: notes }
                    : r
            )));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setPendingSupportRejectId(null);
        }
    };

    const handleResolveSupport = async () => {
        const { id, notes } = resolveData;
        if (isSubmittingSupportResolve) return;
        if (!notes.trim()) { showToastMessage('Please add resolution notes.', 'error'); return; }
        setIsSubmittingSupportResolve(true);
        try {
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'resolve-support',
                requestId: id,
                notes
            });
            supportState.refresh();
            showToastMessage('Request marked as resolved and sent to CARE.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request marked as resolved and sent to CARE.');
            setShowResolveModal(false);
            setResolveData({ id: null, student_id: null, notes: '' });
            updateGlobalRows((rows: any[]) => rows.map((r: any) => String(r.id) === String(id) ? { ...r, status: SUPPORT_STATUS.RESOLVED_BY_DEPT, dept_notes: notes } : r));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportResolve(false);
        }
    };

    const handleReferToCare = async () => {
        const { id, date_acted, actions_taken, comments } = referCareForm;
        if (isSubmittingSupportRefer) return;
        if (!String(date_acted || '').trim()) { showToastMessage('Please select the date acted.', 'error'); return; }
        if (!actions_taken.trim()) { showToastMessage('Please describe actions taken.', 'error'); return; }
        const sigData = sigCanvasRefSupport.current && !sigCanvasRefSupport.current.isEmpty() ? sigCanvasRefSupport.current.toDataURL() : null;
        if (!sigData) { showToastMessage('Please add your signature.', 'error'); return; }
        setIsSubmittingSupportRefer(true);
        try {
            const referralData = JSON.stringify({
                referred_by: data?.profile?.name,
                date_acted,
                actions_taken,
                comments,
                signature: sigData
            });
            const result = await invokeManagedDepartmentServicesFunction({
                mode: 'refer-support-to-care',
                requestId: id,
                dateActed: date_acted,
                actionsTaken: actions_taken,
                comments,
                signature: sigData
            });
            supportState.refresh();
            showToastMessage('Request referred to CARE Staff.', 'success');
            queueProcessEmailNotification(result?.emailPayload, 'Request referred to CARE Staff.');
            setShowReferCareModal(false);
            setReferCareForm({ id: null, student_id: null, student_name: '', date_acted: '', actions_taken: '', comments: '' });
            updateGlobalRows((rows: any[]) => rows.map((r: any) => String(r.id) === String(id) ? { ...r, status: SUPPORT_STATUS.REFERRED_TO_CARE, dept_notes: referralData } : r));
        } catch (err: any) {
            showToastMessage(err.message, 'error');
        } finally {
            setIsSubmittingSupportRefer(false);
        }
    };

    return {
        showApproveScheduleModal, setShowApproveScheduleModal,
        approveScheduleData, setApproveScheduleData,
        showResolveModal, setShowResolveModal,
        resolveData, setResolveData,
        showReferCareModal, setShowReferCareModal,
        referCareForm, setReferCareForm,
        pendingSupportRejectId,
        isSubmittingSupportSchedule,
        isSubmittingSupportResolve,
        isSubmittingSupportRefer,
        sigCanvasRefSupport,
        handleSupportApproveAndSchedule,
        handleRejectSupport,
        handleResolveSupport,
        handleReferToCare
    };
}
