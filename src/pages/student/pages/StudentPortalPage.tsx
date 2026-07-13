import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { createPortal } from 'react-dom';
import { renderRemainingViews } from '../StudentPortalViewRouter';
import { STUDENT_VIEW_FEATURE_MAP, STUDENT_VIEW_LABELS } from '../StudentPortalRoutes';
import { StudentTourOverlay } from '../components/StudentTourOverlay';
import { useStudentCompactPortalLayout } from '../hooks/useStudentCompactPortalLayout';
import { useStudentEventActions } from '../features/events/hooks/useStudentEventActions';
import { useStudentOfficeVisitActions } from '../features/logbook/hooks/useStudentOfficeVisitActions';
import { Icons } from '../components/StudentPortalIcons';
import { StudentHero } from '../components/StudentHero';
import { YEAR_LEVEL_OPTIONS } from '../features/profile/profileFormUtils';
import { useStudentPortalNavigation } from '../hooks/useStudentPortalNavigation';
import { useStudentProfileCompletionGate } from '../hooks/useStudentProfileCompletionGate';
import { useStudentPortalRefresh } from '../hooks/useStudentPortalRefresh';
import { useStudentScholarships } from '../features/scholarship/hooks/useStudentScholarships';
import { useStudentToast } from '../hooks/useStudentToast';
import { StudentPortalShell } from '../layout/StudentPortalShell';
import type { StudentRemainingViewProps } from '../types';
import { STUDENT_LIST_COLUMNS } from '../../../services/careStaffService';
import { fetchDepartmentNameForCourse } from '../../../utils/courseDepartment';
import { joinNameParts, splitFullName } from '../../../utils/nameUtils';
import { buildStudentAddress, getStudentEmergencyContact, getStudentSex } from '../../../utils/studentFields';
import { invokeEdgeFunction } from '../../../lib/invokeEdgeFunction';
import { usePermissions } from '../../../hooks/usePermissions';
import FeatureAvailabilityView from '../../../components/permissions/FeatureAvailabilityView';
import { useStudentProfileData } from '../features/profile/hooks/useStudentProfileData';
import {
    clearPendingProfileCompletion,
    getPendingProfileCompletionProfile,
    shouldForceProfileCompletionPrompt
} from '../../../lib/studentProfileCompletionPrompt';
import { validateTextInput, isValidEmailDomain } from '../../../utils/inputSecurity';
import { getProfileTextFieldRule } from '../../../utils/profileFieldRules';
import { driveService } from '../../../services/driveService';
import { getStoredAssetPath } from '../../../utils/storageAssets';
import { useStudentPortal, ProfileCompletionModal, StudentDashboardView, StudentEventsView } from '../hooks/useStudentPortal';

export default function StudentPortal() {
    const {
        earlyReturn,
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
    } = useStudentPortal();

    if (earlyReturn) {
        return earlyReturn;
    }

    return (
        <StudentPortalShell
            profileCompletionGateActive={profileCompletionGateActive}
            overlays={
                <>
                    <StudentTourOverlay
                        isOpen={showTour && !profileCompletionGateActive && !profileCompletionReminderVisible}
                        currentTourStep={currentTourStep}
                        highlightRect={highlightRect}
                        isCompactPortalLayout={isCompactPortalLayout}
                        tourStep={tourStep}
                        totalSteps={TOUR_STEPS.length}
                        onNext={handleTourNext}
                    />

                    {profileCompletionGateActive && (
                        <Suspense fallback={null}>
                            <ProfileCompletionModal
                                isOpen={profileCompletionGateActive}
                                initialData={profileCompletionInitialData}
                                personalInfo={personalInfo}
                                showToast={showToast}
                                onCompleted={handleProfileCompletionSuccess}
                                onClose={closeProfileCompletionModal}
                            />
                        </Suspense>
                    )}
                    {/* Floating Profile Completion Reminder */}
                    {profileCompletionReminderVisible && createPortal(
                        <div className="fixed bottom-4 right-4 z-[10003] w-[calc(100%-2rem)] max-w-sm pointer-events-auto sm:bottom-6 sm:right-6">
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={openProfileCompletionModal}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        openProfileCompletionModal();
                                    }
                                }}
                                className="cursor-pointer rounded-2xl border border-amber-200/80 bg-white/95 p-4 shadow-2xl shadow-amber-200/40 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-amber-200/60"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-200">
                                        <Icons.Profile />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-600/80">Profile Incomplete</p>
                                                <h3 className="mt-1 text-base font-black text-slate-900">Please complete your profile</h3>
                                            </div>
                                            <button
                                                type="button"
                                                aria-label="Dismiss profile reminder"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    dismissProfileCompletionReminder();
                                                }}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                                                </svg>
                                            </button>
                                        </div>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            Some required student information is still missing. Open the profile form to finish it.
                                        </p>
                                        <div className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-amber-700">
                                            <span>Open Complete Profile</span>
                                            <Icons.ArrowRight className="h-4 w-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}


                    {profileServiceGate.visible && createPortal(
                        <div className="fixed inset-0 z-[10004] flex items-center justify-center bg-transparent p-4 pointer-events-auto student-mobile-modal-overlay">
                            <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl student-mobile-modal-panel">
                                <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-amber-50 to-white px-6 py-5">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-200">
                                            <Icons.Lock />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-rose-600/80">Profile Required</p>
                                            <h3 className="mt-1 text-xl font-black text-slate-900">Complete your profile to continue</h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-500">{profileServiceGate.serviceLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-5">
                                    <p className="text-sm leading-relaxed text-slate-600">
                                        {profileServiceGate.message}
                                    </p>
                                    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                                        Complete your profile once, then all locked campus services will be available on your next attempt.
                                    </div>
                                </div>
                                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <button
                                        type="button"
                                        onClick={closeProfileServiceGate}
                                        className="w-full rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5"
                                    >
                                        Maybe later
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openProfileCompletionFromServiceGate}
                                        className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5"
                                    >
                                        Open Complete Profile
                                    </button>
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}

                    {/* Forced Course/Year Confirmation Gate */}
                    {!profileCompletionGateActive && courseYearGate.visible && createPortal(
                        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-transparent p-4 student-mobile-modal-overlay">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 student-mobile-modal-panel student-mobile-modal-scroll-panel">
                                <h3 className="text-lg font-extrabold text-slate-900">Course and Year Confirmation Required</h3>
                                <p className="text-sm text-slate-600 mt-2">
                                    Please confirm your course and year level for the current enrollment cycle before continuing.
                                </p>
                                {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd) && (
                                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                        <span>School Year: {getSchoolYearLabel(courseYearGate.windowStart, courseYearGate.windowEnd)}</span>
                                    </div>
                                )}

                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Course</label>
                                        {courseYearGate.courseLocked ? (
                                            <input
                                                readOnly
                                                value={courseYearGate.course}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                            />
                                        ) : (
                                            <select
                                                value={courseYearGate.course}
                                                onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, course: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                            >
                                                <option value="">Select course</option>
                                                {(courseYearGate.courseOptions || []).map((courseName: string) => (
                                                    <option key={courseName} value={courseName}>{courseName}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-600 mb-1">Year Level</label>
                                        {courseYearGate.yearLocked ? (
                                            <input
                                                readOnly
                                                value={courseYearGate.year}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                                            />
                                        ) : (
                                            <select
                                                value={courseYearGate.year}
                                                onChange={(e) => setCourseYearGate((prev: any) => ({ ...prev, year: e.target.value }))}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                                            >
                                                {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                {courseYearGate.expired && (
                                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                        The update window has ended. Contact CARE staff to reopen your confirmation window.
                                    </div>
                                )}

                                <div className="mt-5 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700"
                                    >
                                        Logout
                                    </button>
                                    {!courseYearGate.expired && (
                                        <button
                                            type="button"
                                            onClick={submitCourseYearConfirmation}
                                            disabled={isSubmittingCourseYearGate}
                                            className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                                        >
                                            {isSubmittingCourseYearGate ? 'Saving...' : 'Confirm'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )}
                </>
            }
            activeView={activeView}
            activeViewLabel={STUDENT_VIEW_LABELS[activeView] || activeView}
            isSidebarOpen={isSidebarOpen}
            visibleSidebarLinks={visibleSidebarLinks}
            Icons={Icons}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            onSelectView={(viewId) => {
                transitionToView(viewId);
                setIsEditing(false);
                setIsSidebarOpen(false);
            }}
            onLogout={handleLogout}
            isCompactPortalLayout={isCompactPortalLayout}
            notifications={notifications}
            isRefreshingView={isRefreshingView}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onRefreshCurrentView={handleRefreshCurrentView}
            mainScrollRef={mainScrollRef}
            scrollClassName={`student-portal-scroll isolate flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 ${activeView === 'profile' || isCompactPortalLayout ? '' : 'page-transition'}`}
            scrollStyle={activeView === 'profile' ? { transform: 'none' } : undefined}
            showCommandHub={showCommandHub}
            setShowCommandHub={setShowCommandHub}
            isStudentViewVisible={isStudentViewVisible}
            isStudentViewEnabled={isStudentViewEnabled}
            setActiveView={transitionToView}
            openCounselingForm={openCounselingFormWithProfileGate}
            openSupportForm={openSupportFormWithProfileGate}
            toast={toast}
            onCloseToast={closeToast}
        >
            {showStudentAvailabilityView ? (
                <FeatureAvailabilityView
                    title={STUDENT_VIEW_LABELS[activeView] || activeView}
                    permission={activeViewAccessState}
                    description="This page is not available right now. Please try again later or contact the CARE Center if you need help with this service."
                    accent="blue"
                />
            ) : (
                <>
                    {/* DASHBOARD */}
                    {activeView === 'dashboard' && (
                        <Suspense fallback={null}>
                            <StudentDashboardView
                                setActiveView={transitionToView}
                                personalInfo={personalInfo}
                                activeVisit={activeVisit}
                                handleOfficeTimeIn={handleOfficeTimeIn}
                                handleOfficeTimeOut={handleOfficeTimeOut}
                                notifications={notifications}
                                eventsList={eventsList}
                                StudentHero={StudentHero}
                                showTimeInModal={showTimeInModal}
                                setShowTimeInModal={setShowTimeInModal}
                                visitReasons={visitReasons}
                                selectedReason={selectedReason}
                                setSelectedReason={setSelectedReason}
                                submitTimeIn={submitTimeIn}
                                isSubmittingOfficeTimeIn={isSubmittingOfficeTimeIn}
                                isCompletingOfficeVisit={isCompletingOfficeVisit}
                                showTimeOutFeedback={showTimeOutFeedback}
                                setShowTimeOutFeedback={setShowTimeOutFeedback}
                                timeOutVisitReason={timeOutVisitReason}
                                showProfileCompletionBanner={profileCompletionReminderRequired}
                                openProfileCompletionModal={openProfileCompletionModal}
                                showToast={showToast}
                            />
                        </Suspense>
                    )}

                    {/* EVENTS */}
                    {activeView === 'events' && (
                        <Suspense fallback={null}>
                            <StudentEventsView
                                eventsList={eventsList}
                                eventFilter={eventFilter}
                                setEventFilter={setEventFilter}
                                attendanceMap={attendanceMap}
                                registrationMap={registrationMap}
                                fetchHistory={fetchHistory}
                                handleRegisterEvent={handleRegisterEvent}
                                handleCancelRegistration={handleCancelRegistration}
                                handleTimeIn={handleTimeIn}
                                handleTimeOut={handleTimeOut}
                                handleRateEvent={handleRateEvent}
                                ratedEvents={ratedEvents}
                                isTimingIn={isTimingIn}
                                timingOutEventId={timingOutEventId}
                                registeringEventId={registeringEventId}
                                cancellingRegistrationEventId={cancellingRegistrationEventId}
                                isSubmittingEventRating={isSubmittingEventRating}
                                setProofFile={setProofFile}
                                selectedEvent={selectedEvent}
                                setSelectedEvent={setSelectedEvent}
                                showRatingModal={showRatingModal}
                                setShowRatingModal={setShowRatingModal}
                                ratingForm={ratingForm}
                                setRatingForm={setRatingForm}
                                submitRating={submitRating}
                                showTimeInModal={showTimeInModal}
                                setShowTimeInModal={setShowTimeInModal}
                                visitReasons={visitReasons}
                                selectedReason={selectedReason}
                                setSelectedReason={setSelectedReason}
                                submitTimeIn={submitTimeIn}
                                personalInfo={personalInfo}
                                toast={toast}
                                showToast={showToast}
                                Icons={Icons}
                                showCommandHub={showCommandHub}
                                setShowCommandHub={setShowCommandHub}
                                setActiveView={transitionToView}
                                setShowCounselingForm={setShowCounselingForm}
                                setShowSupportModal={setShowSupportModal}
                            />
                        </Suspense>
                    )}

                    {/* ASSESSMENT - COUNSELING - SUPPORT - SCHOLARSHIP - FEEDBACK - PROFILE */}
                    {renderRemainingViews(remainingViewProps)}
                </>
            )}
        </StudentPortalShell>
    );
}


