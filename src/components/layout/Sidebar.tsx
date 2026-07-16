import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import NorsuBrand from '../NorsuBrand';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

export interface NavSection {
  title?: string;
  withDivider?: boolean;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
  accent?: 'purple' | 'blue' | 'emerald';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings?: () => void;
}

const ACCENT_STYLES: Record<NonNullable<SidebarProps['accent']>, {
  sidebar: string;
  activeBg: string;
  activeText: string;
  activeBarClass: string;
  sectionText: string;
  hoverBg: string;
  hoverText: string;
  brandAccent: 'purple' | 'blue' | 'emerald';
}> = {
  purple: {
    sidebar: 'bg-gradient-to-b from-[#1A0B2E] via-[#241042] to-[#120524] border-r border-purple-500/10',
    activeBg: 'bg-purple-500/15 backdrop-blur-md',
    activeText: 'text-purple-300 font-semibold',
    activeBarClass: 'bg-purple-500',
    sectionText: 'text-purple-400/50',
    hoverBg: 'hover:bg-purple-500/10',
    hoverText: 'hover:text-purple-100',
    brandAccent: 'purple',
  },
  blue: {
    sidebar: 'bg-[#080F1A] border-r border-white/5',
    activeBg: 'bg-blue-500/10 backdrop-blur-md',
    activeText: 'text-blue-300 font-semibold',
    activeBarClass: 'bg-blue-500',
    sectionText: 'text-blue-400/40',
    hoverBg: 'hover:bg-white/5',
    hoverText: 'hover:text-blue-100',
    brandAccent: 'blue',
  },
  emerald: {
    sidebar: 'bg-[#061410] border-r border-white/5',
    activeBg: 'bg-emerald-500/10 backdrop-blur-md',
    activeText: 'text-emerald-300 font-semibold',
    activeBarClass: 'bg-emerald-500',
    sectionText: 'text-emerald-400/40',
    hoverBg: 'hover:bg-white/5',
    hoverText: 'hover:text-emerald-100',
    brandAccent: 'emerald',
  },
};

export default function Sidebar({
  sections,
  activeTab,
  onTabChange,
  onLogout,
  accent = 'purple',
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const styles = ACCENT_STYLES[accent];

  // Split sections roughly in half so the toggle sits in the middle of nav
  const half = Math.ceil(sections.length / 2);
  const topSections = sections.slice(0, half);
  const bottomSections = sections.slice(half);

  const renderSection = (section: NavSection, sectionIndex: number, keyPrefix: string) => (
    <div
      key={section.title || `${keyPrefix}-${sectionIndex}`}
      className={section.withDivider ? 'pt-4 mt-4 border-t border-white/5' : ''}
    >
      {section.title && !isCollapsed && (
        <p className={`px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.15em] ${styles.sectionText}`}>
          {section.title}
        </p>
      )}

      <div className="space-y-0.5">
        {section.items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ${isActive
                ? `${styles.activeBg} ${styles.activeText} shadow-inner bg-opacity-100`
                : `text-slate-400/80 ${styles.hoverBg} ${styles.hoverText} font-medium`
                } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              {isActive && (
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full shadow-lg ${styles.activeBarClass}`} />
              )}
              <Icon size={18} className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left tracking-wide">{item.label}</span>
                  {item.shortcut && (
                    <kbd className={`hidden rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors lg:inline-block ${isActive ? 'border-purple-400/30 text-purple-300/80' : 'border-white/10 text-slate-500/60'}`}>
                      {item.shortcut}
                    </kbd>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside
      className={`relative flex h-full flex-col ${styles.sidebar} transition-all duration-300 ease-out z-20 shadow-2xl ${isCollapsed ? 'w-[4.5rem]' : 'w-64'}`}
    >
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/5 to-transparent pointer-events-none opacity-50" />

      {/* Floating collapse toggle — right edge, vertically centered, 3D pill */}
      <button
        type="button"
        onClick={onToggleCollapse}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          boxShadow: '0 4px 0 rgba(80,40,160,0.5), 0 6px 12px rgba(80,40,160,0.35)',
        }}
        className="absolute -right-[1.05rem] top-1/2 -translate-y-1/2 z-30 flex h-12 w-[1.8rem] items-center justify-center rounded-lg bg-gradient-to-b from-purple-400/60 to-purple-700/80 border border-purple-300/20 text-white transition-all hover:-translate-y-[calc(50%+2px)] hover:shadow-none active:translate-y-[calc(-50%+3px)] active:shadow-none"
      >
        {isCollapsed ? <ChevronRight size={17} strokeWidth={2.5} /> : <ChevronLeft size={17} strokeWidth={2.5} />}
      </button>

      {/* Logo Area */}
      <div className="flex items-center justify-center border-b border-white/5 px-4 py-4 relative z-10">
        {isCollapsed ? (
          <div className="h-12 w-12 shrink-0 rounded-full overflow-hidden ring-2 ring-purple-200/30 shadow-md bg-white">
            <img
              src="/norsu.png"
              alt="NORSU-G Seal"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <NorsuBrand
            title="NORSU G CARE"
            accent={styles.brandAccent}
            size="sm"
            className="min-w-0 scale-95 origin-left"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 relative z-10 student-portal-scroll">
        {topSections.map((section, i) => renderSection(section, i, 'top'))}

        {bottomSections.map((section, i) => renderSection(section, i, 'bot'))}
      </nav>

      {/* Logout */}
      <div className="border-t border-white/5 p-3 relative z-10 bg-[#060A10]/50 backdrop-blur-md">
        <button
          type="button"
          onClick={onLogout}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-400/70 transition-all hover:bg-rose-500/10 hover:text-rose-300 focus:outline-none ${isCollapsed ? 'justify-center' : ''}`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut size={18} className="shrink-0 group-hover:scale-110 transition-transform" />
          {!isCollapsed && <span className="tracking-wide">Sign out securely</span>}
        </button>
      </div>
    </aside>
  );
}
