import { Plus, X } from 'lucide-react';

interface StudentCommandHubProps {
    showCommandHub: boolean;
    setShowCommandHub: (value: boolean) => void;
    isCompactPortalLayout: boolean;
    isStudentViewVisible: (viewId: string) => boolean;
    isStudentViewEnabled: (viewId: string) => boolean;
    setActiveView: (viewId: string) => boolean | void;
    openCounselingForm: () => void;
    openSupportForm: () => void;
    Icons: any;
}

export function StudentCommandHub({
    showCommandHub,
    setShowCommandHub,
    isCompactPortalLayout,
    isStudentViewVisible,
    isStudentViewEnabled,
    setActiveView,
    openCounselingForm,
    openSupportForm,
    Icons
}: StudentCommandHubProps) {
    const tileClass = 'group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm shadow-slate-200/60 transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300';
    const iconClass = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition-all group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600';

    return (
        <>
            <button
                type="button"
                aria-label="Open student hub"
                title="Student hub"
                onClick={() => setShowCommandHub(true)}
                className={`student-command-fab group fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-900/20 ring-4 ring-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:bottom-6 sm:right-6 ${showCommandHub ? 'hidden' : (isCompactPortalLayout ? '' : 'animate-float')}`}
            >
                <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90" />
            </button>

            {showCommandHub && (
                <div className="fixed inset-0 bg-transparent z-50 flex items-end sm:items-center justify-center p-4 student-mobile-modal-overlay" onClick={() => setShowCommandHub(false)}>
                    <div className="w-full max-w-[min(23rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 animate-scale-in student-mobile-modal-panel student-mobile-modal-scroll-panel sm:max-w-sm" onClick={(event) => event.stopPropagation()}>
                        <div className="border-b border-slate-100 bg-white p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-600">Student Hub</p>
                                    <h3 className="mt-1 text-lg font-black text-slate-950">Start a student service</h3>
                                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Choose a request or jump to your student pages.</p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close student hub"
                                    onClick={() => setShowCommandHub(false)}
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3 p-3 sm:p-4">
                            <p className="px-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Services</p>
                            {isStudentViewVisible('assessment') && (
                                <button onClick={() => { setShowCommandHub(false); setActiveView('assessment'); }} className={tileClass}>
                                    <div className={iconClass}><Icons.Assessment /></div>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">Needs Assessment</span>
                                        <span className="block text-xs font-semibold text-slate-500">Update support needs</span>
                                    </span>
                                </button>
                            )}
                            {isStudentViewVisible('counseling') && (
                                <button onClick={() => {
                                    setShowCommandHub(false);
                                    const didNavigate = setActiveView('counseling');
                                    if (didNavigate && isStudentViewEnabled('counseling')) {
                                        openCounselingForm();
                                    }
                                }} className={tileClass}>
                                    <div className={iconClass}><Icons.Counseling /></div>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">Counseling</span>
                                        <span className="block text-xs font-semibold text-slate-500">Request an appointment</span>
                                    </span>
                                </button>
                            )}
                            {isStudentViewVisible('support') && (
                                <button onClick={() => {
                                    setShowCommandHub(false);
                                    const didNavigate = setActiveView('support');
                                    if (didNavigate && isStudentViewEnabled('support')) {
                                        openSupportForm();
                                    }
                                }} className={tileClass}>
                                    <div className={iconClass}><Icons.Support /></div>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">Support</span>
                                        <span className="block text-xs font-semibold text-slate-500">Send a support request</span>
                                    </span>
                                </button>
                            )}
                            {isStudentViewVisible('scholarship') && (
                                <button onClick={() => { setShowCommandHub(false); setActiveView('scholarship'); }} className={tileClass}>
                                    <div className={iconClass}><Icons.Scholarship /></div>
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">Scholarships</span>
                                        <span className="block text-xs font-semibold text-slate-500">View scholarship page</span>
                                    </span>
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 border-t border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-2 sm:p-4">
                            {isStudentViewVisible('feedback') && (
                                <button onClick={() => { setShowCommandHub(false); setActiveView('feedback'); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-white hover:text-blue-600">
                                    <Icons.Feedback /> Feedback
                                </button>
                            )}
                            {isStudentViewVisible('profile') && (
                                <button onClick={() => { setShowCommandHub(false); setActiveView('profile'); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-blue-200 hover:bg-white hover:text-blue-600">
                                    <Icons.Profile /> Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
