import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LayoutDashboard, LogOut, Menu, Users, Download, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { usePermissions } from '../../hooks/usePermissions';
import NorsuBrand from '../../components/NorsuBrand';

const RegistrarStudentPopulationPage = lazy(() => import('./RegistrarStudentPopulationPage'));

type ActiveTab = 'dashboard' | 'population';

export default function RegistrarPortal() {
    const navigate = useNavigate();
    const { session, isAuthenticated, logout } = useAuth();
    const { loading: permissionsLoading } = usePermissions();

    const [activeTab, setActiveTab] = useState<ActiveTab>('population');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/registrar/login');
        }
    }, [isAuthenticated, navigate]);

    if (permissionsLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'population':
            case 'dashboard':
            default:
                return (
                    <Suspense fallback={
                        <div className="flex justify-center items-center h-64">
                            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin"></div>
                        </div>
                    }>
                        <RegistrarStudentPopulationPage />
                    </Suspense>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-teal-500/30">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block shadow-2xl flex flex-col
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                        <NorsuBrand title="Registrar Portal" subtitle="NORSU-G CARE registrar services" accent="emerald" size="sm" className="min-w-0" />
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white transition-colors">
                            <XCircle size={24} />
                        </button>
                    </div>

                    {/* Registrar Info */}
                    <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Registrar Office</p>
                        <p className="font-semibold text-white truncate">{session?.full_name || 'Registrar Staff'}</p>
                    </div>

                    <nav className="space-y-1">
                        <div className="mb-4">
                            <p className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Student Management</p>
                            <button
                                onClick={() => { setActiveTab('population'); setSidebarOpen(false); }}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-medium text-sm
                                    ${activeTab === 'population'
                                        ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <Users size={18} className={activeTab === 'population' ? 'opacity-100' : 'opacity-70'} />
                                Student Directory
                            </button>
                        </div>
                    </nav>
                </div>

                <div className="mt-auto p-6 border-t border-slate-800">
                    <button
                        onClick={() => {
                            logout();
                            navigate('/');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all font-medium text-sm"
                    >
                        <LogOut size={18} />
                        Secure Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Student Directory
                            </h1>
                            <p className="text-sm text-slate-500 hidden sm:block">Search, view profiles, and export student records</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-slate-50 p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {renderContent()}
                    </div>
                </div>
            </main>
        </div>
    );
}
