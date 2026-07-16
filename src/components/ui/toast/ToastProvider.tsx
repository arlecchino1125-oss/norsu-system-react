import React, { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { ToastContext, type ToastOptions, type ToastType } from './useToast';

interface ToastEntry {
    id: number;
    message: string;
    type: ToastType;
    durationMs: number;
    action?: ToastOptions['action'];
}

const MAX_VISIBLE = 4;

const TYPE_STYLES: Record<ToastType, { bar: string; surface: string; Icon: typeof CheckCircle2 }> = {
    success: { bar: 'bg-emerald-500', surface: 'bg-emerald-600', Icon: CheckCircle2 },
    error: { bar: 'bg-rose-500', surface: 'bg-rose-600', Icon: XCircle },
    info: { bar: 'bg-blue-500', surface: 'bg-blue-600', Icon: Info },
};

function ToastViewport({ toasts, onDismiss }: { toasts: ToastEntry[]; onDismiss: (id: number) => void }) {
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[99999] flex flex-col items-center gap-2 px-4 sm:bottom-6">
            {toasts.map((t) => {
                const { surface, bar, Icon } = TYPE_STYLES[t.type];
                return (
                    <div
                        key={t.id}
                        role="status"
                        aria-live={t.type === 'error' ? 'assertive' : 'polite'}
                        className={`animate-slide-in-up pointer-events-auto relative w-full max-w-md overflow-hidden rounded-2xl text-white shadow-xl ${surface}`}
                    >
                        <div className="flex items-center gap-3 px-4 py-3">
                            <Icon size={20} className="shrink-0" />
                            <span className="flex-1 text-sm font-semibold">{t.message}</span>
                            {t.action && (
                                <button
                                    type="button"
                                    onClick={() => { t.action?.onClick(); onDismiss(t.id); }}
                                    className="shrink-0 rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-white/30"
                                >
                                    {t.action.label}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => onDismiss(t.id)}
                                aria-label="Dismiss notification"
                                className="shrink-0 text-white/70 transition-colors hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        {t.durationMs > 0 && (
                            <div
                                className={`h-1 origin-left ${bar}`}
                                style={{ animation: `shrink ${t.durationMs}ms linear forwards` }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastEntry[]>([]);
    const idRef = useRef(0);
    const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        const timer = timers.current.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
        }
    }, []);

    const toast = useCallback((options: ToastOptions) => {
        const id = idRef.current + 1;
        idRef.current = id;
        const entry: ToastEntry = {
            id,
            message: options.message,
            type: options.type ?? 'success',
            durationMs: options.durationMs ?? 4000,
            action: options.action,
        };
        // Keep at most MAX_VISIBLE stacked; oldest drop off the top.
        setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), entry]);
        if (entry.durationMs > 0) {
            timers.current.set(id, setTimeout(() => dismissToast(id), entry.durationMs));
        }
        return id;
    }, [dismissToast]);

    const showToast = useCallback(
        (message: string, type: ToastType = 'success') => toast({ message, type }),
        [toast],
    );

    return (
        <ToastContext.Provider value={{ showToast, toast, dismissToast }}>
            {children}
            {typeof document !== 'undefined'
                && createPortal(<ToastViewport toasts={toasts} onDismiss={dismissToast} />, document.body)}
        </ToastContext.Provider>
    );
}
