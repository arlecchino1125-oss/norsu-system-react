import React from 'react';
import { LayoutDashboard, Users, UserCheck, CalendarDays, ClipboardList, BookOpen, AlertCircle, FileText, Settings, FileSpreadsheet, XCircle, LogOut } from 'lucide-react';
import NorsuBrand from '../../../components/NorsuBrand';

const serviceNavItems = [
    { id: 'admissions', icon: <UserCheck size={18} />, label: 'Admissions Screening', hasIndicator: true },
    { id: 'interview_queue', icon: <ClipboardList size={18} />, label: 'Interview Queue' },
    { id: 'counseling_queue', icon: <Users size={18} />, label: 'Counseling & Referrals' },
    { id: 'support_approvals', icon: <AlertCircle size={18} />, label: 'Additional Support', hasIndicator: true }
];

const managementNavItems = [
    { id: 'students', icon: <BookOpen size={18} />, label: 'Students Directory' },
    { id: 'counseled', icon: <Users size={18} />, label: 'Counseled Students' },
    { id: 'events', icon: <CalendarDays size={18} />, label: 'College Events' }
];

const systemNavItems = [
    { id: 'reports', icon: <FileText size={18} />, label: 'Reports' },
    { id: 'export_center', icon: <FileSpreadsheet size={18} />, label: 'Export Center' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Settings' }
];

export function DeptSidebar({
    data,
    activeModule,
    setActiveModule,
    isSidebarOpen,
    setIsSidebarOpen,
    handleLogout
}: any) {
    return (
        <aside className={`fixed inset-y-0 left-0 z-30 w-72 max-w-[calc(100vw-1rem)] bg-gradient-dept-sidebar transform transition-all duration-500 ease-out flex flex-col ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-emerald-900/30' : '-translate-x-full'}`}>
            {/* Logo Area */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="relative min-w-0 flex-1 group">
                        <button type="button" aria-label="Open profile and settings" onClick={() => setActiveModule('settings')} className="absolute inset-0 z-10 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300" />
                        <div className="pointer-events-none">
                            <NorsuBrand title={data?.profile?.name || 'Department'} subtitle={data?.profile?.department || 'Unassigned'} accent="emerald" size="sm" className="min-w-0" />
                            <p className="mt-2 pl-[4.4rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50 transition-colors group-hover:text-emerald-100/80">Open Profile & Settings</p>
                        </div>
                    </div>
                    <button type="button" onClick={() => setIsSidebarOpen(false)} className="text-emerald-300/60 hover:text-white transition-colors"><XCircle size={20} /></button>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {[
                    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Home' },
                ].map((item: any) => (
                    <button type="button" key={item.id} onClick={() => { setActiveModule(item.id); setIsSidebarOpen(false); }} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                        {item.icon} {item.label}
                    </button>
                ))}

                <div className="pt-5 mt-4 border-t border-white/5">
                    <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Services</p>
                    {serviceNavItems.map((item: any) => (
                        <button type="button" key={item.id} onClick={() => { setActiveModule(item.id); setIsSidebarOpen(false); }} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                            {item.hasIndicator && <span className="ml-auto w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                        </button>
                    ))}
                </div>

                <div className="pt-5 mt-4 border-t border-white/5">
                    <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">Management</p>
                    {managementNavItems.map((item: any) => (
                        <button type="button" key={item.id} onClick={() => { setActiveModule(item.id); setIsSidebarOpen(false); }} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                            {item.hasIndicator && <span className="ml-auto w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                        </button>
                    ))}
                </div>

                <div className="pt-5 mt-4 border-t border-white/5">
                    <p className="px-4 text-[10px] font-bold text-emerald-400/50 uppercase tracking-[0.15em] mb-3">System</p>
                    {systemNavItems.map((item: any) => (
                        <button type="button" key={item.id} onClick={() => { setActiveModule(item.id); setIsSidebarOpen(false); }} className={`nav-item nav-item-dept w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${activeModule === item.id ? 'nav-item-active text-emerald-300' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} {item.label}
                        </button>
                    ))}
                </div>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-white/5">
                <button type="button" onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all">
                    <LogOut size={18} /> Logout
                </button>
            </div>
        </aside>
    );
}
