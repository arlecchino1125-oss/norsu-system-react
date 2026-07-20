import React from 'react';
import { CustomScrollHandle } from '../../../components/CustomScrollHandle';
import { StudentCommandHub } from '../components/StudentCommandHub';
import { StudentToast } from '../components/StudentToast';
import type { StudentToastState } from '../components/StudentToast';
import { StudentSidebar } from './StudentSidebar';
import { StudentTopbar } from './StudentTopbar';

interface StudentSidebarLink {
    id: string;
    label: string;
    icon: any;
    group: string;
}

interface StudentPortalShellProps {
    profileCompletionGateActive: boolean;
    overlays: React.ReactNode;
    activeView: string;
    activeViewLabel: string;
    viewState: {
        isSidebarOpen: boolean;
        isCompactPortalLayout: boolean;
        isRefreshingView: boolean;
        showCommandHub: boolean;
    };
    visibleSidebarLinks: StudentSidebarLink[];
    Icons: any;
    onCloseSidebar: () => void;
    onSelectView: (viewId: string) => void;
    onLogout: () => void;
    notifications: any[];
    onOpenSidebar: () => void;
    onRefreshCurrentView: () => void;
    mainScrollRef: React.RefObject<HTMLDivElement>;
    scrollClassName: string;
    scrollStyle?: React.CSSProperties;
    children: React.ReactNode;
    setShowCommandHub: React.Dispatch<React.SetStateAction<boolean>>;
    isStudentViewVisible: (viewId: string) => boolean;
    isStudentViewEnabled: (viewId: string) => boolean;
    setActiveView: (viewId: string) => boolean | void;
    openCounselingForm: () => void;
    openSupportForm: () => void;
    toast: StudentToastState;
    onCloseToast: () => void;
}

export function StudentPortalShell({
    profileCompletionGateActive,
    overlays,
    activeView,
    activeViewLabel,
    viewState,
    visibleSidebarLinks,
    Icons,
    onCloseSidebar,
    onSelectView,
    onLogout,
    notifications,
    onOpenSidebar,
    onRefreshCurrentView,
    mainScrollRef,
    scrollClassName,
    scrollStyle,
    children,
    setShowCommandHub,
    isStudentViewVisible,
    isStudentViewEnabled,
    setActiveView,
    openCounselingForm,
    openSupportForm,
    toast,
    onCloseToast
}: StudentPortalShellProps) {
    const { isSidebarOpen, isCompactPortalLayout, isRefreshingView, showCommandHub } = viewState;
    return (
        <div className={`student-portal-shell flex h-[100dvh] min-h-[100dvh] bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-gray-800 font-sans overflow-hidden relative ${profileCompletionGateActive ? 'pointer-events-none select-none' : ''}`}>
            {overlays}

            <StudentSidebar
                isOpen={isSidebarOpen}
                activeView={activeView}
                visibleSidebarLinks={visibleSidebarLinks}
                Icons={Icons}
                onClose={onCloseSidebar}
                onSelectView={onSelectView}
                onLogout={onLogout}
            />

            <main className="student-portal-main flex-1 flex flex-col h-full overflow-hidden">
                <StudentTopbar
                    activeViewLabel={activeViewLabel}
                    isCompactPortalLayout={isCompactPortalLayout}
                    notifications={notifications}
                    isRefreshingView={isRefreshingView}
                    onOpenSidebar={onOpenSidebar}
                    onRefreshCurrentView={onRefreshCurrentView}
                />

                <div
                    ref={mainScrollRef}
                    className={scrollClassName}
                    style={scrollStyle}
                >
                    {children}
                </div>

                <CustomScrollHandle scrollRef={mainScrollRef} />

                <StudentCommandHub
                    showCommandHub={showCommandHub}
                    setShowCommandHub={setShowCommandHub}
                    isCompactPortalLayout={isCompactPortalLayout}
                    isStudentViewVisible={isStudentViewVisible}
                    isStudentViewEnabled={isStudentViewEnabled}
                    setActiveView={setActiveView}
                    openCounselingForm={openCounselingForm}
                    openSupportForm={openSupportForm}
                    Icons={Icons}
                />
            </main>

            <StudentToast toast={toast} onClose={onCloseToast} />
        </div>
    );
}
