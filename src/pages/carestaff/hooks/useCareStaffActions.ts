import { useCallback, useMemo } from 'react';
import { recordStaffAuditAction } from '../../../lib/staffAudit';
import type { ActiveTab, AuthSession, CareStaffDashboardFunctions, ToastHandler } from '../types';
import { MODULE_TAB_MAP, QUICK_ACTION_TAB_MAP, STAT_TAB_MAP } from '../utils';

export function useCareStaffActions({
    session,
    showToastMessage,
    setActiveTab,
    setPendingProfileId
}: {
    session?: AuthSession | null;
    showToastMessage: ToastHandler;
    setActiveTab: (tab: ActiveTab) => void;
    setPendingProfileId: (id: string | null) => void;
}) {
    const logAudit = useCallback(async (action: string, details: unknown) => {
        try {
            await recordStaffAuditAction(session, { action, details });
        } catch (err: unknown) {
            console.error('Audit log error:', err);
        }
    }, [session]);

    const functions = useMemo<CareStaffDashboardFunctions>(() => ({
        showToast: showToastMessage,
        showToastMessage,
        logAudit,
        handleGetStarted: () => setActiveTab('dashboard'),
        handleDocs: () => window.open('https://norsu.edu.ph', '_blank'),
        handleLaunchModule: (module: string) => {
            const tab = MODULE_TAB_MAP[module];
            if (tab) {
                setActiveTab(tab);
            }
        },
        handleOpenAnalytics: () => setActiveTab('analytics'),

        handleStatClick: (stat: string) => {
            const tab = STAT_TAB_MAP[stat];
            if (tab) {
                setActiveTab(tab);
            }
        },
        handleViewAllActivity: () => setActiveTab('audit'),
        handleQuickAction: (action: string) => {
            const tab = QUICK_ACTION_TAB_MAP[action];
            if (tab) {
                setActiveTab(tab);
            }
        },
        handleViewProfile: (studentId: string) => {
            setPendingProfileId(studentId);
            setActiveTab('population');
        }
    }), [logAudit, showToastMessage, setActiveTab, setPendingProfileId]);

    return { functions, logAudit };
}
