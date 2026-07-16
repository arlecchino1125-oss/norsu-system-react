import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import NotificationBell from '../../../components/NotificationBell';
import { moduleLabels } from '../utils';

export function DeptHeader({
    activeModule,
    setIsSidebarOpen,
    handleRefreshData,
    isRefreshingData,
    deptNotifications
}: any) {
    return (
        <header className="h-16 glass gradient-border-green flex items-center justify-between px-6 lg:px-10 relative z-10">
            <div className="flex items-center gap-4">
                <button type="button" onClick={() => setIsSidebarOpen(true)} className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Menu /></button>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-500/70">NORSU-G CARE</p>
                    <h2 className="text-xl font-bold gradient-text-green capitalize">{moduleLabels[activeModule] || activeModule}</h2>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <img src="/carecenter.png" alt="NORSU-G CARE" className="hidden h-10 w-10 rounded-full border border-emerald-100 bg-white object-cover shadow-sm md:block" />
                <button type="button"
                    onClick={handleRefreshData}
                    disabled={isRefreshingData}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/80 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-emerald-600 hover:shadow-md transition-all border border-gray-100 disabled:opacity-50"
                >
                    <RefreshCw size={18} className={isRefreshingData ? 'animate-spin' : ''} />
                    <span>{isRefreshingData ? 'Refreshing...' : 'Refresh Data'}</span>
                </button>
                <NotificationBell notifications={deptNotifications} accentColor="emerald" />
            </div>
        </header>
    );
}
