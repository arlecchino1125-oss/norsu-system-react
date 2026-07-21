import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
    message: string;
    type?: ToastType;
    /** Auto-dismiss delay in ms. Pass 0 to keep it until dismissed. */
    durationMs?: number;
    action?: { label: string; onClick: () => void };
}

export interface ToastContextValue {
    /** Back-compatible signature matching the per-portal showToast helpers. */
    showToast: (message: string, type?: ToastType) => number;
    toast: (options: ToastOptions) => number;
    dismissToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return context;
}
