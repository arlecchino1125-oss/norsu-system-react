import React, { Suspense, lazy, useState, useCallback } from 'react';
import { DeptSidebar } from './dept/components/DeptSidebar';
import { DeptHeader } from './dept/components/DeptHeader';
import { useDeptEmails } from './dept/hooks/useDeptEmails';
import { useDeptAdmissions } from './dept/features/admissions/hooks/useDeptAdmissions';
import { useDeptCounseling } from './dept/features/counseling/hooks/useDeptCounseling';
import { useDeptSupport } from './dept/features/support/hooks/useDeptSupport';
import { useDeptAccount } from './dept/hooks/useDeptAccount';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../hooks/usePermissions';
import { usePortalTabRoute, readInitialTab } from '../hooks/usePortalTabRoute';
import { useDeptData } from './dept/hooks/useDeptData';
import { useDeptFilters } from './dept/hooks/useDeptFilters';
import { useDeptAdmissionsDashboard } from './dept/features/admissions/hooks/useDeptAdmissionsDashboard';
import { useDeptEventAttendees } from './dept/features/events/hooks/useDeptEventAttendees';
import {
    DEPT_MODULE_FEATURES,
    moduleLabels,
    getFilteredDeptData,
    buildDepartmentAlertItems,
    buildDeptChartData
} from './dept/utils';
import DeptHomePage from './dept/features/dashboard/components/DeptHomePage';
import DeptCounselingQueuePage from './dept/features/counseling/components/DeptCounselingQueuePage';
import DeptSupportApprovalsPage from './dept/features/support/components/DeptSupportApprovalsPage';
import DeptEventsPage from './dept/features/events/components/DeptEventsPage';
import DeptStudentsPage from './dept/features/students/components/DeptStudentsPage';
import DeptCounseledPage from './dept/features/counseling/components/DeptCounseledPage';
import DeptSettingsPage from './dept/features/settings/components/DeptSettingsPage';
import DeptAdmissionsPage from './dept/features/admissions/components/DeptAdmissionsPage';
import DeptInterviewQueuePage from './dept/features/admissions/components/DeptInterviewQueuePage';
import StaffCalendarPage from './shared/StaffCalendarPage';
import StaffExportCenterPage from './shared/StaffExportCenterPage';
import FeatureAvailabilityView from '../components/permissions/FeatureAvailabilityView';
import { exportPDF, exportToExcel } from '../utils/dashboardUtils';
import { renderDeptModals } from './dept/modals/DeptModals';
import { DeptEmailPreviewModal } from './dept/components/DeptEmailPreviewModal';
const DeptReportsPage = lazy(() => import('./dept/features/reports/components/DeptReportsPage'));

const DEPT_BASE_PATH = '/department/dashboard';
const DEPT_MODULES = Object.keys(moduleLabels);

export default function DeptDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, updateSession, logout } = useAuth() as any;
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState,
        isFeatureVisible
    } = usePermissions();
    const { tab: urlModule } = useParams<{ tab?: string }>();
    const [activeModule, setActiveModule] = useState<string>(
        () => readInitialTab(urlModule, DEPT_MODULES, 'dashboard'),
    );
    const { goToTab: goToModule } = usePortalTabRoute({
        basePath: DEPT_BASE_PATH,
        tabs: DEPT_MODULES,
        defaultTab: 'dashboard',
        activeTab: activeModule,
        onTabResolved: setActiveModule,
    });
    const {
        data, setData, dashboardStats, todayCounselingSessions, eventsList, counselingRequests, setCounselingRequests,
        supportRequests, setSupportRequests, admissionApplicants,
        lastSeenSupportCount, setLastSeenSupportCount, toast, setToast, refreshAllData, showToastMessage,
        admissionsState,
        counselingState,
        supportState,
        studentsState
    } = useDeptData(session, isAuthenticated);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [deptNotifications] = useState<any[]>([]);


    const accountHook = useDeptAccount({ session, data, setData, showToastMessage });
    const {
        showProfileModal, setShowProfileModal, profileForm, setProfileForm,
        handleProfileSubmit, isUpdatingProfile,
        requestStaffSecurityOtp, confirmStaffSecurityEmailChange,
        confirmStaffPasswordChange, updateStaffProfileName
    } = accountHook;

    const emailsHook = useDeptEmails(showToastMessage);
    const {
        emailPreviewState, isLoadingEmailPreview, isConfirmingEmailPreview,
        openAdmissionsEmailPreview, handleConfirmEmailPreview, closeEmailPreviewModal
    } = emailsHook;

    const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
    const [selectedHistoryStudent, setSelectedHistoryStudent] = useState<any>(null);
    const [showStudentModal, setShowStudentModal] = useState<boolean>(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    const [viewFormRecord, setViewFormRecord] = useState<any>(null);
    const [viewFormMode, setViewFormMode] = useState<string>('');
    const [newReason, setNewReason] = useState<string>('');

    const filteredData = getFilteredDeptData(
        data,
        counselingRequests,
        dashboardStats?.populationByYear,
        dashboardStats?.populationTotal
    );
    const chartData = buildDeptChartData(filteredData, dashboardStats?.counseling);

    const {
        yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
        deptSectionFilter, setDeptSectionFilter,
        studentSearch, setStudentSearch, counseledSearch, setCounseledSearch,
        counseledDate, setCounseledDate,
        matchesCascadeFilters, getStudentForRequest, cascadeFilterBar
    } = useDeptFilters(data, filteredData);

    const {
        showEventAttendees, setShowEventAttendees, deptAttendees, handleViewDeptAttendees
    } = useDeptEventAttendees({ data, showToastMessage, setYearLevelFilter, setDeptCourseFilter, setDeptSectionFilter });

    const {
        interviewQueueDate, setInterviewQueueDate, interviewQueueRows, setInterviewQueueRows,
        isInterviewQueueLoading, interviewQueueError, admissionsDashboardCounts,
        refreshInterviewQueue, refreshAdmissionsDashboardCounts
    } = useDeptAdmissionsDashboard(data);

    const departmentAlertItems = buildDepartmentAlertItems({
        admissionsReadyCount: admissionsDashboardCounts.readyForInterview,
        admissionsAbsentCount: admissionsDashboardCounts.absent,
        counselingAwaitingCount: dashboardStats?.counseling?.awaiting ?? 0,
        supportForwardedCount: dashboardStats?.supportForwarded ?? 0
    });

    // ─── Counseling Queue Actions ───

    const patchCounselingRows = useCallback((updater: (rows: any[]) => any[]) => {
        setCounselingRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setCounselingRequests]);

    const patchSupportRows = useCallback((updater: (rows: any[]) => any[]) => {
        setSupportRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setSupportRequests]);

    const counselingHook = useDeptCounseling({
        data,
        filteredData,
        counselingState,
        showToastMessage,
        updateGlobalRows: patchCounselingRows
    });
    const {
        counselingTab, setCounselingTab, selectedCounselingReq, setSelectedCounselingReq,
        showCounselingViewModal, setShowCounselingViewModal, deptFormModalView, setDeptFormModalView,
        showScheduleModal, setShowScheduleModal, scheduleData, setScheduleData, showRejectModal, setShowRejectModal,
        rejectNotes, setRejectNotes, forwardingToStaff, setForwardingToStaff, isSubmittingCounselingSchedule,
        isSubmittingCounselingReject, pendingCounselingCompletionId, isSubmittingReferral, referralSearchQuery, setReferralSearchQuery,
        referralStudentOptions, isReferralStudentSearchLoading, selectedReferralStudent, selectReferralStudent,
        showReferralModal, setShowReferralModal, referralForm, setReferralForm, sigCanvasRef,
        handleApproveAndSchedule, handleRejectRequest, handleCompleteRequest, handleStartForward, handleReferralSubmit
    } = counselingHook;

    const supportHook = useDeptSupport({
        data,
        supportState,
        showToastMessage,
        updateGlobalRows: patchSupportRows
    });
    const {
        showApproveScheduleModal, setShowApproveScheduleModal,
        approveScheduleData, setApproveScheduleData, showResolveModal, setShowResolveModal, resolveData, setResolveData,
        showReferCareModal, setShowReferCareModal, referCareForm, setReferCareForm, pendingSupportRejectId, isSubmittingSupportSchedule,
        isSubmittingSupportResolve, isSubmittingSupportRefer, sigCanvasRefSupport,
        handleSupportApproveAndSchedule, handleRejectSupport, handleResolveSupport, handleReferToCare
    } = supportHook;

    const admissionsHook = useDeptAdmissions({
        data,
        admissionsState,
        showToastMessage,
        openAdmissionsEmailPreview,
        refreshAdmissionsDashboardCounts,
        interviewQueueDate,
        refreshInterviewQueue,
        setInterviewQueueRows,
        matchesInterviewQueueDate: (val: any) => {
            const t = String(val || '');
            return t ? t.startsWith(interviewQueueDate) : false;
        },
        shouldRefreshInterviewQueueForDateChange: (prev: any, next: any) => {
            return (prev && String(prev).startsWith(interviewQueueDate)) || (next && String(next).startsWith(interviewQueueDate));
        }
    });

    const {
        showApplicantScheduleModal, applicantScheduleMode, applicantScheduleData, isSchedulingApplicant, isProcessingBulkApplicantAction, pendingApplicantActionId, selectedApplicants,
        setShowApplicantScheduleModal, setApplicantScheduleMode, setApplicantScheduleData, setSelectedApplicants, closeApplicantScheduleModal,
        handleScheduleInterview, handleBulkScheduleInterviews, handleRescheduleInterview, confirmApplicantSchedule, handleBulkApproveApplicants, handleBulkForwardApplicants, handleBulkMarkApplicantsUnsuccessful, handleApproveApplicant, handleMarkApplicantAbsent, handleRejectApplicant
    } = admissionsHook;

    const handleProfileSubmitBound = (e: any) => handleProfileSubmit(e);

    const handleLogout = async () => {
        await logout();
        navigate('/department/login');
    };

    const handleRefreshData = async () => {
        setIsRefreshingData(true);
        try {
            await refreshAllData();
            await refreshAdmissionsDashboardCounts();
            await refreshInterviewQueue();
            showToastMessage('Department data refreshed.', 'success');
        } catch (error: any) {
            showToastMessage('Failed to refresh department data.', 'error');
        } finally {
            setIsRefreshingData(false);
        }
    };

    const addReason = () => {
        if (!newReason.trim()) return;
        setData((prev: any) => ({
            ...prev,
            settings: { ...prev.settings, referralReasons: [...prev.settings.referralReasons, newReason.trim()] }
        }));
        setNewReason('');
    };

    const deleteReason = (idx: number) => {
        setData((prev: any) => ({
            ...prev,
            settings: { ...prev.settings, referralReasons: prev.settings.referralReasons.filter((_: any, i: number) => i !== idx) }
        }));
    };

    const renderDetailedDescription = (desc: any) => {
        if (!desc) return <p className="text-sm text-gray-500 italic">No description provided.</p>;
        const q1Index = desc.indexOf('[Q1 Description]:');
        if (q1Index === -1) {
            return <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{desc}</p>;
        }
        // Parsing logic simplified for brevity but functional
        return <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{desc}</p>;
    };



    const moduleLoadingFallback = (
        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
            <p className="text-sm font-semibold text-gray-700">Loading report module...</p>
            <p className="mt-1 text-xs text-gray-500">Preparing charts and analytics for this page.</p>
        </div>
    );

    const activeModuleFeatureKey = DEPT_MODULE_FEATURES[activeModule];
    const activeModuleAccessState = activeModuleFeatureKey
        ? getFeatureAccessState(activeModuleFeatureKey)
        : null;
    const showModuleAvailabilityView = Boolean(
        activeModuleAccessState
        && !(activeModuleAccessState.isAllowed && activeModuleAccessState.status === 'enabled')
    );

    if (permissionsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
                    <p className="mt-4 text-sm font-semibold text-slate-700">Loading Department Head access rules...</p>
                </div>
            </div>
        );
    }

    if (permissionsError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">Unable to load department permissions</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{permissionsError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Sidebar Overlay */}
            {isSidebarOpen && <div className="fixed inset-0 bg-transparent z-20 animate-backdrop" onClick={() => setIsSidebarOpen(false)} />}

            {/* Premium Sidebar */}

            <DeptSidebar
                data={data}
                activeModule={activeModule}
                setActiveModule={goToModule}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                handleLogout={handleLogout}
            />


            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Premium Header */}

                <DeptHeader
                    activeModule={activeModule}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleRefreshData={handleRefreshData}
                    isRefreshingData={isRefreshingData}
                    deptNotifications={deptNotifications}
                />


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
                            showCounselingViewModal={showCounselingViewModal}
                            setShowCounselingViewModal={setShowCounselingViewModal}
                            showScheduleModal={showScheduleModal}
                            setShowScheduleModal={setShowScheduleModal}
                            showRejectModal={showRejectModal}
                            setShowRejectModal={setShowRejectModal}
                            scheduleData={scheduleData}
                            setScheduleData={setScheduleData}
                            rejectNotes={rejectNotes}
                            setRejectNotes={setRejectNotes}
                            handleApproveAndSchedule={handleApproveAndSchedule}
                            handleRejectRequest={handleRejectRequest}
                            handleCompleteRequest={handleCompleteRequest}
                            handleStartForward={handleStartForward}
                            isSubmittingCounselingSchedule={isSubmittingCounselingSchedule}
                            isSubmittingCounselingReject={isSubmittingCounselingReject}
                            pendingCounselingCompletionId={pendingCounselingCompletionId}
                        />
                    )}

                    {/* ADMISSIONS SCREENING */}
                    {!showModuleAvailabilityView && activeModule === 'admissions' && (
                        <DeptAdmissionsPage
                            applicants={admissionApplicants}
                            admissionsState={admissionsState}
                            departmentName={data?.profile?.department}
                            handleApproveApplicant={handleApproveApplicant}
                            handleRejectApplicant={handleRejectApplicant}
                            handleMarkApplicantAbsent={handleMarkApplicantAbsent}
                            handleBulkApproveApplicants={handleBulkApproveApplicants}
                            handleBulkForwardApplicants={handleBulkForwardApplicants}
                            handleBulkMarkApplicantsUnsuccessful={handleBulkMarkApplicantsUnsuccessful}
                            handleRescheduleInterview={handleRescheduleInterview}
                            handleScheduleInterview={handleScheduleInterview}
                            handleBulkScheduleInterviews={handleBulkScheduleInterviews}
                            pendingApplicantActionId={pendingApplicantActionId}
                            isSchedulingApplicant={isSchedulingApplicant}
                            isProcessingBulkApplicantAction={isProcessingBulkApplicantAction}
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
                            newReason={newReason}
                            setNewReason={setNewReason}
                            addReason={addReason}
                            deleteReason={deleteReason}
                            authEmail={session?.user?.email || session?.auth_email || data?.profile?.email || ''}
                            requestStaffSecurityOtp={requestStaffSecurityOtp}
                            confirmStaffSecurityEmailChange={confirmStaffSecurityEmailChange}
                            confirmStaffPasswordChange={confirmStaffPasswordChange}
                            updateStaffProfileName={updateStaffProfileName}
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
                            showApproveScheduleModal={showApproveScheduleModal}
                            setShowApproveScheduleModal={setShowApproveScheduleModal}
                            approveScheduleData={approveScheduleData}
                            setApproveScheduleData={setApproveScheduleData}
                            handleSupportApproveAndSchedule={handleSupportApproveAndSchedule}
                            handleRejectSupport={handleRejectSupport}
                            pendingSupportRejectId={pendingSupportRejectId}
                            showResolveModal={showResolveModal}
                            setShowResolveModal={setShowResolveModal}
                            resolveData={resolveData}
                            setResolveData={setResolveData}
                            handleResolveSupport={handleResolveSupport}
                            showReferCareModal={showReferCareModal}
                            setShowReferCareModal={setShowReferCareModal}
                            referCareForm={referCareForm}
                            setReferCareForm={setReferCareForm}
                            handleReferToCare={handleReferToCare}
                            sigCanvasRefSupport={sigCanvasRefSupport}
                            isSubmittingSupportSchedule={isSubmittingSupportSchedule}
                            isSubmittingSupportResolve={isSubmittingSupportResolve}
                            isSubmittingSupportRefer={isSubmittingSupportRefer}
                        />
                    )}

                    {!showModuleAvailabilityView && activeModule === 'events' && (
                        <DeptEventsPage
                            data={data}
                            eventsList={eventsList}
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
                            matchesCascadeFilters={matchesCascadeFilters}
                            getStudentForRequest={getStudentForRequest}
                            cascadeFilterBar={cascadeFilterBar}
                            setSelectedHistoryStudent={setSelectedHistoryStudent}
                            setShowHistoryModal={setShowHistoryModal}
                        />
                    )}
                </div >
            </main >

            {renderDeptModals({
                data,
                counselingRequests,
                showProfileModal, setShowProfileModal, profileForm, setProfileForm, handleProfileSubmit, isUpdatingProfile,
                showReferralModal, setShowReferralModal, forwardingToStaff, setForwardingToStaff,
                referralForm, setReferralForm, handleReferralSubmit, selectedCounselingReq, setSelectedCounselingReq, isSubmittingReferral,
                referralSearchQuery, setReferralSearchQuery, referralStudentOptions, isReferralStudentSearchLoading, selectedReferralStudent, selectReferralStudent, sigCanvasRef,
                showHistoryModal, setShowHistoryModal, selectedHistoryStudent, exportPDF: (name: string) => exportPDF(name, counselingRequests),
                showStudentModal, setShowStudentModal, selectedStudent,
                showEventAttendees, setShowEventAttendees, deptAttendees,
                yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
                deptSectionFilter, setDeptSectionFilter, exportToExcel,
                showApplicantScheduleModal, closeApplicantScheduleModal, applicantScheduleMode, applicantScheduleData, setApplicantScheduleData, confirmApplicantSchedule, isSchedulingApplicant: (isSchedulingApplicant || isLoadingEmailPreview || isConfirmingEmailPreview), selectedApplicants,
                viewFormRecord, setViewFormRecord,
                viewFormMode, setViewFormMode
            })}

            <DeptEmailPreviewModal
                emailPreviewState={emailPreviewState}
                isConfirmingEmailPreview={isConfirmingEmailPreview}
                closeEmailPreviewModal={closeEmailPreviewModal}
                handleConfirmEmailPreview={handleConfirmEmailPreview}
            />

        </div >
    );
}
