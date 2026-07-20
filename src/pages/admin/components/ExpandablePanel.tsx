import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';

const panelClass = 'overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur';
const sectionHeaderIconClass = 'flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700';

/**
 * Admin section card that expands into a floating modal workspace.
 * Rendered through the `renderExpandablePanel` render prop each panel receives.
 */
export function ExpandablePanel({
    panelKey, title, description, icon, badge, children, className = '', bodyClassName, headerActions,
    isOpen, onOpen, onClose
}: any) {
    const modalBodyClassName = bodyClassName === undefined ? 'p-6 sm:p-7' : bodyClassName;
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (isOpen && dialogRef.current && !dialogRef.current.open) {
            dialogRef.current.showModal();
        }
    }, [isOpen]);

    return (
        <>
            <div className={`${panelClass} ${className}`.trim()}>
                <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-start gap-4 text-left">
                            <div className={`${sectionHeaderIconClass} transition-transform duration-200 ${isOpen ? 'scale-100 border-teal-200 bg-teal-50 text-teal-700' : 'scale-95'}`}>
                                {icon}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
                                    {badge && (
                                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                            </div>
                        </button>

                        <div className="flex flex-wrap items-center gap-3">
                            {headerActions}
                            <button type="button" onClick={onOpen} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
                                <Maximize2 className="h-4 w-4" />
                                <span>Open</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <dialog
                    ref={dialogRef}
                    className="fixed left-1/2 z-50 flex -translate-x-1/2 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white p-0 shadow-2xl shadow-slate-300/60 backdrop:bg-transparent"
                    style={{ top: 'clamp(1rem, 7vh, 5.5rem)', width: 'min(94vw, 1280px)', height: 'min(82vh, 820px)' }}
                    aria-labelledby={`${panelKey}-modal-title`}
                    onCancel={onClose}
                >
                    <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex min-w-0 items-start gap-4">
                                <div className={`${sectionHeaderIconClass} border-teal-200 bg-teal-50 text-teal-700`}>{icon}</div>
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h2 id={`${panelKey}-modal-title`} className="text-xl font-semibold text-slate-900">{title}</h2>
                                        {badge && <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{badge}</span>}
                                    </div>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 lg:shrink-0"
                                aria-label={`Close ${title}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <div className={`min-h-0 flex-1 overflow-y-auto ${modalBodyClassName}`.trim()}>
                        {children}
                    </div>
                </dialog>,
                document.body
            )}
        </>
    );
}
