import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { STUDENT_VIEW_FEATURE_MAP, STUDENT_VIEW_LABELS } from '../StudentPortalRoutes';
import { useStudentCompactPortalLayout } from '../hooks/useStudentCompactPortalLayout';
import { useStudentEventActions } from '../features/events/hooks/useStudentEventActions';
import { useStudentOfficeVisitActions } from '../features/logbook/hooks/useStudentOfficeVisitActions';
import { useStudentPortalNavigation } from '../hooks/useStudentPortalNavigation';
import { useStudentPortalRefresh } from '../hooks/useStudentPortalRefresh';
import { useStudentScholarships } from '../features/scholarship/hooks/useStudentScholarships';
import { useStudentToast } from '../hooks/useStudentToast';
import type { StudentRemainingViewProps } from '../types';
import { usePermissions } from '../../../hooks/usePermissions';
import FeatureAvailabilityView from '../../../components/permissions/FeatureAvailabilityView';
import { useStudentProfileData } from '../features/profile/hooks/useStudentProfileData';
import { useStudentProfileForm } from '../features/profile/hooks/useStudentProfileForm';


export const supabaseClient = supabase;
export const ProfileCompletionModal = lazy(() => import('../features/profile/components/ProfileCompletionModal'));
export const StudentDashboardView = lazy(() => import('../features/dashboard/components/StudentDashboardView'));
export const StudentEventsView = lazy(() => import('../features/events/components/StudentEventsView'));
import { Icons } from '../components/StudentPortalIcons';
import { StudentHero } from '../components/StudentHero';
import type { Event, Request, Scholarship, Student } from '../types';
import {
    YEAR_LEVEL_OPTIONS,
    isValidYearLevel,
    normalizeStudentEmail,
    pickProfilePrefillValue,
    resolveProfileFormValue,
    applyPendingProfileToProfileForm,
    toYesNoChoice,
    hasFilledProfileValue,
    isProfileCompletionFormComplete,
    createInitialProfileFormData,
    buildProfileCompletionFormSnapshot
} from '../features/profile/profileFormUtils';

export { ARCHIVE_RPC_MISSING_CACHE_KEY, ARCHIVE_RPC_CHECKED_CACHE_KEY } from '../features/profile/hooks/useStudentProfileForm';

export function useStudentPortal() {
    const { session, loading, updateSession, logout } = useAuth() as any;
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState,
        isFeatureVisible
    } = usePermissions();
    const navigate = useNavigate();
    const { view: urlView, section: urlSection } = useParams<{ view?: string; section?: string }>();
    const location = useLocation();

    const [activeView, setActiveView] = useState(
        () => (urlView && Object.prototype.hasOwnProperty.call(STUDENT_VIEW_LABELS, urlView) ? urlView : 'dashboard'),
    );
    const [profileTab, setProfileTab] = useState(
        () => (urlView === 'profile' && urlSection ? urlSection : 'personal'),
    );
    const urlSyncRef = useRef({ view: activeView, section: profileTab, path: '' });
    const isCompactPortalLayout = useStudentCompactPortalLayout();
    // Timer removed from main component
    const [feedbackType, setFeedbackType] = useState('service');
    const [rating, setRating] = useState(0);
    const [counselingRequests, setCounselingRequests] = useState<any[]>([]);
    const [supportRequests, setSupportRequests] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [selectedSupportRequest, setSelectedSupportRequest] = useState<any>(null);
    const [sessionFeedback, setSessionFeedback] = useState<any>({ rating: 0, comment: '' });
    const [feedbackPrefill, setFeedbackPrefill] = useState<any>(null);
    const [activeVisit, setActiveVisit] = useState<any>(null);
    const { toast, showToast, closeToast } = useStudentToast();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showCommandHub, setShowCommandHub] = useState(false);
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const {
        getStudentViewAccessState,
        isStudentViewEnabled,
        isStudentViewVisible,
        requireStudentFeatureAccess,
        transitionToView
    } = useStudentPortalNavigation({
        setActiveView,
        getFeatureAccessState,
        isFeatureVisible,
        showToast
    });

    // --- URL <-> view reconciler ---
    // activeView stays the source of truth; this single effect keeps the address
    // bar in sync (deep links, refresh, Back between views) without touching the
    // many existing navigation call sites. Using one reconciler that checks which
    // side changed since the last sync avoids the ping-pong you get from two
    // independent mirror effects. Profile sub-tab changes replace the history
    // entry (no Back spam); view changes push a new one.
    useEffect(() => {
        const last = urlSyncRef.current;
        const desiredPath = activeView === 'profile'
            ? `/student/profile/${profileTab}`
            : `/student/${activeView}`;
        const stateChanged = activeView !== last.view || profileTab !== last.section;
        const urlChanged = location.pathname !== last.path;

        if (stateChanged) {
            if (location.pathname !== desiredPath) {
                const viewChanged = activeView !== last.view;
                navigate(desiredPath, { replace: !viewChanged });
            }
        } else if (urlChanged) {
            if (urlView && urlView !== activeView && Object.prototype.hasOwnProperty.call(STUDENT_VIEW_LABELS, urlView)) {
                transitionToView(urlView, { suppressToast: true });
            }
            if (urlView === 'profile' && urlSection && urlSection !== profileTab) {
                setProfileTab(urlSection);
            }
        }

        urlSyncRef.current = { view: activeView, section: profileTab, path: location.pathname };
    }, [activeView, profileTab, location.pathname, urlView, urlSection, navigate, transitionToView]);

    // Assessment State
    const [activeForm, setActiveForm] = useState<any>(null);
    const [formsList, setFormsList] = useState<any[]>([]);
    const [loadingForm, setLoadingForm] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedForms, setCompletedForms] = useState<Set<any>>(new Set());

    // Events State (Merged)
    const [eventFilter, setEventFilter] = useState('All');

    // Modals & Dynamic States
    const [showCounselingForm, setShowCounselingForm] = useState(false);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [showCounselingRequestsModal, setShowCounselingRequestsModal] = useState(false);
    const [showSupportRequestsModal, setShowSupportRequestsModal] = useState(false);

    // Office Logbook Modal State
    const [visitReasons, setVisitReasons] = useState<any[]>([]);

    const handleLogout = React.useCallback(() => {
        logout();
        navigate('/student/login', { replace: true });
    }, [logout, navigate]);


    // Onboarding Tour State
    const [showTour, setShowTour] = useState(false);
    const [tourStep, setTourStep] = useState(0);
    const [hasSeenTourState, setHasSeenTourState] = useState(true); // Default true

    const {
        isEditing,
        setIsEditing,
        personalInfo,
        setPersonalInfo,
        showMoreProfile,
        setShowMoreProfile,
        courseYearGate,
        setCourseYearGate,
        isSubmittingCourseYearGate,
        setIsSubmittingCourseYearGate,
        courseYearGateVisibleRef,
        courseYearGateConfirmedRef,
        archiveRpcStateRef,
        archiveRpcCheckedKeysRef,
        courseOptionsCacheRef,
        isSavingProfileChanges,
        setIsSavingProfileChanges,
        getStoredParentParts,
        PROFILE_FIELD_LABELS,
        normalizeProfileField,
        toProfileFieldLabel,
        getChangedProfileFields,
        logStudentProfileUpdate,
        syncStudentSession,
        handleProfileCompletionSuccess,
        invokeManagedStudentFunction,
        syncStudentAuthEmailIfNeeded,
        getCourseYearWindowRange,
        formatGateDate,
        getSchoolYearLabel,
        submitCourseYearConfirmation,
        refreshStudentProfile,
        validateProfileBeforeSave,
        saveProfileChanges,
        requestStudentSecurityOtp,
        confirmStudentSecurityEmailChange,
        confirmStudentPasswordChange,
        uploadProfilePicture,
        profileServiceGate,
        profileCompletionInitialData,
        profileCompletionReminderRequired,
        profileCompletionGateActive,
        profileCompletionReminderVisible,
        openProfileCompletionModal,
        closeProfileCompletionModal,
        closeProfileServiceGate,
        openProfileCompletionFromServiceGate,
        requireCompletedProfileForService,
        dismissProfileCompletionReminder
    } = useStudentProfileForm({
        session,
        updateSession,
        showToast,
        setHasSeenTourState
    });

    const handleAssessmentSubmitted = useCallback(async (formId: any, wasNewSubmission: boolean) => {
        setCompletedForms((prev) => new Set([...prev, formId]));
        setShowAssessmentModal(false);
        setActiveForm((current: any) => (current?.id === formId ? null : current));

        if (wasNewSubmission) {
            setShowSuccessModal(true);
        }
    }, []);

    const [eventsList, setEventsList] = useState<any[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);

    const [isRefreshingView, setIsRefreshingView] = useState(false);
    const queryClient = useQueryClient();
    const runDatasetRefresh = useStudentPortalRefresh(personalInfo.studentId);
    const {
        showScholarshipModal,
        setShowScholarshipModal,
        selectedScholarship,
        setSelectedScholarship,
        scholarshipsList,
        myApplications,
        isApplyingScholarshipId,
        refreshScholarshipsCached,
        refreshScholarshipApplicationsCached,
        handleApplyScholarship
    } = useStudentScholarships({
        personalInfo,
        runDatasetRefresh,
        showToast,
        supabaseClient
    });

    const { refreshActiveVisit, refreshVisitReasons, refreshNotifications } = useStudentProfileData({
        studentId: personalInfo.studentId,
        setActiveVisit,
        setVisitReasons,
        setNotifications
    });
    // These refresh handles invalidate the leaf-hook React Query caches by key
    // prefix, so writes reconcile even when the leaf hook mounts elsewhere.
    // Routed through runDatasetRefresh so per-view navigation stays TTL-gated;
    // { force: true } (used after the student's own writes) bypasses the TTL.
    const refreshCounselingRequestsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh(
            'counselingRequests',
            () => queryClient.invalidateQueries({ queryKey: ['student_counseling_data'] }),
            options
        ),
        [queryClient, runDatasetRefresh]
    );
    const refreshNotificationsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('notifications', refreshNotifications, options),
        [refreshNotifications, runDatasetRefresh]
    );
    const refreshEventsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh(
            'events',
            () => queryClient.invalidateQueries({ queryKey: ['student_events_data_raw'] }),
            options
        ),
        [queryClient, runDatasetRefresh]
    );
    const refreshActiveVisitCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('activeVisit', refreshActiveVisit, options),
        [refreshActiveVisit, runDatasetRefresh]
    );
    const refreshVisitReasonsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh('visitReasons', refreshVisitReasons, options),
        [refreshVisitReasons, runDatasetRefresh]
    );
    const refreshFormsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh(
            'forms',
            () => queryClient.invalidateQueries({ queryKey: ['student_forms_data'] }),
            options
        ),
        [queryClient, runDatasetRefresh]
    );
    const refreshSupportRequestsCached = useCallback(
        (options?: { force?: boolean }) => runDatasetRefresh(
            'supportRequests',
            () => queryClient.invalidateQueries({ queryKey: ['student_support_data'] }),
            options
        ),
        [queryClient, runDatasetRefresh]
    );
    const handleCounselingSubmitted = useCallback(async () => {
        await refreshCounselingRequestsCached({ force: true });
    }, [refreshCounselingRequestsCached]);
    const handleSupportSubmitted = useCallback(async () => {
        await refreshSupportRequestsCached({ force: true });
    }, [refreshSupportRequestsCached]);


    const {
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
    } = useStudentOfficeVisitActions({
        activeVisit,
        setActiveVisit,
        personalInfo,
        showToast,
        invokeManagedStudentFunction,
        supabaseClient
    });


    // Timer removed (handled by Clock component)

    // Helper to determine department from course
    // Removed hardcoded getDepartment in favor of dynamic fetch


    useEffect(() => {
        if (!profileCompletionGateActive) return;

        setShowTour(false);
        setTourStep(0);
        setShowCommandHub(false);
    }, [profileCompletionGateActive]);

    // Sequences the Tour to appear AFTER Profile Completion closes and when Side Panel is opened
    useEffect(() => {
        if (!loading && session && !profileCompletionGateActive && !hasSeenTourState) {
            if (isSidebarOpen) {
                setShowTour(true);
            } else {
                setShowTour(false);
            }
        }
    }, [loading, session, profileCompletionGateActive, hasSeenTourState, isSidebarOpen]);

    const formatFullDate = (date: any) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const {
        attendanceMap,
        registrationMap,
        ratedEvents,
        showRatingModal,
        setShowRatingModal,
        ratingForm,
        setRatingForm,
        setProofFile,
        isTimingIn,
        timingOutEventId,
        registeringEventId,
        cancellingRegistrationEventId,
        isSubmittingEventRating,
        fetchHistory,
        fetchHistoryCached,
        handleRegisterEvent,
        handleCancelRegistration,
        handleTimeIn,
        handleTimeOut,
        handleRateEvent,
        submitRating
    } = useStudentEventActions({
        personalInfo,
        runDatasetRefresh,
        refreshEventsCached,
        setEventsList,
        showToast,
        supabaseClient
    });

    const refreshCurrentView = useCallback(async (options?: { force?: boolean }) => {
        if (profileCompletionGateActive) {
            return;
        }

        const force = Boolean(options?.force);

        switch (activeView) {
            case 'dashboard':
                await Promise.all([
                    refreshCounselingRequestsCached({ force }),
                    refreshNotificationsCached({ force }),
                    refreshEventsCached({ force }),
                    refreshActiveVisitCached({ force }),
                    refreshVisitReasonsCached({ force }),
                    fetchHistoryCached({ force })
                ]);
                break;
            case 'profile':
                await Promise.all([
                    refreshActiveVisitCached({ force }),
                    refreshVisitReasonsCached({ force }),
                    // Profile is cached for an hour; only the explicit refresh
                    // button (force) re-fetches it, not plain navigation.
                    ...(force ? [refreshStudentProfile(true)] : [])
                ]);
                break;
            case 'assessment':
                await refreshFormsCached({ force });
                break;
            case 'counseling':
                await Promise.all([
                    refreshCounselingRequestsCached({ force }),
                    refreshNotificationsCached({ force })
                ]);
                break;
            case 'support':
                await refreshSupportRequestsCached({ force });
                break;
            case 'scholarship':
                await Promise.all([
                    refreshScholarshipsCached({ force }),
                    refreshScholarshipApplicationsCached({ force })
                ]);
                break;
            case 'events':
                await Promise.all([
                    refreshEventsCached({ force }),
                    fetchHistoryCached({ force })
                ]);
                break;
            default:
                break;
        }
    }, [
        activeView,
        fetchHistoryCached,
        profileCompletionGateActive,
        refreshActiveVisitCached,
        refreshCounselingRequestsCached,
        refreshEventsCached,
        refreshFormsCached,
        refreshNotificationsCached,
        refreshScholarshipApplicationsCached,
        refreshScholarshipsCached,
        refreshStudentProfile,
        refreshSupportRequestsCached,
        refreshVisitReasonsCached
    ]);

    useEffect(() => {
        void refreshCurrentView();
    }, [refreshCurrentView]);

    const handleRefreshCurrentView = useCallback(async () => {
        setIsRefreshingView(true);
        try {
            await refreshCurrentView({ force: true });
            showToast('View refreshed.');
        } catch (error: any) {
            showToast("Couldn't refresh view.", 'error');
        } finally {
            setIsRefreshingView(false);
        }
    }, [refreshCurrentView, showToast]);

    const openAssessmentForm = async (form: any) => {
        if (completedForms.has(form.id)) {
            showToast('You have already completed this assessment.', 'error');
            return;
        }
        setActiveForm(form);
        setShowAssessmentModal(true);
    };

    const openAssessmentFormWithProfileGate = React.useCallback(async (form: any) => {
        if (!requireStudentFeatureAccess(
            'assessment',
            'Needs Assessment is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Needs Assessment',
            'To start your needs assessment, please complete your student profile first. We need your emergency contact and remaining student information on file before you continue.'
        )) {
            return;
        }
        await openAssessmentForm(form);
    }, [openAssessmentForm, requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openCounselingFormWithProfileGate = React.useCallback(() => {
        if (!requireStudentFeatureAccess(
            'counseling',
            'Counseling is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Counseling Request',
            'To request counseling, you must complete your student profile first. Please add your emergency contact and other required profile details before using this service.'
        )) {
            return;
        }
        setShowCounselingForm(true);
    }, [requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openSupportFormWithProfileGate = React.useCallback(() => {
        if (!requireStudentFeatureAccess(
            'support',
            'Additional Support is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Additional Support Request',
            'To request additional support, you must complete your student profile first. Please finish your profile details so the CARE team has the information they need to assist you.'
        )) {
            return;
        }
        setShowSupportModal(true);
    }, [requireCompletedProfileForService, requireStudentFeatureAccess]);

    const handleApplyScholarshipWithProfileGate = React.useCallback(async (scholarship: any) => {
        if (!requireStudentFeatureAccess(
            'scholarship',
            'Scholarship access is currently disabled for your student role.'
        )) {
            return;
        }
        if (requireCompletedProfileForService(
            'Scholarship Application',
            'To apply for scholarships, you must complete your student profile first. Please provide your emergency contact and remaining required profile information before applying.'
        )) {
            return;
        }
        await handleApplyScholarship(scholarship);
    }, [handleApplyScholarship, requireCompletedProfileForService, requireStudentFeatureAccess]);

    const openRequestModal = (req: any) => {
        setSelectedRequest(req);
        setSessionFeedback({ rating: req.rating || 0, comment: req.feedback || '' });
    };

    const submitSessionFeedback = async () => {
        if (sessionFeedback.rating === 0) { showToast("Please select a rating.", 'error'); return; }
        try {
            const { error } = await supabaseClient.from('counseling_requests').update({ rating: sessionFeedback.rating, feedback: sessionFeedback.comment }).eq('id', selectedRequest.id);
            if (error) throw error;
            showToast("Feedback submitted!");
            const updatedReq = { ...selectedRequest, rating: sessionFeedback.rating, feedback: sessionFeedback.comment };
            setCounselingRequests(prev => prev.map(r => r.id === selectedRequest.id ? updatedReq : r));
            setSelectedRequest(updatedReq);
        } catch (err: any) { showToast('Something went wrong.', 'error'); }
    };

    const sidebarLinks = React.useMemo(() => ([
        { id: 'dashboard', label: 'Dashboard', icon: Icons.Dashboard, group: 'Core' },
        { id: 'profile', label: 'My Profile', icon: Icons.Profile, group: 'Core' },
        { id: 'assessment', label: 'Needs Assessment', icon: Icons.Assessment, group: 'Academic' },
        { id: 'counseling', label: 'Counseling', icon: Icons.Counseling, group: 'Services' },
        { id: 'support', label: 'Additional Support', icon: Icons.Support, group: 'Services' },
        { id: 'scholarship', label: 'Scholarship', icon: Icons.Scholarship, group: 'Services' },
        { id: 'events', label: 'Events', icon: Icons.Events, group: 'Activities' },
        { id: 'feedback', label: 'Feedback', icon: Icons.Feedback, group: 'Activities' }
    ]), []);
    const visibleSidebarLinks = React.useMemo(
        () => sidebarLinks.filter((link) => isStudentViewVisible(link.id)),
        [isStudentViewVisible, sidebarLinks]
    );
    const visibleViewIds = React.useMemo(
        () => visibleSidebarLinks.map((link) => link.id),
        [visibleSidebarLinks]
    );

    useEffect(() => {
        if (permissionsLoading) {
            return;
        }

        if (!visibleViewIds.length) {
            return;
        }

        if (!isStudentViewVisible(activeView)) {
            transitionToView(visibleViewIds[0], { suppressToast: true });
        }
    }, [activeView, permissionsLoading, transitionToView, visibleViewIds, isStudentViewVisible]);

    // --- LOADING STATE ---
    if (loading || permissionsLoading) {
        return { earlyReturn: <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-400">Loading Student Portal...</div> } as any;
    }

    if (permissionsError) {
        return { earlyReturn: (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">Unable to load student permissions</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{permissionsError}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Reload
                        </button>
                        <button
                            onClick={() => { logout(); navigate('/student/login'); }}
                            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        ) } as any;
    }

    if (!visibleSidebarLinks.length) {
        return { earlyReturn: (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">No student features are enabled</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                        Your student role currently has no enabled portal features. Please contact an administrator or CARE staff for access.
                    </p>
                    <button
                        onClick={() => { logout(); navigate('/student/login'); }}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        ) } as any;
    }

    // --- AUTHENTICATED MAIN RENDER ---
    const activeViewAccessState = getStudentViewAccessState(activeView);
    const showStudentAvailabilityView = activeView !== 'dashboard'
        && Object.prototype.hasOwnProperty.call(STUDENT_VIEW_FEATURE_MAP, activeView)
        && !(activeViewAccessState.isAllowed && activeViewAccessState.status === 'enabled');

    // --- ONBOARDING TOUR DATA ---
    const TOUR_STEPS = [
        {
            title: "Welcome to your Student Portal! 👋",
            description: "This is your central hub for all student services, assessments, and essential information. Let's take a quick look around.",
            icon: <Icons.Star filled />,
            highlightId: null
        },
        {
            title: "Needs Assessment",
            description: "Complete available needs assessment forms and submit your responses here.",
            icon: <Icons.Assessment />,
            highlightId: "nav-assessment"
        },
        {
            title: "Counseling Services",
            description: "Need someone to talk to? Request an appointment with our counseling staff easily through this tab.",
            icon: <Icons.Counseling />,
            highlightId: "nav-counseling"
        },
        {
            title: "Events & Announcements",
            description: "Stay updated with the latest workshops, seminars, and important school announcements.",
            icon: <Icons.Events />,
            highlightId: "nav-events"
        },
        {
            title: "Your Profile",
            description: "Keep your personal information up to date so we can serve you better. Click here to edit your details.",
            icon: <Icons.Profile />,
            highlightId: "nav-profile"
        },
        {
            title: "You're All Set! 🚀",
            description: "Feel free to explore the portal at your own pace. If you ever need help, the Support tab is right there.",
            icon: <Icons.CheckCircle />,
            highlightId: null
        }
    ];

    const currentTourStep = TOUR_STEPS[tourStep];
    const highlightedElement = currentTourStep?.highlightId ? document.getElementById(currentTourStep.highlightId) : null;
    const highlightRect = highlightedElement ? highlightedElement.getBoundingClientRect() : null;

    const handleTourNext = async () => {
        if (tourStep < TOUR_STEPS.length - 1) {
            setTourStep(prev => prev + 1);
        } else {
            setShowTour(false);
            setHasSeenTourState(true);
            try {
                await invokeManagedStudentFunction({
                    mode: 'mark-tour-seen'
                });
                syncStudentSession({ has_seen_tour: true });
            } catch (err) {
                console.error("Failed to save tour completion.", err);
            }
        }
    };

    const remainingViewProps: StudentRemainingViewProps = {
        activeView,
        shared: {
            Icons,
            personalInfo,
            formatFullDate,
            showCommandHub,
            setShowCommandHub,
            setActiveView: transitionToView,
            showToast
        },
        assessment: {
            activeForm,
            loadingForm,
            formsList,
            openAssessmentForm: openAssessmentFormWithProfileGate,
            showAssessmentModal,
            setShowAssessmentModal,
            onAssessmentSubmitted: handleAssessmentSubmitted,
            showSuccessModal,
            setShowSuccessModal,
            completedForms
        },
        counseling: {
            showCounselingForm,
            setShowCounselingForm,
            openCounselingForm: openCounselingFormWithProfileGate,
            onCounselingSubmitted: handleCounselingSubmitted,
            counselingRequests,
            openRequestModal,
            selectedRequest,
            setSelectedRequest,
            sessionFeedback,
            setSessionFeedback,
            submitSessionFeedback,
            showCounselingRequestsModal,
            setShowCounselingRequestsModal
        },
        support: {
            supportRequests,
            showSupportModal,
            setShowSupportModal,
            openSupportForm: openSupportFormWithProfileGate,
            onSupportSubmitted: handleSupportSubmitted,
            selectedSupportRequest,
            setSelectedSupportRequest,
            showSupportRequestsModal,
            setShowSupportRequestsModal
        },
        scholarship: {
            scholarshipsList,
            myApplications,
            showScholarshipModal,
            setShowScholarshipModal,
            selectedScholarship,
            setSelectedScholarship,
            handleApplyScholarship: handleApplyScholarshipWithProfileGate,
            isApplyingScholarshipId
        },
        feedback: {
            feedbackType,
            setFeedbackType,
            rating,
            setRating,
            feedbackPrefill,
            setFeedbackPrefill
        },
        profile: {
            profileTab,
            setProfileTab,
            isEditing,
            setIsEditing,
            setPersonalInfo,
            saveProfileChanges,
            isSavingProfileChanges,
            requestStudentSecurityOtp,
            confirmStudentSecurityEmailChange,
            confirmStudentPasswordChange,
            authEmail: session?.user?.email || session?.auth_email || personalInfo.email || '',
            attendanceMap,
            showMoreProfile,
            setShowMoreProfile,
            uploadProfilePicture
        }
    };

    return {
        earlyReturn: null as any,
        attendanceMap,
        cancellingRegistrationEventId,
        closeProfileCompletionModal,
        closeProfileServiceGate,
        dismissProfileCompletionReminder,
        fetchHistory,
        handleCancelRegistration,
        handleOfficeTimeIn,
        handleOfficeTimeOut,
        handleRateEvent,
        handleRegisterEvent,
        handleTimeIn,
        handleTimeOut,
        isCompletingOfficeVisit,
        isStudentViewEnabled,
        isStudentViewVisible,
        isSubmittingEventRating,
        isSubmittingOfficeTimeIn,
        isTimingIn,
        openProfileCompletionFromServiceGate,
        openProfileCompletionModal,
        profileCompletionGateActive,
        profileCompletionInitialData,
        profileCompletionReminderRequired,
        profileCompletionReminderVisible,
        profileServiceGate,
        ratedEvents,
        ratingForm,
        registeringEventId,
        registrationMap,
        selectedReason,
        setProofFile,
        setRatingForm,
        setSelectedReason,
        setShowRatingModal,
        setShowTimeInModal,
        setShowTimeOutFeedback,
        showRatingModal,
        showTimeInModal,
        showTimeOutFeedback,
        submitRating,
        submitTimeIn,
        timeOutVisitReason,
        timingOutEventId,
        transitionToView,
        session,
        loading,
        updateSession,
        logout,
        navigate,
        activeView,
        setActiveView,
        profileTab,
        setProfileTab,
        isCompactPortalLayout,
        feedbackType,
        setFeedbackType,
        rating,
        setRating,
        counselingRequests,
        setCounselingRequests,
        supportRequests,
        setSupportRequests,
        notifications,
        setNotifications,
        selectedRequest,
        setSelectedRequest,
        selectedSupportRequest,
        setSelectedSupportRequest,
        sessionFeedback,
        setSessionFeedback,
        feedbackPrefill,
        setFeedbackPrefill,
        activeVisit,
        setActiveVisit,
        toast,
        showToast,
        closeToast,
        isSidebarOpen,
        setIsSidebarOpen,
        showCommandHub,
        setShowCommandHub,
        mainScrollRef,
        activeForm,
        setActiveForm,
        formsList,
        setFormsList,
        loadingForm,
        setLoadingForm,
        showAssessmentModal,
        setShowAssessmentModal,
        showSuccessModal,
        setShowSuccessModal,
        completedForms,
        setCompletedForms,
        eventFilter,
        setEventFilter,
        showCounselingForm,
        setShowCounselingForm,
        showSupportModal,
        setShowSupportModal,
        showCounselingRequestsModal,
        setShowCounselingRequestsModal,
        showSupportRequestsModal,
        setShowSupportRequestsModal,
        visitReasons,
        setVisitReasons,
        handleLogout,
        isEditing,
        setIsEditing,
        personalInfo,
        setPersonalInfo,
        showMoreProfile,
        setShowMoreProfile,
        courseYearGate,
        setCourseYearGate,
        isSubmittingCourseYearGate,
        setIsSubmittingCourseYearGate,
        courseYearGateVisibleRef,
        courseYearGateConfirmedRef,
        archiveRpcStateRef,
        archiveRpcCheckedKeysRef,
        courseOptionsCacheRef,
        showTour,
        setShowTour,
        tourStep,
        setTourStep,
        hasSeenTourState,
        setHasSeenTourState,
        isSavingProfileChanges,
        setIsSavingProfileChanges,
        getStoredParentParts,
        PROFILE_FIELD_LABELS,
        normalizeProfileField,
        toProfileFieldLabel,
        getChangedProfileFields,
        logStudentProfileUpdate,
        syncStudentSession,
        handleAssessmentSubmitted,
        handleProfileCompletionSuccess,
        eventsList,
        setEventsList,
        selectedEvent,
        setSelectedEvent,
        isRefreshingView,
        setIsRefreshingView,
        runDatasetRefresh,
        refreshActiveVisit,
        refreshVisitReasons,
        refreshNotifications,
        refreshCounselingRequestsCached,
        refreshNotificationsCached,
        refreshEventsCached,
        refreshActiveVisitCached,
        refreshVisitReasonsCached,
        refreshFormsCached,
        refreshSupportRequestsCached,
        handleCounselingSubmitted,
        handleSupportSubmitted,
        invokeManagedStudentFunction,
        syncStudentAuthEmailIfNeeded,
        getCourseYearWindowRange,
        formatGateDate,
        getSchoolYearLabel,
        submitCourseYearConfirmation,
        refreshStudentProfile,
        validateProfileBeforeSave,
        saveProfileChanges,
        requestStudentSecurityOtp,
        confirmStudentSecurityEmailChange,
        confirmStudentPasswordChange,
        uploadProfilePicture,
        formatFullDate,
        refreshCurrentView,
        handleRefreshCurrentView,
        openAssessmentForm,
        openAssessmentFormWithProfileGate,
        openCounselingFormWithProfileGate,
        openSupportFormWithProfileGate,
        handleApplyScholarshipWithProfileGate,
        openRequestModal,
        submitSessionFeedback,
        sidebarLinks,
        visibleSidebarLinks,
        visibleViewIds,
        activeViewAccessState,
        showStudentAvailabilityView,
        TOUR_STEPS,
        currentTourStep,
        highlightedElement,
        highlightRect,
        handleTourNext,
        remainingViewProps
    };
}
