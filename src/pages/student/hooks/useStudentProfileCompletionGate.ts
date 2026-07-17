import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getPendingProfileCompletionProfile,
    shouldForceProfileCompletionPrompt
} from '../../../lib/studentProfileCompletionPrompt';
import { applyPendingProfileToProfileForm } from '../features/profile/profileFormUtils';

type ProfileServiceGate = {
    visible: boolean;
    serviceLabel: string;
    message: string;
};

type UseStudentProfileCompletionGateArgs = {
    session: any;
    createInitialProfileFormData: () => any;
};

const createClosedProfileServiceGate = (): ProfileServiceGate => ({
    visible: false,
    serviceLabel: '',
    message: ''
});

export const useStudentProfileCompletionGate = ({
    session,
    createInitialProfileFormData
}: UseStudentProfileCompletionGateArgs) => {
    const [showProfileCompletion, setShowProfileCompletion] = useState(false);
    const [forceProfileCompletionPrompt, setForceProfileCompletionPrompt] = useState(false);
    const [hideProfileCompletionReminder, setHideProfileCompletionReminder] = useState(false);
    const [profileServiceGate, setProfileServiceGate] = useState<ProfileServiceGate>(createClosedProfileServiceGate);
    const [profileCompletionInitialData, setProfileCompletionInitialData] = useState<any>(createInitialProfileFormData);
    const [profileCompletionStatusOverride, setProfileCompletionStatusOverride] = useState<boolean | null>(null);
    const [profileFieldsComplete, setProfileFieldsComplete] = useState<boolean | null>(null);
    const profileCompletionJustCompletedRef = useRef(false);
    const refreshStudentProfileRequestRef = useRef(0);
    const portalMountTimeRef = useRef(Date.now());

    const hasPendingForcedProfileCompletion = session?.userType === 'student'
        && shouldForceProfileCompletionPrompt(session?.student_id);
    const effectiveProfileCompleted = profileCompletionStatusOverride !== null
        ? profileCompletionStatusOverride
        : (session?.profile_completed === true || profileFieldsComplete === true
            ? true
            : (profileFieldsComplete === false ? false : null));
    const profileCompletionReminderRequired = Boolean(
        session?.userType === 'student' && (
            forceProfileCompletionPrompt
            || effectiveProfileCompleted === false
            || hasPendingForcedProfileCompletion
        )
    );
    const profileCompletionGateActive = Boolean(
        session?.userType === 'student' && showProfileCompletion
    );
    const profileCompletionReminderVisible = profileCompletionReminderRequired
        && !profileCompletionGateActive
        && !hideProfileCompletionReminder;

    const openProfileCompletionModal = useCallback(() => {
        // Prevent mobile ghost-clicks from the login screen triggering the modal.
        if (Date.now() - portalMountTimeRef.current < 800) return;

        setShowProfileCompletion(true);
        setHideProfileCompletionReminder(false);
    }, []);

    const closeProfileCompletionModal = useCallback(() => {
        setShowProfileCompletion(false);
    }, []);

    const closeProfileServiceGate = useCallback(() => {
        setProfileServiceGate(createClosedProfileServiceGate());
    }, []);

    const openProfileCompletionFromServiceGate = useCallback(() => {
        closeProfileServiceGate();
        openProfileCompletionModal();
    }, [closeProfileServiceGate, openProfileCompletionModal]);

    const requireCompletedProfileForService = useCallback((serviceLabel: string, message: string) => {
        if (!profileCompletionReminderRequired) return false;
        setProfileServiceGate({
            visible: true,
            serviceLabel,
            message
        });
        return true;
    }, [profileCompletionReminderRequired]);

    const dismissProfileCompletionReminder = useCallback(() => {
        setHideProfileCompletionReminder(true);
    }, []);

    useEffect(() => {
        profileCompletionJustCompletedRef.current = false;
        setProfileCompletionStatusOverride(null);
        setProfileFieldsComplete(null);
        setProfileCompletionInitialData(createInitialProfileFormData());
    }, [createInitialProfileFormData, session?.student_id, session?.auth_user_id]);

    useEffect(() => {
        setHideProfileCompletionReminder(false);
    }, [session?.student_id, session?.auth_user_id]);

    useEffect(() => {
        if (session?.userType !== 'student') {
            profileCompletionJustCompletedRef.current = false;
            setForceProfileCompletionPrompt(false);
            setHideProfileCompletionReminder(false);
            setShowProfileCompletion(false);
            setProfileCompletionStatusOverride(null);
            setProfileFieldsComplete(null);
            return;
        }

        applyPendingProfileToProfileForm(
            setProfileCompletionInitialData,
            getPendingProfileCompletionProfile(session.student_id) || getPendingProfileCompletionProfile()
        );

        if (shouldForceProfileCompletionPrompt(session.student_id)) {
            setForceProfileCompletionPrompt(true);
        }
    }, [session?.student_id, session?.userType]);

    useEffect(() => {
        if (!profileCompletionReminderRequired) {
            setHideProfileCompletionReminder(false);
            return;
        }

        if (hasPendingForcedProfileCompletion) {
            setForceProfileCompletionPrompt(true);
        }
    }, [profileCompletionReminderRequired, hasPendingForcedProfileCompletion]);

    useEffect(() => {
        if (!profileCompletionReminderRequired) {
            closeProfileServiceGate();
        }
    }, [closeProfileServiceGate, profileCompletionReminderRequired]);

    return {
        showProfileCompletion,
        setShowProfileCompletion,
        forceProfileCompletionPrompt,
        setForceProfileCompletionPrompt,
        profileServiceGate,
        profileCompletionInitialData,
        setProfileCompletionInitialData,
        setProfileCompletionStatusOverride,
        setProfileFieldsComplete,
        profileCompletionJustCompletedRef,
        refreshStudentProfileRequestRef,
        profileCompletionReminderRequired,
        profileCompletionGateActive,
        profileCompletionReminderVisible,
        openProfileCompletionModal,
        closeProfileCompletionModal,
        closeProfileServiceGate,
        openProfileCompletionFromServiceGate,
        requireCompletedProfileForService,
        dismissProfileCompletionReminder
    };
};
