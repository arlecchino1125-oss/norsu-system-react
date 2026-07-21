import { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { renderRemainingViews } from '../StudentPortalViewRouter';
import { STUDENT_VIEW_LABELS } from '../StudentPortalRoutes';
import { StudentTourOverlay } from '../components/StudentTourOverlay';
import * as Icons from '../components/StudentPortalIcons';
import { StudentHero } from '../components/StudentHero';
import { YEAR_LEVEL_OPTIONS } from '../features/profile/profileFormUtils';
import { StudentPortalShell } from '../layout/StudentPortalShell';
import FeatureAvailabilityView from '../../../components/permissions/FeatureAvailabilityView';
import { useAuth } from '../../../lib/useAuth';
import { useStudentPortal, ProfileCompletionModal, StudentDashboardView, StudentEventsView } from '../hooks/useStudentPortal';

/** Floating card reminding the student to finish their profile. */
const ProfileCompletionReminder = ({ onOpen, onDismiss }: any) => (
    <div className="fixed bottom-4 right-4 z-[10003] w-[calc(100%-2rem)] max-w-sm pointer-events-auto sm:bottom-6 sm:right-6">
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
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
                                onDismiss();
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
    </div>
);

/** Blocking prompt shown when a locked campus service needs a completed profile. */
const ProfileServiceGateModal = ({ gate, onClose, onOpenProfile }: any) => (
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
                        <p className="mt-1 text-sm font-semibold text-slate-500">{gate.serviceLabel}</p>
                    </div>
                </div>
            </div>
            <div className="px-6 py-5">
                <p className="text-sm leading-relaxed text-slate-600">
                    {gate.message}
                </p>
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                    Complete your profile once, then all locked campus services will be available on your next attempt.
                </div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-xl px-5 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-200 sm:w-auto sm:py-2.5"
                >
                    Maybe later
                </button>
                <button
                    type="button"
                    onClick={onOpenProfile}
                    className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 sm:w-auto sm:py-2.5"
                >
                    Open Complete Profile
                </button>
            </div>
        </div>
    </div>
);

/** Forced course/year confirmation gate for the current enrollment cycle. */
const CourseYearGateModal = ({ gate, setGate, isSubmitting, getSchoolYearLabel, onLogout, onConfirm }: any) => (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-transparent p-4 student-mobile-modal-overlay">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 student-mobile-modal-panel student-mobile-modal-scroll-panel">
            <h3 className="text-lg font-extrabold text-slate-900">Course and Year Confirmation Required</h3>
            <p className="text-sm text-slate-600 mt-2">
                Please confirm your course and year level for the current enrollment cycle before continuing.
            </p>
            {getSchoolYearLabel(gate.windowStart, gate.windowEnd) && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    <span>School Year: {getSchoolYearLabel(gate.windowStart, gate.windowEnd)}</span>
                </div>
            )}

            <div className="mt-4 space-y-3">
                <div>
                    <label htmlFor="enrollment-course" className="block text-xs font-bold text-slate-600 mb-1">Course</label>
                    {gate.courseLocked ? (
                        <input
                            id="enrollment-course"
                            readOnly
                            value={gate.course}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                        />
                    ) : (
                        <select
                            id="enrollment-course"
                            value={gate.course}
                            onChange={(e) => setGate((prev: any) => ({ ...prev, course: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                        >
                            <option value="">Select course</option>
                            {(gate.courseOptions || []).map((courseName: string) => (
                                <option key={courseName} value={courseName}>{courseName}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div>
                    <label htmlFor="enrollment-year" className="block text-xs font-bold text-slate-600 mb-1">Year Level</label>
                    {gate.yearLocked ? (
                        <input
                            id="enrollment-year"
                            readOnly
                            value={gate.year}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-100 text-sm text-slate-700"
                        />
                    ) : (
                        <select
                            id="enrollment-year"
                            value={gate.year}
                            onChange={(e) => setGate((prev: any) => ({ ...prev, year: e.target.value }))}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
                        >
                            {YEAR_LEVEL_OPTIONS.map((year) => <option key={year} value={year}>{year}</option>)}
                        </select>
                    )}
                </div>
            </div>

            {gate.expired && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    The update window has ended. Contact CARE staff to reopen your confirmation window.
                </div>
            )}

            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700"
                >
                    Logout
                </button>
                {!gate.expired && (
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60"
                    >
                        {isSubmitting ? 'Saving...' : 'Confirm'}
                    </button>
                )}
            </div>
        </div>
    </div>
);

function StudentPortalContent() {
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
        activeView,
        isCompactPortalLayout,
        notifications,
        activeVisit,
        toast,
        showToast,
        closeToast,
        isSidebarOpen,
        setIsSidebarOpen,
        showCommandHub,
        setShowCommandHub,
        mainScrollRef,
        eventFilter,
        setEventFilter,
        setShowCounselingForm,
        setShowSupportModal,
        visitReasons,
        handleLogout,
        setIsEditing,
        personalInfo,
        courseYearGate,
        setCourseYearGate,
        isSubmittingCourseYearGate,
        showTour,
        tourStep,
        handleProfileCompletionSuccess,
        eventsList,
        selectedEvent,
        setSelectedEvent,
        isRefreshingView,
        getSchoolYearLabel,
        submitCourseYearConfirmation,
        handleRefreshCurrentView,
        openCounselingFormWithProfileGate,
        openSupportFormWithProfileGate,
        visibleSidebarLinks,
        activeViewAccessState,
        showStudentAvailabilityView,
        TOUR_STEPS,
        currentTourStep,
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

                    {profileCompletionReminderVisible && createPortal(
                        <ProfileCompletionReminder
                            onOpen={openProfileCompletionModal}
                            onDismiss={dismissProfileCompletionReminder}
                        />,
                        document.body
                    )}

                    {profileServiceGate.visible && createPortal(
                        <ProfileServiceGateModal
                            gate={profileServiceGate}
                            onClose={closeProfileServiceGate}
                            onOpenProfile={openProfileCompletionFromServiceGate}
                        />,
                        document.body
                    )}

                    {!profileCompletionGateActive && courseYearGate.visible && createPortal(
                        <CourseYearGateModal
                            gate={courseYearGate}
                            setGate={setCourseYearGate}
                            isSubmitting={isSubmittingCourseYearGate}
                            getSchoolYearLabel={getSchoolYearLabel}
                            onLogout={handleLogout}
                            onConfirm={submitCourseYearConfirmation}
                        />,
                        document.body
                    )}
                </>
            }
            activeView={activeView}
            activeViewLabel={STUDENT_VIEW_LABELS[activeView] || activeView}
            viewState={{
                isSidebarOpen,
                isCompactPortalLayout,
                isRefreshingView,
                showCommandHub
            }}
            visibleSidebarLinks={visibleSidebarLinks}
            Icons={Icons}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            onSelectView={(viewId) => {
                transitionToView(viewId);
                setIsEditing(false);
                setIsSidebarOpen(false);
            }}
            onLogout={handleLogout}
            notifications={notifications}
            onOpenSidebar={() => setIsSidebarOpen(true)}
            onRefreshCurrentView={handleRefreshCurrentView}
            mainScrollRef={mainScrollRef}
            scrollClassName={`student-portal-scroll isolate flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 ${activeView === 'profile' || isCompactPortalLayout ? '' : 'page-transition'}`}
            scrollStyle={activeView === 'profile' ? { transform: 'none' } : undefined}
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
                                viewState={{
                                    showTimeInModal,
                                    isSubmittingOfficeTimeIn,
                                    isCompletingOfficeVisit,
                                    showTimeOutFeedback,
                                    showProfileCompletionBanner: profileCompletionReminderRequired
                                }}
                                setShowTimeInModal={setShowTimeInModal}
                                visitReasons={visitReasons}
                                selectedReason={selectedReason}
                                setSelectedReason={setSelectedReason}
                                submitTimeIn={submitTimeIn}
                                setShowTimeOutFeedback={setShowTimeOutFeedback}
                                timeOutVisitReason={timeOutVisitReason}
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
                                notify={showToast}
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

export default function StudentPortal() {
    const { session } = useAuth() as any;
    const sessionKey = [
        session?.userType || 'anonymous',
        session?.auth_user_id || session?.user?.id || 'no-auth-user',
        session?.student_id || 'no-student'
    ].join(':');

    return <StudentPortalContent key={sessionKey} />;
}
