import React, { useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { RefreshCw, Settings, LogOut, User } from 'lucide-react';
import Sidebar from './Sidebar';
import type { NavSection } from './Sidebar';
import NotificationBell from '../NotificationBell';

interface NotificationItem {
  id?: string | number;
  action?: string;
  details?: unknown;
  message?: string;
  created_at?: string | null;
  time_label?: string | null;
  sort_at?: string | null;
}

interface StaffPortalLayoutProps {
  /** Navigation sections for the sidebar */
  sidebarSections: NavSection[];
  /** Currently active tab ID */
  activeTab: string;
  /** Called when a nav item is clicked */
  onTabChange: (tab: string) => void;
  /** Called when logout is clicked */
  onLogout: () => void;
  /** Called when the logo/settings area is clicked */
  onOpenSettings?: () => void;

  /** Title shown in the header */
  headerTitle: string;
  /** Portal label shown above the title */
  portalLabel?: string;
  /** Accent color for the portal (sidebar, header gradient) */
  accent?: 'purple' | 'blue' | 'emerald';

  /** Refresh handler */
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;

  /** Notifications */
  notifications?: NotificationItem[];
  notificationsLoading?: boolean;
  onOpenNotifications?: () => void;

  /** Additional header actions (rendered after refresh + notifications) */
  headerActions?: ReactNode;

  /** Page content */
  children: ReactNode;

  /** Portal logo image */
  logoUrl?: string;
}

const EMPTY_NOTIFICATIONS: NotificationItem[] = [];

export default function StaffPortalLayout({
  sidebarSections,
  activeTab,
  onTabChange,
  onLogout,
  onOpenSettings,
  headerTitle,
  portalLabel = 'NORSU-G CARE',
  accent = 'purple',
  onRefresh,
  isRefreshing = false,
  refreshLabel = 'Refresh View',
  notifications = EMPTY_NOTIFICATIONS,
  notificationsLoading = false,
  onOpenNotifications,
  headerActions,
  children,
  logoUrl = '/carecenter.png',
}: StaffPortalLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Keyboard shortcut: Ctrl+\ to toggle sidebar
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

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-purple-50/30 font-sans text-gray-800">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — persistent on desktop, overlay on mobile */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-out lg:relative lg:translate-x-0 lg:h-full ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <Sidebar
          sections={sidebarSections}
          activeTab={activeTab}
          onTabChange={(tab) => {
            onTabChange(tab);
            setSidebarOpen(false);
          }}
          onLogout={onLogout}
          accent={accent}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          onOpenSettings={onOpenSettings}
        />
      </div>

      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="relative z-10 flex h-[4.25rem] shrink-0 items-center justify-between px-6 lg:px-8 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 shadow-sm transition-all saturate-[1.05]">
          <div className="flex min-w-0 items-center gap-4">
            {/* Mobile hamburger */}
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2.5 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800 lg:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/30"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0 flex items-center gap-2.5">
              {/* CARE logo beside page title */}
              <img
                src="/carecenter.png"
                alt="CARE Center"
                className="h-10 w-10 rounded-full object-cover bg-white shadow-md ring-2 ring-purple-200/40 shrink-0"
              />
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-purple-500 mb-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-400" />
                  {portalLabel}
                </span>
                <h2 className="text-[1.3rem] font-bold text-slate-800 tracking-tight leading-none mt-0.5">{headerTitle}</h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerActions}

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                title={refreshLabel}
                className="hidden md:inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-600 transition-all hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50 hover:shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                <span>{isRefreshing ? 'Syncing...' : refreshLabel}</span>
              </button>
            )}

            <NotificationBell
              notifications={notifications}
              accentColor={accent === 'blue' ? 'blue' : accent === 'emerald' ? 'emerald' : 'purple'}
              expandProfileUpdates
              isLoading={notificationsLoading}
              onOpen={onOpenNotifications}
            />

            {/* Profile Dropdown */}
            <div ref={profileRef} className="hidden md:block relative pl-3 ml-1 border-l border-slate-200/60">
              <button
                type="button"
                onClick={() => setProfileOpen(v => !v)}
                className={`w-[2.35rem] h-[2.35rem] rounded-full border transition-all overflow-hidden shadow-sm flex items-center justify-center hover:scale-105 focus:outline-none ${profileOpen ? 'border-purple-400 ring-2 ring-purple-200' : 'border-purple-100 bg-purple-50'}`}
                aria-label="Open profile menu"
              >
                {logoUrl ? (
                  <img src={logoUrl} alt={portalLabel} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-purple-700 font-bold text-xs">CS</span>
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-2xl bg-white border border-slate-200/60 shadow-xl shadow-slate-900/10 py-2 overflow-hidden animate-fade-in">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-purple-500">{portalLabel}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">CARE Staff</p>
                  </div>
                  {/* Actions */}
                  <div className="py-1.5">
                    {onOpenSettings && (
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); onOpenSettings(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                      >
                        <User size={15} className="text-slate-400" />
                        Profile &amp; Settings
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setProfileOpen(false); onLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out securely
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="page-transition flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
