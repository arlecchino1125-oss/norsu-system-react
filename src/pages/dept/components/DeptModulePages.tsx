import { Suspense, lazy } from 'react';
import { moduleLabels } from '../utils';
import DeptHomePage from '../features/dashboard/components/DeptHomePage';
import DeptCounselingQueuePage from '../features/counseling/components/DeptCounselingQueuePage';
import DeptSupportApprovalsPage from '../features/support/components/DeptSupportApprovalsPage';
import DeptEventsPage from '../features/events/components/DeptEventsPage';
import DeptStudentsPage from '../features/students/components/DeptStudentsPage';
import DeptCounseledPage from '../features/counseling/components/DeptCounseledPage';
import DeptSettingsPage from '../features/settings/components/DeptSettingsPage';
import DeptAdmissionsPage from '../features/admissions/components/DeptAdmissionsPage';
import DeptInterviewQueuePage from '../features/admissions/components/DeptInterviewQueuePage';
import StaffCalendarPage from '../../shared/StaffCalendarPage';
import StaffExportCenterPage from '../../shared/StaffExportCenterPage';
import FeatureAvailabilityView from '../../../components/permissions/FeatureAvailabilityView';
const DeptReportsPage = lazy(() => import('../features/reports/components/DeptReportsPage'));

const moduleLoadingFallback = (
    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
        <p className="text-sm font-semibold text-gray-700">Loading report module...</p>
        <p className="mt-1 text-xs text-gray-500">Preparing charts and analytics for this page.</p>
    </div>
);

/**
 * Renders the page for the active Department Head module. Receives the
 * dashboard's hook results as grouped objects (filters, counseling, support,
 * admissions, account, admissionsDashboard) and binds them to each page.
 */
export function DeptModulePages({
    activeModule, goToModule, showModuleAvailabilityView, activeModuleAccessState,
    data, setData, filteredData, chartData, dashboardStats, todayCounselingSessions,
    counselingRequests, supportRequests, admissionApplicants, eventsList, deptAttendanceEvents, deptAttendanceCounts, isLoadingDeptAttendanceEvents,
    admissionsState, studentsState, departmentAlertItems, showToastMessage, authEmail,
    filters, counseling, support, admissions, account, admissionsDashboard,
    settingsReasons, handleViewDeptAttendees, studentModals
}: any) {
    const {
        studentSearch, setStudentSearch, counseledSearch, setCounseledSearch,
        counseledDate, setCounseledDate,
        deptCourseFilter, setDeptCourseFilter, deptYearFilter, setYearLevelFilter,
        deptSectionFilter, setDeptSectionFilter, deptCourses,
        matchesCascadeFilters, getStudentForRequest, cascadeFilterBar
    } = filters;
    const {
        counselingTab, setCounselingTab, selectedCounselingReq, setSelectedCounselingReq,
        showCounselingViewModal, setShowCounselingViewModal,
        showScheduleModal, setShowScheduleModal, scheduleData, setScheduleData,
        showRejectModal, setShowRejectModal, rejectNotes, setRejectNotes,
        setForwardingToStaff, setReferralForm, setShowReferralModal,
        handleApproveAndSchedule, handleRejectRequest, handleCompleteRequest, handleStartForward,
        isSubmittingCounselingSchedule, isSubmittingCounselingReject, pendingCounselingCompletionId
    } = counseling;
    const {
        interviewQueueDate, setInterviewQueueDate, interviewQueueRows,
        isInterviewQueueLoading, interviewQueueError, refreshInterviewQueue,
        admissionsDashboardCounts
    } = admissionsDashboard;
    const { setSelectedStudent, setShowStudentModal, setSelectedHistoryStudent, setShowHistoryModal } = studentModals;

    return (
        <div key={activeModule} className="flex-1 overflow-y-auto p-6 lg:p-10 page-transition">
            {showModuleAvailabilityView && activeModuleAccessState && (
                <FeatureAvailabilityView
                    title={(moduleLabels as any)[activeModule] || activeModule}
                    permission={activeModuleAccessState}
                    description="This page is currently unavailable in the Department Head portal. Please check back later or contact your administrator if you need access restored."
                    accent="emerald"
                />
            )}

            {/* DASHBOARD / HOME */}
            {!showModuleAvailabilityView && activeModule === 'dashboard' && (
                <DeptHomePage
                    filteredData={filteredData}
                    dashboardStats={dashboardStats}
                    todayCounselingSessions={todayCounselingSessions}
                    counselingRequests={counselingRequests}
                    admissionsDashboardCounts={admissionsDashboardCounts}
                    departmentAlertItems={departmentAlertItems}
                    interviewQueueRows={interviewQueueRows}
                    eventsList={eventsList}
                    setActiveModule={goToModule}
                    setForwardingToStaff={setForwardingToStaff}
                    setReferralForm={setReferralForm}
                    setShowReferralModal={setShowReferralModal}
                    setSelectedCounselingReq={setSelectedCounselingReq}
                    setShowCounselingViewModal={setShowCounselingViewModal}
                />
            )}

            {!showModuleAvailabilityView && activeModule === 'counseling_queue' && (
                <DeptCounselingQueuePage
                    counselingRequests={counselingRequests}
                    counselingTab={counselingTab}
                    setCounselingTab={setCounselingTab}
                    cascadeFilterBar={cascadeFilterBar}
                    matchesCascadeFilters={matchesCascadeFilters}
                    getStudentForRequest={getStudentForRequest}
                    selectedCounselingReq={selectedCounselingReq}
                    setSelectedCounselingReq={setSelectedCounselingReq}
                    setForwardingToStaff={setForwardingToStaff}
                    setReferralForm={setReferralForm}
                    setShowReferralModal={setShowReferralModal}
                    modalState={{
                        showCounselingViewModal,
                        showScheduleModal,
                        showRejectModal
                    }}
                    setShowCounselingViewModal={setShowCounselingViewModal}
                    setShowScheduleModal={setShowScheduleModal}
                    setShowRejectModal={setShowRejectModal}
                    scheduleData={scheduleData}
                    setScheduleData={setScheduleData}
                    rejectNotes={rejectNotes}
                    setRejectNotes={setRejectNotes}
                    handleApproveAndSchedule={handleApproveAndSchedule}
                    handleRejectRequest={handleRejectRequest}
                    handleCompleteRequest={handleCompleteRequest}
                    handleStartForward={handleStartForward}
                    submissionState={{
                        isSubmittingCounselingSchedule,
                        isSubmittingCounselingReject
                    }}
                    pendingCounselingCompletionId={pendingCounselingCompletionId}
                />
            )}

            {/* ADMISSIONS SCREENING */}
            {!showModuleAvailabilityView && activeModule === 'admissions' && (
                <DeptAdmissionsPage
                    applicants={admissionApplicants}
                    admissionsState={admissionsState}
                    departmentName={data?.profile?.department}
                    handleApproveApplicant={admissions.handleApproveApplicant}
                    handleRejectApplicant={admissions.handleRejectApplicant}
                    handleMarkApplicantAbsent={admissions.handleMarkApplicantAbsent}
                    handleBulkApproveApplicants={admissions.handleBulkApproveApplicants}
                    handleBulkForwardApplicants={admissions.handleBulkForwardApplicants}
                    handleBulkMarkApplicantsUnsuccessful={admissions.handleBulkMarkApplicantsUnsuccessful}
                    handleRescheduleInterview={admissions.handleRescheduleInterview}
                    handleScheduleInterview={admissions.handleScheduleInterview}
                    handleBulkScheduleInterviews={admissions.handleBulkScheduleInterviews}
                    pendingApplicantActionId={admissions.pendingApplicantActionId}
                    isSchedulingApplicant={admissions.isSchedulingApplicant}
                    isProcessingBulkApplicantAction={admissions.isProcessingBulkApplicantAction}
                />
            )}

            {!showModuleAvailabilityView && activeModule === 'interview_queue' && (
                <DeptInterviewQueuePage
                    queueDate={interviewQueueDate}
                    setQueueDate={setInterviewQueueDate}
                    queueRows={interviewQueueRows}
                    isLoadingQueue={isInterviewQueueLoading}
                    queueError={interviewQueueError}
                    refreshInterviewQueue={refreshInterviewQueue}
                />
            )}

            {!showModuleAvailabilityView && activeModule === 'calendar' && (
                <StaffCalendarPage
                    scope="department"
                    departmentName={data?.profile?.department}
                    accent="emerald"
                />
            )}

            {!showModuleAvailabilityView && activeModule === 'export_center' && (
                <StaffExportCenterPage
                    scope="department"
                    departmentName={data?.profile?.department}
                    accent="emerald"
                    showToast={showToastMessage}
                />
            )}

            {/* REPORTS */}
            {!showModuleAvailabilityView && activeModule === 'reports' && (
                <Suspense fallback={moduleLoadingFallback}>
                    <DeptReportsPage chartData={chartData} />
                </Suspense>
            )}

            {/* SETTINGS */}
            {!showModuleAvailabilityView && activeModule === 'settings' && (
                <DeptSettingsPage
                    data={data}
                    setData={setData}
                    newReason={settingsReasons.newReason}
                    setNewReason={settingsReasons.setNewReason}
                    addReason={settingsReasons.addReason}
                    deleteReason={settingsReasons.deleteReason}
                    authEmail={authEmail}
                    requestStaffSecurityOtp={account.requestStaffSecurityOtp}
                    confirmStaffSecurityEmailChange={account.confirmStaffSecurityEmailChange}
                    confirmStaffPasswordChange={account.confirmStaffPasswordChange}
                    updateStaffProfileName={account.updateStaffProfileName}
                    showToast={showToastMessage}
                />
            )}

            {/* SUPPORT APPROVALS */}
            {!showModuleAvailabilityView && activeModule === 'support_approvals' && (
                <DeptSupportApprovalsPage
                    data={data}
                    supportRequests={supportRequests}
                    filteredData={filteredData}
                    matchesCascadeFilters={matchesCascadeFilters}
                    cascadeFilterBar={cascadeFilterBar}
                    modalState={{
                        showApproveScheduleModal: support.showApproveScheduleModal,
                        showResolveModal: support.showResolveModal,
                        showReferCareModal: support.showReferCareModal
                    }}
                    setShowApproveScheduleModal={support.setShowApproveScheduleModal}
                    approveScheduleData={support.approveScheduleData}
                    setApproveScheduleData={support.setApproveScheduleData}
                    handleSupportApproveAndSchedule={support.handleSupportApproveAndSchedule}
                    handleRejectSupport={support.handleRejectSupport}
                    pendingSupportRejectId={support.pendingSupportRejectId}
                    setShowResolveModal={support.setShowResolveModal}
                    resolveData={support.resolveData}
                    setResolveData={support.setResolveData}
                    handleResolveSupport={support.handleResolveSupport}
                    setShowReferCareModal={support.setShowReferCareModal}
                    referCareForm={support.referCareForm}
                    setReferCareForm={support.setReferCareForm}
                    handleReferToCare={support.handleReferToCare}
                    sigCanvasRefSupport={support.sigCanvasRefSupport}
                    submissionState={{
                        isSubmittingSupportSchedule: support.isSubmittingSupportSchedule,
                        isSubmittingSupportResolve: support.isSubmittingSupportResolve,
                        isSubmittingSupportRefer: support.isSubmittingSupportRefer
                    }}
                />
            )}

            {!showModuleAvailabilityView && activeModule === 'events' && (
                <DeptEventsPage
                    data={data}
                    deptAttendanceEvents={deptAttendanceEvents}
                    deptAttendanceCounts={deptAttendanceCounts}
                    isLoadingDeptAttendanceEvents={isLoadingDeptAttendanceEvents}
                    handleViewDeptAttendees={handleViewDeptAttendees}
                />
            )}

            {/* STUDENTS */}
            {!showModuleAvailabilityView && activeModule === 'students' && (
                <DeptStudentsPage
                    filteredData={filteredData}
                    studentsState={studentsState}
                    studentSearch={studentSearch}
                    setStudentSearch={setStudentSearch}
                    matchesCascadeFilters={matchesCascadeFilters}
                    cascadeFilterBar={cascadeFilterBar}
                    setSelectedStudent={setSelectedStudent}
                    setShowStudentModal={setShowStudentModal}
                    showToast={showToastMessage}
                />
            )}

            {/* COUNSELED STUDENTS */}
            {!showModuleAvailabilityView && activeModule === 'counseled' && (
                <DeptCounseledPage
                    filteredData={filteredData}
                    counseledSearch={counseledSearch}
                    setCounseledSearch={setCounseledSearch}
                    counseledDate={counseledDate}
                    setCounseledDate={setCounseledDate}
                    deptCourseFilter={deptCourseFilter}
                    setDeptCourseFilter={setDeptCourseFilter}
                    deptYearFilter={deptYearFilter}
                    setYearLevelFilter={setYearLevelFilter}
                    deptSectionFilter={deptSectionFilter}
                    setDeptSectionFilter={setDeptSectionFilter}
                    deptCourses={deptCourses}
                    matchesCascadeFilters={matchesCascadeFilters}
                    getStudentForRequest={getStudentForRequest}
                    setSelectedHistoryStudent={setSelectedHistoryStudent}
                    setShowHistoryModal={setShowHistoryModal}
                />
            )}
        </div>
    );
}
