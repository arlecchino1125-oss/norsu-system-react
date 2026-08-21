import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getPublicOfficeVisitReasons,
    getPublicActiveOfficeVisit,
    submitPublicOfficeTimeIn,
    submitPublicOfficeTimeOut,
    type PublicOfficeVisitReason,
    type PublicActiveOfficeVisit
} from '../publicEventsService';
import type { PublicIdentity } from './usePublicEvents';

const LOCAL_VISIT_KEY = 'norsu_public_active_office_visit';

interface StoredOfficeVisit {
    visitId: number;
    studentId?: string | null;
    studentName: string;
    reason: string;
    timeIn: string;
    isVisitor: boolean;
}

const readStoredVisit = (): StoredOfficeVisit | null => {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(LOCAL_VISIT_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as StoredOfficeVisit;
        // Expire stored visit after 18 hours
        if (Date.now() - new Date(parsed.timeIn).getTime() > 18 * 60 * 60 * 1000) {
            localStorage.removeItem(LOCAL_VISIT_KEY);
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
};

export function usePublicOfficeVisit(
    identity: PublicIdentity | null,
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void
) {
    const queryClient = useQueryClient();
    const [identityMode, setIdentityMode] = useState<'student' | 'visitor'>(identity ? 'student' : 'student');
    const [visitorFirstName, setVisitorFirstName] = useState('');
    const [visitorLastName, setVisitorLastName] = useState('');
    const [customStudentId, setCustomStudentId] = useState('');
    const [selectedReason, setSelectedReason] = useState('');
    const [activeVisit, setActiveVisit] = useState<StoredOfficeVisit | null>(() => readStoredVisit());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastCompletedVisit, setLastCompletedVisit] = useState<any>(null);

    // Sync student ID if signed in via header sheet
    useEffect(() => {
        if (identity?.student?.student_id) {
            setCustomStudentId(identity.student.student_id);
            setIdentityMode('student');
        }
    }, [identity]);

    // Fetch active visit reasons
    const { data: reasons = [], isLoading: isLoadingReasons } = useQuery<PublicOfficeVisitReason[]>({
        queryKey: ['public-office-visit-reasons'],
        queryFn: getPublicOfficeVisitReasons,
        staleTime: 5 * 60 * 1000
    });

    // Check backend for active ongoing visit on student change
    const checkActiveVisit = useCallback(async () => {
        const studentId = identity?.student?.student_id || customStudentId.trim();
        const visitorName = identityMode === 'visitor' && visitorFirstName && visitorLastName 
            ? `${visitorFirstName.trim()} ${visitorLastName.trim()}` 
            : undefined;

        if (!studentId && !visitorName) return;

        try {
            const res = await getPublicActiveOfficeVisit({ studentId, visitorName });
            if (res.has_active && res.id) {
                const stored: StoredOfficeVisit = {
                    visitId: res.id,
                    studentId: res.student_id,
                    studentName: res.student_name || 'Visitor',
                    reason: res.reason || '',
                    timeIn: res.time_in || new Date().toISOString(),
                    isVisitor: !res.student_id
                };
                setActiveVisit(stored);
                localStorage.setItem(LOCAL_VISIT_KEY, JSON.stringify(stored));
            }
        } catch {
            // Non-blocking
        }
    }, [identity, customStudentId, identityMode, visitorFirstName, visitorLastName]);

    useEffect(() => {
        void checkActiveVisit();
    }, [checkActiveVisit]);

    // Submit Time In
    const handleTimeIn = useCallback(async () => {
        if (isSubmitting) return;

        if (!selectedReason) {
            showToast('Please select a reason for your visit.', 'error');
            return;
        }

        const isVisitor = identityMode === 'visitor';
        const studentId = !isVisitor ? (identity?.student?.student_id || customStudentId.trim()) : undefined;

        if (!isVisitor && !studentId) {
            showToast('Please enter your Student ID.', 'error');
            return;
        }

        if (isVisitor && (!visitorFirstName.trim() || !visitorLastName.trim())) {
            showToast('Please enter both your First Name and Last Name.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await submitPublicOfficeTimeIn({
                studentId,
                firstName: isVisitor ? visitorFirstName : undefined,
                lastName: isVisitor ? visitorLastName : undefined,
                isVisitor,
                reason: selectedReason
            });

            const newActive: StoredOfficeVisit = {
                visitId: result.visit_id,
                studentId: result.student_id,
                studentName: result.student_name,
                reason: result.reason,
                timeIn: result.time_in || new Date().toISOString(),
                isVisitor: Boolean(result.is_visitor)
            };

            setActiveVisit(newActive);
            localStorage.setItem(LOCAL_VISIT_KEY, JSON.stringify(newActive));
            showToast(result.already_active ? 'You have an active office visit in progress.' : 'Timed in successfully! Welcome to the CARE Center.', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to record Time In.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, selectedReason, identityMode, identity, customStudentId, visitorFirstName, visitorLastName, showToast]);

    // Submit Time Out
    const handleTimeOut = useCallback(async () => {
        if (isSubmitting || !activeVisit) return;

        setIsSubmitting(true);
        try {
            const result = await submitPublicOfficeTimeOut({
                visitId: activeVisit.visitId,
                studentId: activeVisit.studentId || undefined,
                visitorName: activeVisit.isVisitor ? activeVisit.studentName : undefined
            });

            setLastCompletedVisit(result);
            setActiveVisit(null);
            localStorage.removeItem(LOCAL_VISIT_KEY);
            setShowSuccessModal(true);
            showToast('Timed out successfully. Thank you for visiting!', 'success');
        } catch (err: any) {
            showToast(err.message || 'Failed to record Time Out.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, activeVisit, showToast]);

    return {
        identityMode,
        setIdentityMode,
        visitorFirstName,
        setVisitorFirstName,
        visitorLastName,
        setVisitorLastName,
        customStudentId,
        setCustomStudentId,
        selectedReason,
        setSelectedReason,
        reasons,
        isLoadingReasons,
        activeVisit,
        isSubmitting,
        showSuccessModal,
        setShowSuccessModal,
        lastCompletedVisit,
        handleTimeIn,
        handleTimeOut
    };
}
