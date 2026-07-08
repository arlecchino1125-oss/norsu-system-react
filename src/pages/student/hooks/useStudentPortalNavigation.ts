import { startTransition, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { getPermissionNotice, type ResolvedPermissionState } from '../../../types/permissions';
import { STUDENT_VIEW_FEATURE_MAP, STUDENT_VIEW_LABELS } from '../StudentPortalRoutes';

type StudentNavigationOptions = {
    setActiveView: Dispatch<SetStateAction<string>>;
    getFeatureAccessState: (featureKey: string) => ResolvedPermissionState;
    isFeatureVisible: (featureKey: string) => boolean;
    showToast: (message: string, type?: string) => void;
};

type StudentNavigationGuardOptions = {
    suppressToast?: boolean;
};

const enabledStudentViewAccessState: ResolvedPermissionState = {
    isAllowed: true,
    status: 'enabled',
    noticeText: null,
    description: null
};

export function useStudentPortalNavigation({
    setActiveView,
    getFeatureAccessState,
    isFeatureVisible,
    showToast
}: StudentNavigationOptions) {
    const getStudentViewAccessState = useCallback((viewId: string) => {
        if (viewId === 'dashboard') {
            return enabledStudentViewAccessState;
        }

        const permissionKey = STUDENT_VIEW_FEATURE_MAP[viewId];
        if (!permissionKey) {
            return enabledStudentViewAccessState;
        }

        return getFeatureAccessState(permissionKey);
    }, [getFeatureAccessState]);

    const isStudentViewEnabled = useCallback((viewId: string) => {
        const accessState = getStudentViewAccessState(viewId);
        return accessState.isAllowed && accessState.status === 'enabled';
    }, [getStudentViewAccessState]);

    const isStudentViewVisible = useCallback((viewId: string) => {
        if (viewId === 'dashboard') return true;

        const permissionKey = STUDENT_VIEW_FEATURE_MAP[viewId];
        if (!permissionKey) return true;
        return isFeatureVisible(permissionKey);
    }, [isFeatureVisible]);

    const requireStudentViewVisibility = useCallback((
        viewId: string,
        deniedMessage?: string,
        options?: StudentNavigationGuardOptions
    ) => {
        if (isStudentViewVisible(viewId)) {
            return true;
        }

        if (!options?.suppressToast) {
            showToast(
                deniedMessage || `${STUDENT_VIEW_LABELS[viewId] || viewId} is currently hidden from the student portal.`,
                'error'
            );
        }

        return false;
    }, [isStudentViewVisible, showToast]);

    const requireStudentFeatureAccess = useCallback((
        viewId: string,
        deniedMessage?: string,
        options?: StudentNavigationGuardOptions
    ) => {
        const accessState = getStudentViewAccessState(viewId);
        if (accessState.isAllowed && accessState.status === 'enabled') {
            return true;
        }

        if (!options?.suppressToast) {
            showToast(
                deniedMessage || getPermissionNotice(accessState, STUDENT_VIEW_LABELS[viewId] || String(STUDENT_VIEW_FEATURE_MAP[viewId] || viewId)),
                'error'
            );
        }

        return false;
    }, [getStudentViewAccessState, showToast]);

    const transitionToView = useCallback((nextView: string, options?: StudentNavigationGuardOptions) => {
        if (!requireStudentViewVisibility(nextView, undefined, options)) {
            return false;
        }

        startTransition(() => {
            setActiveView(nextView);
        });
        return true;
    }, [requireStudentViewVisibility, setActiveView]);

    return {
        getStudentViewAccessState,
        isStudentViewEnabled,
        isStudentViewVisible,
        requireStudentFeatureAccess,
        transitionToView
    };
}
