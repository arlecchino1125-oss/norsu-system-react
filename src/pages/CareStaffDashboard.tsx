import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/useAuth';
import { CARE_STAFF_NOTES_STORAGE_KEY, migrateLegacyStorageKey } from '../lib/storageKeys';
import { usePortalTabRoute } from '../hooks/usePortalTabRoute';
import { useToast } from '../components/ui/toast/useToast';
import { usePermissions } from '../hooks/usePermissions';
import FeatureAvailabilityView from '../components/permissions/FeatureAvailabilityView';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import CareStaffHomePage from './carestaff/features/home/components/CareStaffHomePage';
import { renderCareStaffModals } from './carestaff/modals/CareStaffModals';
import StaffPortalLayout from '../components/layout/StaffPortalLayout';
import { useCareStaffAccountSecurity } from './carestaff/hooks/useCareStaffAccountSecurity';
import { useCareStaffActions } from './carestaff/hooks/useCareStaffActions';
import { useCareStaffData } from './carestaff/hooks/useCareStaffData';
import { useCareStaffGovernance } from './carestaff/hooks/useCareStaffGovernance';
import { useCareStaffNavigation } from './carestaff/hooks/useCareStaffNavigation';
import type {
    ActiveTab,
    AuthSession,
    CommandHubTab,
    StaffNote,
    ToastHandler
} from './carestaff/types';
import { CARE_STAFF_REFRESHABLE_TABS, CARE_STAFF_TAB_FEATURES, HEADER_TITLES } from './carestaff/utils';
import { ACTIVE_TABS } from './carestaff/types';

const CARE_STAFF_BASE_PATH = '/care-staff/dashboard';

// Each tab is its own chunk; Home stays eager as the landing tab.
const CareStaffAnalyticsPage = lazy(() => import('./carestaff/features/analytics/components/CareStaffAnalyticsPage'));
const CareStaffAuditLogsPage = lazy(() => import('./carestaff/features/audit/components/CareStaffAuditLogsPage'));
const CareStaffDashboardView = lazy(() => import('./carestaff/features/dashboard/components/CareStaffDashboardView'));
const CareStaffCounselingPage = lazy(() => import('./carestaff/features/counseling/components/CareStaffCounselingPage'));
const CareStaffEventsPage = lazy(() => import('./carestaff/features/events/components/CareStaffEventsPage'));
const CareStaffFeedbackPage = lazy(() => import('./carestaff/features/feedback/components/CareStaffFeedbackPage'));
const CareStaffFormsPage = lazy(() => import('./carestaff/features/forms/components/CareStaffFormsPage'));
const CareStaffPeerFacilitatorsPage = lazy(() => import('./carestaff/features/peerfacilitators/components/CareStaffPeerFacilitatorsPage'));
const CareStaffNatPage = lazy(() => import('./carestaff/features/nat/components/CareStaffNatPage'));
const CareStaffLogbookPage = lazy(() => import('./carestaff/features/logbook/components/CareStaffLogbookPage'));
const CareStaffScholarshipPage = lazy(() => import('./carestaff/features/scholarship/components/CareStaffScholarshipPage'));
const CareStaffPopulationPage = lazy(() => import('./carestaff/features/population/components/CareStaffPopulationPage'));
const CareStaffSettingsPage = lazy(() => import('./carestaff/features/settings/components/CareStaffSettingsPage'));
const CareStaffSupportPage = lazy(() => import('./carestaff/features/support/components/CareStaffSupportPage'));
const StaffCalendarPage = lazy(() => import('./shared/StaffCalendarPage'));
const StaffExportCenterPage = lazy(() => import('./shared/StaffExportCenterPage'));

const CareStaffDashboard = () => {
    const navigate = useNavigate();
    const { session, isAuthenticated, updateSession, logout } = useAuth() as {
        session?: AuthSession | null;
        isAuthenticated: boolean;
        updateSession?: (updates: any) => void;
        logout: () => Promise<void>;
    };
    const {
        loading: permissionsLoading,
        error: permissionsError,
        getFeatureAccessState,
        isFeatureVisible
    } = usePermissions();
    const { activeTab, goToTab } = usePortalTabRoute<ActiveTab>({
        basePath: CARE_STAFF_BASE_PATH,
        tabs: ACTIVE_TABS,
        defaultTab: 'home',
    });
    const [pendingProfileId, setPendingProfileId] = useState<string | null>(null);

    // Command Hub (FAB Panel)
    const [showCommandHub, setShowCommandHub] = useState<boolean>(false);
    const [commandHubTab, setCommandHubTab] = useState<CommandHubTab>('actions');
    const [staffNotes, setStaffNotes] = useState<StaffNote[]>(() => {
        try {
            migrateLegacyStorageKey('care_staff_notes', CARE_STAFF_NOTES_STORAGE_KEY);
            const parsed = JSON.parse(localStorage.getItem(CARE_STAFF_NOTES_STORAGE_KEY) || '[]');
            return Array.isArray(parsed) ? (parsed as StaffNote[]) : [];
        } catch {
            return [];
        }
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [viewRefreshSignal, setViewRefreshSignal] = useState(0);

    // Session guard - redirect to login if no session
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/care-staff');
        }
    }, [isAuthenticated, navigate]);

    const { showToast: pushSharedToast } = useToast();
    const showToastMessage = useCallback<ToastHandler>((msg, type = 'success') => {
        pushSharedToast(msg, type);
    }, [pushSharedToast]);

    const bumpViewRefreshSignal = useCallback(() => {
        setViewRefreshSignal((current) => current + 1);
    }, []);

    const {
        requestStaffSecurityOtp,
        confirmStaffSecurityEmailChange,
        confirmStaffPasswordChange,
        updateStaffProfileName
    } = useCareStaffAccountSecurity({ session, updateSession });

    const {
        studentActivationPolicy,
        isLoadingStudentActivationPolicy,
        isSavingStudentActivationPolicy,
        loadStudentActivationPolicy,
        toggleStudentActivationPolicy
    } = useCareStaffGovernance({ session, showToastMessage });

    useEffect(() => {
        if (activeTab === 'settings') {
            void loadStudentActivationPolicy();
        }
    }, [activeTab, loadStudentActivationPolicy]);

    const {
        notifications,
        notificationsLoading,
        handleOpenNotifications
    } = useCareStaffData(showToastMessage);

    const { functions } = useCareStaffActions({
        session,
        showToastMessage,
        setActiveTab: goToTab,
        setPendingProfileId
    });

    const { layoutNavSections } = useCareStaffNavigation({
        setActiveTab: goToTab,
        isFeatureVisible,
        setShowCommandHub
    });

    const refreshAll = useCallback(async () => {
        setIsRefreshing(true);
        try {
            if (!CARE_STAFF_REFRESHABLE_TABS.has(activeTab)) {
                showToastMessage('This view has no live data to refresh.', 'info');
                return;
            }
            setViewRefreshSignal((current) => current + 1);
        } catch (error) {
            console.error('Failed to refresh care staff dashboard view:', error);
            showToastMessage('Failed to refresh the current view.', 'error');
        } finally {
            setIsRefreshing(false);
        }
    }, [activeTab, showToastMessage]);

    const setActiveTabFromString = useCallback((tab: string) => {
        goToTab(tab as ActiveTab);
    }, [goToTab]);

    const tabLoadingFallback = (
        <div className="space-y-6">
            <LoadingSkeleton type="stats" count={4} />
            <LoadingSkeleton type="table" count={6} />
        </div>
    );

    const renderActiveTab = (): React.ReactNode => {
        const featureKey = CARE_STAFF_TAB_FEATURES[activeTab];
        if (featureKey) {
            const accessState = getFeatureAccessState(featureKey);
            if (!(accessState.isAllowed && accessState.status === 'enabled')) {
                return (
                    <FeatureAvailabilityView
                        title={HEADER_TITLES[activeTab] || activeTab}
                        permission={accessState}
                        description="This section is currently unavailable in the CARE Staff portal. Please check back later or coordinate with your administrator if you need urgent access."
                        accent="purple"
                    />
                );
            }
        }

        switch (activeTab) {
            case 'home':
                return <CareStaffHomePage functions={functions} />;
            case 'population':
                return <CareStaffPopulationPage functions={functions} pendingProfileId={pendingProfileId} onProfileOpened={() => setPendingProfileId(null)} refreshSignal={viewRefreshSignal} />;
            case 'dashboard':
                return <CareStaffDashboardView setActiveTab={setActiveTabFromString} refreshSignal={viewRefreshSignal} />;
            case 'analytics':
                return <CareStaffAnalyticsPage functions={functions} />;
            case 'nat':
                return <CareStaffNatPage showToast={showToastMessage} />;
            case 'counseling':
                return <CareStaffCounselingPage functions={functions} refreshSignal={viewRefreshSignal} />;
            case 'support':
                return <CareStaffSupportPage functions={functions} refreshSignal={viewRefreshSignal} />;
            case 'events':
                return <CareStaffEventsPage functions={functions} />;
            case 'calendar':
                return <StaffCalendarPage scope="care" accent="purple" />;
            case 'export_center':
                return <StaffExportCenterPage scope="care" accent="purple" showToast={showToastMessage} />;
            case 'scholarship':
                return <CareStaffScholarshipPage functions={functions} />;
            case 'forms':
                return <CareStaffFormsPage functions={functions} refreshSignal={viewRefreshSignal} />;
            case 'peer_facilitators':
                return <CareStaffPeerFacilitatorsPage functions={functions} refreshSignal={viewRefreshSignal} />;
            case 'feedback':
                return <CareStaffFeedbackPage functions={functions} />;
            case 'settings':
                return (
                    <CareStaffSettingsPage
                        session={session}
                        showToastMessage={showToastMessage}
                        requestStaffSecurityOtp={requestStaffSecurityOtp}
                        confirmStaffSecurityEmailChange={confirmStaffSecurityEmailChange}
                        confirmStaffPasswordChange={confirmStaffPasswordChange}
                        updateStaffProfileName={updateStaffProfileName}
                        studentActivationPolicy={studentActivationPolicy}
                        isLoadingStudentActivationPolicy={isLoadingStudentActivationPolicy}
                        isSavingStudentActivationPolicy={isSavingStudentActivationPolicy}
                        toggleStudentActivationPolicy={toggleStudentActivationPolicy}
                    />
                );
            case 'audit':
                return <CareStaffAuditLogsPage refreshSignal={viewRefreshSignal} />;
            case 'logbook':
                return <CareStaffLogbookPage functions={functions} />;
            default:
                return null;
        }
    };

    const headerTitle = HEADER_TITLES[activeTab] || activeTab;

    if (permissionsLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-xl rounded-3xl border border-purple-100 bg-white p-8 text-center shadow-xl">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-purple-200 border-t-purple-500" />
                    <p className="mt-4 text-sm font-semibold text-slate-700">Loading CARE Staff access rules...</p>
                </div>
            </div>
        );
    }

    if (permissionsError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
                <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
                    <h1 className="text-2xl font-bold text-slate-900">Unable to load CARE Staff permissions</h1>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{permissionsError}</p>
                    <button type="button"
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
        <StaffPortalLayout
            sidebarSections={layoutNavSections}
            activeTab={activeTab}
            onTabChange={(tab) => goToTab(tab as ActiveTab)}
            onLogout={async () => { await logout(); navigate('/care-staff'); }}
            onOpenSettings={() => goToTab('settings')}
            headerTitle={headerTitle}
            portalLabel="NORSU-G CARE"
            accent="purple"
            onRefresh={refreshAll}
            isRefreshing={isRefreshing}
            refreshLabel="Refresh View"
            notifications={notifications}
            notificationsLoading={notificationsLoading}
            onOpenNotifications={handleOpenNotifications}
        >
            <Suspense fallback={tabLoadingFallback}>
                {renderActiveTab()}
            </Suspense>

            {renderCareStaffModals({
                showCommandHub, setShowCommandHub, commandHubTab, setCommandHubTab, staffNotes, setStaffNotes,
                setActiveTab: goToTab,
            })}
        </StaffPortalLayout>
    );
};

export default CareStaffDashboard;
