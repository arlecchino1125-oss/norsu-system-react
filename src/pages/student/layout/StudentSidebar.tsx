import { X } from 'lucide-react';

interface StudentSidebarLink {
    id: string;
    label: string;
    icon: any;
    group: string;
}

interface StudentSidebarProps {
    isOpen: boolean;
    activeView: string;
    visibleSidebarLinks: StudentSidebarLink[];
    Icons: any;
    onClose: () => void;
    onSelectView: (viewId: string) => void;
    onLogout: () => void;
}

const STUDENT_SIDEBAR_GROUP_LABELS: Record<string, string> = {
    Core: 'Overview',
    Academic: 'Academic',
    Services: 'Services',
    Activities: 'Activity'
};

export function StudentSidebar({
    isOpen,
    activeView,
    visibleSidebarLinks,
    Icons,
    onClose,
    onSelectView,
    onLogout
}: StudentSidebarProps) {
    const groupedLinks = ['Core', 'Academic', 'Services', 'Activities']
        .map((group) => ({
            group,
            label: STUDENT_SIDEBAR_GROUP_LABELS[group] || group,
            links: visibleSidebarLinks.filter((link) => link.group === group)
        }))
        .filter((group) => group.links.length > 0);

    return (
        <>
            {isOpen && <div className="student-sidebar-overlay fixed inset-0 z-20 bg-slate-950/10 backdrop-blur-[1px] animate-backdrop" onClick={onClose} />}

            <aside className={`student-portal-sidebar fixed inset-y-0 left-0 z-30 flex w-[18rem] max-w-[calc(100vw-0.75rem)] transform flex-col border-r border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20 transition-all duration-300 ease-out sm:w-72 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="border-b border-slate-200/80 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex shrink-0 items-center">
                                <img src="/norsu.png" alt="NORSU-G Seal" className="h-9 w-9 rounded-full border border-slate-200 bg-white object-cover p-0.5 shadow-sm" />
                                <img src="/carecenter.png" alt="NORSU-G CARE Center" className="-ml-1.5 h-9 w-9 rounded-full border border-slate-200 bg-white object-cover shadow-sm" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-black leading-tight text-slate-950 sm:text-base">Student Portal</h2>
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">CARE services</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            aria-label="Close student navigation"
                            onClick={onClose}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <nav className="flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
                    {groupedLinks.map((group) => (
                        <div key={group.group} className="space-y-1.5">
                            <p className="px-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</p>
                            {group.links.map((link) => {
                                const isActive = activeView === link.id;
                                return (
                                    <button
                                        key={link.id}
                                        id={`nav-${link.id}`}
                                        type="button"
                                        onClick={() => onSelectView(link.id)}
                                        className={`group flex h-11 w-full items-center justify-between rounded-2xl px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${isActive ? 'bg-slate-950 text-white shadow-md shadow-slate-900/15' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`}
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all ${isActive ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                                <link.icon />
                                            </span>
                                            <span className="truncate font-black">{link.label}</span>
                                        </span>
                                        {isActive && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-400" />}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="border-t border-slate-200/80 bg-slate-50/80 p-3">
                    <button
                        type="button"
                        onClick={onLogout}
                        className="flex w-full items-center justify-between rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-black text-rose-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                    >
                        <span className="flex items-center gap-3">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
                                <Icons.Logout />
                            </span>
                            Logout
                        </span>
                    </button>
                </div>
            </aside>
        </>
    );
}
