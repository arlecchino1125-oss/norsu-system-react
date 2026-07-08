import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface UseStudentOfficeVisitActionsArgs {
    activeVisit: any;
    setActiveVisit: (value: any) => void;
    personalInfo: any;
    showToast: (message: string, type?: string) => void;
    invokeManagedStudentFunction: (body: any) => Promise<unknown>;
    supabaseClient: any;
}

export function useStudentOfficeVisitActions({
    activeVisit,
    setActiveVisit,
    personalInfo,
    showToast,
    invokeManagedStudentFunction,
    supabaseClient
}: UseStudentOfficeVisitActionsArgs) {
    const queryClient = useQueryClient();
    const [showTimeInModal, setShowTimeInModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [showTimeOutFeedback, setShowTimeOutFeedback] = useState(false);
    const [timeOutVisitReason, setTimeOutVisitReason] = useState('');
    const [isSubmittingOfficeTimeIn, setIsSubmittingOfficeTimeIn] = useState(false);
    const [isCompletingOfficeVisit, setIsCompletingOfficeVisit] = useState(false);

    const handleOfficeTimeIn = useCallback(async () => {
        setShowTimeInModal(true);
    }, []);

    const submitTimeIn = useCallback(async () => {
        if (isSubmittingOfficeTimeIn) return;
        if (!selectedReason) {
            showToast("Please select a reason.", 'error');
            return;
        }

        setIsSubmittingOfficeTimeIn(true);
        try {
            const { data, error } = await supabaseClient
                .from('office_visits')
                .insert([{
                    student_id: personalInfo.studentId,
                    student_name: `${personalInfo.firstName} ${personalInfo.lastName}`,
                    reason: selectedReason,
                    status: 'Ongoing'
                }])
                .select()
                .single();
            if (error) throw error;
            setActiveVisit(data);
            void queryClient.invalidateQueries({ queryKey: ['student_active_visit'] });
            showToast("You have Timed In at the office.");
            setShowTimeInModal(false);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setIsSubmittingOfficeTimeIn(false);
        }
    }, [
        isSubmittingOfficeTimeIn,
        personalInfo.firstName,
        personalInfo.lastName,
        personalInfo.studentId,
        queryClient,
        selectedReason,
        setActiveVisit,
        showToast,
        supabaseClient
    ]);

    const handleOfficeTimeOut = useCallback(async () => {
        if (isCompletingOfficeVisit) return;
        if (!activeVisit) return;

        const visitReason = activeVisit.reason || '';
        setIsCompletingOfficeVisit(true);
        try {
            await invokeManagedStudentFunction({
                mode: 'complete-office-visit',
                officeVisitId: activeVisit.id
            });
            setActiveVisit(null);
            void queryClient.invalidateQueries({ queryKey: ['student_active_visit'] });
            showToast("You have Timed Out. Thank you for visiting!");
            setTimeOutVisitReason(visitReason);
            setShowTimeOutFeedback(true);
        } catch (err: any) {
            showToast(err.message || 'Failed to complete your office visit.', 'error');
        } finally {
            setIsCompletingOfficeVisit(false);
        }
    }, [
        activeVisit,
        invokeManagedStudentFunction,
        isCompletingOfficeVisit,
        queryClient,
        setActiveVisit,
        showToast
    ]);

    return {
        showTimeInModal,
        setShowTimeInModal,
        selectedReason,
        setSelectedReason,
        showTimeOutFeedback,
        setShowTimeOutFeedback,
        timeOutVisitReason,
        isSubmittingOfficeTimeIn,
        isCompletingOfficeVisit,
        handleOfficeTimeIn,
        submitTimeIn,
        handleOfficeTimeOut
    };
}
