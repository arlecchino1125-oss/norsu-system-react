import { useCallback, useRef, useState } from 'react';
import {
    getPendingProfileCompletionProfile,
    shouldForceProfileCompletionPrompt
} from '../../../lib/studentProfileCompletionPrompt';
import { mergePendingProfileIntoProfileForm } from '../features/profile/profileFormUtils';

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
    const [forceProfileCompletionPrompt, setForceProfileCompletionPrompt] = useState(() => (
        session?.userType === 'student' && shouldForceProfileCompletionPrompt(session?.student_id)
    ));
    const [hideProfileCompletionReminder, setHideProfileCompletionReminder] = useState(false);
    const [profileServiceGate, setProfileServiceGate] = useState<ProfileServiceGate>(createClosedProfileServiceGate);
    const [profileCompletionInitialData, setProfileCompletionInitialData] = useState<any>(() => {
        const initialData = createInitialProfileFormData();
        if (session?.userType !== 'student') return initialData;
        const pendingProfile = getPendingProfileCompletionProfile(session.student_id)
            || getPendingProfileCompletionProfile();
        return mergePendingProfileIntoProfileForm(initialData, pendingProfile);
    });
    const [profileCompletionStatusOverride, setProfileCompletionStatusOverride] = useState<boolean | null>(null);
    const [profileFieldsComplete, setProfileFieldsComplete] = useState<boolean | null>(null);
    const profileCompletionJustCompletedRef = useRef(false);
    const refreshStudentProfileRequestRef = useRef(0);
    const [portalMountTime] = useState(() => Date.now());

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
    const effectiveProfileServiceGate = profileCompletionReminderRequired
        ? profileServiceGate
        : createClosedProfileServiceGate();

    const openProfileCompletionModal = useCallback(() => {
        // Prevent mobile ghost-clicks from the login screen triggering the modal.
        if (Date.now() - portalMountTime < 800) return;

        setShowProfileCompletion(true);
        setHideProfileCompletionReminder(false);
    }, [portalMountTime]);

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

    return {
        showProfileCompletion,
        setShowProfileCompletion,
        forceProfileCompletionPrompt,
        setForceProfileCompletionPrompt,
        profileServiceGate: effectiveProfileServiceGate,
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
