import { useState, useCallback, useEffect } from 'react';
import { DeptSidebar, deptAccentKey } from './dept/components/DeptSidebar';
import { DeptHeader } from './dept/components/DeptHeader';
import { DeptModulePages } from './dept/components/DeptModulePages';
import { useDeptEmails } from './dept/hooks/useDeptEmails';
import { useDeptAdmissions } from './dept/features/admissions/hooks/useDeptAdmissions';
import { useDeptCounseling } from './dept/features/counseling/hooks/useDeptCounseling';
import { useDeptSupport } from './dept/features/support/hooks/useDeptSupport';
import { useDeptAccount } from './dept/hooks/useDeptAccount';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { usePortalTabRoute } from '../hooks/usePortalTabRoute';
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
import { exportPDF, exportToExcel } from '../utils/dashboardUtils';
import { renderDeptModals } from './dept/modals/DeptModals';
import { DeptEmailPreviewModal } from './dept/components/DeptEmailPreviewModal';

const DEPT_BASE_PATH = '/department/dashboard';
const DEPT_MODULES = Object.keys(moduleLabels);

const PermissionsLoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500" />
            <p className="mt-4 text-sm font-semibold text-slate-700">Loading Department Head access rules...</p>
        </div>
    </div>
);

const PermissionsErrorScreen = ({ message }: any) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
            <h1 className="text-2xl font-bold text-slate-900">Unable to load department permissions</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
            <button type="button"
                onClick={() => window.location.reload()}
                className="mt-6 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
                Reload
            </button>
        </div>
    </div>
);

export default function DeptDashboard() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth() as any;
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState
    } = usePermissions();
    const { activeTab: activeModule, goToTab: goToModule } = usePortalTabRoute({
        basePath: DEPT_BASE_PATH,
        tabs: DEPT_MODULES,
        defaultTab: 'dashboard',
    });
    const {
        data, setData, dashboardStats, todayCounselingSessions, eventsList, deptAttendanceEvents, deptAttendanceCounts, isLoadingDeptAttendanceEvents, counselingRequests, setCounselingRequests,
        supportRequests, setSupportRequests, admissionApplicants,
        refreshAllData, showToastMessage,
        admissionsState,
        counselingState,
        supportState,
        studentsState
    } = useDeptData(session, isAuthenticated);
    const [isRefreshingData, setIsRefreshingData] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [deptNotifications] = useState<any[]>([]);

    // Ctrl+\ toggles the desktop collapse rail (matches CARE Staff portal)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === '\\') {
                e.preventDefault();
                setSidebarCollapsed((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const account = useDeptAccount({ session, data, setData, showToastMessage });
    const {
        showProfileModal, setShowProfileModal, profileForm, setProfileForm,
        handleProfileSubmit, isUpdatingProfile
    } = account;

    const {
        emailPreviewState, isLoadingEmailPreview, isConfirmingEmailPreview,
        openAdmissionsEmailPreview, handleConfirmEmailPreview, closeEmailPreviewModal
    } = useDeptEmails(showToastMessage);

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

    const filters = useDeptFilters(data, filteredData);
    const {
        yearLevelFilter, setYearLevelFilter, deptCourseFilter, setDeptCourseFilter,
        deptSectionFilter, setDeptSectionFilter
    } = filters;

    const {
        showEventAttendees, setShowEventAttendees, deptAttendees, handleViewDeptAttendees
    } = useDeptEventAttendees({ data, showToastMessage, setYearLevelFilter, setDeptCourseFilter, setDeptSectionFilter });

    const admissionsDashboard = useDeptAdmissionsDashboard(data);
    const {
        interviewQueueDate, setInterviewQueueRows,
        refreshInterviewQueue, refreshAdmissionsDashboardCounts, admissionsDashboardCounts
    } = admissionsDashboard;

    const departmentAlertItems = buildDepartmentAlertItems({
        admissionsReadyCount: admissionsDashboardCounts.readyForInterview,
        admissionsAbsentCount: admissionsDashboardCounts.absent,
        counselingAwaitingCount: dashboardStats?.counseling?.awaiting ?? 0,
        supportForwardedCount: dashboardStats?.supportForwarded ?? 0
    });

    const patchCounselingRows = useCallback((updater: (rows: any[]) => any[]) => {
        setCounselingRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setCounselingRequests]);

    const patchSupportRows = useCallback((updater: (rows: any[]) => any[]) => {
        setSupportRequests((prev: any[]) => updater(Array.isArray(prev) ? prev : []));
    }, [setSupportRequests]);

    const counseling = useDeptCounseling({
        data,
        filteredData,
        counselingState,
        showToastMessage,
        updateGlobalRows: patchCounselingRows
    });
    const {
        selectedCounselingReq, setSelectedCounselingReq, forwardingToStaff, setForwardingToStaff,
        showReferralModal, setShowReferralModal, referralForm, setReferralForm, handleReferralSubmit,
        isSubmittingReferral, referralSearchQuery, setReferralSearchQuery, referralStudentOptions,
        isReferralStudentSearchLoading, selectedReferralStudent, selectReferralStudent, sigCanvasRef
    } = counseling;

    const support = useDeptSupport({
        data,
        supportState,
        showToastMessage,
        updateGlobalRows: patchSupportRows
    });

    const admissions = useDeptAdmissions({
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
        showApplicantScheduleModal, closeApplicantScheduleModal, applicantScheduleMode,
        applicantScheduleData, setApplicantScheduleData, confirmApplicantSchedule,
        isSchedulingApplicant, selectedApplicants
    } = admissions;

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
        const reason = newReason.trim();
        if (!reason) return;
        setData((prev: any) => ({
            ...prev,
            settings: {
                ...prev.settings,
                referralReasons: prev.settings.referralReasons.includes(reason)
                    ? prev.settings.referralReasons
                    : [...prev.settings.referralReasons, reason]
            }
        }));
        setNewReason('');
    };

    const deleteReason = (idx: number) => {
        setData((prev: any) => ({
            ...prev,
            settings: { ...prev.settings, referralReasons: prev.settings.referralReasons.filter((_: any, i: number) => i !== idx) }
        }));
    };

    const activeModuleFeatureKey = DEPT_MODULE_FEATURES[activeModule];
    const activeModuleAccessState = activeModuleFeatureKey
        ? getFeatureAccessState(activeModuleFeatureKey)
        : null;
    const showModuleAvailabilityView = Boolean(
        activeModuleAccessState
        && !(activeModuleAccessState.isAllowed && activeModuleAccessState.status === 'enabled')
    );

    if (permissionsLoading) {
        return <PermissionsLoadingScreen />;
    }

    if (permissionsError) {
        return <PermissionsErrorScreen message={permissionsError} />;
    }

    return (
        <div data-dept-accent={deptAccentKey(data?.profile?.department)} className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-gray-800 font-sans overflow-hidden">
            {/* Mobile sidebar overlay */}
            {isSidebarOpen && <button type="button" aria-label="Close department navigation" className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400" onClick={() => setIsSidebarOpen(false)} />}

            {/* Sidebar — persistent on desktop, overlay on mobile */}
            <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-out lg:relative lg:translate-x-0 lg:h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                <DeptSidebar
                    data={data}
                    activeModule={activeModule}
                    setActiveModule={goToModule}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleLogout={handleLogout}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
                />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <DeptHeader
                    activeModule={activeModule}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleRefreshData={handleRefreshData}
                    isRefreshingData={isRefreshingData}
                    deptNotifications={deptNotifications}
                />

                <DeptModulePages
                    activeModule={activeModule}
                    goToModule={goToModule}
                    showModuleAvailabilityView={showModuleAvailabilityView}
                    activeModuleAccessState={activeModuleAccessState}
                    data={data}
                    setData={setData}
                    filteredData={filteredData}
                    chartData={chartData}
                    dashboardStats={dashboardStats}
                    todayCounselingSessions={todayCounselingSessions}
                    counselingRequests={counselingRequests}
                    supportRequests={supportRequests}
                    admissionApplicants={admissionApplicants}
                    eventsList={eventsList}
                    deptAttendanceEvents={deptAttendanceEvents}
                    deptAttendanceCounts={deptAttendanceCounts}
                    isLoadingDeptAttendanceEvents={isLoadingDeptAttendanceEvents}
                    admissionsState={admissionsState}
                    studentsState={studentsState}
                    departmentAlertItems={departmentAlertItems}
                    showToastMessage={showToastMessage}
                    authEmail={session?.user?.email || session?.auth_email || data?.profile?.email || ''}
                    filters={filters}
                    counseling={counseling}
                    support={support}
                    admissions={admissions}
                    account={account}
                    admissionsDashboard={admissionsDashboard}
                    settingsReasons={{ newReason, setNewReason, addReason, deleteReason }}
                    handleViewDeptAttendees={handleViewDeptAttendees}
                    studentModals={{ setSelectedStudent, setShowStudentModal, setSelectedHistoryStudent, setShowHistoryModal }}
                />
            </main>

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
