import type { Dispatch, SetStateAction } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export type ToastHandler = (msg: string, type?: ToastType) => void;

export interface CareStaffDashboardFunctions {
    showToast: ToastHandler;
    showToastMessage: ToastHandler;
    logAudit: (action: string, details: unknown) => Promise<void>;
    handleGetStarted: () => void;
    handleDocs: () => void;
    handleLaunchModule: (module: string) => void;
    handleOpenAnalytics: () => void;
    handleStatClick: (stat: string) => void;
    handleResetSystem: () => void;
    setShowResetModal: Dispatch<SetStateAction<boolean>>;
    handleViewAllActivity: () => void;
    handleQuickAction: (action: string) => void;
    handleViewProfile?: (studentId: string) => void;
}
