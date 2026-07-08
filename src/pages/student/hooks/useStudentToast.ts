import { useCallback } from 'react';
import { getSafeErrorMessage } from '../../../utils/errorMasking';
import { useToast, type ToastType } from '../../../components/ui/toast/ToastProvider';
import type { StudentToastState } from '../components/StudentToast';

/**
 * Adapter over the app-wide {@link useToast} manager. Kept as `useStudentToast`
 * with the original `{ toast, showToast, closeToast }` shape so the many existing
 * callers don't change. Display is now owned by the shared <ToastProvider>, so
 * `toast` stays null (the legacy <StudentToast> render simply no-ops) and there
 * is a single, stacking toast surface across the app.
 */
export function useStudentToast() {
    const { showToast: pushToast } = useToast();

    const showToast = useCallback((message: string, type: string = 'success') => {
        const safeMessage = type === 'error' ? getSafeErrorMessage(message) : message;
        const toastType: ToastType = type === 'error' ? 'error' : type === 'info' ? 'info' : 'success';
        pushToast(safeMessage, toastType);
    }, [pushToast]);

    const closeToast = useCallback(() => {}, []);
    const toast: StudentToastState = null;

    return {
        toast,
        showToast,
        closeToast,
    };
}
