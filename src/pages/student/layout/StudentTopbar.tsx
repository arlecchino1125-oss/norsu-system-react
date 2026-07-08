import NotificationBell from '../../../components/NotificationBell';
import { Menu, RefreshCw } from 'lucide-react';

interface StudentTopbarProps {
    activeViewLabel: string;
    isCompactPortalLayout: boolean;
    notifications: any[];
    isRefreshingView: boolean;
    onOpenSidebar: () => void;
    onRefreshCurrentView: () => void;
}

export function StudentTopbar({
    isCompactPortalLayout,
    notifications,
    isRefreshingView,
    onOpenSidebar,
    onRefreshCurrentView
}: StudentTopbarProps) {
    return (
        <header className={`student-portal-header relative z-10 flex h-14 items-center justify-between border-b border-slate-200/80 px-4 shadow-sm shadow-slate-200/70 sm:h-16 sm:px-6 lg:px-10 ${isCompactPortalLayout ? 'bg-white' : 'bg-white/95 backdrop-blur-xl'}`}>
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <button
                    type="button"
                    aria-label="Open student navigation"
                    onClick={onOpenSidebar}
                    className="student-portal-menu-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm shadow-slate-200/70 transition-all hover:border-blue-200 hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <div className="student-portal-title min-w-0">
                    <p className="truncate text-sm font-black uppercase leading-tight tracking-[0.18em] text-blue-600 sm:text-base sm:tracking-[0.22em]">NORSU-G CARE</p>
                </div>
            </div>
            <div className="student-portal-header-actions flex shrink-0 items-center gap-2 sm:gap-3">
                <img src="/carecenter.png" alt="NORSU-G CARE" className="hidden h-10 w-10 rounded-full border border-blue-100 bg-white object-cover shadow-sm md:block" />
                <button
                    type="button"
                    onClick={onRefreshCurrentView}
                    disabled={isRefreshingView}
                    aria-label={isRefreshingView ? 'Refreshing view' : 'Refresh view'}
                    title={isRefreshingView ? 'Refreshing view' : 'Refresh view'}
                    className="student-portal-header-action inline-flex h-10 w-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-200/70 transition-all hover:border-blue-200 hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-3 sm:text-sm"
                >
                    <RefreshCw className={`h-4 w-4 ${isRefreshingView ? 'animate-spin' : ''}`} />
                    <span className="hidden font-black sm:inline">{isRefreshingView ? 'Refreshing...' : 'Refresh View'}</span>
                </button>
                <div className="student-portal-notification">
                    <NotificationBell
                        notifications={notifications}
                        accentColor="blue"
                        className="student-dashboard-notification"
                        profileUpdateDisplay="student"
                    />
                </div>
            </div>
        </header>
    );
}
