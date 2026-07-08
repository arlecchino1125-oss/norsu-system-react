import { createPortal } from 'react-dom';

export type StudentToastState = {
    message: string;
    type?: string;
} | null;

interface StudentToastProps {
    toast: StudentToastState;
    onClose: () => void;
}

export function StudentToast({ toast, onClose }: StudentToastProps) {
    if (!toast) return null;

    return createPortal(
        <div className={`fixed bottom-4 left-4 right-4 z-[99999] flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold animate-fade-in-up transition-all sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:px-6 sm:py-3.5 ${toast.type === 'error'
            ? 'bg-red-600 text-white shadow-red-500/30'
            : toast.type === 'info'
                ? 'bg-blue-600 text-white shadow-blue-500/30'
                : 'bg-emerald-600 text-white shadow-emerald-500/30'
            }`}>
            {toast.type === 'error' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
            ) : toast.type === 'info' ? (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
            ) : (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
            )}
            <span>{toast.message}</span>
            <button onClick={onClose} className="ml-2 text-white/70 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>,
        document.body
    );
}
